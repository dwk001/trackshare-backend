# TrackShare Landing Page - Native App Priority Strategy

## Current Issues Analysis

### Problems Identified:
1. **Apple Music**: Not executing search in app consistently
2. **Spotify from YouTube**: Opening browser instead of app
3. **YouTube Music from YouTube**: Double-click issues, not going direct to video
4. **Inconsistent behavior**: Some services work, others don't

### Root Cause:
- Mixed strategies (some JS, some anchors) causing inconsistent behavior
- Not properly prioritizing native app URLs over web URLs
- URL schemes not properly formatted for each service

## Native App Priority Strategy

### Core Principle: **ALWAYS try native app first, web as fallback**

### Priority Chain for ALL Services:
1. **Native App URL Scheme** (try to open app directly)
2. **Web Fallback** (if app not available or fails)

## Service-Specific Implementation

### Spotify
- **Native**: `spotify://track/{id}` (direct track)
- **Search**: `spotify://search/{query}` (app search)
- **Web Fallback**: `https://open.spotify.com/track/{id}` or `https://open.spotify.com/search?q={query}`

### Apple Music
- **Native**: `music://music.apple.com/search?term={query}` (app search)
- **Web Fallback**: `https://music.apple.com/search?term={query}`

### YouTube Music
- **Native**: `youtubemusic://music.youtube.com/watch?v={id}` (direct video)
- **Search**: `youtubemusic://music.youtube.com/search?q={query}` (app search)
- **Web Fallback**: `https://music.youtube.com/watch?v={id}` or `https://music.youtube.com/search?q={query}`

## Implementation Plan

### Step 1: Backend URL Generation
Update `api/resolve.js` to generate proper native app URLs:

```javascript
const providers = [
  {
    name: 'spotify',
    displayName: 'Spotify',
    deepLink: trackInfo.type === 'spotify' 
      ? `spotify://track/${trackInfo.id}`  // Direct track
      : `spotify://search/${encodeURIComponent(title + ' ' + artist)}`, // App search
    webFallback: trackInfo.type === 'spotify'
      ? `https://open.spotify.com/track/${trackInfo.id}`
      : `https://open.spotify.com/search?q=${encodeURIComponent(title + ' ' + artist)}`,
    isAvailable: true
  },
  {
    name: 'apple_music',
    displayName: 'Apple Music',
    deepLink: `music://music.apple.com/search?term=${encodeURIComponent(title + ' ' + artist)}`,
    webFallback: `https://music.apple.com/search?term=${encodeURIComponent(title + ' ' + artist)}`,
    isAvailable: true
  },
  {
    name: 'youtube_music',
    displayName: 'YouTube Music',
    deepLink: trackInfo.type === 'youtube'
      ? `youtubemusic://music.youtube.com/watch?v=${trackInfo.id}` // Direct video
      : `youtubemusic://music.youtube.com/search?q=${encodeURIComponent(title + ' ' + artist)}`, // App search
    webFallback: trackInfo.type === 'youtube'
      ? `https://music.youtube.com/watch?v=${trackInfo.id}`
      : `https://music.youtube.com/search?q=${encodeURIComponent(title + ' ' + artist)}`,
    isAvailable: true
  }
];
```

### Step 2: Frontend Implementation
Update `api/t.js` with unified JavaScript handler:

```javascript
function openProvider(provider, nativeUrl, webUrl) {
  // Prevent double-click
  event.target.disabled = true;
  event.target.style.opacity = '0.7';
  
  // Try native app first
  window.location.href = nativeUrl;
  
  // Fallback to web after delay
  setTimeout(() => {
    window.open(webUrl, '_blank');
  }, 800);
  
  // Re-enable button
  setTimeout(() => {
    event.target.disabled = false;
    event.target.style.opacity = '1';
  }, 1500);
}
```

### Step 3: Button Rendering
All buttons use JavaScript handlers with native URLs:

```javascript
<button class="provider-btn ${provider.name}" 
        onclick="openProvider('${provider.name}', '${provider.deepLink}', '${provider.webFallback}')">
  <svg>...</svg>
  Play on ${provider.displayName}
</button>
```

## Testing Matrix

### Spotify Sharing:
- [ ] Spotify button → Opens Spotify app to exact track
- [ ] Apple Music button → Opens Apple Music app with search
- [ ] YouTube Music button → Opens YouTube Music app with search

### YouTube Music Sharing:
- [ ] Spotify button → Opens Spotify app with search
- [ ] Apple Music button → Opens Apple Music app with search  
- [ ] YouTube Music button → Opens YouTube Music app to exact video

### Apple Music Sharing:
- [ ] Spotify button → Opens Spotify app with search
- [ ] Apple Music button → Opens Apple Music app with search
- [ ] YouTube Music button → Opens YouTube Music app with search

## Success Criteria

1. **Native App Priority**: All buttons try to open native apps first
2. **Deep Link Support**: Direct tracks/videos when available from source
3. **Search Fallback**: App search when direct link not available
4. **Web Fallback**: Web versions if apps not installed
5. **No Double-Click**: Single click always works
6. **Consistent Behavior**: All services work the same way

## Implementation Steps

1. **Update Backend**: Modify `api/resolve.js` to generate native URLs + web fallbacks
2. **Update Frontend**: Modify `api/t.js` to use unified JavaScript handler
3. **Test Each Service**: Verify native app opening for all combinations
4. **Deploy**: Push to GitHub, wait for Vercel redeploy
5. **Validate**: Test all sharing scenarios on device

## Key Changes from Current Implementation

- **Unified Strategy**: All services use JavaScript handlers (no mixed anchors/buttons)
- **Native First**: Always try native app URL schemes first
- **Proper URL Schemes**: Use correct formats for each service
- **Consistent Fallback**: Web fallback for all services
- **No Double-Click**: Prevent double-click with button disabling

This strategy ensures native app priority while maintaining reliable fallbacks.
