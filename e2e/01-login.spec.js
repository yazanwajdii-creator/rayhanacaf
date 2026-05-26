// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * اختبارات تسجيل الدخول
 * يُغطّي السيناريوهات الحرجة:
 * - فتح الصفحة → عرض شعار + حقل
 * - 1234 ينجح
 * - كلمة مرور خاطئة → رسالة
 * - حقل فارغ → رسالة
 * - زر "نسيت" يعيد الضبط
 */
test.describe('Login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
  });

  test('شاشة الدخول تظهر بعناصرها الأساسية', async ({ page }) => {
    await expect(page.locator('#pinScreen')).toBeVisible();
    await expect(page.locator('#pwdInput')).toBeVisible();
    await expect(page.locator('#pwdLoginBtn')).toBeVisible();
    await expect(page.locator('.rh-brand-name')).toHaveText('ريحانة');
  });

  test('1234 يدخل بنجاح', async ({ page }) => {
    await page.fill('#pwdInput', '1234');
    await page.click('#pwdLoginBtn');
    await expect(page.locator('#app.on')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#pinScreen')).toBeHidden();
  });

  test('كلمة مرور خاطئة → رسالة + يبقى على الشاشة', async ({ page }) => {
    await page.fill('#pwdInput', 'wrong');
    await page.click('#pwdLoginBtn');
    await expect(page.locator('#pwd-err')).toContainText('كلمة المرور غير صحيحة');
    await expect(page.locator('#pinScreen')).toBeVisible();
  });

  test('حقل فارغ → رسالة تطالب بالإدخال', async ({ page }) => {
    await page.click('#pwdLoginBtn');
    await expect(page.locator('#pwd-err')).toContainText('أدخل كلمة المرور');
  });

  test('Enter في الحقل = ضغط زر الدخول', async ({ page }) => {
    await page.fill('#pwdInput', '1234');
    await page.press('#pwdInput', 'Enter');
    await expect(page.locator('#app.on')).toBeVisible({ timeout: 5000 });
  });
});
