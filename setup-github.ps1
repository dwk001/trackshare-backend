# TrackShare GitHub Setup Script
Write-Host "TrackShare GitHub Setup" -ForegroundColor Green
Write-Host "=====================" -ForegroundColor Green
Write-Host ""
Write-Host "The code is ready to push, but we need to create a GitHub repository first." -ForegroundColor Yellow
Write-Host ""
Write-Host "STEP 1: Create GitHub Repository" -ForegroundColor Cyan
Write-Host "1. Go to https://github.com/new" -ForegroundColor White
Write-Host "2. Repository name: TrackShare" -ForegroundColor White
Write-Host "3. Description: Universal music sharing app - Android MVP" -ForegroundColor White
Write-Host "4. Make it Public" -ForegroundColor White
Write-Host "5. Don't initialize with README, .gitignore, or license" -ForegroundColor White
Write-Host "6. Click 'Create repository'" -ForegroundColor White
Write-Host ""
Write-Host "STEP 2: After creating the repository, run these commands:" -ForegroundColor Cyan
Write-Host ""
Write-Host "git remote remove origin" -ForegroundColor White
Write-Host "git remote add origin https://github.com/YOUR_USERNAME/TrackShare.git" -ForegroundColor White
Write-Host "git push -u origin main" -ForegroundColor White
Write-Host ""
Write-Host "Replace YOUR_USERNAME with your actual GitHub username." -ForegroundColor Yellow
Write-Host ""
Write-Host "Once pushed, Vercel will automatically redeploy with the JSON parsing fix!" -ForegroundColor Green
Write-Host ""
Write-Host "The fix removes JSON.parse() from /api/t.js since Vercel KV returns parsed objects." -ForegroundColor Green
Write-Host "This will resolve the 'Track Not Found' error." -ForegroundColor Green
Write-Host ""
Read-Host "Press Enter to continue"
