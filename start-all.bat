@echo off
REM KgBites - Start All Services
echo ========================================
echo Starting All KgBites Services
echo ========================================
echo.

REM Start Backend
echo [1/3] Starting Backend Server...
start "KgBites Backend" cmd /k "cd /d %~dp0backend && call venv\Scripts\activate && python manage.py runserver"
timeout /t 3 /nobreak >nul

REM Start Student Portal
echo [2/3] Starting Student Portal...
start "KgBites Student Portal" cmd /k "cd /d %~dp0student-portal && npm run dev"
timeout /t 2 /nobreak >nul

REM Start Staff Portal
echo [3/3] Starting Staff Portal...
start "KgBites Staff Portal" cmd /k "cd /d %~dp0staff-portal && npm run dev"

echo.
echo ========================================
echo All Services Starting!
echo ========================================
echo.
echo Three terminal windows will open:
echo 1. Backend:        http://localhost:8000
echo 2. Student Portal: http://localhost:5174
echo 3. Staff Portal:   http://localhost:5173
echo.
echo Keep all terminals open while working!
echo Press any key to close this window...
pause >nul
