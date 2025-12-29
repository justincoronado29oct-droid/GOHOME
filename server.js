// server.js — adaptado a gohome_db_new (con soporte para "mover a pendiente")
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const app = express();
const path = require("path");

mysql://root:dygyimgYzGMSTOormbYOcJvzLuiiQfUE@switchyard.proxy.rlwy.net:10788/railway
app.use(express.json());
app.use(express.static(path.join(__dirname)));// Servir archivos estáticos (CSS, JS, HTML)
app.use(express.static(path.join(__dirname, 'public')));



app.use(express.json());

// --- Aquí va lo nuevo ---
app.use(express.static(path.join(__dirname, 'public')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});








// conf proxy / seguridad
app.set('trust proxy', 1); // si usas reverse proxy
app.use(helmet());

const corsOptions = process.env.CORS_ORIGINS ? { origin: process.env.CORS_ORIGINS.split(',') } : { origin: true };
app.use(cors(corsOptions));
app.use(express.json());

// Rate limiter (ajustable con variables de entorno)
const limiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW_MS ? parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) : 15 * 60 * 1000,
  max: process.env.RATE_LIMIT_MAX ? parseInt(process.env.RATE_LIMIT_MAX, 10) : 200,
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// Forzar HTTPS si se configura en producción detrás de proxy (setear FORCE_HTTPS=1)
if (process.env.FORCE_HTTPS === '1') {
  app.use((req, res, next) => {
    if (req.secure || req.headers['x-forwarded-proto'] === 'https') return next();
    return res.redirect(`https://${req.headers.host}${req.url}`);
  });
} 

// ----------------- CONFIG DB -----------------
// IMPORTANT: move secrets to environment (.env) and DO NOT commit .env to git
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT),
  waitForConnections: true,
  connectionLimit: 5,
  connectTimeout: 30000,
  ssl: {
    rejectUnauthorized: false
  }
});

(async () => {
  try {
    const conn = await pool.getConnection();
    console.log("✅ Conectado a MySQL Railway");
    conn.release();
  } catch (err) {
    console.error("❌ Error MySQL:", err.code, err.message);
  }
})();

// ----------------- HELPERS -----------------
async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

function safeInt(v, fallback = null) {
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? fallback : n;
}
function safeFloat(v, fallback = null) {
  const n = parseFloat(v);
  return Number.isNaN(n) ? fallback : n;
}

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// ----------------- RUTAS CRUD -----------------

// --- UTIL: obtener direccion de inmueble por N_casa ---
async function getInmuebleByNCasa(N_casa) {
  if (N_casa == null) return null;
  const rows = await query('SELECT * FROM inmuebles WHERE N_casa = ? LIMIT 1', [safeInt(N_casa)]);
  return rows[0] || null;
}

app.get("/manifest.json", (req, res) => {
  res.sendFile(path.join(__dirname, "HTML", "manifest.json"));
});


// INQUILINOS
// GET todos: devuelve inquilinos + info del inmueble (si existe)
app.get('/inquilinos', async (req, res) => {
  try {
    const rows = await query(`
      SELECT i.*,
             im.N_casa AS inmueble_N_casa,
             im.direccion AS inmueble_direccion,
             im.sector AS inmueble_sector,
             im.municipio AS inmueble_municipio
      FROM inquilinos i
      LEFT JOIN inmuebles im ON i.N_casa IS NOT NULL AND i.N_casa = im.N_casa
      ORDER BY i.id DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error leyendo inquilinos' });
  }
});

// GET por id (incluye info del inmueble si corresponde)
app.get('/inquilinos/:id', async (req, res) => {
  try {
    const rows = await query(`
      SELECT i.*,
             im.N_casa AS inmueble_N_casa,
             im.direccion AS inmueble_direccion,
             im.sector AS inmueble_sector,
             im.municipio AS inmueble_municipio
      FROM inquilinos i
      LEFT JOIN inmuebles im ON i.N_casa IS NOT NULL AND i.N_casa = im.N_casa
      WHERE i.id = ?
      LIMIT 1
    `, [req.params.id]);
    res.json(rows[0] || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error leyendo inquilino' });
  }
});

// CREATE inquilino
app.post('/inquilinos', async (req, res) => {
  try {
    let { nombre, cedula, telefono, direccion, fecha_ospedaje, ingreso_mensual, descripcion, pago, N_casa } = req.body;

    // Validaciones básicas: requerir nombre, cedula, telefono, fecha_ospedaje, ingreso_mensual OR N_casa con inmueble existente
    if (!nombre || !cedula || !telefono || !fecha_ospedaje || ingreso_mensual == null) {
      return res.status(400).json({ error: 'Faltan campos requeridos (nombre, cedula, telefono, fecha_ospedaje, ingreso_mensual)' });
    }

    // Si se pasa N_casa, intentar obtener la direccion del inmueble y usarla como direccion del inquilino (prioridad)
    let inmueble = null;
    if (N_casa != null) {
      inmueble = await getInmuebleByNCasa(N_casa);
      if (inmueble) {
        direccion = inmueble.direccion;
      } else {
        // si N_casa fue pasado pero no existe el inmueble, regresamos error para evitar datos inconsistentes
        return res.status(400).json({ error: `No existe inmuebles con N_casa = ${N_casa}` });
      }
    }

    // Si no hay direccion determinada aún, exigirla
    if (!direccion) return res.status(400).json({ error: 'Direccion requerida (o pasa N_casa de un inmueble existente)' });

    const result = await query(
      `INSERT INTO inquilinos (nombre, cedula, telefono, direccion, fecha_ospedaje, ingreso_mensual, descripcion, pago, N_casa)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nombre,
        cedula,
        telefono,
        direccion,
        fecha_ospedaje,
        safeFloat(ingreso_mensual, 0),
        descripcion || null,
        pago == null ? null : safeFloat(pago, null),
        N_casa == null ? null : safeInt(N_casa, null)
      ]
    );

    const inserted = await query('SELECT * FROM inquilinos WHERE id = ?', [result.insertId]);
    res.status(201).json(inserted[0]);
    // notificar por email (no bloquear la respuesta)
    setImmediate(() => {
      try {
        const inq = inserted[0];
        const subject = `Nuevo inquilino agregado: ${inq.nombre}`;
        const html = `<p>Se ha agregado un nuevo inquilino: <strong>${inq.nombre}</strong></p><p>Cédula: ${inq.cedula || ''}</p><p>Dirección: ${inq.direccion || ''}</p>`;
        notifyAllUsers(subject, html, 'created', 'inquilino', inq.id, { inq });
      } catch (e) { console.warn('notify new inquilino error', e); }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creando inquilino' });
  }
});

// UPDATE inquilino
app.put('/inquilinos/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const fields = { ...req.body }; // posible keys: nombre, cedula, telefono, direccion, fecha_ospedaje, ingreso_mensual, descripcion, pago, N_casa

    // No permitir body vacío
    const keys = Object.keys(fields);
    if (keys.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' });

    // Si mandan N_casa, validar y, si existe inmueble, forzar direccion a la direccion del inmueble
    if (fields.N_casa !== undefined && fields.N_casa !== null) {
      const inmueble = await getInmuebleByNCasa(fields.N_casa);
      if (!inmueble) return res.status(400).json({ error: `No existe inmuebles con N_casa = ${fields.N_casa}` });
      // usar direccion del inmueble
      fields.direccion = inmueble.direccion;
      fields.N_casa = safeInt(fields.N_casa, null);
    }

    if (fields.ingreso_mensual !== undefined) fields.ingreso_mensual = safeFloat(fields.ingreso_mensual, null);
    if (fields.pago !== undefined) fields.pago = fields.pago === null ? null : safeFloat(fields.pago, null);

    const set = keys.map(k => `${k} = ?`).join(', ');
    const params = keys.map(k => fields[k]);
    params.push(id);

    await query(`UPDATE inquilinos SET ${set} WHERE id = ?`, params);
    const updated = await query('SELECT * FROM inquilinos WHERE id = ?', [id]);
    res.json(updated[0] || null);
    // notificar cambio
    setImmediate(() => {
      try {
        const inq = updated[0];
        const subject = `Inquilino actualizado: ${inq.nombre}`;
        const html = `<p>El inquilino <strong>${inq.nombre}</strong> ha sido actualizado.</p><pre>${JSON.stringify(inq)}</pre>`;
        notifyAllUsers(subject, html, 'updated', 'inquilino', inq.id, { inq });
      } catch (e) { console.warn('notify update inquilino error', e); }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error actualizando inquilino' });
  }
});

// DELETE inquilino (mover a papelera)
app.delete('/inquilinos/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const rows = await query('SELECT * FROM inquilinos WHERE id = ?', [id]);
    const item = rows[0];
    if (!item) return res.status(404).json({ error: 'No encontrado' });
    await query('INSERT INTO papelera (tipo, objeto) VALUES (?, ?)', ['inquilino', JSON.stringify(item)]);
    await query('DELETE FROM inquilinos WHERE id = ?', [id]);
    res.json({ deleted: true });
    // notificar eliminación
    setImmediate(() => {
      try {
        const subject = `Inquilino eliminado: ${item.nombre}`;
        const html = `<p>El inquilino <strong>${item.nombre}</strong> ha sido eliminado.</p><pre>${JSON.stringify(item)}</pre>`;
        notifyAllUsers(subject, html, 'deleted', 'inquilino', item.id, { item });
      } catch (e) { console.warn('notify delete inquilino error', e); }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error eliminando inquilino' });
  }
});

// INMUEBLES (sin cambios de comportamiento, sólo DB nueva)
app.get('/inmuebles', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM inmuebles ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error leyendo inmuebles' });
  }
});

app.post('/inmuebles', async (req, res) => {
  try {
    const { N_casa, direccion, sector, municipio, m_contruccion, m_terreno, descripcion } = req.body;
    if (N_casa == null || !direccion || !sector || !municipio) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }
    const result = await query(
      `INSERT INTO inmuebles (N_casa, direccion, sector, municipio, m_contruccion, m_terreno, descripcion)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [safeInt(N_casa, null), direccion, sector, municipio, m_contruccion || null, m_terreno || null, descripcion || null]
    );
    const inserted = await query('SELECT * FROM inmuebles WHERE id = ?', [result.insertId]);
    res.status(201).json(inserted[0]);
    // notificar por email sobre nuevo inmueble
    setImmediate(() => {
      try {
        const im = inserted[0];
        const subject = `Nuevo inmueble agregado: ${im.N_casa} - ${im.direccion}`;
        const html = `<p>Se ha agregado un nuevo inmueble: <strong>${im.N_casa}</strong></p><p>Dirección: ${im.direccion}</p>`;
        notifyAllUsers(subject, html, 'created', 'inmueble', im.id, { im });
      } catch (e) { console.warn('notify new inmueble error', e); }
    });
  } catch (err) {
    console.error(err);
    if (err && err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'N_casa ya existe' });
    res.status(500).json({ error: 'Error creando inmueble' });
  }
});

app.put('/inmuebles/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const fields = req.body;
    const keys = Object.keys(fields);
    if (keys.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' });
    if (fields.N_casa !== undefined) fields.N_casa = safeInt(fields.N_casa, null);
    const set = keys.map(k => `${k} = ?`).join(', ');
    const params = keys.map(k => fields[k]);
    params.push(id);
    await query(`UPDATE inmuebles SET ${set} WHERE id = ?`, params);
    const updated = await query('SELECT * FROM inmuebles WHERE id = ?', [id]);
    res.json(updated[0] || null);
    // notificar modificación
    setImmediate(() => {
      try {
        const im = updated[0];
        const subject = `Inmueble actualizado: ${im.N_casa}`;
        const html = `<p>El inmueble <strong>${im.N_casa}</strong> ha sido actualizado.</p><pre>${JSON.stringify(im)}</pre>`;
        notifyAllUsers(subject, html, 'updated', 'inmueble', im.id, { im });
      } catch (e) { console.warn('notify update inmueble error', e); }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error actualizando inmueble' });
  }
});

app.delete('/inmuebles/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const rows = await query('SELECT * FROM inmuebles WHERE id = ?', [id]);
    const item = rows[0];
    if (!item) return res.status(404).json({ error: 'No encontrado' });
    await query('INSERT INTO papelera (tipo, objeto) VALUES (?, ?)', ['inmueble', JSON.stringify(item)]);
    await query('DELETE FROM inmuebles WHERE id = ?', [id]);
    res.json({ deleted: true });
    setImmediate(() => {
      try {
        const subject = `Inmueble eliminado: ${item.N_casa} - ${item.direccion}`;
        const html = `<p>El inmueble <strong>${item.N_casa}</strong> ha sido eliminado.</p><pre>${JSON.stringify(item)}</pre>`;
        notifyAllUsers(subject, html, 'deleted', 'inmueble', item.id, { item });
      } catch (e) { console.warn('notify delete inmueble error', e); }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error eliminando inmueble' });
  }
});

// ----------------- PAGOS PENDIENTES (ajustado a tu esquema existente) -----------------

// GET pagos_pendientes (devuelve pagos + info del inquilino via JOIN)
app.get('/pagos_pendientes', async (req, res) => {
  try {
    const rows = await query(`
      SELECT pp.id AS pago_id, pp.id_inquilino, pp.monto, pp.fecha_pago,
             i.nombre AS inq_nombre, i.cedula AS inq_cedula, i.telefono AS inq_telefono, i.direccion AS inq_direccion
      FROM pagos_pendientes pp
      LEFT JOIN inquilinos i ON pp.id_inquilino = i.id
      ORDER BY pp.id DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error leyendo pagos_pendientes' });
  }
});

// POST /pagos_pendientes : crea un registro con id_inquilino y monto
app.post('/pagos_pendientes', async (req, res) => {
  try {
    const { id_inquilino, monto } = req.body;
    const idInt = safeInt(id_inquilino, null);
    const montoNum = safeFloat(monto, null);

    if (idInt == null) return res.status(400).json({ error: 'id_inquilino requerido y debe ser entero' });

    // validar que el inquilino exista
    const rows = await query('SELECT id, nombre, ingreso_mensual FROM inquilinos WHERE id = ?', [idInt]);
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'Inquilino no encontrado' });

    // si monto no fue pasado o es inválido, usar ingreso_mensual como monto por defecto
    const finalMonto = (montoNum == null) ? (Number(rows[0].ingreso_mensual) || 0) : montoNum;

    const result = await query(
      `INSERT INTO pagos_pendientes (id_inquilino, monto) VALUES (?, ?)`,
      [idInt, finalMonto]
    );

    const inserted = await query('SELECT * FROM pagos_pendientes WHERE id = ?', [result.insertId]);

    // opcional: intentar marcar inquilino como pendiente (si tienes columna estatus/activo)
    try {
      await query('UPDATE inquilinos SET estatus = ? WHERE id = ?', ['pendiente', idInt]);
    } catch (e) {
      // si no existe la columna, intentar activo = 0 y si falla, ignorar
      try { await query('UPDATE inquilinos SET activo = ? WHERE id = ?', [0, idInt]); } catch (e2) {}
    }

    res.status(201).json(inserted[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creando pago pendiente' });
  }
});

// POST /move_to_pendiente : helper que mueve un inquilino a pagos_pendientes usando ingreso_mensual
app.post('/move_to_pendiente', async (req, res) => {
  try {
    const { id_inquilino, motivo } = req.body;
    const idInt = safeInt(id_inquilino, null);
    if (idInt == null) return res.status(400).json({ error: 'id_inquilino requerido' });

    // buscar inquilino
    const rows = await query('SELECT * FROM inquilinos WHERE id = ?', [idInt]);
    const inq = rows[0];
    if (!inq) return res.status(404).json({ error: 'Inquilino no encontrado' });

    const monto = safeFloat(inq.ingreso_mensual, 0);

    const result = await query(
      `INSERT INTO pagos_pendientes (id_inquilino, monto) VALUES (?, ?)`,
      [idInt, monto]
    );

    // intentar marcar inquilino para consistencia (si la columna existe)
    try {
      await query('UPDATE inquilinos SET estatus = ? WHERE id = ?', ['pendiente', idInt]);
    } catch (e) {
      try { await query('UPDATE inquilinos SET activo = ? WHERE id = ?', [0, idInt]); } catch (e2) {}
    }

    const inserted = await query('SELECT * FROM pagos_pendientes WHERE id = ?', [result.insertId]);
    res.status(201).json({ moved: true, pagoPendiente: inserted[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error moviendo a pendiente' });
  }
});

app.put('/pagos_pendientes/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const fields = req.body;
    const keys = Object.keys(fields);
    if (keys.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' });
    if (fields.monto !== undefined) fields.monto = safeFloat(fields.monto, null);
    const set = keys.map(k => `${k} = ?`).join(', ');
    const params = keys.map(k => fields[k]);
    params.push(id);
    await query(`UPDATE pagos_pendientes SET ${set} WHERE id = ?`, params);
    const updated = await query('SELECT * FROM pagos_pendientes WHERE id = ?', [id]);
    res.json(updated[0] || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error actualizando pago pendiente' });
  }
});

app.delete('/pagos_pendientes/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const rows = await query('SELECT * FROM pagos_pendientes WHERE id = ?', [id]);
    const item = rows[0];
    if (!item) return res.status(404).json({ error: 'No encontrado' });
    await query('INSERT INTO papelera (tipo, objeto) VALUES (?, ?)', ['pago_pendiente', JSON.stringify(item)]);
    await query('DELETE FROM pagos_pendientes WHERE id = ?', [id]);
    res.json({ deleted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error eliminando pago pendiente' });
  }
});

// PAGOS INCOMPLETOS (igual)
app.get('/pagos_incompletos', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM pagos_incompletos ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error leyendo pagos_incompletos' });
  }
});

app.post('/pagos_incompletos', async (req, res) => {
  try {
    const { id_inquilino, nombre, cedula, direccion, monto, usuario_id, metadata, raw } = req.body;
    const result = await query(
      `INSERT INTO pagos_incompletos (id_inquilino, nombre, cedula, direccion, monto, usuario_id, metadata, raw)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id_inquilino ? safeInt(id_inquilino) : null,
        nombre || null,
        cedula || null,
        direccion || null,
        safeFloat(monto, 0),
        usuario_id ? safeInt(usuario_id) : null,
        metadata ? JSON.stringify(metadata) : null,
        raw || null
      ]
    );
    const inserted = await query('SELECT * FROM pagos_incompletos WHERE id = ?', [result.insertId]);
    res.status(201).json(inserted[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creando pago incompleto' });
  }
});

app.put('/pagos_incompletos/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const fields = req.body;
    if (fields.metadata) fields.metadata = JSON.stringify(fields.metadata);
    const keys = Object.keys(fields);
    if (keys.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' });
    const set = keys.map(k => `${k} = ?`).join(', ');
    const params = keys.map(k => fields[k]);
    params.push(id);
    await query(`UPDATE pagos_incompletos SET ${set} WHERE id = ?`, params);
    const updated = await query('SELECT * FROM pagos_incompletos WHERE id = ?', [id]);
    res.json(updated[0] || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error actualizando pago incompleto' });
  }
});

app.delete('/pagos_incompletos/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const rows = await query('SELECT * FROM pagos_incompletos WHERE id = ?', [id]);
    const item = rows[0];
    if (!item) return res.status(404).json({ error: 'No encontrado' });
    await query('INSERT INTO papelera (tipo, objeto) VALUES (?, ?)', ['pago_incompleto', JSON.stringify(item)]);
    await query('DELETE FROM pagos_incompletos WHERE id = ?', [id]);
    res.json({ deleted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error eliminando pago incompleto' });
  }
});

// PAPELERA
app.get('/papelera', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM papelera ORDER BY eliminado_en DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error leyendo papelera' });
  }
});

// DATA_USUARIOS / INFO_USUARIOS (idénticos)
app.get('/data_usuarios', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM data_usuarios ORDER BY USER_ID DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error leyendo data_usuarios' });
  }
});

app.post('/data_usuarios', async (req, res) => {
  try {
    const { NOMBRE, APELLIDO, NOMBRE_USUARIO, NUMERO_TELEFONICO, CONTRASEÑA } = req.body;
    if (!NOMBRE_USUARIO || !CONTRASEÑA) return res.status(400).json({ error: 'NOMBRE_USUARIO y CONTRASEÑA son requeridos' });
    const result = await query(
      `INSERT INTO data_usuarios (NOMBRE, APELLIDO, NOMBRE_USUARIO, NUMERO_TELEFONICO, CONTRASEÑA)
       VALUES (?, ?, ?, ?, ?)`,
      [NOMBRE || null, APELLIDO || null, NOMBRE_USUARIO, NUMERO_TELEFONICO || null, CONTRASEÑA]
    );
    const inserted = await query('SELECT * FROM data_usuarios WHERE USER_ID = ?', [result.insertId]);
    res.status(201).json(inserted[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creando data_usuario' });
  }
});

app.get('/info_usuarios', async (req, res) => {
  try {
    const rows = await query('SELECT * FROM info_usuarios ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error leyendo info_usuarios' });
  }
});

app.post('/info_usuarios', async (req, res) => {
  try {
    const { nombre, apellido, N_usuario, gmail, contrasena } = req.body;
    const result = await query(
      `INSERT INTO info_usuarios (nombre, apellido, N_usuario, gmail, contrasena)
       VALUES (?, ?, ?, ?, ?)`,
      [nombre || null, apellido || null, N_usuario || null, gmail || null, contrasena || null]
    );
    const inserted = await query('SELECT * FROM info_usuarios WHERE id = ?', [result.insertId]);
    res.status(201).json(inserted[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creando info_usuario' });
  }
});

// ---------- USERS / info_usuarios / auth ----------
const bcrypt = require('bcryptjs');

// ensure table exists
(async function ensureUserTable(){
  try {
    await query(`CREATE TABLE IF NOT EXISTS info_usuarios (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(120),
      apellido VARCHAR(120),
      N_usuario VARCHAR(100) UNIQUE,
      gmail VARCHAR(200) UNIQUE,
      contrasena VARCHAR(255),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);
    console.log('✅ Tabla info_usuarios verificada/creada');
  } catch(e){ console.warn('No se pudo crear/verificar tabla info_usuarios', e); }
})();

// GET users or check by gmail
app.get('/info_usuarios', async (req, res) => {
  try {
    const { gmail } = req.query;
    if (gmail) {
      const rows = await query('SELECT id, nombre, apellido, N_usuario, gmail, created_at FROM info_usuarios WHERE gmail = ? LIMIT 1', [gmail]);
      if (rows.length === 0) return res.json({ exists: false });
      return res.json({ exists: true, user: rows[0] });
    }
    const rows = await query('SELECT id, nombre, apellido, N_usuario, gmail, created_at FROM info_usuarios ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error leyendo info_usuarios' });
  }
});

// CREATE user (registro)
app.post('/info_usuarios', async (req, res) => {
  try {
    const { nombre, apellido, N_usuario, gmail, contrasena } = req.body;
    if (!N_usuario || !gmail || !contrasena) return res.status(400).json({ error: 'Faltan campos requeridos: N_usuario, gmail, contrasena' });
    // validar formato básico de gmail
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(gmail)) return res.status(400).json({ error: 'Gmail inválido' });

    // verificar unicidad
    const exists = await query('SELECT id FROM info_usuarios WHERE gmail = ? OR N_usuario = ? LIMIT 1', [gmail, N_usuario]);
    if (exists && exists.length > 0) return res.status(409).json({ error: 'El gmail o nombre de usuario ya existe' });

    // hash de contraseña
    const hash = await bcrypt.hash(contrasena, 10);

    const result = await query(
      `INSERT INTO info_usuarios (nombre, apellido, N_usuario, gmail, contrasena)
       VALUES (?, ?, ?, ?, ?)`,
      [nombre || null, apellido || null, N_usuario || null, gmail || null, hash]
    );
    const inserted = await query('SELECT id, nombre, apellido, N_usuario, gmail, created_at FROM info_usuarios WHERE id = ?', [result.insertId]);
    res.status(201).json(inserted[0]);
  } catch (err) {
    console.error(err);
    if (err && err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Gmail o nombre de usuario duplicado' });
    res.status(500).json({ error: 'Error creando info_usuario' });
  }
});

// GET perfil por id
app.get('/info_usuarios/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const rows = await query('SELECT id, nombre, apellido, N_usuario, gmail, created_at FROM info_usuarios WHERE id = ? LIMIT 1', [id]);
    res.json(rows[0] || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error leyendo usuario' });
  }
});

// UPDATE perfil
app.put('/info_usuarios/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const fields = { ...req.body };
    if (fields.gmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(fields.gmail)) return res.status(400).json({ error: 'Gmail inválido' });

    // si cambiaron gmail o N_usuario, verificar unicidad
    if (fields.gmail || fields.N_usuario) {
      const rows = await query('SELECT id FROM info_usuarios WHERE (gmail = ? OR N_usuario = ?) AND id != ? LIMIT 1', [fields.gmail || null, fields.N_usuario || null, id]);
      if (rows && rows.length > 0) return res.status(409).json({ error: 'Gmail o nombre de usuario ya en uso' });
    }

    if (fields.contrasena) {
      fields.contrasena = await bcrypt.hash(fields.contrasena, 10);
    }

    const keys = Object.keys(fields);
    if (keys.length === 0) return res.status(400).json({ error: 'No hay campos para actualizar' });
    const set = keys.map(k => `${k} = ?`).join(', ');
    const params = keys.map(k => fields[k]); params.push(id);
    await query(`UPDATE info_usuarios SET ${set} WHERE id = ?`, params);
    const updated = await query('SELECT id, nombre, apellido, N_usuario, gmail, created_at FROM info_usuarios WHERE id = ?', [id]);
    res.json(updated[0] || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error actualizando usuario' });
  }
});

// AUTH: login
app.post('/login', async (req, res) => {
  try {
    const { usuario, password } = req.body;
    console.log('/login body', { usuario: usuario });
    if (!usuario || !password) return res.status(400).json({ ok: false, message: 'Faltan usuario o contraseña' });
    const rows = await query('SELECT * FROM info_usuarios WHERE N_usuario = ? OR gmail = ? LIMIT 1', [usuario, usuario]);
    console.log('/login: rows found', rows && rows.length);
    const user = rows[0];
    if (!user) {
      console.log('/login: user not found for', usuario);
      return res.status(401).json({ ok: false, message: 'Usuario o contraseña inválidos' });
    }
    console.log('/login: comparing password for user id', user.id, 'hashLength', (user.contrasena || '').length);
    const match = await bcrypt.compare(password, user.contrasena || '');
    console.log('/login: bcrypt.compare result', match);
    if (!match) return res.status(401).json({ ok: false, message: 'Usuario o contraseña inválidos' });
    // success: return user without password
    const safeUser = { id: user.id, nombre: user.nombre, apellido: user.apellido, N_usuario: user.N_usuario, gmail: user.gmail, created_at: user.created_at };
    return res.json({ ok: true, message: 'Autenticación correcta', user: safeUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: 'Error en autenticación' });
  }
});

// ---------- EMAIL / NOTIFICATIONS ----------
const nodemailer = require('nodemailer');
let mailerTransport = null;
let mailerIsTest = false;

async function initMailer() {
  if (mailerTransport) return mailerTransport;
  try {
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      mailerTransport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587,
        secure: false,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      });
    } else {
      // fallback de desarrollo: cuenta Ethereal
      const testAccount = await nodemailer.createTestAccount();
      mailerTransport = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: { user: testAccount.user, pass: testAccount.pass }
      });
      mailerIsTest = true;
      console.log('⚠️ Mailer configured with Ethereal test account. Preview URLs will be available in logs.');
    }
    return mailerTransport;
  } catch (e) {
    console.warn('No se pudo inicializar mailer:', e);
    mailerTransport = null;
    return null;
  }
}

async function sendEmail(to, subject, html) {
  try {
    const transport = await initMailer();
    if (!transport) {
      console.warn('Mailer no configurado, no se envía correo');
      return null;
    }
    const info = await transport.sendMail({
      from: process.env.EMAIL_FROM || 'GoHome <no-reply@gohome.local>',
      to, subject, html, text: html && String(html).replace(/<[^>]+>/g, '')
    });
    if (mailerIsTest) console.log('Ethereal preview URL:', nodemailer.getTestMessageUrl(info));
    return info;
  } catch (err) {
    console.error('sendEmail error', err);
    return null;
  }
}

// tabla para evitar notificaciones duplicadas
(async function ensureNotificationsTable(){
  try {
    await query(`CREATE TABLE IF NOT EXISTS notification_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      type VARCHAR(80),
      entity VARCHAR(80),
      entity_id INT,
      to_email VARCHAR(255),
      subject VARCHAR(255),
      meta JSON,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);
    console.log('✅ Tabla notification_history verificada/creada');
  } catch(e){ console.warn('No se pudo crear/verificar tabla notification_history', e); }
})();

async function recordNotification(type, entity, entity_id, to_email, subject, meta) {
  try {
    await query('INSERT INTO notification_history (type, entity, entity_id, to_email, subject, meta) VALUES (?, ?, ?, ?, ?, ?)',
      [type, entity, entity_id, to_email, subject, JSON.stringify(meta || {})]);
  } catch(e){ console.warn('recordNotification error', e); }
}

async function hasNotification(type, entity, entity_id) {
  try {
    const rows = await query('SELECT id FROM notification_history WHERE type = ? AND entity = ? AND entity_id = ? LIMIT 1', [type, entity, entity_id]);
    return (rows && rows.length > 0);
  } catch(e){ return false; }
}

async function notifyAllUsers(subject, html, type, entity, entity_id, meta) {
  try {
    const users = await query('SELECT id, gmail FROM info_usuarios WHERE gmail IS NOT NULL');
    if (!users || users.length === 0) return;
    const promises = users.map(u => (async () => {
      try {
        await sendEmail(u.gmail, subject, html);
        await recordNotification(type || 'general', entity || 'system', entity_id || 0, u.gmail, subject, meta || {});
      } catch (e) { console.warn('notifyAllUsers inner error', e); }
    })());
    await Promise.allSettled(promises);
  } catch (e) {
    console.error('notifyAllUsers error', e);
  }
}

// endpoint genérico para enviar notificaciones por email (uso interno/por herramientas)
app.post('/notify', async (req, res) => {
  try {
    const { to, subject, html } = req.body || {};
    if (!to || !subject) return res.status(400).json({ error: 'to y subject son requeridos' });
    const info = await sendEmail(to, subject, html || subject);
    return res.json({ ok: true, info: info ? (mailerIsTest ? nodemailer.getTestMessageUrl(info) : info.messageId) : null });
  } catch (e) {
    console.error('POST /notify error', e);
    res.status(500).json({ ok: false, error: 'Error enviando email' });
  }
});

// checker periódico para pagos próximos (24h) y vencidos
const DURATION_MS = 31 * 24 * 60 * 60 * 1000;
const RED_ZONE_MS = 24 * 60 * 60 * 1000;
async function checkDueNotifications() {
  try {
    const rows = await query('SELECT id, nombre, fecha_ospedaje FROM inquilinos');
    const now = Date.now();
    for (const r of rows) {
      if (!r.fecha_ospedaje) continue;
      const start = new Date(r.fecha_ospedaje).getTime();
      if (Number.isNaN(start)) continue;
      const due = start + DURATION_MS;
      const msLeft = due - now;
      if (msLeft <= 0) {
        // vencido
        const already = await hasNotification('vencido', 'inquilino', r.id);
        if (!already) {
          const subject = `Pago vencido: ${r.nombre}`;
          const html = `<p>El pago del inquilino <strong>${r.nombre}</strong> se ha vencido.</p>`;
          setImmediate(() => notifyAllUsers(subject, html, 'vencido', 'inquilino', r.id, { msLeft }));
        }
      } else if (msLeft <= RED_ZONE_MS) {
        // modo rojo: faltan 24h
        const already = await hasNotification('near_due', 'inquilino', r.id);
        if (!already) {
          const subject = `Pago próximo (24h): ${r.nombre}`;
          const html = `<p>Al inquilino <strong>${r.nombre}</strong> le faltan menos de 24 horas para pagar.</p>`;
          setImmediate(() => notifyAllUsers(subject, html, 'near_due', 'inquilino', r.id, { msLeft }));
        }
      }
    }
  } catch (e) { console.error('checkDueNotifications error', e); }
}
// ejecutar al inicio y cada 10 minutos
checkDueNotifications().catch(console.error);
setInterval(() => checkDueNotifications().catch(console.error), 10 * 60 * 1000);

// health
app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime(), timestamp: Date.now() }));

// ----------------- START SERVER -----------------
let server = null;


async function startServer() {
  try {
    await pool.query('SELECT 1');
    console.log(`✅ Base de datos conectada (${process.env.DB_NAME || 'gohome_db_new'})`);
  } catch (err) {
    console.error('❌ Error conectando a la base de datos:', err.message || err);
    if (process.env.NODE_ENV === 'production') process.exit(1);
  }

  server = app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT} (env=${process.env.NODE_ENV || 'development'})`);
  });

  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      console.error(`⛔ Puerto ${PORT} en uso. Mata el proceso que lo usa o cambia la variable PORT.`);
    } else {
      console.error('Server error:', err);
    }
    process.exit(1);
  });
}

function shutdown(signal) {
  return async () => {
    console.log(`Received ${signal}. Shutting down gracefully...`);
    if (server) {
      server.close(err => {
        if (err) { console.error('Error closing server', err); process.exit(1); }
        pool.end().catch(e => console.warn('Error closing DB pool', e));
        console.log('Shutdown complete. Bye!');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  };
}

process.on('SIGINT', shutdown('SIGINT'));
process.on('SIGTERM', shutdown('SIGTERM'));
process.on('uncaughtException', err => { console.error('uncaughtException', err); process.exit(1); });
process.on('unhandledRejection', (reason) => { console.error('unhandledRejection', reason); });


startServer();
