@echo off
setlocal
echo ========================================
echo    OPF4896 SYSTEM - LOCAL SERVER
echo ========================================
echo Access the system from this computer at:
echo   http://localhost:5000
echo.
echo Searching for your local IP address...
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr "IPv4"') do (
    set ip=%%a
    goto :found
)
:found
set ip=%ip: =%
if "%ip%"=="" (
    echo Access from other devices: Please check your IP via ipconfig
) else (
    echo Access from other devices on your WiFi at:
    echo   http://%ip%:5000
)
echo ========================================
echo Press Ctrl+C to stop the server.
echo.

npm run serve
pause
