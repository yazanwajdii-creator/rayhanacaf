const express = require('express');
const { pool } = require('../db');
const router = express.Router();

// GET /api/months — قائمة كل الأشهر
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT ym, locked, ended, notes, updated_at FROM months ORDER BY ym DESC'
    );
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /api/months/:ym — تفاصيل شهر واحد
router.get('/:ym', async (req, res, next) => {
  try {
    const { ym } = req.params;
    const { rows } = await pool.query('SELECT * FROM months WHERE ym=$1', [ym]);
    if (rows.length === 0) return res.status(404).json({ error: 'الشهر غير موجود' });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

// PUT /api/months/:ym — إنشاء أو تحديث (upsert)
router.put('/:ym', async (req, res, next) => {
  try {
    const { ym } = req.params;
    if (!/^\d{4}-\d{2}$/.test(ym)) return res.status(400).json({ error: 'صيغة الشهر يجب أن تكون YYYY-MM' });
    const { locked, ended, notes } = req.body || {};
    const { rows } = await pool.query(
      `INSERT INTO months (ym, locked, ended, notes)
       VALUES ($1, COALESCE($2,FALSE), COALESCE($3,FALSE), $4)
       ON CONFLICT (ym) DO UPDATE SET
         locked = COALESCE($2, months.locked),
         ended  = COALESCE($3, months.ended),
         notes  = COALESCE($4, months.notes),
         updated_at = NOW()
       RETURNING *`,
      [ym, locked, ended, notes]
    );
    res.json(rows[0]);
  } catch (e) { next(e); }
});

module.exports = router;
