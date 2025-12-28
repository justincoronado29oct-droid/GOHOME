# install_notifier_task.ps1
# Crea una Tarea Programada que ejecuta run_notifier.bat al inicio de sesión del usuario actual.
# Uso: Abrir PowerShell y ejecutar: .\install_notifier_task.ps1

$taskName = 'GoHome_Desktop_Notifier'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$batPath = Join-Path $scriptDir 'run_notifier.bat'

if (-not (Test-Path $batPath)) {
  Write-Error "No se encontró $batPath. Asegúrate de ejecutar este script desde la carpeta del proyecto."
  exit 1
}

# Comando a ejecutar (usamos cmd.exe /c "ruta\run_notifier.bat")
$tr = "`"$batPath`""

# Crear tarea para el usuario actual al iniciar sesión (ONLOGON)
try {
  schtasks /Create /SC ONLOGON /RL LIMITED /TN $taskName /TR $tr /F | Out-Null
  Write-Host "Tarea programada '$taskName' creada (se ejecutará al iniciar sesión)."
} catch {
  Write-Error "Error creando la tarea: $_"
}

# Opcional: iniciar inmediatamente
try {
  schtasks /Run /TN $taskName | Out-Null
  Write-Host "Tarea iniciada (Run). Revisa el log 'desktop_notifier.log' para verificar que el notificador corra."
} catch {
  Write-Warning "No se pudo iniciar la tarea inmediatamente. Inicia sesión nueva para probarla o ejecuta la tarea desde el Programador de tareas."
}