const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const jwtSecret = process.env.TRACKSHARE_JWT_SECRET;

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to verify JWT token
function verifyToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  try {
    return jwt.verify(token, jwtSecret);
  } catch (error) {
    return null;
  }
}

// Helper function to get user ID from token
function getUserId(req) {
  const payload = verifyToken(req);
  return payload ? payload.userId : null;
}

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { method } = req;
  const userId = getUserId(req);

  try {
    switch (method) {
      case 'GET':
        return await handleGetRecommendations(req, res, userId);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Recommendations API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/recommendations - Get personalized music recommendations
async function handleGetRecommendations(req, res, userId) {
  const { 
    type = 'mixed', 
    limit = 20, 
    offset = 0,
    genre = null,
    mood = null,
    energy = null
  } = req.query;

  try {
    let recommendations = [];

    if (userId) {
      // Personalized recommendations for signed-in users
      recommendations = await getPersonalizedRecommendations(userId, {
        type,
        limit: parseInt(limit),
        offset: parseInt(offset),
        genre,
        mood,
        energy
      });
    } else {
      // General recommendations for anonymous users
      recommendations = await getGeneralRecommendations({
        type,
        limit: parseInt(limit),
        offset: parseInt(offset),
        genre,
        mood,
        energy
      });
    }

    res.json({
      success: true,
      recommendations,
      total: recommendations.length,
      has_more: recommendations.length === parseInt(limit),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in handleGetRecommendations:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
}

// Get personalized recommendations based on user activity
async function getPersonalizedRecommendations(userId, options) {
  const recommendations = [];
  
  try {
    // 1. Get user's music preferences
    const { data: profile } = await supabase
      .from('profiles')
      .select('music_preferences')
      .eq('id', userId)
      .single();

    const musicPreferences = profile?.music_preferences || {};

    // 2. Get user's recent posts to understand taste
    const { data: recentPosts } = await supabase
      .from('music_posts')
      .select('track_title, track_artist, track_album')
      .eq('user_id', userId)
      .order('posted_at', { ascending: false })
      .limit(10);

    // 3. Get user's liked posts
    const { data: likedPosts } = await supabase
      .from('post_likes')
      .select(`
        music_posts!post_likes_post_id_fkey (
          track_title, track_artist, track_album
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    // 4. Get friends' recent posts for social recommendations
    const { data: friendsPosts } = await supabase
      .from('friendships')
      .select(`
        profiles!friendships_addressee_id_fkey (
          music_posts (
            track_title, track_artist, track_album, track_artwork_url,
            track_spotify_url, like_count, comment_count, posted_at
          )
        )
      `)
      .eq('requester_id', userId)
      .eq('status', 'accepted')
      .limit(5);

    // 5. Generate recommendations based on different strategies
    const strategies = ['similar_artists', 'trending_friends', 'genre_exploration', 'mood_based'];
    
    for (const strategy of strategies) {
      if (recommendations.length >= options.limit) break;
      
      let strategyRecommendations = [];
      
      switch (strategy) {
        case 'similar_artists':
          strategyRecommendations = await getSimilarArtistRecommendations(recentPosts, likedPosts, options);
          break;
        case 'trending_friends':
          strategyRecommendations = await getTrendingFriendsRecommendations(friendsPosts, options);
          break;
        case 'genre_exploration':
          strategyRecommendations = await getGenreExplorationRecommendations(musicPreferences, options);
          break;
        case 'mood_based':
          strategyRecommendations = await getMoodBasedRecommendations(options);
          break;
      }
      
      recommendations.push(...strategyRecommendations);
    }

    // 6. Remove duplicates and limit results
    const uniqueRecommendations = removeDuplicateRecommendations(recommendations);
    return uniqueRecommendations.slice(options.offset, options.offset + options.limit);

  } catch (error) {
    console.error('Error getting personalized recommendations:', error);
    return await getGeneralRecommendations(options);
  }
}

// Get general recommendations for anonymous users
async function getGeneralRecommendations(options) {
  try {
    // Use trending music as general recommendations
    const trendingResponse = await fetch(`${process.env.TRACKSHARE_BASE_URL || 'https://www.trackshare.online'}/api/trending?limit=${options.limit}&offset=${options.offset}`);
    const trendingData = await trendingResponse.json();
    
    if (trendingData.success && trendingData.tracks) {
      return trendingData.tracks.map(track => ({
        id: track.id,
        title: track.title,
        artist: track.artist,
        album: track.album,
        artwork: track.artwork,
        url: track.url,
        popularity: track.popularity,
        explicit: track.explicit,
        recommendation_reason: 'Trending now',
        recommendation_type: 'trending',
        confidence: 0.8
      }));
    }
    
    return [];
  } catch (error) {
    console.error('Error getting general recommendations:', error);
    return [];
  }
}

// Get recommendations based on similar artists
async function getSimilarArtistRecommendations(userPosts, likedPosts, options) {
  const recommendations = [];
  
  // Extract artists from user's activity
  const userArtists = new Set();
  userPosts?.forEach(post => userArtists.add(post.track_artist));
  likedPosts?.forEach(like => {
    if (like.music_posts?.track_artist) {
      userArtists.add(like.music_posts.track_artist);
    }
  });

  // For now, return mock similar artist recommendations
  // In a real implementation, you'd use Spotify's "Get Artist's Related Artists" API
  const similarArtists = Array.from(userArtists).slice(0, 3);
  
  similarArtists.forEach(artist => {
    recommendations.push({
      id: `similar_${artist}_${Math.random()}`,
      title: `Song by ${artist}`,
      artist: artist,
      album: 'Similar Artist Album',
      artwork: 'https://via.placeholder.com/300x300/667eea/ffffff?text=Music',
      url: 'https://open.spotify.com/track/example',
      popularity: 75,
      explicit: false,
      recommendation_reason: `Similar to ${artist}`,
      recommendation_type: 'similar_artist',
      confidence: 0.9
    });
  });

  return recommendations.slice(0, 5);
}

// Get trending recommendations from friends
async function getTrendingFriendsRecommendations(friendsPosts, options) {
  const recommendations = [];
  
  friendsPosts?.forEach(friendship => {
    const posts = friendship.profiles?.music_posts || [];
    posts.forEach(post => {
      recommendations.push({
        id: `friend_${post.id}`,
        title: post.track_title,
        artist: post.track_artist,
        album: post.track_album,
        artwork: post.track_artwork_url,
        url: post.track_spotify_url,
        popularity: (post.like_count || 0) + (post.comment_count || 0),
        explicit: false,
        recommendation_reason: 'Popular with friends',
        recommendation_type: 'trending_friends',
        confidence: 0.7
      });
    });
  });

  // Sort by popularity and return top recommendations
  return recommendations
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 5);
}

// Get genre exploration recommendations
async function getGenreExplorationRecommendations(musicPreferences, options) {
  const recommendations = [];
  
  // Get user's preferred genres
  const preferredGenres = musicPreferences.preferred_genres || ['pop', 'rock', 'electronic'];
  
  // Generate recommendations for each preferred genre
  preferredGenres.forEach(genre => {
    recommendations.push({
      id: `genre_${genre}_${Math.random()}`,
      title: `Discover ${genre.charAt(0).toUpperCase() + genre.slice(1)}`,
      artist: `${genre.charAt(0).toUpperCase() + genre.slice(1)} Artist`,
      album: `${genre.charAt(0).toUpperCase() + genre.slice(1)} Album`,
      artwork: 'https://via.placeholder.com/300x300/764ba2/ffffff?text=Genre',
      url: 'https://open.spotify.com/track/example',
      popularity: 60,
      explicit: false,
      recommendation_reason: `Explore ${genre} music`,
      recommendation_type: 'genre_exploration',
      confidence: 0.6
    });
  });

  return recommendations.slice(0, 3);
}

// Get mood-based recommendations
async function getMoodBasedRecommendations(options) {
  const recommendations = [];
  
  const moods = ['happy', 'chill', 'energetic', 'melancholic'];
  const selectedMood = options.mood || moods[Math.floor(Math.random() * moods.length)];
  
  recommendations.push({
    id: `mood_${selectedMood}_${Math.random()}`,
    title: `${selectedMood.charAt(0).toUpperCase() + selectedMood.slice(1)} Vibes`,
    artist: 'Mood Artist',
    album: `${selectedMood.charAt(0).toUpperCase() + selectedMood.slice(1)} Album`,
    artwork: 'https://via.placeholder.com/300x300/f093fb/ffffff?text=Mood',
    url: 'https://open.spotify.com/track/example',
    popularity: 70,
    explicit: false,
    recommendation_reason: `Perfect for ${selectedMood} mood`,
    recommendation_type: 'mood_based',
    confidence: 0.8
  });

  return recommendations;
}

// Remove duplicate recommendations
function removeDuplicateRecommendations(recommendations) {
  const seen = new Set();
  return recommendations.filter(rec => {
    const key = `${rec.title}_${rec.artist}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
