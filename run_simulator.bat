@echo off
REM ==== LiDAR ADAS Simulator launcher ====
cd /d "%~dp0"
set PY=%LOCALAPPDATA%\Programs\Python\Python312\python.exe
if not exist "%PY%" set PY=python
"%PY%" -m lidar_sim.desktop.app
if errorlevel 1 (
    echo.
    echo [!] The simulator exited with an error. Press any key to close.
    pause >nul
)
