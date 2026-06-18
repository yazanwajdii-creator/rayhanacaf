const express = require('express');
const { pool } = require('../db');
const router = express.Router();

const VALID_CATS = ['COGS', 'OPS', 'ADM', 'MKT', 'OTHER'];

// GET /api/purchases/:ym
router.get('/:ym', async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, ym, purchase_date, supplier_id, supplier_name, category,
              description, amount, buyer, invoice, created_at
       FROM purchases WHERE ym=$1 ORDER BY purchase_date, id`,
      [req.params.ym]
    );
    res.json(rows);
  } catch (e) { next(e); }
});

// POST /api/purchases — إضافة فاتورة
router.post('/', async (req, res, next) => {
  try {
    const { ym, purchase_date, supplier_id, supplier_name, category, description, amount, buyer, invoice } = req.body || {};
    if (!ym || !purchase_date) return res.status(400).json({ error: 'ym و purchase_date مطلوبان' });
    if (!amount || amount < 0) return res.status(400).json({ error: 'المبلغ يجب أن يكون ≥0' });
    const cat = VALID_CATS.includes(category) ? category : 'COGS';

    await pool.query('INSERT INTO months(ym) VALUES($1) ON CONFLICT DO NOTHING', [ym]);

    const { rows } = await pool.query(
      `INSERT INTO purchases (ym, purchase_date, supplier_id, supplier_name, category, description, amount, buyer, invoice)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [ym, purchase_date, supplier_id || null, supplier_name || null, cat,
       description || null, amount, buyer || null, invoice || null]
    );
    res.json(rows[0]);
  } catch (e) { next(e); }
});

// PUT /api/purchases/:id — تعديل
router.put('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { purchase_date, supplier_id, supplier_name, category, description, amount, buyer, invoice } = req.body || {};
    const cat = VALID_CATS.includes(category) ? category : null;
    const { rows } = await pool.query(
      `UPDATE purchases SET
         purchase_date = COALESCE($2, purchase_date),
         supplier_id   = $3,
         supplier_name = $4,
         category      = COALESCE($5, category),
         description   = $6,
         amount        = COALESCE($7, amount),
         buyer         = $8,
         invoice       = $9
       WHERE id=$1 RETURNING *`,
      [id, purchase_date || null, supplier_id || null, supplier_name || null,
       cat, description || null, amount ?? null, buyer || null, invoice || null]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'الفاتورة غير موجودة' });
    res.json(rows[0]);
  } catch (e) { next(e); }
});

// DELETE /api/purchases/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await pool.query('DELETE FROM purchases WHERE id=$1', [parseInt(req.params.id, 10)]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
