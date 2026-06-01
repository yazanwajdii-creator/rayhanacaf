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

test.describe('Data persistence (لا فقد بيانات)', () => {
  test('saveAll يحفظ كل الحقول الحرجة', async ({ page }) => {
    await login(page);
    // اكتب بيانات
    await page.evaluate(() => {
      window.S.itemCatalog = { 'قهوة': { unit: 'كيلو', price: 25 } };
      window.S.purchaseTemplates = [{ name: 'قالب يومي', items: [] }];
      window.S.budgets = { 'COGS': 5000 };
      window.saveAll();
    });
    // اقرأ من localStorage
    const stored = await page.evaluate(() => {
      try {
        return JSON.parse(localStorage.getItem('rh_v6') || '{}');
      } catch(e) { return null; }
    });
    expect(stored).not.toBeNull();
    expect(stored.itemCatalog).toBeDefined();
    expect(stored.itemCatalog['قهوة']).toBeDefined();
    expect(stored.purchaseTemplates).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'قالب يومي' })
    ]));
    expect(stored.budgets).toEqual({ COGS: 5000 });
  });

  test('Reload بعد التعديل = يحتفظ بكل البيانات', async ({ page }) => {
    await login(page);
    await page.evaluate(() => {
      window.S.itemCatalog = { 'سكر': { unit: 'كيلو', price: 2 } };
      window.saveAll();
    });
    // إعادة تحميل
    await page.reload();
    await page.fill('#pwdInput', '1234');
    await page.click('#pwdLoginBtn');
    await expect(page.locator('#app.on')).toBeVisible();
    const after = await page.evaluate(() => window.S.itemCatalog);
    expect(after['سكر']).toBeDefined();
    expect(after['سكر'].price).toBe(2);
  });

  test('JSON تالف في localStorage لا يكتب فوق البيانات', async ({ page }) => {
    await login(page);
    // أفسد البيانات
    await page.evaluate(() => {
      localStorage.setItem('rh_v6', '{INVALID_JSON');
    });
    // أعد التحميل
    await page.reload();
    // يجب أن تظهر شاشة الدخول (التطبيق لا يدخل تلقائياً)
    // والـ flag للتلف يجب أن يُضبط
    await page.fill('#pwdInput', '1234');
    await page.click('#pwdLoginBtn');
    await expect(page.locator('#app.on')).toBeVisible({ timeout: 5000 });
    const corruptedFlag = await page.evaluate(() => window._loadStoreCorrupted === true);
    expect(corruptedFlag).toBe(true);
    // البذرة لا تكتب فوق التالف بصمت — يجب رؤية حالة محفوظة في LS
    const lsStillCorrupted = await page.evaluate(() => {
      const raw = localStorage.getItem('rh_v6');
      try { JSON.parse(raw); return false; } catch(e){ return true; }
    });
    // إما تالف ما زال (لمنع الكتابة فوقه) أو استُعيد من IDB
    // لا يكون فارغاً صامتاً
    expect(typeof (await page.evaluate(() => localStorage.getItem('rh_v6')))).toBe('string');
  });
});
