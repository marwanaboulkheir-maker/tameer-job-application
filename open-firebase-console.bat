@echo off
echo ========================================
echo   Firebase Console Helper
echo ========================================
echo.
echo Step 1: Opening Firebase Console...
start "" "https://console.firebase.google.com/project/job-application-9f212/database/realtime/locks/rules"

echo.
echo Step 2: Current RTDB Rules (copy this JSON):
echo ========================================
echo   {
echo     "rules": {
echo       ".read": true,
echo       ".write": true,
echo       "applications": {
echo         ".read": true,
echo         ".write": true
echo       }
echo     }
echo   }
echo ========================================
echo.
echo Instructions:
echo 1. The Firebase Console should have opened
echo 2. Go to the "Rules" tab
echo 3. Copy the JSON above and paste it
echo 4. Click "Publish"
echo.
echo 5. Then go to "Data" tab to see applications
echo.
pause
