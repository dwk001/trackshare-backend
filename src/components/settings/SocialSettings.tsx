import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Users, UserPlus, Bell, Mail, Save, Search } from 'lucide-react'
import { cn } from '@utils'
import { useAuth } from '@hooks/useAuth'

export default function SocialSettings() {
  const { user } = useAuth()
  const [showActivityFeed, setShowActivityFeed] = useState(true)
  const [allowMessages, setAllowMessages] = useState(true)
  const [friendRequestNotifications, setFriendRequestNotifications] = useState(true)
  const [activityNotifications, setActivityNotifications] = useState(true)
  const [allowProfileDiscovery, setAllowProfileDiscovery] = useState(true)
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
          Social Settings
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your social connections and interactions
        </p>
      </div>

      {/* Activity Feed */}
      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Activity Feed
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Control what appears in your feed
              </p>
            </div>
          </div>
        </div>
        
        <div className="space-y-4 mt-4">
          <label className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer">
            <div className="flex items-center space-x-3">
              <Bell className="w-5 h-5 text-gray-400" />
              <div>
                <div className="font-medium text-gray-900 dark:text-white">Show Activity Feed</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Display your activity in the social feed</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={showActivityFeed}
              onChange={(e) => setShowActivityFeed(e.target.checked)}
              className="w-5 h-5 text-primary-500 rounded focus:ring-primary-500"
            />
          </label>
          
          <label className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer">
            <div className="flex items-center space-x-3">
              <Search className="w-5 h-5 text-gray-400" />
              <div>
                <div className="font-medium text-gray-900 dark:text-white">Allow Profile Discovery</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Let others find your profile through search</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={allowProfileDiscovery}
              onChange={(e) => setAllowProfileDiscovery(e.target.checked)}
              className="w-5 h-5 text-primary-500 rounded focus:ring-primary-500"
            />
          </label>
        </div>
      </div>

      {/* Messaging */}
      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <Mail className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Messaging
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Control who can message you
              </p>
            </div>
          </div>
        </div>
        
        <div className="space-y-4 mt-4">
          <label className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer">
            <div className="flex items-center space-x-3">
              <Mail className="w-5 h-5 text-gray-400" />
              <div>
                <div className="font-medium text-gray-900 dark:text-white">Allow Direct Messages</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Let friends send you private messages</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={allowMessages}
              onChange={(e) => setAllowMessages(e.target.checked)}
              className="w-5 h-5 text-primary-500 rounded focus:ring-primary-500"
            />
          </label>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <Bell className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Notifications
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Manage your social notifications
              </p>
            </div>
          </div>
        </div>
        
        <div className="space-y-4 mt-4">
          <label className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer">
            <div className="flex items-center space-x-3">
              <UserPlus className="w-5 h-5 text-gray-400" />
              <div>
                <div className="font-medium text-gray-900 dark:text-white">Friend Request Notifications</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Get notified when someone sends you a friend request</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={friendRequestNotifications}
              onChange={(e) => setFriendRequestNotifications(e.target.checked)}
              className="w-5 h-5 text-primary-500 rounded focus:ring-primary-500"
            />
          </label>
          
          <label className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer">
            <div className="flex items-center space-x-3">
              <Bell className="w-5 h-5 text-gray-400" />
              <div>
                <div className="font-medium text-gray-900 dark:text-white">Activity Notifications</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Get notified about friend activity</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={activityNotifications}
              onChange={(e) => setActivityNotifications(e.target.checked)}
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

