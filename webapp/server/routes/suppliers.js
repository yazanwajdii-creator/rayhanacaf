const express = require('express');
const { pool } = require('../db');
const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, phone, notes, archived FROM suppliers WHERE archived=FALSE ORDER BY name'
    );
    res.json(rows);
  } catch (e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, phone, notes, archived } = req.body || {};
    if (!name) return res.status(400).json({ error: 'الاسم مطلوب' });
    const { rows } = await pool.query(
      `INSERT INTO suppliers (id, name, phone, notes, archived)
       VALUES ($1, $2, $3, $4, COALESCE($5,FALSE))
       ON CONFLICT (id) DO UPDATE SET
         name=EXCLUDED.name, phone=EXCLUDED.phone, notes=EXCLUDED.notes,
         archived=COALESCE($5, suppliers.archived)
       RETURNING *`,
      [id, name, phone || null, notes || null, archived]
    );
    res.json(rows[0]);
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    // أرشفة بدل حذف — لئلا تكسر الفواتير المرتبطة
    await pool.query('UPDATE suppliers SET archived=TRUE WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
