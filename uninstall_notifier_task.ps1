# uninstall_notifier_task.ps1
# Elimina la Tarea Programada creada por install_notifier_task.ps1

$taskName = 'GoHome_Desktop_Notifier'
try {
  schtasks /Delete /TN $taskName /F | Out-Null
  Write-Host "Tarea programada '$taskName' eliminada."
} catch {
  Write-Warning "No se pudo eliminar la tarea (posiblemente no exista)."
}