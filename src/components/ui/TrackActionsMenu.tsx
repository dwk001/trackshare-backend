import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MoreHorizontal, Heart, Share2, Plus, Download, ExternalLink } from 'lucide-react'
import { cn } from '@utils'

interface TrackActionsMenuProps {
  track: {
    id: string
    title: string
    artist: string
    artwork?: string
    url: string
  }
  onLike?: () => void
  onShare?: () => void
  onAddToPlaylist?: () => void
  onDownload?: () => void
  onOpenOriginal?: () => void
  className?: string
}

export default function TrackActionsMenu({
  track,
  onLike,
  onShare,
  onAddToPlaylist,
  onDownload,
  onOpenOriginal,
  className
}: TrackActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleAction = (action: () => void) => {
    action()
    setIsOpen(false)
  }

  return (
    <div className={cn('relative', className)}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        aria-label="More options"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {/* Menu Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20 overflow-hidden"
            >
              <div className="py-2">
                {/* Track Info */}
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {track.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {track.artist}
                  </p>
                </div>

                {/* Actions */}
                <div className="py-1">
                  {onLike && (
                    <button
                      onClick={() => handleAction(onLike)}
                      className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Heart className="w-4 h-4 mr-3" />
                      Like Track
                    </button>
                  )}
                  
                  {onShare && (
                    <button
                      onClick={() => handleAction(onShare)}
                      className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Share2 className="w-4 h-4 mr-3" />
                      Share Track
                    </button>
                  )}
                  
                  {onAddToPlaylist && (
                    <button
                      onClick={() => handleAction(onAddToPlaylist)}
                      className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Plus className="w-4 h-4 mr-3" />
                      Add to Playlist
                    </button>
                  )}
                  
                  {onDownload && (
                    <button
                      onClick={() => handleAction(onDownload)}
                      className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Download className="w-4 h-4 mr-3" />
                      Download
                    </button>
                  )}
                  
                  {onOpenOriginal && (
                    <button
                      onClick={() => handleAction(onOpenOriginal)}
                      className="w-full flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4 mr-3" />
                      Open Original
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}



