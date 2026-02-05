@echo off
title Suspect Detection System Launcher
echo ===================================================
echo    STARTING SUSPECT DETECTION SYSTEM
echo ===================================================
echo.

:: Start Backend
echo [1/2] Launching Backend Server (Python/InsightFace)...
start "Suspect Backend API" cmd /k "cd backend && venv\Scripts\activate && python api_backend.py"

:: Start Frontend
echo [2/2] Launching Frontend Dashboard (Next.js)...
start "Suspect Frontend UI" cmd /k "cd suspect-frontend && npm run dev"

echo.
echo ===================================================
echo    SYSTEM LAUNCHED 🚀
echo ===================================================
echo Backend API: http://localhost:8000/video
echo Frontend UI: http://localhost:3000
echo.
echo Please wait roughly 10-15 seconds for servers to initialize.
echo You can minimize this window.
echo.
pause
