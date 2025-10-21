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
  } catch (error) {
    console.error('Playlists API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// GET /api/playlists - Get playlists
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

// POST /api/playlists - Create playlist
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

// PUT /api/playlists - Update playlist
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

// DELETE /api/playlists - Delete playlist
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
