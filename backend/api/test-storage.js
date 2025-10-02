const { kv } = require('@vercel/kv');

module.exports = async (req, res) => {
  try {
    // Test the exact same pattern as our track storage
    const shortId = 'test123';
    const trackData = {
      title: 'Test Track',
      artist: 'Test Artist',
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

    // Store with the exact same key format
    const key = `t:${shortId}`;
    await kv.set(key, JSON.stringify(trackData), { ex: 60 }); // 1 minute TTL
    console.log(`Stored with key: ${key}`);

    // Retrieve with the exact same key format
    const retrieved = await kv.get(key);
    console.log(`Retrieved with key: ${key}, result:`, retrieved ? 'found' : 'not found');

    if (retrieved) {
      const parsed = JSON.parse(retrieved);
      console.log(`Parsed data:`, parsed);
    }

    res.status(200).json({
      success: true,
      key: key,
      stored: trackData,
      retrieved: retrieved ? JSON.parse(retrieved) : null,
      found: !!retrieved
    });
  } catch (error) {
    console.error('Test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
