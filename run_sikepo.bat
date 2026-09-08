@echo off
title SiKePo — Healthkathon BPJS Kesehatan 2026 Launcher
cd /d "D:\FamilyAgent\Nox\workspace\sikepo-app\backend"

:: Cek apakah port 7721 sudah aktif
netstat -ano | findstr /R /C:":7721 .*LISTENING" >nul
if %errorlevel% neq 0 (
    echo Starting SiKePo Backend on port 7721...
    start /b "" "C:\Users\Administrator\AppData\Local\Programs\Python\Python312\python.exe" main.py
    timeout /t 2 /nobreak >nul
)

echo Opening SiKePo Web Cockpit on port 7721...
start "" "http://127.0.0.1:7721/"
exit
