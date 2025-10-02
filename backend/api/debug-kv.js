const { kv } = require('@vercel/kv');

module.exports = async (req, res) => {
  try {
    // Test storing and retrieving data
    const testKey = 'test:debug';
    const testData = {
      title: 'Test Track',
      artist: 'Test Artist',
      timestamp: new Date().toISOString()
    };

    // Store test data
    await kv.set(testKey, JSON.stringify(testData), { ex: 60 }); // 1 minute TTL
    console.log(`Stored test data with key: ${testKey}`);

    // Retrieve test data
    const retrievedData = await kv.get(testKey);
    console.log(`Retrieved test data:`, retrievedData);

    // Test the specific key format we use for tracks
    const trackKey = 't:test123';
    const trackData = {
      title: 'Debug Track',
      artist: 'Debug Artist',
      artwork: 'https://example.com/artwork.jpg',
      providers: [
        {
          name: 'spotify',
          displayName: 'Spotify',
          deepLink: 'https://open.spotify.com/track/test123',
          isAvailable: true
        }
      ],
      sourceUrl: 'https://open.spotify.com/track/test123',
      createdAt: new Date().toISOString()
    };

    await kv.set(trackKey, JSON.stringify(trackData), { ex: 60 });
    console.log(`Stored track data with key: ${trackKey}`);

    const retrievedTrack = await kv.get(trackKey);
    console.log(`Retrieved track data:`, retrievedTrack);

    res.status(200).json({
      success: true,
      message: 'KV debug test completed',
      testData: {
        stored: testData,
        retrieved: retrievedData ? JSON.parse(retrievedData) : null
      },
      trackData: {
        stored: trackData,
        retrieved: retrievedTrack ? JSON.parse(retrievedTrack) : null
      },
      envVars: {
        hasKvUrl: !!process.env.KV_REST_API_URL,
        hasKvToken: !!process.env.KV_REST_API_TOKEN
      }
    });
  } catch (error) {
    console.error('KV debug test failed:', error);
    res.status(500).json({
      success: false,
      message: 'KV debug test failed',
      error: error.message,
      envVars: {
        hasKvUrl: !!process.env.KV_REST_API_URL,
        hasKvToken: !!process.env.KV_REST_API_TOKEN
      }
    });
  }
};
