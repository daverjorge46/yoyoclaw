@echo off
chcp 65001 >nul
title Moltbot Auto Sync

echo Starting Moltbot Auto Sync...
echo Sync interval: 10 minutes
echo.

:loop
call "%~dp0sync-sessions.bat"

rem 等待10分钟
timeout /t 600 /nobreak >nul

goto loop
