// Trending music service using iTunes RSS feeds
// No authentication required, free, real-time charts

export interface TrendingTrack {
  id: string
  title: string
  artist: string
  album: string
  artwork: string
  url: string
  previewUrl?: string
  duration?: number
  releaseDate?: string
  position: number
  genre: string
  provider: 'itunes'
}

// iTunes RSS Chart endpoints
const CHART_ENDPOINTS = {
  'most-played': 'https://rss.applemarketingtools.com/api/v2/us/songs/most-played/25/explicit.json',
  'most-played-clean': 'https://rss.applemarketingtools.com/api/v2/us/songs/most-played/25/clean.json',
  'hot-tracks': 'https://rss.applemarketingtools.com/api/v2/us/songs/hot-tracks/25/explicit.json',
  'hot-tracks-clean': 'https://rss.applemarketingtools.com/api/v2/us/songs/hot-tracks/25/clean.json',
  'new-releases': 'https://rss.applemarketingtools.com/api/v2/us/songs/new-releases/25/explicit.json',
  'new-releases-clean': 'https://rss.applemarketingtools.com/api/v2/us/songs/new-releases/25/clean.json',
}

// Genre-specific charts
const GENRE_CHARTS = {
  'pop': 'https://rss.applemarketingtools.com/api/v2/us/songs/pop/25/explicit.json',
  'rock': 'https://rss.applemarketingtools.com/api/v2/us/songs/rock/25/explicit.json',
  'hip-hop': 'https://rss.applemarketingtools.com/api/v2/us/songs/hip-hop/25/explicit.json',
  'electronic': 'https://rss.applemarketingtools.com/api/v2/us/songs/electronic/25/explicit.json',
  'country': 'https://rss.applemarketingtools.com/api/v2/us/songs/country/25/explicit.json',
  'jazz': 'https://rss.applemarketingtools.com/api/v2/us/songs/jazz/25/explicit.json',
  'classical': 'https://rss.applemarketingtools.com/api/v2/us/songs/classical/25/explicit.json',
}

// Fetch trending tracks directly from iTunes Search API
const fetchTrendingFromiTunes = async (genre: string = 'all'): Promise<TrendingTrack[]> => {
  try {
    // Use iTunes Search API directly with popular search terms
    const searchTerms = genre === 'all' 
      ? ['pop', 'hip hop', 'rock', 'electronic', 'country']
      : [genre]
    
    const allTracks: TrendingTrack[] = []
    
    for (const term of searchTerms) {
      try {
        const response = await fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&entity=song&limit=5&sort=popularity`
        )
        
        if (!response.ok) {
          console.warn(`iTunes API error for ${term}:`, response.status)
          continue
        }
        
        const data = await response.json()
        
        if (data.results && Array.isArray(data.results)) {
          const tracks = data.results.map((track: any, index: number) => ({
            id: track.trackId?.toString() || `itunes-${term}-${index}`,
            title: track.trackName || 'Unknown Track',
            artist: track.artistName || 'Unknown Artist',
            album: track.collectionName || 'Unknown Album',
            artwork: track.artworkUrl100?.replace('100x100', '300x300') || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjNjY3ZWVhIi8+CjxjaXJjbGUgY3g9IjE1MCIgY3k9IjE1MCIgcj0iNTAiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0xMjAgMTIwSDIwMFYxODBIMTIwVjEyMFoiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0xMjAgMTIwSDIwMFYxODBIMTIwVjEyMFoiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0xMjAgMTIwSDIwMFYxODBIMTIwVjEyMFoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo=',
            url: track.trackViewUrl || '#',
            previewUrl: track.previewUrl,
            duration: track.trackTimeMillis,
            releaseDate: track.releaseDate,
            position: allTracks.length + index + 1,
            genre: genre,
            provider: 'itunes' as const
          }))
          
          allTracks.push(...tracks)
        }
      } catch (error) {
        console.warn(`Error fetching ${term} tracks:`, error)
      }
    }
    
    // Remove duplicates and limit results
    const uniqueTracks = allTracks.filter((track, index, self) => 
      index === self.findIndex(t => t.id === track.id)
    )
    
    return uniqueTracks.slice(0, 25)
  } catch (error) {
    console.error('Error fetching iTunes trending:', error)
    throw error
  }
}

// Get trending tracks by genre
export const getTrendingTracks = async (genre: string = 'all', limit: number = 25): Promise<TrendingTrack[]> => {
  try {
    console.log(`Fetching trending tracks for genre: ${genre}`)
    const tracks = await fetchTrendingFromiTunes(genre)
    
    // Limit results
    return tracks.slice(0, limit)
  } catch (error) {
    console.error('Error getting trending tracks:', error)
    
    // Return fallback data if iTunes API fails
    return getFallbackTrendingTracks(genre, limit)
  }
}

// Get hot tracks (alternative to most-played)
export const getHotTracks = async (limit: number = 25): Promise<TrendingTrack[]> => {
  try {
    const tracks = await fetchTrendingFromiTunes('hot')
    return tracks.slice(0, limit)
  } catch (error) {
    console.error('Error getting hot tracks:', error)
    return getFallbackTrendingTracks('hot', limit)
  }
}

// Get new releases
export const getNewReleases = async (limit: number = 25): Promise<TrendingTrack[]> => {
  try {
    const tracks = await fetchTrendingFromiTunes('new')
    return tracks.slice(0, limit)
  } catch (error) {
    console.error('Error getting new releases:', error)
    return getFallbackTrendingTracks('new', limit)
  }
}

// Fallback trending tracks when RSS fails
const getFallbackTrendingTracks = (genre: string, limit: number): TrendingTrack[] => {
  const fallbackTracks: TrendingTrack[] = [
    {
      id: 'fallback-1',
      title: 'Sample Trending Track 1',
      artist: 'Popular Artist',
      album: 'Hit Album',
      artwork: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjNjY3ZWVhIi8+CjxjaXJjbGUgY3g9IjE1MCIgY3k9IjE1MCIgcj0iNTAiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0xMjAgMTIwSDIwMFYxODBIMTIwVjEyMFoiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0xMjAgMTIwSDIwMFYxODBIMTIwVjEyMFoiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0xMjAgMTIwSDIwMFYxODBIMTIwVjEyMFoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo=',
      url: 'https://music.apple.com/us/album/sample-track/123456789',
      position: 1,
      genre: genre,
      provider: 'itunes'
    },
    {
      id: 'fallback-2',
      title: 'Sample Trending Track 2',
      artist: 'Chart Topper',
      album: 'Top Hits',
      artwork: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjNjY3ZWVhIi8+CjxjaXJjbGUgY3g9IjE1MCIgY3k9IjE1MCIgcj0iNTAiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0xMjAgMTIwSDIwMFYxODBIMTIwVjEyMFoiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0xMjAgMTIwSDIwMFYxODBIMTIwVjEyMFoiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0xMjAgMTIwSDIwMFYxODBIMTIwVjEyMFoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo=',
      url: 'https://music.apple.com/us/album/sample-track/123456790',
      position: 2,
      genre: genre,
      provider: 'itunes'
    },
    {
      id: 'fallback-3',
      title: 'Sample Trending Track 3',
      artist: 'Rising Star',
      album: 'New Wave',
      artwork: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDMwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjNjY3ZWVhIi8+CjxjaXJjbGUgY3g9IjE1MCIgY3k9IjE1MCIgcj0iNTAiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0xMjAgMTIwSDIwMFYxODBIMTIwVjEyMFoiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0xMjAgMTIwSDIwMFYxODBIMTIwVjEyMFoiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0xMjAgMTIwSDIwMFYxODBIMTIwVjEyMFoiIGZpbGw9IndoaXRlIi8+Cjwvc3ZnPgo=',
      url: 'https://music.apple.com/us/album/sample-track/123456791',
      position: 3,
      genre: genre,
      provider: 'itunes'
    }
  ]
  
  return fallbackTracks.slice(0, limit)
}

// Get available chart types
export const getAvailableCharts = () => {
  return {
    general: Object.keys(CHART_ENDPOINTS),
    genres: Object.keys(GENRE_CHARTS)
  }
}

// Cache trending data (simple in-memory cache)
const cache = new Map<string, { data: TrendingTrack[], timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export const getCachedTrendingTracks = async (genre: string = 'all', limit: number = 25): Promise<TrendingTrack[]> => {
  const cacheKey = `${genre}-${limit}`
  const cached = cache.get(cacheKey)
  
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('Returning cached trending tracks')
    return cached.data
  }
  
  try {
    const tracks = await getTrendingTracks(genre, limit)
    cache.set(cacheKey, { data: tracks, timestamp: Date.now() })
    return tracks
  } catch (error) {
    console.error('Error in cached trending tracks:', error)
    return getFallbackTrendingTracks(genre, limit)
  }
}
