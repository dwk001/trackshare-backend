import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, useLocation } from 'react-router-dom'
import { 
  Menu, 
  X, 
  Search, 
  Bell, 
  User, 
  Settings, 
  LogOut,
  Music,
  Users,
  Trophy,
  Calendar,
  BarChart3,
  TrendingUp,
  Moon,
  Sun
} from 'lucide-react'
import { cn } from '@utils'
import { useAuth } from '@hooks/useAuth'
import { useTheme } from '@contexts/ThemeContext'
import type { AuthUser } from '@types'

interface HeaderProps {
  className?: string
  onSearch?: (query: string) => void
  onFeedChange?: (feed: string) => void
  onAuthModalOpen?: (mode: 'signin' | 'signup' | 'profile') => void
}

const NAVIGATION_ITEMS = [
  { id: 'trending', label: 'Trending', icon: TrendingUp, path: '/', requiresAuth: false },
  { id: 'discovery', label: 'Discovery', icon: Music, path: '/discovery', requiresAuth: false },
  { id: 'friends', label: 'Friends', icon: Users, path: '/social', requiresAuth: true },
  { id: 'achievements', label: 'Achievements', icon: Trophy, path: '/achievements', requiresAuth: true },
  { id: 'events', label: 'Events', icon: Calendar, path: '/events', requiresAuth: false },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/analytics', requiresAuth: true },
]

export default function Header({ 
  className, 
  onSearch, 
  onFeedChange, 
  onAuthModalOpen 
}: HeaderProps) {
  const { user, isAuthenticated, signOut } = useAuth()
  const { isDarkMode, toggleDarkMode } = useTheme()
  const navigate = useNavigate()
  const [isHoveringProfile, setIsHoveringProfile] = useState(false)
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Determine active tab based on current route
  const getActiveTab = () => {
    const currentPath = location.pathname
    const activeItem = NAVIGATION_ITEMS.find(item => item.path === currentPath)
    return activeItem?.id || 'trending'
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // Detect if the search query is location-based
      const isLocationQuery = detectLocationQuery(searchQuery.trim())
      
      if (isLocationQuery) {
        // Navigate to events page with location filter
        navigate(`/events?location=${encodeURIComponent(searchQuery.trim())}`)
      } else {
        // Navigate to discovery page with music search query
        navigate(`/discovery?q=${encodeURIComponent(searchQuery.trim())}`)
      }
    }
    onSearch?.(searchQuery)
  }

  // Helper function to detect location-based queries
  const detectLocationQuery = (query: string): boolean => {
    const locationPatterns = [
      // ZIP codes (5 digits or 5+4 format)
      /^\d{5}(-\d{4})?$/,
      // City, State patterns
      /^[a-zA-Z\s]+,\s*[a-zA-Z\s]+$/,
      // State abbreviations
      /\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\b/i,
      // Common location keywords
      /\b(city|town|county|state|area|region|district|neighborhood|zip|postal)\b/i,
      // Specific city names (common ones)
      /\b(new york|los angeles|chicago|houston|phoenix|philadelphia|san antonio|san diego|dallas|san jose|austin|jacksonville|fort worth|columbus|charlotte|san francisco|indianapolis|seattle|denver|washington|boston|el paso|nashville|detroit|oklahoma city|portland|las vegas|memphis|louisville|baltimore|milwaukee|albuquerque|tucson|fresno|mesa|sacramento|kansas city|atlanta|long beach|colorado springs|raleigh|miami|virginia beach|omaha|oakland|minneapolis|tulsa|arlington|tampa|new orleans|wichita|cleveland|bakersfield|aurora|anaheim|honolulu|santa ana|corpus christi|riverside|lexington|stockton|toledo|st paul|newark|greensboro|plano|henderson|lincoln|buffalo|jersey city|chula vista|fort wayne|orlando|st petersburg|chandler|laredo|norfolk|durham|madison|lubbock|irvine|winston salem|glendale|garland|hialeah|reno|chesapeake|gilbert|baton rouge|irving|scottsdale|north las vegas|fremont|boise|richmond|san bernardino|birmingham|spokane|rochester|des moines|modesto|fayetteville|tacoma|oxnard|fontana|columbus|montgomery|moreno valley|shreveport|aurora|yonkers|akron|huntington beach|little rock|augusta|amarillo|mobile|columbus|grand rapids|salt lake city|tallahassee|huntsville|grand prairie|knoxville|worcester|newport news|brownsville|overland park|santa clarita|providence|garden grove|chattanooga|oceanside|jackson|fort lauderdale|santa rosa|rancho cucamonga|port st lucie|tempe|ontario|vancouver|sioux falls|springfield|peoria|pembroke pines|elk grove|salinas|palmdale|hollywood|lakewood|torrance|escondido|naperville|dayton|cary|west palm beach|midland|frisco|clearwater|pearland|richardson|pueblo|college station|palm bay|elgin|carrollton|west valley city|round rock|abilene|stamford|simi valley|concord|corona|lansing|thousand oaks|vallejo|palmdale|columbia|el cajon|antioch|provo|peoria|norman|berkeley|downey|costa mesa|inglewood|ventura|westminster|richmond|pompano beach|north charleston|everett|waterbury|west covina|billings|lowell|san mateo|daly city|citrus heights|santa monica|davie|boulder|compton|carson|salem|westminster|santa barbara|hawthorne|citrus heights|alhambra|livermore|new bedford|concord|south gate|green bay|san leandro|waukegan|fall river|chico|sparks|evansville|allen|miami gardens|olathe|norman|berkeley|downey|costa mesa|inglewood|ventura|westminster|richmond|pompano beach|north charleston|everett|waterbury|west covina|billings|lowell|san mateo|daly city|citrus heights|santa monica|davie|boulder|compton|carson|salem|westminster|santa barbara|hawthorne|citrus heights|alhambra|livermore|new bedford|concord|south gate|green bay|san leandro|waukegan|fall river|chico|sparks|evansville|allen|miami gardens|olathe)\b/i
    ]
    
    return locationPatterns.some(pattern => pattern.test(query))
  }

  const handleTabChange = (item: typeof NAVIGATION_ITEMS[0]) => {
    navigate(item.path)
    onFeedChange?.(item.id)
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      setIsUserMenuOpen(false)
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  return (
    <header className={cn('bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700', className)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center flex-shrink-0">
            <button
              onClick={() => navigate('/')}
              className="flex items-center hover:opacity-80 transition-opacity cursor-pointer focus:outline-none"
              aria-label="Go to home page"
            >
              <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                <Music className="w-5 h-5 text-white" />
              </div>
              <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">
                TrackShare
              </span>
            </button>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6 ml-8">
            {NAVIGATION_ITEMS.filter(item => !item.requiresAuth || isAuthenticated).map((item) => {
              const Icon = item.icon
              const isActive = getActiveTab() === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item)}
                  className={cn(
                    'flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] touch-manipulation',
                    isActive
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </nav>

          {/* Search Bar */}
          <div className="hidden md:block flex-1 max-w-lg mx-6">
            <form onSubmit={handleSearch} className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tracks, artists, events, or location (city, state, zip)..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </form>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4 flex-wrap">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors min-h-[44px] min-w-[44px] touch-manipulation cursor-pointer select-none"
              style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
              aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {/* Notifications */}
            <button 
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors relative min-h-[44px] min-w-[44px] touch-manipulation cursor-pointer select-none"
              style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* User Menu */}
            {isAuthenticated ? (
              <div className="relative" style={{ display: 'inline-block' }}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  onMouseEnter={() => setIsHoveringProfile(true)}
                  onMouseLeave={() => setIsHoveringProfile(false)}
                  className={cn(
                    "inline-flex items-center space-x-2 px-4 py-2 rounded-lg transition-all touch-manipulation cursor-pointer select-none relative",
                    "focus:outline-none",
                    "border-2",
                    "whitespace-nowrap",
                    isUserMenuOpen || isHoveringProfile
                      ? "bg-gray-50 dark:bg-gray-800 border-primary-500 dark:border-primary-400"
                      : "border-transparent hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-primary-500 dark:hover:border-primary-400"
                  )}
                  style={{ 
                    WebkitTouchCallout: 'none', 
                    WebkitUserSelect: 'none', 
                    userSelect: 'none'
                  }}
                >
                  <img
                    src={user?.avatar || '/placeholder-avatar.jpg'}
                    alt={user?.displayName}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <span className="hidden sm:block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {user?.displayName}
                  </span>
                </button>

                {/* User Dropdown */}
                {(isUserMenuOpen || isHoveringProfile) && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50"
                    onMouseEnter={() => setIsHoveringProfile(true)}
                    onMouseLeave={() => setIsHoveringProfile(false)}
                  >
                    {/* Profile Preview Section */}
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center space-x-3">
                        <img
                          src={user?.avatar || '/placeholder-avatar.jpg'}
                          alt={user?.displayName}
                          className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {user?.displayName}
                          </p>
                          {user?.email && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {user.email}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Menu Items */}
                    <div className="py-1">
                      <button
                        onClick={() => {
                          navigate('/profile')
                          setIsUserMenuOpen(false)
                          setIsHoveringProfile(false)
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors min-h-[44px] touch-manipulation cursor-pointer select-none"
                        style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
                      >
                        <User className="w-4 h-4 mr-3" />
                        Profile
                      </button>
                      <button
                        onClick={() => {
                          navigate('/settings')
                          setIsUserMenuOpen(false)
                          setIsHoveringProfile(false)
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors min-h-[44px] touch-manipulation cursor-pointer select-none"
                        style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
                      >
                        <Settings className="w-4 h-4 mr-3" />
                        Settings
                      </button>
                      <hr className="my-1 border-gray-200 dark:border-gray-700" />
                      <button
                        onClick={handleSignOut}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors min-h-[44px] touch-manipulation cursor-pointer select-none"
                        style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
                      >
                        <LogOut className="w-4 h-4 mr-3" />
                        Sign Out
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => navigate('/auth')}
                          className="px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors min-h-[44px] touch-manipulation cursor-pointer select-none"
                          style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
                        >
                          Get Started
                        </button>
                      </div>
                    )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors min-h-[44px] min-w-[44px] touch-manipulation cursor-pointer select-none"
              style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-gray-200 dark:border-gray-700 py-4"
          >
            {/* Mobile Search */}
            <div className="mb-4">
              <form onSubmit={handleSearch} className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tracks, artists, events, or location..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </form>
            </div>

            {/* Mobile Navigation */}
            <nav className="space-y-2">
              {NAVIGATION_ITEMS.filter(item => !item.requiresAuth || isAuthenticated).map((item) => {
                const Icon = item.icon
                const isActive = getActiveTab() === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      handleTabChange(item)
                      setIsMobileMenuOpen(false)
                    }}
                    className={cn(
                      'flex items-center space-x-3 w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] touch-manipulation',
                      isActive
                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                )
              })}
            </nav>

                    {/* Mobile Auth Actions */}
                    {!isAuthenticated && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                          onClick={() => {
                            navigate('/auth')
                            setIsMobileMenuOpen(false)
                          }}
                          className="w-full px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors"
                        >
                          Get Started
                        </button>
                      </div>
                    )}
          </motion.div>
        )}
      </div>

      {/* Click outside to close user menu (only when opened via click) */}
      {isUserMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setIsUserMenuOpen(false)
            setIsHoveringProfile(false)
          }}
        />
      )}
    </header>
  )
}