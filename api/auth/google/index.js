// Google OAuth initiation endpoint
module.exports = async (req, res) => {
  const { redirect_uri } = req.query;
  
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    return res.status(500).json({ 
      error: 'Google OAuth not configured. Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET' 
    });
  }
  
  // Default redirect URI
  const defaultRedirectUri = `${process.env.TRACKSHARE_BASE_URL || 'https://trackshare.online'}/api/auth/google/callback`;
  const finalRedirectUri = redirect_uri || defaultRedirectUri;
  
  // Generate state parameter for CSRF protection
  const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  
  // Store state in session or cookie for verification
  // For now, we'll include it in the redirect URI
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(finalRedirectUri)}&` +
    `response_type=code&` +
    `scope=${encodeURIComponent('openid email profile')}&` +
    `access_type=offline&` +
    `prompt=consent&` +
    `state=${state}`;
  
  // Redirect to Google OAuth
  return res.redirect(authUrl);
};

// Force redeploy: 2025-01-21T14:00:00Z



