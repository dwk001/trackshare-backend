# TrackShare Enhancement Plan - Social Music Platform

## Overview
Transform TrackShare from a simple music link sharing tool into a social music discovery platform with feed-based interactions, privacy controls, and improved UX.

---

## Phase 1: Homepage UX Improvements

### 1.1 Responsive Design Overhaul
**Current Issues:**
- Layout not optimized for different screen sizes
- Genre tabs not fully functional with proper music diversity
- Limited mobile experience

**Solutions:**
- Implement CSS Grid/Flexbox responsive breakpoints
  - Mobile: 1 column
  - Tablet: 2 columns  
  - Desktop: 3-4 columns
- Add mobile-friendly navigation
- Improve touch targets for mobile devices

**Files to modify:**
- `index.html` - Update CSS media queries (lines 40-200)
- Add responsive grid layout for track cards
- Improve spacing and typography for readability

### 1.2 Genre Filtering Enhancement
**Current Issues:**
- All genres show the same tracks from `/api/trending`
- Limited track diversity per genre
- No actual genre-based filtering

**Solutions:**
- Enhance `/api/trending.js` to fetch genre-specific playlists:
  - **Pop**: Spotify's "Today's Top Hits" playlist
  - **Rock**: "Rock Classics" playlist
  - **Hip-Hop**: "RapCaviar" playlist
  - **Country**: "Hot Country" playlist
  - **Electronic**: "mint" electronic playlist
- Cache per-genre results separately
- Fetch 20-30 tracks per genre for variety

**Implementation:**
```javascript
// api/trending.js enhancement
const GENRE_PLAYLISTS = {
  pop: '37i9dQZF1DXcBWIGoYBM5M',      // Today's Top Hits
  rock: '37i9dQZF1DWXRqgorJj26U',     // Rock Classics
  'hip-hop': '37i9dQZF1DX0XUsuxWHRQd', // RapCaviar
  country: '37i9dQZF1DX1lVhptIYRda',   // Hot Country
  electronic: '37i9dQZF1DX4dyzvuaRJ0n' // mint
};

// Cache each genre separately
await kv.setex(`trending:music:${genre}`, 86400, JSON.stringify(tracks));
```

**Files to modify:**
- `api/trending.js` - Add genre parameter, fetch genre-specific playlists
- `index.html` - Update `switchGenre()` to pass genre to API, update `fetchTrendingMusic()` to accept genre

---

## Phase 2: Advanced Search Implementation

### 2.1 Spotify Web API Integration
**Current Issues:**
- Search only checks hardcoded mock data
- "No tracks found" for most queries
- No real-time search capability

**Solutions:**
- Create new `/api/search.js` endpoint using Spotify's Search API
- Support search types: tracks, artists, albums
- Return 20+ results with pagination support
- Include rich metadata (album art, release date, popularity)

**Implementation:**
```javascript
// api/search.js (NEW FILE)
const { kv } = require('@vercel/kv');

async function searchSpotify(query, type = 'track', limit = 20) {
  const accessToken = await getSpotifyAccessToken();
  
  const response = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=${type}&limit=${limit}`,
    {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    }
  );
  
  const data = await response.json();
  
  if (type === 'track' && data.tracks) {
    return data.tracks.items.map(track => ({
      id: track.id,
      title: track.name,
      artist: track.artists[0].name,
      artwork: track.album.images[0]?.url,
      url: track.external_urls.spotify,
      album: track.album.name,
      releaseDate: track.album.release_date,
      popularity: track.popularity
    }));
  }
  
  return [];
}

module.exports = async (req, res) => {
  const { q, type = 'track' } = req.query;
  
  if (!q) {
    return res.status(400).json({ error: 'Query parameter required' });
  }
  
  try {
    const results = await searchSpotify(q, type);
    res.json({ success: true, results, query: q });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

**Frontend Changes:**
- Update `searchMusic()` to call `/api/search?q=${query}`
- Add debouncing for search input (300ms delay)
- Show loading indicator during search
- Display "No results" message gracefully

**Files to modify:**
- `api/search.js` - NEW FILE
- `index.html` - Update `searchMusic()` and `searchWithAPI()` functions
- `vercel.json` - Add search endpoint configuration

---

## Phase 3: Social Feed & User Profiles

### 3.1 Database Schema Updates
**New Tables Needed:**

```sql
-- User privacy settings
CREATE TABLE user_privacy (
  user_id UUID PRIMARY KEY REFERENCES profiles(id),
  music_visibility VARCHAR(20) DEFAULT 'private', -- 'private', 'friends', 'public'
  allow_friend_requests BOOLEAN DEFAULT true,
  show_listening_history BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Friendship system
CREATE TABLE friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  friend_id UUID REFERENCES profiles(id),
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'blocked'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, friend_id)
);

-- Music activity feed
CREATE TABLE music_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  track_id VARCHAR(255) NOT NULL,
  track_title VARCHAR(255) NOT NULL,
  track_artist VARCHAR(255) NOT NULL,
  track_artwork TEXT,
  track_url TEXT NOT NULL,
  caption TEXT,
  visibility VARCHAR(20) DEFAULT 'private', -- 'private', 'friends', 'public'
  listening_timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Post interactions
CREATE TABLE post_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES music_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  reaction_type VARCHAR(20) DEFAULT 'like', -- 'like', 'love', 'fire'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

CREATE TABLE post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES music_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_music_posts_visibility ON music_posts(visibility, created_at DESC);
CREATE INDEX idx_music_posts_user ON music_posts(user_id, created_at DESC);
CREATE INDEX idx_friendships_user ON friendships(user_id) WHERE status = 'accepted';
CREATE INDEX idx_post_reactions_post ON post_reactions(post_id);
CREATE INDEX idx_post_comments_post ON post_comments(post_id, created_at);
```

### 3.2 Feed Backend API
**New Endpoints:**

```javascript
// api/feed.js (NEW FILE)

// GET /api/feed?view=trending|friends&limit=20&offset=0
// Returns paginated feed based on view type and user's friends

async function getTrendingFeed(limit = 20, offset = 0) {
  // Public posts from all users, sorted by reactions/recency
  const { data } = await supabase
    .from('music_posts')
    .select(`
      *,
      profiles:user_id (id, name, picture),
      reactions:post_reactions(count),
      comments:post_comments(count)
    `)
    .eq('visibility', 'public')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
    
  return data;
}

async function getFriendsFeed(userId, limit = 20, offset = 0) {
  // Posts from user's friends with 'friends' or 'public' visibility
  const { data } = await supabase
    .from('music_posts')
    .select(`
      *,
      profiles:user_id (id, name, picture),
      reactions:post_reactions(count),
      comments:post_comments(count)
    `)
    .in('visibility', ['friends', 'public'])
    .in('user_id', [/* user's friend IDs */])
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
    
  return data;
}

// POST /api/feed/post
// Create new music post

// POST /api/feed/react
// React to a post

// POST /api/feed/comment
// Comment on a post
```

**Files to create:**
- `api/feed.js` - NEW FILE (feed retrieval)
- `api/post.js` - NEW FILE (create/update/delete posts)
- `api/friends.js` - NEW FILE (friendship management)
- `backend/supabase-feed-schema.sql` - NEW FILE (database schema)

### 3.3 Frontend Feed View
**When Signed In:**
- Replace homepage trending music with personalized feed
- Show toggle between "Trending" and "Friends" tabs
- Feed cards display:
  - User avatar + name
  - Track artwork
  - Track title + artist
  - "Play & Share" button
  - Timestamp ("2 hours ago")
  - Like/Comment counts
  - Quick react buttons
  
**Feed Card Design:**
```html
<div class="feed-card">
  <div class="feed-header">
    <img src="user.picture" class="user-avatar">
    <div class="user-info">
      <div class="user-name">John Doe</div>
      <div class="post-time">2 hours ago</div>
    </div>
  </div>
  
  <div class="track-info">
    <img src="track.artwork" class="track-artwork">
    <div class="track-details">
      <div class="track-title">Blinding Lights</div>
      <div class="track-artist">The Weeknd</div>
    </div>
  </div>
  
  <div class="feed-actions">
    <button class="action-btn like">❤️ 24</button>
    <button class="action-btn comment">💬 5</button>
    <button class="action-btn play">▶️ Play</button>
  </div>
</div>
```

**Files to modify:**
- `index.html` - Add feed view template, toggle between trending/feed
- Create `feed.css` - NEW FILE for feed-specific styles
- Update `index.html` JavaScript to fetch and render feed

---

## Phase 4: Privacy & Settings

### 4.1 Privacy Controls UI
**Settings Modal:**
- Music Visibility dropdown: "Private" | "Friends Only" | "Public"
- Toggle: "Allow friend requests"
- Toggle: "Show my listening history"
- Toggle: "Show me in public search"

**Implementation:**
```javascript
// In index.html, add settings modal
function showPrivacySettings() {
  // Fetch current settings
  fetch('/api/privacy/settings', {
    headers: { 'Authorization': `Bearer ${userToken}` }
  })
  .then(res => res.json())
  .then(settings => {
    // Populate modal with current settings
    document.getElementById('musicVisibility').value = settings.music_visibility;
    // ... etc
  });
}

function savePrivacySettings() {
  const settings = {
    music_visibility: document.getElementById('musicVisibility').value,
    allow_friend_requests: document.getElementById('allowFriendRequests').checked,
    show_listening_history: document.getElementById('showHistory').checked
  };
  
  fetch('/api/privacy/settings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${userToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(settings)
  });
}
```

**Files to modify:**
- `index.html` - Add privacy settings modal
- `api/privacy.js` - Add GET/POST /settings endpoint for privacy controls

### 4.2 Profile Pages
**URL Structure:**
- `https://www.trackshare.online/profile/{userId}`
- Shows user's public/friends-visible posts
- Friend status (Add Friend / Pending / Friends)
- Recent listening activity (if allowed by privacy settings)

**Files to create:**
- `profile.html` - NEW FILE (user profile page)
- `api/profile.js` - NEW FILE (fetch user profile data)

---

## Phase 5: System Account & Onboarding

### 5.1 TrackShare Official Account
**Purpose:**
- Posts trending music automatically
- Provides content for logged-out users
- Acts as "curator" for discovery

**Implementation:**
- Create system user in database: `system@trackshare.online`
- Automated posting from cron job when caching trending music
- Posts marked with special "TrackShare Official" badge

```javascript
// In api/cache-trending.js
async function postTrendingToFeed(tracks) {
  const systemUserId = await getSystemUserId();
  
  for (const track of tracks.slice(0, 5)) { // Post top 5
    await supabase
      .from('music_posts')
      .insert({
        user_id: systemUserId,
        track_id: track.id,
        track_title: track.title,
        track_artist: track.artist,
        track_artwork: track.artwork,
        track_url: track.url,
        caption: '🔥 Trending now!',
        visibility: 'public',
        listening_timestamp: new Date().toISOString()
      });
  }
}
```

### 5.2 Logged-Out Experience
**Default View:**
- Show feed with TrackShare Official posts (trending music)
- "Sign in to see personalized music from friends" banner
- Can still browse and play music
- Cannot like/comment/post without signing in

---

## Implementation Order

### Sprint 1: Homepage & Search (Week 1)
1. ✅ Fix OAuth (COMPLETED)
2. Responsive design updates
3. Genre filtering with real data
4. Spotify search API integration
5. Search UX improvements

### Sprint 2: Database & Backend (Week 2)
1. Create database schema (user_privacy, friendships, music_posts, etc.)
2. Build feed API endpoints
3. Build privacy API endpoints
4. Build friends API endpoints
5. Create system account

### Sprint 3: Feed UI (Week 3)
1. Design feed card component
2. Implement feed rendering
3. Add trending/friends toggle
4. Implement infinite scroll/pagination
5. Add like/comment interactions

### Sprint 4: Privacy & Profiles (Week 4)
1. Build privacy settings modal
2. Build user profile pages
3. Implement friend request system
4. Add profile editing
5. Polish and testing

---

## Key Files to Create

### Backend:
- `api/search.js` - Spotify search endpoint
- `api/feed.js` - Feed retrieval
- `api/post.js` - Post management
- `api/friends.js` - Friendship management
- `backend/supabase-feed-schema.sql` - Database schema

### Frontend:
- `profile.html` - User profile page
- `feed.css` - Feed-specific styles
- Update `index.html` with feed view, privacy settings

### Configuration:
- Update `vercel.json` with new endpoints
- Update environment variables for Spotify scopes

---

## Success Metrics

1. **Homepage:**
   - Mobile-responsive on all devices
   - All genre tabs show unique, relevant content
   - Search returns results for 95%+ of queries

2. **Feed:**
   - Users can see public trending feed without login
   - Signed-in users see personalized friend feed
   - Posts load in <2 seconds

3. **Privacy:**
   - Default to private music visibility
   - Easy toggle between privacy levels
   - Friend requests work smoothly

4. **Engagement:**
   - Users can like/comment on posts
   - Track plays from feed increase
   - Friend connections grow organically

