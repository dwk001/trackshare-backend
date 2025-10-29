// Share Link Generator API
// Generates unique TrackShare URLs and stores track metadata with all provider links

const crypto = require('crypto')

// In-memory store for share links (in production, use a database)
const shareLinks = new Map()

// Generate short ID for share links
function generateShortId() {
  return crypto.randomBytes(4).toString('hex')
}

// Generate all provider links for a track
function generateProviderLinks(track, providerData = {}) {
  const providers = ['spotify', 'apple_music', 'youtube_music', 'deezer', 'tidal', 'soundcloud']
  const links = {}
  
  providers.forEach(provider => {
    const trackData = providerData[provider]
    
    switch (provider) {
      case 'spotify':
        const spotifyId = trackData?.spotify?.id || track.spotify_url?.split('/').pop() || track.id
        links.spotify = {
          url: `https://open.spotify.com/track/${spotifyId}`,
          deepLink: `spotify:track:${spotifyId}`,
          searchUrl: `https://open.spotify.com/search/${encodeURIComponent(track.artist + ' ' + track.title)}`
        }
        break
        
      case 'apple_music':
        const appleId = trackData?.apple_music?.id || track.apple_music_url?.split('/').pop() || track.id
        links.apple_music = {
          url: `https://music.apple.com/us/album/${appleId}`,
          deepLink: `music://music.apple.com/album/${appleId}`,
          searchUrl: `https://music.apple.com/us/search?term=${encodeURIComponent(track.artist + ' ' + track.title)}`
        }
        break
        
      case 'youtube_music':
        const videoId = trackData?.youtube_music?.videoId || track.youtube_url?.split('v=')[1]?.split('&')[0] || track.id
        links.youtube_music = {
          url: `https://music.youtube.com/watch?v=${videoId}`,
          deepLink: `youtubemusic://watch?v=${videoId}`,
          searchUrl: `https://music.youtube.com/search?q=${encodeURIComponent(track.artist + ' ' + track.title)}`
        }
        break
        
      case 'deezer':
        const deezerId = trackData?.deezer?.id || track.id
        links.deezer = {
          url: `https://www.deezer.com/track/${deezerId}`,
          deepLink: `deezer://www.deezer.com/track/${deezerId}`,
          searchUrl: `https://www.deezer.com/search/${encodeURIComponent(track.artist + ' ' + track.title)}`
        }
        break
        
      case 'tidal':
        const tidalId = trackData?.tidal?.id || track.id
        links.tidal = {
          url: `https://tidal.com/browse/track/${tidalId}`,
          deepLink: `tidal://track/${tidalId}`,
          searchUrl: `https://tidal.com/search/${encodeURIComponent(track.artist + ' ' + track.title)}`
        }
        break
        
      case 'soundcloud':
        const soundcloudId = trackData?.soundcloud?.id || track.id
        const permalink = trackData?.soundcloud?.permalink_url?.split('/').pop() || track.id
        links.soundcloud = {
          url: `https://soundcloud.com/${permalink}`,
          deepLink: `soundcloud://sounds:${soundcloudId}`,
          searchUrl: `https://soundcloud.com/search/sounds?q=${encodeURIComponent(track.artist + ' ' + track.title)}`
        }
        break
    }
  })
  
  return links
}

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }
  
  try {
    if (req.method === 'POST') {
      // Generate new share link
      const { track, providerData } = req.body
      
      if (!track || !track.title || !track.artist) {
        return res.status(400).json({
          success: false,
          error: 'Track data is required'
        })
      }
      
      const shortId = generateShortId()
      const providerLinks = generateProviderLinks(track, providerData)
      
      const shareLink = {
        id: crypto.randomUUID(),
        shortId,
        trackId: track.id,
        trackTitle: track.title,
        trackArtist: track.artist,
        trackArtwork: track.artwork,
        providerLinks,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        clickCount: 0
      }
      
      // Store share link
      shareLinks.set(shortId, shareLink)
      
      res.json({
        success: true,
        data: {
          shortId: shareLink.shortId,
          url: `https://trackshare.online/t/${shareLink.shortId}`,
          expiresAt: shareLink.expiresAt
        }
      })
      
    } else if (req.method === 'GET') {
      // Get share link by short ID
      const { shortId } = req.query
      
      if (!shortId) {
        return res.status(400).json({
          success: false,
          error: 'Short ID is required'
        })
      }
      
      const shareLink = shareLinks.get(shortId)
      
      if (!shareLink) {
        return res.status(404).json({
          success: false,
          error: 'Share link not found'
        })
      }
      
      // Check if expired
      if (new Date(shareLink.expiresAt) < new Date()) {
        shareLinks.delete(shortId)
        return res.status(410).json({
          success: false,
          error: 'Share link has expired'
        })
      }
      
      // Increment click count
      shareLink.clickCount++
      shareLinks.set(shortId, shareLink)
      
      res.json({
        success: true,
        data: shareLink
      })
      
    } else {
      res.status(405).json({
        success: false,
        error: 'Method not allowed'
      })
    }
    
  } catch (error) {
    console.error('Share API error:', error)
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    })
  }
}



