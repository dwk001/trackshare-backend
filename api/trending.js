const { kv } = require('@vercel/kv');

// Spotify API credentials (these should be in environment variables)
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

// Get Spotify access token using client credentials
async function getSpotifyAccessToken() {
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
  return data.access_token;
}

// Fetch trending tracks using Spotify's Browse API (New Releases)
async function fetchTrendingTracks() {
  try {
    const accessToken = await getSpotifyAccessToken();
    console.log('Got access token:', accessToken ? 'Yes' : 'No');
    
    // Use Browse API to get new releases instead of playlists
    // This doesn't require special permissions
    const response = await fetch(`https://api.spotify.com/v1/browse/new-releases?limit=20`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    const data = await response.json();
    
    console.log('Spotify API response status:', response.status);
    
    // Check if response has albums
    if (!data || !data.albums || !data.albums.items) {
      console.log('No items in response:', JSON.stringify(data, null, 2));
      return [];
    }
    
    // Get tracks from the first few albums
    const tracks = [];
    for (const album of data.albums.items.slice(0, 10)) {
      try {
        const albumResponse = await fetch(`https://api.spotify.com/v1/albums/${album.id}/tracks?limit=2`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        
        const albumData = await albumResponse.json();
        
        if (albumData && albumData.items) {
          for (const track of albumData.items) {
            tracks.push({
              id: track.id,
              title: track.name,
              artist: track.artists[0].name,
              artwork: album.images[0]?.url || null,
              url: track.external_urls.spotify,
              genre: 'new-release',
              popularity: album.popularity || 50
            });
            
            if (tracks.length >= 20) break;
          }
        }
        
        if (tracks.length >= 20) break;
      } catch (err) {
        console.error('Error fetching album tracks:', err);
      }
    }
    
    console.log(`Successfully fetched ${tracks.length} tracks`);
    return tracks;
  } catch (error) {
    console.error('Error fetching trending tracks:', error);
    return [];
  }
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
  
  // Handle cron job request to refresh cache
  if (req.query.refresh === 'true') {
    const authHeader = req.headers['authorization'];
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.log('Unauthorized cache refresh request');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    try {
      console.log('Starting trending music cache refresh...');
      const tracks = await fetchTrendingTracks();
      
      if (tracks.length === 0) {
        console.log('No tracks fetched, skipping cache update');
        return res.status(500).json({ 
          success: false, 
          error: 'No tracks fetched from Spotify' 
        });
      }
      
      await kv.setex('trending:music:latest', 86400, JSON.stringify({
        tracks,
        cached_at: new Date().toISOString()
      }));
      
      console.log(`Successfully cached ${tracks.length} tracks`);
      
      return res.json({ 
        success: true, 
        cached: tracks.length, 
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
  
  try {
    // Try to get cached data first
    let cachedData;
    try {
      cachedData = await kv.get('trending:music:latest');
    } catch (kvError) {
      console.log('KV cache error:', kvError);
    }
    
    if (cachedData) {
      const data = typeof cachedData === 'string' ? JSON.parse(cachedData) : cachedData;
      console.log('Returning cached trending music from:', data.cached_at);
      return res.json({
        success: true,
        tracks: data.tracks,
        cached_at: data.cached_at,
        from_cache: true,
        timestamp: new Date().toISOString()
      });
    }
    
    // If no cache, fetch fresh data
    console.log('Cache miss, fetching fresh data from Spotify');
    const tracks = await fetchTrendingTracks();
    
    // Cache the fresh data for 24 hours
    if (tracks.length > 0) {
      try {
        await kv.setex('trending:music:latest', 86400, JSON.stringify({
          tracks,
          cached_at: new Date().toISOString()
        }));
        console.log('Cached fresh trending music');
      } catch (kvError) {
        console.error('Error caching data:', kvError);
      }
    }
    
    res.json({
      success: true,
      tracks,
      from_cache: false,
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
