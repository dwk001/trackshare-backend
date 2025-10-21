# TrackShare Deep Enhancement Plan
## Complete Social Music Platform - Detailed Implementation Guide

---

# Table of Contents
1. [User Experience Vision](#user-experience-vision)
2. [Information Architecture](#information-architecture)
3. [Phase 1: Homepage & Search](#phase-1-homepage--search)
4. [Phase 2: Feed Infrastructure](#phase-2-feed-infrastructure)
5. [Phase 3: Social Features](#phase-3-social-features)
6. [Phase 4: Privacy & Profiles](#phase-4-privacy--profiles)
7. [Technical Architecture](#technical-architecture)
8. [Database Schema Enhancements](#database-schema-enhancements)
9. [API Specifications](#api-specifications)
10. [Frontend Component Design](#frontend-component-design)
11. [Mobile Experience](#mobile-experience)
12. [Performance & Scaling](#performance--scaling)

---

# User Experience Vision

## Core User Journeys

### Journey 1: Anonymous Visitor → Discovery
```
1. Lands on trackshare.online
2. Sees beautiful feed of trending music posts
3. Posts show:
   - TrackShare Official avatar + badge
   - Track artwork (large, prominent)
   - Song title + artist
   - "🔥 Trending now!" caption
   - Play count, like count
   - "Play & Share" button
4. Clicks "Play & Share" on a track
   - Modal opens with platform options
   - Can listen immediately
5. Sees "Sign in to like, comment, and share your music" banner
6. Browses more trending posts
7. Decides to sign up
```

### Journey 2: New User → Onboarding
```
1. Clicks "Sign In" button
2. Google OAuth flow (smooth, fast)
3. Redirected back to site - NOW SIGNED IN
4. Welcome modal appears:
   "Welcome to TrackShare! 🎵
   
   Your music is private by default.
   Want to share what you're listening to?
   
   [Keep Private] [Share with Friends]"
5. User sees feed but now with:
   - Like/comment buttons active
   - "Post your music" button in nav
   - Toggle: "Trending" (active) | "Friends" (empty state)
6. User explores trending feed, likes a few posts
7. Clicks profile icon → Settings
8. Sees privacy controls clearly explained
```

### Journey 3: Active User → Sharing Music
```
1. User opens Spotify, finds a song
2. Clicks share button, pastes link in search
   OR
   User searches "taylor swift" in TrackShare
3. Search returns multiple results with artwork
4. Clicks "Play & Share" on a result
5. Modal: "Share this track with your friends?"
   [Caption: "This song is 🔥"]
   Privacy: [Friends Only ▼]
   [Cancel] [Post]
6. Posts to their feed
7. Notification: "Posted! Visible to friends"
8. Sees their post in "My Profile"
```

### Journey 4: Social User → Engaging with Friends
```
1. User switches to "Friends" tab
2. Sees posts from friends:
   - Friend's avatar + name
   - "listening to" or custom caption
   - Track artwork + details
   - 2 hours ago
   - ❤️ 5  💬 2  ▶️ Play
3. Clicks ❤️ to like
4. Clicks 💬 to view comments
   - Sees friend's comments
   - Types own comment: "Love this track!"
   - Posts comment
5. Clicks "Play" → Opens in their preferred app
6. Scrolls down, sees more friends' music
7. Infinite scroll loads more posts
```

### Journey 5: Discovery User → Finding New Music
```
1. User browses "Trending" tab
2. Filters by genre: "Hip-Hop"
3. Sees curated hip-hop tracks
4. Plays several tracks
5. Likes favorites
6. Checks "Saved" tab to find liked tracks later
7. Shares a track with friends
```

---

# Information Architecture

## Site Structure

```
trackshare.online/
├── / (Homepage - Feed or Trending based on auth state)
├── /profile/{userId} (User profile pages)
├── /settings (User settings & privacy)
├── /saved (Saved/liked tracks)
├── /friends (Friend management)
├── /t/{shortId} (Track share links - existing)
└── /search?q={query} (Search results page - optional)

API Structure:
/api/
├── /trending (Enhanced with genre filtering)
├── /search (NEW - Spotify search integration)
├── /feed (NEW - Social feed)
│   ├── ?view=trending
│   ├── ?view=friends
│   └── ?genre={genre}
├── /post (NEW - Create/update/delete posts)
│   ├── POST /create
│   ├── DELETE /{postId}
│   └── PUT /{postId}
├── /reactions (NEW - Like/unlike)
│   ├── POST /add
│   └── DELETE /remove
├── /comments (NEW - Comment management)
│   ├── GET /{postId}/comments
│   ├── POST /{postId}/comment
│   └── DELETE /{commentId}
├── /friends (NEW - Friendship)
│   ├── GET /list
│   ├── POST /request
│   ├── POST /accept
│   └── POST /decline
├── /profile (NEW - User profiles)
│   ├── GET /{userId}
│   └── PUT /update
└── /privacy (NEW - Privacy settings)
    ├── GET /settings
    └── PUT /settings
```

---

# Phase 1: Homepage & Search

## 1.1 Responsive Design System

### Breakpoints Strategy
```css
/* Mobile First Approach */

/* Extra Small (Mobile) - 320px to 575px */
@media (max-width: 575px) {
  .feed-container { 
    padding: 0.5rem; 
  }
  
  .feed-card {
    width: 100%;
    margin-bottom: 1rem;
  }
  
  .track-artwork {
    height: 300px; /* Full width square */
  }
  
  .genre-tabs {
    overflow-x: auto;
    white-space: nowrap;
    -webkit-overflow-scrolling: touch;
  }
  
  .tab {
    display: inline-block;
    min-width: 80px;
    font-size: 0.875rem;
  }
}

/* Small (Large Mobile) - 576px to 767px */
@media (min-width: 576px) and (max-width: 767px) {
  .music-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }
  
  .feed-card {
    max-width: 100%;
  }
}

/* Medium (Tablet) - 768px to 991px */
@media (min-width: 768px) and (max-width: 991px) {
  .music-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
  }
  
  .navbar {
    padding: 1rem 2rem;
  }
  
  .feed-container {
    max-width: 720px;
    margin: 0 auto;
  }
}

/* Large (Desktop) - 992px to 1199px */
@media (min-width: 992px) and (max-width: 1199px) {
  .music-grid {
    grid-template-columns: repeat(4, 1fr);
    gap: 2rem;
  }
  
  .feed-container {
    max-width: 960px;
    margin: 0 auto;
  }
  
  /* Two-column layout for feed + sidebar */
  .main-layout {
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: 2rem;
  }
}

/* Extra Large (Large Desktop) - 1200px+ */
@media (min-width: 1200px) {
  .music-grid {
    grid-template-columns: repeat(5, 1fr);
    gap: 2rem;
  }
  
  .feed-container {
    max-width: 1140px;
    margin: 0 auto;
  }
  
  .main-layout {
    display: grid;
    grid-template-columns: 300px 1fr 300px; /* sidebar, feed, recommendations */
    gap: 2rem;
    max-width: 1400px;
    margin: 0 auto;
  }
}
```

### Mobile-Specific Enhancements
```html
<!-- Add to <head> in index.html -->
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes">
<meta name="theme-color" content="#667eea">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">

<!-- Add touch-friendly navigation -->
<style>
/* Touch targets minimum 44x44px */
.btn, .tab, a {
  min-height: 44px;
  min-width: 44px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

/* Smooth scrolling on mobile */
html {
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
}

/* Pull-to-refresh indicator */
.ptr-indicator {
  position: fixed;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  padding: 1rem;
  background: white;
  border-radius: 0 0 12px 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  display: none;
}

.ptr-indicator.active {
  display: block;
  animation: slideDown 0.3s ease-out;
}
</style>
```

## 1.2 Genre Filtering - Deep Dive

### Spotify Playlist Mapping
```javascript
// api/trending.js - Enhanced version

const GENRE_PLAYLISTS = {
  all: [
    '37i9dQZF1DXcBWIGoYBM5M', // Today's Top Hits
    '37i9dQZF1DX0XUsuxWHRQd', // RapCaviar
    '37i9dQZF1DWXRqgorJj26U'  // Rock Classics
  ],
  pop: [
    '37i9dQZF1DXcBWIGoYBM5M', // Today's Top Hits
    '37i9dQZF1DX4JAvHpjipBk', // New Music Friday
    '37i9dQZF1DX10zKzsJ2jva'  // Summer Hits
  ],
  rock: [
    '37i9dQZF1DWXRqgorJj26U', // Rock Classics
    '37i9dQZF1DX3oM43CtKnRV', // Rock This
    '37i9dQZF1DWWwzidNQX6jx'  // All Out 2000s
  ],
  'hip-hop': [
    '37i9dQZF1DX0XUsuxWHRQd', // RapCaviar
    '37i9dQZF1DWY4xHQp97fN6', // Get Turnt
    '37i9dQZF1DX2RxBh64BHjQ'  // Feelin' Myself
  ],
  country: [
    '37i9dQZF1DX1lVhptIYRda', // Hot Country
    '37i9dQZF1DWZBCPUIUs2iR', // Country Gold
    '37i9dQZF1DX93D9SC7vVVB'  // Wild Country
  ],
  electronic: [
    '37i9dQZF1DX4dyzvuaRJ0n', // mint
    '37i9dQZF1DX6J5NfMJS675', // Dance Rising
    '37i9dQZF1DX8tZsk68tuDw'  // Electronic Circus
  ]
};

async function fetchGenreTracks(genre = 'all', limit = 20) {
  const accessToken = await getSpotifyAccessToken();
  const playlistIds = GENRE_PLAYLISTS[genre] || GENRE_PLAYLISTS.all;
  
  const allTracks = [];
  
  for (const playlistId of playlistIds) {
    try {
      const response = await fetch(
        `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=10`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );
      
      const data = await response.json();
      
      if (data && data.items) {
        const tracks = data.items
          .filter(item => item.track && !item.track.is_local)
          .map(item => ({
            id: item.track.id,
            title: item.track.name,
            artist: item.track.artists[0].name,
            artwork: item.track.album.images[0]?.url,
            url: item.track.external_urls.spotify,
            album: item.track.album.name,
            popularity: item.track.popularity,
            previewUrl: item.track.preview_url,
            durationMs: item.track.duration_ms,
            releaseDate: item.track.album.release_date,
            genre: genre
          }));
        
        allTracks.push(...tracks);
      }
    } catch (error) {
      console.error(`Error fetching playlist ${playlistId}:`, error);
    }
    
    if (allTracks.length >= limit) break;
  }
  
  // Shuffle and return requested number of tracks
  return shuffleArray(allTracks).slice(0, limit);
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Cache each genre separately with 24-hour expiration
module.exports = async (req, res) => {
  const { genre = 'all' } = req.query;
  
  // Check cache first
  try {
    const cached = await kv.get(`trending:music:${genre}`);
    if (cached) {
      const data = typeof cached === 'string' ? JSON.parse(cached) : cached;
      console.log(`Returning cached ${genre} music from:`, data.cached_at);
      return res.json({
        success: true,
        tracks: data.tracks,
        genre: genre,
        cached_at: data.cached_at,
        from_cache: true,
        timestamp: new Date().toISOString()
      });
    }
  } catch (kvError) {
    console.log('Cache miss, fetching fresh data');
  }
  
  // Fetch fresh data
  try {
    const tracks = await fetchGenreTracks(genre, 20);
    
    // Cache for 24 hours
    if (tracks.length > 0) {
      await kv.setex(`trending:music:${genre}`, 86400, JSON.stringify({
        tracks,
        cached_at: new Date().toISOString()
      }));
    }
    
    res.json({
      success: true,
      tracks,
      genre: genre,
      from_cache: false,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in trending endpoint:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
```

### Frontend Genre Switching
```javascript
// In index.html

let currentGenre = 'all';
let genreCache = {}; // Client-side cache for instant switching

async function switchGenre(genre) {
  currentGenre = genre;
  
  // Update tab visual state
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.remove('active');
  });
  document.querySelector(`[data-genre="${genre}"]`).classList.add('active');
  
  // Show loading state
  showLoadingIndicator();
  
  // Check client-side cache first
  if (genreCache[genre]) {
    displayTracks(genreCache[genre]);
    hideLoadingIndicator();
    return;
  }
  
  // Fetch from API
  try {
    const response = await fetch(`/api/trending?genre=${genre}`);
    const data = await response.json();
    
    if (data.success && data.tracks) {
      genreCache[genre] = data.tracks;
      displayTracks(data.tracks);
    } else {
      showError('Failed to load genre music');
    }
  } catch (error) {
    console.error('Genre fetch error:', error);
    showError('Network error');
  } finally {
    hideLoadingIndicator();
  }
}

function showLoadingIndicator() {
  const grid = document.getElementById('musicGrid');
  grid.innerHTML = `
    <div class="loading-spinner">
      <div class="spinner"></div>
      <p>Loading ${currentGenre} music...</p>
    </div>
  `;
}

function displayTracks(tracks) {
  const grid = document.getElementById('musicGrid');
  
  if (tracks.length === 0) {
    grid.innerHTML = '<div class="empty-state">No tracks found</div>';
    return;
  }
  
  grid.innerHTML = tracks.map(track => `
    <div class="track-card" data-track-id="${track.id}">
      <div class="track-artwork">
        <img src="${track.artwork}" 
             alt="${track.title}"
             loading="lazy"
             onerror="this.src='data:image/svg+xml,...fallback...'"
             onload="this.classList.add('loaded')">
        <div class="play-overlay">
          <button class="play-button" onclick="playTrack('${escapeJs(track.url)}', '${escapeJs(track.title)}', '${escapeJs(track.artist)}')">
            ▶️
          </button>
        </div>
      </div>
      <div class="track-info">
        <div class="track-title">${escapeHtml(track.title)}</div>
        <div class="track-artist">${escapeHtml(track.artist)}</div>
        ${track.popularity ? `<div class="track-popularity">${getPopularityBars(track.popularity)}</div>` : ''}
      </div>
      <button class="track-action-btn" onclick="playTrack('${escapeJs(track.url)}', '${escapeJs(track.title)}', '${escapeJs(track.artist)}')">
        Play & Share
      </button>
    </div>
  `).join('');
}

function getPopularityBars(popularity) {
  const bars = Math.ceil(popularity / 20); // 0-5 bars
  return '🔥'.repeat(bars);
}

function escapeJs(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
```

## 1.3 Advanced Search Implementation

### New Search Endpoint
```javascript
// api/search.js - NEW FILE

const { kv } = require('@vercel/kv');

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

async function getSpotifyAccessToken() {
  // Check cache first
  try {
    const cached = await kv.get('spotify:access_token');
    if (cached) return cached;
  } catch (e) {}
  
  const auth = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64');
  
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });
  
  const data = await response.json();
  
  // Cache for 55 minutes (tokens valid for 1 hour)
  if (data.access_token) {
    try {
      await kv.setex('spotify:access_token', 3300, data.access_token);
    } catch (e) {}
  }
  
  return data.access_token;
}

async function searchSpotify(query, type = 'track', limit = 20, offset = 0) {
  const accessToken = await getSpotifyAccessToken();
  
  const response = await fetch(
    `https://api.spotify.com/v1/search?` + new URLSearchParams({
      q: query,
      type: type,
      limit: limit.toString(),
      offset: offset.toString(),
      market: 'US'
    }),
    {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    }
  );
  
  if (!response.ok) {
    throw new Error(`Spotify API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (type === 'track' && data.tracks) {
    return {
      tracks: data.tracks.items.map(track => ({
        id: track.id,
        title: track.name,
        artist: track.artists.map(a => a.name).join(', '),
        primaryArtist: track.artists[0].name,
        artwork: track.album.images[0]?.url,
        artworkMedium: track.album.images[1]?.url,
        artworkSmall: track.album.images[2]?.url,
        url: track.external_urls.spotify,
        album: track.album.name,
        albumUrl: track.album.external_urls.spotify,
        releaseDate: track.album.release_date,
        popularity: track.popularity,
        previewUrl: track.preview_url,
        durationMs: track.duration_ms,
        explicit: track.explicit,
        spotifyUri: track.uri
      })),
      total: data.tracks.total,
      limit: data.tracks.limit,
      offset: data.tracks.offset,
      hasMore: data.tracks.next !== null
    };
  }
  
  if (type === 'artist' && data.artists) {
    return {
      artists: data.artists.items.map(artist => ({
        id: artist.id,
        name: artist.name,
        image: artist.images[0]?.url,
        url: artist.external_urls.spotify,
        followers: artist.followers.total,
        popularity: artist.popularity,
        genres: artist.genres
      })),
      total: data.artists.total,
      hasMore: data.artists.next !== null
    };
  }
  
  return { tracks: [], total: 0 };
}

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const { q, type = 'track', limit = 20, offset = 0 } = req.query;
  
  if (!q || q.trim().length === 0) {
    return res.status(400).json({ 
      success: false, 
      error: 'Query parameter "q" is required' 
    });
  }
  
  // Cache search results for 10 minutes
  const cacheKey = `search:${type}:${q}:${limit}:${offset}`;
  
  try {
    const cached = await kv.get(cacheKey);
    if (cached) {
      const data = typeof cached === 'string' ? JSON.parse(cached) : cached;
      return res.json({
        ...data,
        from_cache: true
      });
    }
  } catch (e) {
    console.log('Cache miss for search');
  }
  
  try {
    const results = await searchSpotify(
      q.trim(),
      type,
      parseInt(limit),
      parseInt(offset)
    );
    
    const response = {
      success: true,
      query: q,
      type: type,
      ...results,
      from_cache: false,
      timestamp: new Date().toISOString()
    };
    
    // Cache for 10 minutes
    try {
      await kv.setex(cacheKey, 600, JSON.stringify(response));
    } catch (e) {
      console.error('Cache set error:', e);
    }
    
    res.json(response);
    
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search tracks',
      message: error.message
    });
  }
};
```

### Frontend Search Implementation
```javascript
// In index.html - Enhanced search

let searchDebounceTimer = null;
let currentSearchQuery = '';
let searchOffset = 0;

function setupSearchHandlers() {
  const searchInput = document.getElementById('searchInput');
  const searchButton = document.querySelector('.btn-search');
  
  // Debounced search on typing
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    
    // Clear previous timer
    clearTimeout(searchDebounceTimer);
    
    if (query.length === 0) {
      // Back to trending
      switchGenre(currentGenre);
      return;
    }
    
    if (query.length < 2) {
      return; // Wait for at least 2 characters
    }
    
    // Debounce 300ms
    searchDebounceTimer = setTimeout(() => {
      performSearch(query);
    }, 300);
  });
  
  // Immediate search on button click
  searchButton.addEventListener('click', () => {
    const query = searchInput.value.trim();
    if (query) {
      performSearch(query);
    }
  });
  
  // Search on Enter key
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const query = searchInput.value.trim();
      if (query) {
        clearTimeout(searchDebounceTimer);
        performSearch(query);
      }
    }
  });
}

async function performSearch(query) {
  currentSearchQuery = query;
  searchOffset = 0;
  
  // Check if it's a URL
  if (query.startsWith('http://') || query.startsWith('https://')) {
    resolveUrl(query);
    return;
  }
  
  // Show loading
  showLoadingIndicator();
  updateSectionTitle('Searching...');
  
  try {
    const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=20`);
    const data = await response.json();
    
    if (data.success && data.tracks && data.tracks.length > 0) {
      displaySearchResults(data.tracks, data.hasMore);
      updateSectionTitle(`Search Results for "${query}" (${data.total.toLocaleString()} found)`);
    } else {
      displayEmptyState(
        'No Results',
        `We couldn't find any tracks matching "${query}".`,
        'Try a different search term or browse trending music.'
      );
    }
  } catch (error) {
    console.error('Search error:', error);
    displayErrorState(
      'Search Failed',
      'Something went wrong while searching.',
      'Please try again or browse trending music.'
    );
  } finally {
    hideLoadingIndicator();
  }
}

function displaySearchResults(tracks, hasMore) {
  const grid = document.getElementById('musicGrid');
  
  grid.innerHTML = tracks.map(track => `
    <div class="track-card search-result" data-track-id="${track.id}">
      <div class="track-artwork">
        <img src="${track.artwork || track.artworkMedium}" 
             alt="${track.title}"
             loading="lazy"
             onerror="this.src='data:image/svg+xml,...'"
             onload="this.classList.add('loaded')">
        <div class="play-overlay">
          <button class="play-button" onclick="playTrack('${escapeJs(track.url)}', '${escapeJs(track.title)}', '${escapeJs(track.artist)}')">
            ▶️
          </button>
        </div>
        ${track.explicit ? '<div class="explicit-badge">E</div>' : ''}
      </div>
      <div class="track-info">
        <div class="track-title">${escapeHtml(track.title)}</div>
        <div class="track-artist">${escapeHtml(track.artist)}</div>
        <div class="track-meta">
          <span class="track-album">${escapeHtml(track.album)}</span>
          ${track.popularity ? `<span class="track-popularity">${getPopularityBars(track.popularity)}</span>` : ''}
        </div>
      </div>
      <button class="track-action-btn" onclick="playTrack('${escapeJs(track.url)}', '${escapeJs(track.title)}', '${escapeJs(track.artist)}')">
        Play & Share
      </button>
    </div>
  `).join('');
  
  // Add "Load More" button if there are more results
  if (hasMore) {
    grid.innerHTML += `
      <div class="load-more-container">
        <button class="btn btn-secondary" onclick="loadMoreSearchResults()">
          Load More Results
        </button>
      </div>
    `;
  }
}

async function loadMoreSearchResults() {
  searchOffset += 20;
  
  try {
    const response = await fetch(`/api/search?q=${encodeURIComponent(currentSearchQuery)}&limit=20&offset=${searchOffset}`);
    const data = await response.json();
    
    if (data.success && data.tracks && data.tracks.length > 0) {
      // Append results to existing grid
      const grid = document.getElementById('musicGrid');
      const loadMoreBtn = grid.querySelector('.load-more-container');
      
      if (loadMoreBtn) {
        loadMoreBtn.remove();
      }
      
      const newCards = data.tracks.map(track => `...`).join('');
      grid.insertAdjacentHTML('beforeend', newCards);
      
      if (data.hasMore) {
        grid.insertAdjacentHTML('beforeend', `
          <div class="load-more-container">
            <button class="btn btn-secondary" onclick="loadMoreSearchResults()">
              Load More Results
            </button>
          </div>
        `);
      }
    }
  } catch (error) {
    console.error('Load more error:', error);
    alert('Failed to load more results');
  }
}

function displayEmptyState(title, message, suggestion) {
  const grid = document.getElementById('musicGrid');
  grid.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">🔍</div>
      <h3>${title}</h3>
      <p>${message}</p>
      <p class="suggestion">${suggestion}</p>
      <button class="btn btn-primary" onclick="clearSearch()">
        Browse Trending Music
      </button>
    </div>
  `;
}

function clearSearch() {
  document.getElementById('searchInput').value = '';
  currentSearchQuery = '';
  searchOffset = 0;
  switchGenre(currentGenre);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  setupSearchHandlers();
  // ... other initialization
});
```

---

# Phase 2: Feed Infrastructure

## 2.1 Enhanced Database Schema

### New Tables for Social Features
```sql
-- Add to existing supabase-schema.sql

-- Music posts (enhanced play_events for social feed)
-- This is the "post" that appears in the feed
-- Note: This is separate from play_events to allow posting without playing
CREATE TABLE IF NOT EXISTS music_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    
    -- Track information
    track_id TEXT NOT NULL, -- Spotify track ID
    track_title TEXT NOT NULL,
    track_artist TEXT NOT NULL,
    track_album TEXT,
    track_artwork_url TEXT,
    track_spotify_url TEXT NOT NULL,
    track_trackshare_url TEXT, -- Our short URL if generated
    track_duration_ms INTEGER,
    
    -- Post metadata
    caption TEXT CHECK (length(caption) <= 500),
    privacy TEXT DEFAULT 'friends' CHECK (privacy IN ('public', 'friends', 'private')),
    
    -- Engagement metrics (denormalized for performance)
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    play_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    
    -- Timestamps
    posted_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Post likes (replaces reactions table for cleaner model)
CREATE TABLE IF NOT EXISTS post_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID REFERENCES music_posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

-- Post comments
CREATE TABLE IF NOT EXISTS post_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    post_id UUID REFERENCES music_posts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    parent_comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE, -- For nested replies
    content TEXT NOT NULL CHECK (length(content) >= 1 AND length(content) <= 500),
    like_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comment likes
CREATE TABLE IF NOT EXISTS comment_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    comment_id UUID REFERENCES post_comments(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(comment_id, user_id)
);

-- User saved/bookmarked posts
CREATE TABLE IF NOT EXISTS saved_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    post_id UUID REFERENCES music_posts(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, post_id)
);

-- User following (different from friendships - can follow without mutual approval)
-- This is optional and can coexist with friendships
CREATE TABLE IF NOT EXISTS user_follows (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    following_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(follower_id, following_id),
    CHECK (follower_id != following_id)
);

-- System-generated content for trending feed
-- Special table for TrackShare Official posts
CREATE TABLE IF NOT EXISTS system_posts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    track_id TEXT NOT NULL,
    track_title TEXT NOT NULL,
    track_artist TEXT NOT NULL,
    track_album TEXT,
    track_artwork_url TEXT,
    track_spotify_url TEXT NOT NULL,
    caption TEXT,
    category TEXT DEFAULT 'trending' CHECK (category IN ('trending', 'new', 'featured', 'genre')),
    genre TEXT,
    visibility TEXT DEFAULT 'public',
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    play_count INTEGER DEFAULT 0,
    posted_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for feed queries
CREATE INDEX IF NOT EXISTS idx_music_posts_user_posted_at ON music_posts(user_id, posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_music_posts_privacy_posted_at ON music_posts(privacy, posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_music_posts_posted_at ON music_posts(posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_comments_user_id ON post_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_posts_user_id ON saved_posts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following ON user_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_system_posts_category_posted_at ON system_posts(category, posted_at DESC);

-- RLS Policies for music_posts
ALTER TABLE music_posts ENABLE ROW LEVEL SECURITY;

-- Users can view their own posts
CREATE POLICY "Users can view own posts" ON music_posts
    FOR SELECT USING (auth.uid() = user_id);

-- Users can view public posts
CREATE POLICY "Users can view public posts" ON music_posts
    FOR SELECT USING (privacy = 'public');

-- Users can view friends' posts with friends privacy
CREATE POLICY "Users can view friends posts" ON music_posts
    FOR SELECT USING (
        privacy = 'friends' AND
        user_id IN (
            SELECT CASE 
                WHEN requester_id = auth.uid() THEN addressee_id
                WHEN addressee_id = auth.uid() THEN requester_id
            END
            FROM friendships 
            WHERE (requester_id = auth.uid() OR addressee_id = auth.uid()) 
            AND status = 'accepted'
        )
    );

-- Users can create their own posts
CREATE POLICY "Users can create own posts" ON music_posts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own posts
CREATE POLICY "Users can update own posts" ON music_posts
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own posts
CREATE POLICY "Users can delete own posts" ON music_posts
    FOR DELETE USING (auth.uid() = user_id);

-- RLS for post_likes
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view likes on accessible posts" ON post_likes
    FOR SELECT USING (
        post_id IN (SELECT id FROM music_posts) -- Inherits post visibility
    );

CREATE POLICY "Users can manage own likes" ON post_likes
    FOR ALL USING (auth.uid() = user_id);

-- RLS for post_comments
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments on accessible posts" ON post_comments
    FOR SELECT USING (
        post_id IN (SELECT id FROM music_posts) -- Inherits post visibility
    );

CREATE POLICY "Users can create comments on accessible posts" ON post_comments
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        post_id IN (SELECT id FROM music_posts) -- Can only comment on accessible posts
    );

CREATE POLICY "Users can update own comments" ON post_comments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" ON post_comments
    FOR DELETE USING (auth.uid() = user_id);

-- RLS for saved_posts
ALTER TABLE saved_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own saved posts" ON saved_posts
    FOR ALL USING (auth.uid() = user_id);

-- RLS for system_posts (read-only for all, write for system/admin only)
ALTER TABLE system_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view system posts" ON system_posts
    FOR SELECT USING (true);

-- Functions for updating denormalized counts

-- Update post like_count
CREATE OR REPLACE FUNCTION update_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE music_posts 
        SET like_count = like_count + 1 
        WHERE id = NEW.post_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE music_posts 
        SET like_count = GREATEST(0, like_count - 1)
        WHERE id = OLD.post_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_post_like_count
AFTER INSERT OR DELETE ON post_likes
FOR EACH ROW EXECUTE FUNCTION update_post_like_count();

-- Update post comment_count
CREATE OR REPLACE FUNCTION update_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE music_posts 
        SET comment_count = comment_count + 1 
        WHERE id = NEW.post_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE music_posts 
        SET comment_count = GREATEST(0, comment_count - 1)
        WHERE id = OLD.post_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_post_comment_count
AFTER INSERT OR DELETE ON post_comments
FOR EACH ROW EXECUTE FUNCTION update_post_comment_count();

-- Update comment like_count
CREATE OR REPLACE FUNCTION update_comment_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE post_comments 
        SET like_count = like_count + 1 
        WHERE id = NEW.comment_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE post_comments 
        SET like_count = GREATEST(0, like_count - 1)
        WHERE id = OLD.comment_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_comment_like_count
AFTER INSERT OR DELETE ON comment_likes
FOR EACH ROW EXECUTE FUNCTION update_comment_like_count();

-- Updated_at trigger for posts
CREATE TRIGGER update_music_posts_updated_at BEFORE UPDATE ON music_posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_post_comments_updated_at BEFORE UPDATE ON post_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

This is getting very long. Let me create a summary document and continue with the remaining phases in a structured way.

Would you like me to:
1. Continue with the complete deep dive (will be 10,000+ lines)
2. Break it into multiple focused documents
3. Prioritize specific areas you want deeply detailed first

Which approach would be most useful for you?

