@echo off
title FitnessApp Starter

echo Starte Backend (Port 8000)...
start "FitnessApp Backend" cmd /k "cd /d %~dp0backend && py -m uvicorn main:app --reload --port 8000"

timeout /t 2 /nobreak >nul

echo Starte Frontend (Port 5173)...
start "FitnessApp Frontend" cmd /k "cd /d %~dp0 && npm run dev"

echo.
echo Server gestartet:
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:5173
