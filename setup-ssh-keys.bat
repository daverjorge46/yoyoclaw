@echo off
chcp 65001 >nul
title Setup SSH Keys for Moltbot Sync

echo ========================================
echo   Moltbot SSH Key Setup
echo ========================================
echo.
echo This will configure SSH keys for passwordless session sync
echo.

set "SSH_DIR=%USERPROFILE%\.ssh"
set "SERVER=root@38.14.254.51"

REM Check if .ssh directory exists
if not exist "%SSH_DIR%" (
    echo Creating .ssh directory...
    mkdir "%SSH_DIR%"
)

REM Check if key already exists
if exist "%SSH_DIR%\id_rsa" (
    echo SSH key already exists at %SSH_DIR%\id_rsa
    echo.
    choice /C YN /M "Do you want to generate a new key"
    if errorlevel 2 goto skip_keygen
)

echo.
echo Generating SSH key pair...
ssh-keygen -t rsa -f "%SSH_DIR%\id_rsa" -N "" -C "moltbot-sync@%COMPUTERNAME%"
if errorlevel 1 (
    echo ERROR: Failed to generate SSH key
    echo Make sure ssh-keygen is installed (Git Bash or OpenSSH)
    pause
    exit /b 1
)
echo SSH key generated successfully!

:skip_keygen

echo.
echo ========================================
echo   Copy Public Key to Server
echo ========================================
echo.
echo You need to copy the public key to the server.
echo.
echo Method 1: Automatic (requires password once)
echo -------------------------------------------
type "%SSH_DIR%\id_rsa.pub"
echo.
echo The above public key will be copied to: %SERVER%
echo.
choice /C YN /M "Continue with automatic setup"
if errorlevel 2 goto manual_setup

echo.
echo Copying public key to server...
type "%SSH_DIR%\id_rsa.pub" | ssh %SERVER% "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys"
if errorlevel 1 (
    echo.
    echo WARNING: Automatic copy failed
    echo.
    goto manual_setup
)

echo.
echo Public key copied successfully!
goto test_connection

:manual_setup
echo.
echo ========================================
echo   Manual Setup Instructions
echo ========================================
echo.
echo 1. Copy the public key below:
echo.
type "%SSH_DIR%\id_rsa.pub"
echo.
echo 2. Run this command on the server:
echo.
echo   ssh %SERVER%
echo   mkdir -p ~/.ssh
echo   chmod 700 ~/.ssh
echo   nano ~/.ssh/authorized_keys
echo.
echo 3. Paste the public key and save (Ctrl+X, Y, Enter)
echo.
echo 4. Set permissions:
echo.
echo   chmod 600 ~/.ssh/authorized_keys
echo.
pause

:test_connection
echo.
echo ========================================
echo   Test SSH Connection
echo ========================================
echo.
echo Testing passwordless connection to %SERVER%...
echo.

ssh -o BatchMode=yes -o ConnectTimeout=5 %SERVER% "echo 'Connection successful!'"
if errorlevel 1 (
    echo.
    echo WARNING: Passwordless connection test failed
    echo You may need to enter your password once for SSH to cache the key
    echo.
    echo Try running: ssh %SERVER%
    echo.
) else (
    echo.
    echo SUCCESS: Passwordless SSH connection is working!
    echo Session sync will work without requiring a password.
)

echo.
echo ========================================
echo   Setup Complete
echo ========================================
echo.
echo SSH key location: %SSH_DIR%\id_rsa
echo Server: %SERVER%
echo.
echo You can now run sync-sessions.bat without entering a password.
echo.
pause
