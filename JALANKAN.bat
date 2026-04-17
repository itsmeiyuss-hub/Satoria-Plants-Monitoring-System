@echo off
echo.
echo  ====================================
echo   Satoria Plant Monitoring System
echo  ====================================
echo.

:: Check if node_modules exists
IF NOT EXIST "node_modules\" (
    echo  [1/2] Menginstall dependencies...
    npm install
    echo.
)

echo  [2/2] Menjalankan server...
echo.
echo  Buka browser dan akses:
echo  http://localhost:3000
echo.
echo  Tekan Ctrl+C untuk menghentikan server.
echo.

node server.js
pause
