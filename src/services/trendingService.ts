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
  'most-played': 'https://rss.appleMusicccharts.com/api/v2/us/songs/most-played/25/explicit.json',
  'most-played-clean': 'https://rss.appleMusicccharts.com/api/v2/us/songs/most-played/25/clean.json',
  'hot-tracks': 'https://rss.appleMusicccharts.com/api/v2/us/songs/hot-tracks/25/explicit.json',
  'hot-tracks-clean': 'https://rss.appleMusicccharts.com/api/v2/us/songs/hot-tracks/25/clean.json',
  'new-releases': 'https://rss.appleMusicccharts.com/api/v2/us/songs/new-releases/25/explicit.json',
  'new-releases-clean': 'https://rss.appleMusicccharts.com/api/v2/us/songs/new-releases/25/clean.json',
}

// Genre-specific charts
const GENRE_CHARTS = {
  'pop': 'https://rss.appleMusicccharts.com/api/v2/us/songs/pop/25/explicit.json',
  'rock': 'https://rss.appleMusicccharts.com/api/v2/us/songs/rock/25/explicit.json',
  'hip-hop': 'https://rss.appleMusicccharts.com/api/v2/us/songs/hip-hop/25/explicit.json',
  'electronic': 'https://rss.appleMusicccharts.com/api/v2/us/songs/electronic/25/explicit.json',
  'country': 'https://rss.appleMusicccharts.com/api/v2/us/songs/country/25/explicit.json',
  'jazz': 'https://rss.appleMusicccharts.com/api/v2/us/songs/jazz/25/explicit.json',
  'classical': 'https://rss.appleMusicccharts.com/api/v2/us/songs/classical/25/explicit.json',
}

// Fetch trending tracks from iTunes RSS
const fetchTrendingFromRSS = async (endpoint: string, genre: string = 'all'): Promise<TrendingTrack[]> => {
  try {
    const response = await fetch(endpoint)
    
    if (!response.ok) {
      throw new Error(`iTunes RSS error: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (!data.results || !Array.isArray(data.results)) {
      console.warn('Invalid RSS data structure:', data)
      return []
    }
    
    return data.results.map((track: any, index: number) => ({
      id: track.id || `trending-${index}`,
      title: track.name || track.title || 'Unknown Track',
      artist: track.artistName || track.artist || 'Unknown Artist',
      album: track.collectionName || track.album || 'Unknown Album',
      artwork: track.artworkUrl100?.replace('100x100', '300x300') || '',
      url: track.url || track.trackViewUrl || '#',
      previewUrl: track.previewUrl,
      duration: track.durationInMillis || track.duration,
      releaseDate: track.releaseDate,
      position: index + 1,
      genre: genre,
      provider: 'itunes' as const
    }))
  } catch (error) {
    console.error('Error fetching iTunes RSS:', error)
    throw error
  }
}

// Get trending tracks by genre
export const getTrendingTracks = async (genre: string = 'all', limit: number = 25): Promise<TrendingTrack[]> => {
  try {
    let endpoint: string
    
    if (genre === 'all') {
      // Use most-played chart for general trending
      endpoint = CHART_ENDPOINTS['most-played']
    } else if (genre in GENRE_CHARTS) {
      // Use genre-specific chart
      endpoint = GENRE_CHARTS[genre as keyof typeof GENRE_CHARTS]
    } else {
      // Fallback to most-played
      endpoint = CHART_ENDPOINTS['most-played']
    }
    
    console.log(`Fetching trending tracks for genre: ${genre}`)
    const tracks = await fetchTrendingFromRSS(endpoint, genre)
    
    // Limit results
    return tracks.slice(0, limit)
  } catch (error) {
    console.error('Error getting trending tracks:', error)
    
    // Return fallback data if RSS fails
    return getFallbackTrendingTracks(genre, limit)
  }
}

// Get hot tracks (alternative to most-played)
export const getHotTracks = async (limit: number = 25): Promise<TrendingTrack[]> => {
  try {
    const tracks = await fetchTrendingFromRSS(CHART_ENDPOINTS['hot-tracks'], 'hot')
    return tracks.slice(0, limit)
  } catch (error) {
    console.error('Error getting hot tracks:', error)
    return getFallbackTrendingTracks('hot', limit)
  }
}

// Get new releases
export const getNewReleases = async (limit: number = 25): Promise<TrendingTrack[]> => {
  try {
    const tracks = await fetchTrendingFromRSS(CHART_ENDPOINTS['new-releases'], 'new')
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
      artwork: 'https://via.placeholder.com/300x300/667eea/ffffff?text=Trending+1',
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
      artwork: 'https://via.placeholder.com/300x300/667eea/ffffff?text=Trending+2',
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
      artwork: 'https://via.placeholder.com/300x300/667eea/ffffff?text=Trending+3',
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
