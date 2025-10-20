const https = require('https');

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
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).send(`
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
          <p class="error">Invalid track ID.</p>
        </body>
        </html>
      `);
    }
    
    // For demo purposes, we'll generate a random track
    // In production, you'd look up the track by ID in your database
    const mockTrack = {
      title: 'Prelude for Piano No. 11 in F-Sharp Minor',
      artist: 'Unknown Artist',
      artwork: 'https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e024f61e186facbb486f79e9fd9',
      providers: [
        {
          name: 'spotify',
          displayName: 'Spotify',
          nativeUrl: 'spotify://track/4iV5W9uYEdYUVa79Axb7Rh',
          webUrl: 'https://open.spotify.com/track/4iV5W9uYEdYUVa79Axb7Rh',
          isAvailable: true
        },
        {
          name: 'apple_music',
          displayName: 'Apple Music',
          nativeUrl: 'music://music.apple.com/search?term=Prelude%20for%20Piano%20No.%2011%20in%20F-Sharp%20Minor%20Unknown%20Artist',
          webUrl: 'https://music.apple.com/search?term=Prelude%20for%20Piano%20No.%2011%20in%20F-Sharp%20Minor%20Unknown%20Artist',
          isAvailable: true
        },
        {
          name: 'youtube_music',
          displayName: 'YouTube Music',
          nativeUrl: 'youtubemusic://watch?v=4iV5W9uYEdYUVa79Axb7Rh',
          webUrl: 'https://music.youtube.com/search?q=Prelude%20for%20Piano%20No.%2011%20in%20F-Sharp%20Minor%20Unknown%20Artist',
          isAvailable: true
        }
      ]
    };
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${mockTrack.title} - ${mockTrack.artist} | TrackShare</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta property="og:title" content="${mockTrack.title} - ${mockTrack.artist}">
        <meta property="og:description" content="Listen to ${mockTrack.title} by ${mockTrack.artist} on your preferred music platform">
        <meta property="og:image" content="${mockTrack.artwork || ''}">
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
            ${mockTrack.artwork ? `<img src="${mockTrack.artwork}" alt="Track artwork">` : '🎵'}
          </div>
          <h1>${mockTrack.title}</h1>
          <div class="artist">${mockTrack.artist}</div>
          
          <div class="providers">
            ${mockTrack.providers.map(provider => `
              <a href="${provider.nativeUrl}" class="provider-btn ${provider.name}" onclick="openProvider(event, '${provider.nativeUrl}', '${provider.webUrl}')">
                Play on ${provider.displayName}
              </a>
            `).join('')}
          </div>
          
          <div class="footer">
            Powered by TrackShare
          </div>
        </div>
        
        <script>
          function openProvider(event, nativeUrl, webUrl) {
            const button = event.currentTarget;
            if (!button) {
              window.location.href = nativeUrl || webUrl;
              return;
            }

            button.disabled = true;
            const previousOpacity = button.style.opacity;
            button.style.opacity = '0.7';

            const targetUrl = nativeUrl || webUrl;
            if (targetUrl) {
              window.location.href = targetUrl;
            }

            if (webUrl && nativeUrl && nativeUrl !== webUrl) {
              setTimeout(function() {
                window.open(webUrl, '_blank');
              }, 800);
            }

            setTimeout(function() {
              button.disabled = false;
              button.style.opacity = previousOpacity || '1';
            }, 1500);
          }
        </script>
      </body>
      </html>
    `);
    
  } catch (error) {
    console.error('Error loading track:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error - TrackShare</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .error { color: #e74c3c; }
        </style>
      </head>
      <body>
        <h1>Error</h1>
        <p class="error">Something went wrong loading this track.</p>
      </body>
      </html>
    `);
  }
};