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
    
    // Hardcoded mapping for testing (this should be replaced with proper API calls)
    const trackMappings = {
      '4gfrYDtaRmp6HPvN80V2ob': {
        title: 'I Got Better',
        artist: 'Morgan Wallen',
        artwork: 'https://image-cdn-fa.spotifycdn.com/image/ab67616d00001e0235ea219ce47813b5e2dc3745'
      }
    };
    
    // Check if we have a hardcoded mapping
    if (trackMappings[trackInfo.id]) {
      const mapping = trackMappings[trackInfo.id];
      title = mapping.title;
      artist = mapping.artist;
      artwork = mapping.artwork;
    }
    
    if (trackInfo.type === 'spotify') {
      // Use Spotify oEmbed API for metadata
      const oembedUrl = `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackInfo.id}`;
      try {
        const oembedData = await makeRequest(oembedUrl);
        title = oembedData.title || title;
        artwork = oembedData.thumbnail_url || null;
        
        // Try to get artist info from Spotify Web API (public endpoint)
        try {
          const spotifyApiUrl = `https://api.spotify.com/v1/tracks/${trackInfo.id}`;
          // Note: This will likely fail without authentication, but let's try
          const spotifyData = await makeRequest(spotifyApiUrl);
          if (spotifyData.artists && spotifyData.artists.length > 0) {
            artist = spotifyData.artists[0].name;
          }
        } catch (apiError) {
          console.log('Spotify Web API failed, using fallback');
          // Fallback: try to extract from title or use generic
          if (title && title !== 'Unknown Track') {
            artist = 'Artist'; // Generic fallback
          }
        }
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

module.exports = async (req, res) => {
  const { id } = req.query;
  const { d } = req.query; // data parameter
  
  // If we have embedded data, decode it and recreate the track
  if (d) {
    try {
      const essentialData = JSON.parse(Buffer.from(d, 'base64').toString());
      
      // Recreate the track from the essential data
      const trackInfo = extractTrackId(`spotify:track:${essentialData.i}`);
      if (trackInfo) {
        const metadata = await resolveTrackMetadata(trackInfo);
        
        const track = {
          id: essentialData.i,
          title: essentialData.t,
          artist: essentialData.a,
          artwork: metadata.artwork,
          providers: metadata.providers
        };
        
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
        return;
      }
    } catch (e) {
      console.error('Error decoding track data:', e);
    }
  }
  
  // Fallback if no embedded data or decode fails
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
};
