@echo off
title Time Matrix Local Server
color 0b

:: Change directory to the folder containing this batch script
cd /d "%~dp0"

echo ======================================================================
echo                     TIME MATRIX - LOCAL SERVER
echo ======================================================================
echo.
echo  [*] Checking Python installation...

:: Detect Python executable
set "PY_CMD=python"
where python >nul 2>nul
if %errorlevel% neq 0 (
    where py >nul 2>nul
    if %errorlevel% equ 0 (
        set "PY_CMD=py"
    ) else if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" (
        set "PY_CMD=%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
    ) else if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" (
        set "PY_CMD=%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
    ) else if exist "%ProgramFiles%\Python312\python.exe" (
        set "PY_CMD=%ProgramFiles%\Python312\python.exe"
    ) else (
        echo [ERROR] Python was not found on your system!
        echo Please ensure Python is installed and added to PATH.
        echo.
        pause
        exit /b 1
    )
)

echo  [+] Python found: %PY_CMD%
echo  [*] Launching Time Matrix server on http://localhost:10000/ ...
echo.

:: Automatically open browser after 2 seconds in the background
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:10000/"

echo ======================================================================
echo   Server is running at: http://localhost:10000/
echo   Your default web browser will open automatically in a moment.
echo.
echo   NOTE: Keep this window open while using Time Matrix.
echo         To stop the server, press Ctrl + C or simply close this window.
echo ======================================================================
echo.

:: Run Flask app
"%PY_CMD%" app.py

if %errorlevel% neq 0 (
    echo.
    echo [!] Server stopped with an error or exited.
    pause
)
