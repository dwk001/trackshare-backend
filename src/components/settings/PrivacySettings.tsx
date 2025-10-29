import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Shield, Eye, EyeOff, Lock, Globe, Users, Save } from 'lucide-react'
import { cn } from '@utils'
import { useAuth } from '@hooks/useAuth'

export default function PrivacySettings() {
  const { user } = useAuth()
  const [profileVisibility, setProfileVisibility] = useState<'public' | 'friends' | 'private'>('public')
  const [shareListeningHistory, setShareListeningHistory] = useState(true)
  const [showEmail, setShowEmail] = useState(false)
  const [allowFriendRequests, setAllowFriendRequests] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setIsSaving(true)
    // TODO: Implement actual save to Supabase
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsSaving(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Privacy Settings
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Control who can see your profile and activity
        </p>
      </div>

      {/* Profile Visibility */}
      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <Eye className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Profile Visibility
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Choose who can view your profile
              </p>
            </div>
          </div>
        </div>
        
        <div className="space-y-3 mt-4">
          <label className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <input
              type="radio"
              name="profileVisibility"
              value="public"
              checked={profileVisibility === 'public'}
              onChange={(e) => setProfileVisibility(e.target.value as 'public')}
              className="w-4 h-4 text-primary-500 focus:ring-primary-500"
            />
            <Globe className="w-5 h-5 text-gray-400" />
            <div className="flex-1">
              <div className="font-medium text-gray-900 dark:text-white">Public</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Anyone can view your profile</div>
            </div>
          </label>
          
          <label className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <input
              type="radio"
              name="profileVisibility"
              value="friends"
              checked={profileVisibility === 'friends'}
              onChange={(e) => setProfileVisibility(e.target.value as 'friends')}
              className="w-4 h-4 text-primary-500 focus:ring-primary-500"
            />
            <Users className="w-5 h-5 text-gray-400" />
            <div className="flex-1">
              <div className="font-medium text-gray-900 dark:text-white">Friends Only</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Only your friends can view your profile</div>
            </div>
          </label>
          
          <label className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <input
              type="radio"
              name="profileVisibility"
              value="private"
              checked={profileVisibility === 'private'}
              onChange={(e) => setProfileVisibility(e.target.value as 'private')}
              className="w-4 h-4 text-primary-500 focus:ring-primary-500"
            />
            <Lock className="w-5 h-5 text-gray-400" />
            <div className="flex-1">
              <div className="font-medium text-gray-900 dark:text-white">Private</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Your profile is hidden from everyone</div>
            </div>
          </label>
        </div>
      </div>

      {/* Data Sharing */}
      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Data Sharing
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Control what data is shared with others
              </p>
            </div>
          </div>
        </div>
        
        <div className="space-y-4 mt-4">
          <label className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer">
            <div className="flex items-center space-x-3">
              <Eye className="w-5 h-5 text-gray-400" />
              <div>
                <div className="font-medium text-gray-900 dark:text-white">Share Listening History</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Allow others to see what you're listening to</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={shareListeningHistory}
              onChange={(e) => setShareListeningHistory(e.target.checked)}
              className="w-5 h-5 text-primary-500 rounded focus:ring-primary-500"
            />
          </label>
          
          <label className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer">
            <div className="flex items-center space-x-3">
              <EyeOff className="w-5 h-5 text-gray-400" />
              <div>
                <div className="font-medium text-gray-900 dark:text-white">Show Email Address</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Display your email on your profile</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={showEmail}
              onChange={(e) => setShowEmail(e.target.checked)}
              className="w-5 h-5 text-primary-500 rounded focus:ring-primary-500"
            />
          </label>
          
          <label className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer">
            <div className="flex items-center space-x-3">
              <Users className="w-5 h-5 text-gray-400" />
              <div>
                <div className="font-medium text-gray-900 dark:text-white">Allow Friend Requests</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Let others send you friend requests</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={allowFriendRequests}
              onChange={(e) => setAllowFriendRequests(e.target.checked)}
              className="w-5 h-5 text-primary-500 rounded focus:ring-primary-500"
            />
          </label>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={cn(
            "flex items-center space-x-2 px-6 py-3 bg-primary-500 text-white rounded-lg font-semibold hover:bg-primary-600 transition-colors",
            isSaving && "opacity-50 cursor-not-allowed"
          )}
        >
          <Save className="w-5 h-5" />
          <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
        </button>
      </div>
    </div>
  )
}

