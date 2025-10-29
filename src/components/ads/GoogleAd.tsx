import React, { useEffect, useState } from 'react'
import { cn } from '@utils'

interface GoogleAdProps {
  adSlot: string
  adFormat?: 'auto' | 'rectangle' | 'vertical' | 'horizontal'
  adStyle?: 'display' | 'in-article' | 'in-feed'
  className?: string
  responsive?: boolean
}

export default function GoogleAd({ 
  adSlot, 
  adFormat = 'auto', 
  adStyle = 'display',
  className,
  responsive = true 
}: GoogleAdProps) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Check if AdSense script is loaded
    const checkAdSense = () => {
      if (typeof window !== 'undefined' && (window as any).adsbygoogle) {
        setIsLoaded(true)
      } else {
        setTimeout(checkAdSense, 100)
      }
    }
    checkAdSense()
  }, [])

  useEffect(() => {
    if (isLoaded && isVisible) {
      try {
        // Push ad to adsbygoogle array
        ;((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({})
      } catch (error) {
        console.error('AdSense error:', error)
      }
    }
  }, [isLoaded, isVisible])

  // Intersection Observer to load ads when visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true)
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1 }
    )

    const adElement = document.getElementById(`ad-${adSlot}`)
    if (adElement) {
      observer.observe(adElement)
    }

    return () => observer.disconnect()
  }, [adSlot])

  return (
    <div 
      id={`ad-${adSlot}`}
      className={cn('ad-container', className)}
    >
      <ins
        className="adsbygoogle"
        style={{ 
          display: 'block',
          maxWidth: '100%',
          width: responsive ? '100%' : '300px',
          height: adFormat === 'rectangle' ? '250px' : 
                  adFormat === 'vertical' ? '600px' : 
                  adFormat === 'horizontal' ? '90px' : 'auto'
        }}
        data-ad-client="ca-pub-0132640408704261" // Your AdSense client ID
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive={responsive ? 'true' : 'false'}
      />
    </div>
  )
}

// Predefined ad components for common placements
export function HeaderAd({ className }: { className?: string }) {
  return (
    <GoogleAd
      adSlot="1234567890" // Replace with your actual ad slot
      adFormat="horizontal"
      className={cn('w-full max-w-728px mx-auto', className)}
    />
  )
}

export function SidebarAd({ className }: { className?: string }) {
  return (
    <GoogleAd
      adSlot="1234567891" // Replace with your actual ad slot
      adFormat="vertical"
      className={cn('w-full max-w-300px mx-auto', className)}
    />
  )
}

export function InFeedAd({ className }: { className?: string }) {
  return (
    <GoogleAd
      adSlot="1234567892" // Replace with your actual ad slot
      adFormat="rectangle"
      adStyle="in-feed"
      className={cn('w-full max-w-300px mx-auto my-4', className)}
    />
  )
}

export function FooterAd({ className }: { className?: string }) {
  return (
    <GoogleAd
      adSlot="1234567893" // Replace with your actual ad slot
      adFormat="horizontal"
      className={cn('w-full max-w-728px mx-auto', className)}
    />
  )
}

