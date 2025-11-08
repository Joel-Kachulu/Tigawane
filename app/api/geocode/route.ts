import { NextResponse } from 'next/server';

type GeocodeResult = {
  latitude: number;
  longitude: number;
  display_name: string;
  source: string;
};

// Simple in-memory TTL cache: key -> { expires, data }
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours
const cache = new Map<string, { expires: number; data: GeocodeResult }>();

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = url.searchParams.get('q')?.trim();
    const country = url.searchParams.get('country')?.trim(); // optional country code (e.g. MW)

    if (!q) {
      return NextResponse.json({ error: 'Missing query parameter q' }, { status: 400 });
    }

    const cacheKey = `${q.toLowerCase()}|${country || ''}`;
    const now = Date.now();
    const cached = cache.get(cacheKey);
    if (cached && cached.expires > now) {
      return NextResponse.json(cached.data);
    }

    // Build Nominatim URL with safe params. Include email from env if available.
    const params = new URLSearchParams({ format: 'json', q, limit: '1' });
    if (country) params.set('countrycodes', country.toLowerCase());
    const email = process.env.OPENSTREETMAP_EMAIL;
    if (email) params.set('email', email);

    const nominatimUrl = `${NOMINATIM_BASE}?${params.toString()}`;

    const userAgent = `TigawaneApp/1.0${email ? ` (${email})` : ''}`;

    const resp = await fetch(nominatimUrl, {
      headers: {
        'User-Agent': userAgent,
        Accept: 'application/json',
      },
    });

    if (!resp.ok) {
      return NextResponse.json({ error: 'Upstream geocoding failed' }, { status: 502 });
    }

    const data = await resp.json();
    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: 'No results' }, { status: 404 });
    }

    const first = data[0];
    const result: GeocodeResult = {
      latitude: parseFloat(first.lat),
      longitude: parseFloat(first.lon),
      display_name: first.display_name || q,
      source: 'nominatim',
    };

    cache.set(cacheKey, { expires: now + CACHE_TTL_MS, data: result });

    return NextResponse.json(result);
  } catch (err) {
    console.error('Geocode proxy error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
