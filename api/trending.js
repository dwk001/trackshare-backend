const { kv } = require('@vercel/kv');
const { createClient } = require('@supabase/supabase-js');

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

// Check if required environment variables are set
const hasSpotifyCredentials = SPOTIFY_CLIENT_ID && SPOTIFY_CLIENT_SECRET;
const hasSupabaseConfig = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize Supabase client only if credentials are available
let supabase = null;
if (hasSupabaseConfig) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

// Fallback mock data for when Spotify API is unavailable
const FALLBACK_TRACKS = {
  all: [
    {
      id: 'fallback-1',
      title: 'Sample Track 1',
      artist: 'Sample Artist',
      artwork: 'https://via.placeholder.com/300x300/667eea/ffffff?text=Track+1',
      url: 'https://open.spotify.com/track/sample1',
      album: 'Sample Album',
      popularity: 85,
      previewUrl: null,
      durationMs: 180000,
      releaseDate: '2024-01-01',
      genre: 'all',
      explicit: false
    },
    {
      id: 'fallback-2',
      title: 'Sample Track 2',
      artist: 'Sample Artist 2',
      artwork: 'https://via.placeholder.com/300x300/667eea/ffffff?text=Track+2',
      url: 'https://open.spotify.com/track/sample2',
      album: 'Sample Album 2',
      popularity: 78,
      previewUrl: null,
      durationMs: 200000,
      releaseDate: '2024-01-02',
      genre: 'all',
      explicit: false
    },
    {
      id: 'fallback-3',
      title: 'Sample Track 3',
      artist: 'Sample Artist 3',
      artwork: 'https://via.placeholder.com/300x300/667eea/ffffff?text=Track+3',
      url: 'https://open.spotify.com/track/sample3',
      album: 'Sample Album 3',
      popularity: 92,
      previewUrl: null,
      durationMs: 160000,
      releaseDate: '2024-01-03',
      genre: 'all',
      explicit: false
    }
  ]
};

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
  // Check if credentials are available
  if (!hasSpotifyCredentials) {
    console.warn('Spotify credentials not configured, using fallback data');
    return null;
  }

  // Check cache first
  try {
    const cached = await kv.get('spotify:access_token');
    if (cached) return cached;
  } catch (e) {
    console.warn('Cache unavailable, fetching fresh token');
  }
  
  const auth = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');
  
  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });
    
    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Cache for 55 minutes (tokens valid for 1 hour)
    if (data.access_token) {
      try {
        await kv.setex('spotify:access_token', 3300, data.access_token);
      } catch (e) {
        console.warn('Failed to cache token:', e.message);
      }
    }
    
    return data.access_token;
  } catch (error) {
    console.error('Failed to get Spotify access token:', error.message);
    return null;
  }
}

async function fetchGenreTracks(genre = 'all', limit = 150) {
  const accessToken = await getSpotifyAccessToken();
  
  // If no access token (missing credentials or API failure), return fallback data
  if (!accessToken) {
    console.log('Using fallback tracks due to Spotify API unavailability');
    const fallbackTracks = FALLBACK_TRACKS[genre] || FALLBACK_TRACKS.all;
    return fallbackTracks.slice(0, limit);
  }
  
  const playlistIds = GENRE_PLAYLISTS[genre] || GENRE_PLAYLISTS.all;
  
  console.log(`Fetching tracks for genre: ${genre}, playlists: ${playlistIds.length}, limit: ${limit}`);
  
  const allTracks = [];
  
  for (const playlistId of playlistIds) {
    try {
      const response = await fetch(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );
      
      if (!response.ok) {
        console.warn(`Spotify API error for playlist ${playlistId}: ${response.status}`);
        continue;
      }
      
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
        
        console.log(`Playlist ${playlistId}: fetched ${tracks.length} tracks`);
        allTracks.push(...tracks);
      }
    } catch (error) {
      console.error(`Error fetching playlist ${playlistId}:`, error.message);
    }
    
    if (allTracks.length >= limit) break;
  }
  
  // If no tracks were fetched, return fallback data
  if (allTracks.length === 0) {
    console.log('No tracks fetched from Spotify, using fallback data');
    const fallbackTracks = FALLBACK_TRACKS[genre] || FALLBACK_TRACKS.all;
    return fallbackTracks.slice(0, limit);
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
  
  const { genre = 'all', limit = 20, offset = 0, seed = false } = req.query;
  
  // Handle cron job request to refresh cache
  if (req.query.refresh === 'true') {
    const authHeader = req.headers['authorization'];
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.log('Unauthorized cache refresh request');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    try {
      console.log('Starting trending music cache refresh...');
      const tracks = await fetchGenreTracks(genre, 150);
      
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
  
  // Handle seed request to create trending posts
  if (seed === 'true') {
    const authHeader = req.headers['authorization'];
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.log('Unauthorized seed request');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    try {
      console.log('Starting trending posts seeding...');
      await seedTrendingPosts();
      return res.json({ 
        success: true, 
        message: 'Trending posts seeded successfully'
      });
    } catch (error) {
      console.error('Seed error:', error);
      return res.status(500).json({ error: 'Seed failed' });
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
    
    // Provide fallback data even on error
    const fallbackTracks = FALLBACK_TRACKS[genre] || FALLBACK_TRACKS.all;
    const startIndex = parseInt(offset);
    const endIndex = startIndex + parseInt(limit);
    const paginatedTracks = fallbackTracks.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      tracks: paginatedTracks,
      genre: genre,
      from_cache: false,
      from_fallback: true,
      total: fallbackTracks.length,
      limit: parseInt(limit),
      offset: parseInt(offset),
      hasMore: endIndex < fallbackTracks.length,
      timestamp: new Date().toISOString(),
      warning: 'Using fallback data due to service unavailability'
    });
  }
};

// ========================================
// SEED TRENDING POSTS FUNCTIONALITY (merged from seed-trending-posts.js)
// ========================================

async function seedTrendingPosts() {
  try {
    console.log('Starting trending posts seeding...');
    
    // Ensure system user exists
    await ensureSystemUser();
    
    // Fetch trending tracks
    const tracks = await fetchTrendingTracks();
    
    if (tracks.length === 0) {
      console.log('No tracks to seed');
      return;
    }
    
    // Create posts for trending tracks
    let createdCount = 0;
    for (const track of tracks.slice(0, 10)) { // Limit to 10 posts per run
      try {
        const { error } = await supabase
          .from('music_posts')
          .insert({
            user_id: SYSTEM_USER_ID,
            track_id: track.id,
            track_title: track.title,
            track_artist: track.artist,
            track_album: track.album,
            track_artwork_url: track.artwork,
            track_spotify_url: track.spotify_url,
            track_duration_ms: track.duration_ms,
            caption: `🔥 Currently trending on TrackShare!`,
            privacy: 'public'
          });
          
        if (!error) {
          createdCount++;
        } else {
          console.error('Error creating post:', error);
        }
      } catch (postError) {
        console.error('Error creating post for track:', track.title, postError);
      }
    }
    
    console.log(`Successfully created ${createdCount} trending posts`);
    
  } catch (error) {
    console.error('Error in seedTrendingPosts:', error);
    throw error;
  }
}

async function ensureSystemUser() {
  try {
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', SYSTEM_USER_ID)
      .single();
      
    if (!existingUser) {
      const { error } = await supabase
        .from('profiles')
        .insert({
          id: SYSTEM_USER_ID,
          email: 'system@trackshare.online',
          display_name: 'TrackShare Official',
          avatar_url: 'https://trackshare.online/logo.png',
          created_at: new Date().toISOString()
        });
        
      if (error) {
        console.error('Error creating system user:', error);
      } else {
        console.log('Created system user for trending posts');
      }
    }
  } catch (error) {
    console.error('Error ensuring system user:', error);
  }
}