/**
 * Claim Service - Business logic for claim operations
 */

import { supabase } from '@/lib/supabase';
import { invalidateCache } from '@/lib/dataFetching';

export interface Claim {
  id: string;
  item_id: string;
  claimer_id: string;
  owner_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  message: string | null;
  created_at: string;
}

export interface CreateClaimData {
  item_id: string;
  claimer_id: string;
  owner_id: string;
  message?: string | null;
  status?: 'pending';
}

export interface UpdateClaimData {
  status?: 'pending' | 'accepted' | 'rejected' | 'completed';
  message?: string | null;
}

/**
 * Create a new claim for an item
 * Also updates the item status to 'requested'
 */
export async function createClaim(data: CreateClaimData): Promise<Claim> {
  // Create the claim
  const { data: claimData, error: claimError } = await supabase
    .from('claims')
    .insert({
      item_id: data.item_id,
      claimer_id: data.claimer_id,
      owner_id: data.owner_id,
      message: data.message || null,
      status: data.status || 'pending',
    })
    .select()
    .single();

  if (claimError) {
    throw claimError;
  }

  // Update item status to 'requested'
  const { error: updateError } = await supabase
    .from('items')
    .update({ status: 'requested' })
    .eq('id', data.item_id);

  if (updateError) {
    console.warn('Error updating item status:', updateError);
    // Don't throw - claim was created successfully
  }

  // Invalidate cache
  invalidateCache('claims');
  invalidateCache('items');

  return claimData;
}

/**
 * Update a claim
 */
export async function updateClaim(claimId: string, updates: UpdateClaimData): Promise<Claim> {
  const { data, error } = await supabase
    .from('claims')
    .update(updates)
    .eq('id', claimId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  // If claim is accepted or rejected, update item status
  if (updates.status === 'accepted') {
    // Get the claim to find the item_id
    const { data: claim } = await supabase
      .from('claims')
      .select('item_id')
      .eq('id', claimId)
      .single();

    if (claim) {
      // Update item status to 'reserved' or 'completed'
      await supabase
        .from('items')
        .update({ status: 'reserved' })
        .eq('id', claim.item_id);
    }
  } else if (updates.status === 'rejected') {
    // Get the claim to find the item_id
    const { data: claim } = await supabase
      .from('claims')
      .select('item_id')
      .eq('id', claimId)
      .single();

    if (claim) {
      // Check if there are other pending claims
      const { data: otherClaims } = await supabase
        .from('claims')
        .select('id')
        .eq('item_id', claim.item_id)
        .eq('status', 'pending')
        .limit(1);

      // If no other pending claims, set item back to available
      if (!otherClaims || otherClaims.length === 0) {
        await supabase
          .from('items')
          .update({ status: 'available' })
          .eq('id', claim.item_id);
      }
    }
  }

  // Invalidate cache
  invalidateCache('claims');
  invalidateCache('items');

  return data;
}

/**
 * Delete a claim
 */
export async function deleteClaim(claimId: string): Promise<void> {
  // Get the claim to find the item_id before deleting
  const { data: claim } = await supabase
    .from('claims')
    .select('item_id, status')
    .eq('id', claimId)
    .single();

  const { error } = await supabase
    .from('claims')
    .delete()
    .eq('id', claimId);

  if (error) {
    throw error;
  }

  // If this was the only pending claim, set item back to available
  if (claim && claim.status === 'pending') {
    const { data: otherClaims } = await supabase
      .from('claims')
      .select('id')
      .eq('item_id', claim.item_id)
      .eq('status', 'pending')
      .limit(1);

    if (!otherClaims || otherClaims.length === 0) {
      await supabase
        .from('items')
        .update({ status: 'available' })
        .eq('id', claim.item_id);
    }
  }

  // Invalidate cache
  invalidateCache('claims');
  invalidateCache('items');
}

/**
 * Get claims for a specific item
 */
export async function getItemClaims(itemId: string): Promise<Claim[]> {
  const { data, error } = await supabase
    .from('claims')
    .select('*')
    .eq('item_id', itemId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * Get claims for a user (as owner or claimer)
 */
export async function getUserClaims(userId: string): Promise<{
  asOwner: Claim[];
  asClaimer: Claim[];
}> {
  const [ownerClaims, claimerClaims] = await Promise.all([
    supabase
      .from('claims')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false }),
    supabase
      .from('claims')
      .select('*')
      .eq('claimer_id', userId)
      .order('created_at', { ascending: false }),
  ]);

  if (ownerClaims.error) {
    throw ownerClaims.error;
  }

  if (claimerClaims.error) {
    throw claimerClaims.error;
  }

  return {
    asOwner: ownerClaims.data || [],
    asClaimer: claimerClaims.data || [],
  };
}

/**
 * Get request counts for multiple items
 * Optimized batch query
 */
export async function getItemRequestCounts(itemIds: string[]): Promise<Record<string, number>> {
  if (itemIds.length === 0) {
    return {};
  }

  const { data, error } = await supabase
    .from('claims')
    .select('item_id')
    .in('item_id', itemIds)
    .in('status', ['pending', 'requested']);

  if (error) {
    console.error('Error fetching request counts:', error);
    return {};
  }

  const counts: Record<string, number> = {};
  data?.forEach(claim => {
    counts[claim.item_id] = (counts[claim.item_id] || 0) + 1;
  });

  return counts;
}

/**
 * Get a single claim by ID
 */
export async function getClaimById(claimId: string): Promise<Claim | null> {
  const { data, error } = await supabase
    .from('claims')
    .select('*')
    .eq('id', claimId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Not found
    }
    throw error;
  }

  return data;
}

