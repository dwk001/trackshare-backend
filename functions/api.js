// Cloudflare Workers API endpoints for TrackShare
// This replaces the Vercel serverless functions

// Fallback mock data for search
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

// Fallback mock data for trending
const FALLBACK_TRACKS = [
  {
    id: 'trending-fallback-1',
    title: 'Sample Trending Track 1',
    artist: 'Popular Artist',
    album: 'Hit Album',
    artwork: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjNjY3ZWVhIi8+CjxjaXJjbGUgY3g9IjE1MCIgY3k9IjE1MCIgcj0iNTAiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0xMjAgMTIwSDIwMFYxODBIMTIwVjEyMFoiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0xMjAgMTIwSDIwMFYxODBIMTIwVjEyMFoiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0xMjAgMTIwSDIwMFYxODBIMTIwVjEyMFoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo=',
    url: 'https://music.apple.com/us/album/sample-track/123456789',
    previewUrl: null,
    durationMs: 180000,
    releaseDate: '2024-01-01',
    position: 1,
    genre: 'pop',
    provider: 'itunes'
  },
  {
    id: 'trending-fallback-2',
    title: 'Sample Trending Track 2',
    artist: 'Chart Topper',
    album: 'Top Hits',
    artwork: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjNjY3ZWVhIi8+CjxjaXJjbGUgY3g9IjE1MCIgY3k9IjE1MCIgcj0iNTAiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0xMjAgMTIwSDIwMFYxODBIMTIwVjEyMFoiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0xMjAgMTIwSDIwMFYxODBIMTIwVjEyMFoiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0xMjAgMTIwSDIwMFYxODBIMTIwVjEyMFoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo=',
    url: 'https://music.apple.com/us/album/sample-track/987654321',
    previewUrl: null,
    durationMs: 200000,
    releaseDate: '2024-01-02',
    position: 2,
    genre: 'pop',
    provider: 'itunes'
  },
  {
    id: 'trending-fallback-3',
    title: 'Sample Trending Track 3',
    artist: 'Rising Star',
    album: 'New Wave',
    artwork: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjNjY3ZWVhIi8+CjxjaXJjbGUgY3g9IjE1MCIgY3k9IjE1MCIgcj0iNTAiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0xMjAgMTIwSDIwMFYxODBIMTIwVjEyMFoiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0xMjAgMTIwSDIwMFYxODBIMTIwVjEyMFoiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0xMjAgMTIwSDIwMFYxODBIMTIwVjEyMFoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo=',
    url: 'https://music.apple.com/us/album/sample-track/456789123',
    previewUrl: null,
    durationMs: 220000,
    releaseDate: '2024-01-03',
    position: 3,
    genre: 'pop',
    provider: 'itunes'
  }
];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Set CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
    
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: corsHeaders });
    }
    
    // Handle search API
    if (url.pathname === '/api/search') {
      const searchParams = url.searchParams;
      const q = searchParams.get('q');
      const limit = parseInt(searchParams.get('limit') || '10');
      const offset = parseInt(searchParams.get('offset') || '0');
      
      if (!q || !q.trim()) {
        return new Response(JSON.stringify({ error: 'Query parameter is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      const fallbackResults = {
        ...FALLBACK_SEARCH_RESULTS,
        tracks: FALLBACK_SEARCH_RESULTS.tracks.slice(offset, offset + limit),
        limit: limit,
        offset: offset
      };
      
      return new Response(JSON.stringify({
        success: true,
        query: q,
        type: 'track',
        filters: {},
        ...fallbackResults,
        from_cache: false,
        from_fallback: true,
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Handle trending API
    if (url.pathname === '/api/trending') {
      const searchParams = url.searchParams;
      const genre = searchParams.get('genre') || 'all';
      const limit = parseInt(searchParams.get('limit') || '25');
      const offset = parseInt(searchParams.get('offset') || '0');
      
      const startIndex = offset;
      const endIndex = startIndex + limit;
      const paginatedTracks = FALLBACK_TRACKS.slice(startIndex, endIndex);
      
      return new Response(JSON.stringify({
        success: true,
        tracks: paginatedTracks,
        genre: genre,
        total: FALLBACK_TRACKS.length,
        limit: limit,
        offset: offset,
        hasMore: endIndex < FALLBACK_TRACKS.length,
        from_cache: false,
        from_fallback: true,
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Handle other API routes
    if (url.pathname.startsWith('/api/')) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'API endpoint not implemented yet',
        path: url.pathname 
      }), {
        status: 501,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // For all other requests, return 404
    return new Response('Not Found', { status: 404, headers: corsHeaders });
  },
};
