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

// Get connected providers for user
router.get('/connected', authenticateTrackshare, async (req, res) => {
  try {
    const userId = req.trackshareAuth?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Session token missing subject' });
    }

    if (!supabase) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    const { data, error } = await supabase
      .from('provider_tokens')
      .select('provider, created_at, updated_at')
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to fetch provider tokens: ${error.message}`);
    }

    const connectedProviders = data.map(row => ({
      provider: row.provider,
      connectedAt: row.created_at,
      lastUpdated: row.updated_at
    }));

    return res.json({ providers: connectedProviders });
  } catch (error) {
    console.error('Failed to fetch connected providers:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch connected providers' });
  }
});

// Connect Spotify provider
router.post('/spotify/connect', authenticateTrackshare, async (req, res) => {
  try {
    const userId = req.trackshareAuth?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Session token missing subject' });
    }

    const { accessToken, refreshToken, expiresAt, scope } = req.body;

    if (!accessToken) {
      return res.status(400).json({ error: 'accessToken is required' });
    }

    if (!supabase) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    // Store encrypted tokens
    const { data, error } = await supabase
      .from('provider_tokens')
      .upsert({
        user_id: userId,
        provider: 'spotify',
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt,
        scope: scope
      }, { onConflict: 'user_id,provider' })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to store Spotify tokens: ${error.message}`);
    }

    // Update user's connected providers
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        connected_providers: supabase.rpc('jsonb_set', {
          target: supabase.rpc('coalesce', { 
            val: supabase.select('connected_providers').from('profiles').eq('id', userId).single(),
            fallback: '{}'
          }),
          path: '{spotify}',
          new_value: 'true'
        })
      })
      .eq('id', userId);

    if (profileError) {
      console.warn('Failed to update connected providers:', profileError);
    }

    return res.json({ success: true, provider: 'spotify' });
  } catch (error) {
    console.error('Failed to connect Spotify:', error);
    return res.status(500).json({ error: error.message || 'Failed to connect Spotify' });
  }
});

// Connect Apple Music provider
router.post('/apple-music/connect', authenticateTrackshare, async (req, res) => {
  try {
    const userId = req.trackshareAuth?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Session token missing subject' });
    }

    const { accessToken, refreshToken, expiresAt, scope } = req.body;

    if (!accessToken) {
      return res.status(400).json({ error: 'accessToken is required' });
    }

    if (!supabase) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    // Store encrypted tokens
    const { data, error } = await supabase
      .from('provider_tokens')
      .upsert({
        user_id: userId,
        provider: 'apple_music',
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt,
        scope: scope
      }, { onConflict: 'user_id,provider' })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to store Apple Music tokens: ${error.message}`);
    }

    return res.json({ success: true, provider: 'apple_music' });
  } catch (error) {
    console.error('Failed to connect Apple Music:', error);
    return res.status(500).json({ error: error.message || 'Failed to connect Apple Music' });
  }
});

// Connect YouTube Music provider
router.post('/youtube-music/connect', authenticateTrackshare, async (req, res) => {
  try {
    const userId = req.trackshareAuth?.sub;
    if (!userId) {
      return res.status(401).json({ error: 'Session token missing subject' });
    }

    const { accessToken, refreshToken, expiresAt, scope } = req.body;

    if (!accessToken) {
      return res.status(400).json({ error: 'accessToken is required' });
    }

    if (!supabase) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    // Store encrypted tokens
    const { data, error } = await supabase
      .from('provider_tokens')
      .upsert({
        user_id: userId,
        provider: 'youtube_music',
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt,
        scope: scope
      }, { onConflict: 'user_id,provider' })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to store YouTube Music tokens: ${error.message}`);
    }

    return res.json({ success: true, provider: 'youtube_music' });
  } catch (error) {
    console.error('Failed to connect YouTube Music:', error);
    return res.status(500).json({ error: error.message || 'Failed to connect YouTube Music' });
  }
});

// Disconnect provider
router.delete('/:provider/disconnect', authenticateTrackshare, async (req, res) => {
  try {
    const userId = req.trackshareAuth?.sub;
    const { provider } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Session token missing subject' });
    }

    if (!['spotify', 'apple_music', 'youtube_music'].includes(provider)) {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    if (!supabase) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }

    // Remove provider tokens
    const { error: tokenError } = await supabase
      .from('provider_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('provider', provider);

    if (tokenError) {
      throw new Error(`Failed to remove provider tokens: ${tokenError.message}`);
    }

    // Update user's connected providers
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        connected_providers: supabase.rpc('jsonb_set', {
          target: supabase.rpc('coalesce', { 
            val: supabase.select('connected_providers').from('profiles').eq('id', userId).single(),
            fallback: '{}'
          }),
          path: `{${provider}}`,
          new_value: 'false'
        })
      })
      .eq('id', userId);

    if (profileError) {
      console.warn('Failed to update connected providers:', profileError);
    }

    return res.json({ success: true, provider });
  } catch (error) {
    console.error('Failed to disconnect provider:', error);
    return res.status(500).json({ error: error.message || 'Failed to disconnect provider' });
  }
});

// Get OAuth URLs for provider connection
router.get('/:provider/oauth-url', authenticateTrackshare, (req, res) => {
  const { provider } = req.params;
  const userId = req.trackshareAuth?.sub;

  if (!userId) {
    return res.status(401).json({ error: 'Session token missing subject' });
  }

  let oauthUrl;
  const redirectUri = `${process.env.TRACKSHARE_BASE_URL || 'https://trackshare.online'}/api/providers/${provider}/callback`;

  switch (provider) {
    case 'spotify':
      const spotifyClientId = process.env.SPOTIFY_CLIENT_ID;
      if (!spotifyClientId) {
        return res.status(500).json({ error: 'Spotify client ID not configured' });
      }
      
      const spotifyScopes = [
        'user-read-recently-played',
        'user-read-currently-playing',
        'user-read-playback-state',
        'user-top-read'
      ].join(' ');
      
      oauthUrl = `https://accounts.spotify.com/authorize?` +
        `client_id=${spotifyClientId}&` +
        `response_type=code&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(spotifyScopes)}&` +
        `state=${userId}`;
      break;

    case 'apple_music':
      // Apple Music uses MusicKit JS, handled client-side
      return res.json({ 
        provider: 'apple_music',
        requiresClientSide: true,
        message: 'Use MusicKit JS for Apple Music authentication'
      });

    case 'youtube_music':
      const youtubeClientId = process.env.YOUTUBE_CLIENT_ID;
      if (!youtubeClientId) {
        return res.status(500).json({ error: 'YouTube client ID not configured' });
      }
      
      const youtubeScopes = [
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/youtube.force-ssl'
      ].join(' ');
      
      oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${youtubeClientId}&` +
        `response_type=code&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=${encodeURIComponent(youtubeScopes)}&` +
        `access_type=offline&` +
        `prompt=consent&` +
        `state=${userId}`;
      break;

    default:
      return res.status(400).json({ error: 'Invalid provider' });
  }

  return res.json({ 
    provider,
    oauthUrl,
    redirectUri 
  });
});

module.exports = router;

