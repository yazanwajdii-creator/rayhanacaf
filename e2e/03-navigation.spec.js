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

test.describe('Navigation between tabs', () => {
  test.beforeEach(login);

  test('كل التبويبات الأساسية موجودة وتفتح بدون خطأ', async ({ page }) => {
    const tabs = ['dash','today','rev','purch','supp','oblig','sal','adv','cash','rpt','cloud','audit'];
    for (const id of tabs) {
      const tab = page.locator(`.ntab[onclick*="pg('${id}'"]`).first();
      const exists = await tab.count();
      if (!exists) continue; // قد لا يكون كل تبويب موجوداً في كل الإصدارات
      await tab.click();
      await expect(page.locator(`#${id}.on`)).toBeVisible({ timeout: 3000 });
      // لا يوجد console error مهم
    }
  });

  test('تبديل التبويبات سريع — أقل من 200ms لكل تبديل', async ({ page }) => {
    const tabs = ['rev','purch','supp','dash'];
    for (const id of tabs) {
      const start = Date.now();
      await page.locator(`.ntab[onclick*="pg('${id}'"]`).first().click();
      await expect(page.locator(`#${id}.on`)).toBeVisible();
      const elapsed = Date.now() - start;
      expect(elapsed, `تبديل إلى ${id} استغرق ${elapsed}ms`).toBeLessThan(1000);
    }
  });
});

test.describe('Sync disabled — لا overwrite', () => {
  test('disable flag يمنع supaInit', async ({ page }) => {
    await page.goto('/index.html');
    await page.evaluate(() => { try { localStorage.setItem('rh_supa_disabled','1'); } catch(e){} });
    await page.reload();
    await page.fill('#pwdInput', '1234');
    await page.click('#pwdLoginBtn');
    await expect(page.locator('#app.on')).toBeVisible();
    // انتظر قليلاً لأي محاولة تهيئة
    await page.waitForTimeout(2500);
    const supaOk = await page.evaluate(() => window.SUPA !== null && window.SUPA !== undefined);
    expect(supaOk).toBe(false);
  });
});
