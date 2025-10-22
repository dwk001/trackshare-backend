const { kv } = require('@vercel/kv');

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

// Check if required environment variables are set
const hasSpotifyCredentials = SPOTIFY_CLIENT_ID && SPOTIFY_CLIENT_SECRET;

// Fallback mock data for when Spotify API is unavailable
const FALLBACK_SEARCH_RESULTS = {
  tracks: [
    {
      id: 'search-fallback-1',
      title: 'Sample Search Result 1',
      artist: 'Sample Artist',
      primaryArtist: 'Sample Artist',
      artwork: 'https://via.placeholder.com/300x300/667eea/ffffff?text=Search+1',
      artworkMedium: 'https://via.placeholder.com/200x200/667eea/ffffff?text=Search+1',
      artworkSmall: 'https://via.placeholder.com/100x100/667eea/ffffff?text=Search+1',
      url: 'https://open.spotify.com/track/search1',
      album: 'Sample Album',
      albumUrl: 'https://open.spotify.com/album/sample1',
      releaseDate: '2024-01-01',
      popularity: 85,
      previewUrl: null,
      durationMs: 180000,
      explicit: false,
      spotifyUri: 'spotify:track:search1'
    },
    {
      id: 'search-fallback-2',
      title: 'Sample Search Result 2',
      artist: 'Sample Artist 2',
      primaryArtist: 'Sample Artist 2',
      artwork: 'https://via.placeholder.com/300x300/667eea/ffffff?text=Search+2',
      artworkMedium: 'https://via.placeholder.com/200x200/667eea/ffffff?text=Search+2',
      artworkSmall: 'https://via.placeholder.com/100x100/667eea/ffffff?text=Search+2',
      url: 'https://open.spotify.com/track/search2',
      album: 'Sample Album 2',
      albumUrl: 'https://open.spotify.com/album/sample2',
      releaseDate: '2024-01-02',
      popularity: 78,
      previewUrl: null,
      durationMs: 200000,
      explicit: false,
      spotifyUri: 'spotify:track:search2'
    }
  ],
  total: 2,
  limit: 20,
  offset: 0,
  hasMore: false
};

async function getSpotifyAccessToken() {
  // Check if credentials are available
  if (!hasSpotifyCredentials) {
    console.warn('Spotify credentials not configured, using fallback data');
    return null;
  }

  // Check cache first
  try {
    const cached = await kv.get('spotify:access_token');
    if (cached) return cached;
  } catch (e) {
    console.warn('Cache unavailable, fetching fresh token');
  }
  
  const auth = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');
  
  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });
    
    if (!response.ok) {
      throw new Error(`Spotify API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Cache for 55 minutes (tokens valid for 1 hour)
    if (data.access_token) {
      try {
        await kv.setex('spotify:access_token', 3300, data.access_token);
      } catch (e) {
        console.warn('Failed to cache token:', e.message);
      }
    }
    
    return data.access_token;
  } catch (error) {
    console.error('Failed to get Spotify access token:', error.message);
    return null;
  }
}

async function searchSpotify(query, type = 'track', limit = 20, offset = 0, filters = {}) {
  const accessToken = await getSpotifyAccessToken();
  
  // If no access token (missing credentials or API failure), return fallback data
  if (!accessToken) {
    console.log('Using fallback search results due to Spotify API unavailability');
    return {
      ...FALLBACK_SEARCH_RESULTS,
      tracks: FALLBACK_SEARCH_RESULTS.tracks.slice(offset, offset + limit),
      limit: parseInt(limit),
      offset: parseInt(offset)
    };
  }
  
  // Build advanced query with filters
  let searchQuery = query;
  
  if (filters.genre) {
    searchQuery += ` genre:"${filters.genre}"`;
  }
  
  if (filters.year) {
    searchQuery += ` year:${filters.year}`;
  }
  
  if (filters.yearRange) {
    const [startYear, endYear] = filters.yearRange.split('-');
    searchQuery += ` year:${startYear}-${endYear}`;
  }
  
  if (filters.artist) {
    searchQuery += ` artist:"${filters.artist}"`;
  }
  
  if (filters.album) {
    searchQuery += ` album:"${filters.album}"`;
  }
  
  if (filters.tag) {
    searchQuery += ` tag:${filters.tag}`;
  }
  
  if (filters.isrc) {
    searchQuery += ` isrc:${filters.isrc}`;
  }
  
  if (filters.upc) {
    searchQuery += ` upc:${filters.upc}`;
  }
  
  const params = new URLSearchParams({
    q: searchQuery,
    type: type,
    limit: limit.toString(),
    offset: offset.toString(),
    market: 'US'
  });
  
  // Add additional parameters for advanced filtering
  if (filters.includeExternal) {
    params.append('include_external', 'audio');
  }
  
  const response = await fetch(
    `https://api.spotify.com/v1/search?${params.toString()}`,
    {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    }
  );
  
  if (!response.ok) {
    throw new Error(`Spotify API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (type === 'track' && data.tracks) {
    return {
      tracks: data.tracks.items.map(track => ({
        id: track.id,
        title: track.name,
        artist: track.artists.map(a => a.name).join(', '),
        primaryArtist: track.artists[0].name,
        artwork: track.album.images[0]?.url,
        artworkMedium: track.album.images[1]?.url,
        artworkSmall: track.album.images[2]?.url,
        url: track.external_urls.spotify,
        album: track.album.name,
        albumUrl: track.album.external_urls.spotify,
        releaseDate: track.album.release_date,
        popularity: track.popularity,
        previewUrl: track.preview_url,
        durationMs: track.duration_ms,
        explicit: track.explicit,
        spotifyUri: track.uri
      })),
      total: data.tracks.total,
      limit: data.tracks.limit,
      offset: data.tracks.offset,
      hasMore: data.tracks.next !== null
    };
  }
  
  if (type === 'artist' && data.artists) {
    return {
      artists: data.artists.items.map(artist => ({
        id: artist.id,
        name: artist.name,
        image: artist.images[0]?.url,
        url: artist.external_urls.spotify,
        followers: artist.followers.total,
        popularity: artist.popularity,
        genres: artist.genres
      })),
      total: data.artists.total,
      hasMore: data.artists.next !== null
    };
  }
  
  return { tracks: [], total: 0 };
}

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const { 
    q, 
    type = 'track', 
    limit = 50, 
    offset = 0,
    genre,
    year,
    yearRange,
    artist,
    album,
    tag,
    isrc,
    upc,
    includeExternal,
    popularity,
    explicit,
    sortBy
  } = req.query;
  
  if (!q || q.trim().length === 0) {
    return res.status(400).json({ 
      success: false, 
      error: 'Query parameter "q" is required' 
    });
  }
  
  // Build filters object
  const filters = {};
  if (genre) filters.genre = genre;
  if (year) filters.year = year;
  if (yearRange) filters.yearRange = yearRange;
  if (artist) filters.artist = artist;
  if (album) filters.album = album;
  if (tag) filters.tag = tag;
  if (isrc) filters.isrc = isrc;
  if (upc) filters.upc = upc;
  if (includeExternal === 'true') filters.includeExternal = true;
  if (popularity) filters.popularity = popularity;
  if (explicit !== undefined) filters.explicit = explicit === 'true';
  if (sortBy) filters.sortBy = sortBy;
  
  // Cache search results for 10 minutes
  const cacheKey = `search:${type}:${q}:${JSON.stringify(filters)}:${limit}:${offset}`;
  
  try {
    const cached = await kv.get(cacheKey);
    if (cached) {
      const data = typeof cached === 'string' ? JSON.parse(cached) : cached;
      return res.json({
        ...data,
        from_cache: true
      });
    }
  } catch (e) {
    console.log('Cache miss for search');
  }
  
  try {
    const results = await searchSpotify(
      q.trim(),
      type,
      parseInt(limit),
      parseInt(offset),
      filters
    );
    
    // Post-process results for client-side filtering
    let processedResults = { ...results };
    
    if (type === 'track' && processedResults.tracks) {
      // Filter by popularity if specified
      if (filters.popularity) {
        const [minPop, maxPop] = filters.popularity.split('-').map(Number);
        processedResults.tracks = processedResults.tracks.filter(track => {
          const pop = track.popularity || 0;
          return pop >= (minPop || 0) && pop <= (maxPop || 100);
        });
      }
      
      // Filter by explicit content if specified
      if (filters.explicit !== undefined) {
        processedResults.tracks = processedResults.tracks.filter(track => 
          track.explicit === filters.explicit
        );
      }
      
      // Sort results if specified
      if (filters.sortBy) {
        processedResults.tracks = sortTracks(processedResults.tracks, filters.sortBy);
      }
    }
    
    const response = {
      success: true,
      query: q,
      type: type,
      filters: filters,
      ...processedResults,
      from_cache: false,
      timestamp: new Date().toISOString()
    };
    
    // Cache for 10 minutes
    try {
      await kv.setex(cacheKey, 600, JSON.stringify(response));
    } catch (e) {
      console.error('Cache set error:', e);
    }
    
    res.json(response);
    
  } catch (error) {
    console.error('Search error:', error);
    
    // Provide fallback data even on error
    const fallbackResults = {
      ...FALLBACK_SEARCH_RESULTS,
      tracks: FALLBACK_SEARCH_RESULTS.tracks.slice(parseInt(offset), parseInt(offset) + parseInt(limit)),
      limit: parseInt(limit),
      offset: parseInt(offset)
    };
    
    res.json({
      success: true,
      query: q,
      type: type,
      filters: filters,
      ...fallbackResults,
      from_cache: false,
      from_fallback: true,
      timestamp: new Date().toISOString(),
      warning: 'Using fallback data due to service unavailability'
    });
  }
};

// Helper function to sort tracks
function sortTracks(tracks, sortBy) {
  switch (sortBy) {
    case 'popularity':
      return tracks.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    case 'popularity_asc':
      return tracks.sort((a, b) => (a.popularity || 0) - (b.popularity || 0));
    case 'name':
      return tracks.sort((a, b) => a.title.localeCompare(b.title));
    case 'artist':
      return tracks.sort((a, b) => a.primaryArtist.localeCompare(b.primaryArtist));
    case 'album':
      return tracks.sort((a, b) => a.album.localeCompare(b.album));
    case 'release_date':
      return tracks.sort((a, b) => new Date(b.releaseDate || 0) - new Date(a.releaseDate || 0));
    case 'duration':
      return tracks.sort((a, b) => (b.durationMs || 0) - (a.durationMs || 0));
    default:
      return tracks;
  }
}
