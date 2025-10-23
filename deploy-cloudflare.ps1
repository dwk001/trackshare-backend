# Cloudflare Pages Deployment Script for TrackShare
# Run this script to deploy to Cloudflare Pages

Write-Host "🚀 Deploying TrackShare to Cloudflare Pages..." -ForegroundColor Green

# Check if wrangler is installed
if (!(Get-Command "wrangler" -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Wrangler CLI not found. Installing..." -ForegroundColor Red
    npm install -g wrangler
}

# Build the project
Write-Host "📦 Building React app..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build completed successfully!" -ForegroundColor Green

# Deploy to Cloudflare Pages
Write-Host "🌐 Deploying to Cloudflare Pages..." -ForegroundColor Yellow
wrangler pages deploy dist --project-name trackshare

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    exit 1
}

Write-Host "🎉 Deployment completed successfully!" -ForegroundColor Green
Write-Host "🔗 Your site should be available at: https://trackshare.pages.dev" -ForegroundColor Cyan
Write-Host "📝 Don't forget to set up your custom domain (trackshare.online) in Cloudflare Pages dashboard" -ForegroundColor Yellow
