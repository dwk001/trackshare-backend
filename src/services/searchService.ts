// Music search service using iTunes (primary) and Deezer (fallback) APIs
// Both APIs are free, require no authentication, and have generous rate limits

export interface Track {
  id: string | number
  title: string
  artist: string
  album: string
  artwork: string
  previewUrl?: string
  url: string
  duration?: number
  releaseDate?: string
  provider: 'itunes' | 'deezer'
}

// iTunes Search API (primary) - 28,800 requests/day, no auth
const searchItunes = async (query: string): Promise<Track[]> => {
  const response = await fetch(
    `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=20`
  )
  
  if (!response.ok) {
    throw new Error(`iTunes API error: ${response.status}`)
  }
  
  const data = await response.json()
  
  if (!data.results || data.results.length === 0) {
    return []
  }
  
  return data.results.map((track: any) => ({
    id: track.trackId,
    title: track.trackName,
    artist: track.artistName,
    album: track.collectionName,
    artwork: track.artworkUrl100?.replace('100x100', '300x300') || '',
    previewUrl: track.previewUrl,
    url: track.trackViewUrl,
    duration: track.trackTimeMillis,
    releaseDate: track.releaseDate,
    provider: 'itunes' as const
  }))
}

// Deezer API (fallback) - 864,000 requests/day, no auth
const searchDeezer = async (query: string): Promise<Track[]> => {
  const response = await fetch(
    `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=20`
  )
  
  if (!response.ok) {
    throw new Error(`Deezer API error: ${response.status}`)
  }
  
  const data = await response.json()
  
  if (!data.data || data.data.length === 0) {
    return []
  }
  
  return data.data.map((track: any) => ({
    id: track.id,
    title: track.title,
    artist: track.artist.name,
    album: track.album.title,
    artwork: track.album.cover_xl || track.album.cover_medium || '',
    previewUrl: track.preview,
    url: track.link,
    duration: track.duration ? track.duration * 1000 : undefined,
    releaseDate: track.release_date,
    provider: 'deezer' as const
  }))
}

// Main search function with automatic fallback
export const searchMusic = async (query: string): Promise<Track[]> => {
  if (!query.trim()) {
    return []
  }
  
  try {
    console.log('Searching iTunes for:', query)
    const results = await searchItunes(query)
    if (results.length > 0) {
      console.log(`Found ${results.length} tracks from iTunes`)
      return results
    }
  } catch (error) {
    console.warn('iTunes search failed:', error)
  }
  
  try {
    console.log('Falling back to Deezer for:', query)
    const results = await searchDeezer(query)
    console.log(`Found ${results.length} tracks from Deezer`)
    return results
  } catch (error) {
    console.error('Both search APIs failed:', error)
    throw new Error('Music search is temporarily unavailable. Please try again later.')
  }
}

// Search with specific provider
export const searchMusicWithProvider = async (
  query: string, 
  provider: 'itunes' | 'deezer'
): Promise<Track[]> => {
  if (!query.trim()) {
    return []
  }
  
  if (provider === 'itunes') {
    return searchItunes(query)
  } else {
    return searchDeezer(query)
  }
}

// Get track details by ID (useful for sharing)
export const getTrackDetails = async (id: string, provider: 'itunes' | 'deezer'): Promise<Track | null> => {
  try {
    if (provider === 'itunes') {
      const response = await fetch(`https://itunes.apple.com/lookup?id=${id}`)
      const data = await response.json()
      
      if (data.results && data.results.length > 0) {
        const track = data.results[0]
        return {
          id: track.trackId,
          title: track.trackName,
          artist: track.artistName,
          album: track.collectionName,
          artwork: track.artworkUrl100?.replace('100x100', '300x300') || '',
          previewUrl: track.previewUrl,
          url: track.trackViewUrl,
          duration: track.trackTimeMillis,
          releaseDate: track.releaseDate,
          provider: 'itunes'
        }
      }
    } else {
      const response = await fetch(`https://api.deezer.com/track/${id}`)
      const track = await response.json()
      
      if (track.id) {
        return {
          id: track.id,
          title: track.title,
          artist: track.artist.name,
          album: track.album.title,
          artwork: track.album.cover_xl || track.album.cover_medium || '',
          previewUrl: track.preview,
          url: track.link,
          duration: track.duration ? track.duration * 1000 : undefined,
          releaseDate: track.release_date,
          provider: 'deezer'
        }
      }
    }
  } catch (error) {
    console.error('Error fetching track details:', error)
  }
  
  return null
}
