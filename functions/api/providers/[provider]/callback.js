// OAuth callback handler for music providers
// Exchanges OAuth code for access tokens and stores them in Supabase

export async function onRequest(context) {
  const { request, env, params } = context
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error')
  const provider = params.provider
  
  // Handle OAuth errors
  if (error) {
    console.error(`OAuth error for ${provider}:`, error)
    return Response.redirect(`${url.origin}/settings?error=oauth_failed&provider=${provider}&reason=${encodeURIComponent(error)}`)
  }
  
  if (!code) {
    return Response.redirect(`${url.origin}/settings?error=no_code&provider=${provider}`)
  }

  const redirectUri = `${url.origin}/api/providers/${provider}/callback`
  
  try {
    let tokens
    let userId = null
    
    // Extract user ID from state (format: {userId}_{randomUUID})
    if (state && state.includes('_')) {
      userId = state.split('_')[0]
    }
    
    if (!userId) {
      // No user ID in state, can't complete connection
      return Response.redirect(`${url.origin}/settings?error=no_user_id&provider=${provider}`)
    }
    
    // Provider-specific token exchange
    switch (provider) {
      case 'spotify':
        tokens = await exchangeSpotifyToken(code, redirectUri, env)
        break
      case 'soundcloud':
        tokens = await exchangeSoundCloudToken(code, redirectUri, env)
        break
      case 'youtube_music':
        tokens = await exchangeYouTubeMusicToken(code, redirectUri, env)
        break
      case 'tidal':
        tokens = await exchangeTidalToken(code, redirectUri, env)
        break
      default:
        return Response.redirect(`${url.origin}/settings?error=unsupported_provider&provider=${provider}`)
    }
    
    if (!tokens) {
      return Response.redirect(`${url.origin}/settings?error=token_exchange_failed&provider=${provider}`)
    }
    
    // Store tokens in Supabase
    const stored = await storeProviderTokens(userId, provider, tokens, env)
    
    if (!stored) {
      console.error(`Failed to store tokens for ${provider} for user ${userId}`)
      return Response.redirect(`${url.origin}/settings?error=storage_failed&provider=${provider}`)
    }
    
    return Response.redirect(`${url.origin}/settings?provider_connected=${provider}&success=true`)
    
  } catch (error) {
    console.error(`OAuth callback error for ${provider}:`, error)
    console.error(`Error details:`, {
      message: error.message,
      stack: error.stack,
      name: error.name,
      userId,
      provider
    })
    
    // Return more specific error message
    const errorMessage = error.message || 'Unknown error occurred during OAuth callback'
    return Response.redirect(`${url.origin}/settings?error=callback_failed&provider=${provider}&message=${encodeURIComponent(errorMessage)}`)
  }
}

// Exchange Spotify OAuth code for tokens
async function exchangeSpotifyToken(code, redirectUri, env) {
  const clientId = env.SPOTIFY_CLIENT_ID
  const clientSecret = env.SPOTIFY_CLIENT_SECRET
  
  if (!clientId || !clientSecret) {
    throw new Error('Spotify credentials not configured')
  }
  
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri
    })
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error(`Spotify token exchange failed:`, {
      status: response.status,
      statusText: response.statusText,
      error: errorText
    })
    throw new Error(`Spotify token exchange failed (${response.status}): ${errorText}`)
  }
  
  const data = await response.json()
  
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    scope: data.scope,
    token_type: data.token_type
  }
}

// Exchange SoundCloud OAuth code for tokens
async function exchangeSoundCloudToken(code, redirectUri, env) {
  const clientId = env.SOUNDCLOUD_CLIENT_ID
  const clientSecret = env.SOUNDCLOUD_CLIENT_SECRET
  
  if (!clientId || !clientSecret) {
    throw new Error('SoundCloud credentials not configured')
  }
  
  const response = await fetch('https://api.soundcloud.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      redirect_uri: redirectUri
    })
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error(`SoundCloud token exchange failed:`, {
      status: response.status,
      statusText: response.statusText,
      error: errorText
    })
    throw new Error(`SoundCloud token exchange failed (${response.status}): ${errorText}`)
  }
  
  const data = await response.json()
  
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : null,
    scope: data.scope,
    token_type: data.token_type || 'Bearer'
  }
}

// Exchange YouTube Music (Google OAuth) code for tokens
async function exchangeYouTubeMusicToken(code, redirectUri, env) {
  const clientId = env.GOOGLE_CLIENT_ID || env.YOUTUBE_MUSIC_CLIENT_ID || env.YOUTUBE_CLIENT_ID
  const clientSecret = env.GOOGLE_CLIENT_SECRET || env.YOUTUBE_MUSIC_CLIENT_SECRET || env.YOUTUBE_CLIENT_SECRET
  
  if (!clientId || !clientSecret) {
    throw new Error('YouTube Music credentials not configured')
  }
  
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      redirect_uri: redirectUri
    })
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error(`YouTube Music token exchange failed:`, {
      status: response.status,
      statusText: response.statusText,
      error: errorText,
      redirectUri
    })
    throw new Error(`YouTube Music token exchange failed (${response.status}): ${errorText}`)
  }
  
  const data = await response.json()
  
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : null,
    scope: data.scope,
    token_type: data.token_type || 'Bearer'
  }
}

// Exchange Tidal OAuth code for tokens
async function exchangeTidalToken(code, redirectUri, env) {
  const clientId = env.TIDAL_CLIENT_ID
  const clientSecret = env.TIDAL_CLIENT_SECRET
  
  if (!clientId || !clientSecret) {
    throw new Error('Tidal credentials not configured')
  }
  
  const response = await fetch('https://auth.tidal.com/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri
    })
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error(`Tidal token exchange failed:`, {
      status: response.status,
      statusText: response.statusText,
      error: errorText
    })
    throw new Error(`Tidal token exchange failed (${response.status}): ${errorText}`)
  }
  
  const data = await response.json()
  
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : null,
    scope: data.scope,
    token_type: data.token_type || 'Bearer'
  }
}

// Store provider tokens in Supabase
async function storeProviderTokens(userId, provider, tokens, env) {
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase credentials not configured')
    return false
  }
  
  try {
    // Store tokens in provider_tokens table
    const tokenResponse = await fetch(`${supabaseUrl}/rest/v1/provider_tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        user_id: userId,
        provider: provider,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        expires_at: tokens.expires_at || null,
        scope: tokens.scope || null,
        token_type: tokens.token_type || 'Bearer',
        updated_at: new Date().toISOString()
      })
    })
    
    if (!tokenResponse.ok) {
      const error = await tokenResponse.text()
      console.error('Failed to store tokens:', error)
      // Try UPSERT with PATCH if POST fails (for existing records)
      const patchResponse = await fetch(`${supabaseUrl}/rest/v1/provider_tokens?user_id=eq.${userId}&provider=eq.${provider}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || null,
          expires_at: tokens.expires_at || null,
          scope: tokens.scope || null,
          token_type: tokens.token_type || 'Bearer',
          updated_at: new Date().toISOString()
        })
      })
      if (!patchResponse.ok) {
        return false
      }
    }
    
    // Update user's connected_providers in profiles table
    // First get current connected_providers
    const getProfileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=connected_providers`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    })
    
    let connectedProviders = {}
    if (getProfileResponse.ok) {
      const profileData = await getProfileResponse.json()
      if (profileData && profileData[0] && profileData[0].connected_providers) {
        connectedProviders = profileData[0].connected_providers
      }
    }
    
    connectedProviders[provider] = true
    
    const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({
        connected_providers: connectedProviders
      })
    })
    
    if (!profileResponse.ok) {
      console.warn('Failed to update connected_providers, but tokens stored')
    }
    
    return true
  } catch (error) {
    console.error('Error storing provider tokens:', error)
    return false
  }
}
