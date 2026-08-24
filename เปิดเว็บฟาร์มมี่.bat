@echo off
REM ดับเบิลคลิกไฟล์นี้เพื่อเปิดเว็บ Farmy Voice โดยไม่ต้องเปิด VS Code
REM ปิดหน้าต่างสีดำที่ขึ้นมา = เว็บดับ
chcp 65001 >nul
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0.vscode\start-dev.ps1" -Port 5174 -Dir "%~dp0farmy-voice" -Exe npm.cmd -ExeArgs "run,dev" -OpenBrowser
pause
