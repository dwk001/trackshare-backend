// ⚠️ VERCEL FUNCTION LIMIT WARNING ⚠️
// TrackShare is deployed on Vercel FREE plan with 12-function limit
// Current count: 12/12 functions (AT LIMIT)
// To add new functions: upgrade to Pro plan or consolidate existing ones

const { kv } = require('@vercel/kv');

// iTunes Search API - no authentication required
const ITUNES_SEARCH_BASE = 'https://itunes.apple.com/search';

// Fallback mock data for when iTunes API is unavailable
const FALLBACK_SEARCH_RESULTS = {
  tracks: [
    {
      id: 'search-fallback-1',
      title: 'Sample Search Result 1',
      artist: 'Sample Artist',
      primaryArtist: 'Sample Artist',
      artwork: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjNjY3ZWVhIi8+CjxjaXJjbGUgY3g9IjE1MCIgY3k9IjE1MCIgcj0iNTAiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0xMjAgMTIwSDIwMFYxODBIMTIwVjEyMFoiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0xMjAgMTIwSDIwMFYxODBIMTIwVjEyMFoiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0xMjAgMTIwSDIwMFYxODBIMTIwVjEyMFoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo=',
      artworkMedium: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjNjY3ZWVhIi8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjEwMCIgcj0iMzAiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik04MCA4MEgxMjBWMTIwSDgwVjgwWiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+Cg==',
      artworkSmall: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjNjY3ZWVhIi8+CjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjE1IiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNNDAgNDBINjBWODBINDBWNjBaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K',
      url: 'https://music.apple.com/us/album/sample-track/123456789',
      album: 'Sample Album',
      albumUrl: 'https://music.apple.com/us/album/sample-album/123456789',
      releaseDate: '2024-01-01',
      popularity: 85,
      previewUrl: null,
      durationMs: 180000,
      explicit: false,
      itunesUri: 'itunes:track:123456789',
      provider: 'itunes'
    },
    {
      id: 'search-fallback-2',
      title: 'Sample Search Result 2',
      artist: 'Sample Artist 2',
      primaryArtist: 'Sample Artist 2',
      artwork: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjNjY3ZWVhIi8+CjxjaXJjbGUgY3g9IjE1MCIgY3k9IjE1MCIgcj0iNTAiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0xMjAgMTIwSDIwMFYxODBIMTIwVjEyMFoiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0xMjAgMTIwSDIwMFYxODBIMTIwVjEyMFoiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0xMjAgMTIwSDIwMFYxODBIMTIwVjEyMFoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo=',
      artworkMedium: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjNjY3ZWVhIi8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjEwMCIgcj0iMzAiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik04MCA4MEgxMjBWMTIwSDgwVjgwWiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+Cg==',
      artworkSmall: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjNjY3ZWVhIi8+CjxjaXJjbGUgY3g9IjUwIiBjeT0iNTAiIHI9IjE1IiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNNDAgNDBINjBWODBINDBWNjBaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K',
      url: 'https://music.apple.com/us/album/sample-track/987654321',
      album: 'Sample Album 2',
      albumUrl: 'https://music.apple.com/us/album/sample-album/987654321',
      releaseDate: '2024-01-02',
      popularity: 78,
      previewUrl: null,
      durationMs: 200000,
      explicit: false,
      itunesUri: 'itunes:track:987654321',
      provider: 'itunes'
    }
  ],
  total: 2,
  limit: 20,
  offset: 0,
  hasMore: false
};

async function searchiTunes(query, type = 'track', limit = 20, offset = 0, filters = {}) {
  console.log(`Searching iTunes for: "${query}", type: ${type}, limit: ${limit}, offset: ${offset}`);
  
  try {
    // Build iTunes search URL
    const params = new URLSearchParams({
      term: query,
      media: 'music',
      entity: type === 'track' ? 'musicTrack' : type,
      limit: Math.min(limit, 200), // iTunes max limit is 200
      country: 'US'
    });
    
    const url = `${ITUNES_SEARCH_BASE}?${params}`;
    console.log('iTunes search URL:', url);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`iTunes API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.results || !Array.isArray(data.results)) {
      console.warn('Invalid iTunes search response:', data);
      return {
        tracks: [],
        total: 0,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: false
      };
    }
    
    // Transform iTunes results to our format
    const tracks = data.results.map((track, index) => ({
      id: track.trackId || `itunes-${index}`,
      title: track.trackName || 'Unknown Track',
      artist: track.artistName || 'Unknown Artist',
      primaryArtist: track.artistName || 'Unknown Artist',
      artwork: track.artworkUrl100?.replace('100x100', '300x300') || '',
      artworkMedium: track.artworkUrl100?.replace('100x100', '200x200') || '',
      artworkSmall: track.artworkUrl100 || '',
      url: track.trackViewUrl || '#',
      album: track.collectionName || 'Unknown Album',
      albumUrl: track.collectionViewUrl || '#',
      releaseDate: track.releaseDate,
      popularity: Math.max(0, 100 - index), // Higher position = higher popularity
      previewUrl: track.previewUrl,
      durationMs: track.trackTimeMillis,
      explicit: track.trackExplicitness === 'explicit',
      itunesUri: `itunes:track:${track.trackId}`,
      genre: track.primaryGenreName || 'Unknown'
    }));
    
    // Apply filters
    let filteredTracks = tracks;
    
    if (filters.genre) {
      filteredTracks = filteredTracks.filter(track => 
        track.genre.toLowerCase().includes(filters.genre.toLowerCase())
      );
    }
    
    if (filters.year) {
      filteredTracks = filteredTracks.filter(track => 
        track.releaseDate && track.releaseDate.startsWith(filters.year)
      );
    }
    
    if (filters.explicit !== undefined) {
      filteredTracks = filteredTracks.filter(track => 
        track.explicit === filters.explicit
      );
    }
    
    // Apply pagination
    const startIndex = parseInt(offset);
    const endIndex = startIndex + parseInt(limit);
    const paginatedTracks = filteredTracks.slice(startIndex, endIndex);
    
    console.log(`iTunes search returned ${paginatedTracks.length} tracks (${filteredTracks.length} total after filtering)`);
    
    return {
      tracks: paginatedTracks,
      total: filteredTracks.length,
      limit: parseInt(limit),
      offset: parseInt(offset),
      hasMore: endIndex < filteredTracks.length
    };
    
  } catch (error) {
    console.error('iTunes search error:', error.message);
    throw error;
  }
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
    explicit
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
  if (explicit !== undefined) filters.explicit = explicit === 'true';
  
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
    // For now, return fallback data immediately to test functionality
    console.log(`Search request for: "${q}", type: ${type}, limit: ${limit}, offset: ${offset}`);
    
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
      timestamp: new Date().toISOString()
    });
    
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
