@echo off
title Time Matrix - Restart Server
color 0e

cd /d "%~dp0"

echo ======================================================================
echo                    TIME MATRIX - RESTART SERVER
echo ======================================================================
echo.
echo  [1/2] Stopping any existing Time Matrix server on port 10000...

:: Stop existing processes on port 10000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :10000 ^| findstr LISTENING') do (
    if not "%%a"=="" if not "%%a"=="0" (
        taskkill /F /PID %%a >nul 2>&1
    )
)

:: Terminate background python app.py instances
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$procs = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*app.py*' -and $_.ProcessId -ne $PID };" ^
    "foreach ($p in $procs) { Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue; }" >nul 2>&1

timeout /t 1 /nobreak >nul

echo  [+] Existing instances cleared.
echo.
echo  [2/2] Starting fresh Time Matrix server...
echo.

:: Launch START_SERVER.bat
call "%~dp0START_SERVER.bat"
