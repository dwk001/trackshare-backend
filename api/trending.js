// ⚠️ VERCEL FUNCTION LIMIT WARNING ⚠️
// TrackShare is deployed on Vercel FREE plan with 12-function limit
// Current count: 12/12 functions (AT LIMIT)
// To add new functions: upgrade to Pro plan or consolidate existing ones

// Simplified trending function for free plan compatibility
// No external dependencies - returns static fallback data

// Fallback mock data for trending tracks
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
  
  const { genre = 'all', limit = '25', offset = '0', refresh = 'false', seed = 'false' } = req.query;
  
  try {
    console.log(`Trending request for genre: ${genre}, limit: ${limit}, offset: ${offset}`);
    
    // Return fallback data immediately
    const startIndex = parseInt(offset);
    const endIndex = startIndex + parseInt(limit);
    const paginatedTracks = FALLBACK_TRACKS.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      tracks: paginatedTracks,
      genre: genre,
      total: FALLBACK_TRACKS.length,
      limit: parseInt(limit),
      offset: parseInt(offset),
      hasMore: endIndex < FALLBACK_TRACKS.length,
      from_cache: false,
      from_fallback: true,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Trending error:', error);
    
    // Provide fallback data even on error
    const startIndex = parseInt(offset);
    const endIndex = startIndex + parseInt(limit);
    const paginatedTracks = FALLBACK_TRACKS.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      tracks: paginatedTracks,
      genre: genre,
      total: FALLBACK_TRACKS.length,
      limit: parseInt(limit),
      offset: parseInt(offset),
      hasMore: endIndex < FALLBACK_TRACKS.length,
      from_cache: false,
      from_fallback: true,
      timestamp: new Date().toISOString(),
      warning: 'Using fallback data due to service unavailability'
    });
  }
};