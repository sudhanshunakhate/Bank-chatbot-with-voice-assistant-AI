@echo off
echo ========================================================
echo   Apex Horizon Bank - Automated Dependency Installer
echo ========================================================
echo.

:: Check for Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH. Please install Python 3.10+ first.
    pause
    exit /b 1
)

:: Check for Node/NPM
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js/npm is not installed or not in PATH. Please install Node.js first.
    pause
    exit /b 1
)

echo [1/4] Setting up Python virtual environment in backend...
cd backend
if not exist .venv (
    python -m venv .venv
)
echo.

echo [2/4] Activating virtual environment and installing requirements...
call .venv\Scripts\activate.bat
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install backend dependencies.
    pause
    exit /b 1
)
cd ..
echo.

echo [3/4] Installing frontend npm packages...
cd frontend
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install frontend npm packages.
    pause
    exit /b 1
)
cd ..
echo.

echo ========================================================
echo   [SUCCESS] Setup complete!
echo   To run the project:
echo     - Start backend: cd backend ^&^& .venv\Scripts\activate ^&^& uvicorn main:app --reload
echo     - Start frontend: cd frontend ^&^& npm run dev
echo ========================================================
pause
