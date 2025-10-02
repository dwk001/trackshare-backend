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
              gap: 8px;
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
              text-decoration: none;
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
              ${track.providers.map(provider => {
                if (provider.name === 'spotify') {
                  return `
                    <button class="provider-btn ${provider.name}" onclick="openProvider('spotify', '${provider.deepLink}')">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="#1DB954">
                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
                      </svg>
                      Play on ${provider.displayName}
                    </button>
                  `;
                } else if (provider.name === 'apple_music') {
                  return `
                    <button class="provider-btn ${provider.name}" onclick="openProvider('apple_music', '${provider.deepLink}')">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="#FF2D92">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                      </svg>
                      Play on ${provider.displayName}
                    </button>
                  `;
                } else if (provider.name === 'youtube_music') {
                  return `
                    <button class="provider-btn ${provider.name}" onclick="openProvider('youtube_music', '${provider.deepLink}')">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="#FF0000">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                      Play on ${provider.displayName}
                    </button>
                  `;
                }
                return '';
              }).join('')}
            </div>
            
            <script>
              function openProvider(provider, url) {
                // Prevent double-click by disabling button temporarily
                event.target.disabled = true;
                event.target.style.opacity = '0.7';
                
                if (provider === 'spotify') {
                  // Try Spotify app first - use proper URL scheme
                  const spotifyUrl = url.replace('https://open.spotify.com/track/', 'spotify://track/');
                  window.location.href = spotifyUrl;
                  
                  // Fallback to web after a short delay
                  setTimeout(() => {
                    window.open(url, '_blank');
                  }, 800);
                } else if (provider === 'apple_music') {
                  // Try Apple Music app first
                  const appleUrl = url.replace('https://music.apple.com', 'music://music.apple.com');
                  window.location.href = appleUrl;
                  
                  // Fallback to web after a short delay
                  setTimeout(() => {
                    window.open(url, '_blank');
                  }, 800);
                } else if (provider === 'youtube_music') {
                  // Try YouTube Music app first
                  const youtubeUrl = url.replace('https://music.youtube.com', 'youtubemusic://music.youtube.com');
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