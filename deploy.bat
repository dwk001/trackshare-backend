@echo off
echo 🚀 Deploying TrackShare Backend to GitHub...
echo.

cd /d "C:\Users\dwk00\OneDrive\Documents\TrackShare\backend"

echo 📁 Current directory: %CD%
echo.

echo 📤 Adding all changes...
git add .

echo 💾 Committing changes...
git commit -m "Update: %date% %time%"

echo 🚀 Pushing to GitHub...
git push

echo.
echo ✅ Deployment complete!
echo 🌐 Your API is live at: https://trackshare-backend.vercel.app
echo.

pause

