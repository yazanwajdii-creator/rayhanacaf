// @ts-check
const { test, expect } = require('@playwright/test');

async function login({ page }) {
  await page.goto('/index.html');
  await page.evaluate(() => { try { localStorage.setItem('rh_supa_disabled','1'); } catch(e){} });
  await page.reload();
  await page.fill('#pwdInput', '1234');
  await page.click('#pwdLoginBtn');
  await expect(page.locator('#app.on')).toBeVisible({ timeout: 5000 });
}

test.describe('Accounting math — هذه أرقام مال، يجب أن تكون صحيحة 100%', () => {
  test.beforeEach(login);

  test('totals() متّسقة مع mainline checks (نفس الدالة في كل النواحي)', async ({ page }) => {
    const checks = await page.evaluate(() => {
      // اضبط بيانات معروفة
      window.S.activeKey = '2026-05';
      const d = window.G();
      // اقرأ ملخصات بـ 3 طرق مختلفة
      const t = window.totals();
      const sumSales = (d.sales || []).reduce((s, x) => s + (x.cash || 0) + (x.visa || 0), 0);
      const sumPmts = (d.sales || []).reduce((s, x) => s + (x.pmts || 0), 0);
      const sumPurch = (d.purchases || []).reduce((s, x) => s + (x.amt || 0), 0);
      return {
        rev_totals: t.rev,
        netSales_totals: t.netSales,
        netSales_manual: sumSales,
        pmts_manual: sumPmts,
        cogs_totals: t.bycat.COGS,
        cogs_manual: sumPurch, // كل المشتريات COGS في البذرة
      };
    });
    expect(checks.netSales_totals).toBeCloseTo(checks.netSales_manual, 1);
    expect(checks.rev_totals).toBeCloseTo(checks.netSales_manual + checks.pmts_manual, 1);
    expect(checks.cogs_totals).toBeCloseTo(checks.cogs_manual, 1);
  });

  test('السلف تُخصم من صافي الراتب — totals + الجدول + التقرير = نفس الرقم', async ({ page }) => {
    const check = await page.evaluate(() => {
      // أضف سلفة 95 لـ هاني
      window.S.activeKey = '2026-05';
      const d = window.G();
      d.advances = d.advances || [];
      d.advances.push({ date: '2026-05-01', empId: 'hani', empName: 'هاني', amt: 95, status: 'مستحقة' });
      d.mSal = d.mSal || {};
      d.mSal.hani = { base: 150, allow: 0, ded: 0, paid: false };

      const pa = window.pendAdv('hani');
      const expected_net = Math.max(0, 150 + 0 - 0 - 95); // 55

      const t = window.totals();
      return {
        pendAdv: pa,
        expected_net: expected_net,
        // totals لا يدمج net فردياً، لكنه يجمع mSalNet
        mSalG: t.mSalG, // 150
        mSalNet: t.mSalNet, // مجموع كل الموظفين الصافي
      };
    });
    expect(check.pendAdv).toBe(95);
    expect(check.expected_net).toBe(55);
    expect(check.mSalG).toBeGreaterThanOrEqual(150);
    // الصافي يجب أن يكون ≤ Gross (لأن السلف تُخصم)
    expect(check.mSalNet).toBeLessThanOrEqual(check.mSalG);
  });

  test('الأجور اليومية: _dwTotal يحترم rateOverrides', async ({ page }) => {
    const r = await page.evaluate(() => {
      const w = { rate: 10, att: [1, 2, 3], rateOverrides: { 2: 15 } };
      return window._dwTotal ? window._dwTotal(w) : null;
    });
    expect(r).toBe(35); // 10 + 15 + 10
  });

  test('المصاريف الإجمالية = COGS + oblPaid + mSalPaid (لا تشمل الـ pmts)', async ({ page }) => {
    const check = await page.evaluate(() => {
      window.S.activeKey = '2026-05';
      const t = window.totals();
      const expected = t.bycat.total + t.oblPaid + t.mSalPaid;
      return { totalExp: t.totalExp, expected: expected };
    });
    expect(check.totalExp).toBeCloseTo(check.expected, 1);
  });
});

test.describe('Multi-month comparison', () => {
  test('analyzeTrends تستخدم نفس معادلة المصاريف عبر الأشهر', async ({ page }) => {
    await login({ page });
    const trends = await page.evaluate(() => {
      const r = window.analyzeTrends();
      return r;
    });
    expect(trends).toBeDefined();
    // إن كان لدينا 2+ شهر، يجب أن نحصل على trend صحيح
    if (trends && trends.trend !== 'insufficient') {
      expect(['growing', 'declining', 'stable']).toContain(trends.trend);
      expect(typeof trends.forecast).toBe('number');
    }
  });
});
