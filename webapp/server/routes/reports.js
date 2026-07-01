const express = require('express');
const { pool } = require('../db');
const router = express.Router();

// تقرير الإجماليّات لشهر — كل الأرقام محسوبة على السيرفر (مصدر واحد للحقيقة)
router.get('/totals/:ym', async (req, res, next) => {
  try {
    const { ym } = req.params;

    const [salesAgg, purchByCat, monthlyAgg, dailyRows, advAgg, oblAgg] = await Promise.all([
      pool.query(
        `SELECT COALESCE(SUM(cash),0) AS cash, COALESCE(SUM(visa),0) AS visa, COALESCE(SUM(pmts),0) AS pmts
         FROM sales WHERE ym=$1`, [ym]),
      pool.query(
        `SELECT category, COALESCE(SUM(amount),0) AS total
         FROM purchases WHERE ym=$1 GROUP BY category`, [ym]),
      pool.query(
        `SELECT COALESCE(SUM(base+allow-ded),0) AS gross,
                COALESCE(SUM(CASE WHEN paid THEN base+allow-ded ELSE 0 END),0) AS paid_total
         FROM monthly_salaries WHERE ym=$1`, [ym]),
      pool.query(
        `SELECT rate, attendance, rate_overrides FROM daily_wages WHERE ym=$1`, [ym]),
      pool.query(
        `SELECT COALESCE(SUM(amount),0) AS total
         FROM advances WHERE ym=$1 AND status='مستحقة'`, [ym]),
      pool.query(
        `SELECT COALESCE(SUM(CASE WHEN paid THEN amount ELSE 0 END),0) AS paid_total,
                COALESCE(SUM(CASE WHEN NOT paid THEN amount ELSE 0 END),0) AS unpaid_total
         FROM obligations WHERE ym=$1`, [ym]),
    ]);

    const cash = +salesAgg.rows[0].cash;
    const visa = +salesAgg.rows[0].visa;
    const pmts = +salesAgg.rows[0].pmts;
    const netSales = cash + visa;
    const rev = netSales + pmts;

    const bycat = { COGS: 0, OPS: 0, ADM: 0, MKT: 0, OTHER: 0 };
    purchByCat.rows.forEach(r => { bycat[r.category] = +r.total; });
    bycat.total = Object.values(bycat).reduce((s, v) => s + v, 0);

    // أجور يومية = sum(rate * attendance.length) مع تطبيق rate_overrides
    let dailyTotal = 0;
    dailyRows.rows.forEach(w => {
      const att = Array.isArray(w.attendance) ? w.attendance : [];
      const ovr = w.rate_overrides || {};
      att.forEach(day => { dailyTotal += +(ovr[day] ?? w.rate ?? 0); });
    });

    const mSalG = +monthlyAgg.rows[0].gross;
    const mSalPaid = +monthlyAgg.rows[0].paid_total;
    const advTotal = +advAgg.rows[0].total;
    const oblPaid = +oblAgg.rows[0].paid_total;
    const oblUnpaid = +oblAgg.rows[0].unpaid_total;

    // المعادلة المحاسبية (موروثة من v76 + v84):
    //   إجمالي المصاريف = COGS + OPS + ADM + MKT + OTHER + الرواتب المدفوعة + الالتزامات المدفوعة + السلف
    //   صافي الربح = صافي المبيعات − إجمالي المصاريف
    const totalExp = bycat.total + mSalPaid + oblPaid + advTotal;
    const grossP = netSales - bycat.COGS;
    const profit = netSales - totalExp;
    const margin = netSales > 0 ? (profit / netSales) * 100 : 0;

    res.json({
      ym, cash, visa, pmts, netSales, rev,
      bycat,
      mSalG, mSalPaid,
      dailyTotal,
      advTotal,
      oblPaid, oblUnpaid,
      totalExp, grossP, profit, margin
    });
  } catch (e) { next(e); }
});

module.exports = router;
