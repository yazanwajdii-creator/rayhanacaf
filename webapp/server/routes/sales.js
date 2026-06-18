const express = require('express');
const { pool } = require('../db');
const router = express.Router();

// GET /api/sales/:ym — كل الأيام لشهر معيّن
router.get('/:ym', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT day, cash, visa, pmts, received_by, notes, updated_at FROM sales WHERE ym=$1 ORDER BY day',
      [req.params.ym]
    );
    res.json(rows);
  } catch (e) { next(e); }
});

// PUT /api/sales/:ym/:day — upsert يوم
router.put('/:ym/:day', async (req, res, next) => {
  try {
    const { ym, day } = req.params;
    const d = parseInt(day, 10);
    if (!Number.isInteger(d) || d < 1 || d > 31) {
      return res.status(400).json({ error: 'اليوم يجب أن يكون 1-31' });
    }
    const { cash = 0, visa = 0, pmts = 0, received_by, notes } = req.body || {};

    // التأكّد من وجود الشهر — لو غير موجود ننشئه تلقائياً
    await pool.query('INSERT INTO months(ym) VALUES($1) ON CONFLICT DO NOTHING', [ym]);

    const { rows } = await pool.query(
      `INSERT INTO sales (ym, day, cash, visa, pmts, received_by, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (ym, day) DO UPDATE SET
         cash = EXCLUDED.cash,
         visa = EXCLUDED.visa,
         pmts = EXCLUDED.pmts,
         received_by = EXCLUDED.received_by,
         notes = EXCLUDED.notes,
         updated_at = NOW()
       RETURNING *`,
      [ym, d, cash, visa, pmts, received_by || null, notes || null]
    );
    res.json(rows[0]);
  } catch (e) { next(e); }
});

// DELETE /api/sales/:ym/:day
router.delete('/:ym/:day', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM sales WHERE ym=$1 AND day=$2', [req.params.ym, parseInt(req.params.day, 10)]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
