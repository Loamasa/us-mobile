@echo off
cd /d "%~dp0" || exit /b 1
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -NoExit -Command ". .\scripts\Use-ProjectToolchain.ps1"
