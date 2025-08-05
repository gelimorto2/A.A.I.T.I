@echo off
REM A.A.I.T.I Universal Installer - Windows Wrapper

echo.
echo ===================================================
echo  A.A.I.T.I v2.0.0 - Universal Installer
echo ===================================================
echo.

REM Check if running in Git Bash or WSL where bash is available
bash --version >nul 2>&1
if %errorlevel% equ 0 (
    echo Detected Bash environment - using universal installer
    bash install %*
    exit /b %errorlevel%
)

REM Fallback to Windows-specific installer
if exist "scripts\windows\install-impl.bat" (
    echo Using Windows-specific installer...
    call scripts\windows\install-impl.bat %*
) else (
    echo [ERROR] No Windows installer found.
    echo Please ensure you're in the A.A.I.T.I directory and try again.
    pause
    exit /b 1
)