const https = require('https');
const { kv } = require('@vercel/kv');

// Helper function to make HTTP requests
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// Helper function to extract track ID from URL
function extractTrackId(url) {
  const spotifyMatch = url.match(/spotify\.com\/track\/([a-zA-Z0-9]+)/);
  if (spotifyMatch) {
    return { type: 'spotify', id: spotifyMatch[1] };
  }
  
  const appleMatch = url.match(/music\.apple\.com\/.*\/album\/.*\/(\d+)/);
  if (appleMatch) {
    return { type: 'apple', id: appleMatch[1] };
  }
  
  const youtubeMatch = url.match(/music\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/);
  if (youtubeMatch) {
    return { type: 'youtube', id: youtubeMatch[1] };
  }
  
  return null;
}

// Enhanced track resolution with real metadata
async function resolveTrackMetadata(trackInfo) {
  try {
    let title = 'Unknown Track';
    let artist = 'Unknown Artist';
    let artwork = null;
    
    if (trackInfo.type === 'spotify') {
      // Use Spotify oEmbed API for metadata
      const oembedUrl = `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackInfo.id}`;
      try {
        const oembedData = await makeRequest(oembedUrl);
        title = oembedData.title || title;
        artist = oembedData.author_name || artist;
        artwork = oembedData.thumbnail_url || null;
      } catch (e) {
        console.log('Spotify oEmbed failed, using fallback');
      }
    } else if (trackInfo.type === 'youtube') {
      // Use YouTube oEmbed API
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${trackInfo.id}&format=json`;
      try {
        const oembedData = await makeRequest(oembedUrl);
        title = oembedData.title || title;
        artist = oembedData.author_name || artist;
        artwork = oembedData.thumbnail_url || null;
      } catch (e) {
        console.log('YouTube oEmbed failed, using fallback');
      }
    }
    
    // Generate provider links for all platforms
    const providers = [
      {
        name: 'spotify',
        displayName: 'Spotify',
        nativeUrl: `spotify://track/${trackInfo.id}`,
        webUrl: `https://open.spotify.com/track/${trackInfo.id}`,
        isAvailable: true
      },
      {
        name: 'apple_music',
        displayName: 'Apple Music',
        nativeUrl: `music://music.apple.com/search?term=${encodeURIComponent(title + ' ' + artist)}`,
        webUrl: `https://music.apple.com/search?term=${encodeURIComponent(title + ' ' + artist)}`,
        isAvailable: true
      },
      {
        name: 'youtube_music',
        displayName: 'YouTube Music',
        nativeUrl: `youtubemusic://watch?v=${trackInfo.id}`,
        webUrl: `https://music.youtube.com/search?q=${encodeURIComponent(title + ' ' + artist)}`,
        isAvailable: true
      }
    ];
    
    return {
      title,
      artist,
      artwork,
      providers
    };
  } catch (error) {
    console.error('Error resolving metadata:', error);
    return {
      title: 'Unknown Track',
      artist: 'Unknown Artist',
      artwork: null,
      providers: [
        {
          name: 'spotify',
          displayName: 'Spotify',
          nativeUrl: `spotify://track/${trackInfo.id}`,
          webUrl: `https://open.spotify.com/track/${trackInfo.id}`,
          isAvailable: true
        }
      ]
    };
  }
}

// Vercel serverless function handler
module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  try {
    const url = req.query.url || req.body?.url;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }
    
    console.log('Resolving track:', url);
    
    const trackInfo = extractTrackId(url);
    
    if (!trackInfo) {
      return res.status(400).json({
        success: false,
        error: 'Unsupported URL format. Please share a Spotify, Apple Music, or YouTube Music link.'
      });
    }
    
    // Resolve real metadata
    const metadata = await resolveTrackMetadata(trackInfo);
    
    const track = {
      id: `${trackInfo.type}:${trackInfo.id}`,
      title: metadata.title,
      artist: metadata.artist,
      artwork: metadata.artwork,
      providers: metadata.providers
    };
    
    // Generate short URL
    const shortId = Math.random().toString(36).substring(2, 8);
    const shortUrl = `https://trackshare.online/t/${shortId}`;
    
    // Store track data in KV with expiration (7 days)
    try {
      await kv.setex(`track:${shortId}`, 7 * 24 * 60 * 60, JSON.stringify(track));
    } catch (kvError) {
      console.error('KV storage error:', kvError);
      // Continue even if KV storage fails
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    res.json({
      success: true,
      track: {
        ...track,
        shortUrl,
        sourceUrl: url
      },
      latency: 500
    });
    
  } catch (error) {
    console.error('Error resolving track:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};
// Force redeploy: 2025-01-21T14:15:00Z