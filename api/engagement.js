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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { method } = req;
  const userId = getUserId(req);

  try {
    switch (method) {
      case 'GET':
        return await handleGetEngagement(req, res, userId);
      case 'POST':
        return await handleCreateEngagement(req, res, userId);
      case 'DELETE':
        return await handleDeleteEngagement(req, res, userId);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Engagement API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/engagement - Get likes/comments for a post
async function handleGetEngagement(req, res, userId) {
  const { post_id, type = 'all' } = req.query; // type: 'likes', 'comments', 'all'

  if (!post_id) {
    return res.status(400).json({ error: 'Post ID required' });
  }

  try {
    const results = {};

    if (type === 'all' || type === 'likes') {
      const { data: likes, error: likesError } = await supabase
        .from('post_likes')
        .select(`
          id,
          created_at,
          profiles!post_likes_user_id_fkey (
            id,
            display_name,
            avatar_url
          )
        `)
        .eq('post_id', post_id)
        .order('created_at', { ascending: false });

      if (likesError) {
        console.error('Error fetching likes:', likesError);
        return res.status(500).json({ error: 'Failed to fetch likes' });
      }

      results.likes = likes || [];
    }

    if (type === 'all' || type === 'comments') {
      const { data: comments, error: commentsError } = await supabase
        .from('post_comments')
        .select(`
          id,
          content,
          created_at,
          updated_at,
          profiles!post_comments_user_id_fkey (
            id,
            display_name,
            avatar_url
          )
        `)
        .eq('post_id', post_id)
        .order('created_at', { ascending: true });

      if (commentsError) {
        console.error('Error fetching comments:', commentsError);
        return res.status(500).json({ error: 'Failed to fetch comments' });
      }

      results.comments = comments || [];
    }

    res.json({
      success: true,
      ...results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in handleGetEngagement:', error);
    res.status(500).json({ error: 'Failed to fetch engagement data' });
  }
}

// POST /api/engagement - Like post, add comment, or record share
async function handleCreateEngagement(req, res, userId) {
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { post_id, type, content, platform } = req.body;

  if (!post_id || !type) {
    return res.status(400).json({ error: 'Post ID and type required' });
  }

  // Validate type
  if (!['like', 'comment', 'share'].includes(type)) {
    return res.status(400).json({ error: 'Invalid engagement type' });
  }

  try {
    // First verify the post exists
    const { data: post, error: postError } = await supabase
      .from('music_posts')
      .select('id, privacy, user_id')
      .eq('id', post_id)
      .single();

    if (postError || !post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    // Check privacy for non-public posts
    if (post.privacy !== 'public') {
      // For friends-only posts, check if user is friends with post author
      if (post.privacy === 'friends') {
        const { data: friendship } = await supabase
          .from('friendships')
          .select('id')
          .or(`and(requester_id.eq.${userId},addressee_id.eq.${post.user_id}),and(requester_id.eq.${post.user_id},addressee_id.eq.${userId})`)
          .eq('status', 'accepted')
          .single();

        if (!friendship) {
          return res.status(403).json({ error: 'Not authorized to engage with this post' });
        }
      } else if (post.privacy === 'private' && post.user_id !== userId) {
        return res.status(403).json({ error: 'Not authorized to engage with this post' });
      }
    }

    let result;

    switch (type) {
      case 'like':
        // Check if already liked
        const { data: existingLike } = await supabase
          .from('post_likes')
          .select('id')
          .eq('post_id', post_id)
          .eq('user_id', userId)
          .single();

        if (existingLike) {
          return res.status(400).json({ error: 'Post already liked' });
        }

        const { data: like, error: likeError } = await supabase
          .from('post_likes')
          .insert({
            post_id,
            user_id: userId
          })
          .select(`
            id,
            created_at,
            profiles!post_likes_user_id_fkey (
              id,
              display_name,
              avatar_url
            )
          `)
          .single();

        if (likeError) {
          console.error('Error creating like:', likeError);
          return res.status(500).json({ error: 'Failed to like post' });
        }

        result = { like };
        break;

      case 'comment':
        if (!content || content.trim().length === 0) {
          return res.status(400).json({ error: 'Comment content required' });
        }

        if (content.length > 1000) {
          return res.status(400).json({ error: 'Comment too long (max 1000 characters)' });
        }

        const { data: comment, error: commentError } = await supabase
          .from('post_comments')
          .insert({
            post_id,
            user_id: userId,
            content: content.trim()
          })
          .select(`
            id,
            content,
            created_at,
            updated_at,
            profiles!post_comments_user_id_fkey (
              id,
              display_name,
              avatar_url
            )
          `)
          .single();

        if (commentError) {
          console.error('Error creating comment:', commentError);
          return res.status(500).json({ error: 'Failed to add comment' });
        }

        result = { comment };
        break;

      case 'share':
        if (!platform) {
          return res.status(400).json({ error: 'Platform required for share' });
        }

        // Check if already shared on this platform
        const { data: existingShare } = await supabase
          .from('post_shares')
          .select('id')
          .eq('post_id', post_id)
          .eq('user_id', userId)
          .eq('platform', platform)
          .single();

        if (existingShare) {
          return res.status(400).json({ error: 'Post already shared on this platform' });
        }

        const { data: share, error: shareError } = await supabase
          .from('post_shares')
          .insert({
            post_id,
            user_id: userId,
            platform
          })
          .select('id, platform, created_at')
          .single();

        if (shareError) {
          console.error('Error creating share:', shareError);
          return res.status(500).json({ error: 'Failed to record share' });
        }

        result = { share };
        break;
    }

    res.status(201).json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in handleCreateEngagement:', error);
    res.status(500).json({ error: 'Failed to create engagement' });
  }
}

// DELETE /api/engagement - Unlike post or delete comment
async function handleDeleteEngagement(req, res, userId) {
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { post_id, type, comment_id } = req.query;

  if (!post_id || !type) {
    return res.status(400).json({ error: 'Post ID and type required' });
  }

  // Validate type
  if (!['like', 'comment'].includes(type)) {
    return res.status(400).json({ error: 'Invalid engagement type' });
  }

  try {
    let result;

    switch (type) {
      case 'like':
        const { error: unlikeError } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', post_id)
          .eq('user_id', userId);

        if (unlikeError) {
          console.error('Error removing like:', unlikeError);
          return res.status(500).json({ error: 'Failed to unlike post' });
        }

        result = { message: 'Post unliked successfully' };
        break;

      case 'comment':
        if (!comment_id) {
          return res.status(400).json({ error: 'Comment ID required' });
        }

        // First check if user owns the comment
        const { data: existingComment, error: fetchError } = await supabase
          .from('post_comments')
          .select('user_id')
          .eq('id', comment_id)
          .eq('post_id', post_id)
          .single();

        if (fetchError || !existingComment) {
          return res.status(404).json({ error: 'Comment not found' });
        }

        if (existingComment.user_id !== userId) {
          return res.status(403).json({ error: 'Not authorized to delete this comment' });
        }

        const { error: deleteError } = await supabase
          .from('post_comments')
          .delete()
          .eq('id', comment_id);

        if (deleteError) {
          console.error('Error deleting comment:', deleteError);
          return res.status(500).json({ error: 'Failed to delete comment' });
        }

        result = { message: 'Comment deleted successfully' };
        break;
    }

    res.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in handleDeleteEngagement:', error);
    res.status(500).json({ error: 'Failed to delete engagement' });
  }
}
