@echo off
REM Site Crawler - Electron Build Script (Windows)
REM Builds standalone executables for Windows

setlocal enabledelayedexpansion

echo.
echo 7 Site Crawler - Electron Build
echo ================================
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

REM Step 2: Build Vue app
echo.
echo 2 Step 2: Building Vue app...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo Error: npm run build failed
    exit /b 1
)
echo OK Vue app built

REM Step 3: Install proxy dependencies
echo.
echo 3 Step 3: Installing proxy server dependencies...
cd proxy-server
call npm install --silent --production
cd ..
echo OK Proxy dependencies installed

REM Step 4: Build Electron app
echo.
echo 4 Step 4: Building Electron application...
echo 7 Building for Windows...
call npm run electron-build -- --win
if %ERRORLEVEL% NEQ 0 (
    echo Error: Electron build failed
    exit /b 1
)
echo OK Windows build complete

echo.
echo.
echo OK Electron Build Complete!
echo.
echo Folder location: dist\
echo.
echo Executables:
dir /B dist\*.exe 2>nul || echo (checking build outputs...)
echo.
echo Share the .exe file with users!
echo.

pause
