// Music Provider OAuth Integration Service
import { apiService } from './apiService'
import type { MusicProvider, ConnectedProvider, MusicProvider as ProviderName } from '@types'

// Provider configuration
export const PROVIDER_CONFIG = {
  spotify: {
    name: 'spotify' as const,
    displayName: 'Spotify',
    icon: '🎵',
    color: '#1DB954',
    authUrl: 'https://accounts.spotify.com/authorize',
    tokenUrl: 'https://accounts.spotify.com/api/token',
    scopes: ['user-read-private', 'user-read-email', 'user-read-playback-state', 'user-modify-playback-state', 'user-read-currently-playing', 'user-read-recently-played'],
    clientId: process.env.VITE_SPOTIFY_CLIENT_ID,
  },
  apple_music: {
    name: 'apple_music' as const,
    displayName: 'Apple Music',
    icon: '🍎',
    color: '#FA243C',
    authUrl: 'https://appleid.apple.com/auth/authorize',
    tokenUrl: 'https://appleid.apple.com/auth/token',
    scopes: ['music'],
    clientId: process.env.VITE_APPLE_MUSIC_CLIENT_ID,
  },
  youtube_music: {
    name: 'youtube_music' as const,
    displayName: 'YouTube Music',
    icon: '📺',
    color: '#FF0000',
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/youtube.readonly'],
    clientId: process.env.VITE_YOUTUBE_CLIENT_ID,
  },
  deezer: {
    name: 'deezer' as const,
    displayName: 'Deezer',
    icon: '🎶',
    color: '#FF0000',
    authUrl: 'https://connect.deezer.com/oauth/auth.php',
    tokenUrl: 'https://connect.deezer.com/oauth/access_token.php',
    scopes: ['basic_access', 'email', 'offline_access'],
    clientId: process.env.VITE_DEEZER_CLIENT_ID,
  },
  tidal: {
    name: 'tidal' as const,
    displayName: 'Tidal',
    icon: '🌊',
    color: '#00FFFF',
    authUrl: 'https://auth.tidal.com/oauth2/authorize',
    tokenUrl: 'https://auth.tidal.com/oauth2/token',
    scopes: ['r_usr', 'w_usr'],
    clientId: process.env.VITE_TIDAL_CLIENT_ID,
  },
  soundcloud: {
    name: 'soundcloud' as const,
    displayName: 'SoundCloud',
    icon: '☁️',
    color: '#FF5500',
    authUrl: 'https://soundcloud.com/connect',
    tokenUrl: 'https://api.soundcloud.com/oauth2/token',
    scopes: ['non-expiring'],
    clientId: process.env.VITE_SOUNDCLOUD_CLIENT_ID,
  },
} as const

export type ProviderConfig = typeof PROVIDER_CONFIG[keyof typeof PROVIDER_CONFIG]

class ProviderService {
  private baseUrl = '/api/providers'

  /**
   * Initiate OAuth flow for a specific provider
   */
  async connectProvider(provider: ProviderName): Promise<void> {
    const config = PROVIDER_CONFIG[provider]
    if (!config.clientId) {
      throw new Error(`${config.displayName} OAuth not configured`)
    }

    const params = new URLSearchParams({
      client_id: config.clientId,
      response_type: 'code',
      redirect_uri: `${window.location.origin}/api/providers/callback/${provider}`,
      scope: config.scopes.join(' '),
      state: this.generateState(),
    })

    const authUrl = `${config.authUrl}?${params.toString()}`
    window.location.href = authUrl
  }

  /**
   * Get all connected providers for the current user
   */
  async getConnectedProviders(): Promise<ConnectedProvider[]> {
    try {
      const response = await apiService.get(`${this.baseUrl}/status`)
      return response.data || []
    } catch (error) {
      console.error('Error fetching connected providers:', error)
      return []
    }
  }

  /**
   * Disconnect a specific provider
   */
  async disconnectProvider(provider: ProviderName): Promise<void> {
    try {
      await apiService.post(`${this.baseUrl}/disconnect/${provider}`)
    } catch (error) {
      console.error(`Error disconnecting ${provider}:`, error)
      throw error
    }
  }

  /**
   * Refresh access token for a provider
   */
  async refreshToken(provider: ProviderName): Promise<MusicProvider> {
    try {
      const response = await apiService.post(`${this.baseUrl}/refresh/${provider}`)
      return response.data
    } catch (error) {
      console.error(`Error refreshing token for ${provider}:`, error)
      throw error
    }
  }

  /**
   * Get provider configuration
   */
  getProviderConfig(provider: ProviderName): ProviderConfig {
    return PROVIDER_CONFIG[provider]
  }

  /**
   * Get all available providers
   */
  getAllProviders(): ConnectedProvider[] {
    return Object.values(PROVIDER_CONFIG).map(config => ({
      provider: config.name,
      isConnected: false,
      displayName: config.displayName,
      icon: config.icon,
      color: config.color,
    }))
  }

  /**
   * Check if a provider is connected
   */
  async isProviderConnected(provider: ProviderName): Promise<boolean> {
    const connectedProviders = await this.getConnectedProviders()
    return connectedProviders.some(p => p.provider === provider && p.isConnected)
  }

  /**
   * Get primary connected provider (first connected provider)
   */
  async getPrimaryProvider(): Promise<ConnectedProvider | null> {
    const connectedProviders = await this.getConnectedProviders()
    return connectedProviders.find(p => p.isConnected) || null
  }

  /**
   * Generate random state for OAuth security
   */
  private generateState(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15)
  }

  /**
   * Handle OAuth callback (called by backend)
   */
  async handleCallback(provider: ProviderName, code: string, state: string): Promise<MusicProvider> {
    try {
      const response = await apiService.post(`${this.baseUrl}/callback/${provider}`, {
        code,
        state,
      })
      return response.data
    } catch (error) {
      console.error(`Error handling ${provider} callback:`, error)
      throw error
    }
  }

  /**
   * Get user's listening activity from connected providers
   */
  async getListeningActivity(provider: ProviderName, limit: number = 50): Promise<any[]> {
    try {
      const response = await apiService.get(`${this.baseUrl}/activity/${provider}?limit=${limit}`)
      return response.data || []
    } catch (error) {
      console.error(`Error fetching ${provider} activity:`, error)
      return []
    }
  }

  /**
   * Get user's playlists from connected providers
   */
  async getPlaylists(provider: ProviderName): Promise<any[]> {
    try {
      const response = await apiService.get(`${this.baseUrl}/playlists/${provider}`)
      return response.data || []
    } catch (error) {
      console.error(`Error fetching ${provider} playlists:`, error)
      return []
    }
  }

  /**
   * Get user's saved tracks from connected providers
   */
  async getSavedTracks(provider: ProviderName, limit: number = 50): Promise<any[]> {
    try {
      const response = await apiService.get(`${this.baseUrl}/saved-tracks/${provider}?limit=${limit}`)
      return response.data || []
    } catch (error) {
      console.error(`Error fetching ${provider} saved tracks:`, error)
      return []
    }
  }

  /**
   * Search for tracks on a specific provider
   */
  async searchTracks(provider: ProviderName, query: string, limit: number = 20): Promise<any[]> {
    try {
      const response = await apiService.get(`${this.baseUrl}/search/${provider}?q=${encodeURIComponent(query)}&limit=${limit}`)
      return response.data || []
    } catch (error) {
      console.error(`Error searching ${provider}:`, error)
      return []
    }
  }

  /**
   * Play a track on a specific provider
   */
  async playTrack(provider: ProviderName, trackId: string): Promise<void> {
    try {
      await apiService.post(`${this.baseUrl}/play/${provider}`, { trackId })
    } catch (error) {
      console.error(`Error playing track on ${provider}:`, error)
      throw error
    }
  }

  /**
   * Add track to user's library on a specific provider
   */
  async addToLibrary(provider: ProviderName, trackId: string): Promise<void> {
    try {
      await apiService.post(`${this.baseUrl}/library/${provider}`, { trackId })
    } catch (error) {
      console.error(`Error adding track to ${provider} library:`, error)
      throw error
    }
  }

  /**
   * Remove track from user's library on a specific provider
   */
  async removeFromLibrary(provider: ProviderName, trackId: string): Promise<void> {
    try {
      await apiService.delete(`${this.baseUrl}/library/${provider}/${trackId}`)
    } catch (error) {
      console.error(`Error removing track from ${provider} library:`, error)
      throw error
    }
  }
}

export const providerService = new ProviderService()
export default providerService



