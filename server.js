const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// In-memory storage for demo
const tracks = new Map();
const shortUrls = new Map();

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
        deepLink: `https://open.spotify.com/track/${trackInfo.id}`,
        isAvailable: true
      },
      {
        name: 'apple_music',
        displayName: 'Apple Music',
        deepLink: `https://music.apple.com/search?term=${encodeURIComponent(title + ' ' + artist)}`,
        isAvailable: true
      },
      {
        name: 'youtube_music',
        displayName: 'YouTube Music',
        deepLink: `https://music.youtube.com/search?q=${encodeURIComponent(title + ' ' + artist)}`,
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
          deepLink: `https://open.spotify.com/track/${trackInfo.id}`,
          isAvailable: true
        }
      ]
    };
  }
}

// Generate short URL
function generateShortUrl(trackId) {
  const shortId = Math.random().toString(36).substring(2, 8);
  const shortUrl = `https://trackshare-backend.vercel.app/t/${shortId}`;
  shortUrls.set(shortId, trackId);
  return shortUrl;
}

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'TrackShare API is running!', 
    endpoints: ['/health', '/resolve', '/t/:id'],
    timestamp: new Date().toISOString() 
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Test endpoint
app.post('/test', (req, res) => {
  console.log('Test endpoint called with body:', req.body);
  res.json({ message: 'Test successful', body: req.body });
});

// Resolve track endpoint
app.post('/api/resolve', async (req, res) => {
  try {
    const { url } = req.body;
    
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
    
    // Check if we already have this track
    const trackKey = `${trackInfo.type}:${trackInfo.id}`;
    let track = tracks.get(trackKey);
    
    if (!track) {
      // Resolve real metadata
      const metadata = await resolveTrackMetadata(trackInfo);
      
      track = {
        id: trackKey,
        title: metadata.title,
        artist: metadata.artist,
        artwork: metadata.artwork,
        providers: metadata.providers
      };
      
      tracks.set(trackKey, track);
    }
    
    // Generate short URL
    const shortUrl = generateShortUrl(track.id);
    shortUrls.set(shortUrl, track.id);
    
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
});

// Get track by short ID
app.get('/t/:id', (req, res) => {
  const { id } = req.params;
  const trackId = shortUrls.get(id);
  
  if (!trackId) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Track Not Found - TrackShare</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .error { color: #666; }
        </style>
      </head>
      <body>
        <h1>Track Not Found</h1>
        <p class="error">This track link is invalid or has expired.</p>
      </body>
      </html>
    `);
  }
  
  const track = tracks.get(trackId);
  if (!track) {
    return res.status(404).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Track Not Found - TrackShare</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .error { color: #666; }
        </style>
      </head>
      <body>
        <h1>Track Not Found</h1>
        <p class="error">This track is no longer available.</p>
      </body>
      </html>
    `);
  }
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${track.title} - ${track.artist} | TrackShare</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <meta property="og:title" content="${track.title} - ${track.artist}">
      <meta property="og:description" content="Listen to ${track.title} by ${track.artist} on your preferred music platform">
      <meta property="og:image" content="${track.artwork || ''}">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .container {
          background: white;
          border-radius: 20px;
          padding: 40px;
          max-width: 400px;
          width: 100%;
          text-align: center;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        .artwork {
          width: 200px;
          height: 200px;
          border-radius: 15px;
          margin: 0 auto 20px;
          background: #f0f0f0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 48px;
          color: #999;
        }
        .artwork img {
          width: 100%;
          height: 100%;
          border-radius: 15px;
          object-fit: cover;
        }
        h1 { font-size: 24px; margin-bottom: 8px; color: #333; }
        .artist { font-size: 18px; color: #666; margin-bottom: 30px; }
        .providers {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .provider-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 15px 20px;
          border: 2px solid #e0e0e0;
          border-radius: 12px;
          text-decoration: none;
          color: #333;
          font-weight: 600;
          transition: all 0.3s ease;
          background: white;
        }
        .provider-btn:hover {
          border-color: #667eea;
          background: #f8f9ff;
          transform: translateY(-2px);
        }
        .spotify { border-color: #1db954; }
        .spotify:hover { background: #f0fff4; }
        .apple { border-color: #fa243c; }
        .apple:hover { background: #fff0f0; }
        .youtube { border-color: #ff0000; }
        .youtube:hover { background: #fff0f0; }
        .footer {
          margin-top: 30px;
          font-size: 14px;
          color: #999;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="artwork">
          ${track.artwork ? `<img src="${track.artwork}" alt="Track artwork">` : '🎵'}
        </div>
        <h1>${track.title}</h1>
        <div class="artist">${track.artist}</div>
        
        <div class="providers">
          ${track.providers.map(provider => `
            <a href="${provider.deepLink}" class="provider-btn ${provider.name}">
              Play on ${provider.displayName}
            </a>
          `).join('')}
        </div>
        
        <div class="footer">
          Powered by TrackShare
        </div>
      </div>
    </body>
    </html>
  `);
});

// Export for Vercel
module.exports = app;

// Start server locally
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 TrackShare API server running on port ${PORT}`);
  });
}