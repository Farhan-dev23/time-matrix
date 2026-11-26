@echo off
title Time Matrix - Stop Server
color 0e

:: Change directory to the folder containing this batch script
cd /d "%~dp0"

echo ======================================================================
echo                     TIME MATRIX - STOP SERVER
echo ======================================================================
echo.
echo  [*] Checking for running Time Matrix server on port 10000...
echo.

set "KILLED=0"

:: 1. Search for any process listening on port 10000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :10000 ^| findstr LISTENING') do (
    if not "%%a"=="" if not "%%a"=="0" (
        echo  [!] Found active server process on port 10000 (PID: %%a)
        echo  [*] Terminating process %%a...
        taskkill /F /PID %%a >nul 2>&1
        if not errorlevel 1 (
            set "KILLED=1"
            echo  [+] Successfully stopped process (PID: %%a).
        )
    )
)

:: 2. Also search for any dangling Python processes running app.py from this directory
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$ws = (Get-Location).Path.Replace('\', '\\');" ^
    "$procs = Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*app.py*' -and $_.ProcessId -ne $PID };" ^
    "foreach ($p in $procs) {" ^
    "    Write-Host '  [*] Terminating background Python instance (PID:' $p.ProcessId ')';" ^
    "    Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue;" ^
    "    $global:KILLED = 1;" ^
    "}" >nul 2>&1

:: Final Status Check
powershell -NoProfile -Command "if (Get-NetTCPConnection -LocalPort 10000 -ErrorAction SilentlyContinue) { exit 1 } else { exit 0 }" >nul 2>&1
if %errorlevel% equ 0 (
    if "%KILLED%"=="1" (
        color 0a
        echo.
        echo ======================================================================
        echo   [+] SUCCESS: Time Matrix server has been completely stopped!
        echo   [+] Port 10000 is now free.
        echo ======================================================================
    ) else (
        color 0b
        echo  [*] Time Matrix server is not currently running.
        echo      Port 10000 is already free.
    )
) else (
    color 0c
    echo.
    echo  [!] WARNING: Port 10000 still appears to be occupied.
    echo      Please try running this script as Administrator.
)

echo.
echo  Window will close in 3 seconds or press any key...
timeout /t 3 >nul 2>&1
exit /b 0
