const { kv } = require('@vercel/kv');

module.exports = async (req, res) => {
  const { id } = req.query;
  
  if (!id) {
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
        <p class="error">Invalid track link.</p>
      </body>
      </html>
    `);
  }
  
  // Try to get track data from Vercel KV
  try {
    const trackData = await kv.get(`t:${id}`);
    console.log(`Track data type:`, typeof trackData);
    if (trackData) {
      const track = typeof trackData === 'string' ? JSON.parse(trackData) : trackData;
      
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
              color: #333;
              font-weight: 600;
              background: white;
              cursor: pointer;
              -webkit-tap-highlight-color: transparent;
              user-select: none;
              -webkit-user-select: none;
              -moz-user-select: none;
              -ms-user-select: none;
              touch-action: manipulation;
              pointer-events: auto;
              font-size: 16px;
              font-family: inherit;
            }
            .provider-btn:active {
              transform: scale(0.95);
            }
            .provider-btn:focus {
              outline: none;
            }
            .provider-btn:hover {
              opacity: 0.9;
            }
            .spotify { 
              border-color: #1db954; 
            }
            .spotify:hover { 
              background: #f0fff4; 
              border-color: #1db954;
            }
            .apple_music { 
              border-color: #ff2d92; 
            }
            .apple_music:hover { 
              background: #fff0f8; 
              border-color: #ff2d92;
            }
            .youtube_music { 
              border-color: #ff0000; 
            }
            .youtube_music:hover { 
              background: #fff0f0; 
              border-color: #ff0000;
            }
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
                <button class="provider-btn ${provider.name}" onclick="openProvider('${provider.name}', '${provider.deepLink}')">
                  Play on ${provider.displayName}
                </button>
              `).join('')}
            </div>
            
            <script>
              function openProvider(provider, url) {
                // Prevent double-click by disabling button temporarily
                event.target.disabled = true;
                event.target.style.opacity = '0.7';
                
                // Try to open the app first, then fallback to web
                if (provider === 'spotify') {
                  // Try Spotify app first - use proper URL scheme
                  const spotifyUrl = url.replace('https://open.spotify.com/track/', 'spotify://track/');
                  window.location.href = spotifyUrl;
                  
                  // Fallback to web after a short delay
                  setTimeout(() => {
                    window.open(url, '_blank');
                  }, 800);
                } else if (provider === 'apple_music') {
                  // Try Apple Music app first - use proper URL scheme
                  const appleUrl = url.replace('https://music.apple.com/search?term=', 'music://music.apple.com/search?term=');
                  window.location.href = appleUrl;
                  
                  // Fallback to web after a short delay
                  setTimeout(() => {
                    window.open(url, '_blank');
                  }, 800);
                } else if (provider === 'youtube_music') {
                  // Try YouTube Music app first - use proper URL scheme
                  const youtubeUrl = url.replace('https://music.youtube.com/search?q=', 'youtubemusic://music.youtube.com/search?q=');
                  window.location.href = youtubeUrl;
                  
                  // Fallback to web after a short delay
                  setTimeout(() => {
                    window.open(url, '_blank');
                  }, 800);
                } else {
                  // Direct web fallback
                  window.open(url, '_blank');
                }
                
                // Re-enable button after a delay
                setTimeout(() => {
                  event.target.disabled = false;
                  event.target.style.opacity = '1';
                }, 1500);
              }
            </script>
            
            <div class="footer">
              Powered by TrackShare
            </div>
          </div>
        </body>
        </html>
      `);
      return;
    }
  } catch (kvError) {
    console.error('KV storage error:', kvError);
  }
  
  // Fallback if no track found or KV fails
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