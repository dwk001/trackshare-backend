import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Palette, Moon, Sun, Monitor, Save, Layout, Type } from 'lucide-react'
import { cn } from '@utils'
import { useTheme } from '@contexts/ThemeContext'
import { useAuth } from '@hooks/useAuth'

export default function AppearanceSettings() {
  const { theme, setTheme } = useTheme()
  const { user } = useAuth()
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium')
  const [compactMode, setCompactMode] = useState(false)
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
          Appearance Settings
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Customize the look and feel of TrackShare
        </p>
      </div>

      {/* Theme Selection */}
      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <Palette className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Theme
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Choose your preferred color scheme
              </p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 mt-4">
          <button
            onClick={() => setTheme('light')}
            className={cn(
              "p-4 rounded-lg border-2 transition-all flex flex-col items-center space-y-2",
              theme === 'light'
                ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
            )}
          >
            <Sun className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            <span className="font-medium text-sm text-gray-900 dark:text-white">Light</span>
          </button>
          
          <button
            onClick={() => setTheme('dark')}
            className={cn(
              "p-4 rounded-lg border-2 transition-all flex flex-col items-center space-y-2",
              theme === 'dark'
                ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
            )}
          >
            <Moon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            <span className="font-medium text-sm text-gray-900 dark:text-white">Dark</span>
          </button>
          
          <button
            onClick={() => setTheme('system')}
            className={cn(
              "p-4 rounded-lg border-2 transition-all flex flex-col items-center space-y-2",
              theme === 'system'
                ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
            )}
          >
            <Monitor className="w-6 h-6 text-gray-600 dark:text-gray-400" />
            <span className="font-medium text-sm text-gray-900 dark:text-white">System</span>
          </button>
        </div>
      </div>

      {/* Display Options */}
      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <Layout className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Display Options
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Adjust display preferences
              </p>
            </div>
          </div>
        </div>
        
        <div className="space-y-4 mt-4">
          <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center space-x-3">
                <Type className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Font Size</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Adjust the size of text throughout the app</div>
                </div>
              </div>
              <select
                value={fontSize}
                onChange={(e) => setFontSize(e.target.value as 'small' | 'medium' | 'large')}
                className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </label>
          </div>
          
          <label className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer">
            <div className="flex items-center space-x-3">
              <Layout className="w-5 h-5 text-gray-400" />
              <div>
                <div className="font-medium text-gray-900 dark:text-white">Compact Mode</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Reduce spacing for a more compact layout</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={compactMode}
              onChange={(e) => setCompactMode(e.target.checked)}
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

