module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Test basic functionality
    const testData = {
      message: "API is working!",
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      headers: {
        'user-agent': req.headers['user-agent'],
        'origin': req.headers.origin
      },
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL,
        SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID ? 'SET' : 'NOT_SET',
        SUPABASE_URL: process.env.SUPABASE_URL ? 'SET' : 'NOT_SET'
      }
    };

    res.status(200).json(testData);
  } catch (error) {
    console.error('Test API error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message,
      stack: error.stack 
    });
  }
};
