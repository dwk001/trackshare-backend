const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const https = require('https');
// Use the correct KV variable names from Upstash
const { kv } = require('@vercel/kv');

const app = express();

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

// Spotify Client Credentials authentication
async function getSpotifyAccessToken() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    console.log('Spotify credentials not configured');
    return null;
  }
  
  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      },
      body: 'grant_type=client_credentials'
    });
    
    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error getting Spotify token:', error);
    return null;
  }
}

// iTunes Search API fallback
async function searchItunes(title, artist) {
  try {
    const searchTerm = encodeURIComponent(`${title} ${artist}`);
    const response = await fetch(`https://itunes.apple.com/search?term=${searchTerm}&entity=song&limit=1`);
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      const result = data.results[0];
      return {
        title: result.trackName || title,
        artist: result.artistName || artist,
        artwork: result.artworkUrl100 ? result.artworkUrl100.replace('100x100', '600x600') : null
      };
    }
  } catch (error) {
    console.error('iTunes search failed:', error);
  }
  
  return { title, artist, artwork: null };
}

// Enhanced track resolution with real metadata
async function resolveTrackMetadata(trackInfo) {
  try {
    let title = 'Unknown Track';
    let artist = 'Unknown Artist';
    let artwork = null;
    
    if (trackInfo.type === 'spotify') {
      // Try Spotify Web API with Client Credentials first
      const accessToken = await getSpotifyAccessToken();
      if (accessToken) {
        try {
          const response = await fetch(`https://api.spotify.com/v1/tracks/${trackInfo.id}`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          });
          
          if (response.ok) {
            const spotifyData = await response.json();
            title = spotifyData.name || title;
            artist = spotifyData.artists && spotifyData.artists.length > 0 ? spotifyData.artists[0].name : artist;
            artwork = spotifyData.album && spotifyData.album.images && spotifyData.album.images.length > 0 
              ? spotifyData.album.images[0].url : null;
          }
        } catch (apiError) {
          console.log('Spotify Web API failed:', apiError);
        }
      }
      
      // Fallback to oEmbed if Web API failed
      if (title === 'Unknown Track' || artist === 'Unknown Artist') {
        const oembedUrl = `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackInfo.id}`;
        try {
          const oembedData = await makeRequest(oembedUrl);
          if (title === 'Unknown Track') title = oembedData.title || title;
          if (!artwork) artwork = oembedData.thumbnail_url || null;
        } catch (e) {
          console.log('Spotify oEmbed failed');
        }
      }
      
      // Final fallback to iTunes Search
      if (artist === 'Unknown Artist' && title !== 'Unknown Track') {
        const itunesData = await searchItunes(title, '');
        if (itunesData.artist !== '') {
          artist = itunesData.artist;
          if (!artwork) artwork = itunesData.artwork;
        }
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
        console.log('YouTube oEmbed failed');
      }
      
      // Fallback to iTunes Search for better metadata
      if (artist === 'Unknown Artist' && title !== 'Unknown Track') {
        const itunesData = await searchItunes(title, '');
        if (itunesData.artist !== '') {
          artist = itunesData.artist;
          if (!artwork) artwork = itunesData.artwork;
        }
      }
    }
    
        // Generate provider links for all platforms with a robust native-first strategy
        const providers = [
          {
            name: 'spotify',
            displayName: 'Spotify',
            deepLinkHint: trackInfo.type === 'spotify' 
              ? `spotify://track/${trackInfo.id}` 
              : `spotify://search/${encodeURIComponent(title + ' ' + artist)}`,
            webUrl: trackInfo.type === 'spotify'
              ? `https://open.spotify.com/track/${trackInfo.id}`
              : `https://open.spotify.com/search?q=${encodeURIComponent(title + ' ' + artist)}`,
            isAvailable: true
          },
          {
            name: 'apple_music',
            displayName: 'Apple Music',
            // Universal links are the most reliable hint for Apple Music on both platforms.
            // On Android, the frontend will wrap this in an intent.
            deepLinkHint: `https://music.apple.com/search?term=${encodeURIComponent(title + ' ' + artist)}`,
            webUrl: `https://music.apple.com/search?term=${encodeURIComponent(title + ' ' + artist)}`,
            isAvailable: true
          },
          {
            name: 'youtube_music',
            displayName: 'YouTube Music',
            // Use direct link if source, otherwise search. Universal links are reliable here too.
            deepLinkHint: trackInfo.type === 'youtube'
              ? `https://music.youtube.com/watch?v=${trackInfo.id}`
              : `https://music.youtube.com/search?q=${encodeURIComponent(title + ' ' + artist)}`,
            webUrl: trackInfo.type === 'youtube'
              ? `https://music.youtube.com/watch?v=${trackInfo.id}`
              : `https://music.youtube.com/search?q=${encodeURIComponent(title + ' ' + artist)}`,
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

// Generate short URL with random ID
function generateShortUrl(track) {
  // Generate a random short ID
  const shortId = Math.random().toString(36).substring(2, 8);
  return `https://trackshare.online/t/${shortId}`;
}

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
    const shortUrl = generateShortUrl(track);
    const shortId = shortUrl.split('/t/')[1];
    
    // Store track data in Vercel KV
    try {
      const trackData = {
        title: track.title,
        artist: track.artist,
        artwork: track.artwork,
        providers: track.providers,
        sourceUrl: url,
        createdAt: new Date().toISOString()
      };
      
      await kv.set(`t:${shortId}`, trackData, { ex: 2592000 }); // 30 days TTL - KV auto-serializes
      console.log(`Stored track data for ${shortId}`);
    } catch (kvError) {
      console.error('KV storage failed:', kvError);
      console.error('KV error details:', kvError.message);
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
});

// Export for Vercel
module.exports = app;
