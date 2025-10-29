import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@utils'

interface PageBannerProps {
  title: string
  subtitle?: string
  description?: string
  buttons?: {
    primary?: {
      text: string
      onClick: () => void
      className?: string
    }
    secondary?: {
      text: string
      onClick: () => void
      className?: string
    }
  }
  className?: string
  variant?: 'default' | 'trending' | 'discovery' | 'events'
}

export default function PageBanner({
  title,
  subtitle,
  description,
  buttons,
  className,
  variant = 'default'
}: PageBannerProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'trending':
        return {
          background: 'bg-gradient-to-br from-primary-500 to-secondary-500',
          titleColor: 'text-white',
          subtitleColor: 'text-yellow-400',
          descriptionColor: 'text-white/90',
          buttonPrimary: 'bg-white text-primary-600 hover:bg-gray-100',
          buttonSecondary: 'border-2 border-white text-white hover:bg-white hover:text-primary-600'
        }
      case 'discovery':
        return {
          background: 'bg-gradient-to-br from-blue-600 to-purple-600',
          titleColor: 'text-white',
          subtitleColor: 'text-blue-200',
          descriptionColor: 'text-white/90',
          buttonPrimary: 'bg-white text-blue-600 hover:bg-gray-100',
          buttonSecondary: 'border-2 border-white text-white hover:bg-white hover:text-blue-600'
        }
      case 'events':
        return {
          background: 'bg-gradient-to-br from-green-600 to-teal-600',
          titleColor: 'text-white',
          subtitleColor: 'text-green-200',
          descriptionColor: 'text-white/90',
          buttonPrimary: 'bg-white text-green-600 hover:bg-gray-100',
          buttonSecondary: 'border-2 border-white text-white hover:bg-white hover:text-green-600'
        }
      default:
        return {
          background: 'bg-gradient-to-br from-primary-500 to-secondary-500',
          titleColor: 'text-white',
          subtitleColor: 'text-yellow-400',
          descriptionColor: 'text-white/90',
          buttonPrimary: 'bg-white text-primary-600 hover:bg-gray-100',
          buttonSecondary: 'border-2 border-white text-white hover:bg-white hover:text-primary-600'
        }
    }
  }

  const styles = getVariantStyles()

  return (
    <div className={cn('relative overflow-hidden', styles.background, className)}>
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent transform -skew-y-12"></div>
        <div className="absolute inset-0 bg-gradient-to-l from-transparent via-white/5 to-transparent transform skew-y-12"></div>
      </div>

      {/* Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          {/* Title */}
          <h1 className={cn('text-4xl md:text-5xl lg:text-6xl font-bold mb-4', styles.titleColor)}>
            {title}
          </h1>

          {/* Subtitle */}
          {subtitle && (
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className={cn('text-2xl md:text-3xl font-semibold mb-6', styles.subtitleColor)}
            >
              {subtitle}
            </motion.h2>
          )}

          {/* Description */}
          {description && (
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className={cn('text-lg md:text-xl max-w-3xl mx-auto mb-8', styles.descriptionColor)}
            >
              {description}
            </motion.p>
          )}

          {/* Buttons */}
          {buttons && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              {buttons.primary && (
                <button
                  onClick={buttons.primary.onClick}
                  className={cn(
                    'px-8 py-3 font-semibold rounded-lg transition-colors min-h-[44px] touch-manipulation cursor-pointer select-none',
                    styles.buttonPrimary,
                    buttons.primary.className
                  )}
                  style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
                >
                  {buttons.primary.text}
                </button>
              )}
              {buttons.secondary && (
                <button
                  onClick={buttons.secondary.onClick}
                  className={cn(
                    'px-8 py-3 font-semibold rounded-lg transition-colors min-h-[44px] touch-manipulation cursor-pointer select-none',
                    styles.buttonSecondary,
                    buttons.secondary.className
                  )}
                  style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
                >
                  {buttons.secondary.text}
                </button>
              )}
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Floating Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-white/10"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              fontSize: `${Math.random() * 20 + 20}px`,
            }}
            animate={{
              y: [0, -20, 0],
              rotate: [0, 10, -10, 0],
            }}
            transition={{
              duration: 4 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          >
            ♪
          </motion.div>
        ))}
      </div>
    </div>
  )
}



