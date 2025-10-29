export async function onRequest(context) {
  const { request, env, params } = context
  const provider = params.provider
  
  // Get user ID from request body or headers
  let userId = null
  if (request.method === 'POST') {
    try {
      const body = await request.json().catch(() => ({}))
      userId = body.userId
    } catch (e) {
      // Body might not be JSON
    }
  }
  
  // If no userId provided, we can't complete the OAuth flow
  // For now, we'll allow it and handle in callback with state
  
  // OAuth configurations for each provider
  const oauthConfigs = {
    spotify: {
      authUrl: 'https://accounts.spotify.com/authorize',
      clientId: env.SPOTIFY_CLIENT_ID,
      scopes: 'user-read-playback-state user-modify-playback-state user-read-currently-playing',
      requiredEnvVar: 'SPOTIFY_CLIENT_ID'
    },
    apple_music: {
      authUrl: 'https://appleid.apple.com/auth/authorize',
      clientId: env.APPLE_MUSIC_CLIENT_ID,
      scopes: 'openid email',
      requiredEnvVar: 'APPLE_MUSIC_CLIENT_ID'
    },
    youtube_music: {
      authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      clientId: env.GOOGLE_CLIENT_ID || env.YOUTUBE_MUSIC_CLIENT_ID,
      scopes: 'https://www.googleapis.com/auth/youtube',
      requiredEnvVar: 'GOOGLE_CLIENT_ID'
    },
    deezer: {
      authUrl: 'https://connect.deezer.com/oauth/auth.php',
      clientId: env.DEEZER_APP_ID,
      scopes: 'basic_access,email,offline_access,manage_library,listening_history',
      requiredEnvVar: 'DEEZER_APP_ID'
    },
    tidal: {
      authUrl: 'https://login.tidal.com/authorize',
      clientId: env.TIDAL_CLIENT_ID,
      scopes: 'r_usr w_usr',
      requiredEnvVar: 'TIDAL_CLIENT_ID'
    },
    soundcloud: {
      authUrl: 'https://soundcloud.com/connect',
      clientId: env.SOUNDCLOUD_CLIENT_ID,
      scopes: 'non-expiring',
      requiredEnvVar: 'SOUNDCLOUD_CLIENT_ID'
    }
  }
  
  const config = oauthConfigs[provider]
  if (!config) {
    return new Response(JSON.stringify({ 
      error: 'Invalid provider',
      message: `Provider '${provider}' is not supported.`
    }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  // Validate that client ID is configured
  if (!config.clientId || config.clientId === 'undefined' || config.clientId === '') {
    return new Response(JSON.stringify({ 
      error: 'OAuth not configured',
      message: `Missing ${config.requiredEnvVar} environment variable. Please configure this provider in Cloudflare Pages secrets.`
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  const redirectUri = `${new URL(request.url).origin}/api/providers/${provider}/callback`
  
  // Validate redirect URI format
  if (!redirectUri.startsWith('http://') && !redirectUri.startsWith('https://')) {
    console.error(`Invalid redirect URI format: ${redirectUri}`)
    return new Response(JSON.stringify({ 
      error: 'Invalid redirect URI',
      message: 'Redirect URI must be a valid HTTP/HTTPS URL'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
  
  // Include user ID in state for callback to use
  // Format: {userId}_{randomUUID}
  const state = userId ? `${userId}_${crypto.randomUUID()}` : crypto.randomUUID()
  
  try {
    const authUrl = new URL(config.authUrl)
    authUrl.searchParams.set('client_id', config.clientId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', config.scopes)
    authUrl.searchParams.set('state', state)
    
    console.log(`Generating OAuth URL for ${provider}:`, {
      authUrl: authUrl.toString(),
      redirectUri,
      hasUserId: !!userId
    })
    
    return new Response(JSON.stringify({ authUrl: authUrl.toString() }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error(`Error generating OAuth URL for ${provider}:`, error)
    return new Response(JSON.stringify({ 
      error: 'OAuth URL generation failed',
      message: error.message || 'Failed to generate OAuth authorization URL'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}


