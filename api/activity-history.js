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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { method } = req;
  const userId = getUserId(req);

  try {
    switch (method) {
      case 'GET':
        return await handleGetActivity(req, res, userId);
      case 'POST':
        return await handleCreateActivity(req, res, userId);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Activity API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/activity - Get user activity history
async function handleGetActivity(req, res, userId) {
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { 
    type = 'all', 
    limit = 50, 
    offset = 0,
    start_date,
    end_date,
    include_stats = false
  } = req.query;

  try {
    const activities = [];
    const startDate = start_date ? new Date(start_date) : null;
    const endDate = end_date ? new Date(end_date) : null;

    // 1. Music Posts Created
    if (type === 'all' || type === 'posts') {
      let postsQuery = supabase
        .from('music_posts')
        .select(`
          id,
          track_title,
          track_artist,
          track_artwork_url,
          caption,
          privacy,
          like_count,
          comment_count,
          posted_at
        `)
        .eq('user_id', userId)
        .order('posted_at', { ascending: false })
        .limit(parseInt(limit));

      if (startDate) postsQuery = postsQuery.gte('posted_at', startDate.toISOString());
      if (endDate) postsQuery = postsQuery.lte('posted_at', endDate.toISOString());

      const { data: posts, error: postsError } = await postsQuery;

      if (!postsError && posts) {
        posts.forEach(post => {
          activities.push({
            id: `post_${post.id}`,
            type: 'post_created',
            title: 'Created Music Post',
            description: `Posted "${post.track_title}" by ${post.track_artist}`,
            metadata: {
              track_title: post.track_title,
              track_artist: post.track_artist,
              track_artwork_url: post.track_artwork_url,
              caption: post.caption,
              privacy: post.privacy,
              like_count: post.like_count,
              comment_count: post.comment_count
            },
            timestamp: post.posted_at,
            icon: '🎵'
          });
        });
      }
    }

    // 2. Likes Given
    if (type === 'all' || type === 'likes') {
      let likesQuery = supabase
        .from('post_likes')
        .select(`
          id,
          created_at,
          music_posts!post_likes_post_id_fkey (
            id,
            track_title,
            track_artist,
            track_artwork_url,
            profiles!music_posts_user_id_fkey (
              display_name
            )
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(parseInt(limit));

      if (startDate) likesQuery = likesQuery.gte('created_at', startDate.toISOString());
      if (endDate) likesQuery = likesQuery.lte('created_at', endDate.toISOString());

      const { data: likes, error: likesError } = await likesQuery;

      if (!likesError && likes) {
        likes.forEach(like => {
          activities.push({
            id: `like_${like.id}`,
            type: 'like_given',
            title: 'Liked Music Post',
            description: `Liked "${like.music_posts?.track_title}" by ${like.music_posts?.track_artist}`,
            metadata: {
              track_title: like.music_posts?.track_title,
              track_artist: like.music_posts?.track_artist,
              track_artwork_url: like.music_posts?.track_artwork_url,
              post_author: like.music_posts?.profiles?.display_name
            },
            timestamp: like.created_at,
            icon: '❤️'
          });
        });
      }
    }

    // 3. Comments Made
    if (type === 'all' || type === 'comments') {
      let commentsQuery = supabase
        .from('post_comments')
        .select(`
          id,
          content,
          created_at,
          music_posts!post_comments_post_id_fkey (
            id,
            track_title,
            track_artist,
            track_artwork_url,
            profiles!music_posts_user_id_fkey (
              display_name
            )
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(parseInt(limit));

      if (startDate) commentsQuery = commentsQuery.gte('created_at', startDate.toISOString());
      if (endDate) commentsQuery = commentsQuery.lte('created_at', endDate.toISOString());

      const { data: comments, error: commentsError } = await commentsQuery;

      if (!commentsError && comments) {
        comments.forEach(comment => {
          activities.push({
            id: `comment_${comment.id}`,
            type: 'comment_made',
            title: 'Commented on Post',
            description: `Commented on "${comment.music_posts?.track_title}" by ${comment.music_posts?.track_artist}`,
            metadata: {
              content: comment.content,
              track_title: comment.music_posts?.track_title,
              track_artist: comment.music_posts?.track_artist,
              track_artwork_url: comment.music_posts?.track_artwork_url,
              post_author: comment.music_posts?.profiles?.display_name
            },
            timestamp: comment.created_at,
            icon: '💬'
          });
        });
      }
    }

    // 4. Friends Added
    if (type === 'all' || type === 'friends') {
      let friendsQuery = supabase
        .from('friendships')
        .select(`
          id,
          created_at,
          profiles!friendships_addressee_id_fkey (
            display_name,
            avatar_url
          )
        `)
        .eq('requester_id', userId)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false })
        .limit(parseInt(limit));

      if (startDate) friendsQuery = friendsQuery.gte('created_at', startDate.toISOString());
      if (endDate) friendsQuery = friendsQuery.lte('created_at', endDate.toISOString());

      const { data: friends, error: friendsError } = await friendsQuery;

      if (!friendsError && friends) {
        friends.forEach(friendship => {
          activities.push({
            id: `friend_${friendship.id}`,
            type: 'friend_added',
            title: 'Added Friend',
            description: `Became friends with ${friendship.profiles?.display_name}`,
            metadata: {
              friend_name: friendship.profiles?.display_name,
              friend_avatar: friendship.profiles?.avatar_url
            },
            timestamp: friendship.created_at,
            icon: '👥'
          });
        });
      }
    }

    // Sort all activities by timestamp
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Apply pagination
    const startIndex = parseInt(offset);
    const endIndex = startIndex + parseInt(limit);
    const paginatedActivities = activities.slice(startIndex, endIndex);

    const result = {
      activities: paginatedActivities,
      total: activities.length,
      has_more: endIndex < activities.length
    };

    // Add stats if requested
    if (include_stats === 'true') {
      result.stats = await getActivityStats(userId, startDate, endDate);
    }

    res.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in handleGetActivity:', error);
    res.status(500).json({ error: 'Failed to fetch activity history' });
  }
}

// POST /api/activity - Create activity log entry
async function handleCreateActivity(req, res, userId) {
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { type, description, metadata } = req.body;

  if (!type || !description) {
    return res.status(400).json({ error: 'Type and description required' });
  }

  try {
    // For now, we'll just return success since we're aggregating from existing tables
    // In a full implementation, you might want to create a dedicated activity_logs table
    
    res.status(201).json({
      success: true,
      message: 'Activity logged successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in handleCreateActivity:', error);
    res.status(500).json({ error: 'Failed to log activity' });
  }
}

// Helper function to get activity statistics
async function getActivityStats(userId, startDate, endDate) {
  const stats = {};

  try {
    // Posts created
    let postsQuery = supabase
      .from('music_posts')
      .select('id', { count: 'exact' })
      .eq('user_id', userId);

    if (startDate) postsQuery = postsQuery.gte('posted_at', startDate.toISOString());
    if (endDate) postsQuery = postsQuery.lte('posted_at', endDate.toISOString());

    const { count: postsCount } = await postsQuery;
    stats.posts_created = postsCount || 0;

    // Likes given
    let likesQuery = supabase
      .from('post_likes')
      .select('id', { count: 'exact' })
      .eq('user_id', userId);

    if (startDate) likesQuery = likesQuery.gte('created_at', startDate.toISOString());
    if (endDate) likesQuery = likesQuery.lte('created_at', endDate.toISOString());

    const { count: likesCount } = await likesQuery;
    stats.likes_given = likesCount || 0;

    // Comments made
    let commentsQuery = supabase
      .from('post_comments')
      .select('id', { count: 'exact' })
      .eq('user_id', userId);

    if (startDate) commentsQuery = commentsQuery.gte('created_at', startDate.toISOString());
    if (endDate) commentsQuery = commentsQuery.lte('created_at', endDate.toISOString());

    const { count: commentsCount } = await commentsQuery;
    stats.comments_made = commentsCount || 0;

    // Friends added
    let friendsQuery = supabase
      .from('friendships')
      .select('id', { count: 'exact' })
      .eq('requester_id', userId)
      .eq('status', 'accepted');

    if (startDate) friendsQuery = friendsQuery.gte('created_at', startDate.toISOString());
    if (endDate) friendsQuery = friendsQuery.lte('created_at', endDate.toISOString());

    const { count: friendsCount } = await friendsQuery;
    stats.friends_added = friendsCount || 0;

    return stats;

  } catch (error) {
    console.error('Error getting activity stats:', error);
    return {};
  }
}
