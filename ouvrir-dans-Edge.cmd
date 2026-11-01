@echo off
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
 start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" "%~dp0JACK22-STUDIO-LOT8.9.html"
 exit /b
)
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
 start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" "%~dp0JACK22-STUDIO-LOT8.9.html"
 exit /b
)
start "" "%~dp0JACK22-STUDIO-LOT8.9.html"
