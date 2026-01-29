@echo off
chcp 65001 >nul
title Moltbot Session Sync

set "MOLTBOT_DIR=%USERPROFILE%\.clawdbot"
set "SESSION_DIR=%MOLTBOT_DIR%\agents\main\sessions"
set "SYNC_LOG=%MOLTBOT_DIR%\sync.log"

echo ========================================
echo   Moltbot Session Sync
echo ========================================
echo.

if not exist "%SESSION_DIR%" (
    echo ERROR: Session directory not found
    echo Please start Moltbot first
    pause
    exit /b 1
)

echo Syncing sessions to server...
echo.

set TIMESTAMP=%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set HOSTNAME=%COMPUTERNAME%

echo Timestamp: %TIMESTAMP%
echo Hostname: %HOSTNAME%
echo.

rem 创建临时备份目录
set "TEMP_DIR=%TEMP%\moltbot-sync"
if exist "%TEMP_DIR%" rmdir /s /q "%TEMP_DIR%"
mkdir "%TEMP_DIR%"

rem 复制会话文件
xcopy /E /I /Y "%SESSION_DIR%" "%TEMP_DIR%\" >nul 2>&1
if errorlevel 1 (
    echo WARNING: No sessions to copy
) else (
    echo Sessions copied: %TEMP_DIR%
    echo.

    rem 上传到服务器（需要配置 SSH 密钥）
    echo Uploading to server...
    scp -r "%TEMP_DIR%" root@38.14.254.51:/opt/moltbot-backup/sessions/%HOSTNAME%_%TIMESTAMP%
    if errorlevel 1 (
        echo.
        echo WARNING: SCP failed
        echo.
        echo Make sure SSH keys are configured:
        echo   1. Run: ssh-keygen -t rsa
        echo   2. Copy key: ssh-copy-id root@38.14.254.51
        echo.
        echo Alternative: Use manual sync
    ) else (
        echo Upload successful!
    )
)

rem 清理
if exist "%TEMP_DIR%" rmdir /s /q "%TEMP_DIR%"

echo.
echo Sync completed: %date% %time%
echo.
pause
