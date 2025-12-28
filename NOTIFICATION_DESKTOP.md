Desktop notifier (Windows) — instrucciones

Qué hace
- Ejecuta un proceso Python que consulta tu servidor local (`http://localhost:3001`) cada minuto.
- Detecta: inquilinos agregados, actualizados, eliminados; inmuebles agregados, actualizados, eliminados; además notifica cuando a un inquilino le falta ≤ 24 horas ("Pago próximo") y cuando su tiempo se ha vencido ("Pago vencido").
- Envía notificaciones nativas en Windows (toast) y guarda estado para evitar duplicados.

Instalación (Windows)
1. Instala Python 3.8+ si aún no lo tienes.
2. Crea entorno virtual (opcional) y activa:
   python -m venv .venv
   .\.venv\Scripts\activate
3. Instala dependencias:
   pip install requests win10toast

Ejecutar
- Desde la carpeta del proyecto:
  python desktop_notifier.py

Ejecución en segundo plano (Tarea Programada)
- Se incluyeron scripts para instalar/desinstalar una Tarea Programada de Windows:
  - `install_notifier_task.ps1` — crea la tarea (evento: OnLogon del usuario) y la intenta iniciar inmediatamente.
  - `uninstall_notifier_task.ps1` — elimina la tarea creada.

Uso rápido:
1. Abre PowerShell en la carpeta del proyecto (preferible con permisos de usuario normales).
2. Ejecuta: `.\
un_notifier.bat` (prueba manualmente primero).
3. Para instalar la tarea que ejecutará el notificador al iniciar sesión: `.\
egister_notifier_task.ps1` o `.\install_notifier_task.ps1`.
4. Para eliminar la tarea: `.\uninstall_notifier_task.ps1`.

Nota sobre permisos:
- El script usa `schtasks` en modo limitado (`/RL LIMITED`) para no requerir privilegios de administrador en la mayoría de los casos si se crea para el usuario actual.

Alternativa: NSSM (instrumento externo)
- Si prefieres ejecutarlo como servicio system-wide, puedes usar NSSM (https://nssm.cc/). Tras instalar NSSM, ejecuta algo similar a:
  - `nssm install GoHomeNotifier "C:\Path\to\run_notifier.bat"`
- NSSM te permite reinicios automáticos, logs y configuración avanzada, pero requiere instalar una herramienta externa.

Variables de entorno (opcional)
- API_BASE: base URL de la API (por defecto http://localhost:3001)
- NOTIFIER_POLL_S: intervalo de polling en segundos (por defecto 60)
- NOTIFIER_RED_ZONE_S: segundos para zona roja (por defecto 24*3600)

Limitaciones y notas
- Para que las notificaciones de "Pago próximo" funcionen correctamente, asegúrate de que la API `/inquilinos` devuelva `endTime` en milisegundos (como en la app actual).
- Si quieres notificaciones push desde servidor (sin polling), puedo añadir soporte WebSocket o integración Push (se requiere servidor que envíe eventos y configuración extra).
