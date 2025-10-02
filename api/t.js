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
    if (trackData) {
      const track = JSON.parse(trackData);
      
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