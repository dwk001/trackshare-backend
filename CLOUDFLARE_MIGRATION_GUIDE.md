# TrackShare Cloudflare Pages Migration Guide

## 🚀 **Migration from Vercel to Cloudflare Pages**

This guide will help you migrate your TrackShare project from Vercel to Cloudflare Pages, which will resolve the security checkpoint and function limitation issues.

## 📋 **Prerequisites**

- ✅ Cloudflare account (you have this)
- ✅ GitHub repository with your code
- ✅ Node.js 18+ installed
- ✅ npm/yarn package manager

## 🛠️ **Step-by-Step Migration Process**

### **Step 1: Install Cloudflare CLI**

```bash
npm install -g wrangler
```

### **Step 2: Authenticate with Cloudflare**

```bash
wrangler login
```

This will open your browser to authenticate with Cloudflare.

### **Step 3: Build Your Project**

```bash
npm run build
```

### **Step 4: Deploy to Cloudflare Pages**

**Option A: Using Wrangler CLI (Recommended)**
```bash
wrangler pages deploy dist --project-name trackshare
```

**Option B: Using GitHub Integration**
1. Go to Cloudflare Dashboard → Pages
2. Click "Create a project"
3. Connect your GitHub repository
4. Set build command: `npm run build`
5. Set build output directory: `dist`
6. Deploy

### **Step 5: Set Up Custom Domain**

1. In Cloudflare Pages dashboard, go to your project
2. Click "Custom domains"
3. Add `trackshare.online`
4. Update DNS records as instructed

### **Step 6: Deploy API Functions (Optional)**

If you want to use Cloudflare Workers for API endpoints:

```bash
wrangler deploy --config wrangler-workers.toml
```

## 🔧 **Configuration Files Created**

- `wrangler.toml` - Cloudflare Pages configuration
- `functions/api.js` - API endpoints as Cloudflare Workers
- `wrangler-workers.toml` - Workers configuration
- `deploy-cloudflare.ps1` - Deployment script

## 🎯 **Benefits of Cloudflare Pages**

- ✅ **No Security Checkpoint** - Unlike Vercel's blocking
- ✅ **Unlimited Bandwidth** - No monthly limits
- ✅ **No Function Limits** - Unlike Vercel's 12-function restriction
- ✅ **Better Performance** - Global CDN with 200+ locations
- ✅ **Free SSL** - Automatic HTTPS
- ✅ **Custom Domains** - Full support

## 🚨 **Important Notes**

1. **API Endpoints**: The current setup uses static fallback data. For real API functionality, you'll need to:
   - Set up Cloudflare Workers for dynamic API endpoints
   - Or use external APIs directly from the frontend

2. **Environment Variables**: If you have any environment variables, set them in Cloudflare Pages dashboard under Settings → Environment variables

3. **Build Process**: Cloudflare Pages will automatically build your project on every push to your main branch

## 🔄 **Rollback Plan**

If you need to rollback to Vercel:
1. Your Vercel deployment is still active
2. Simply point your domain back to Vercel
3. Or keep both running for testing

## 📞 **Support**

If you encounter any issues:
1. Check Cloudflare Pages documentation
2. Verify your build process works locally
3. Check the deployment logs in Cloudflare dashboard

## 🎉 **Next Steps After Migration**

1. Test all functionality on Cloudflare Pages
2. Set up custom domain (trackshare.online)
3. Configure any environment variables
4. Set up monitoring and analytics
5. Consider implementing real API endpoints with Cloudflare Workers

---

**Ready to migrate? Run the deployment script:**
```bash
.\deploy-cloudflare.ps1
```
