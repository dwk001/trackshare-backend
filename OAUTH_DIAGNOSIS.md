# Google OAuth 404 Error - Complete Diagnosis

## Issue
Google OAuth returns 404 error when attempting to sign in.

## Root Causes Found

### 1. ❌ Wrong OAuth Endpoint (CRITICAL)
**Current (in index.html line 667):**
```
https://accounts.google.com/oauth/authorize
```

**Should be:**
```
https://accounts.google.com/o/oauth2/v2/auth
```

Google deprecated the old endpoint. This is likely causing the 404.

### 2. ⚠️ Missing Environment Variable
**Missing:** `TRACKSHARE_BASE_URL` is NOT set in Vercel
- However, the callback handler (api/auth/google/callback.js line 25) is hardcoded to `https://www.trackshare.online/auth/google/callback`
- So this shouldn't cause the 404, but should be set for consistency

### 3. ✅ Google Cloud Console Configuration Required

Go to: https://console.cloud.google.com/apis/credentials

Find OAuth Client: `150328378525-ldggejup0i37ntgo3954aatocrgtrada.apps.googleusercontent.com`

**Verify these EXACT settings:**

#### Authorized JavaScript origins:
```
https://www.trackshare.online
https://trackshare.online
```

#### Authorized redirect URIs:
```
https://www.trackshare.online/auth/google/callback
https://trackshare.online/auth/google/callback
```

#### Application type:
```
Web application
```

## Fix Steps

### Step 1: Fix OAuth Endpoint in Frontend
Update `index.html` line 667:
```javascript
// OLD (causes 404)
const googleAuthUrl = `https://accounts.google.com/oauth/authorize?client_id=${GOOGLE_CLIENT_ID}...`;

// NEW (correct)
const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}...`;
```

### Step 2: Verify Google Cloud Console
1. Go to https://console.cloud.google.com/apis/credentials
2. Click EDIT on OAuth client `150328378525-ldggejup0i37ntgo3954aatocrgtrada.apps.googleusercontent.com`
3. Add BOTH redirect URIs listed above
4. Add BOTH JavaScript origins listed above
5. Click SAVE
6. Wait 5 minutes for propagation

### Step 3: Test
Use this test URL in your browser:
```
https://accounts.google.com/o/oauth2/v2/auth?client_id=150328378525-ldggejup0i37ntgo3954aatocrgtrada.apps.googleusercontent.com&redirect_uri=https%3A%2F%2Fwww.trackshare.online%2Fauth%2Fgoogle%2Fcallback&response_type=code&scope=openid%20email%20profile
```

**Expected:** Google OAuth consent screen
**If 404:** Check Google Cloud Console configuration again

## Vercel Environment Variables Status

✅ GOOGLE_CLIENT_ID: Set
✅ GOOGLE_CLIENT_SECRET: Set
❌ TRACKSHARE_BASE_URL: NOT SET (should add for consistency)
❌ CRON_SECRET: NOT SET (needed for trending music cache)

## Summary

**Most likely cause:** Wrong OAuth endpoint (old `oauth/authorize` vs new `o/oauth2/v2/auth`)
**Fix:** Update index.html line 667 to use correct endpoint
**Verify:** Google Cloud Console has correct redirect URIs

