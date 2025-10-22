# Vercel Function Limit Management

## ⚠️ **CRITICAL CONSTRAINT: 12-FUNCTION LIMIT**

TrackShare is deployed on **Vercel's free plan** which has a strict **12 serverless function limit**. We are currently at exactly **12/12 functions**.

## Current Function Inventory (12/12)

### Core API Functions
1. **`api/resolve.js`** - Music link resolution
2. **`api/t.js`** - Track sharing endpoint  
3. **`api/providers.js`** - Music provider integration
4. **`api/trending.js`** - Trending music with caching
5. **`api/search.js`** - Music search with fallbacks

### User Management Functions
6. **`api/profile.js`** - User profiles and analytics
7. **`api/friends.js`** - Friend system management
8. **`api/posts.js`** - Music post management
9. **`api/privacy.js`** - Privacy settings and data export

### Authentication Functions
10. **`api/auth/google/callback.js`** - Google OAuth callback
11. **`api/auth/apple/callback.js`** - Apple OAuth callback
12. **`api/auth/me.js`** - Authentication status check

## Function Consolidation Strategies

### ✅ **Completed Consolidations**
- **Removed `api/test.js`** - Not needed for production
- **Converted `api/privacy.js`** - From Express router to proper Vercel function
- **Added `api/auth/me.js`** - Missing authentication endpoint

### 🔄 **Future Consolidation Options**

#### Option 1: Merge Related Functions
```javascript
// Consolidate into api/user.js
- api/profile.js (user profiles)
- api/friends.js (friend management) 
- api/posts.js (user posts)

// Consolidate into api/music.js
- api/resolve.js (link resolution)
- api/t.js (track sharing)
- api/providers.js (provider integration)
```

#### Option 2: Route-Based Consolidation
```javascript
// Single api/core.js with routing
- /api/core/resolve
- /api/core/track
- /api/core/providers
- /api/core/trending
- /api/core/search
```

#### Option 3: Feature-Based Consolidation
```javascript
// api/social.js
- Friend management
- Post management
- Social features

// api/music.js  
- Music resolution
- Search and trending
- Provider integration
```

## Upgrade Options

### Vercel Pro Plan
- **Cost**: $20/month per member
- **Benefits**: 
  - Unlimited serverless functions
  - Increased bandwidth (1TB vs 100GB)
  - Advanced analytics
  - Team collaboration features

### Alternative Platforms
- **Netlify**: Similar pricing, different limits
- **Railway**: $5/month for more functions
- **Render**: Free tier with different constraints

## Development Guidelines

### ✅ **DO**
- Always check function count before adding new APIs
- Consolidate related functionality when possible
- Use query parameters for different actions within functions
- Document consolidation decisions

### ❌ **DON'T**
- Add new functions without removing/consolidating others
- Create single-purpose functions for simple operations
- Ignore the 12-function limit in planning
- Assume unlimited functions are available

## Monitoring Function Usage

### Current Status: 12/12 Functions ✅
```bash
# Check function count
Get-ChildItem -Path api -Recurse -Filter "*.js" | Measure-Object | Select-Object -ExpandProperty Count
# Result: 12
```

### Function Size Monitoring
- Monitor individual function sizes
- Keep functions under 50MB (Vercel limit)
- Use external services for large operations

## Best Practices

### Function Design
1. **Single Responsibility** - Each function should handle one domain
2. **Parameter-Based Routing** - Use query parameters for different actions
3. **Shared Utilities** - Extract common code to shared modules
4. **Error Handling** - Consistent error responses across functions

### Code Organization
```javascript
// Example consolidated function structure
module.exports = async (req, res) => {
  const { action } = req.query;
  
  switch (action) {
    case 'profile':
      return handleProfile(req, res);
    case 'friends':
      return handleFriends(req, res);
    case 'posts':
      return handlePosts(req, res);
    default:
      return res.status(400).json({ error: 'Invalid action' });
  }
};
```

## Future Planning

### Phase 1: Current State (12/12)
- All functions optimized and working
- Fallback mechanisms implemented
- Error handling enhanced

### Phase 2: Consolidation (Target: 8-10 functions)
- Merge related user functions
- Consolidate music-related APIs
- Maintain functionality while reducing count

### Phase 3: Growth Planning
- Evaluate Vercel Pro upgrade
- Consider alternative platforms
- Plan for additional features within limits

## Conclusion

The 12-function limit is a **hard constraint** that requires careful planning and consolidation. TrackShare is currently optimized to use all available functions efficiently. Future development must prioritize consolidation over new functions.

**Status**: ✅ **At limit but optimized** - All functions are necessary and well-organized.
