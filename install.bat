@echo off
setlocal EnableDelayedExpansion
title ShellAssist - Automated EXE Builder

:: Ensure we run in the directory where install.bat is located
cd /d "%~dp0"

:: 0. Auto-elevate to Administrator
net session >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ============================================================================
    echo   Requesting Administrator Privileges for Windows EXE Packaging...
    echo ============================================================================
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
        "Start-Process -FilePath '%~f0' -WorkingDirectory '%~dp0' -Verb RunAs"
    exit /b 0
)

:: 1. Verify project structure
echo [1/4] Checking project structure...
if not exist "package.json" (
    echo [ERROR] package.json not found in %~dp0
    pause
    exit /b 1
)
if not exist "src\App.jsx" (
    echo [ERROR] src\App.jsx not found in %~dp0
    pause
    exit /b 1
)
if not exist "electron\main.cjs" (
    echo [ERROR] electron\main.cjs not found in %~dp0
    pause
    exit /b 1
)

:: Dynamically read version from package.json
for /f "delims=" %%v in ('powershell -NoProfile -Command "(Get-Content package.json -Raw | ConvertFrom-Json).version"') do set "APP_VER=%%v"
if "!APP_VER!"=="" set "APP_VER=1.0.0"

echo [OK] Project files verified (v!APP_VER!).
echo.
echo ============================================================================
echo   ShellAssist - Desktop Setup ^& EXE Builder (v!APP_VER!)
echo ============================================================================
echo.

:: 2. Check for Node.js
echo [2/4] Checking Node.js installation...
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [INFO] Node.js not detected. Installing LTS via winget...
    where winget >nul 2>nul
    if !ERRORLEVEL! equ 0 (
        winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
    ) else (
        echo [ERROR] winget not found. Please install Node.js LTS manually from https://nodejs.org
        pause
        exit /b 1
    )
    set "PATH=%PATH%;%ProgramFiles%\nodejs;%APPDATA%\npm"
)
for /f "delims=" %%v in ('node -v') do set NODE_VER=%%v
echo [OK] Node.js %NODE_VER% ready.

:: 3. Install dependencies (generates node_modules & package-lock.json)
echo.
echo [3/4] Installing application dependencies...
call npm install --no-audit --no-fund
if !ERRORLEVEL! neq 0 (
    echo [ERROR] npm install encountered an error.
    pause
    exit /b 1
)

:: 4. Compile React bundle (dist) and package Windows EXEs (dist-exe)
echo.
echo [4/4] Compiling React bundle and building Windows EXE (v!APP_VER!)...
set CSC_IDENTITY_AUTO_DISCOVERY=false
call npm run dist
if !ERRORLEVEL! neq 0 (
    echo [ERROR] Failed to compile Windows executable.
    pause
    exit /b 1
)

:: Refresh Windows Search & Explorer icon cache so Start Menu shows the custom icon
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "Get-ChildItem -Path \"$env:LOCALAPPDATA\Packages\" -Filter 'Microsoft.Windows.Search*' -Directory -ErrorAction SilentlyContinue | ForEach-Object { " ^
    "  $cacheDir = Join-Path $_.FullName 'LocalState\AppIconCache\100'; " ^
    "  if (Test-Path $cacheDir) { " ^
    "    Get-ChildItem -Path $cacheDir -Filter '*shellassist*' -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue " ^
    "  } " ^
    "}" >nul 2>nul
ie4uinit.exe -show >nul 2>nul

if exist "dist-exe" (
    echo.
    echo ============================================================================
    echo   SUCCESS: ShellAssist v!APP_VER! Installer ^& Portable EXE created in:
    echo   %~dp0dist-exe
    echo ============================================================================
    explorer "%~dp0dist-exe"
)
pause
exit /b 0