// Core types for TrackShare application

export interface AuthUser {
  id: string
  email: string
  name: string
  avatar?: string
  displayName?: string
  provider?: string
}

export interface SignInData {
  email: string
  password: string
}

export interface SignUpData {
  name: string
  email: string
  password: string
  confirmPassword: string
}

export interface ProfileData {
  name: string
  email: string
  avatar?: string
}

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  display_name?: string
  created_at: string
  updated_at: string
}

export interface Track {
  id: string
  title: string
  artist: string
  album?: string
  artwork?: string
  artworkMedium?: string
  artworkLarge?: string
  url: string
  spotify_url?: string
  apple_music_url?: string
  youtube_url?: string
  duration?: number
  popularity?: number
  explicit?: boolean
  genre?: string
  release_date?: string
}

export interface Post {
  id: string
  user_id: string
  track_id: string
  caption?: string
  created_at: string
  updated_at: string
  profiles?: {
    display_name: string
    avatar?: string
  }
  track_title: string
  track_artist: string
  track_artwork_url?: string
  track_spotify_url?: string
  is_liked?: boolean
  like_count?: number
  comment_count?: number
  share_count?: number
}

export interface Playlist {
  id: string
  name: string
  description?: string
  user_id: string
  tracks: Track[]
  created_at: string
  updated_at: string
  is_public: boolean
  track_count: number
}

export interface Comment {
  id: string
  post_id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string
  profiles?: {
    display_name: string
    avatar?: string
  }
}

export interface Notification {
  id: string
  user_id: string
  type: 'like' | 'comment' | 'follow' | 'share'
  message: string
  read: boolean
  created_at: string
  data?: Record<string, any>
}

export interface Friend {
  id: string
  user_id: string
  friend_id: string
  status: 'pending' | 'accepted' | 'blocked'
  created_at: string
  profiles?: {
    display_name: string
    avatar?: string
  }
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination?: {
    page: number
    limit: number
    total: number
    has_more: boolean
  }
}

// Auth types
export interface AuthState {
  isAuthenticated: boolean
  user: User | null
  token: string | null
  loading: boolean
  error: string | null
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface SignupCredentials {
  name: string
  email: string
  password: string
  confirmPassword: string
}

// UI State types
export interface UIState {
  theme: 'light' | 'dark' | 'system'
  sidebarOpen: boolean
  currentPage: string
  loading: boolean
  error: string | null
}

// Search types
export interface SearchFilters {
  genre?: string
  mood?: string
  timeFilter?: 'all' | 'today' | 'week' | 'month' | 'year'
  type?: 'trending' | 'recommendations' | 'new-releases'
}

export interface SearchResult {
  tracks: Track[]
  hasMore: boolean
  total: number
}

// PWA types
export interface PWAState {
  isInstalled: boolean
  isOnline: boolean
  deferredPrompt: any
  updateAvailable: boolean
}

// Form types
export interface FormState<T = any> {
  data: T
  errors: Record<string, string>
  isSubmitting: boolean
  isValid: boolean
}

// Component props types
export interface BaseComponentProps {
  className?: string
  children?: React.ReactNode
}

export interface ButtonProps extends BaseComponentProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
}

export interface ModalProps extends BaseComponentProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export interface InputProps extends BaseComponentProps {
  type?: 'text' | 'email' | 'password' | 'search'
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  error?: string
  disabled?: boolean
  required?: boolean
}

// Error types
export interface AppError {
  code: string
  message: string
  details?: any
  timestamp: string
}

// Event types
export interface TrackShareEvent {
  type: 'track_played' | 'track_shared' | 'post_liked' | 'user_followed'
  data: any
  timestamp: string
  user_id?: string
}

// Music Provider Integration Types
export interface MusicProvider {
  id: string
  name: 'spotify' | 'apple_music' | 'youtube_music' | 'deezer' | 'tidal' | 'soundcloud'
  displayName: string
  accessToken: string
  refreshToken?: string
  expiresAt: string
  scopes: string[]
  isConnected: boolean
  lastSynced?: string
  userId?: string
}

export interface ConnectedProvider {
  provider: MusicProvider['name']
  isConnected: boolean
  lastSynced?: string
  displayName: string
  icon: string
  color: string
}

export interface Collection {
  id: string
  name: string
  description?: string
  userId: string
  tracks: Track[]
  trackCount: number
  privacyLevel: 'private' | 'friends' | 'public'
  isFavorites: boolean
  createdAt: string
  updatedAt: string
  artwork?: string
}

export interface ActivityPost {
  id: string
  userId: string
  trackId: string
  trackTitle: string
  trackArtist: string
  trackArtwork?: string
  provider: MusicProvider['name']
  privacyLevel: 'private' | 'friends' | 'public'
  playedAt: string
  duration?: number
  caption?: string
  createdAt: string
  updatedAt: string
  profiles?: {
    displayName: string
    avatar?: string
  }
  isLiked?: boolean
  likeCount?: number
  commentCount?: number
  shareCount?: number
}

export interface PrivacySettings {
  userId: string
  autoPosting: 'off' | 'private' | 'friends' | 'public'
  postingFrequency: 'realtime' | 'batched' | 'daily'
  perProviderSettings: Record<MusicProvider['name'], {
    enabled: boolean
    privacyLevel: 'private' | 'friends' | 'public'
  }>
  excludedArtists: string[]
  excludedTracks: string[]
  createdAt: string
  updatedAt: string
}

export interface ShareableLink {
  id: string
  shortId: string
  trackId: string
  trackTitle: string
  trackArtist: string
  trackArtwork?: string
  providerLinks: Record<MusicProvider['name'], {
    url: string
    deepLink?: string
    searchUrl?: string
  }>
  createdAt: string
  expiresAt?: string
  clickCount: number
}

export interface DeepLink {
  provider: MusicProvider['name']
  nativeUrl: string
  webUrl: string
  searchUrl: string
  fallbackUrl: string
}

// Provider-specific track data
export interface ProviderTrackData {
  spotify?: {
    id: string
    uri: string
    external_urls: { spotify: string }
  }
  apple_music?: {
    id: string
    url: string
    preview_url?: string
  }
  youtube_music?: {
    videoId: string
    url: string
  }
  deezer?: {
    id: string
    link: string
  }
  tidal?: {
    id: string
    url: string
  }
  soundcloud?: {
    id: string
    permalink_url: string
  }
}

// Enhanced Track interface with provider data
export interface EnhancedTrack extends Track {
  providerData?: ProviderTrackData
  shareableLink?: ShareableLink
}
