/*
Script seguro para rehasear contraseñas antiguas en la tabla info_usuarios.
- Hace un backup de las filas afectadas (JSON) en ./scripts/backups/
- Por defecto corre en modo DRY-RUN (no aplica cambios). Para ejecutar en modo real usar --run
- Uso: node scripts/rehash_passwords.js --run
*/

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
const DO_RUN = argv.includes('--run');
const LIMIT_ARG = (() => {
  const i = argv.indexOf('--limit');
  if (i >= 0 && argv[i+1]) return parseInt(argv[i+1], 10);
  return null;
})();

async function main(){
  console.log('== Rehash passwords script ==');
  console.log('Mode:', DO_RUN ? 'APPLY CHANGES' : 'DRY RUN (no changes)');
  if (LIMIT_ARG) console.log('Limit:', LIMIT_ARG);

  // Use same defaults as server.js if env not set
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || 'JaDc200817@))*',
    database: process.env.DB_NAME || 'gohome_db_new',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    charset: 'utf8mb4_unicode_ci',
  });

  try {
    // select rows where contrasena does NOT look like a bcrypt hash (starts with $2)
    let sql = `SELECT id, N_usuario, gmail, contrasena FROM info_usuarios WHERE contrasena IS NOT NULL AND contrasena NOT LIKE '$2%'`;
    if (LIMIT_ARG) sql += ` LIMIT ${Number(LIMIT_ARG)}`;
    const [rows] = await pool.query(sql);

    if (!rows || rows.length === 0) {
      console.log('No se encontraron contraseñas para rehasear.');
      process.exit(0);
    }

    console.log('Found', rows.length, 'rows to process. Preparing backup...');
    const backupDir = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    const backupFile = path.join(backupDir, `rehash_backup_${Date.now()}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(rows, null, 2));
    console.log('Backup written to', backupFile);

    const toUpdate = [];
    for (const r of rows) {
      const raw = String(r.contrasena || '');
      if (!raw) continue;
      // heuristic: if starts with $2 it's already hashed; else treat as plaintext
      if (raw.startsWith('$2')) continue;
      toUpdate.push({ id: r.id, N_usuario: r.N_usuario, gmail: r.gmail, old: raw });
    }

    if (toUpdate.length === 0) {
      console.log('No items require hashing (all looked hashed).');
      process.exit(0);
    }

    console.log('Will rehash', toUpdate.length, 'accounts');
    if (!DO_RUN) {
      console.log('Dry run - the following updates WOULD be applied:');
      toUpdate.forEach(u => console.log(` - id=${u.id} user=${u.N_usuario} gmail=${u.gmail}`));
      process.exit(0);
    }

    console.log('Applying hashes now...');
    for (const u of toUpdate) {
      try {
        const hash = await bcrypt.hash(u.old, 10);
        await pool.query('UPDATE info_usuarios SET contrasena = ? WHERE id = ?', [hash, u.id]);
        console.log(`Updated id=${u.id} (${u.N_usuario || u.gmail})`);
      } catch (e) {
        console.error('Error updating id', u.id, e);
      }
    }

    console.log('Done. All updates applied.');
    console.log('TIP: Remove the backup only after you verify logins work.');
    process.exit(0);
  } catch (e) {
    console.error('Fatal error', e);
    process.exit(1);
  }
}

main();
