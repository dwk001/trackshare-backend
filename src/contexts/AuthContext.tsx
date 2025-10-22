import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { apiService } from '@services/apiService'
import type { AuthUser, SignInData, SignUpData, ProfileData } from '@types'

interface AuthContextType {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  signIn: (data: SignInData) => Promise<void>
  signUp: (data: SignUpData) => Promise<void>
  signOut: () => Promise<void>
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

  // Check for existing authentication on mount
  useEffect(() => {
    checkExistingAuth()
  }, [])

  const checkExistingAuth = async () => {
    try {
      setIsLoading(true)
      const response = await apiService.getCurrentUser()
      if (response.user) {
        setUser(response.user)
      }
    } catch (error) {
      console.log('No existing authentication found')
      // Clear any invalid tokens
      localStorage.removeItem('auth_token')
    } finally {
      setIsLoading(false)
    }
  }

  const signIn = async (data: SignInData) => {
    try {
      const response = await apiService.signIn(data)
      if (response.user) {
        setUser(response.user)
        if (response.token) {
          localStorage.setItem('auth_token', response.token)
        }
      }
    } catch (error) {
      console.error('Sign in error:', error)
      throw error
    }
  }

  const signUp = async (data: SignUpData) => {
    try {
      const response = await apiService.signUp(data)
      if (response.user) {
        setUser(response.user)
        if (response.token) {
          localStorage.setItem('auth_token', response.token)
        }
      }
    } catch (error) {
      console.error('Sign up error:', error)
      throw error
    }
  }

  const signOut = async () => {
    try {
      await apiService.signOut()
    } catch (error) {
      console.error('Sign out error:', error)
    } finally {
      setUser(null)
      localStorage.removeItem('auth_token')
    }
  }

  const updateProfile = async (data: ProfileData) => {
    try {
      const response = await apiService.updateProfile(data)
      if (response.user) {
        setUser(response.user)
      }
    } catch (error) {
      console.error('Update profile error:', error)
      throw error
    }
  }

  const refreshUser = async () => {
    try {
      const response = await apiService.getCurrentUser()
      if (response.user) {
        setUser(response.user)
      }
    } catch (error) {
      console.error('Refresh user error:', error)
      // If refresh fails, sign out
      await signOut()
    }
  }

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    refreshUser,
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
