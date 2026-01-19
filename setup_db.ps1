# Script para conectar a MySQL y crear la BD
$MySQLPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
$SQLFile = "c:\Users\justi\GOHOME\scripts\setup_db.sql"
$ScriptPath = "C:\Users\justi\GOHOME"

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║          Configuración de Base de Datos - GOHOME           ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Pedir credenciales
$MySQLUser = Read-Host "Usuario MySQL (por defecto: root)"
if ([string]::IsNullOrEmpty($MySQLUser)) { $MySQLUser = "root" }

Write-Host "Ingresa la contraseña (si no tiene, presiona Enter):" -ForegroundColor Yellow
$MySQLPass = Read-Host -AsSecureString
$MySQLPassPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToCoTaskMemUnicode($MySQLPass))

Write-Host ""
Write-Host "Conectando a MySQL..." -ForegroundColor Green

# Intentar conectar y ejecutar el SQL
if ([string]::IsNullOrEmpty($MySQLPassPlain)) {
    # Sin contraseña
    & $MySQLPath -h 127.0.0.1 -u $MySQLUser -e "SOURCE $SQLFile" 2>&1
} else {
    # Con contraseña
    & $MySQLPath -h 127.0.0.1 -u $MySQLUser -p"$MySQLPassPlain" -e "SOURCE $SQLFile" 2>&1
}

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Base de datos creada exitosamente!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Ahora actualiza el archivo .env con:" -ForegroundColor Yellow
    Write-Host "   DB_USER=$MySQLUser"
    if (-not [string]::IsNullOrEmpty($MySQLPassPlain)) {
        Write-Host "   DB_PASS=$MySQLPassPlain"
    }
    Write-Host ""
    Write-Host "Luego ejecuta: npm start" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "❌ Error al crear la base de datos" -ForegroundColor Red
    Write-Host "Verifica que:" -ForegroundColor Yellow
    Write-Host "  1. MySQL está corriendo"
    Write-Host "  2. Usuario y contraseña son correctos"
    Write-Host "  3. Tienes permisos para crear BDs"
}

Write-Host ""
Read-Host "Presiona Enter para salir"
