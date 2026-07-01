const express = require('express');
const { pool } = require('../db');
const router = express.Router();

// /api/employees?type=monthly|daily  (افتراضي: الاثنان)
router.get('/', async (req, res, next) => {
  try {
    const type = req.query.type;
    let monthly = [], daily = [];
    if (type !== 'daily') {
      const r = await pool.query('SELECT id, name, archived FROM monthly_emps WHERE archived=FALSE ORDER BY name');
      monthly = r.rows;
    }
    if (type !== 'monthly') {
      const r = await pool.query('SELECT id, name, archived FROM daily_emps WHERE archived=FALSE ORDER BY name');
      daily = r.rows;
    }
    if (type === 'monthly') return res.json(monthly);
    if (type === 'daily') return res.json(daily);
    res.json({ monthly, daily });
  } catch (e) { next(e); }
});

router.put('/:type/:id', async (req, res, next) => {
  try {
    const { type, id } = req.params;
    const { name, archived } = req.body || {};
    if (!['monthly', 'daily'].includes(type)) return res.status(400).json({ error: 'النوع: monthly | daily' });
    if (!name) return res.status(400).json({ error: 'الاسم مطلوب' });
    const table = type === 'monthly' ? 'monthly_emps' : 'daily_emps';
    const { rows } = await pool.query(
      `INSERT INTO ${table} (id, name, archived)
       VALUES ($1, $2, COALESCE($3,FALSE))
       ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, archived=COALESCE($3, ${table}.archived)
       RETURNING *`,
      [id, name, archived]
    );
    res.json(rows[0]);
  } catch (e) { next(e); }
});

router.delete('/:type/:id', async (req, res, next) => {
  try {
    const { type, id } = req.params;
    if (!['monthly', 'daily'].includes(type)) return res.status(400).json({ error: 'النوع: monthly | daily' });
    const table = type === 'monthly' ? 'monthly_emps' : 'daily_emps';
    await pool.query(`UPDATE ${table} SET archived=TRUE WHERE id=$1`, [id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
