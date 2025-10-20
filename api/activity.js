const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey)
  : null;

const TRACKSHARE_JWT_SECRET = process.env.TRACKSHARE_JWT_SECRET;

const router = express.Router();

// Middleware to authenticate TrackShare JWT
function authenticateTrackshare(req, res, next) {
  if (!TRACKSHARE_JWT_SECRET) {
    return res.status(500).json({ error: 'TRACKSHARE_JWT_SECRET not configured' });
  }

  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || typeof authHeader !== 'string') {
    return res.status(401).json({ error: 'Authorization header missing' });
  }

  const [, token] = authHeader.split(' ');

  if (!token) {
    return res.status(401).json({ error: 'Invalid Authorization header format' });
  }

  try {
    const decoded = jwt.verify(token, TRACKSHARE_JWT_SECRET, { algorithms: ['HS256'] });
    req.trackshareAuth = decoded;
    next();
  } catch (error) {
    console.error('TrackShare JWT verification failed:', error.message);
    return res.status(401).json({ error: 'Invalid or expired session token' });
  }
}

// Get user's feed (friends' play events)
router.get('/feed', authenticateTrackshare, async (req, res) => {
  try {
    const userId = req.trackshareAuth?.sub;
    const { page = 1, limit = 20 } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'Session token missing subject' });
    }

    if (!supabase) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    const offset = (page - 1) * limit;

    // Get play events from friends
    const { data: playEvents, error } = await supabase
      .from('play_events')
      .select(`
        *,
        profiles!play_events_user_id_fkey (
          id,
          display_name,
          avatar_url
        )
      `)
      .in('user_id', supabase.rpc('get_friend_ids', { user_id: userId }))
      .in('privacy', ['public', 'friends'])
      .order('played_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to fetch feed: ${error.message}`);
    }

    // Get reaction counts for each play event
    const playEventIds = playEvents.map(event => event.id);
    const { data: reactions, error: reactionsError } = await supabase
      .from('reactions')
      .select('play_event_id, reaction_type')
      .in('play_event_id', playEventIds);

    if (reactionsError) {
      console.warn('Failed to fetch reactions:', reactionsError);
    }

    // Get comment counts for each play event
    const { data: comments, error: commentsError } = await supabase
      .from('comments')
      .select('play_event_id')
      .in('play_event_id', playEventIds);

    if (commentsError) {
      console.warn('Failed to fetch comments:', commentsError);
    }

    // Group reactions and comments by play event
    const reactionsByEvent = {};
    const commentsByEvent = {};

    if (reactions) {
      reactions.forEach(reaction => {
        if (!reactionsByEvent[reaction.play_event_id]) {
          reactionsByEvent[reaction.play_event_id] = {};
        }
        reactionsByEvent[reaction.play_event_id][reaction.reaction_type] = 
          (reactionsByEvent[reaction.play_event_id][reaction.reaction_type] || 0) + 1;
      });
    }

    if (comments) {
      comments.forEach(comment => {
        commentsByEvent[comment.play_event_id] = (commentsByEvent[comment.play_event_id] || 0) + 1;
      });
    }

    // Format response
    const feedItems = playEvents.map(event => ({
      id: event.id,
      track: {
        id: event.track_id,
        title: event.title,
        artist: event.artist,
        artworkUrl: event.artwork_url,
        provider: event.provider,
        providerTrackId: event.provider_track_id,
        trackshareLinkId: event.trackshare_link_id
      },
      user: {
        id: event.profiles.id,
        displayName: event.profiles.display_name,
        avatarUrl: event.profiles.avatar_url
      },
      playedAt: event.played_at,
      reactions: reactionsByEvent[event.id] || {},
      commentCount: commentsByEvent[event.id] || 0,
      isSaved: false // TODO: Check if current user saved this track
    }));

    return res.json({
      items: feedItems,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: playEvents.length === limit
      }
    });
  } catch (error) {
    console.error('Failed to fetch feed:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch feed' });
  }
});

// Get user's play history
router.get('/history', authenticateTrackshare, async (req, res) => {
  try {
    const userId = req.trackshareAuth?.sub;
    const { page = 1, limit = 20 } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'Session token missing subject' });
    }

    if (!supabase) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    const offset = (page - 1) * limit;

    const { data: playEvents, error } = await supabase
      .from('play_events')
      .select('*')
      .eq('user_id', userId)
      .order('played_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to fetch play history: ${error.message}`);
    }

    return res.json({
      items: playEvents,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: playEvents.length === limit
      }
    });
  } catch (error) {
    console.error('Failed to fetch play history:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch play history' });
  }
});

// Add a play event
router.post('/play', authenticateTrackshare, async (req, res) => {
  try {
    const userId = req.trackshareAuth?.sub;
    const { 
      trackId, 
      title, 
      artist, 
      artworkUrl, 
      provider, 
      providerTrackId, 
      trackshareLinkId,
      privacy = 'friends'
    } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Session token missing subject' });
    }

    if (!trackId || !title || !artist || !provider) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!supabase) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    const { data, error } = await supabase
      .from('play_events')
      .insert({
        user_id: userId,
        track_id: trackId,
        title,
        artist,
        artwork_url: artworkUrl,
        provider,
        provider_track_id: providerTrackId,
        trackshare_link_id: trackshareLinkId,
        privacy
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create play event: ${error.message}`);
    }

    return res.json({ success: true, playEvent: data });
  } catch (error) {
    console.error('Failed to create play event:', error);
    return res.status(500).json({ error: error.message || 'Failed to create play event' });
  }
});

// React to a play event
router.post('/react', authenticateTrackshare, async (req, res) => {
  try {
    const userId = req.trackshareAuth?.sub;
    const { playEventId, reactionType = 'heart' } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Session token missing subject' });
    }

    if (!playEventId) {
      return res.status(400).json({ error: 'playEventId is required' });
    }

    if (!supabase) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    const { data, error } = await supabase
      .from('reactions')
      .upsert({
        user_id: userId,
        play_event_id: playEventId,
        reaction_type: reactionType
      }, { onConflict: 'user_id,play_event_id,reaction_type' })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create reaction: ${error.message}`);
    }

    return res.json({ success: true, reaction: data });
  } catch (error) {
    console.error('Failed to create reaction:', error);
    return res.status(500).json({ error: error.message || 'Failed to create reaction' });
  }
});

// Remove reaction
router.delete('/react/:playEventId', authenticateTrackshare, async (req, res) => {
  try {
    const userId = req.trackshareAuth?.sub;
    const { playEventId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Session token missing subject' });
    }

    if (!supabase) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    const { error } = await supabase
      .from('reactions')
      .delete()
      .eq('user_id', userId)
      .eq('play_event_id', playEventId);

    if (error) {
      throw new Error(`Failed to remove reaction: ${error.message}`);
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('Failed to remove reaction:', error);
    return res.status(500).json({ error: error.message || 'Failed to remove reaction' });
  }
});

// Comment on a play event
router.post('/comment', authenticateTrackshare, async (req, res) => {
  try {
    const userId = req.trackshareAuth?.sub;
    const { playEventId, content } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Session token missing subject' });
    }

    if (!playEventId || !content) {
      return res.status(400).json({ error: 'playEventId and content are required' });
    }

    if (content.length > 500) {
      return res.status(400).json({ error: 'Comment too long (max 500 characters)' });
    }

    if (!supabase) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    const { data, error } = await supabase
      .from('comments')
      .insert({
        user_id: userId,
        play_event_id: playEventId,
        content: content.trim()
      })
      .select(`
        *,
        profiles!comments_user_id_fkey (
          id,
          display_name,
          avatar_url
        )
      `)
      .single();

    if (error) {
      throw new Error(`Failed to create comment: ${error.message}`);
    }

    return res.json({ success: true, comment: data });
  } catch (error) {
    console.error('Failed to create comment:', error);
    return res.status(500).json({ error: error.message || 'Failed to create comment' });
  }
});

// Get comments for a play event
router.get('/comments/:playEventId', authenticateTrackshare, async (req, res) => {
  try {
    const { playEventId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    if (!supabase) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    const offset = (page - 1) * limit;

    const { data: comments, error } = await supabase
      .from('comments')
      .select(`
        *,
        profiles!comments_user_id_fkey (
          id,
          display_name,
          avatar_url
        )
      `)
      .eq('play_event_id', playEventId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to fetch comments: ${error.message}`);
    }

    return res.json({
      items: comments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: comments.length === limit
      }
    });
  } catch (error) {
    console.error('Failed to fetch comments:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch comments' });
  }
});

// Save a track
router.post('/save', authenticateTrackshare, async (req, res) => {
  try {
    const userId = req.trackshareAuth?.sub;
    const { playEventId } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Session token missing subject' });
    }

    if (!playEventId) {
      return res.status(400).json({ error: 'playEventId is required' });
    }

    if (!supabase) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    const { data, error } = await supabase
      .from('saved_tracks')
      .insert({
        user_id: userId,
        play_event_id: playEventId
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save track: ${error.message}`);
    }

    return res.json({ success: true, savedTrack: data });
  } catch (error) {
    console.error('Failed to save track:', error);
    return res.status(500).json({ error: error.message || 'Failed to save track' });
  }
});

// Get saved tracks
router.get('/saved', authenticateTrackshare, async (req, res) => {
  try {
    const userId = req.trackshareAuth?.sub;
    const { page = 1, limit = 20 } = req.query;

    if (!userId) {
      return res.status(401).json({ error: 'Session token missing subject' });
    }

    if (!supabase) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    const offset = (page - 1) * limit;

    const { data: savedTracks, error } = await supabase
      .from('saved_tracks')
      .select(`
        *,
        play_events!saved_tracks_play_event_id_fkey (
          *,
          profiles!play_events_user_id_fkey (
            id,
            display_name,
            avatar_url
          )
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to fetch saved tracks: ${error.message}`);
    }

    return res.json({
      items: savedTracks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: savedTracks.length === limit
      }
    });
  } catch (error) {
    console.error('Failed to fetch saved tracks:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch saved tracks' });
  }
});

module.exports = router;
