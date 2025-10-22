# Environment Variables Setup Guide for TrackShare

## Critical Environment Variables Required

The TrackShare application requires several environment variables to function properly. The current 500 errors are likely due to missing Spotify API credentials and Supabase configuration.

### Required Variables

#### Spotify API Configuration
```bash
SPOTIFY_CLIENT_ID=your_spotify_client_id_here
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
```

#### Supabase Configuration
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_JWT_SECRET=your_supabase_jwt_secret
```

#### Application Configuration
```bash
NODE_ENV=production
TRACKSHARE_BASE_URL=https://trackshare.online
TRACKSHARE_JWT_SECRET=your_jwt_secret_here
TRACKSHARE_JWT_TTL_SECONDS=43200
```

#### Optional Variables
```bash
YOUTUBE_API_KEY=your_youtube_api_key
YOUTUBE_CLIENT_ID=your_youtube_client_id
YOUTUBE_CLIENT_SECRET=your_youtube_client_secret
CRON_SECRET=your_cron_secret_for_scheduled_tasks
```

## How to Set Up Environment Variables

### For Vercel Deployment

1. **Go to Vercel Dashboard**
   - Navigate to your project settings
   - Go to "Environment Variables" section

2. **Add Each Variable**
   - Click "Add New"
   - Enter variable name and value
   - Set environment (Production, Preview, Development)

3. **Required Variables for Production**
   ```
   SPOTIFY_CLIENT_ID
   SPOTIFY_CLIENT_SECRET
   SUPABASE_URL
   SUPABASE_ANON_KEY
   SUPABASE_SERVICE_ROLE_KEY
   SUPABASE_JWT_SECRET
   TRACKSHARE_BASE_URL
   TRACKSHARE_JWT_SECRET
   ```

### For Local Development

1. **Create .env file**
   ```bash
   cp env.example .env
   ```

2. **Fill in values**
   ```bash
   # Edit .env file with your actual values
   nano .env
   ```

3. **Never commit .env**
   ```bash
   echo ".env" >> .gitignore
   ```

## Getting API Credentials

### Spotify API Setup

1. **Go to Spotify Developer Dashboard**
   - Visit: https://developer.spotify.com/dashboard
   - Log in with your Spotify account

2. **Create New App**
   - Click "Create App"
   - Fill in app details:
     - App Name: TrackShare
     - App Description: Music discovery and sharing platform
     - Website: https://trackshare.online
     - Redirect URI: https://trackshare.online/auth/spotify/callback

3. **Get Credentials**
   - Copy Client ID and Client Secret
   - Add to environment variables

### Supabase Setup

1. **Create Supabase Project**
   - Visit: https://supabase.com
   - Create new project
   - Choose region closest to your users

2. **Get Project Credentials**
   - Go to Settings > API
   - Copy URL, anon key, and service role key
   - Add to environment variables

3. **Set Up Database Schema**
   - Run the SQL scripts in the project:
     - `supabase-schema.sql`
     - `supabase-privacy-compliance.sql`
     - `supabase-activity-functions.sql`

## Fallback Mechanisms

To prevent complete failure when environment variables are missing, the application should include fallback mechanisms:

### API Fallbacks
- Return cached data when APIs are unavailable
- Show offline mode when services are down
- Provide mock data for development/testing

### Error Handling
- Graceful degradation when services fail
- User-friendly error messages
- Retry mechanisms with exponential backoff

## Testing Environment Variables

### Check if variables are set
```javascript
// In your API endpoints
if (!process.env.SPOTIFY_CLIENT_ID) {
  console.error('SPOTIFY_CLIENT_ID is not set');
  return res.status(500).json({ error: 'Service configuration error' });
}
```

### Validate API connectivity
```javascript
// Test Spotify API connection
async function testSpotifyConnection() {
  try {
    const token = await getSpotifyAccessToken();
    return !!token;
  } catch (error) {
    console.error('Spotify API connection failed:', error);
    return false;
  }
}
```

## Security Best Practices

1. **Never expose secrets in client-side code**
2. **Use environment variables for all sensitive data**
3. **Rotate API keys regularly**
4. **Use different keys for different environments**
5. **Monitor API usage and set rate limits**

## Troubleshooting

### Common Issues

1. **500 Errors**
   - Check if all required environment variables are set
   - Verify API credentials are correct
   - Check API rate limits

2. **Authentication Failures**
   - Verify Supabase configuration
   - Check JWT secrets match
   - Validate redirect URIs

3. **Spotify API Issues**
   - Check client ID and secret
   - Verify redirect URI matches exactly
   - Check if app is approved for production

### Debug Steps

1. **Check Environment Variables**
   ```bash
   # In Vercel function
   console.log('SPOTIFY_CLIENT_ID:', process.env.SPOTIFY_CLIENT_ID ? 'SET' : 'NOT SET');
   ```

2. **Test API Endpoints**
   ```bash
   curl https://trackshare.online/api/trending
   curl https://trackshare.online/api/search?q=test
   ```

3. **Check Logs**
   - Vercel function logs
   - Browser console errors
   - Network tab in dev tools

## Next Steps

1. **Set up all required environment variables in Vercel**
2. **Test API endpoints after configuration**
3. **Implement fallback mechanisms**
4. **Add monitoring and alerting**
5. **Document any additional configuration needed**
