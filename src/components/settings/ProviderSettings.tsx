import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import { 
  Music, 
  ExternalLink, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Settings,
  Link,
  Unlink
} from 'lucide-react'
import { cn } from '@utils'
import { useAuth } from '@hooks/useAuth'
import type { ConnectedProvider, MusicProvider } from '@types'

interface ProviderSettingsProps {
  className?: string
}

const PROVIDERS: Array<{
  id: MusicProvider['name']
  name: string
  icon: string
  color: string
  description: string
  features: string[]
  requiresSetup?: boolean
  setupNote?: string
}> = [
  {
    id: 'spotify',
    name: 'Spotify',
    icon: '🎵',
    color: '#1DB954',
    description: 'Connect your Spotify account to play tracks directly in Spotify',
    features: ['Play tracks', 'View playlists', 'Sync listening history']
  },
  // Apple Music requires Apple Developer Program ($99/year)
  // Temporarily hidden until credentials are configured
  // {
  //   id: 'apple_music',
  //   name: 'Apple Music',
  //   icon: '🍎',
  //   color: '#FA243C',
  //   description: 'Connect your Apple Music account for seamless playback',
  //   features: ['Play tracks', 'Access library', 'Sync playlists'],
  //   requiresSetup: true,
  //   setupNote: 'Requires Apple Developer Program membership ($99/year)'
  // },
  {
    id: 'youtube_music',
    name: 'YouTube Music',
    icon: '📺',
    color: '#FF0000',
    description: 'Link your YouTube Music for enhanced music discovery',
    features: ['Play tracks', 'View history', 'Access playlists']
  },
  {
    id: 'tidal',
    name: 'Tidal',
    icon: '🌊',
    color: '#00FFFF',
    description: 'Link Tidal for lossless audio quality',
    features: ['Play tracks', 'Access library', 'High-quality audio']
  },
  {
    id: 'soundcloud',
    name: 'SoundCloud',
    icon: '☁️',
    color: '#FF5500',
    description: 'Connect SoundCloud for independent and emerging artists',
    features: ['Play tracks', 'Discover new music', 'Access playlists']
  }
]

export default function ProviderSettings({ className }: ProviderSettingsProps) {
  const { user, isAuthenticated } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [connectedProviders, setConnectedProviders] = useState<ConnectedProvider[]>([])
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Load connected providers on mount and check for OAuth callbacks
  useEffect(() => {
    if (isAuthenticated) {
      loadConnectedProviders()
      
      // Check for OAuth callback parameters
      const providerConnected = searchParams.get('provider_connected')
      const success = searchParams.get('success')
      const oauthError = searchParams.get('error')
      
      if (providerConnected && success === 'true') {
        setSuccessMessage(`${providerConnected.charAt(0).toUpperCase() + providerConnected.slice(1)} connected successfully!`)
        // Reload providers
        loadConnectedProviders()
        // Clear URL params
        searchParams.delete('provider_connected')
        searchParams.delete('success')
        setSearchParams(searchParams, { replace: true })
        // Clear success message after 5 seconds
        setTimeout(() => setSuccessMessage(null), 5000)
      } else if (oauthError) {
        const errorReason = searchParams.get('reason') || searchParams.get('message') || 'Unknown error'
        setError(`Failed to connect: ${errorReason}`)
        // Clear URL params
        searchParams.delete('error')
        searchParams.delete('reason')
        searchParams.delete('message')
        searchParams.delete('provider')
        setSearchParams(searchParams, { replace: true })
      }
    }
  }, [isAuthenticated, searchParams, setSearchParams])

  const loadConnectedProviders = async () => {
    try {
      // Fetch connected providers from profile
      if (user?.id) {
        // Use Supabase to fetch profile with connected_providers
        const response = await fetch(`/api/profile?userId=${user.id}`)
        if (response.ok) {
          const data = await response.json()
          const connected = data.profile?.connected_providers || {}
          
          // Convert to ConnectedProvider format
          const providers: ConnectedProvider[] = Object.keys(connected)
            .filter(key => connected[key] === true)
            .map(providerId => ({
              provider: providerId as MusicProvider['name'],
              isConnected: true,
              displayName: PROVIDERS.find(p => p.id === providerId)?.name || providerId,
              icon: PROVIDERS.find(p => p.id === providerId)?.icon || '🎵',
              color: PROVIDERS.find(p => p.id === providerId)?.color || '#000000'
            }))
          
          setConnectedProviders(providers)
        }
      }
    } catch (error) {
      console.error('Failed to load connected providers:', error)
      // Don't set error if it's just a fetch failure
    }
  }

  const handleConnectProvider = async (providerId: MusicProvider['name']) => {
    if (!isAuthenticated) {
      setError('Please sign in to connect music providers')
      return
    }

    setLoading(prev => ({ ...prev, [providerId]: true }))
    setError(null)

    try {
      // Get user ID from auth context
      if (!user?.id) {
        throw new Error('User ID not available')
      }
      
      // Initiate OAuth flow with user ID
      const response = await fetch(`/api/providers/${providerId}/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: user.id }),
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error(`Failed to connect to ${providerId}`)
      }
      
      const data = await response.json()
      
      // Redirect to OAuth provider
      window.location.href = data.authUrl
    } catch (error) {
      console.error(`Failed to connect ${providerId}:`, error)
      setError(`Failed to connect to ${providerId}. Please try again.`)
    } finally {
      setLoading(prev => ({ ...prev, [providerId]: false }))
    }
  }

  const handleDisconnectProvider = async (providerId: MusicProvider['name']) => {
    setLoading(prev => ({ ...prev, [providerId]: true }))
    setError(null)

    try {
      // TODO: Replace with actual API call
      // await fetch(`/api/providers/${providerId}/disconnect`, { method: 'DELETE' })
      // await loadConnectedProviders()
      
      // Mock implementation for now
      console.log(`Disconnecting from ${providerId}...`)
      setError(`${providerId} disconnection not yet implemented`)
    } catch (error) {
      console.error(`Failed to disconnect ${providerId}:`, error)
      setError(`Failed to disconnect from ${providerId}`)
    } finally {
      setLoading(prev => ({ ...prev, [providerId]: false }))
    }
  }

  const isProviderConnected = (providerId: MusicProvider['name']) => {
    return connectedProviders.some(p => p.provider === providerId && p.isConnected)
  }

  const getConnectedProvider = (providerId: MusicProvider['name']) => {
    return connectedProviders.find(p => p.provider === providerId)
  }

  if (!isAuthenticated) {
    return (
      <div className={cn('text-center py-12', className)}>
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <Settings className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Sign in to connect music providers
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Connect your music streaming accounts to play tracks directly in your preferred apps
        </p>
        <button
          onClick={() => window.location.href = '/signin'}
          className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
        >
          Sign In
        </button>
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Music Providers
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Connect your music streaming accounts to play tracks directly in your preferred apps
        </p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4"
        >
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
            <p className="text-green-700 dark:text-green-400">{successMessage}</p>
          </div>
        </motion.div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center">
            <XCircle className="w-5 h-5 text-red-500 mr-2" />
            <p className="text-red-700 dark:text-red-400">{error}</p>
          </div>
        </div>
      )}

      {/* Providers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {PROVIDERS.map((provider) => {
          const isConnected = isProviderConnected(provider.id)
          const connectedProvider = getConnectedProvider(provider.id)
          const isLoading = loading[provider.id]

          return (
            <motion.div
              key={provider.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'bg-white dark:bg-gray-800 rounded-xl border-2 p-6 transition-all duration-200',
                isConnected 
                  ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              )}
            >
              {/* Provider Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                    style={{ backgroundColor: `${provider.color}20` }}
                  >
                    {provider.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {provider.name}
                    </h3>
                    {isConnected && (
                      <div className="flex items-center text-green-600 dark:text-green-400 text-sm">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Connected
                      </div>
                    )}
                  </div>
                </div>
                
                {isConnected && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {connectedProvider?.lastSynced && (
                      <div>Last synced: {new Date(connectedProvider.lastSynced).toLocaleDateString()}</div>
                    )}
                  </div>
                )}
              </div>

              {/* Description */}
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {provider.description}
              </p>

              {/* Features */}
              <div className="mb-6">
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  Features
                </h4>
                <div className="space-y-1">
                  {provider.features.map((feature, index) => (
                    <div key={index} className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2" />
                      {feature}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="flex space-x-2">
                {isConnected ? (
                  <>
                    <button
                      onClick={() => handleDisconnectProvider(provider.id)}
                      disabled={isLoading}
                      className="flex-1 flex items-center justify-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Unlink className="w-4 h-4 mr-2" />
                          Disconnect
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleConnectProvider(provider.id)}
                      disabled={isLoading}
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleConnectProvider(provider.id)}
                    disabled={isLoading}
                    className="flex-1 flex items-center justify-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Link className="w-4 h-4 mr-2" />
                        Connect
                      </>
                    )}
                  </button>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Help Text */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start">
          <Music className="w-5 h-5 text-blue-500 mr-3 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
              How it works
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              When you connect a music provider, TrackShare will automatically open tracks in your preferred app. 
              You can connect multiple providers and choose which one to use as your primary player.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

