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
        return await handleGetNotifications(req, res, userId);
      case 'POST':
        return await handleMarkAsRead(req, res, userId);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Notifications API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/notifications - Get user notifications
async function handleGetNotifications(req, res, userId) {
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { limit = 20, offset = 0, unread_only = false } = req.query;

  try {
    // Get notifications from various sources
    const notifications = [];

    // 1. Friend requests
    const { data: friendRequests, error: friendError } = await supabase
      .from('friendships')
      .select(`
        id,
        created_at,
        profiles!friendships_requester_id_fkey (
          id,
          display_name,
          avatar_url
        )
      `)
      .eq('addressee_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (!friendError && friendRequests) {
      friendRequests.forEach(request => {
        notifications.push({
          id: `friend_request_${request.id}`,
          type: 'friend_request',
          title: 'New Friend Request',
          message: `${request.profiles?.display_name || 'Someone'} wants to be your friend`,
          avatar: request.profiles?.avatar_url,
          user_id: request.profiles?.id,
          created_at: request.created_at,
          read: false // We'll implement read status later
        });
      });
    }

    // 2. Post likes
    const { data: postLikes, error: likesError } = await supabase
      .from('post_likes')
      .select(`
        id,
        created_at,
        post_id,
        profiles!post_likes_user_id_fkey (
          id,
          display_name,
          avatar_url
        ),
        music_posts!post_likes_post_id_fkey (
          id,
          track_title,
          track_artist
        )
      `)
      .eq('music_posts.user_id', userId)
      .neq('post_likes.user_id', userId) // Don't notify for own likes
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (!likesError && postLikes) {
      postLikes.forEach(like => {
        notifications.push({
          id: `like_${like.id}`,
          type: 'like',
          title: 'New Like',
          message: `${like.profiles?.display_name || 'Someone'} liked your post "${like.music_posts?.track_title}"`,
          avatar: like.profiles?.avatar_url,
          user_id: like.profiles?.id,
          post_id: like.post_id,
          created_at: like.created_at,
          read: false
        });
      });
    }

    // 3. Post comments
    const { data: postComments, error: commentsError } = await supabase
      .from('post_comments')
      .select(`
        id,
        created_at,
        post_id,
        content,
        profiles!post_comments_user_id_fkey (
          id,
          display_name,
          avatar_url
        ),
        music_posts!post_comments_post_id_fkey (
          id,
          track_title,
          track_artist
        )
      `)
      .eq('music_posts.user_id', userId)
      .neq('post_comments.user_id', userId) // Don't notify for own comments
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (!commentsError && postComments) {
      postComments.forEach(comment => {
        notifications.push({
          id: `comment_${comment.id}`,
          type: 'comment',
          title: 'New Comment',
          message: `${comment.profiles?.display_name || 'Someone'} commented on your post "${comment.music_posts?.track_title}"`,
          avatar: comment.profiles?.avatar_url,
          user_id: comment.profiles?.id,
          post_id: comment.post_id,
          content: comment.content,
          created_at: comment.created_at,
          read: false
        });
      });
    }

    // Sort all notifications by created_at
    notifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Apply pagination
    const startIndex = parseInt(offset);
    const endIndex = startIndex + parseInt(limit);
    const paginatedNotifications = notifications.slice(startIndex, endIndex);

    // Count unread notifications
    const unreadCount = notifications.filter(n => !n.read).length;

    res.json({
      success: true,
      notifications: paginatedNotifications,
      unread_count: unreadCount,
      total: notifications.length,
      has_more: endIndex < notifications.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in handleGetNotifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
}

// POST /api/notifications - Mark notifications as read
async function handleMarkAsRead(req, res, userId) {
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { notification_ids, mark_all = false } = req.body;

  try {
    if (mark_all) {
      // Mark all notifications as read (we'll implement this with a notifications table later)
      res.json({
        success: true,
        message: 'All notifications marked as read',
        timestamp: new Date().toISOString()
      });
    } else if (notification_ids && Array.isArray(notification_ids)) {
      // Mark specific notifications as read
      res.json({
        success: true,
        message: `${notification_ids.length} notifications marked as read`,
        timestamp: new Date().toISOString()
      });
    } else {
      return res.status(400).json({ error: 'Invalid request parameters' });
    }

  } catch (error) {
    console.error('Error in handleMarkAsRead:', error);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
}
