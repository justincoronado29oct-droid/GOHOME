$mysqlPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"

Write-Host "Creando base de datos gohome_db..." -ForegroundColor Green

# Ejecutar el script SQL con la contraseña
$sqlContent = Get-Content "c:\Users\justi\GOHOME\create_db.sql" -Raw
$process = Start-Process -FilePath $mysqlPath -ArgumentList "-h 127.0.0.1 -u root -p`"F9!qZ7@M#2sLxW8`$`"" -NoNewWindow -Wait -RedirectStandardInput $null

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Base de datos creada exitosamente" -ForegroundColor Green
} else {
    Write-Host "❌ Error al crear la base de datos" -ForegroundColor Red
}
