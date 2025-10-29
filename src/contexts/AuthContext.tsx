import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase, transformSupabaseUser } from '@lib/supabase'
import type { AuthUser, SignInData, SignUpData, ProfileData } from '@types'

interface AuthContextType {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  signIn: (data: SignInData) => Promise<void>
  signUp: (data: SignUpData) => Promise<void>
  signOut: () => Promise<void>
  signInWithGoogle: () => Promise<void>
  signInWithApple: () => Promise<void>
  updateProfile: (data: ProfileData) => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const isAuthenticated = !!user

  // Listen for auth state changes
  useEffect(() => {
    // Check for test mode via URL parameter
    const urlParams = new URLSearchParams(window.location.search)
    const testMode = urlParams.get('test') === 'true'
    
    if (testMode) {
      console.log('🧪 Test mode enabled: Auto-signing in test user')
      const testUser = {
        id: 'test-user-123',
        email: 'test@trackshare.online',
        name: 'Test User',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
        displayName: 'Test User',
        provider: 'google'
      }
      
      setUser(testUser)
      setIsLoading(false)
      
      // Make test user available globally for manual control
      ;(window as any).testUser = {
        signOut: () => {
          console.log('🧪 Test user signed out')
          setUser(null)
        },
        signIn: () => {
          console.log('🧪 Test user signed in')
          setUser(testUser)
        },
        current: testUser
      }
      
      return
    }

    // Development-only: Auto-signin test user
    if (process.env.NODE_ENV === 'development') {
      console.log('🧪 Development mode: Auto-signing in test user')
      const testUser = {
        id: 'test-user-123',
        email: 'test@trackshare.online',
        name: 'Test User',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
        displayName: 'Test User',
        provider: 'google'
      }
      
      setUser(testUser)
      setIsLoading(false)
      
      // Make test user available globally for manual control
      ;(window as any).testUser = {
        signOut: () => {
          console.log('🧪 Test user signed out')
          setUser(null)
        },
        signIn: () => {
          console.log('🧪 Test user signed in')
          setUser(testUser)
        },
        current: testUser
      }
      
      return
    }

    // Production: Get initial Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(transformSupabaseUser(session.user))
      }
      setIsLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session) {
          setUser(transformSupabaseUser(session.user))
          
          // Create or update user profile in Supabase
          await createOrUpdateProfile(session.user)
        } else {
          setUser(null)
        }
        setIsLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Create or update user profile in Supabase profiles table
  const createOrUpdateProfile = async (user: any) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          display_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0],
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
          last_sign_in_at: new Date().toISOString()
        })
      
      if (error) {
        console.error('Error creating/updating profile:', error)
      }
    } catch (error) {
      console.error('Error creating/updating profile:', error)
    }
  }

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })
      
      if (error) {
        console.error('Google sign-in error:', error)
        throw error
      }
    } catch (error) {
      console.error('Google sign-in error:', error)
      throw error
    }
  }

  const signInWithApple = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })
      
      if (error) {
        console.error('Apple sign-in error:', error)
        throw error
      }
    } catch (error) {
      console.error('Apple sign-in error:', error)
      throw error
    }
  }

  const signIn = async (data: SignInData) => {
    // This is for email/password sign-in if needed in the future
    // For now, we only support OAuth
    throw new Error('Email/password sign-in not implemented. Please use Google or Apple sign-in.')
  }

  const signUp = async (data: SignUpData) => {
    // This is for email/password sign-up if needed in the future
    // For now, we only support OAuth
    throw new Error('Email/password sign-up not implemented. Please use Google or Apple sign-in.')
  }

  const signOut = async () => {
    try {
      // Check if we're using a test user (development only)
      if (process.env.NODE_ENV === 'development' && user?.id === 'test-user-123') {
        console.log('🧪 Signing out test user:', user.name)
        setUser(null)
        return
      }

      // Regular Supabase sign out
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Sign out error:', error)
        throw error
      }
    } catch (error) {
      console.error('Sign out error:', error)
      throw error
    }
  }

  const updateProfile = async (data: ProfileData) => {
    try {
      if (!user) throw new Error('No user logged in')
      
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: data.name,
          avatar_url: data.avatar
        })
        .eq('id', user.id)
      
      if (error) {
        console.error('Profile update error:', error)
        throw error
      }
      
      // Update local user state
      setUser(prev => prev ? { ...prev, name: data.name, displayName: data.name, avatar: data.avatar } : null)
    } catch (error) {
      console.error('Profile update error:', error)
      throw error
    }
  }

  const refreshUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setUser(transformSupabaseUser(session.user))
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error('Refresh user error:', error)
      setUser(null)
    }
  }

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    signInWithApple,
    updateProfile,
    refreshUser
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}