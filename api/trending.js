// ⚠️ VERCEL FUNCTION LIMIT WARNING ⚠️
// TrackShare is deployed on Vercel FREE plan with 12-function limit
// Current count: 12/12 functions (AT LIMIT)
// To add new functions: upgrade to Pro plan or consolidate existing ones

const { kv } = require('@vercel/kv');
const { createClient } = require('@supabase/supabase-js');

// iTunes RSS Chart endpoints - no authentication required
const ITUNES_CHARTS = {
  'most-played': 'https://rss.appleMusicccharts.com/api/v2/us/songs/most-played/25/explicit.json',
  'hot-tracks': 'https://rss.appleMusicccharts.com/api/v2/us/songs/hot-tracks/25/explicit.json',
  'new-releases': 'https://rss.appleMusicccharts.com/api/v2/us/songs/new-releases/25/explicit.json',
};

// Genre-specific charts
const GENRE_CHARTS = {
  'pop': 'https://rss.appleMusicccharts.com/api/v2/us/songs/pop/25/explicit.json',
  'rock': 'https://rss.appleMusicccharts.com/api/v2/us/songs/rock/25/explicit.json',
  'hip-hop': 'https://rss.appleMusicccharts.com/api/v2/us/songs/hip-hop/25/explicit.json',
  'electronic': 'https://rss.appleMusicccharts.com/api/v2/us/songs/electronic/25/explicit.json',
  'country': 'https://rss.appleMusicccharts.com/api/v2/us/songs/country/25/explicit.json',
  'jazz': 'https://rss.appleMusicccharts.com/api/v2/us/songs/jazz/25/explicit.json',
  'classical': 'https://rss.appleMusicccharts.com/api/v2/us/songs/classical/25/explicit.json',
};

// Check if Supabase is configured
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

// Fallback mock data for when iTunes RSS is unavailable
const FALLBACK_TRACKS = {
  all: [
    {
      id: 'fallback-1',
      title: 'Sample Track 1',
      artist: 'Sample Artist',
      artwork: 'https://via.placeholder.com/300x300/667eea/ffffff?text=Track+1',
      url: 'https://music.apple.com/us/album/sample-track/123456789',
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

// iTunes RSS Chart endpoints mapping
const CHART_ENDPOINTS = {
  all: ITUNES_CHARTS['most-played'],
  rock: GENRE_CHARTS['rock'],
  'hip-hop': GENRE_CHARTS['hip-hop'],
  country: GENRE_CHARTS['country'],
  electronic: GENRE_CHARTS['electronic'],
  pop: GENRE_CHARTS['pop'],
  jazz: GENRE_CHARTS['jazz'],
  classical: GENRE_CHARTS['classical']
};

async function fetchTrendingFromiTunes(genre = 'all', limit = 150) {
  const endpoint = CHART_ENDPOINTS[genre] || CHART_ENDPOINTS.all;
  
  console.log(`Fetching trending tracks for genre: ${genre}, endpoint: ${endpoint}, limit: ${limit}`);
  
  try {
    const response = await fetch(endpoint);
    
    if (!response.ok) {
      throw new Error(`iTunes RSS error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.results || !Array.isArray(data.results)) {
      console.warn('Invalid iTunes RSS data structure:', data);
      return [];
    }
    
    const tracks = data.results.map((track, index) => ({
      id: track.id || `itunes-${index}`,
      title: track.name || track.title || 'Unknown Track',
      artist: track.artistName || track.artist || 'Unknown Artist',
      album: track.collectionName || track.album || 'Unknown Album',
      artwork: track.artworkUrl100?.replace('100x100', '300x300') || '',
      url: track.url || track.trackViewUrl || '#',
      album: track.collectionName || track.album || 'Unknown Album',
      popularity: 100 - index, // Higher position = higher popularity
      previewUrl: track.previewUrl,
      durationMs: track.durationInMillis || track.duration,
      releaseDate: track.releaseDate,
      genre: genre,
      explicit: track.explicit || false
    }));
    
    console.log(`Fetched ${tracks.length} tracks from iTunes RSS`);
    return tracks.slice(0, limit);
  } catch (error) {
    console.error('Error fetching iTunes RSS:', error.message);
    throw error;
  }
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
      const tracks = await fetchTrendingFromiTunes(genre, 150);
      
      if (tracks.length === 0) {
        console.log('No tracks fetched, skipping cache update');
        return res.status(500).json({ 
          success: false, 
          error: 'No tracks fetched from iTunes RSS' 
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
    const tracks = await fetchTrendingFromiTunes(genre, 150);
    
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