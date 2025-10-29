// Test User Utility for Development
// This file provides a way to simulate authenticated users for testing purposes
// Only available in development mode

import { supabase } from '@/lib/supabase'

export interface TestUser {
  id: string
  email: string
  name: string
  avatar: string
  provider: string
}

// Predefined test users for development
export const TEST_USERS: TestUser[] = [
  {
    id: 'test-user-1',
    email: 'test@trackshare.online',
    name: 'Test User',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    provider: 'google'
  },
  {
    id: 'test-user-2',
    email: 'demo@trackshare.online',
    name: 'Demo User',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    provider: 'apple'
  }
]

// Function to simulate a Supabase session for testing
export function createTestSession(user: TestUser) {
  const mockSession = {
    access_token: `test-access-token-${user.id}`,
    refresh_token: `test-refresh-token-${user.id}`,
    expires_in: 3600,
    token_type: 'bearer',
    user: {
      id: user.id,
      email: user.email,
      user_metadata: {
        full_name: user.name,
        avatar_url: user.avatar
      },
      app_metadata: {
        provider: user.provider
      }
    }
  }

  // Store in localStorage with the correct Supabase key format
  const supabaseKey = 'sb-xlhneoxxvdjylinwdidm-auth-token'
  localStorage.setItem(supabaseKey, JSON.stringify(mockSession))

  // Trigger Supabase auth state change
  window.dispatchEvent(new CustomEvent('supabase:auth:change', {
    detail: { event: 'SIGNED_IN', session: mockSession }
  }))

  return mockSession
}

// Function to clear test session
export function clearTestSession() {
  const supabaseKey = 'sb-xlhneoxxvdjylinwdidm-auth-token'
  localStorage.removeItem(supabaseKey)
  
  window.dispatchEvent(new CustomEvent('supabase:auth:change', {
    detail: { event: 'SIGNED_OUT', session: null }
  }))
}

// Function to get current test user from localStorage
export function getCurrentTestUser(): TestUser | null {
  try {
    const supabaseKey = 'sb-xlhneoxxvdjylinwdidm-auth-token'
    const sessionData = localStorage.getItem(supabaseKey)
    
    if (!sessionData) return null
    
    const session = JSON.parse(sessionData)
    const user = session.user
    
    return {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || user.email,
      avatar: user.user_metadata?.avatar_url || '',
      provider: user.app_metadata?.provider || 'google'
    }
  } catch (error) {
    console.error('Error getting test user:', error)
    return null
  }
}

// Development-only function to automatically sign in a test user
export function autoSignInTestUser(userIndex: number = 0) {
  if (process.env.NODE_ENV !== 'development') {
    console.warn('Test user auto-signin is only available in development mode')
    return null
  }

  const user = TEST_USERS[userIndex]
  if (!user) {
    console.error(`Test user at index ${userIndex} not found`)
    return null
  }

  console.log(`🔐 Auto-signing in test user: ${user.name} (${user.email})`)
  return createTestSession(user)
}

// Make test user functions available globally in development
if (process.env.NODE_ENV === 'development') {
  (window as any).testUser = {
    signIn: autoSignInTestUser,
    signOut: clearTestSession,
    getCurrent: getCurrentTestUser,
    users: TEST_USERS
  }
  
  console.log('🧪 Test user utilities available:')
  console.log('- window.testUser.signIn(0) - Sign in as Test User')
  console.log('- window.testUser.signIn(1) - Sign in as Demo User')
  console.log('- window.testUser.signOut() - Sign out')
  console.log('- window.testUser.getCurrent() - Get current user')
  console.log('- window.testUser.users - List all test users')
}