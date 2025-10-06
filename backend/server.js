const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const https = require('https');

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

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
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(url);
      const requestOptions = {
        method: options.method || 'GET',
        headers: options.headers ? { ...options.headers } : {}
      };

      const req = https.request(parsedUrl, requestOptions, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (!data) {
            return resolve(null);
          }

          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch (error) {
            error.message = `Failed to parse response from ${url}: ${error.message}`;
            return reject(error);
          }

          if (res.statusCode < 200 || res.statusCode >= 300) {
            const err = new Error(`Request to ${url} failed with status ${res.statusCode}`);
            err.statusCode = res.statusCode;
            err.body = parsed;
            return reject(err);
          }

          resolve(parsed);
        });
      });

      req.on('error', reject);

      if (options.body) {
        if (!Object.keys(requestOptions.headers).some((header) => header.toLowerCase() === 'content-length')) {
          req.setHeader('Content-Length', Buffer.byteLength(options.body));
        }
        req.write(options.body);
      }

      req.end();
    } catch (error) {
      reject(error);
    }
  });
}

function escapeHtml(value) {
  if (value == null) {
    return '';
  }

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const spotifyTokenCache = {
  token: null,
  expiresAt: 0
};

async function getSpotifyAccessToken() {
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    return null;
  }

  const now = Date.now();
  if (spotifyTokenCache.token && now < spotifyTokenCache.expiresAt) {
    return spotifyTokenCache.token;
  }

  const credentials = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');

  try {
    const response = await makeRequest('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    if (response && response.access_token) {
      spotifyTokenCache.token = response.access_token;
      spotifyTokenCache.expiresAt = now + Math.max(0, (response.expires_in - 60) * 1000);
      return spotifyTokenCache.token;
    }
  } catch (error) {
    console.error('Failed to obtain Spotify access token:', error.message);
  }

  return null;
}

async function searchSpotifyTrack(title, artist) {
  const queryParts = [];
  if (title) {
    queryParts.push(title);
  }
  if (artist) {
    queryParts.push(artist);
  }

  const query = queryParts.join(' ').trim();
  if (!query) {
    return null;
  }

  const token = await getSpotifyAccessToken();
  if (!token) {
    return null;
  }

  const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1`;

  try {
    const data = await makeRequest(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (data && data.tracks && Array.isArray(data.tracks.items) && data.tracks.items.length > 0) {
      const track = data.tracks.items[0];
      return {
        id: track.id,
        title: track.name,
        artist: track.artists ? track.artists.map((item) => item.name).join(', ') : null,
        artwork: track.album && Array.isArray(track.album.images) && track.album.images.length > 0
          ? track.album.images[0].url
          : null
      };
    }
  } catch (error) {
    if (error.statusCode === 401) {
      spotifyTokenCache.token = null;
      spotifyTokenCache.expiresAt = 0;
    }
    console.error('Spotify search failed:', error.message);
  }

  return null;
}

async function lookupAppleTrack(id) {
  if (!id) {
    return null;
  }

  try {
    const url = `https://itunes.apple.com/lookup?id=${encodeURIComponent(id)}`;
    const response = await makeRequest(url);

    if (response && Array.isArray(response.results) && response.results.length > 0) {
      const track = response.results[0];
      return {
        title: track.trackName,
        artist: track.artistName,
        artwork: track.artworkUrl100 ? track.artworkUrl100.replace('100x100bb', '400x400bb') : null,
        url: track.trackViewUrl
      };
    }
  } catch (error) {
    console.error('Apple Music lookup failed:', error.message);
  }

  return null;
}

async function searchAppleMusic(title, artist) {
  const queryParts = [];
  if (title) {
    queryParts.push(title);
  }
  if (artist) {
    queryParts.push(artist);
  }

  const query = queryParts.join(' ').trim();
  if (!query) {
    return null;
  }

  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=1`;
    const response = await makeRequest(url);

    if (response && Array.isArray(response.results) && response.results.length > 0) {
      const track = response.results[0];
      return {
        title: track.trackName,
        artist: track.artistName,
        artwork: track.artworkUrl100 ? track.artworkUrl100.replace('100x100bb', '400x400bb') : null,
        url: track.trackViewUrl
      };
    }
  } catch (error) {
    console.error('Apple Music search failed:', error.message);
  }

  return null;
}

async function searchYouTubeMusic(title, artist) {
  if (!YOUTUBE_API_KEY) {
    return null;
  }

  const queryParts = [];
  if (title) {
    queryParts.push(title);
  }
  if (artist) {
    queryParts.push(artist);
  }

  const query = queryParts.join(' ').trim();
  if (!query) {
    return null;
  }

  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=1&q=${encodeURIComponent(query)}&key=${YOUTUBE_API_KEY}`;

  try {
    const response = await makeRequest(url);

    if (response && Array.isArray(response.items) && response.items.length > 0) {
      const item = response.items[0];
      const videoId = item.id && item.id.videoId;

      if (!videoId) {
        return null;
      }

      const snippet = item.snippet || {};

      return {
        id: videoId,
        title: snippet.title,
        artwork: (snippet.thumbnails && (snippet.thumbnails.high?.url || snippet.thumbnails.medium?.url || snippet.thumbnails.default?.url)) || null,
        url: `https://music.youtube.com/watch?v=${videoId}&feature=share`
      };
    }
  } catch (error) {
    console.error('YouTube Music search failed:', error.message);
  }

  return null;
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
    const providerLinks = {};

    if (trackInfo.type === 'spotify') {
      const oembedUrl = `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackInfo.id}`;
      try {
        const oembedData = await makeRequest(oembedUrl);
        if (oembedData) {
          title = oembedData.title || title;
          artist = oembedData.author_name || artist;
          artwork = oembedData.thumbnail_url || artwork;
        }
      } catch (error) {
        console.log('Spotify oEmbed failed, using fallback metadata');
      }
      providerLinks.spotify = `https://open.spotify.com/track/${trackInfo.id}`;
    } else if (trackInfo.type === 'youtube') {
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${trackInfo.id}&format=json`;
      try {
        const oembedData = await makeRequest(oembedUrl);
        if (oembedData) {
          title = oembedData.title || title;
          artist = oembedData.author_name || artist;
          artwork = oembedData.thumbnail_url || artwork;
        }
      } catch (error) {
        console.log('YouTube oEmbed failed, using fallback metadata');
      }
      providerLinks.youtube_music = `https://music.youtube.com/watch?v=${trackInfo.id}&feature=share`;
    } else if (trackInfo.type === 'apple') {
      const appleTrack = await lookupAppleTrack(trackInfo.id);
      if (appleTrack) {
        title = appleTrack.title || title;
        artist = appleTrack.artist || artist;
        artwork = appleTrack.artwork || artwork;
        providerLinks.apple_music = appleTrack.url;
      }
    }

    const queryParts = [];
    if (title && title !== 'Unknown Track') {
      queryParts.push(title);
    }
    if (artist && artist !== 'Unknown Artist') {
      queryParts.push(artist);
    }

    const query = queryParts.join(' ').trim();

    if (!providerLinks.spotify && query) {
      const spotifyMatch = await searchSpotifyTrack(title !== 'Unknown Track' ? title : null, artist !== 'Unknown Artist' ? artist : null);
      if (spotifyMatch) {
        providerLinks.spotify = `https://open.spotify.com/track/${spotifyMatch.id}`;
        if ((!artwork || artwork === null) && spotifyMatch.artwork) {
          artwork = spotifyMatch.artwork;
        }
        if (title === 'Unknown Track' && spotifyMatch.title) {
          title = spotifyMatch.title;
        }
        if (artist === 'Unknown Artist' && spotifyMatch.artist) {
          artist = spotifyMatch.artist;
        }
      }
    }

    if (!providerLinks.apple_music && query) {
      const appleMatch = await searchAppleMusic(title !== 'Unknown Track' ? title : null, artist !== 'Unknown Artist' ? artist : null);
      if (appleMatch) {
        providerLinks.apple_music = appleMatch.url;
        if ((!artwork || artwork === null) && appleMatch.artwork) {
          artwork = appleMatch.artwork;
        }
        if (title === 'Unknown Track' && appleMatch.title) {
          title = appleMatch.title;
        }
        if (artist === 'Unknown Artist' && appleMatch.artist) {
          artist = appleMatch.artist;
        }
      }
    }

    if (!providerLinks.youtube_music && query) {
      const youtubeMatch = await searchYouTubeMusic(title !== 'Unknown Track' ? title : null, artist !== 'Unknown Artist' ? artist : null);
      if (youtubeMatch) {
        providerLinks.youtube_music = youtubeMatch.url;
        if ((!artwork || artwork === null) && youtubeMatch.artwork) {
          artwork = youtubeMatch.artwork;
        }
      }
    }

    const encodedQuery = query ? encodeURIComponent(query) : null;
    const providers = [];

    const addProvider = (name, displayName, directLink, isAvailable, fallback) => {
      if (!directLink && !fallback) {
        return;
      }

      providers.push({
        name,
        displayName,
        deepLink: directLink || fallback,
        isAvailable,
        fallbackLink: fallback || null
      });
    };

    addProvider(
      'spotify',
      'Spotify',
      providerLinks.spotify || null,
      Boolean(providerLinks.spotify),
      encodedQuery ? `https://open.spotify.com/search/${encodedQuery}` : null
    );

    addProvider(
      'apple_music',
      'Apple Music',
      providerLinks.apple_music || null,
      Boolean(providerLinks.apple_music),
      encodedQuery ? `https://music.apple.com/search?term=${encodedQuery}` : null
    );

    addProvider(
      'youtube_music',
      'YouTube Music',
      providerLinks.youtube_music || null,
      Boolean(providerLinks.youtube_music),
      encodedQuery ? `https://music.youtube.com/search?q=${encodedQuery}` : null
    );

    return {
      title,
      artist,
      artwork,
      providers
    };
  } catch (error) {
    console.error('Error resolving metadata:', error);

    const fallbackProviders = [];
    if (trackInfo.type === 'spotify') {
      fallbackProviders.push({
        name: 'spotify',
        displayName: 'Spotify',
        deepLink: `https://open.spotify.com/track/${trackInfo.id}`,
        isAvailable: true
      });
    } else if (trackInfo.type === 'apple') {
      fallbackProviders.push({
        name: 'apple_music',
        displayName: 'Apple Music',
        deepLink: `https://music.apple.com/`,
        isAvailable: false
      });
    } else if (trackInfo.type === 'youtube') {
      fallbackProviders.push({
        name: 'youtube_music',
        displayName: 'YouTube Music',
        deepLink: `https://music.youtube.com/`,
        isAvailable: false
      });
    }

    return {
      title: 'Unknown Track',
      artist: 'Unknown Artist',
      artwork: null,
      providers: fallbackProviders
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

    const trackKey = `${trackInfo.type}:${trackInfo.id}`;
    let track = tracks.get(trackKey);

    if (!track) {
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

    const shortUrl = generateShortUrl(track.id);
    shortUrls.set(shortUrl, track.id);

    await new Promise((resolve) => setTimeout(resolve, 500));

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

  const safeTitle = escapeHtml(track.title);
  const safeArtist = escapeHtml(track.artist);
  const safeArtwork = track.artwork ? escapeHtml(track.artwork) : '';

  const providerButtons = Array.isArray(track.providers)
    ? track.providers
        .filter((provider) => provider && provider.deepLink)
        .map((provider) => {
          const safeLink = escapeHtml(provider.deepLink);
          const safeName = escapeHtml(provider.displayName || '');
          const label = provider.isAvailable ? 'Play on' : 'Search on';
          const classes = `provider-btn ${escapeHtml(provider.name || '')}${provider.isAvailable ? '' : ' unavailable'}`;
          const targetAttrs = provider.isAvailable ? '' : ' target="_blank" rel="noopener noreferrer"';
          return `
            <a href="${safeLink}" class="${classes}"${targetAttrs}>
              ${label} ${safeName}
            </a>`;
        })
        .join('')
    : '';

  const providerContent = providerButtons || '<p class="empty-state">We could not find direct links for this track yet.</p>';

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${safeTitle} - ${safeArtist} | TrackShare</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <meta property="og:title" content="${safeTitle} - ${safeArtist}">
      <meta property="og:description" content="Listen to ${safeTitle} by ${safeArtist} on your preferred music platform">
      <meta property="og:image" content="${safeArtwork}">
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
        .provider-btn.unavailable {
          border-style: dashed;
          opacity: 0.8;
        }
        .spotify { border-color: #1db954; }
        .spotify:hover { background: #f0fff4; }
        .apple_music { border-color: #fa243c; }
        .apple_music:hover { background: #fff0f0; }
        .youtube_music { border-color: #ff0000; }
        .youtube_music:hover { background: #fff0f0; }
        .empty-state {
          color: #555;
          font-size: 15px;
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
          ${safeArtwork ? `<img src="${safeArtwork}" alt="Track artwork">` : '🎵'}
        </div>
        <h1>${safeTitle}</h1>
        <div class="artist">${safeArtist}</div>

        <div class="providers">
          ${providerContent}
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
