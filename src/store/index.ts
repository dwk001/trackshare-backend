import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Track, Post, Playlist, Notification } from '@types'

// Auth Store
interface AuthState {
  isAuthenticated: boolean
  user: User | null
  token: string | null
  setAuth: (user: User, token: string) => void
  clearAuth: () => void
  updateUser: (user: Partial<User>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      token: null,
      setAuth: (user, token) => set({ isAuthenticated: true, user, token }),
      clearAuth: () => set({ isAuthenticated: false, user: null, token: null }),
      updateUser: (userData) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        })),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        token: state.token,
      }),
    }
  )
)

// UI Store
interface UIState {
  theme: 'light' | 'dark' | 'system'
  sidebarOpen: boolean
  currentPage: string
  loading: boolean
  error: string | null
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  setSidebarOpen: (open: boolean) => void
  setCurrentPage: (page: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'system',
      sidebarOpen: false,
      currentPage: 'home',
      loading: false,
      error: null,
      setTheme: (theme) => set({ theme }),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      setCurrentPage: (currentPage) => set({ currentPage }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({
        theme: state.theme,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
)

// Music Store
interface MusicState {
  currentTrack: Track | null
  isPlaying: boolean
  volume: number
  queue: Track[]
  currentIndex: number
  setCurrentTrack: (track: Track | null) => void
  setIsPlaying: (playing: boolean) => void
  setVolume: (volume: number) => void
  addToQueue: (tracks: Track[]) => void
  removeFromQueue: (index: number) => void
  clearQueue: () => void
  nextTrack: () => void
  previousTrack: () => void
}

export const useMusicStore = create<MusicState>()(
  persist(
    (set, get) => ({
      currentTrack: null,
      isPlaying: false,
      volume: 0.8,
      queue: [],
      currentIndex: 0,
      setCurrentTrack: (currentTrack) => set({ currentTrack }),
      setIsPlaying: (isPlaying) => set({ isPlaying }),
      setVolume: (volume) => set({ volume }),
      addToQueue: (tracks) =>
        set((state) => ({
          queue: [...state.queue, ...tracks],
        })),
      removeFromQueue: (index) =>
        set((state) => ({
          queue: state.queue.filter((_, i) => i !== index),
          currentIndex:
            index < state.currentIndex
              ? state.currentIndex - 1
              : state.currentIndex,
        })),
      clearQueue: () => set({ queue: [], currentIndex: 0 }),
      nextTrack: () =>
        set((state) => {
          const nextIndex = state.currentIndex + 1
          if (nextIndex < state.queue.length) {
            return {
              currentIndex: nextIndex,
              currentTrack: state.queue[nextIndex],
            }
          }
          return state
        }),
      previousTrack: () =>
        set((state) => {
          const prevIndex = state.currentIndex - 1
          if (prevIndex >= 0) {
            return {
              currentIndex: prevIndex,
              currentTrack: state.queue[prevIndex],
            }
          }
          return state
        }),
    }),
    {
      name: 'music-storage',
      partialize: (state) => ({
        volume: state.volume,
        queue: state.queue,
        currentIndex: state.currentIndex,
      }),
    }
  )
)

// Feed Store
interface FeedState {
  posts: Post[]
  loading: boolean
  error: string | null
  hasMore: boolean
  page: number
  setPosts: (posts: Post[]) => void
  addPosts: (posts: Post[]) => void
  updatePost: (postId: string, updates: Partial<Post>) => void
  removePost: (postId: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setHasMore: (hasMore: boolean) => void
  setPage: (page: number) => void
  reset: () => void
}

export const useFeedStore = create<FeedState>((set) => ({
  posts: [],
  loading: false,
  error: null,
  hasMore: true,
  page: 1,
  setPosts: (posts) => set({ posts }),
  addPosts: (posts) =>
    set((state) => ({
      posts: [...state.posts, ...posts],
    })),
  updatePost: (postId, updates) =>
    set((state) => ({
      posts: state.posts.map((post) =>
        post.id === postId ? { ...post, ...updates } : post
      ),
    })),
  removePost: (postId) =>
    set((state) => ({
      posts: state.posts.filter((post) => post.id !== postId),
    })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setHasMore: (hasMore) => set({ hasMore }),
  setPage: (page) => set({ page }),
  reset: () =>
    set({
      posts: [],
      loading: false,
      error: null,
      hasMore: true,
      page: 1,
    }),
}))

// Notifications Store
interface NotificationState {
  notifications: Notification[]
  unreadCount: number
  addNotification: (notification: Notification) => void
  markAsRead: (notificationId: string) => void
  markAllAsRead: () => void
  removeNotification: (notificationId: string) => void
  clearAll: () => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  addNotification: (notification) =>
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    })),
  markAsRead: (notificationId) =>
    set((state) => ({
      notifications: state.notifications.map((notification) =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),
  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((notification) => ({
        ...notification,
        read: true,
      })),
      unreadCount: 0,
    })),
  removeNotification: (notificationId) =>
    set((state) => ({
      notifications: state.notifications.filter(
        (notification) => notification.id !== notificationId
      ),
    })),
  clearAll: () => set({ notifications: [], unreadCount: 0 }),
}))

// Playlists Store
interface PlaylistState {
  playlists: Playlist[]
  currentPlaylist: Playlist | null
  loading: boolean
  error: string | null
  setPlaylists: (playlists: Playlist[]) => void
  addPlaylist: (playlist: Playlist) => void
  updatePlaylist: (playlistId: string, updates: Partial<Playlist>) => void
  removePlaylist: (playlistId: string) => void
  setCurrentPlaylist: (playlist: Playlist | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

export const usePlaylistStore = create<PlaylistState>((set) => ({
  playlists: [],
  currentPlaylist: null,
  loading: false,
  error: null,
  setPlaylists: (playlists) => set({ playlists }),
  addPlaylist: (playlist) =>
    set((state) => ({
      playlists: [...state.playlists, playlist],
    })),
  updatePlaylist: (playlistId, updates) =>
    set((state) => ({
      playlists: state.playlists.map((playlist) =>
        playlist.id === playlistId ? { ...playlist, ...updates } : playlist
      ),
    })),
  removePlaylist: (playlistId) =>
    set((state) => ({
      playlists: state.playlists.filter((playlist) => playlist.id !== playlistId),
    })),
  setCurrentPlaylist: (currentPlaylist) => set({ currentPlaylist }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}))

