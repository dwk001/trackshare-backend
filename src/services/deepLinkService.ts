// Deep Link Service for Music Providers
import type { DeepLink, MusicProvider, Track, ProviderTrackData } from '@types'

// Deep link configurations for each provider
const DEEP_LINK_CONFIGS: Record<MusicProvider['name'], DeepLink> = {
  spotify: {
    provider: 'spotify',
    nativeUrl: 'spotify:track:{id}',
    webUrl: 'https://open.spotify.com/track/{id}',
    searchUrl: 'spotify:search:{query}',
    fallbackUrl: 'https://open.spotify.com/search/{query}',
  },
  apple_music: {
    provider: 'apple_music',
    nativeUrl: 'music://music.apple.com/album/{albumId}?i={trackId}',
    webUrl: 'https://music.apple.com/us/album/{albumId}?i={trackId}',
    searchUrl: 'music://music.apple.com/search?term={query}',
    fallbackUrl: 'https://music.apple.com/us/search?term={query}',
  },
  youtube_music: {
    provider: 'youtube_music',
    nativeUrl: 'youtubemusic://watch?v={videoId}',
    webUrl: 'https://music.youtube.com/watch?v={videoId}',
    searchUrl: 'youtubemusic://search?q={query}',
    fallbackUrl: 'https://music.youtube.com/search?q={query}',
  },
  deezer: {
    provider: 'deezer',
    nativeUrl: 'deezer://www.deezer.com/track/{id}',
    webUrl: 'https://www.deezer.com/track/{id}',
    searchUrl: 'deezer://search/{query}',
    fallbackUrl: 'https://www.deezer.com/search/{query}',
  },
  tidal: {
    provider: 'tidal',
    nativeUrl: 'tidal://track/{id}',
    webUrl: 'https://tidal.com/browse/track/{id}',
    searchUrl: 'tidal://search/{query}',
    fallbackUrl: 'https://tidal.com/search/{query}',
  },
  soundcloud: {
    provider: 'soundcloud',
    nativeUrl: 'soundcloud://sounds:{id}',
    webUrl: 'https://soundcloud.com/{permalink}',
    searchUrl: 'soundcloud://search/{query}',
    fallbackUrl: 'https://soundcloud.com/search/sounds?q={query}',
  },
}

class DeepLinkService {
  /**
   * Generate deep link for a track on a specific provider
   */
  generateTrackLink(track: Track, provider: MusicProvider['name'], providerData?: ProviderTrackData): {
    nativeUrl: string
    webUrl: string
    searchUrl: string
    fallbackUrl: string
  } {
    const config = DEEP_LINK_CONFIGS[provider]
    const trackData = providerData?.[provider]

    // Try to use provider-specific track ID if available
    let trackId = track.id
    let albumId = ''
    let videoId = ''
    let permalink = ''

    switch (provider) {
      case 'spotify':
        trackId = trackData?.spotify?.id || track.spotify_url?.split('/').pop() || track.id
        break
      case 'apple_music':
        trackId = trackData?.apple_music?.id || track.apple_music_url?.split('/').pop() || track.id
        albumId = trackData?.apple_music?.id || track.id // Use track ID as album ID fallback
        break
      case 'youtube_music':
        videoId = trackData?.youtube_music?.videoId || track.youtube_url?.split('v=')[1]?.split('&')[0] || track.id
        break
      case 'deezer':
        trackId = trackData?.deezer?.id || track.id
        break
      case 'tidal':
        trackId = trackData?.tidal?.id || track.id
        break
      case 'soundcloud':
        trackId = trackData?.soundcloud?.id || track.id
        permalink = trackData?.soundcloud?.permalink_url?.split('/').pop() || track.id
        break
    }

    // Generate URLs with proper replacements
    const nativeUrl = this.replacePlaceholders(config.nativeUrl, {
      id: trackId,
      albumId,
      videoId,
      permalink,
    })

    const webUrl = this.replacePlaceholders(config.webUrl, {
      id: trackId,
      albumId,
      videoId,
      permalink,
    })

    const searchUrl = this.replacePlaceholders(config.searchUrl, {
      query: encodeURIComponent(`${track.artist} ${track.title}`),
    })

    const fallbackUrl = this.replacePlaceholders(config.fallbackUrl, {
      query: encodeURIComponent(`${track.artist} ${track.title}`),
    })

    return {
      nativeUrl,
      webUrl,
      searchUrl,
      fallbackUrl,
    }
  }

  /**
   * Open track in provider with fallback strategy
   */
  async openInProvider(track: Track, provider: MusicProvider['name'], providerData?: ProviderTrackData): Promise<void> {
    const links = this.generateTrackLink(track, provider, providerData)
    
    try {
      // Try native deep link first
      await this.attemptDeepLink(links.nativeUrl)
      
      // If deep link fails, try web URL after delay
      setTimeout(() => {
        window.open(links.webUrl, '_blank')
      }, 800)
    } catch (error) {
      console.warn(`Deep link failed for ${provider}, falling back to web:`, error)
      window.open(links.webUrl, '_blank')
    }
  }

  /**
   * Attempt to open deep link
   */
  private async attemptDeepLink(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Create hidden iframe to attempt deep link
      const iframe = document.createElement('iframe')
      iframe.style.display = 'none'
      iframe.src = url
      
      document.body.appendChild(iframe)
      
      // Clean up after attempt
      setTimeout(() => {
        document.body.removeChild(iframe)
        resolve()
      }, 100)
      
      // Handle iframe load error (indicates deep link failed)
      iframe.onerror = () => {
        document.body.removeChild(iframe)
        reject(new Error('Deep link failed'))
      }
    })
  }

  /**
   * Open provider selection page for track
   */
  async openProviderSelection(track: Track, providerData?: ProviderTrackData): Promise<void> {
    // Generate TrackShare link and open selection page
    const shareLink = await this.generateShareLink(track, providerData)
    window.open(`/t/${shareLink.shortId}`, '_blank')
  }

  /**
   * Generate TrackShare link for a track
   */
  async generateShareLink(track: Track, providerData?: ProviderTrackData): Promise<{ shortId: string }> {
    try {
      const response = await fetch('/api/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          track,
          providerData,
        }),
      })
      
      const data = await response.json()
      return { shortId: data.shortId }
    } catch (error) {
      console.error('Error generating share link:', error)
      // Fallback: generate a simple share link
      const shortId = this.generateShortId()
      return { shortId }
    }
  }

  /**
   * Detect if a provider app is installed
   */
  async isProviderInstalled(provider: MusicProvider['name']): Promise<boolean> {
    const config = DEEP_LINK_CONFIGS[provider]
    
    try {
      // Try to open a test deep link
      await this.attemptDeepLink(config.searchUrl.replace('{query}', 'test'))
      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Get all available deep links for a track
   */
  getAllProviderLinks(track: Track, providerData?: ProviderTrackData): Record<MusicProvider['name'], {
    nativeUrl: string
    webUrl: string
    searchUrl: string
    fallbackUrl: string
  }> {
    const links: Record<string, any> = {}
    
    Object.keys(DEEP_LINK_CONFIGS).forEach(provider => {
      links[provider] = this.generateTrackLink(track, provider as MusicProvider['name'], providerData)
    })
    
    return links
  }

  /**
   * Replace placeholders in URL template
   */
  private replacePlaceholders(template: string, replacements: Record<string, string>): string {
    let result = template
    
    Object.entries(replacements).forEach(([key, value]) => {
      result = result.replace(`{${key}}`, value)
    })
    
    return result
  }

  /**
   * Generate short ID for share links
   */
  private generateShortId(): string {
    return Math.random().toString(36).substring(2, 8)
  }

  /**
   * Get provider display info
   */
  getProviderInfo(provider: MusicProvider['name']): {
    name: string
    displayName: string
    icon: string
    color: string
  } {
    const providerInfo = {
      spotify: { name: 'spotify', displayName: 'Spotify', icon: '🎵', color: '#1DB954' },
      apple_music: { name: 'apple_music', displayName: 'Apple Music', icon: '🍎', color: '#FA243C' },
      youtube_music: { name: 'youtube_music', displayName: 'YouTube Music', icon: '📺', color: '#FF0000' },
      deezer: { name: 'deezer', displayName: 'Deezer', icon: '🎶', color: '#FF0000' },
      tidal: { name: 'tidal', displayName: 'Tidal', icon: '🌊', color: '#00FFFF' },
      soundcloud: { name: 'soundcloud', displayName: 'SoundCloud', icon: '☁️', color: '#FF5500' },
    }
    
    return providerInfo[provider]
  }

  /**
   * Check if device supports deep linking
   */
  isDeepLinkSupported(): boolean {
    // Check if we're on mobile or if deep linking is supported
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    const hasCustomProtocols = 'navigator' in window && 'registerProtocolHandler' in navigator
    
    return isMobile || hasCustomProtocols
  }

  /**
   * Get recommended provider based on user agent
   */
  getRecommendedProvider(): MusicProvider['name'] {
    const userAgent = navigator.userAgent.toLowerCase()
    
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
      return 'apple_music'
    } else if (userAgent.includes('android')) {
      return 'spotify'
    } else {
      return 'spotify' // Default to Spotify for desktop
    }
  }
}

export const deepLinkService = new DeepLinkService()
export default deepLinkService



