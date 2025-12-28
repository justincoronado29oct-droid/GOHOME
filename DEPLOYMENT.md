# Despliegue seguro y alta disponibilidad ✅

Resumen: indica pasos para subir la app de forma privada y asegurando que el servidor no se apague.

1) Preparar el proyecto
- Mover secretos a variables de entorno: crea `.env` a partir de `.env.example` y **no** commitees `.env`.
- Ejecuta `npm install` y `npm run start:prod` en un entorno seguro.
- Fija `NODE_ENV=production`.

2) Seguridad básica de la app 🔒
- Usar HTTPS (reverse proxy como Nginx, Caddy o Traefik y LetsEncrypt para TLS).
- Restringir orígenes con `CORS_ORIGINS` (no dejes * abierto en producción).
- Usar SMTP real para notificaciones y no la cuenta de prueba Ethereal en producción.
- Asegurar contraseñas y no exponer datos sensibles en logs.
- Reforzar autenticación: implementar JWT o sesiones con cookies seguras y expiración corta.

3) Alta disponibilidad / que el servidor nunca se apague 🚀
Opciones viables:
- PM2: `npm i -g pm2` luego `pm2 start ecosystem.config.js --env production` y `pm2 startup` + `pm2 save`. PM2 reinicia automáticamente en crash y puede configurarse para arrancar al reiniciar el servidor.
- Docker + docker-compose: usa `restart: always` y healthchecks; en producción añade orquestador (Kubernetes) si necesitas múltiples réplicas.
- En Linux, alternativa: crear un servicio systemd que ejecute `pm2` o `docker compose up -d`.
- Monitoreo externo: configura UptimeRobot / Pingdom y alertas por correo/Telegram.

4) Backups y mantenimiento 🗄️
- Exporta la base de datos regularmente (cron + `mysqldump`) a almacenamiento remoto (S3, Backblaze).
- Prueba tus backups y restaura periódicamente.

5) Firewall / acceso privado 🛡️
- Bloquea acceso al puerto del DB (3306) desde internet; sólo permitir desde la IP del servidor app.
- Si no quieres que la app sea pública, ponla detrás de VPN o usa Cloudflare Access / Tailscale para acceso privado.

6) Monitoreo y logs 📈
- Centraliza logs (Papertrail, Loki, ELK), rota logs y vigila errores.
- Habilita health checks y alertas.

7) Otras recomendaciones
- Usa un usuario DB con permisos mínimos.
- Ejecuta `npm audit` y mantén dependencias actualizadas.
- Registra y audita accesos administrativos.

---

Si quieres, puedo generar un `Dockerfile` y un `docker-compose.yml` o un script `install.sh`/`install.ps1` que automatice la instalación y configuración de PM2 en el servidor (incluyendo `pm2 startup`), o implementar JWT para las rutas. ¿Qué prefieres que haga ahora?