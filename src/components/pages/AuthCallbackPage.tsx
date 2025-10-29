import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@lib/supabase'
import LoadingSpinner from '@components/ui/LoadingSpinner'

export default function AuthCallbackPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Handle the OAuth callback
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth callback error:', error)
          navigate('/?error=auth_failed')
          return
        }

        if (data.session) {
          // Successfully authenticated, redirect to home
          navigate('/')
        } else {
          // No session, redirect to sign-in
          navigate('/signin')
        }
      } catch (error) {
        console.error('Auth callback error:', error)
        navigate('/?error=auth_failed')
      }
    }

    handleAuthCallback()
  }, [navigate])

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <h2 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
            Completing Sign In...
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Please wait while we complete your authentication.
          </p>
        </div>
      </div>
    </div>
  )
}


