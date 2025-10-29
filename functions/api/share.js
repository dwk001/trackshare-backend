export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Handle /t/{shortId} routes
    if (url.pathname.startsWith('/t/')) {
      const shortId = url.pathname.split('/t/')[1];
      
      if (!shortId) {
        return new Response(`
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
        `, {
          status: 400,
          headers: { 'Content-Type': 'text/html' }
        });
      }
      
      // Try to get actual track data from share storage
      try {
        const shareData = shareStorage.get(shortId);
        if (shareData) {
          const trackData = shareData;
          
          return new Response(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>${trackData.trackTitle} - ${trackData.trackArtist} | TrackShare</title>
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <meta property="og:title" content="${trackData.trackTitle} - ${trackData.trackArtist}">
              <meta property="og:description" content="Listen to ${trackData.trackTitle} by ${trackData.trackArtist} on your preferred music platform">
              <meta property="og:image" content="${trackData.trackArtwork || ''}">
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
                  display: grid;
                  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                  gap: 12px;
                  margin-bottom: 20px;
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
                  min-height: 60px;
                  position: relative;
                  overflow: hidden;
                }
                .provider-btn:hover {
                  transform: translateY(-2px);
                  box-shadow: 0 8px 25px rgba(0,0,0,0.15);
                }
                .provider-btn:active {
                  transform: translateY(0);
                }
                .spotify { border-color: #1db954; }
                .spotify:hover { background: #f0fff4; border-color: #1db954; }
                .apple_music { border-color: #fa243c; }
                .apple_music:hover { background: #fff0f0; border-color: #fa243c; }
                .youtube_music { border-color: #ff0000; }
                .youtube_music:hover { background: #fff0f0; border-color: #ff0000; }
                .deezer { border-color: #ff0000; }
                .deezer:hover { background: #fff0f0; border-color: #ff0000; }
                .tidal { border-color: #00ffff; }
                .tidal:hover { background: #f0ffff; border-color: #00ffff; }
                .soundcloud { border-color: #ff5500; }
                .soundcloud:hover { background: #fff8f0; border-color: #ff5500; }
                .provider-icon {
                  font-size: 24px;
                  margin-right: 8px;
                }
                .provider-text {
                  font-size: 14px;
                  line-height: 1.2;
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
                  ${trackData.trackArtwork ? `<img src="${trackData.trackArtwork}" alt="Track artwork">` : '🎵'}
                </div>
                <h1>${trackData.trackTitle}</h1>
                <div class="artist">${trackData.trackArtist}</div>
                
                <div class="providers">
                  ${Object.entries(trackData.providerLinks).map(([provider, links]) => `
                    <a href="${links.url}" class="provider-btn ${provider}" onclick="openProvider(event, '${links.deepLink || links.url}', '${links.url}', '${links.searchUrl || links.url}')">
                      <span class="provider-icon">${getProviderIcon(provider)}</span>
                      <span class="provider-text">Play on<br>${getProviderName(provider)}</span>
                    </a>
                  `).join('')}
                </div>
                
                <div class="footer">
                  Powered by TrackShare
                </div>
              </div>
              
              <script>
                function openProvider(event, nativeUrl, webUrl, searchUrl) {
                  event.preventDefault();
                  const button = event.currentTarget;
                  if (!button) {
                    window.location.href = nativeUrl || webUrl;
                    return;
                  }

                  button.disabled = true;
                  const previousOpacity = button.style.opacity;
                  button.style.opacity = '0.7';

                  // Try native deep link first
                  const targetUrl = nativeUrl || webUrl;
                  if (targetUrl) {
                    window.location.href = targetUrl;
                  }

                  // Fallback to web URL after delay
                  if (webUrl && nativeUrl && nativeUrl !== webUrl) {
                    setTimeout(function() {
                      window.open(webUrl, '_blank');
                    }, 800);
                  }

                  // Reset button state
                  setTimeout(function() {
                    button.disabled = false;
                    button.style.opacity = previousOpacity || '1';
                  }, 1500);
                }

                // Detect mobile/desktop for better UX
                function isMobile() {
                  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                }

                // Add mobile-specific optimizations
                if (isMobile()) {
                  document.body.style.padding = '10px';
                  document.querySelector('.container').style.padding = '20px';
                  document.querySelector('.providers').style.gridTemplateColumns = 'repeat(2, 1fr)';
                }
              </script>
            </body>
            </html>
          `, {
            headers: { 'Content-Type': 'text/html' }
          });
        }
      } catch (error) {
        console.error('Error fetching track data:', error);
      }
      
      // Fallback to demo track data if API fails
      const trackData = {
        id: shortId,
        title: 'Sample Track',
        artist: 'Sample Artist',
        artwork: 'https://via.placeholder.com/300x300/667eea/ffffff?text=🎵',
        providers: [
          {
            name: 'spotify',
            displayName: 'Spotify',
            icon: '🎵',
            color: '#1DB954',
            nativeUrl: `spotify:search:Sample Track Sample Artist`,
            webUrl: `https://open.spotify.com/search/Sample Track Sample Artist`,
            searchUrl: `https://open.spotify.com/search/Sample Track Sample Artist`,
            isAvailable: true
          },
          {
            name: 'apple_music',
            displayName: 'Apple Music',
            icon: '🍎',
            color: '#FA243C',
            nativeUrl: `music://music.apple.com/search?term=Sample Track Sample Artist`,
            webUrl: `https://music.apple.com/us/search?term=Sample Track Sample Artist`,
            searchUrl: `https://music.apple.com/us/search?term=Sample Track Sample Artist`,
            isAvailable: true
          },
          {
            name: 'youtube_music',
            displayName: 'YouTube Music',
            icon: '📺',
            color: '#FF0000',
            nativeUrl: `youtubemusic://search?q=Sample Track Sample Artist`,
            webUrl: `https://music.youtube.com/search?q=Sample Track Sample Artist`,
            searchUrl: `https://music.youtube.com/search?q=Sample Track Sample Artist`,
            isAvailable: true
          },
          {
            name: 'deezer',
            displayName: 'Deezer',
            icon: '🎶',
            color: '#FF0000',
            nativeUrl: `deezer://search?q=Sample Track Sample Artist`,
            webUrl: `https://www.deezer.com/search/Sample Track Sample Artist`,
            searchUrl: `https://www.deezer.com/search/Sample Track Sample Artist`,
            isAvailable: true
          },
          {
            name: 'tidal',
            displayName: 'Tidal',
            icon: '🌊',
            color: '#00FFFF',
            nativeUrl: `tidal://search?q=Sample Track Sample Artist`,
            webUrl: `https://tidal.com/search/Sample Track Sample Artist`,
            searchUrl: `https://tidal.com/search/Sample Track Sample Artist`,
            isAvailable: true
          },
          {
            name: 'soundcloud',
            displayName: 'SoundCloud',
            icon: '☁️',
            color: '#FF5500',
            nativeUrl: `soundcloud://search?q=Sample Track Sample Artist`,
            webUrl: `https://soundcloud.com/search/sounds?q=Sample Track Sample Artist`,
            searchUrl: `https://soundcloud.com/search/sounds?q=Sample Track Sample Artist`,
            isAvailable: true
          }
        ]
      };
      
      return new Response(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${trackData.title} - ${trackData.artist} | TrackShare</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <meta property="og:title" content="${trackData.title} - ${trackData.artist}">
          <meta property="og:description" content="Listen to ${trackData.title} by ${trackData.artist} on your preferred music platform">
          <meta property="og:image" content="${trackData.artwork || ''}">
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
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
              gap: 12px;
              margin-bottom: 20px;
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
              min-height: 60px;
              position: relative;
              overflow: hidden;
            }
            .provider-btn:hover {
              transform: translateY(-2px);
              box-shadow: 0 8px 25px rgba(0,0,0,0.15);
            }
            .provider-btn:active {
              transform: translateY(0);
            }
            .spotify { border-color: #1db954; }
            .spotify:hover { background: #f0fff4; border-color: #1db954; }
            .apple_music { border-color: #fa243c; }
            .apple_music:hover { background: #fff0f0; border-color: #fa243c; }
            .youtube_music { border-color: #ff0000; }
            .youtube_music:hover { background: #fff0f0; border-color: #ff0000; }
            .deezer { border-color: #ff0000; }
            .deezer:hover { background: #fff0f0; border-color: #ff0000; }
            .tidal { border-color: #00ffff; }
            .tidal:hover { background: #f0ffff; border-color: #00ffff; }
            .soundcloud { border-color: #ff5500; }
            .soundcloud:hover { background: #fff8f0; border-color: #ff5500; }
            .provider-icon {
              font-size: 24px;
              margin-right: 8px;
            }
            .provider-text {
              font-size: 14px;
              line-height: 1.2;
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
              ${trackData.artwork ? `<img src="${trackData.artwork}" alt="Track artwork">` : '🎵'}
            </div>
            <h1>${trackData.title}</h1>
            <div class="artist">${trackData.artist}</div>
            
            <div class="providers">
              ${trackData.providers.map(provider => `
                <a href="${provider.nativeUrl}" class="provider-btn ${provider.name}" onclick="openProvider(event, '${provider.nativeUrl}', '${provider.webUrl}', '${provider.searchUrl}')">
                  <span class="provider-icon">${provider.icon}</span>
                  <span class="provider-text">Play on<br>${provider.displayName}</span>
                </a>
              `).join('')}
            </div>
            
            <div class="footer">
              Powered by TrackShare
            </div>
          </div>
          
          <script>
            function openProvider(event, nativeUrl, webUrl, searchUrl) {
              event.preventDefault();
              const button = event.currentTarget;
              if (!button) {
                window.location.href = nativeUrl || webUrl;
                return;
              }

              button.disabled = true;
              const previousOpacity = button.style.opacity;
              button.style.opacity = '0.7';

              // Try native deep link first
              const targetUrl = nativeUrl || webUrl;
              if (targetUrl) {
                window.location.href = targetUrl;
              }

              // Fallback to web URL after delay
              if (webUrl && nativeUrl && nativeUrl !== webUrl) {
                setTimeout(function() {
                  window.open(webUrl, '_blank');
                }, 800);
              }

              // Reset button state
              setTimeout(function() {
                button.disabled = false;
                button.style.opacity = previousOpacity || '1';
              }, 1500);
            }

            // Detect mobile/desktop for better UX
            function isMobile() {
              return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            }

            // Add mobile-specific optimizations
            if (isMobile()) {
              document.body.style.padding = '10px';
              document.querySelector('.container').style.padding = '20px';
              document.querySelector('.providers').style.gridTemplateColumns = 'repeat(2, 1fr)';
            }
          </script>
        </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    // For all other requests, return 404
    return new Response('Not Found', { status: 404 });
  },
};

// Helper functions
function getProviderIcon(provider) {
  const icons = {
    spotify: '🎵',
    apple_music: '🍎',
    youtube_music: '📺',
    deezer: '🎶',
    tidal: '🌊',
    soundcloud: '☁️'
  };
  return icons[provider] || '🎵';
}

function getProviderName(provider) {
  const names = {
    spotify: 'Spotify',
    apple_music: 'Apple Music',
    youtube_music: 'YouTube Music',
    deezer: 'Deezer',
    tidal: 'Tidal',
    soundcloud: 'SoundCloud'
  };
  return names[provider] || provider;
}
