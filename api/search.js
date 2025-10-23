// ⚠️ VERCEL FUNCTION LIMIT WARNING ⚠️
// TrackShare is deployed on Vercel FREE plan with 12-function limit
// Current count: 12/12 functions (AT LIMIT)
// To add new functions: upgrade to Pro plan or consolidate existing ones

// Simplified search function for free plan compatibility
// No external dependencies - returns static fallback data

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
  limit: 5,
  offset: 0,
  hasMore: false
};

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { q, type = 'track', limit = '10', offset = '0', genre, year, explicit } = req.query;
  
  if (!q || !q.trim()) {
    return res.status(400).json({ error: 'Query parameter is required' });
  }
  
  try {
    console.log(`Search request for: "${q}", type: ${type}, limit: ${limit}, offset: ${offset}`);
    
    // Return fallback data immediately
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
      filters: { genre, year, explicit },
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
      filters: { genre, year, explicit },
      ...fallbackResults,
      from_cache: false,
      from_fallback: true,
      timestamp: new Date().toISOString(),
      warning: 'Using fallback data due to service unavailability'
    });
  }
};