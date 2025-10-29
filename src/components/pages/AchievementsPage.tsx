import React from 'react'
import { motion } from 'framer-motion'
import { Award, Trophy, Star, Target, TrendingUp, Music, Heart, Share2, Users } from 'lucide-react'
import { cn } from '@utils'
import { useAuth } from '@hooks/useAuth'

interface Achievement {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  progress: number
  maxProgress: number
  unlocked: boolean
  category: 'music' | 'social' | 'sharing' | 'collection'
}

const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_track',
    title: 'First Discovery',
    description: 'Share your first track',
    icon: Music,
    progress: 0,
    maxProgress: 1,
    unlocked: false,
    category: 'sharing'
  },
  {
    id: 'music_lover',
    title: 'Music Lover',
    description: 'Share 10 tracks',
    icon: Heart,
    progress: 3,
    maxProgress: 10,
    unlocked: false,
    category: 'sharing'
  },
  {
    id: 'trendsetter',
    title: 'Trendsetter',
    description: 'Share 50 tracks',
    icon: TrendingUp,
    progress: 0,
    maxProgress: 50,
    unlocked: false,
    category: 'sharing'
  },
  {
    id: 'social_butterfly',
    title: 'Social Butterfly',
    description: 'Get 10 friends',
    icon: Users,
    progress: 2,
    maxProgress: 10,
    unlocked: false,
    category: 'social'
  },
  {
    id: 'popular',
    title: 'Popular',
    description: 'Get 100 followers',
    icon: Star,
    progress: 0,
    maxProgress: 100,
    unlocked: false,
    category: 'social'
  },
  {
    id: 'collector',
    title: 'Collector',
    description: 'Create 5 playlists',
    icon: Target,
    progress: 1,
    maxProgress: 5,
    unlocked: false,
    category: 'collection'
  }
]

export default function AchievementsPage() {
  const { isAuthenticated, user } = useAuth()

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <Award className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Sign In to View Achievements
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Create an account or sign in to track your achievements and unlock badges.
          </p>
          <button
            onClick={() => window.location.href = '/auth'}
            className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    )
  }

  const unlockedAchievements = ACHIEVEMENTS.filter(a => a.unlocked)
  const lockedAchievements = ACHIEVEMENTS.filter(a => !a.unlocked)
  const progressCount = ACHIEVEMENTS.filter(a => a.progress > 0 && !a.unlocked).length

  const categoryColors = {
    music: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    social: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
    sharing: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    collection: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Achievements
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track your progress and unlock badges as you use TrackShare
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <Trophy className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {unlockedAchievements.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Unlocked
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <Target className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {progressCount}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  In Progress
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <Award className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {ACHIEVEMENTS.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Total Available
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Unlocked Achievements */}
        {unlockedAchievements.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Unlocked Achievements
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {unlockedAchievements.map((achievement) => {
                const Icon = achievement.icon
                return (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border-2 border-primary-500 dark:border-primary-400"
                  >
                    <div className="flex items-start space-x-4">
                      <div className={cn(
                        "w-12 h-12 rounded-lg flex items-center justify-center",
                        categoryColors[achievement.category]
                      )}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                          {achievement.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {achievement.description}
                        </p>
                      </div>
                      <Trophy className="w-6 h-6 text-primary-500" />
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        )}

        {/* Locked Achievements */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Available Achievements
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lockedAchievements.map((achievement) => {
              const Icon = achievement.icon
              const progressPercent = (achievement.progress / achievement.maxProgress) * 100
              return (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700",
                    achievement.progress > 0 && "border-primary-300 dark:border-primary-700"
                  )}
                >
                  <div className="flex items-start space-x-4 mb-4">
                    <div className={cn(
                      "w-12 h-12 rounded-lg flex items-center justify-center opacity-50",
                      categoryColors[achievement.category]
                    )}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                        {achievement.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {achievement.description}
                      </p>
                    </div>
                  </div>
                  
                  {achievement.progress > 0 && (
                    <div>
                      <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                        <span>Progress</span>
                        <span>{achievement.progress} / {achievement.maxProgress}</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-primary-500 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(progressPercent, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

