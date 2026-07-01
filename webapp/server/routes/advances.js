const express = require('express');
const { pool } = require('../db');
const router = express.Router();

router.get('/:ym', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM advances WHERE ym=$1 ORDER BY adv_date, id',
      [req.params.ym]
    );
    res.json(rows);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { ym, emp_id, emp_name, adv_date, amount, status, note } = req.body || {};
    if (!ym || !emp_id || !emp_name || !adv_date || !amount) {
      return res.status(400).json({ error: 'ym, emp_id, emp_name, adv_date, amount مطلوبة' });
    }
    if (amount <= 0) return res.status(400).json({ error: 'المبلغ يجب أن يكون >0' });
    const st = ['مستحقة','مخصومة','ملغاة'].includes(status) ? status : 'مستحقة';
    await pool.query('INSERT INTO months(ym) VALUES($1) ON CONFLICT DO NOTHING', [ym]);
    const { rows } = await pool.query(
      `INSERT INTO advances (ym, emp_id, emp_name, adv_date, amount, status, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [ym, emp_id, emp_name, adv_date, amount, st, note || null]
    );
    res.json(rows[0]);
  } catch (e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { amount, status, note, adv_date } = req.body || {};
    const st = status && ['مستحقة','مخصومة','ملغاة'].includes(status) ? status : null;
    const { rows } = await pool.query(
      `UPDATE advances SET
         amount   = COALESCE($2, amount),
         status   = COALESCE($3, status),
         note     = $4,
         adv_date = COALESCE($5, adv_date)
       WHERE id=$1 RETURNING *`,
      [id, amount ?? null, st, note || null, adv_date || null]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'السلفة غير موجودة' });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM advances WHERE id=$1', [parseInt(req.params.id, 10)]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
