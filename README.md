# Servidor local para la app P_israel

Este servidor provee endpoints mínimos para sincronizar los datos de la aplicación frontend con una base JSON local (`db.json`).

Endpoints:
- `GET /` - health
- `GET /inquilinos` - listar inquilinos
- `POST /inquilinos` - crear inquilino
- `PUT /inquilinos/:id` - reemplazar inquilino
- `PATCH /inquilinos/:id` - actualizar campos
- `DELETE /inquilinos/:id` - eliminar
- `GET /pagosIncompletos` - listar pagos incompletos
- `POST /pagosIncompletos` - agregar pago incompleto
- `DELETE /pagosIncompletos/:id` - eliminar pago incompleto

Instalación y ejecución (PowerShell):

```powershell
Set-Location -Path "C:\Users\Justin Adrian\OneDrive\Desktop\P_israel"
npm install
npm start
```
