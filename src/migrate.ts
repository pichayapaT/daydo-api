import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { Database } from './database';

async function migrate() {
  const db = new Database();
  const connection = await db.pool.getConnection();
  try {
    const [lock] = await connection.query("SELECT GET_LOCK('day_by_day_migrations', 30) AS acquired");
    if ((lock as {acquired:number}[])[0].acquired !== 1) throw new Error('Migration lock unavailable');
    await connection.query('CREATE TABLE IF NOT EXISTS schema_migrations (name VARCHAR(255) PRIMARY KEY, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
    const directory = join(__dirname, '../migrations');
    for (const name of (await readdir(directory)).filter(name => name.endsWith('.sql')).sort()) {
      const [rows] = await connection.execute('SELECT name FROM schema_migrations WHERE name = ?', [name]);
      if ((rows as unknown[]).length) continue;
      const sql = await readFile(join(directory, name), 'utf8');
      for (const statement of sql.split(';').map(s => s.trim()).filter(Boolean)) await connection.query(statement);
      await connection.execute('INSERT INTO schema_migrations (name) VALUES (?)', [name]);
      console.log(`Applied ${name}`);
    }
  } finally {
    await connection.query("SELECT RELEASE_LOCK('day_by_day_migrations')");
    connection.release();
    await db.pool.end();
  }
}
migrate().catch(() => { console.error('Migration failed. Check MySQL availability and .env settings.'); process.exitCode = 1; });
