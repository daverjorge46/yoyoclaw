@echo off
chcp 65001 >nul
title Moltbot Notebook Auto Deployment

set "REPO_URL=https://github.com/flowerjunjie/moltbot.git"
set "INSTALL_DIR=C:\moltbot"
set "CONFIG_DIR=%USERPROFILE%\.clawdbot"

echo ========================================
echo   Moltbot Notebook Auto Deployment
echo ========================================
echo.
echo This script will automatically install Moltbot on this notebook.
echo.
echo Installation directory: %INSTALL_DIR%
echo Configuration directory: %CONFIG_DIR%
echo.

REM Check if Git is installed
where git >nul 2>&1
if errorlevel 1 (
    echo ERROR: Git is not installed
    echo Please install Git from: https://git-scm.com/downloads
    pause
    exit /b 1
)

REM Check if Node.js is installed
where node >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed
    echo Please install Node.js from: https://nodejs.org/
    pause
    exit /b 1
)

echo [1/6] Checking prerequisites...
echo.
echo Git: OK
echo Node.js: OK
echo.

REM Clone or update repository
if exist "%INSTALL_DIR%\.git" (
    echo [2/6] Repository exists, updating...
    cd /d "%INSTALL_DIR%"
    git pull
) else (
    echo [2/6] Cloning repository...
    if exist "%INSTALL_DIR%" (
        echo Installation directory already exists (not a git repo)
        choice /C YN /M "Remove and re-clone"
        if errorlevel 2 (
            echo Installation cancelled
            pause
            exit /b 1
        )
        rmdir /s /q "%INSTALL_DIR%"
    )
    git clone "%REPO_URL%" "%INSTALL_DIR%"
    cd /d "%INSTALL_DIR%"
)

if errorlevel 1 (
    echo ERROR: Failed to clone repository
    pause
    exit /b 1
)
echo.

echo [3/6] Installing dependencies...
call pnpm install --silent
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    echo Trying with npm instead...
    call npm install --silent
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies with npm
        pause
        exit /b 1
    )
)
echo.

echo [4/6] Building Moltbot...
call pnpm build --silent
if errorlevel 1 (
    echo WARNING: Build failed, but continuing...
)
echo.

echo [5/6] Creating configuration...

REM Create config directory if not exists
if not exist "%CONFIG_DIR%" mkdir "%CONFIG_DIR%"

REM Check if config already exists
if exist "%CONFIG_DIR%\moltbot.json" (
    echo Configuration file already exists
    choice /C YN /M "Overwrite existing configuration"
    if errorlevel 2 goto skip_config
)

REM Create configuration file
(
echo {
echo   "gateway": {
echo     "mode": "hybrid",
echo     "bind": "lan",
echo     "auth": {"token": "moltbot-cluster-2024"}
echo   },
echo   "browser": {"enabled": true},
echo   "models": {
echo     "mode": "merge",
echo     "providers": {
echo       "minimax": {
echo         "baseUrl": "https://api.minimaxi.com/anthropic",
echo         "apiKey": "YOUR_API_KEY_HERE",
echo         "authHeader": true
echo       }
echo     }
echo   }
echo }
) > "%CONFIG_DIR%\moltbot.json"

echo Configuration created at: %CONFIG_DIR%\moltbot.json
echo.

:skip_config

echo [6/6] Creating shortcuts...

REM Create desktop shortcut
set "SHORTCUT=%USERPROFILE%\Desktop\Moltbot.lnk"
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT%'); $s.TargetPath = '%INSTALL_DIR%\Moltbot.bat'; $s.WorkingDirectory = '%INSTALL_DIR%'; $s.Save()"

echo.
echo ========================================
echo   Installation Complete!
echo ========================================
echo.
echo Desktop shortcut created: %SHORTCUT%
echo.
echo To configure your API key:
echo   1. Edit: %CONFIG_DIR%\moltbot.json
echo   2. Replace YOUR_API_KEY_HERE with your actual MiniMax API key
echo.
echo To start Moltbot:
echo   - Double-click the desktop shortcut
echo   - Or run: %INSTALL_DIR%\Moltbot.bat
echo.
echo To register this device with the cluster:
echo   - Run: %INSTALL_DIR%\register-device.bat
echo.

choice /C YN /M "Start Moltbot now"
if errorlevel 1 (
    start "" "%INSTALL_DIR%\Moltbot.bat"
)

echo.
echo Thank you for installing Moltbot!
echo.
pause
