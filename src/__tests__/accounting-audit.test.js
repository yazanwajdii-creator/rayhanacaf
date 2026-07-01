/**
 * accounting-audit.test.js — تدقيق محاسبي ضدّ البيانات الفعلية للمستخدم
 * v38: يضمن أن صيغ totals/calcSal/pendAdv صحيحة 100% على بيانات حقيقية
 *
 * يستخدم نسخة من بذرة v35+ ويتحقّق يدوياً من:
 * - مجاميع الإيرادات الشهرية
 * - مجاميع المشتريات
 * - سلف الموظفين
 * - الفروقات بين الأشهر للمقارنة الفعلية
 */

const {
  calcPendAdv,
  calcDailyTotal,
  calcTotals,
} = require('../core');

// === بيانات حقيقية مُختصرة من بذرة v35 — أبريل + مايو 2026 ===

const monthlyEmps = [
  { id: 'hani',  name: 'هاني' },
  { id: 'sidra', name: 'سدرة' },
  { id: 'aya',   name: 'آية' },
];
const dailyEmps = [
  { id: 'tharaa', name: 'ثراء' },
  { id: 'enaa',   name: 'عيناء' },
  { id: 'waad',   name: 'وعد' },
];

// مايو 2026 — مبسّط (أول 5 أيام للاختبار)
const may2026 = {
  sales: [
    { day: 1, cash: 322.7,  visa: 100.75, pmts: 40,  notes: 'عنود+حنين+سجود+هبه' },
    { day: 2, cash: 113.75, visa: 36.75,  pmts: 45,  notes: 'ليان+حنين+هبه+سجود' },
    { day: 3, cash: 148.75, visa: 27.75,  pmts: 60,  notes: 'ليان+حنين+سجود+عنود+سارة+هبة' },
    { day: 4, cash: 229,    visa: 56.75,  pmts: 50,  notes: '' },
    { day: 5, cash: 307,    visa: 76.5,   pmts: 50,  notes: '' },
  ],
  purchases: [
    { date: '2026-05-01', sId: 's5', sName: 'ارض السكر', cat: 'COGS', amt: 216.85, buyer: 'عبدالرحمن' },
    { date: '2026-05-02', sId: 's3', sName: 'يحيى رسمي', cat: 'COGS', amt: 189,    buyer: 'عبدالرحمن' },
    { date: '2026-05-04', sId: 's3', sName: 'يحيى رسمي', cat: 'COGS', amt: 114,    buyer: 'عبدالرحمن' },
    { date: '2026-05-05', sId: 's9', sName: 'مونين',     cat: 'COGS', amt: 370.65, buyer: 'عبدالرحمن' },
  ],
  obligations: [
    { id: 'o1', name: 'إيجار',  amt: 500,  paid: false, due: '' },
    { id: 'o3', name: 'الجمعية', amt: 1000, paid: false, due: '' },
  ],
  mSal: {
    hani:  { base: 150, allow: 0, ded: 0, paid: false },
    sidra: { base: 290, allow: 0, ded: 5, paid: false },
    aya:   { base: 300, allow: 0, ded: 0, paid: false },
  },
  dWages: {
    tharaa: { rate: 10, att: [1, 2, 3, 4, 5] },
    enaa:   { rate: 10, att: [1, 2, 3, 5]    },
    waad:   { rate: 10, att: [1, 2, 4, 5]    },
  },
  advances: [
    { date: '2026-05-01', empId: 'hani', empName: 'هاني', amt: 95, status: 'مستحقة' },
  ],
  cashflow: { opening: 0, actual: 0 },
};

describe('تدقيق محاسبي — بيانات مايو 2026 (5 أيام)', () => {
  test('إجماليات المبيعات صحيحة يدوياً', () => {
    var cash = 322.7 + 113.75 + 148.75 + 229 + 307;
    var visa = 100.75 + 36.75 + 27.75 + 56.75 + 76.5;
    var pmts = 40 + 45 + 60 + 50 + 50;
    expect(cash).toBeCloseTo(1121.2, 2);
    expect(visa).toBeCloseTo(298.5, 2);
    expect(pmts).toBe(245);
    var t = calcTotals(may2026, monthlyEmps, dailyEmps);
    expect(t.cash).toBeCloseTo(1121.2, 2);
    expect(t.visa).toBeCloseTo(298.5, 2);
    expect(t.pmts).toBe(245);
    expect(t.netSales).toBeCloseTo(1419.7, 2); // cash + visa
    expect(t.rev).toBeCloseTo(1664.7, 2); // + pmts
  });

  test('إجمالي المشتريات COGS = 890.50', () => {
    var sum = 216.85 + 189 + 114 + 370.65;
    expect(sum).toBeCloseTo(890.5, 2);
    var t = calcTotals(may2026, monthlyEmps, dailyEmps);
    expect(t.bycat.COGS).toBeCloseTo(890.5, 2);
    expect(t.bycat.total).toBeCloseTo(890.5, 2);
  });

  test('السلف المستحقة لـ هاني = 95', () => {
    expect(calcPendAdv(may2026.advances, 'hani')).toBe(95);
    expect(calcPendAdv(may2026.advances, 'aya')).toBe(0);
  });

  test('صافي راتب هاني (مع السلفة) = 55 = 150 + 0 - 0 - 95', () => {
    var t = calcTotals(may2026, monthlyEmps, dailyEmps);
    // هاني غير مدفوع — يدخل mSalAccrued
    // gross = 150, ded = 0, adv = 95, net = max(0, 150-0-95) = 55
    // لكن totals يحسب فقط للمدفوع — هاني غير مدفوع → mSalPaid = 0
    expect(t.mSalPaid).toBe(0);
    expect(t.mSalG).toBe(150 + 290 + 300); // 740
    // mSalNet = sum max(0, base+allow-ded-adv)
    // hani: max(0,150-0-95)=55, sidra: max(0,290-5-0)=285, aya: max(0,300)=300
    expect(t.mSalNet).toBe(55 + 285 + 300); // 640
  });

  test('الأجور اليومية = ثراء 50 + عيناء 40 + وعد 40 = 130', () => {
    expect(calcDailyTotal(may2026.dWages.tharaa)).toBe(50); // 5 أيام × 10
    expect(calcDailyTotal(may2026.dWages.enaa)).toBe(40);   // 4 × 10
    expect(calcDailyTotal(may2026.dWages.waad)).toBe(40);   // 4 × 10
    var t = calcTotals(may2026, monthlyEmps, dailyEmps);
    expect(t.dwTotal).toBe(130);
  });

  test('الالتزامات: إجمالي 1500، مدفوع 0', () => {
    var t = calcTotals(may2026, monthlyEmps, dailyEmps);
    expect(t.oblTotal).toBe(1500);
    expect(t.oblPaid).toBe(0);
  });

  test('إجمالي المصاريف المعترف بها = COGS + oblPaid + mSalPaid (السلوك المتفق عليه)', () => {
    var t = calcTotals(may2026, monthlyEmps, dailyEmps);
    // totalExp = bycat.total + oblPaid + mSalPaid (لا تشمل غير المدفوع)
    expect(t.totalExp).toBeCloseTo(890.5 + 0 + 0, 2); // 890.5
  });

  test('صافي الربح = netSales − totalExp = 1419.7 − 890.5 = 529.2', () => {
    var t = calcTotals(may2026, monthlyEmps, dailyEmps);
    expect(t.profit).toBeCloseTo(529.2, 2);
  });

  test('هامش الربح ≈ 37.27%', () => {
    var t = calcTotals(may2026, monthlyEmps, dailyEmps);
    // 529.2 / 1419.7 = 0.3727
    expect(t.margin).toBeCloseTo(37.27, 1);
  });

  test('المتوسط اليومي على الأيام النشطة (5) = 332.94', () => {
    var t = calcTotals(may2026, monthlyEmps, dailyEmps);
    // rev = 1664.7, daysActive = 5
    expect(t.daysActive).toBe(5);
    expect(t.avgDaily).toBeCloseTo(332.94, 2);
  });

  test('عند دفع راتب هاني → mSalPaid يحتسب 55', () => {
    var d2 = JSON.parse(JSON.stringify(may2026));
    d2.mSal.hani.paid = true;
    var t = calcTotals(d2, monthlyEmps, dailyEmps);
    expect(t.mSalPaid).toBe(55);
    expect(t.totalExp).toBeCloseTo(890.5 + 0 + 55, 2);
    expect(t.profit).toBeCloseTo(1419.7 - 945.5, 2);
  });

  test('عند دفع الإيجار → oblPaid = 500 ولا يُحتسب الـ 1000 غير المدفوع', () => {
    var d2 = JSON.parse(JSON.stringify(may2026));
    d2.obligations[0].paid = true;
    var t = calcTotals(d2, monthlyEmps, dailyEmps);
    expect(t.oblPaid).toBe(500);
    expect(t.oblTotal).toBe(1500); // الإجمالي ثابت
  });

  test('عند سداد السلفة جزئياً → السلف المعلقة تنخفض', () => {
    var d2 = JSON.parse(JSON.stringify(may2026));
    d2.advances[0].status = 'مسددة جزئياً';
    d2.advances[0].amt = 50;
    expect(calcPendAdv(d2.advances, 'hani')).toBe(50);
  });

  test('عند سداد السلفة كاملاً → السلف المعلقة = 0', () => {
    var d2 = JSON.parse(JSON.stringify(may2026));
    d2.advances[0].status = 'مسددة';
    expect(calcPendAdv(d2.advances, 'hani')).toBe(0);
  });
});

describe('تدقيق محاسبي — rateOverrides للأجور اليومية', () => {
  test('rateOverrides لا تكسر الحساب لو غير موجودة', () => {
    var w = { rate: 10, att: [1, 2, 3] };
    expect(calcDailyTotal(w)).toBe(30);
  });

  test('rateOverrides تتجاوز الأجر الأساسي ليوم محدد', () => {
    var w = { rate: 10, att: [1, 2, 3], rateOverrides: { 2: 15 } };
    // يوم 1: 10، يوم 2: 15، يوم 3: 10 = 35
    expect(calcDailyTotal(w)).toBe(35);
  });

  test('rateOverrides لأيام غير حاضرة لا تُحسب', () => {
    var w = { rate: 10, att: [1, 3], rateOverrides: { 2: 100 } };
    // يوم 2 غير حاضر، فلا يُحسب
    expect(calcDailyTotal(w)).toBe(20);
  });
});

describe('تدقيق محاسبي — حالات حرجة لا تكسر النظام', () => {
  test('شهر فارغ كل الأرقام = 0', () => {
    var empty = {
      sales: [], purchases: [], obligations: [], mSal: {}, dWages: {}, advances: [],
    };
    var t = calcTotals(empty, [], []);
    expect(t.rev).toBe(0);
    expect(t.profit).toBe(0);
    expect(t.margin).toBe(0); // لا قسمة على صفر
    expect(t.daysActive).toBe(0);
  });

  test('سلف لموظف غير موجود لا تؤثر', () => {
    var advances = [{ empId: 'ghost', amt: 100, status: 'مستحقة' }];
    expect(calcPendAdv(advances, 'hani')).toBe(0);
    expect(calcPendAdv(advances, 'ghost')).toBe(100);
  });
});
