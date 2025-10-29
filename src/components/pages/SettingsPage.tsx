import React, { useState, Suspense } from 'react'
import { motion } from 'framer-motion'
import { 
  Settings as SettingsIcon, 
  Music, 
  Shield, 
  Users,
  Bell,
  Palette
} from 'lucide-react'
import { cn } from '@utils'
import { useAuth } from '@hooks/useAuth'
import ProviderSettings from '@components/settings/ProviderSettings'
import LoadingSpinner from '@components/ui/LoadingSpinner'

interface SettingsPageProps {
  className?: string
}

const SETTINGS_SECTIONS = [
  {
    id: 'providers',
    title: 'Music Providers',
    description: 'Connect your music streaming accounts',
    icon: Music,
    component: ProviderSettings
  },
  {
    id: 'privacy',
    title: 'Privacy',
    description: 'Control your data and sharing preferences',
    icon: Shield,
    component: React.lazy(() => import('@components/settings/PrivacySettings'))
  },
  {
    id: 'social',
    title: 'Social',
    description: 'Manage friends and social interactions',
    icon: Users,
    component: React.lazy(() => import('@components/settings/SocialSettings'))
  },
  {
    id: 'notifications',
    title: 'Notifications',
    description: 'Configure notification preferences',
    icon: Bell,
    component: () => <div className="text-center py-12 text-gray-500">Notifications coming soon</div>
  },
  {
    id: 'appearance',
    title: 'Appearance',
    description: 'Customize the look and feel',
    icon: Palette,
    component: React.lazy(() => import('@components/settings/AppearanceSettings'))
  }
]

export default function SettingsPage({ className }: SettingsPageProps) {
  const { user, isAuthenticated } = useAuth()
  const [activeSection, setActiveSection] = useState('providers')

  if (!isAuthenticated) {
    return (
      <div className={cn('min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4', className)}>
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <SettingsIcon className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Sign in to access settings
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Connect your music providers and customize your TrackShare experience
          </p>
          <button
            onClick={() => window.location.href = '/signin'}
            className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    )
  }

  const activeSectionData = SETTINGS_SECTIONS.find(section => section.id === activeSection)
  const ActiveComponent = activeSectionData?.component

  return (
    <div className={cn('min-h-screen bg-gray-50 dark:bg-gray-900', className)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Settings Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Settings
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Manage your TrackShare preferences
                </p>
              </div>

              <nav className="space-y-2">
                {SETTINGS_SECTIONS.map((section) => {
                  const Icon = section.icon
                  const isActive = activeSection === section.id
                  
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={cn(
                        'w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors',
                        isActive
                          ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      <div>
                        <div className="font-medium">{section.title}</div>
                        <div className="text-xs opacity-75">{section.description}</div>
                      </div>
                    </button>
                  )
                })}
              </nav>
            </div>
          </div>

          {/* Settings Content */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Suspense fallback={<div className="flex items-center justify-center py-12"><LoadingSpinner /></div>}>
                  {ActiveComponent && <ActiveComponent />}
                </Suspense>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
