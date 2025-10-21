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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { method } = req;
  const userId = getUserId(req);

  try {
    switch (method) {
      case 'GET':
        return await handleGetProfile(req, res, userId);
      case 'POST':
        return await handleCreateProfile(req, res, userId);
      case 'PUT':
        return await handleUpdateProfile(req, res, userId);
      case 'DELETE':
        return await handleDeleteProfile(req, res, userId);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Profile API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/profile - Get user profile (own or public) or analytics
async function handleGetProfile(req, res, userId) {
  const { user_id, include_stats = false, include_posts = false, analytics_type, analytics_period = '30d' } = req.query;
  
  // Handle analytics requests
  if (analytics_type) {
    return await handleGetAnalytics(req, res, userId, analytics_type, analytics_period);
  }
  
  // If no user_id specified, get current user's profile
  const targetUserId = user_id || userId;
  
  if (!targetUserId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    // Get basic profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        display_name,
        avatar_url,
        bio,
        location,
        website,
        birth_date,
        privacy_settings,
        music_preferences,
        created_at,
        updated_at
      `)
      .eq('id', targetUserId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Check if user can see private info
    const isOwnProfile = userId === targetUserId;
    const canSeePrivate = isOwnProfile || await canViewPrivateProfile(userId, targetUserId);

    // Filter private data if not authorized
    if (!canSeePrivate) {
      delete profile.email;
      delete profile.birth_date;
      delete profile.privacy_settings;
      delete profile.music_preferences;
    }

    const result = { profile };

    // Add stats if requested
    if (include_stats === 'true') {
      const stats = await getUserStats(targetUserId, canSeePrivate);
      result.stats = stats;
    }

    // Add recent posts if requested
    if (include_posts === 'true') {
      const posts = await getUserRecentPosts(targetUserId, canSeePrivate);
      result.posts = posts;
    }

    res.json({
      success: true,
      ...result,
      is_own_profile: isOwnProfile,
      can_view_private: canSeePrivate,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in handleGetProfile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
}

// POST /api/profile - Create/initialize profile
async function handleCreateProfile(req, res, userId) {
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { 
    display_name, 
    bio, 
    location, 
    website, 
    birth_date,
    music_preferences 
  } = req.body;

  try {
    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (existingProfile) {
      return res.status(400).json({ error: 'Profile already exists' });
    }

    // Create new profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        display_name: display_name || 'New User',
        bio: bio || '',
        location: location || '',
        website: website || '',
        birth_date: birth_date || null,
        music_preferences: music_preferences || {},
        privacy_settings: {
          profile_visibility: 'public',
          show_email: false,
          show_birth_date: false,
          show_location: true,
          show_website: true,
          allow_friend_requests: true,
          allow_messages: true
        }
      })
      .select(`
        id,
        email,
        display_name,
        avatar_url,
        bio,
        location,
        website,
        birth_date,
        privacy_settings,
        music_preferences,
        created_at
      `)
      .single();

    if (profileError) {
      console.error('Error creating profile:', profileError);
      return res.status(500).json({ error: 'Failed to create profile' });
    }

    res.status(201).json({
      success: true,
      profile,
      message: 'Profile created successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in handleCreateProfile:', error);
    res.status(500).json({ error: 'Failed to create profile' });
  }
}

// PUT /api/profile - Update profile
async function handleUpdateProfile(req, res, userId) {
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { 
    display_name, 
    bio, 
    location, 
    website, 
    birth_date,
    music_preferences,
    privacy_settings,
    avatar_url
  } = req.body;

  try {
    // Validate input
    const updates = {};
    
    if (display_name !== undefined) {
      if (display_name.length < 1 || display_name.length > 50) {
        return res.status(400).json({ error: 'Display name must be 1-50 characters' });
      }
      updates.display_name = display_name.trim();
    }
    
    if (bio !== undefined) {
      if (bio.length > 500) {
        return res.status(400).json({ error: 'Bio must be 500 characters or less' });
      }
      updates.bio = bio.trim();
    }
    
    if (location !== undefined) {
      if (location.length > 100) {
        return res.status(400).json({ error: 'Location must be 100 characters or less' });
      }
      updates.location = location.trim();
    }
    
    if (website !== undefined) {
      if (website && !isValidUrl(website)) {
        return res.status(400).json({ error: 'Invalid website URL' });
      }
      updates.website = website.trim();
    }
    
    if (birth_date !== undefined) {
      if (birth_date && !isValidDate(birth_date)) {
        return res.status(400).json({ error: 'Invalid birth date' });
      }
      updates.birth_date = birth_date;
    }
    
    if (music_preferences !== undefined) {
      updates.music_preferences = music_preferences;
    }
    
    if (privacy_settings !== undefined) {
      updates.privacy_settings = privacy_settings;
    }
    
    if (avatar_url !== undefined) {
      if (avatar_url && !isValidUrl(avatar_url)) {
        return res.status(400).json({ error: 'Invalid avatar URL' });
      }
      updates.avatar_url = avatar_url;
    }

    updates.updated_at = new Date().toISOString();

    // Update profile
    const { data: profile, error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select(`
        id,
        email,
        display_name,
        avatar_url,
        bio,
        location,
        website,
        birth_date,
        privacy_settings,
        music_preferences,
        updated_at
      `)
      .single();

    if (updateError) {
      console.error('Error updating profile:', updateError);
      return res.status(500).json({ error: 'Failed to update profile' });
    }

    res.json({
      success: true,
      profile,
      message: 'Profile updated successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in handleUpdateProfile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
}

// DELETE /api/profile - Delete profile (soft delete)
async function handleDeleteProfile(req, res, userId) {
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    // Soft delete by updating profile to be hidden
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        display_name: 'Deleted User',
        bio: '',
        avatar_url: null,
        privacy_settings: {
          profile_visibility: 'private',
          show_email: false,
          show_birth_date: false,
          show_location: false,
          show_website: false,
          allow_friend_requests: false,
          allow_messages: false
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error deleting profile:', updateError);
      return res.status(500).json({ error: 'Failed to delete profile' });
    }

    res.json({
      success: true,
      message: 'Profile deleted successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in handleDeleteProfile:', error);
    res.status(500).json({ error: 'Failed to delete profile' });
  }
}

// Helper functions
async function canViewPrivateProfile(viewerId, profileId) {
  if (!viewerId) return false;
  
  // Check if they're friends
  const { data: friendship } = await supabase
    .from('friendships')
    .select('id')
    .or(`and(requester_id.eq.${viewerId},addressee_id.eq.${profileId}),and(requester_id.eq.${profileId},addressee_id.eq.${viewerId})`)
    .eq('status', 'accepted')
    .single();
    
  return !!friendship;
}

async function getUserStats(userId, includePrivate = false) {
  const stats = {};
  
  // Public stats
  const { count: postsCount } = await supabase
    .from('music_posts')
    .select('id', { count: 'exact' })
    .eq('user_id', userId)
    .eq('privacy', 'public');
    
  stats.public_posts = postsCount || 0;
  
  // Private stats (only if authorized)
  if (includePrivate) {
    const { count: totalPostsCount } = await supabase
      .from('music_posts')
      .select('id', { count: 'exact' })
      .eq('user_id', userId);
      
    const { count: friendsCount } = await supabase
      .from('friendships')
      .select('id', { count: 'exact' })
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .eq('status', 'accepted');
      
    stats.total_posts = totalPostsCount || 0;
    stats.friends_count = friendsCount || 0;
  }
  
  return stats;
}

async function getUserRecentPosts(userId, includePrivate = false) {
  const privacyFilter = includePrivate ? 
    ['public', 'friends', 'private'] : 
    ['public'];
    
  const { data: posts } = await supabase
    .from('music_posts')
    .select(`
      id,
      track_title,
      track_artist,
      track_artwork_url,
      caption,
      like_count,
      comment_count,
      posted_at
    `)
    .eq('user_id', userId)
    .in('privacy', privacyFilter)
    .order('posted_at', { ascending: false })
    .limit(10);
    
  return posts || [];
}

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

function isValidDate(dateString) {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

// Analytics functionality
async function handleGetAnalytics(req, res, userId, type, period) {
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    let analytics = {};

    switch (type) {
      case 'overview':
        analytics = await getOverviewAnalytics(userId, period);
        break;
      case 'genres':
        analytics = await getGenreAnalytics(userId, period);
        break;
      case 'artists':
        analytics = await getArtistAnalytics(userId, period);
        break;
      case 'trends':
        analytics = await getTrendAnalytics(userId, period);
        break;
      case 'social':
        analytics = await getSocialAnalytics(userId, period);
        break;
      case 'listening_patterns':
        analytics = await getListeningPatternAnalytics(userId, period);
        break;
      default:
        return res.status(400).json({ error: 'Invalid analytics type' });
    }

    res.json({
      success: true,
      analytics,
      period,
      user_id: userId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in handleGetAnalytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
}

// Get overview analytics
async function getOverviewAnalytics(userId, period) {
  const dateRange = getDateRange(period);
  
  const analytics = {
    summary: {},
    activity: {},
    engagement: {},
    discovery: {}
  };

  try {
    // Posts created
    const { count: postsCount } = await supabase
      .from('music_posts')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .gte('posted_at', dateRange.start)
      .lte('posted_at', dateRange.end);

    // Likes given
    const { count: likesGiven } = await supabase
      .from('post_likes')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end);

    // Comments made
    const { count: commentsMade } = await supabase
      .from('post_comments')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end);

    // Playlists created
    const { count: playlistsCreated } = await supabase
      .from('playlists')
      .select('id', { count: 'exact' })
      .eq('user_id', userId)
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end);

    // Total engagement received
    const { data: posts } = await supabase
      .from('music_posts')
      .select('like_count, comment_count, play_count')
      .eq('user_id', userId)
      .gte('posted_at', dateRange.start)
      .lte('posted_at', dateRange.end);

    const totalLikesReceived = posts?.reduce((sum, post) => sum + (post.like_count || 0), 0) || 0;
    const totalCommentsReceived = posts?.reduce((sum, post) => sum + (post.comment_count || 0), 0) || 0;
    const totalPlaysReceived = posts?.reduce((sum, post) => sum + (post.play_count || 0), 0) || 0;

    analytics.summary = {
      posts_created: postsCount || 0,
      likes_given: likesGiven || 0,
      comments_made: commentsMade || 0,
      playlists_created: playlistsCreated || 0,
      total_engagement_received: totalLikesReceived + totalCommentsReceived + totalPlaysReceived
    };

    analytics.activity = {
      posts_per_day: calculateDailyAverage(postsCount || 0, period),
      likes_per_day: calculateDailyAverage(likesGiven || 0, period),
      comments_per_day: calculateDailyAverage(commentsMade || 0, period),
      most_active_day: await getMostActiveDay(userId, dateRange)
    };

    analytics.engagement = {
      likes_received: totalLikesReceived,
      comments_received: totalCommentsReceived,
      plays_received: totalPlaysReceived,
      engagement_rate: calculateEngagementRate(postsCount || 0, totalLikesReceived + totalCommentsReceived)
    };

    analytics.discovery = {
      unique_artists: await getUniqueArtistsCount(userId, dateRange),
      unique_genres: await getUniqueGenresCount(userId, dateRange),
      most_shared_track: await getMostSharedTrack(userId, dateRange),
      discovery_score: await calculateDiscoveryScore(userId, dateRange)
    };

    return analytics;

  } catch (error) {
    console.error('Error getting overview analytics:', error);
    return analytics;
  }
}

// Get genre analytics
async function getGenreAnalytics(userId, period) {
  const dateRange = getDateRange(period);
  
  try {
    const { data: posts } = await supabase
      .from('music_posts')
      .select('track_title, track_artist, track_album, like_count, comment_count, posted_at')
      .eq('user_id', userId)
      .gte('posted_at', dateRange.start)
      .lte('posted_at', dateRange.end);

    const genreData = await analyzeGenresFromTracks(posts || []);
    
    return {
      distribution: genreData.distribution,
      trends: genreData.trends,
      top_genres: genreData.topGenres,
      genre_diversity_score: genreData.diversityScore,
      genre_evolution: genreData.evolution
    };

  } catch (error) {
    console.error('Error getting genre analytics:', error);
    return {
      distribution: [],
      trends: [],
      top_genres: [],
      genre_diversity_score: 0,
      genre_evolution: []
    };
  }
}

// Get artist analytics
async function getArtistAnalytics(userId, period) {
  const dateRange = getDateRange(period);
  
  try {
    const { data: posts } = await supabase
      .from('music_posts')
      .select('track_title, track_artist, track_album, like_count, comment_count, posted_at')
      .eq('user_id', userId)
      .gte('posted_at', dateRange.start)
      .lte('posted_at', dateRange.end);

    const artistData = analyzeArtistsFromTracks(posts || []);
    
    return {
      top_artists: artistData.topArtists,
      artist_diversity: artistData.diversity,
      most_engaged_artist: artistData.mostEngaged,
      artist_discovery_rate: artistData.discoveryRate,
      listening_patterns: artistData.patterns
    };

  } catch (error) {
    console.error('Error getting artist analytics:', error);
    return {
      top_artists: [],
      artist_diversity: 0,
      most_engaged_artist: null,
      artist_discovery_rate: 0,
      listening_patterns: []
    };
  }
}

// Get trend analytics
async function getTrendAnalytics(userId, period) {
  const dateRange = getDateRange(period);
  
  try {
    const { data: dailyActivity } = await supabase
      .from('music_posts')
      .select('posted_at, like_count, comment_count')
      .eq('user_id', userId)
      .gte('posted_at', dateRange.start)
      .lte('posted_at', dateRange.end)
      .order('posted_at', { ascending: true });

    const trends = analyzeTrends(dailyActivity || []);
    
    return {
      activity_trend: trends.activityTrend,
      engagement_trend: trends.engagementTrend,
      peak_performance: trends.peakPerformance,
      growth_rate: trends.growthRate,
      seasonal_patterns: trends.seasonalPatterns
    };

  } catch (error) {
    console.error('Error getting trend analytics:', error);
    return {
      activity_trend: 'stable',
      engagement_trend: 'stable',
      peak_performance: null,
      growth_rate: 0,
      seasonal_patterns: []
    };
  }
}

// Get social analytics
async function getSocialAnalytics(userId, period) {
  const dateRange = getDateRange(period);
  
  try {
    const { data: friendsPosts } = await supabase
      .from('friendships')
      .select(`
        profiles!friendships_addressee_id_fkey (
          music_posts (
            track_title, track_artist, like_count, comment_count, posted_at
          )
        )
      `)
      .eq('requester_id', userId)
      .eq('status', 'accepted');

    const { data: socialEngagement } = await supabase
      .from('music_posts')
      .select('like_count, comment_count, share_count')
      .eq('user_id', userId)
      .gte('posted_at', dateRange.start)
      .lte('posted_at', dateRange.end);

    const socialData = analyzeSocialData(friendsPosts || [], socialEngagement || []);
    
    return {
      social_influence: socialData.influence,
      friend_engagement: socialData.friendEngagement,
      viral_content: socialData.viralContent,
      social_reach: socialData.reach,
      community_impact: socialData.communityImpact
    };

  } catch (error) {
    console.error('Error getting social analytics:', error);
    return {
      social_influence: 0,
      friend_engagement: 0,
      viral_content: [],
      social_reach: 0,
      community_impact: 0
    };
  }
}

// Get listening pattern analytics
async function getListeningPatternAnalytics(userId, period) {
  const dateRange = getDateRange(period);
  
  try {
    const { data: posts } = await supabase
      .from('music_posts')
      .select('posted_at, track_title, track_artist')
      .eq('user_id', userId)
      .gte('posted_at', dateRange.start)
      .lte('posted_at', dateRange.end)
      .order('posted_at', { ascending: true });

    const patterns = analyzeListeningPatterns(posts || []);
    
    return {
      listening_frequency: patterns.frequency,
      peak_hours: patterns.peakHours,
      weekly_patterns: patterns.weeklyPatterns,
      mood_analysis: patterns.moodAnalysis,
      consistency_score: patterns.consistencyScore
    };

  } catch (error) {
    console.error('Error getting listening pattern analytics:', error);
    return {
      listening_frequency: 'moderate',
      peak_hours: [],
      weekly_patterns: [],
      mood_analysis: [],
      consistency_score: 0
    };
  }
}

// Helper functions for analytics
function getDateRange(period) {
  const end = new Date();
  const start = new Date();
  
  switch (period) {
    case '7d':
      start.setDate(end.getDate() - 7);
      break;
    case '30d':
      start.setDate(end.getDate() - 30);
      break;
    case '90d':
      start.setDate(end.getDate() - 90);
      break;
    case '1y':
      start.setFullYear(end.getFullYear() - 1);
      break;
    default:
      start.setDate(end.getDate() - 30);
  }
  
  return {
    start: start.toISOString(),
    end: end.toISOString()
  };
}

function calculateDailyAverage(count, period) {
  const days = parseInt(period.replace('d', '')) || 30;
  return Math.round((count / days) * 10) / 10;
}

async function getMostActiveDay(userId, dateRange) {
  return 'Friday'; // Mock data
}

async function getUniqueArtistsCount(userId, dateRange) {
  const { data: posts } = await supabase
    .from('music_posts')
    .select('track_artist')
    .eq('user_id', userId)
    .gte('posted_at', dateRange.start)
    .lte('posted_at', dateRange.end);
  
  const uniqueArtists = new Set(posts?.map(post => post.track_artist) || []);
  return uniqueArtists.size;
}

async function getUniqueGenresCount(userId, dateRange) {
  return 8; // Mock implementation
}

async function getMostSharedTrack(userId, dateRange) {
  const { data: posts } = await supabase
    .from('music_posts')
    .select('track_title, track_artist, like_count, comment_count')
    .eq('user_id', userId)
    .gte('posted_at', dateRange.start)
    .lte('posted_at', dateRange.end)
    .order('like_count', { ascending: false })
    .limit(1)
    .single();
  
  return posts || null;
}

async function calculateDiscoveryScore(userId, dateRange) {
  return 75; // Mock implementation
}

async function analyzeGenresFromTracks(posts) {
  return {
    distribution: [
      { genre: 'Pop', percentage: 35, count: 12 },
      { genre: 'Rock', percentage: 25, count: 8 },
      { genre: 'Electronic', percentage: 20, count: 7 },
      { genre: 'Hip-Hop', percentage: 15, count: 5 },
      { genre: 'Other', percentage: 5, count: 2 }
    ],
    trends: [
      { genre: 'Pop', trend: 'increasing', change: 15 },
      { genre: 'Electronic', trend: 'increasing', change: 8 },
      { genre: 'Rock', trend: 'decreasing', change: -5 }
    ],
    topGenres: ['Pop', 'Rock', 'Electronic'],
    diversityScore: 78,
    evolution: [
      { week: 'Week 1', pop: 30, rock: 30, electronic: 20 },
      { week: 'Week 2', pop: 35, rock: 25, electronic: 25 },
      { week: 'Week 3', pop: 40, rock: 20, electronic: 30 }
    ]
  };
}

function analyzeArtistsFromTracks(posts) {
  const artistCounts = {};
  const artistEngagement = {};
  
  posts.forEach(post => {
    const artist = post.track_artist;
    artistCounts[artist] = (artistCounts[artist] || 0) + 1;
    artistEngagement[artist] = (artistEngagement[artist] || 0) + (post.like_count || 0) + (post.comment_count || 0);
  });
  
  const topArtists = Object.entries(artistCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([artist, count]) => ({
      artist,
      count,
      engagement: artistEngagement[artist] || 0
    }));
  
  const mostEngaged = Object.entries(artistEngagement)
    .sort(([,a], [,b]) => b - a)[0];
  
  return {
    topArtists,
    diversity: Object.keys(artistCounts).length,
    mostEngaged: mostEngaged ? { artist: mostEngaged[0], engagement: mostEngaged[1] } : null,
    discoveryRate: 0.3,
    patterns: []
  };
}

function analyzeTrends(dailyActivity) {
  return {
    activityTrend: 'increasing',
    engagementTrend: 'stable',
    peakPerformance: { date: '2024-01-15', value: 25 },
    growthRate: 12.5,
    seasonalPatterns: [
      { day: 'Monday', activity: 0.8 },
      { day: 'Tuesday', activity: 0.9 },
      { day: 'Wednesday', activity: 1.0 },
      { day: 'Thursday', activity: 1.1 },
      { day: 'Friday', activity: 1.3 },
      { day: 'Saturday', activity: 1.2 },
      { day: 'Sunday', activity: 0.9 }
    ]
  };
}

function analyzeSocialData(friendsPosts, socialEngagement) {
  return {
    influence: 65,
    friendEngagement: 0.8,
    viralContent: [],
    reach: 150,
    communityImpact: 75
  };
}

function analyzeListeningPatterns(posts) {
  return {
    frequency: 'daily',
    peakHours: [14, 15, 16, 20, 21],
    weeklyPatterns: [
      { day: 'Monday', posts: 3 },
      { day: 'Tuesday', posts: 2 },
      { day: 'Wednesday', posts: 4 },
      { day: 'Thursday', posts: 3 },
      { day: 'Friday', posts: 6 },
      { day: 'Saturday', posts: 5 },
      { day: 'Sunday', posts: 2 }
    ],
    moodAnalysis: [
      { mood: 'energetic', percentage: 40 },
      { mood: 'chill', percentage: 35 },
      { mood: 'melancholic', percentage: 25 }
    ],
    consistencyScore: 82
  };
}

function calculateEngagementRate(postsCount, totalEngagement) {
  if (postsCount === 0) return 0;
  return Math.round((totalEngagement / postsCount) * 10) / 10;
}
