// OAuth callback handler for Google
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
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${process.env.TRACKSHARE_BASE_URL}/auth/google/callback`,
      }),
    });
    
    const tokens = await tokenResponse.json();
    
    if (tokens.error) {
      return res.redirect(`/?error=${encodeURIComponent(tokens.error_description || tokens.error)}`);
    }
    
    // Get user info
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });
    
    const userInfo = await userResponse.json();
    
    // Create or update user in our system
    const userData = {
      id: userInfo.id,
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture,
      provider: 'google',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    };
    
    // Store user session (in production, you'd store this in a database)
    // For now, we'll redirect with user info
    const userInfoEncoded = encodeURIComponent(JSON.stringify(userData));
    return res.redirect(`/?user=${userInfoEncoded}`);
    
  } catch (error) {
    console.error('OAuth error:', error);
    return res.redirect(`/?error=${encodeURIComponent('Authentication failed')}`);
  }
};
