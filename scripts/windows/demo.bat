@echo off
REM A.A.I.T.I Universal Demo - Windows Wrapper

echo.
echo ===================================================
echo  A.A.I.T.I v2.0.0 - Universal Demo
echo ===================================================
echo.

REM Check if running in Git Bash or WSL where bash is available
bash --version >nul 2>&1
if %errorlevel% equ 0 (
    echo Detected Bash environment - using universal demo
    bash demo %*
    exit /b %errorlevel%
)

REM Fallback to Windows-specific demo
if exist "scripts\windows\demo-impl.bat" (
    echo Using Windows-specific demo...
    call scripts\windows\demo-impl.bat %*
) else (
    echo [ERROR] No Windows demo found.
    echo Please ensure you're in the A.A.I.T.I directory and try again.
    pause
    exit /b 1
)