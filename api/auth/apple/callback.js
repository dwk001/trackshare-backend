// OAuth callback handler for Apple
module.exports = async (req, res) => {
  const { code, error } = req.query;
  
  if (error) {
    return res.redirect(`/?error=${encodeURIComponent(error)}`);
  }
  
  if (!code) {
    return res.redirect('/?error=no_code');
  }
  
  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://appleid.apple.com/auth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.APPLE_CLIENT_ID,
        client_secret: process.env.APPLE_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${process.env.TRACKSHARE_BASE_URL}/auth/apple/callback`,
      }),
    });
    
    const tokens = await tokenResponse.json();
    
    if (tokens.error) {
      return res.redirect(`/?error=${encodeURIComponent(tokens.error_description || tokens.error)}`);
    }
    
    // Decode ID token to get user info
    const idToken = tokens.id_token;
    const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
    
    const userData = {
      id: payload.sub,
      email: payload.email,
      name: payload.name || 'Apple User',
      provider: 'apple',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    };
    
    // Store user session (in production, you'd store this in a database)
    const userInfoEncoded = encodeURIComponent(JSON.stringify(userData));
    return res.redirect(`/?user=${userInfoEncoded}`);
    
  } catch (error) {
    console.error('Apple OAuth error:', error);
    return res.redirect(`/?error=${encodeURIComponent('Authentication failed')}`);
  }
};

// Force redeploy: 2025-01-21T13:52:00Z
