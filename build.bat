@echo off
REM Site Crawler - Build and Package Script (Windows)
REM This script builds the production bundle and creates a distributable package

setlocal enabledelayedexpansion

echo.
echo 7 Site Crawler Build ^& Package Script
echo ======================================
echo.

REM Check Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Error: Node.js is not installed or not in PATH
    exit /b 1
)

echo.
for /f "tokens=*" %%i in ('node -v') do echo OK Node.js %%i detected

REM Step 1: Install dependencies
echo.
echo 1 Step 1: Installing dependencies...
call npm install --silent
if %ERRORLEVEL% NEQ 0 (
    echo Error: npm install failed
    exit /b 1
)
echo OK Dependencies installed

REM Step 2: Build the Vue app
echo.
echo 2 Step 2: Building Vue app...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo Error: npm run build failed
    exit /b 1
)
echo OK Vue app built successfully

REM Step 3: Create package
echo.
echo 3 Step 3: Creating distribution package...
call npm run package
if %ERRORLEVEL% NEQ 0 (
    echo Error: npm run package failed
    exit /b 1
)
echo OK Package created successfully

REM Step 4: Install proxy dependencies
echo.
echo 4 Step 4: Installing proxy server dependencies...
cd site-crawler-package\proxy-server
call npm install --silent --production
cd ..\..
echo OK Proxy server dependencies installed

echo.
echo.
echo OK Build Complete!
echo.
echo Folder location: site-crawler-package\
echo.
echo To run locally:
echo    cd site-crawler-package
echo    npm install
echo    npm start
echo.
echo Then open: http://localhost:5173
echo.

pause
