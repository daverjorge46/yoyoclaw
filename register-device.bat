@echo off
chcp 65001 >nul
title Register Device with Moltbot Cluster

set "SERVER=root@38.14.254.51"
set "DB_API_URL=http://38.14.254.51:18800"

echo ========================================
echo   Register Device with Cluster
echo ========================================
echo.
echo This will register this device with the Moltbot cluster database.
echo.

set "DEVICE_NAME=%COMPUTERNAME%"
set "DEVICE_TYPE=notebook"

REM Detect device type
echo Select device type:
echo [1] Notebook/Laptop
echo [2] Desktop
echo [3] Server
echo.
choice /C 123 /N /M "Select (1-3)"
if errorlevel 3 set "DEVICE_TYPE=server"
if errorlevel 2 set "DEVICE_TYPE=desktop"
if errorlevel 1 set "DEVICE_TYPE=notebook"

echo.
echo Device name: %DEVICE_NAME%
echo Device type: %DEVICE_TYPE%
echo.

REM Get local IP address
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /C:"IPv4"') do (
    set "IP_ADDRESS=%%a"
    set "IP_ADDRESS=!IP_ADDRESS: =!"
)
if "%IP_ADDRESS%"=="" set "IP_ADDRESS=unknown"

echo Local IP: %IP_ADDRESS%
echo.

choice /C YN /M "Register this device"
if errorlevel 2 (
    echo Registration cancelled
    pause
    exit /b 0
)

echo.
echo Registering device...

REM Use curl to register with the database API
curl -s -X POST "%DB_API_URL%/api/device" ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"%DEVICE_NAME%\",\"type\":\"%DEVICE_TYPE%\",\"ip\":\"%IP_ADDRESS%\",\"status\":\"online\"}" ^
  -o "%TEMP%\register-response.json"

if errorlevel 1 (
    echo.
    echo WARNING: Could not connect to cluster database
    echo.
    echo You can register manually by running:
    echo   ssh %SERVER% "python3 /opt/moltbot-sync/db-storage.py update-device %DEVICE_NAME% %DEVICE_TYPE% %IP_ADDRESS%"
    echo.
) else (
    type "%TEMP%\register-response.json"
    echo.
    echo Device registered successfully!
)

REM Add device to server's known hosts
echo.
echo Adding device to monitoring system...
ssh %SERVER% "python3 /opt/moltbot-sync/db-storage.py update-device %DEVICE_NAME% %DEVICE_TYPE% %IP_ADDRESS% online"

echo.
echo ========================================
echo   Registration Complete
echo ========================================
echo.
echo Device: %DEVICE_NAME%
echo Type: %DEVICE_TYPE%
echo Status: Registered
echo.
echo You can now view this device in:
echo - Admin Panel: admin-panel.html
echo - Grafana: http://38.14.254.51:3000
echo.
pause
