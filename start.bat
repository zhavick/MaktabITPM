@echo off
echo ===================================================
echo   Enterprise Project Management Application
echo   ASP.NET Core 8 Web API + Vite React + MySQL
echo ===================================================

echo.
echo [1/3] Menjalankan Docker MySQL (jika Docker Desktop aktif)...
docker compose up -d 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [INFO] Docker daemon tidak terdeteksi. Sistem akan otomatis menggunakan database SQLite lokal yang persisten.
)

echo.
echo [2/3] Memulai Backend ASP.NET Core 8 Web API di port 5000...
start "Project Management Backend API" cmd /k "dotnet run --project backend/ProjectManagement.Api.csproj --launch-profile http"

echo.
echo [3/3] Memulai Frontend Vite + React di port 5173...
set "PATH=C:\Program Files\nodejs;%PATH%"
start "Project Management Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ===================================================
echo   Aplikasi telah berjalan!
echo   Frontend : http://localhost:5173
echo   Swagger  : http://localhost:5000/swagger
echo ===================================================
echo.
pause
