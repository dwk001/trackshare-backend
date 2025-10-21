const { kv } = require('@vercel/kv');

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

// Genre-specific Spotify playlists - Expanded for more variety
const GENRE_PLAYLISTS = {
  all: [
    '37i9dQZF1DXcBWIGoYBM5M', // Today's Top Hits
    '37i9dQZF1DX0XUsuxWHRQd', // RapCaviar
    '37i9dQZF1DWXRqgorJj26U', // Rock Classics
    '37i9dQZF1DX4JAvHpjipBk', // New Music Friday
    '37i9dQZF1DX10zKzsJ2jva', // Summer Hits
    '37i9dQZF1DWY4xHQp97fN6', // Get Turnt
    '37i9dQZF1DX3oM43CtKnRV', // Rock This
    '37i9dQZF1DX1lVhptIYRda', // Hot Country
    '37i9dQZF1DX4dyzvuaRJ0n', // mint
    '37i9dQZF1DX6J5NfMJS675'  // Dance Rising
  ],
  pop: [
    '37i9dQZF1DXcBWIGoYBM5M', // Today's Top Hits
    '37i9dQZF1DX4JAvHpjipBk', // New Music Friday
    '37i9dQZF1DX10zKzsJ2jva', // Summer Hits
    '37i9dQZF1DX2RxBh64BHjQ', // Feelin' Myself
    '37i9dQZF1DX7Jl5KP2eZaS', // Pop Rising
    '37i9dQZF1DX0XUsuxWHRQd', // RapCaviar (crossover)
    '37i9dQZF1DX1lVhptIYRda', // Hot Country (crossover)
    '37i9dQZF1DX4dyzvuaRJ0n'  // mint (electronic pop)
  ],
  rock: [
    '37i9dQZF1DWXRqgorJj26U', // Rock Classics
    '37i9dQZF1DX3oM43CtKnRV', // Rock This
    '37i9dQZF1DWWwzidNQX6jx', // All Out 2000s
    '37i9dQZF1DX1stG8W0Vl2U', // Rock Hard
    '37i9dQZF1DX8f6LXxYF5km', // Rock Hits
    '37i9dQZF1DX0XUsuxWHRQd', // RapCaviar (rock rap)
    '37i9dQZF1DX4dyzvuaRJ0n', // mint (electronic rock)
    '37i9dQZF1DX6J5NfMJS675'  // Dance Rising (rock dance)
  ],
  'hip-hop': [
    '37i9dQZF1DX0XUsuxWHRQd', // RapCaviar
    '37i9dQZF1DWY4xHQp97fN6', // Get Turnt
    '37i9dQZF1DX2RxBh64BHjQ', // Feelin' Myself
    '37i9dQZF1DX4JAvHpjipBk', // New Music Friday
    '37i9dQZF1DX10zKzsJ2jva', // Summer Hits
    '37i9dQZF1DX1stG8W0Vl2U', // Rock Hard (rap rock)
    '37i9dQZF1DX4dyzvuaRJ0n', // mint (electronic rap)
    '37i9dQZF1DX6J5NfMJS675'  // Dance Rising (rap dance)
  ],
  country: [
    '37i9dQZF1DX1lVhptIYRda', // Hot Country
    '37i9dQZF1DWZBCPUIUs2iR', // Country Gold
    '37i9dQZF1DX93D9SC7vVVB', // Wild Country
    '37i9dQZF1DX4JAvHpjipBk', // New Music Friday
    '37i9dQZF1DX10zKzsJ2jva', // Summer Hits
    '37i9dQZF1DXcBWIGoYBM5M', // Today's Top Hits (country crossover)
    '37i9dQZF1DX0XUsuxWHRQd', // RapCaviar (country rap)
    '37i9dQZF1DX4dyzvuaRJ0n'  // mint (country electronic)
  ],
  electronic: [
    '37i9dQZF1DX4dyzvuaRJ0n', // mint
    '37i9dQZF1DX6J5NfMJS675', // Dance Rising
    '37i9dQZF1DX8tZsk68tuDw', // Electronic Circus
    '37i9dQZF1DX4JAvHpjipBk', // New Music Friday
    '37i9dQZF1DX10zKzsJ2jva', // Summer Hits
    '37i9dQZF1DXcBWIGoYBM5M', // Today's Top Hits (electronic pop)
    '37i9dQZF1DX0XUsuxWHRQd', // RapCaviar (electronic rap)
    '37i9dQZF1DX1stG8W0Vl2U'  // Rock Hard (electronic rock)
  ]
};

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

async function fetchGenreTracks(genre = 'all', limit = 150) {
  const accessToken = await getSpotifyAccessToken();
  const playlistIds = GENRE_PLAYLISTS[genre] || GENRE_PLAYLISTS.all;
  
  const allTracks = [];
  
  for (const playlistId of playlistIds) {
    try {
      const response = await fetch(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );
      
      const data = await response.json();
      
      if (data && data.items) {
        const tracks = data.items
          .filter(item => item.track && !item.track.is_local)
          .map(item => ({
            id: item.track.id,
            title: item.track.name,
            artist: item.track.artists[0].name,
            artwork: item.track.album.images[0]?.url,
            url: item.track.external_urls.spotify,
            album: item.track.album.name,
            popularity: item.track.popularity,
            previewUrl: item.track.preview_url,
            durationMs: item.track.duration_ms,
            releaseDate: item.track.album.release_date,
            genre: genre,
            explicit: item.track.explicit
          }));
        
        allTracks.push(...tracks);
      }
    } catch (error) {
      console.error(`Error fetching playlist ${playlistId}:`, error);
    }
    
    if (allTracks.length >= limit) break;
  }
  
  // Shuffle and return requested number of tracks
  return shuffleArray(allTracks).slice(0, limit);
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Vercel serverless function handler
module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  const { genre = 'all', limit = 20, offset = 0 } = req.query;
  
  // Handle cron job request to refresh cache
  if (req.query.refresh === 'true') {
    const authHeader = req.headers['authorization'];
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.log('Unauthorized cache refresh request');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    try {
      console.log('Starting trending music cache refresh...');
      const tracks = await fetchGenreTracks(genre, 20);
      
      if (tracks.length === 0) {
        console.log('No tracks fetched, skipping cache update');
        return res.status(500).json({ 
          success: false, 
          error: 'No tracks fetched from Spotify' 
        });
      }
      
      await kv.setex(`trending:music:${genre}`, 86400, JSON.stringify({
        tracks,
        cached_at: new Date().toISOString()
      }));
      
      console.log(`Successfully cached ${tracks.length} tracks for genre ${genre}`);
      
      return res.json({ 
        success: true, 
        cached: tracks.length, 
        genre: genre,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in cache refresh:', error);
      return res.status(500).json({ 
        success: false,
        error: error.message 
      });
    }
  }
  
  // Check cache first
  try {
    const cached = await kv.get(`trending:music:${genre}`);
    if (cached) {
      const data = typeof cached === 'string' ? JSON.parse(cached) : cached;
      console.log(`Returning cached ${genre} music from:`, data.cached_at);
      
      // Apply pagination to cached data
      const startIndex = parseInt(offset);
      const endIndex = startIndex + parseInt(limit);
      const paginatedTracks = data.tracks.slice(startIndex, endIndex);
      
      return res.json({
        success: true,
        tracks: paginatedTracks,
        genre: genre,
        cached_at: data.cached_at,
        from_cache: true,
        total: data.tracks.length,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: endIndex < data.tracks.length,
        timestamp: new Date().toISOString()
      });
    }
  } catch (kvError) {
    console.log('Cache miss, fetching fresh data');
  }
  
  // Fetch fresh data
  try {
    const tracks = await fetchGenreTracks(genre, 150);
    
    // Cache for 24 hours
    if (tracks.length > 0) {
      try {
        await kv.setex(`trending:music:${genre}`, 86400, JSON.stringify({
          tracks,
          cached_at: new Date().toISOString()
        }));
        console.log(`Cached fresh ${genre} music`);
      } catch (kvError) {
        console.error('Error caching data:', kvError);
      }
    }
    
    // Apply pagination to fresh data
    const startIndex = parseInt(offset);
    const endIndex = startIndex + parseInt(limit);
    const paginatedTracks = tracks.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      tracks: paginatedTracks,
      genre: genre,
      from_cache: false,
      total: tracks.length,
      limit: parseInt(limit),
      offset: parseInt(offset),
      hasMore: endIndex < tracks.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error in trending endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trending tracks'
    });
  }
};