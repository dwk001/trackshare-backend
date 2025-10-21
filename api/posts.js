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
    // Check if this is an engagement request (has engagement_type query param)
    const { engagement_type, playlists } = req.query;
    
    if (engagement_type) {
      // Handle engagement endpoints
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
    } else if (playlists === 'true') {
      // Handle playlist endpoints
      switch (method) {
        case 'GET':
          return await handleGetPlaylists(req, res, userId);
        case 'POST':
          return await handleCreatePlaylist(req, res, userId);
        case 'PUT':
          return await handleUpdatePlaylist(req, res, userId);
        case 'DELETE':
          return await handleDeletePlaylist(req, res, userId);
        default:
          return res.status(405).json({ error: 'Method not allowed' });
      }
    } else {
      // Handle regular post endpoints
      switch (method) {
        case 'GET':
          return await handleGetPosts(req, res, userId);
        case 'POST':
          return await handleCreatePost(req, res, userId);
        case 'PUT':
          return await handleUpdatePost(req, res, userId);
        case 'DELETE':
          return await handleDeletePost(req, res, userId);
        default:
          return res.status(405).json({ error: 'Method not allowed' });
      }
    }
  } catch (error) {
    console.error('Posts API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/posts - Get feed posts
async function handleGetPosts(req, res, userId) {
  const { 
    limit = 20, 
    offset = 0, 
    type = 'feed', // 'feed', 'user', 'trending'
    user_id: targetUserId 
  } = req.query;

  try {
    let query = supabase
      .from('music_posts')
      .select(`
        *,
        profiles!music_posts_user_id_fkey (
          id,
          display_name,
          avatar_url
        )
      `)
      .order('posted_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    // Apply filters based on type
    if (type === 'feed') {
      // For feed, show public posts and friends' posts
      if (userId) {
        // Get user's friends
        const { data: friendships } = await supabase
          .from('friendships')
          .select('addressee_id')
          .eq('requester_id', userId)
          .eq('status', 'accepted');

        const friendIds = friendships?.map(f => f.addressee_id) || [];
        
        // Show public posts OR posts from friends
        query = query.or(`privacy.eq.public,user_id.in.(${friendIds.join(',')})`);
      } else {
        // Anonymous users only see public posts
        query = query.eq('privacy', 'public');
      }
    } else if (type === 'user' && targetUserId) {
      // User's own posts (all privacy levels)
      if (userId === targetUserId) {
        query = query.eq('user_id', targetUserId);
      } else {
        // Other user's public posts only
        query = query
          .eq('user_id', targetUserId)
          .eq('privacy', 'public');
      }
    } else if (type === 'trending') {
      // Trending posts (public only, ordered by engagement)
      query = query
        .eq('privacy', 'public')
        .order('like_count', { ascending: false })
        .order('posted_at', { ascending: false });
    }

    const { data: posts, error } = await query;

    if (error) {
      console.error('Error fetching posts:', error);
      return res.status(500).json({ error: 'Failed to fetch posts' });
    }

    // Add user's like status for each post
    let postsWithLikes = posts || [];
    if (userId && posts?.length > 0) {
      const postIds = posts.map(p => p.id);
      const { data: userLikes } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', userId)
        .in('post_id', postIds);

      const likedPostIds = new Set(userLikes?.map(l => l.post_id) || []);
      postsWithLikes = posts.map(post => ({
        ...post,
        is_liked: likedPostIds.has(post.id)
      }));
    }

    res.json({
      success: true,
      posts: postsWithLikes,
      hasMore: posts?.length === parseInt(limit),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in handleGetPosts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
}

// POST /api/posts - Create new post
async function handleCreatePost(req, res, userId) {
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const {
    track_id,
    track_title,
    track_artist,
    track_album,
    track_artwork_url,
    track_spotify_url,
    track_trackshare_url,
    track_duration_ms,
    caption,
    privacy = 'friends'
  } = req.body;

  // Validate required fields
  if (!track_id || !track_title || !track_artist || !track_spotify_url) {
    return res.status(400).json({ error: 'Missing required track information' });
  }

  // Validate privacy setting
  if (!['public', 'friends', 'private'].includes(privacy)) {
    return res.status(400).json({ error: 'Invalid privacy setting' });
  }

  // Validate caption length
  if (caption && caption.length > 500) {
    return res.status(400).json({ error: 'Caption too long (max 500 characters)' });
  }

  try {
    const { data: post, error } = await supabase
      .from('music_posts')
      .insert({
        user_id: userId,
        track_id,
        track_title,
        track_artist,
        track_album,
        track_artwork_url,
        track_spotify_url,
        track_trackshare_url,
        track_duration_ms,
        caption,
        privacy
      })
      .select(`
        *,
        profiles!music_posts_user_id_fkey (
          id,
          display_name,
          avatar_url
        )
      `)
      .single();

    if (error) {
      console.error('Error creating post:', error);
      return res.status(500).json({ error: 'Failed to create post' });
    }

    res.status(201).json({
      success: true,
      post: {
        ...post,
        is_liked: false
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in handleCreatePost:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
}

// PUT /api/posts - Update post
async function handleUpdatePost(req, res, userId) {
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { id } = req.query;
  const { caption, privacy } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Post ID required' });
  }

  // Validate privacy setting
  if (privacy && !['public', 'friends', 'private'].includes(privacy)) {
    return res.status(400).json({ error: 'Invalid privacy setting' });
  }

  // Validate caption length
  if (caption && caption.length > 500) {
    return res.status(400).json({ error: 'Caption too long (max 500 characters)' });
  }

  try {
    // First check if user owns the post
    const { data: existingPost, error: fetchError } = await supabase
      .from('music_posts')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingPost) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (existingPost.user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this post' });
    }

    // Update the post
    const updateData = {};
    if (caption !== undefined) updateData.caption = caption;
    if (privacy !== undefined) updateData.privacy = privacy;

    const { data: post, error } = await supabase
      .from('music_posts')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        profiles!music_posts_user_id_fkey (
          id,
          display_name,
          avatar_url
        )
      `)
      .single();

    if (error) {
      console.error('Error updating post:', error);
      return res.status(500).json({ error: 'Failed to update post' });
    }

    res.json({
      success: true,
      post: {
        ...post,
        is_liked: false
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in handleUpdatePost:', error);
    res.status(500).json({ error: 'Failed to update post' });
  }
}

// DELETE /api/posts - Delete post
async function handleDeletePost(req, res, userId) {
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Post ID required' });
  }

  try {
    // First check if user owns the post
    const { data: existingPost, error: fetchError } = await supabase
      .from('music_posts')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingPost) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (existingPost.user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this post' });
    }

    // Delete the post (cascade will handle related records)
    const { error } = await supabase
      .from('music_posts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting post:', error);
      return res.status(500).json({ error: 'Failed to delete post' });
    }

    res.json({
      success: true,
      message: 'Post deleted successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in handleDeletePost:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
}

// ========================================
// ENGAGEMENT HANDLERS (merged from engagement.js)
// ========================================

// GET /api/posts?engagement_type=1 - Get likes/comments for a post
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

// POST /api/posts?engagement_type=1 - Like post, add comment, or record share
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

// DELETE /api/posts?engagement_type=1 - Unlike post or delete comment
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

// Playlist functionality
async function handleGetPlaylists(req, res, userId) {
  const { 
    user_id, 
    playlist_id,
    limit = 20, 
    offset = 0,
    include_tracks = false,
    privacy = 'all'
  } = req.query;

  try {
    if (playlist_id) {
      // Get specific playlist
      return await getSinglePlaylist(playlist_id, userId, include_tracks === 'true', res);
    }

    // Get multiple playlists
    const targetUserId = user_id || userId;
    
    if (!targetUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    let query = supabase
      .from('playlists')
      .select(`
        id,
        name,
        description,
        artwork_url,
        privacy,
        track_count,
        like_count,
        share_count,
        created_at,
        updated_at,
        profiles!playlists_user_id_fkey (
          display_name,
          avatar_url
        )
      `)
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit))
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    // Apply privacy filter
    if (privacy !== 'all') {
      query = query.eq('privacy', privacy);
    } else if (targetUserId !== userId) {
      // If viewing someone else's playlists, only show public ones
      query = query.eq('privacy', 'public');
    }

    const { data: playlists, error: playlistsError } = await query;

    if (playlistsError) {
      throw playlistsError;
    }

    // Add tracks if requested
    if (include_tracks === 'true' && playlists) {
      for (let playlist of playlists) {
        playlist.tracks = await getPlaylistTracks(playlist.id);
      }
    }

    res.json({
      success: true,
      playlists: playlists || [],
      total: playlists?.length || 0,
      has_more: playlists?.length === parseInt(limit),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in handleGetPlaylists:', error);
    res.status(500).json({ error: 'Failed to fetch playlists' });
  }
}

// POST /api/posts?playlists=true - Create playlist
async function handleCreatePlaylist(req, res, userId) {
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { 
    name, 
    description, 
    privacy = 'public',
    tracks = []
  } = req.body;

  if (!name || name.trim().length === 0) {
    return res.status(400).json({ error: 'Playlist name is required' });
  }

  try {
    // Create playlist
    const { data: playlist, error: playlistError } = await supabase
      .from('playlists')
      .insert({
        user_id: userId,
        name: name.trim(),
        description: description?.trim() || '',
        privacy: privacy,
        track_count: tracks.length,
        artwork_url: tracks.length > 0 ? tracks[0].artwork : null
      })
      .select(`
        id,
        name,
        description,
        artwork_url,
        privacy,
        track_count,
        like_count,
        share_count,
        created_at
      `)
      .single();

    if (playlistError) {
      throw playlistError;
    }

    // Add tracks if provided
    if (tracks.length > 0) {
      const trackInserts = tracks.map((track, index) => ({
        playlist_id: playlist.id,
        track_id: track.id,
        track_title: track.title,
        track_artist: track.artist,
        track_album: track.album,
        track_artwork_url: track.artwork,
        track_spotify_url: track.url,
        track_duration_ms: track.duration_ms,
        position: index + 1
      }));

      const { error: tracksError } = await supabase
        .from('playlist_tracks')
        .insert(trackInserts);

      if (tracksError) {
        console.error('Error adding tracks to playlist:', tracksError);
        // Continue anyway, playlist was created
      }
    }

    res.status(201).json({
      success: true,
      playlist,
      message: 'Playlist created successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in handleCreatePlaylist:', error);
    res.status(500).json({ error: 'Failed to create playlist' });
  }
}

// PUT /api/posts?playlists=true - Update playlist
async function handleUpdatePlaylist(req, res, userId) {
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { playlist_id } = req.query;
  const { 
    name, 
    description, 
    privacy,
    tracks
  } = req.body;

  if (!playlist_id) {
    return res.status(400).json({ error: 'Playlist ID is required' });
  }

  try {
    // Check if user owns the playlist
    const { data: existingPlaylist, error: checkError } = await supabase
      .from('playlists')
      .select('user_id')
      .eq('id', playlist_id)
      .single();

    if (checkError || !existingPlaylist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    if (existingPlaylist.user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this playlist' });
    }

    // Update playlist
    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description.trim();
    if (privacy !== undefined) updates.privacy = privacy;
    if (tracks !== undefined) {
      updates.track_count = tracks.length;
      updates.artwork_url = tracks.length > 0 ? tracks[0].artwork : null;
    }
    updates.updated_at = new Date().toISOString();

    const { data: playlist, error: updateError } = await supabase
      .from('playlists')
      .update(updates)
      .eq('id', playlist_id)
      .select(`
        id,
        name,
        description,
        artwork_url,
        privacy,
        track_count,
        like_count,
        share_count,
        updated_at
      `)
      .single();

    if (updateError) {
      throw updateError;
    }

    // Update tracks if provided
    if (tracks !== undefined) {
      // Delete existing tracks
      await supabase
        .from('playlist_tracks')
        .delete()
        .eq('playlist_id', playlist_id);

      // Add new tracks
      if (tracks.length > 0) {
        const trackInserts = tracks.map((track, index) => ({
          playlist_id: playlist_id,
          track_id: track.id,
          track_title: track.title,
          track_artist: track.artist,
          track_album: track.album,
          track_artwork_url: track.artwork,
          track_spotify_url: track.url,
          track_duration_ms: track.duration_ms,
          position: index + 1
        }));

        await supabase
          .from('playlist_tracks')
          .insert(trackInserts);
      }
    }

    res.json({
      success: true,
      playlist,
      message: 'Playlist updated successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in handleUpdatePlaylist:', error);
    res.status(500).json({ error: 'Failed to update playlist' });
  }
}

// DELETE /api/posts?playlists=true - Delete playlist
async function handleDeletePlaylist(req, res, userId) {
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { playlist_id } = req.query;

  if (!playlist_id) {
    return res.status(400).json({ error: 'Playlist ID is required' });
  }

  try {
    // Check if user owns the playlist
    const { data: existingPlaylist, error: checkError } = await supabase
      .from('playlists')
      .select('user_id')
      .eq('id', playlist_id)
      .single();

    if (checkError || !existingPlaylist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    if (existingPlaylist.user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this playlist' });
    }

    // Delete playlist (cascade will handle tracks)
    const { error: deleteError } = await supabase
      .from('playlists')
      .delete()
      .eq('id', playlist_id);

    if (deleteError) {
      throw deleteError;
    }

    res.json({
      success: true,
      message: 'Playlist deleted successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in handleDeletePlaylist:', error);
    res.status(500).json({ error: 'Failed to delete playlist' });
  }
}

// Helper function to get single playlist
async function getSinglePlaylist(playlistId, userId, includeTracks, res) {
  try {
    const { data: playlist, error: playlistError } = await supabase
      .from('playlists')
      .select(`
        id,
        name,
        description,
        artwork_url,
        privacy,
        track_count,
        like_count,
        share_count,
        created_at,
        updated_at,
        user_id,
        profiles!playlists_user_id_fkey (
          display_name,
          avatar_url
        )
      `)
      .eq('id', playlistId)
      .single();

    if (playlistError || !playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    // Check privacy
    if (playlist.privacy === 'private' && playlist.user_id !== userId) {
      return res.status(403).json({ error: 'Playlist is private' });
    }

    // Add tracks if requested
    if (includeTracks) {
      playlist.tracks = await getPlaylistTracks(playlistId);
    }

    res.json({
      success: true,
      playlist,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting single playlist:', error);
    res.status(500).json({ error: 'Failed to fetch playlist' });
  }
}

// Helper function to get playlist tracks
async function getPlaylistTracks(playlistId) {
  try {
    const { data: tracks, error: tracksError } = await supabase
      .from('playlist_tracks')
      .select(`
        id,
        track_id,
        track_title,
        track_artist,
        track_album,
        track_artwork_url,
        track_spotify_url,
        track_duration_ms,
        position,
        added_at
      `)
      .eq('playlist_id', playlistId)
      .order('position', { ascending: true });

    return tracks || [];
  } catch (error) {
    console.error('Error getting playlist tracks:', error);
    return [];
  }
}
