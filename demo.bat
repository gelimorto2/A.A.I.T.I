@echo off
echo.
echo ==========================================
echo  A.A.I.T.I Demo - Quick Start
echo ==========================================
echo.

REM Get script directory
set "SCRIPT_DIR=%~dp0"
set "VERBOSE_SCRIPT=%SCRIPT_DIR%scripts\windows\demo-verbose.bat"

echo Detected OS: Windows
echo.

REM Check if verbose script exists
if exist "%VERBOSE_SCRIPT%" (
    echo 🚀 Enhanced verbose demo script available!
    echo.
    echo Options:
    echo 1^) Run enhanced verbose demo ^(recommended^)
    echo 2^) Run simple quick demo
    echo.
    set /p choice="Choose option (1-2, default: 1): "
    
    if "!choice!"=="" set choice=1
    if "!choice!"=="1" (
        echo.
        echo 🎯 Launching enhanced verbose demo...
        echo This provides detailed progress, health checks, and troubleshooting info.
        echo.
        "%VERBOSE_SCRIPT%"
        exit /b 0
    )
    if "!choice!"=="2" (
        echo.
        echo 🔄 Running simple demo...
    ) else (
        echo.
        echo 🎯 Launching enhanced verbose demo ^(default^)...
        "%VERBOSE_SCRIPT%"
        exit /b 0
    )
)

REM Original simple demo logic (fallback)
echo This demo requires minimal setup and runs
echo with sample data for evaluation purposes.
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is required for the demo.
    echo Download: https://docs.docker.com/desktop/install/windows-install/
    pause
    exit /b 1
)

echo [INFO] Starting demo environment...
docker-compose -f docker-compose.demo.yml down
docker-compose -f docker-compose.demo.yml up -d --build

if %errorlevel% neq 0 (
    echo [ERROR] Failed to start demo. Check Docker Desktop is running.
    pause
    exit /b 1
)

echo.
echo ====================================
echo  Demo Started Successfully!
echo ====================================
echo.
echo Frontend: http://localhost:3000
echo Backend API: http://localhost:5000
echo Health Check: http://localhost:5000/api/health
echo.
echo Features in Demo:
echo - Sample trading data
echo - ML model demonstrations  
echo - Dashboard interface
echo - Basic trading simulations
echo.
echo To stop demo: docker-compose -f docker-compose.demo.yml down
echo.
echo 💡 Tip: For enhanced verbose demo with detailed progress tracking,
echo    run: %VERBOSE_SCRIPT%
echo.
echo Opening demo in browser...
timeout /t 3 >nul
start http://localhost:3000