@echo off
REM KgBites Backend Startup Script
echo ========================================
echo Starting KgBites Backend Server
echo ========================================
echo.

cd /d "%~dp0backend"

echo Checking for virtual environment...
if not exist "venv\Scripts\activate.bat" (
    echo ERROR: Virtual environment not found!
    echo Please create it first: python -m venv venv
    echo Then install dependencies: pip install -r requirements.txt
    pause
    exit /b 1
)

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo.
echo Applying migrations...
python manage.py migrate

echo.
echo ========================================
echo Starting Django Development Server
echo Backend will be available at:
echo http://127.0.0.1:8000
echo ========================================
echo.
echo Press Ctrl+C to stop the server
echo.

python manage.py runserver

pause
