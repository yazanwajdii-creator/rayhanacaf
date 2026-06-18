// ترحيل بيانات JSON من APK القديم إلى PostgreSQL
// الاستخدام:
//   1. صدّر "أرشيف شامل" من APK → سيُحمَّل ملف JSON
//   2. ضعه في webapp/data/legacy.json
//   3. شغّل: npm run import-legacy
//
// السكربت idempotent: يطبّق ON CONFLICT DO UPDATE، يمكن تشغيله مرّاتٍ بأمان.
const fs = require('fs');
const path = require('path');
const { pool, tx } = require('../server/db');

const FILE = path.join(__dirname, '..', 'data', 'legacy.json');

async function main() {
  if (!fs.existsSync(FILE)) {
    console.error(`❌ الملف غير موجود: ${FILE}`);
    console.error('   ضع ملف JSON الذي صدّرته من APK في webapp/data/legacy.json');
    process.exit(1);
  }

  const raw = fs.readFileSync(FILE, 'utf-8');
  const data = JSON.parse(raw);
  if (!data.months) {
    console.error('❌ ملف غير صالح — لا يوجد حقل months');
    process.exit(1);
  }

  const monthKeys = Object.keys(data.months);
  console.log(`📦 الملف يحتوي على ${monthKeys.length} شهر، ${(data.suppliers||[]).length} مورد، ${(data.monthlyEmps||[]).length + (data.dailyEmps||[]).length} موظف`);

  await tx(async (c) => {
    // 1. الموردون
    for (const s of (data.suppliers || [])) {
      if (!s.id || !s.name) continue;
      await c.query(
        `INSERT INTO suppliers (id, name, phone, notes)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, phone=EXCLUDED.phone, notes=EXCLUDED.notes`,
        [s.id, s.name, s.phone || null, s.notes || null]
      );
    }
    console.log(`  ✓ ${(data.suppliers||[]).length} مورد`);

    // 2. الموظفون
    for (const e of (data.monthlyEmps || [])) {
      if (!e.id || !e.name) continue;
      await c.query(
        `INSERT INTO monthly_emps (id, name) VALUES ($1, $2)
         ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name`,
        [e.id, e.name]
      );
    }
    for (const e of (data.dailyEmps || [])) {
      if (!e.id || !e.name) continue;
      await c.query(
        `INSERT INTO daily_emps (id, name) VALUES ($1, $2)
         ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name`,
        [e.id, e.name]
      );
    }
    console.log(`  ✓ ${(data.monthlyEmps||[]).length} موظف شهري + ${(data.dailyEmps||[]).length} يومي`);

    // 3. الأشهر وتفاصيلها
    let salesTotal = 0, purchTotal = 0, advTotal = 0, oblTotal = 0;
    const locked = new Set(data.lockedMonths || []);

    for (const ym of monthKeys) {
      const m = data.months[ym] || {};
      await c.query(
        `INSERT INTO months (ym, locked, ended)
         VALUES ($1, $2, $3)
         ON CONFLICT (ym) DO UPDATE SET locked=EXCLUDED.locked, ended=EXCLUDED.ended`,
        [ym, locked.has(ym), !!m._monthEnded]
      );

      // المبيعات
      for (const s of (m.sales || [])) {
        if (!s.day) continue;
        await c.query(
          `INSERT INTO sales (ym, day, cash, visa, pmts, received_by, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (ym, day) DO UPDATE SET
             cash=EXCLUDED.cash, visa=EXCLUDED.visa, pmts=EXCLUDED.pmts,
             received_by=EXCLUDED.received_by, notes=EXCLUDED.notes`,
          [ym, s.day, s.cash || 0, s.visa || 0, s.pmts || 0, s.receivedBy || null, s.notes || null]
        );
        salesTotal++;
      }

      // المشتريات — لا يوجد id ثابت في القديم، فننشئ سجلات جديدة كلّ مرّة
      // لذلك نحذف ثمّ نُدخل (idempotent)
      await c.query('DELETE FROM purchases WHERE ym=$1', [ym]);
      for (const p of (m.purchases || [])) {
        if (!p.date) continue;
        const cat = ['COGS','OPS','ADM','MKT','OTHER'].includes(p.cat) ? p.cat : 'COGS';
        await c.query(
          `INSERT INTO purchases (ym, purchase_date, supplier_id, supplier_name, category, description, amount, buyer, invoice)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [ym, p.date, p.sId || null, p.sName || null, cat, p.desc || null, p.amt || 0, p.buyer || null, p.inv || null]
        );
        purchTotal++;
      }

      // الرواتب الشهريّة
      for (const empId of Object.keys(m.mSal || {})) {
        const s = m.mSal[empId] || {};
        // تأكّد أن الموظف موجود (قد يكون أُضيف في شهر معيّن دون monthlyEmps)
        await c.query(
          `INSERT INTO monthly_emps (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
          [empId, empId]
        );
        await c.query(
          `INSERT INTO monthly_salaries (ym, emp_id, base, allow, ded, paid)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (ym, emp_id) DO UPDATE SET
             base=EXCLUDED.base, allow=EXCLUDED.allow, ded=EXCLUDED.ded, paid=EXCLUDED.paid`,
          [ym, empId, s.base || 0, s.allow || 0, s.ded || 0, !!s.paid]
        );
      }

      // الأجور اليوميّة
      for (const empId of Object.keys(m.dWages || {})) {
        const w = m.dWages[empId] || {};
        await c.query(
          `INSERT INTO daily_emps (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
          [empId, empId]
        );
        await c.query(
          `INSERT INTO daily_wages (ym, emp_id, rate, attendance, rate_overrides)
           VALUES ($1, $2, $3, $4::jsonb, $5::jsonb)
           ON CONFLICT (ym, emp_id) DO UPDATE SET
             rate=EXCLUDED.rate, attendance=EXCLUDED.attendance, rate_overrides=EXCLUDED.rate_overrides`,
          [ym, empId, w.rate || 0, JSON.stringify(w.att || []), JSON.stringify(w.rateOverrides || {})]
        );
      }

      // السلف — نحذف ونعيد إنشاء (لأن لا يوجد id ثابت)
      await c.query('DELETE FROM advances WHERE ym=$1', [ym]);
      for (const a of (m.advances || [])) {
        if (!a.date || !a.amt) continue;
        const st = ['مستحقة','مخصومة','ملغاة'].includes(a.status) ? a.status : 'مستحقة';
        await c.query(
          `INSERT INTO advances (ym, emp_id, emp_name, adv_date, amount, status, note)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [ym, a.empId || 'unknown', a.empName || a.empId || 'موظف', a.date, a.amt, st, a.note || null]
        );
        advTotal++;
      }

      // الالتزامات
      await c.query('DELETE FROM obligations WHERE ym=$1', [ym]);
      for (const o of (m.obligations || [])) {
        if (!o.name || o.amt === undefined) continue;
        await c.query(
          `INSERT INTO obligations (ym, name, amount, paid, due_date, paid_by)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [ym, o.name, o.amt || 0, !!o.paid, o.due || null, o.paidBy || null]
        );
        oblTotal++;
      }
    }

    console.log(`  ✓ ${monthKeys.length} شهر`);
    console.log(`  ✓ ${salesTotal} يوم مبيعات`);
    console.log(`  ✓ ${purchTotal} فاتورة`);
    console.log(`  ✓ ${advTotal} سلفة`);
    console.log(`  ✓ ${oblTotal} التزام`);
  });

  console.log('\n✅ تم الترحيل بنجاح');
  await pool.end();
}

main().catch(e => {
  console.error('❌ فشل الترحيل:', e);
  process.exit(1);
});
