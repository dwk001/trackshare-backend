const { kv } = require('@vercel/kv');

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

async function getSpotifyAccessToken() {
  // Check cache first
  try {
    const cached = await kv.get('spotify:access_token');
    if (cached) return cached;
  } catch (e) {}
  
  const auth = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');
  
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });
  
  const data = await response.json();
  
  // Cache for 55 minutes (tokens valid for 1 hour)
  if (data.access_token) {
    try {
      await kv.setex('spotify:access_token', 3300, data.access_token);
    } catch (e) {}
  }
  
  return data.access_token;
}

async function searchSpotify(query, type = 'track', limit = 20, offset = 0) {
  const accessToken = await getSpotifyAccessToken();
  
  const response = await fetch(
    `https://api.spotify.com/v1/search?` + new URLSearchParams({
      q: query,
      type: type,
      limit: limit.toString(),
      offset: offset.toString(),
      market: 'US'
    }),
    {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    }
  );
  
  if (!response.ok) {
    throw new Error(`Spotify API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (type === 'track' && data.tracks) {
    return {
      tracks: data.tracks.items.map(track => ({
        id: track.id,
        title: track.name,
        artist: track.artists.map(a => a.name).join(', '),
        primaryArtist: track.artists[0].name,
        artwork: track.album.images[0]?.url,
        artworkMedium: track.album.images[1]?.url,
        artworkSmall: track.album.images[2]?.url,
        url: track.external_urls.spotify,
        album: track.album.name,
        albumUrl: track.album.external_urls.spotify,
        releaseDate: track.album.release_date,
        popularity: track.popularity,
        previewUrl: track.preview_url,
        durationMs: track.duration_ms,
        explicit: track.explicit,
        spotifyUri: track.uri
      })),
      total: data.tracks.total,
      limit: data.tracks.limit,
      offset: data.tracks.offset,
      hasMore: data.tracks.next !== null
    };
  }
  
  if (type === 'artist' && data.artists) {
    return {
      artists: data.artists.items.map(artist => ({
        id: artist.id,
        name: artist.name,
        image: artist.images[0]?.url,
        url: artist.external_urls.spotify,
        followers: artist.followers.total,
        popularity: artist.popularity,
        genres: artist.genres
      })),
      total: data.artists.total,
      hasMore: data.artists.next !== null
    };
  }
  
  return { tracks: [], total: 0 };
}

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const { q, type = 'track', limit = 50, offset = 0 } = req.query;
  
  if (!q || q.trim().length === 0) {
    return res.status(400).json({ 
      success: false, 
      error: 'Query parameter "q" is required' 
    });
  }
  
  // Cache search results for 10 minutes
  const cacheKey = `search:${type}:${q}:${limit}:${offset}`;
  
  try {
    const cached = await kv.get(cacheKey);
    if (cached) {
      const data = typeof cached === 'string' ? JSON.parse(cached) : cached;
      return res.json({
        ...data,
        from_cache: true
      });
    }
  } catch (e) {
    console.log('Cache miss for search');
  }
  
  try {
    const results = await searchSpotify(
      q.trim(),
      type,
      parseInt(limit),
      parseInt(offset)
    );
    
    const response = {
      success: true,
      query: q,
      type: type,
      ...results,
      from_cache: false,
      timestamp: new Date().toISOString()
    };
    
    // Cache for 10 minutes
    try {
      await kv.setex(cacheKey, 600, JSON.stringify(response));
    } catch (e) {
      console.error('Cache set error:', e);
    }
    
    res.json(response);
    
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search tracks',
      message: error.message
    });
  }
};
