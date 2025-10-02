const { kv } = require('@vercel/kv');

module.exports = async (req, res) => {
  try {
    // Test KV connection
    await kv.set('test', 'hello world', { ex: 60 });
    const result = await kv.get('test');
    
    res.json({
      success: true,
      message: 'KV is working!',
      testValue: result,
      envVars: {
        hasKvUrl: !!process.env.KV_REST_API_URL,
        hasKvToken: !!process.env.KV_REST_API_TOKEN,
        kvUrlValue: process.env.KV_REST_API_URL ? 'present' : 'missing',
        kvTokenValue: process.env.KV_REST_API_TOKEN ? 'present' : 'missing'
      }
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message,
      envVars: {
        hasKvUrl: !!process.env.KV_REST_API_URL,
        hasKvToken: !!process.env.KV_REST_API_TOKEN,
        kvUrlValue: process.env.KV_REST_API_URL ? 'present' : 'missing',
        kvTokenValue: process.env.KV_REST_API_TOKEN ? 'present' : 'missing'
      }
    });
  }
};
