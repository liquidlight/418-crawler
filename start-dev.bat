@echo off
REM Site Crawler Development Server Startup Script for Windows
REM Starts both the CORS proxy server and the Vue dev server

setlocal enabledelayedexpansion

echo.
echo 🚀 Starting Site Crawler Development Environment...
echo.

REM Check if node_modules exist
if not exist "node_modules" (
    echo 📦 Installing main dependencies...
    call npm install
)

if not exist "proxy-server\node_modules" (
    echo 📦 Installing proxy server dependencies...
    cd proxy-server
    call npm install
    cd ..
)

echo.
echo ✅ All dependencies installed
echo.
echo 🌐 Starting services...
echo    - CORS Proxy Server: http://localhost:8080
echo    - Dev Server: http://localhost:5173
echo.

REM Use PowerShell to find an available port starting from 8080
for /f "delims=" %%A in ('powershell -Command "
$port = 8080
while ($true) {
    $connection = Test-NetConnection -ComputerName localhost -Port $port -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
    if ($connection.TcpTestSucceeded -eq $false) {
        Write-Host $port
        break
    }
    $port++
}
"') do set PROXY_PORT=%%A

if %PROXY_PORT% neq 8080 (
    echo.
    echo ⚠️  Port 8080 is in use
    echo    Using port %PROXY_PORT% instead
)

REM Start proxy server in background
echo Starting CORS proxy server on port %PROXY_PORT%...
set PROXY_PORT=%PROXY_PORT%
start "Site Crawler Proxy" cmd /k npm run proxy

REM Wait for proxy to be ready
echo Waiting for proxy server to start...
set MAX_ATTEMPTS=30
set ATTEMPT=0

:check_proxy_loop
if %ATTEMPT% geq %MAX_ATTEMPTS% (
    echo.
    echo ❌ Error: Proxy server failed to start
    echo    - Check if port %PROXY_PORT% is available
    echo    - Check proxy-server/server.js for errors
    pause
    exit /b 1
)

REM Use PowerShell to check if proxy is available
powershell -Command "try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $response = Invoke-WebRequest -Uri 'http://localhost:%PROXY_PORT%/health' -TimeoutSec 1 -UseBasicParsing; exit 0 } catch { exit 1 }"

if errorlevel 1 (
    set /a ATTEMPT=ATTEMPT+1
    timeout /t 1 /nobreak > nul
    goto check_proxy_loop
)

echo ✅ Proxy server is ready (http://localhost:%PROXY_PORT%)
echo.
echo Starting Vue dev server...
REM Pass PROXY_PORT to the new command window
start "Site Crawler Dev" cmd /k "set PROXY_PORT=%PROXY_PORT% & npm run dev"

echo.
echo ✅ All services started successfully!
echo.
echo 🌐 Open your browser: http://localhost:5173
echo 🌐 Proxy server: http://localhost:%PROXY_PORT%
echo.
echo Note: Close the proxy and dev server windows to stop services
echo.
pause
