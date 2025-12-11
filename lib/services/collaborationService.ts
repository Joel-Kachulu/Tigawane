/**
 * Collaboration Service - Business logic for collaboration operations
 * Optimized for performance with parallel queries and caching
 */

import { supabase } from '@/lib/supabase';
import { fetchProfiles } from '@/lib/dataFetching';
import { invalidateCache } from '@/lib/dataFetching';
import { collaborationsCache, generateCacheKey, CACHE_TTL } from '@/lib/cache';

export interface Collaboration {
  id: string;
  title: string;
  description: string;
  location: string;
  target_date: string | null;
  status: string;
  created_at: string;
  creator_id: string;
  creator_name?: string;
  participant_count?: number;
  is_participant?: boolean;
  donation_preview?: {
    food_count: number;
    item_count: number;
    total_count: number;
  };
}

export interface CollaborationDetails extends Collaboration {
  participants: Array<{
    id: string;
    user_id: string;
    full_name: string | null;
  }>;
  donation_summary: {
    food_count: number;
    item_count: number;
    total_count: number;
    recent_donations: Array<{
      id: string;
      title: string;
      item_type: string;
      user_name?: string;
      created_at: string;
    }>;
  };
}

export interface CreateCollaborationData {
  title: string;
  description: string;
  location: string;
  target_date?: string | null;
  creator_id: string;
  status?: string;
}

export interface UpdateCollaborationData {
  title?: string;
  description?: string;
  location?: string;
  target_date?: string | null;
  status?: string;
}

/**
 * Fetch all active collaborations with optimized parallel queries
 * Uses parallel queries to fetch participants and donations in one go
 * Includes caching for better performance
 */
export async function fetchCollaborations(userId?: string): Promise<Collaboration[]> {
  // Check cache first
  const cacheKey = generateCacheKey('collaborations', { userId: userId || 'all' });
  const cached = collaborationsCache.get<Collaboration[]>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    // Fetch collaborations
    const { data: collaborationData, error: collaborationError } = await supabase
      .from('collaboration_requests')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (collaborationError) {
      if (collaborationError.message.includes('relation "public.collaboration_requests" does not exist')) {
        throw new Error('COLLABORATION_TABLE_MISSING');
      }
      throw collaborationError;
    }

    if (!collaborationData || collaborationData.length === 0) {
      return [];
    }

    // Extract IDs for batch queries
    const collaborationIds = collaborationData.map(collab => collab.id);
    const creatorIds = [...new Set(collaborationData.map(collab => collab.creator_id))];

    // Parallel queries for better performance
    const [profilesData, allParticipants, allDonations] = await Promise.all([
      // Fetch creator profiles (using cached fetchProfiles)
      fetchProfiles(creatorIds),
      // Fetch all participants in one query
      supabase
        .from('collaboration_participants')
        .select('collaboration_id, user_id')
        .in('collaboration_id', collaborationIds),
      // Fetch all donations in one query
      supabase
        .from('items')
        .select('collaboration_id, item_type')
        .in('collaboration_id', collaborationIds)
        .eq('status', 'available'),
    ]);

    // Process participants data
    const participantsByCollab = new Map<string, string[]>();
    if (allParticipants.data) {
      allParticipants.data.forEach(p => {
        if (!participantsByCollab.has(p.collaboration_id)) {
          participantsByCollab.set(p.collaboration_id, []);
        }
        participantsByCollab.get(p.collaboration_id)!.push(p.user_id);
      });
    }

    // Process donations data
    const donationsByCollab = new Map<string, { food: number; items: number; total: number }>();
    if (allDonations.data) {
      allDonations.data.forEach(donation => {
        if (!donationsByCollab.has(donation.collaboration_id)) {
          donationsByCollab.set(donation.collaboration_id, { food: 0, items: 0, total: 0 });
        }
        const counts = donationsByCollab.get(donation.collaboration_id)!;
        counts.total++;
        if (donation.item_type === 'food') {
          counts.food++;
        } else {
          counts.items++;
        }
      });
    }

    // Build collaborations with enriched data
    const collaborations: Collaboration[] = collaborationData.map(collab => {
      const participantIds = participantsByCollab.get(collab.id) || [];
      const donationCounts = donationsByCollab.get(collab.id) || { food: 0, items: 0, total: 0 };

      return {
        ...collab,
        creator_name: profilesData[collab.creator_id]?.full_name || null,
        participant_count: participantIds.length,
        is_participant: userId ? participantIds.includes(userId) : false,
        donation_preview: {
          food_count: donationCounts.food,
          item_count: donationCounts.items,
          total_count: donationCounts.total,
        },
      };
    });

    // Cache the results
    collaborationsCache.set(cacheKey, collaborations, CACHE_TTL.COLLABORATIONS);

    return collaborations;
  } catch (error: any) {
    console.error('Error fetching collaborations:', error);
    throw error;
  }
}

/**
 * Fetch detailed information for a specific collaboration
 * Optimized with parallel queries and caching
 */
export async function fetchCollaborationDetails(
  collaborationId: string,
  userId?: string
): Promise<CollaborationDetails | null> {
  // Check cache first
  const cacheKey = generateCacheKey('collaboration_details', {
    id: collaborationId,
    userId: userId || 'all',
  });
  const cached = collaborationsCache.get<CollaborationDetails>(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    // Fetch collaboration
    const { data: collabData, error: collabError } = await supabase
      .from('collaboration_requests')
      .select('*')
      .eq('id', collaborationId)
      .single();

    if (collabError) {
      if (collabError.code === 'PGRST116') {
        return null; // Not found
      }
      throw collabError;
    }

    if (!collabData) {
      return null;
    }

    // Parallel queries for participants, donations, and creator profile
    const [participantData, donationData, creatorProfile] = await Promise.all([
      // Fetch participants
      supabase
        .from('collaboration_participants')
        .select('id, user_id')
        .eq('collaboration_id', collaborationId),
      // Fetch donations
      supabase
        .from('items')
        .select('id, title, item_type, user_id, created_at')
        .eq('collaboration_id', collaborationId)
        .eq('status', 'available')
        .order('created_at', { ascending: false })
        .limit(20),
      // Fetch creator profile
      fetchProfiles([collabData.creator_id]),
    ]);

    // Get participant user IDs
    const participantUserIds = participantData.data?.map(p => p.user_id) || [];
    
    // Fetch participant profiles
    const participantProfiles = participantUserIds.length > 0
      ? await fetchProfiles(participantUserIds)
      : {};

    // Build participants with names
    const participants = (participantData.data || []).map(p => ({
      id: p.id,
      user_id: p.user_id,
      full_name: participantProfiles[p.user_id]?.full_name || null,
    }));

    // Get donation user IDs
    const donationUserIds = [...new Set(donationData.data?.map(item => item.user_id) || [])];
    const donationProfiles = donationUserIds.length > 0
      ? await fetchProfiles(donationUserIds)
      : {};

    // Process donations
    const foodCount = donationData.data?.filter(item => item.item_type === 'food').length || 0;
    const itemCount = donationData.data?.filter(item => item.item_type === 'non-food').length || 0;

    const recentDonations = (donationData.data || []).map(item => ({
      id: item.id,
      title: item.title,
      item_type: item.item_type,
      user_name: donationProfiles[item.user_id]?.full_name || 'Anonymous',
      created_at: item.created_at,
    }));

    const result = {
      ...collabData,
      creator_name: creatorProfile[collabData.creator_id]?.full_name || 'Anonymous',
      participant_count: participants.length,
      is_participant: userId ? participantUserIds.includes(userId) : false,
      participants,
      donation_summary: {
        food_count: foodCount,
        item_count: itemCount,
        total_count: donationData.data?.length || 0,
        recent_donations: recentDonations,
      },
    };

    // Cache the result
    collaborationsCache.set(cacheKey, result, CACHE_TTL.COLLABORATION_DETAILS);

    return result;
  } catch (error: any) {
    console.error('Error fetching collaboration details:', error);
    throw error;
  }
}

/**
 * Create a new collaboration
 * Automatically joins the creator as a participant
 */
export async function createCollaboration(data: CreateCollaborationData): Promise<Collaboration> {
  const { data: collaboration, error } = await supabase
    .from('collaboration_requests')
    .insert({
      ...data,
      status: data.status || 'active',
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  // Auto-join the creator as a participant
  try {
    await supabase
      .from('collaboration_participants')
      .insert({
        collaboration_id: collaboration.id,
        user_id: data.creator_id,
      });
  } catch (participantError) {
    console.warn('Error auto-joining creator:', participantError);
    // Don't throw - collaboration was created successfully
  }

  // Invalidate cache
  invalidateCache('collaborations');

  return collaboration;
}

/**
 * Update a collaboration
 */
export async function updateCollaboration(
  collaborationId: string,
  updates: UpdateCollaborationData
): Promise<Collaboration> {
  const { data, error } = await supabase
    .from('collaboration_requests')
    .update(updates)
    .eq('id', collaborationId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  // Invalidate cache
  invalidateCache('collaborations');

  return data;
}

/**
 * Join a collaboration
 */
export async function joinCollaboration(
  collaborationId: string,
  userId: string
): Promise<void> {
  // Check if already a participant
  const { data: existing } = await supabase
    .from('collaboration_participants')
    .select('id')
    .eq('collaboration_id', collaborationId)
    .eq('user_id', userId)
    .single();

  if (existing) {
    return; // Already a participant
  }

  const { error } = await supabase
    .from('collaboration_participants')
    .insert({
      collaboration_id: collaborationId,
      user_id: userId,
    });

  if (error) {
    throw error;
  }

  // Invalidate cache
  invalidateCache('collaborations');
}

/**
 * Leave a collaboration
 */
export async function leaveCollaboration(
  collaborationId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('collaboration_participants')
    .delete()
    .eq('collaboration_id', collaborationId)
    .eq('user_id', userId);

  if (error) {
    throw error;
  }

  // Invalidate cache
  invalidateCache('collaborations');
}

/**
 * Delete a collaboration (only creator can do this)
 */
export async function deleteCollaboration(
  collaborationId: string,
  creatorId: string
): Promise<void> {
  // Verify creator
  const { data: collab, error: checkError } = await supabase
    .from('collaboration_requests')
    .select('creator_id')
    .eq('id', collaborationId)
    .single();

  if (checkError) {
    throw checkError;
  }

  if (collab.creator_id !== creatorId) {
    throw new Error('Only the creator can delete a collaboration');
  }

  const { error } = await supabase
    .from('collaboration_requests')
    .delete()
    .eq('id', collaborationId);

  if (error) {
    throw error;
  }

  // Invalidate cache
  invalidateCache('collaborations');
}

