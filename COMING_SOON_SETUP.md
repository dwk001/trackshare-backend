# Coming Soon Page Setup Guide

## Overview
TrackShare now has two deployment environments:
- **Production (trackshare.online)**: Coming soon landing page
- **QA (Preview URLs)**: Full application for testing

## Deployment URLs

### Production (Coming Soon Page)
- **URL**: https://trackshare.online
- **Branch**: `production`
- **Status**: Shows "Coming Soon" page with floating music notes

### QA/Testing (Full Application)
- **Preview URL**: https://trackshare-egq.pages.dev (or deployment-specific URLs)
- **Branch**: `main`
- **Status**: Full MVP application for testing

## How to Access QA/Testing Environment

### Option 1: Latest Preview URL (Recommended)
Every deployment from the `main` branch creates a unique preview URL that you can share with your team.

To get the latest preview URL:
```bash
wrangler pages deployment list --project-name=trackshare --limit=1
```

The preview URL format is: `https://<hash>.trackshare-egq.pages.dev`

### Option 2: Direct Manual Deployment
Deploy a specific version for testing:
```bash
npm run build
wrangler pages deploy dist --project-name trackshare
```

This creates a new deployment with a unique URL you can share.

## Production Branch Setup

The `production` branch contains only the "Coming Soon" page:
```bash
git checkout production
```

To update production:
```bash
# Make changes to coming soon page if needed
git add .
git commit -m "Update coming soon page"
git push origin production
```

## QA/Development Workflow

1. **Work on main branch** (full app)
2. **Deploy for testing**:
   ```bash
   npm run build
   wrangler pages deploy dist --project-name trackshare
   ```
3. **Share the preview URL** with your team
4. **Test and iterate**
5. **When ready for public launch**, merge to production branch

## Cloudflare Pages Configuration

To set up branch-based deployments in Cloudflare Pages:

1. Go to Cloudflare Dashboard → Pages → trackshare project
2. Click "Settings" → "Builds and deployments"
3. Configure:
   - **Production branch**: `production`
   - **Preview deployments**: Enabled (for all branches)
4. Connect your GitHub repository if not already connected

This will:
- Automatically deploy `production` branch to trackshare.online
- Create preview URLs for `main` branch deployments
- Give you unique URLs for each push to main

## Current Status

✅ **Production (trackshare.online)**: Coming soon page deployed
✅ **QA (trackshare-egq.pages.dev)**: Latest main branch deployment with full app
✅ **Preview URLs**: Unique URL for each deployment (latest: `https://756e9931.trackshare-egq.pages.dev`)

## Your Current URLs

### For Testing/QA (Full Application)
- **Main QA URL**: https://trackshare-egq.pages.dev
- **Latest Deployment**: https://756e9931.trackshare-egq.pages.dev
- Use these URLs to test the complete application with all features

### For Public (Coming Soon Page)
- **Production**: https://trackshare.online
- Shows beautiful "Coming Soon" page with floating music notes

## Commands Reference

### Deploy to QA (Main Branch)
```bash
npm run build
wrangler pages deploy dist --project-name trackshare
```

### Get Latest QA URL
```bash
wrangler pages deployment list --project-name=trackshare --limit=1
```

### Switch to Production Branch
```bash
git checkout production
```

### Switch to Development Branch
```bash
git checkout main
```

## Next Steps for Public Launch

When you're ready to make trackshare.online public with the full application:

1. Merge main into production:
   ```bash
   git checkout production
   git merge main
   git push origin production
   ```

2. Remove the coming soon page from production

## Notes

- Preview URLs are perfect for sharing with testers and stakeholders
- Each deployment gets a unique URL that persists
- Production site remains in "coming soon" mode until you're ready to launch

