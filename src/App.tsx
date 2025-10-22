import React, { Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { ErrorBoundary } from 'react-error-boundary'
import { motion } from 'framer-motion'

// Components
import Header from '@components/layout/Header'
import Footer from '@components/layout/Footer'
import LoadingSpinner from '@components/ui/LoadingSpinner'
import ErrorFallback from '@components/ui/ErrorFallback'

// Pages (lazy loaded for better performance)
const HomePage = React.lazy(() => import('@components/pages/HomePage'))
const DiscoveryPage = React.lazy(() => import('@components/pages/DiscoveryPage'))
const SocialPage = React.lazy(() => import('@components/pages/SocialPage'))
const ProfilePage = React.lazy(() => import('@components/pages/ProfilePage'))
const NotFoundPage = React.lazy(() => import('@components/pages/NotFoundPage'))

// Hooks
import { useAuth } from '@hooks/useAuth'
import { usePWA } from '@hooks/usePWA'

function App() {
  const { isAuthenticated, user } = useAuth()
  const { isOnline } = usePWA()

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 to-secondary-500">
      {/* Skip link for accessibility */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {/* Online/Offline status indicator */}
      <div className="fixed top-4 right-4 z-50">
        <div
          className={`px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm ${
            isOnline
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
          aria-live="polite"
        >
          {isOnline ? '🟢 Online' : '🔴 Offline'}
        </div>
      </div>

      {/* Screen reader announcements */}
      <div
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
        id="announcements"
      />

      {/* Main layout */}
      <div className="flex flex-col min-h-screen">
        <Header />

        <main id="main-content" className="flex-1">
          <ErrorBoundary
            FallbackComponent={ErrorFallback}
            onError={(error, errorInfo) => {
              console.error('App Error:', error, errorInfo)
            }}
          >
            <Suspense
              fallback={
                <div className="flex items-center justify-center min-h-[400px]">
                  <LoadingSpinner size="lg" />
                </div>
              }
            >
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/discovery" element={<DiscoveryPage />} />
                <Route path="/social" element={<SocialPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </main>

        <Footer />
      </div>

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
    </div>
  )
}

// PWA Install Prompt Component
function PWAInstallPrompt() {
  const { deferredPrompt, showInstallPrompt, hideInstallPrompt } = usePWA()

  if (!deferredPrompt) return null

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-6 right-6 z-50"
    >
      <div className="bg-white rounded-lg shadow-xl p-4 max-w-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">🎵</div>
            <div>
              <h3 className="font-semibold text-gray-900">Install TrackShare</h3>
              <p className="text-sm text-gray-600">
                Get the full app experience
              </p>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={hideInstallPrompt}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Close install prompt"
            >
              ✕
            </button>
            <button
              onClick={showInstallPrompt}
              className="bg-primary-500 text-white px-3 py-1 rounded text-sm font-medium hover:bg-primary-600 transition-colors"
            >
              Install
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default App
