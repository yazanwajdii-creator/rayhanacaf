const express = require('express');
const { pool } = require('../db');
const router = express.Router();

router.get('/:ym', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM obligations WHERE ym=$1 ORDER BY due_date NULLS LAST, id',
      [req.params.ym]
    );
    res.json(rows);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { ym, name, amount, paid, due_date, paid_date, paid_by, notes } = req.body || {};
    if (!ym || !name || amount === undefined) return res.status(400).json({ error: 'ym, name, amount مطلوبة' });
    if (amount < 0) return res.status(400).json({ error: 'المبلغ يجب أن يكون ≥0' });
    await pool.query('INSERT INTO months(ym) VALUES($1) ON CONFLICT DO NOTHING', [ym]);
    const { rows } = await pool.query(
      `INSERT INTO obligations (ym, name, amount, paid, due_date, paid_date, paid_by, notes)
       VALUES ($1, $2, $3, COALESCE($4,FALSE), $5, $6, $7, $8) RETURNING *`,
      [ym, name, amount, paid, due_date || null, paid_date || null, paid_by || null, notes || null]
    );
    res.json(rows[0]);
  } catch (e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, amount, paid, due_date, paid_date, paid_by, notes } = req.body || {};
    const { rows } = await pool.query(
      `UPDATE obligations SET
         name      = COALESCE($2, name),
         amount    = COALESCE($3, amount),
         paid      = COALESCE($4, paid),
         due_date  = $5,
         paid_date = $6,
         paid_by   = $7,
         notes     = $8
       WHERE id=$1 RETURNING *`,
      [id, name || null, amount ?? null, paid, due_date || null, paid_date || null, paid_by || null, notes || null]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'الالتزام غير موجود' });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM obligations WHERE id=$1', [parseInt(req.params.id, 10)]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
