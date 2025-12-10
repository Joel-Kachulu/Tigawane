import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import https from 'https';
import { URL } from 'url';

type GeocodeResult = {
  latitude: number;
  longitude: number;
  display_name: string;
  source: string;
};

type KnownLocation = {
  lat: number;
  lon: number;
  name: string;
};

// Simple in-memory TTL cache: key -> { expires, data }
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours
const cache = new Map<string, { expires: number; data: GeocodeResult }>();

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search';

// File path for known locations
const KNOWN_LOCATIONS_FILE = path.join(process.cwd(), 'data', 'known-locations.json');

// In-memory cache of known locations (loaded from file)
let knownLocationsCache: Record<string, KnownLocation> | null = null;
let knownLocationsCacheTime = 0;
const CACHE_REFRESH_MS = 60000; // Refresh file cache every minute

// Helper to normalize location names for lookup
function normalizeLocationName(query: string): string {
  return query.toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove special characters
    .replace(/\s+/g, ' ')      // Normalize whitespace
    .trim();
}

// Helper to make HTTPS request that bypasses SSL verification (development only)
async function httpsRequest(url: string, options: { headers?: Record<string, string>, timeout?: number } = {}): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const timeout = options.timeout || 8000;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': options.headers?.['User-Agent'] || 'TigawaneApp/1.0',
        'Accept': options.headers?.['Accept'] || 'application/json',
        ...options.headers,
      },
      // Bypass SSL verification for development (NOT for production!)
      rejectUnauthorized: process.env.NODE_ENV === 'production',
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode || 200, data: jsonData });
        } catch (e) {
          reject(new Error('Invalid JSON response'));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    // Set timeout
    const timeoutId = setTimeout(() => {
      req.destroy();
      reject(new Error('Request timeout'));
    }, timeout);

    req.on('close', () => {
      clearTimeout(timeoutId);
    });

    req.end();
  });
}

// Load known locations from file
async function loadKnownLocations(): Promise<Record<string, KnownLocation>> {
  const now = Date.now();
  
  // Return cached version if recent
  if (knownLocationsCache && (now - knownLocationsCacheTime) < CACHE_REFRESH_MS) {
    return knownLocationsCache;
  }
  
  try {
    const fileContent = await fs.readFile(KNOWN_LOCATIONS_FILE, 'utf-8');
    knownLocationsCache = JSON.parse(fileContent);
    knownLocationsCacheTime = now;
    console.log(`📂 Loaded ${Object.keys(knownLocationsCache || {}).length} known locations from file`);
    return knownLocationsCache || {};
  } catch (error: any) {
    // File doesn't exist or can't be read - return empty object
    if (error.code === 'ENOENT') {
      console.log('📂 Known locations file not found, creating new one...');
      // Create directory if it doesn't exist
      try {
        await fs.mkdir(path.dirname(KNOWN_LOCATIONS_FILE), { recursive: true });
        // Create initial file with basic locations
        const initialData: Record<string, KnownLocation> = {
          'lilongwe': { lat: -13.962612, lon: 33.774119, name: 'Lilongwe, Malawi' },
          'blantyre': { lat: -15.786254, lon: 35.003569, name: 'Blantyre, Malawi' },
          'mzuzu': { lat: -11.460752, lon: 34.022642, name: 'Mzuzu, Malawi' },
          'zomba': { lat: -15.385574, lon: 35.318727, name: 'Zomba, Malawi' },
          'com': { lat: -15.786254, lon: 35.003569, name: 'College of Medicine, Blantyre, Malawi' },
        };
        await fs.writeFile(KNOWN_LOCATIONS_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
        knownLocationsCache = initialData;
        knownLocationsCacheTime = now;
        return initialData;
      } catch (writeError) {
        console.error('❌ Failed to create known locations file:', writeError);
        return {};
      }
    }
    console.error('❌ Error loading known locations:', error);
    return {};
  }
}

// Save a new location to the known locations file
async function saveKnownLocation(query: string, location: KnownLocation): Promise<void> {
  try {
    const knownLocations = await loadKnownLocations();
    const normalized = normalizeLocationName(query);
    
    // Only save if it's a new location
    if (!knownLocations[normalized]) {
      knownLocations[normalized] = location;
      
      // Also save variations (without city names for flexibility)
      const words = normalized.split(' ').filter(w => w.length > 2);
      if (words.length > 1) {
        // Save main words as key (e.g., "chileka airport" -> "chileka airport")
        const mainKey = words.join(' ');
        if (!knownLocations[mainKey]) {
          knownLocations[mainKey] = location;
        }
      }
      
      await fs.writeFile(KNOWN_LOCATIONS_FILE, JSON.stringify(knownLocations, null, 2), 'utf-8');
      knownLocationsCache = knownLocations;
      knownLocationsCacheTime = Date.now();
      console.log(`💾 Saved new location to file: ${normalized} -> ${location.name}`);
    }
  } catch (error) {
    console.error('❌ Error saving known location:', error);
    // Don't throw - this is not critical
  }
}

// Check if a query matches a known location (exact or very close match only)
// This function is STRICT - it only matches if there's a very close match
function findKnownLocation(query: string, knownLocations: Record<string, KnownLocation>): KnownLocation | null {
  const normalized = normalizeLocationName(query);
  
  // First try exact match
  if (knownLocations[normalized]) {
    return knownLocations[normalized];
  }
  
  // List of generic city names that should NOT match unless it's an exact match
  const genericCityNames = ['lilongwe', 'blantyre', 'mzuzu', 'zomba'];
  
  // Try matching key that's contained in query (but be VERY strict)
  for (const [key, location] of Object.entries(knownLocations)) {
    // Skip if key is a generic city name and query is more specific
    if (genericCityNames.includes(key) && normalized.split(' ').length > 1) {
      // Don't match "blantyre" when searching for "limbe market blantyre"
      // Only match if query is just the city name
      if (normalized !== key && normalized.split(' ').length > 1) {
        continue;
      }
    }
    
    // Exact key match
    if (normalized === key) {
      return location;
    }
    
    // Check if query starts with the key (e.g., "limbe market" matches "limbe")
    // But only if key is not a generic city name
    if (!genericCityNames.includes(key) && normalized.startsWith(key + ' ')) {
      return location;
    }
    
    // Check if key starts with significant words from query
    // Only for non-generic locations
    if (!genericCityNames.includes(key) && key.length > 5) {
      const queryWords = normalized.split(' ').filter(w => w.length > 3);
      const keyWords = key.split(' ').filter(w => w.length > 3);
      
      // Match if all significant words from query are in key
      if (queryWords.length > 0 && 
          queryWords.length <= keyWords.length &&
          queryWords.every(word => keyWords.some(kw => kw.includes(word) || word.includes(kw)))) {
        // Additional check: query should be at least 60% similar to key
        const similarity = queryWords.filter(w => keyWords.some(kw => kw.includes(w) || w.includes(kw))).length / Math.max(queryWords.length, keyWords.length);
        if (similarity >= 0.6) {
          return location;
        }
      }
    }
  }
  
  return null;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get('q')?.trim();
    const country = url.searchParams.get('country')?.trim(); // optional country code (e.g. MW)

    if (!q) {
      return NextResponse.json({ error: 'Missing query parameter q' }, { status: 400 });
    }

    // Check known locations from file first (fastest, no API call)
    const knownLocations = await loadKnownLocations();
    const knownLocation = findKnownLocation(q, knownLocations);
    
    if (knownLocation) {
      const result: GeocodeResult = {
        latitude: knownLocation.lat,
        longitude: knownLocation.lon,
        display_name: knownLocation.name,
        source: 'known_location_file',
      };
      console.log(`✅ Using known location from file: ${q} -> ${knownLocation.name}`);
      return NextResponse.json(result);
    }
    
    // Use original query for cache key to avoid cache misses
    const cacheKey = `${q.toLowerCase()}|${country || ''}`;
    const now = Date.now();
    const cached = cache.get(cacheKey);
    if (cached && cached.expires > now) {
      console.log(`✅ Using cached result for: ${q}`);
      return NextResponse.json(cached.data);
    }

    // Build multiple query variations for better results
    const queryVariations: string[] = [];
    const normalized = normalizeLocationName(q);
    
    // Original query
    queryVariations.push(q);
    
    // Add "Malawi" if not present and country is MW
    if (country && country.toLowerCase() === 'mw' && !q.toLowerCase().includes('malawi')) {
      if (!q.includes(',') || q.split(',').length <= 2) {
        queryVariations.push(`${q}, Malawi`);
      }
    }
    
    // Try with Blantyre suffix for locations that might be in Blantyre
    if (normalized.includes('college of medicine') || normalized.includes('com')) {
      queryVariations.push('College of Medicine, Blantyre, Malawi');
    }

    const email = process.env.OPENSTREETMAP_EMAIL;
    const userAgent = `TigawaneApp/1.0${email ? ` (${email})` : ''}`;

    // Try each query variation until one works
    let lastError: any = null;
    for (const searchQuery of queryVariations) {
      try {
        const params = new URLSearchParams({ 
          format: 'json', 
          q: searchQuery, 
          limit: '3', // Get more results to find best match
          addressdetails: '1'
        });
        if (country) params.set('countrycodes', country.toLowerCase());
        if (email) params.set('email', email);

        const nominatimUrl = `${NOMINATIM_BASE}?${params.toString()}`;

        // Use https module directly to bypass SSL issues in development
        let responseData: any;
        try {
          console.log(`🌐 Attempting to geocode via API: ${searchQuery}`);
          const response = await httpsRequest(nominatimUrl, {
            headers: {
              'User-Agent': userAgent,
              Accept: 'application/json',
            },
            timeout: 8000,
          });
          
          if (response.status !== 200) {
            console.warn(`⚠️ API returned non-200 status: ${response.status}`);
            lastError = new Error(`HTTP ${response.status}`);
            continue; // Try next variation
          }
          
          responseData = response.data;
          console.log(`✅ API request successful, got ${Array.isArray(responseData) ? responseData.length : 0} results`);
        } catch (fetchError: any) {
          // If https request fails, log the error but continue to next variation
          console.warn(`⚠️ HTTPS request failed for "${searchQuery}":`, fetchError?.message || fetchError);
          lastError = fetchError;
          continue; // Try next variation - don't fallback to known location here, let all variations try first
        }

        const data = responseData;
        if (!Array.isArray(data) || data.length === 0) {
          lastError = new Error('No results');
          continue; // Try next variation
        }

        // Find best match (prefer results in Malawi if country is MW)
        let bestMatch = data[0];
        if (country && country.toLowerCase() === 'mw') {
          const malawiMatch = data.find((item: any) => 
            item.display_name?.toLowerCase().includes('malawi') ||
            item.address?.country?.toLowerCase() === 'malawi'
          );
          if (malawiMatch) {
            bestMatch = malawiMatch;
          }
        }

        const result: GeocodeResult = {
          latitude: parseFloat(bestMatch.lat),
          longitude: parseFloat(bestMatch.lon),
          display_name: bestMatch.display_name || q,
          source: 'nominatim',
        };

        // Validate coordinates
        if (isNaN(result.latitude) || isNaN(result.longitude) ||
            result.latitude < -90 || result.latitude > 90 ||
            result.longitude < -180 || result.longitude > 180) {
          lastError = new Error('Invalid coordinates returned');
          continue; // Try next variation
        }

        cache.set(cacheKey, { expires: now + CACHE_TTL_MS, data: result });
        
        // Save to known locations file for future use
        await saveKnownLocation(q, {
          lat: result.latitude,
          lon: result.longitude,
          name: result.display_name,
        });
        
        console.log(`✅ Geocoded successfully: ${q} -> ${result.display_name}`);
        return NextResponse.json(result);
      } catch (variationError: any) {
        lastError = variationError;
        // Continue to next variation
        continue;
      }
    }

    // All variations failed - try known location as last resort (only exact matches)
    const fallbackLocation = findKnownLocation(q, knownLocations);
    if (fallbackLocation) {
      const result: GeocodeResult = {
        latitude: fallbackLocation.lat,
        longitude: fallbackLocation.lon,
        display_name: fallbackLocation.name,
        source: 'known_location_last_resort',
      };
      console.log(`✅ Using known location as last resort for: ${q}`);
      return NextResponse.json(result);
    }

    // All attempts failed
    console.error('❌ All geocoding attempts failed for:', q, lastError);
    return NextResponse.json({ 
      error: 'Could not geocode location. Please try a more specific address.',
      details: lastError?.message || 'Unknown error'
    }, { status: 404 });
  } catch (err: any) {
    console.error('Geocode proxy error:', err);
    
    return NextResponse.json({ 
      error: 'Server error during geocoding',
      details: err?.message || 'Unknown error'
    }, { status: 500 });
  }
}
