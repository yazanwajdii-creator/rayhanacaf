const express = require('express');
const { pool } = require('../db');
const router = express.Router();

// رواتب شهرية
router.get('/monthly/:ym', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT ms.ym, ms.emp_id, e.name AS emp_name, ms.base, ms.allow, ms.ded,
              ms.paid, ms.paid_date, ms.paid_by, ms.notes
       FROM monthly_salaries ms
       JOIN monthly_emps e ON e.id = ms.emp_id
       WHERE ms.ym = $1 ORDER BY e.name`,
      [req.params.ym]
    );
    res.json(rows);
  } catch (e) { next(e); }
});

router.put('/monthly/:ym/:emp_id', async (req, res, next) => {
  try {
    const { ym, emp_id } = req.params;
    const { base = 0, allow = 0, ded = 0, paid, paid_date, paid_by, notes } = req.body || {};
    await pool.query('INSERT INTO months(ym) VALUES($1) ON CONFLICT DO NOTHING', [ym]);
    const { rows } = await pool.query(
      `INSERT INTO monthly_salaries (ym, emp_id, base, allow, ded, paid, paid_date, paid_by, notes)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6,FALSE), $7, $8, $9)
       ON CONFLICT (ym, emp_id) DO UPDATE SET
         base=EXCLUDED.base, allow=EXCLUDED.allow, ded=EXCLUDED.ded,
         paid=COALESCE($6, monthly_salaries.paid),
         paid_date=COALESCE($7, monthly_salaries.paid_date),
         paid_by=COALESCE($8, monthly_salaries.paid_by),
         notes=$9
       RETURNING *`,
      [ym, emp_id, base, allow, ded, paid, paid_date || null, paid_by || null, notes || null]
    );
    res.json(rows[0]);
  } catch (e) { next(e); }
});

// أجور يوميّة
router.get('/daily/:ym', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT dw.ym, dw.emp_id, e.name AS emp_name, dw.rate, dw.attendance, dw.rate_overrides
       FROM daily_wages dw
       JOIN daily_emps e ON e.id = dw.emp_id
       WHERE dw.ym = $1 ORDER BY e.name`,
      [req.params.ym]
    );
    res.json(rows);
  } catch (e) { next(e); }
});

router.put('/daily/:ym/:emp_id', async (req, res, next) => {
  try {
    const { ym, emp_id } = req.params;
    const { rate = 0, attendance = [], rate_overrides = {} } = req.body || {};
    if (!Array.isArray(attendance)) return res.status(400).json({ error: 'attendance يجب أن تكون مصفوفة' });
    await pool.query('INSERT INTO months(ym) VALUES($1) ON CONFLICT DO NOTHING', [ym]);
    const { rows } = await pool.query(
      `INSERT INTO daily_wages (ym, emp_id, rate, attendance, rate_overrides)
       VALUES ($1, $2, $3, $4::jsonb, $5::jsonb)
       ON CONFLICT (ym, emp_id) DO UPDATE SET
         rate=EXCLUDED.rate, attendance=EXCLUDED.attendance, rate_overrides=EXCLUDED.rate_overrides
       RETURNING *`,
      [ym, emp_id, rate, JSON.stringify(attendance), JSON.stringify(rate_overrides)]
    );
    res.json(rows[0]);
  } catch (e) { next(e); }
});

module.exports = router;
