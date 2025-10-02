# TrackShare Backend Deploy Script
Write-Host "🚀 Deploying TrackShare Backend to GitHub..." -ForegroundColor Green
Write-Host ""

# Navigate to backend directory
Set-Location "C:\Users\dwk00\OneDrive\Documents\TrackShare\backend"

Write-Host "📁 Current directory: $(Get-Location)" -ForegroundColor Blue
Write-Host ""

# Add all changes
Write-Host "📤 Adding all changes..." -ForegroundColor Yellow
git add .

# Commit with timestamp
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Write-Host "💾 Committing changes..." -ForegroundColor Yellow
git commit -m "Update: $timestamp"

# Push to GitHub
Write-Host "🚀 Pushing to GitHub..." -ForegroundColor Yellow
git push

Write-Host ""
Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host "🌐 Your API is live at: https://trackshare-backend.vercel.app" -ForegroundColor Cyan
Write-Host ""

Read-Host "Press Enter to continue"

