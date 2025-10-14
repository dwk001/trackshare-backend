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
        artwork: result.artworkUrl100 ? result.artworkUrl100.replace('100x100', '600x600') : null,
        trackId: result.trackId
      };
    }
  } catch (error) {
    console.error('iTunes search failed:', error);
  }
  
  return { title, artist, artwork: null, trackId: null };
}

// Clean search query for better results
function cleanSearchQuery(title, artist) {
  // Remove common suffixes that hurt search results
  let cleanTitle = title.replace(/\s*-\s*Topic$/, '').trim();
  cleanTitle = cleanTitle.replace(/\s*\(Official.*?\)$/i, '').trim();
  cleanTitle = cleanTitle.replace(/\s*\[.*?\]$/i, '').trim();
  
  // Clean artist name
  let cleanArtist = artist.replace(/\s*-\s*Topic$/, '').trim();
  
  return {
    title: cleanTitle,
    artist: cleanArtist,
    combined: `${cleanTitle} ${cleanArtist}`.trim()
  };
}

// Search for direct track URLs on music platforms
async function findDirectTrackUrls(title, artist) {
  const results = {
    spotify: null,
    appleMusic: null,
    youtubeMusic: null
  };
  
  const clean = cleanSearchQuery(title, artist);
  console.log('Searching for:', clean);
  
  try {
    // Search Spotify using their Web API
    const spotifyToken = await getSpotifyAccessToken();
    if (spotifyToken) {
      try {
        const spotifyResponse = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(clean.combined)}&type=track&limit=3`, {
          headers: { 'Authorization': `Bearer ${spotifyToken}` }
        });
        if (spotifyResponse.ok) {
          const spotifyData = await spotifyResponse.json();
          if (spotifyData.tracks.items.length > 0) {
            // Find the best match
            const track = spotifyData.tracks.items[0];
            results.spotify = {
              trackId: track.id,
              nativeUrl: `spotify://track/${track.id}`,
              webUrl: `https://open.spotify.com/track/${track.id}`
            };
            console.log('Found Spotify track:', track.name, 'by', track.artists[0].name);
          }
        }
      } catch (e) {
        console.log('Spotify direct search failed:', e);
      }
    }
    
    // Search Apple Music using iTunes API
    try {
      const itunesData = await searchItunes(clean.title, clean.artist);
      if (itunesData.trackId) {
        results.appleMusic = {
          trackId: itunesData.trackId,
          webUrl: `https://music.apple.com/us/album/${itunesData.trackId}`
        };
        console.log('Found Apple Music track:', itunesData.title, 'by', itunesData.artist);
      }
    } catch (e) {
      console.log('Apple Music direct search failed:', e);
    }
    
    // Search YouTube Music using YouTube Data API
    try {
      const youtubeResponse = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(clean.combined + ' music')}&type=video&key=${process.env.YOUTUBE_API_KEY}&maxResults=3`);
      if (youtubeResponse.ok) {
        const youtubeData = await youtubeResponse.json();
        if (youtubeData.items.length > 0) {
          const video = youtubeData.items[0];
          results.youtubeMusic = {
            videoId: video.id.videoId,
            nativeUrl: `youtubemusic://music.youtube.com/watch?v=${video.id.videoId}`,
            webUrl: `https://music.youtube.com/watch?v=${video.id.videoId}`
          };
          console.log('Found YouTube Music video:', video.snippet.title);
        }
      }
    } catch (e) {
      console.log('YouTube Music direct search failed:', e);
    }
    
  } catch (error) {
    console.error('Error finding direct track URLs:', error);
  }
  
  return results;
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
    
        // Find direct track URLs on all platforms
    const directUrls = await findDirectTrackUrls(title, artist);

    const providers = [
      {
        name: 'spotify',
        displayName: 'Spotify',
        nativeUrl: directUrls.spotify
          ? directUrls.spotify.nativeUrl
          : `spotify://search/${encodeURIComponent(title + ' ' + artist)}`,
        webUrl: directUrls.spotify
          ? directUrls.spotify.webUrl
          : `https://open.spotify.com/search?q=${encodeURIComponent(title + ' ' + artist)}`,
        isAvailable: true,
        isDirect: !!directUrls.spotify
      },
      {
        name: 'apple_music',
        displayName: 'Apple Music',
        nativeUrl: `music://music.apple.com/search?term=${encodeURIComponent(title + ' ' + artist)}`,
        webUrl: directUrls.appleMusic
          ? directUrls.appleMusic.webUrl
          : `https://music.apple.com/search?term=${encodeURIComponent(title + ' ' + artist)}`,
        isAvailable: true,
        isDirect: !!directUrls.appleMusic
      },
      {
        name: 'youtube_music',
        displayName: 'YouTube Music',
        nativeUrl: directUrls.youtubeMusic
          ? directUrls.youtubeMusic.nativeUrl
          : `youtubemusic://music.youtube.com/search?q=${encodeURIComponent(title + ' ' + artist)}`,
        webUrl: directUrls.youtubeMusic
          ? directUrls.youtubeMusic.webUrl
          : `https://music.youtube.com/search?q=${encodeURIComponent(title + ' ' + artist)}`,
        isAvailable: true,
        isDirect: !!directUrls.youtubeMusic
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
