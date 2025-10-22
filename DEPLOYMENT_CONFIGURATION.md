# TrackShare Deployment Configuration Guide

## Environment Variables Setup

### 1. Missing Spotify Credentials
The trending API is returning empty results because Spotify credentials are not configured.

**Required Environment Variables:**
```bash
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
```

**How to get Spotify credentials:**
1. Go to https://developer.spotify.com/dashboard
2. Create a new app
3. Copy Client ID and Client Secret
4. Add to Vercel:
```bash
vercel env add SPOTIFY_CLIENT_ID production
vercel env add SPOTIFY_CLIENT_SECRET production
```

### 2. Other Missing Environment Variables
Based on the code analysis, these are likely needed:
```bash
# Database/KV Store (already configured with Vercel KV)
KV_URL=your_vercel_kv_url
KV_REST_API_URL=your_kv_rest_url
KV_REST_API_TOKEN=your_kv_token
KV_REST_API_READ_ONLY_TOKEN=your_kv_read_token

# OAuth Providers
GOOGLE_CLIENT_ID=your_google_oauth_id
GOOGLE_CLIENT_SECRET=your_google_oauth_secret
APPLE_CLIENT_ID=your_apple_signin_id
APPLE_CLIENT_SECRET=your_apple_signin_secret

# JWT Secret for Authentication
JWT_SECRET=generate_a_secure_random_string_here

# API Keys for additional services
YOUTUBE_API_KEY=your_youtube_data_api_key
LASTFM_API_KEY=your_lastfm_api_key
```

## Vercel Configuration Improvements

### 1. Update vercel.json for Better Performance
```json
{
  "version": 2,
  "name": "trackshare",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "headers": [
    {
      "source": "/(.*)\\.(js|css|ico|png|jpg|jpeg|gif|svg|woff|woff2)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/index.html",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=0, must-revalidate"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; img-src * data:; script-src 'self' 'unsafe-inline' https://apis.google.com; style-src 'self' 'unsafe-inline'; connect-src 'self' https://*.spotify.com https://accounts.spotify.com https://api.spotify.com"
        }
      ]
    }
  ],
  "functions": {
    "api/resolve.js": {
      "maxDuration": 30,
      "memory": 1024
    },
    "api/trending.js": {
      "maxDuration": 60,
      "memory": 1024
    },
    "api/search.js": {
      "maxDuration": 30,
      "memory": 1024
    }
  },
  "crons": [
    {
      "path": "/api/trending?refresh=true",
      "schedule": "0 */6 * * *"
    }
  ],
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "redirects": [
    {
      "source": "/home",
      "destination": "/",
      "permanent": false
    }
  ]
}
```

### 2. Create Build Script
Add to package.json:
```json
{
  "scripts": {
    "build": "node scripts/build.js",
    "dev": "node scripts/dev-server.js",
    "start": "node backend/server.js"
  }
}
```

### 3. Create Build Script (scripts/build.js)
```javascript
const fs = require('fs');
const path = require('path');
const { minify } = require('html-minifier');

// Create dist directory
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}

// Read and split index.html
const html = fs.readFileSync('index.html', 'utf8');

// Extract CSS
const cssMatch = html.match(/<style>([\s\S]*?)<\/style>/);
if (cssMatch) {
  const css = cssMatch[1];
  fs.writeFileSync('dist/styles.css', css);
}

// Extract JavaScript
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
if (scriptMatch) {
  const js = scriptMatch[1];
  fs.writeFileSync('dist/main.js', js);
}

// Create new HTML with external files
let newHtml = html.replace(/<style>[\s\S]*?<\/style>/, '<link rel="stylesheet" href="/styles.css">');
newHtml = newHtml.replace(/<script>[\s\S]*?<\/script>/, '<script src="/main.js" defer></script>');

// Add missing viewport meta
if (!newHtml.includes('viewport')) {
  newHtml = newHtml.replace('<head>', '<head>\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">');
}

// Minify HTML
const minifiedHtml = minify(newHtml, {
  removeComments: true,
  collapseWhitespace: true,
  minifyCSS: true,
  minifyJS: true
});

fs.writeFileSync('dist/index.html', minifiedHtml);
console.log('Build complete!');
```

## Database Setup

### 1. Vercel KV Configuration
```bash
# Install Vercel CLI
npm i -g vercel

# Link your project
vercel link

# Create KV database
vercel kv create trackshare-db

# This will automatically add KV environment variables
```

### 2. Initialize Database Schema
Create `scripts/init-db.js`:
```javascript
const { kv } = require('@vercel/kv');

async function initDatabase() {
  // Create initial data structures
  await kv.hset('stats', {
    totalUsers: 0,
    totalPosts: 0,
    totalPlaylists: 0,
    totalGroups: 0
  });
  
  // Set up cache keys with TTL
  await kv.setex('cache:trending:all', 3600, JSON.stringify([]));
  
  console.log('Database initialized');
}

initDatabase().catch(console.error);
```

## API Testing

### 1. Test Spotify Integration
```bash
# After setting environment variables, test the API
curl https://trackshare.online/api/trending

# Should return actual Spotify tracks
```

### 2. Test Search Functionality
```bash
curl "https://trackshare.online/api/search?q=taylor+swift"

# Should return search results
```

## Monitoring Setup

### 1. Add Vercel Analytics
```html
<!-- Add to index.html before </body> -->
<script defer src="/_vercel/insights/script.js"></script>
```

### 2. Add Error Tracking (Sentry)
```javascript
// Add to top of your JavaScript
import * as Sentry from "@sentry/browser";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
```

### 3. Add Performance Monitoring
```javascript
// Add Web Vitals tracking
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric) {
  // Send to your analytics endpoint
  fetch('/api/analytics', {
    method: 'POST',
    body: JSON.stringify(metric)
  });
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

## Domain Configuration

### 1. SSL Certificate
Already handled by Vercel automatically ✅

### 2. DNS Settings
Ensure your domain points to Vercel:
```
Type: CNAME
Name: @
Value: cname.vercel-dns.com
```

### 3. Add www redirect
In Vercel dashboard:
1. Go to Settings > Domains
2. Add www.trackshare.online
3. Set it to redirect to trackshare.online

## Deployment Checklist

- [ ] Set all environment variables in Vercel
- [ ] Test Spotify API credentials
- [ ] Configure Vercel KV database
- [ ] Update vercel.json with optimizations
- [ ] Add build scripts to package.json
- [ ] Test all API endpoints
- [ ] Verify OAuth callbacks work
- [ ] Check mobile responsiveness
- [ ] Monitor error rates
- [ ] Set up alerts for downtime

## Continuous Deployment

### GitHub Actions Workflow
Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Vercel
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

## Performance Targets

After implementing these configurations:
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 3.5s
- **Lighthouse Score**: > 85
- **Core Web Vitals**: All passing
- **API Response Time**: < 200ms p95
- **Uptime**: > 99.9%

## Support & Maintenance

1. **Weekly Tasks:**
   - Review error logs
   - Check performance metrics
   - Update dependencies

2. **Monthly Tasks:**
   - Audit security vulnerabilities
   - Review API usage limits
   - Optimize database queries

3. **Quarterly Tasks:**
   - Performance audit
   - Security penetration testing
   - User feedback review

---

Remember to test all changes in a staging environment before deploying to production!