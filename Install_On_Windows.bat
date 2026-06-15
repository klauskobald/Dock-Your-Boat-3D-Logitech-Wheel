@echo off
REM ===================================================================
REM  Dock Your Boat - Logitech Wheel setup for Windows.
REM  Just double-click this file. It installs everything the wheel
REM  needs. Run it once.
REM ===================================================================

REM Work from the folder this script lives in.
cd /d "%~dp0"

echo.
echo ===================================================
echo   Dock Your Boat - Logitech Wheel - Windows Setup
echo ===================================================
echo.

REM 1. Make sure Node.js is installed.
where node >nul 2>nul
if errorlevel 1 (
    echo Node.js is not installed yet.
    echo.
    echo Please install it first ^(it is free^):
    echo   1^) A web page will open now.
    echo   2^) Download the big green "LTS" button and install it.
    echo   3^) Then run this setup again.
    echo.
    start "" "https://nodejs.org/en/download/"
    echo.
    pause
    exit /b 1
)

for /f "delims=" %%v in ('node -v') do set NODEVER=%%v
echo Found Node.js %NODEVER%.
echo.

REM 2. Install the project dependencies.
REM     NOTE: 'call' is required because npm is itself a .cmd script.
echo Installing... (this can take a minute the first time)
call npm install
if errorlevel 1 (
    echo.
    echo Something went wrong during install. Please send the text above for help.
    echo.
    pause
    exit /b 1
)

echo.
echo Setup complete!  You are ready to use the wheel.
echo.
echo To start the wheel now, type:  npm run drive
echo (See README.md for the full guide.)
echo.

REM 3. Offer to start right away.
set /p ANSWER="Start the wheel now? [y/N] "
if /i "%ANSWER%"=="y" (
    echo.
    call npm run drive
) else (
    echo OK. Run "npm run drive" whenever you want to play.
)

echo.
pause
