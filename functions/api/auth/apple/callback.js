// Apple OAuth callback handler for Cloudflare Pages
export async function onRequest(context) {
  const { request, env } = context;
  
  // Apple sends POST data instead of query parameters
  const formData = await request.formData();
  const code = formData.get('code');
  const error = formData.get('error');
  const state = formData.get('state');
  const user = formData.get('user'); // Apple sends user info in first request
  
  if (error) {
    return Response.redirect(`/?error=${encodeURIComponent(error)}`, 302);
  }
  
  if (!code) {
    return Response.redirect('/?error=no_code', 302);
  }
  
  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://appleid.apple.com/auth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: env.APPLE_CLIENT_ID,
        client_secret: await generateAppleClientSecret(env),
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${env.TRACKSHARE_BASE_URL || 'https://trackshare.online'}/api/auth/apple/callback`,
      }),
    });
    
    const tokens = await tokenResponse.json();
    
    if (tokens.error) {
      return Response.redirect(`/?error=${encodeURIComponent(tokens.error_description || tokens.error)}`, 302);
    }
    
    // Parse user info from Apple's response
    let userInfo = null;
    if (user) {
      try {
        userInfo = JSON.parse(user);
      } catch (e) {
        console.error('Failed to parse Apple user info:', e);
      }
    }
    
    // For now, redirect with user info as query params
    // In production, you'd store this in a database and create a session
    const userInfoEncoded = encodeURIComponent(JSON.stringify({
      id: tokens.id_token ? parseIdToken(tokens.id_token) : 'apple_user',
      email: userInfo?.email || 'apple_user@example.com',
      name: userInfo?.name ? `${userInfo.name.firstName} ${userInfo.name.lastName}` : 'Apple User',
      picture: null, // Apple doesn't provide profile pictures
      provider: 'apple'
    }));
    
    return Response.redirect(`/?auth=success&provider=apple&user=${userInfoEncoded}`, 302);
    
  } catch (error) {
    console.error('Apple OAuth error:', error);
    return Response.redirect(`/?error=${encodeURIComponent('Authentication failed')}`, 302);
  }
}

// Generate Apple client secret (JWT)
async function generateAppleClientSecret(env) {
  const header = {
    alg: 'ES256',
    kid: env.APPLE_KEY_ID
  };
  
  const payload = {
    iss: env.APPLE_TEAM_ID,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400, // 24 hours
    aud: 'https://appleid.apple.com',
    sub: env.APPLE_CLIENT_ID
  };
  
  // For now, return a placeholder - in production you'd sign this with the private key
  return 'apple_client_secret_placeholder';
}

// Parse Apple ID token
function parseIdToken(idToken) {
  try {
    const parts = idToken.split('.');
    const payload = JSON.parse(atob(parts[1]));
    return payload.sub;
  } catch (e) {
    console.error('Failed to parse Apple ID token:', e);
    return 'apple_user';
  }
}



