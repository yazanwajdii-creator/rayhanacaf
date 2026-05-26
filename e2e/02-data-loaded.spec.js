// @ts-check
const { test, expect } = require('@playwright/test');

async function login(page) {
  await page.goto('/index.html');
  // امسح الـ Supabase auto-sync لتفادي تعديل البيانات أثناء الاختبار
  await page.evaluate(() => {
    try { localStorage.setItem('rh_supa_disabled', '1'); } catch(e){}
  });
  await page.reload();
  await page.fill('#pwdInput', '1234');
  await page.click('#pwdLoginBtn');
  await expect(page.locator('#app.on')).toBeVisible({ timeout: 5000 });
}

test.describe('Data loaded from seed', () => {
  test.beforeEach(login);

  test('البذرة تُحمَّل: 4 أشهر + موردين + موظفين', async ({ page }) => {
    const state = await page.evaluate(() => ({
      months: Object.keys(window.S?.months || {}).sort(),
      suppliers: (window.S?.suppliers || []).length,
      monthly: (window.S?.monthlyEmps || []).length,
      daily: (window.S?.dailyEmps || []).length,
      activeKey: window.S?.activeKey,
    }));
    // البذرة فيها على الأقل فبراير/مارس/أبريل/مايو 2026
    expect(state.months).toEqual(expect.arrayContaining(['2026-02', '2026-03', '2026-04', '2026-05']));
    expect(state.suppliers).toBeGreaterThanOrEqual(10);
    expect(state.monthly).toBeGreaterThanOrEqual(3);
    expect(state.daily).toBeGreaterThanOrEqual(3);
    expect(state.activeKey).toMatch(/^2026-\d{2}$/);
  });

  test('المشتريات لكل شهر غير صفرية حيث متوقع', async ({ page }) => {
    const purchaseCounts = await page.evaluate(() => {
      const m = window.S?.months || {};
      return {
        feb: (m['2026-02']?.purchases || []).length,
        mar: (m['2026-03']?.purchases || []).length,
        apr: (m['2026-04']?.purchases || []).length,
        may: (m['2026-05']?.purchases || []).length,
      };
    });
    expect(purchaseCounts.mar).toBeGreaterThan(0);
    expect(purchaseCounts.apr).toBeGreaterThan(0);
    expect(purchaseCounts.may).toBeGreaterThan(0);
  });

  test('totals() لا ترمي خطأ على أي شهر مُحمَّل', async ({ page }) => {
    const results = await page.evaluate(() => {
      const keys = Object.keys(window.S?.months || {});
      return keys.map(k => {
        try {
          const orig = window.S.activeKey;
          window.S.activeKey = k;
          const t = window.totals();
          window.S.activeKey = orig;
          return { key: k, ok: true, rev: t.rev, profit: t.profit, margin: t.margin };
        } catch (e) {
          return { key: k, ok: false, error: String(e) };
        }
      });
    });
    for (const r of results) {
      expect(r.ok, `totals() على ${r.key}: ${r.error}`).toBe(true);
      expect(typeof r.rev).toBe('number');
      expect(typeof r.profit).toBe('number');
      expect(Number.isFinite(r.margin)).toBe(true);
    }
  });
});
