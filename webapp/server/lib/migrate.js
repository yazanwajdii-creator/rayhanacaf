// مشغّل ترقيات SQL — يُشغَّل عند `npm run migrate` وأيضاً قبل البدء على Render
// يطبّق الملفات في server/migrations/ بالترتيب الأبجدي، ويتجاوز ما طُبّق سابقاً
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL غير معرّف');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: url,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  });

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const dir = path.join(__dirname, '..', 'migrations');
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();

    for (const f of files) {
      const { rowCount } = await pool.query('SELECT 1 FROM _migrations WHERE name=$1', [f]);
      if (rowCount > 0) {
        console.log(`  - ${f} (تخطّى — مُطبَّق سابقاً)`);
        continue;
      }
      const sql = fs.readFileSync(path.join(dir, f), 'utf-8');
      console.log(`  + ${f} (تطبيق...)`);
      await pool.query('BEGIN');
      try {
        await pool.query(sql);
        await pool.query('INSERT INTO _migrations(name) VALUES($1)', [f]);
        await pool.query('COMMIT');
        console.log(`    ✓ ${f} طُبّق بنجاح`);
      } catch (e) {
        await pool.query('ROLLBACK');
        throw new Error(`فشل في ${f}: ${e.message}`);
      }
    }

    console.log('✅ كل الترقيات طُبّقت بنجاح');
  } finally {
    await pool.end();
  }
}

main().catch(e => {
  console.error('❌ فشل الترحيل:', e.message);
  process.exit(1);
});
