const { createClient } = require('@supabase/supabase-js');
const { kv } = require('@vercel/kv');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

const supabase = createClient(supabaseUrl, supabaseKey);

// System user ID for TrackShare Official posts
const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

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

async function fetchTrendingTracks() {
  const accessToken = await getSpotifyAccessToken();
  
  // Fetch from Today's Top Hits playlist
  const response = await fetch(
    'https://api.spotify.com/v1/playlists/37i9dQZF1DXcBWIGoYBM5M/tracks?limit=20',
    {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    }
  );
  
  const data = await response.json();
  
  if (data && data.items) {
    return data.items
      .filter(item => item.track && !item.track.is_local)
      .map(item => ({
        id: item.track.id,
        title: item.track.name,
        artist: item.track.artists[0].name,
        album: item.track.album.name,
        artwork: item.track.album.images[0]?.url,
        url: item.track.external_urls.spotify,
        duration: item.track.duration_ms,
        popularity: item.track.popularity,
        explicit: item.track.explicit
      }));
  }
  
  return [];
}

async function createSystemUser() {
  // Create system user profile if it doesn't exist
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
        privacy: 'public',
        settings: { is_system: true }
      });

    if (error) {
      console.error('Error creating system user:', error);
      throw error;
    }
    
    console.log('System user created');
  }
}

async function createTrendingPosts() {
  try {
    await createSystemUser();
    
    const tracks = await fetchTrendingTracks();
    console.log(`Fetched ${tracks.length} trending tracks`);
    
    const posts = tracks.map(track => ({
      user_id: SYSTEM_USER_ID,
      track_id: track.id,
      track_title: track.title,
      track_artist: track.artist,
      track_album: track.album,
      track_artwork_url: track.artwork,
      track_spotify_url: track.url,
      track_duration_ms: track.duration,
      caption: `🔥 ${track.title} by ${track.artist} is trending now!`,
      privacy: 'public',
      like_count: Math.floor(Math.random() * 50) + 10, // Random engagement
      comment_count: Math.floor(Math.random() * 20) + 5,
      play_count: Math.floor(Math.random() * 200) + 50,
      share_count: Math.floor(Math.random() * 30) + 5
    }));

    // Insert posts in batches
    const batchSize = 5;
    for (let i = 0; i < posts.length; i += batchSize) {
      const batch = posts.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from('music_posts')
        .insert(batch);

      if (error) {
        console.error(`Error inserting batch ${i}-${i + batchSize}:`, error);
      } else {
        console.log(`Inserted batch ${i}-${i + batchSize}`);
      }
    }

    console.log(`Successfully created ${posts.length} trending posts`);
    
  } catch (error) {
    console.error('Error creating trending posts:', error);
    throw error;
  }
}

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check for cron secret
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.log('Unauthorized trending posts request');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('Starting trending posts creation...');
    await createTrendingPosts();
    
    res.json({
      success: true,
      message: 'Trending posts created successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error in trending posts endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
