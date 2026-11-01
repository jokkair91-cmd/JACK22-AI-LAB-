@echo off
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
 start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" "%~dp0JACK22-STUDIO-9.2-CANDIDATE.html"
 exit /b
)
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
 start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" "%~dp0JACK22-STUDIO-9.2-CANDIDATE.html"
 exit /b
)
start "" "%~dp0JACK22-STUDIO-9.2-CANDIDATE.html"
