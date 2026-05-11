const {
  sha256,
  daysIn,
  n3,
  esc,
  calcPendAdv,
  calcDailyTotal,
  calcTotals,
  initMonth,
  validatePasswordChange,
  detectSyncConflict,
} = require('../core');

// ─── مساعد: بناء بيانات شهر للاختبار ────────────────────────────────────────

function mockMonth(overrides = {}) {
  return {
    sales:       [],
    purchases:   [],
    obligations: [],
    mSal:        {},
    dWages:      {},
    advances:    [],
    cashflow:    { opening: 0, actual: 0 },
    ...overrides,
  };
}

// ─── sha256 ───────────────────────────────────────────────────────────────────

describe('sha256()', () => {
  test('تُعيد نفس النتيجة لنفس الإدخال', async () => {
    const h1 = await sha256('abc');
    const h2 = await sha256('abc');
    expect(h1).toBe(h2);
  });

  test('النتيجة هاش SHA-256 صحيح (64 حرف hex)', async () => {
    const h = await sha256('test');
    expect(h).toHaveLength(64);
    expect(h).toMatch(/^[0-9a-f]+$/);
  });

  test('إدخالات مختلفة تُعطي هاشات مختلفة', async () => {
    const h1 = await sha256('password1');
    const h2 = await sha256('password2');
    expect(h1).not.toBe(h2);
  });

  test('تُطبق الـ salt الداخلية (__rh_v25__)', async () => {
    const withSalt   = await sha256('abc');
    const rawInput   = new TextEncoder().encode('abc' + '__rh_v25__');
    const buf        = await globalThis.crypto.subtle.digest('SHA-256', rawInput);
    const manualHash = Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    expect(withSalt).toBe(manualHash);
  });
});

// ─── daysIn ───────────────────────────────────────────────────────────────────

describe('daysIn()', () => {
  test.each([
    ['2025-01', 31],
    ['2025-03', 31],
    ['2025-04', 30],
    ['2025-06', 30],
    ['2025-09', 30],
    ['2025-11', 30],
    ['2025-12', 31],
  ])('%s يحتوي على %d يوماً', (key, expected) => {
    expect(daysIn(key)).toBe(expected);
  });

  test('فبراير في سنة غير كبيسة = 28 يوماً', () => {
    expect(daysIn('2025-02')).toBe(28);
  });

  test('فبراير في سنة كبيسة = 29 يوماً', () => {
    expect(daysIn('2024-02')).toBe(29);
    expect(daysIn('2028-02')).toBe(29);
  });
});

// ─── n3 ──────────────────────────────────────────────────────────────────────

describe('n3()', () => {
  test('تُنسّق رقم صحيح إلى 3 منازل عشرية', () => {
    expect(n3(5)).toBe('5.000');
  });

  test('تُنسّق رقم عشري إلى 3 منازل', () => {
    expect(n3(1.5)).toBe('1.500');
    expect(n3(12.345)).toBe('12.345');
  });

  test('تُعيد "0.000" لـ null', () => {
    expect(n3(null)).toBe('0.000');
  });

  test('تُعيد "0.000" لـ undefined', () => {
    expect(n3(undefined)).toBe('0.000');
  });

  test('تُعيد "0.000" لنص غير رقمي', () => {
    expect(n3('abc')).toBe('0.000');
  });

  test('تتعامل مع أرقام ممررة كنصوص', () => {
    expect(n3('12.5')).toBe('12.500');
    expect(n3('0')).toBe('0.000');
  });

  test('تتعامل مع صفر', () => {
    expect(n3(0)).toBe('0.000');
  });
});

// ─── esc ──────────────────────────────────────────────────────────────────────

describe('esc()', () => {
  test('تُهرّب &', () => {
    expect(esc('a & b')).toBe('a &amp; b');
  });

  test('تُهرّب <', () => {
    expect(esc('<script>')).toBe('&lt;script&gt;');
  });

  test('تُهرّب >', () => {
    expect(esc('a > b')).toBe('a &gt; b');
  });

  test('تُهرّب علامة الاقتباس المزدوجة "', () => {
    expect(esc('"hello"')).toBe('&quot;hello&quot;');
  });

  test('تُعيد نصاً فارغاً لـ null', () => {
    expect(esc(null)).toBe('');
  });

  test('تُعيد نصاً فارغاً لـ undefined', () => {
    expect(esc(undefined)).toBe('');
  });

  test('لا تُغيّر النصوص الآمنة', () => {
    expect(esc('مرحبا بالعالم')).toBe('مرحبا بالعالم');
  });

  test('ثغرة موثوقة: علامة الاقتباس المفردة لا تُهرَّب', () => {
    expect(esc("it's fine")).toBe("it's fine");
  });
});

// ─── calcPendAdv ──────────────────────────────────────────────────────────────

describe('calcPendAdv()', () => {
  const advances = [
    { empId: 'e1', status: 'مستحقة',      amt: 100 },
    { empId: 'e1', status: 'مسددة جزئياً', amt: 50  },
    { empId: 'e1', status: 'مسددة',        amt: 200 },
    { empId: 'e2', status: 'مستحقة',      amt: 300 },
  ];

  test('تجمع السلف المعلقة والمسددة جزئياً فقط', () => {
    expect(calcPendAdv(advances, 'e1')).toBe(150);
  });

  test('تستثني السلف المسددة بالكامل', () => {
    expect(calcPendAdv(advances, 'e1')).not.toBe(350);
  });

  test('تستثني سلف موظف آخر', () => {
    expect(calcPendAdv(advances, 'e1')).toBe(150);
  });

  test('تُعيد 0 لموظف بدون سلف', () => {
    expect(calcPendAdv(advances, 'e3')).toBe(0);
  });

  test('تُعيد 0 لقائمة سلف فارغة', () => {
    expect(calcPendAdv([], 'e1')).toBe(0);
  });

  test('تتعامل مع حقل amt مفقود', () => {
    const adv = [{ empId: 'e1', status: 'مستحقة' }];
    expect(calcPendAdv(adv, 'e1')).toBe(0);
  });
});

// ─── calcDailyTotal ───────────────────────────────────────────────────────────

describe('calcDailyTotal()', () => {
  test('يستخدم الأجر الأساسي لجميع الأيام عند غياب الأجر المخصص', () => {
    const w = { rate: 10, att: [1, 2, 3] };
    expect(calcDailyTotal(w)).toBe(30);
  });

  test('يستخدم الأجر المخصص لليوم المحدد', () => {
    const w = { rate: 10, att: [1, 2, 3], rateOverrides: { 2: 15 } };
    expect(calcDailyTotal(w)).toBe(35); // 10 + 15 + 10
  });

  test('يستخدم أجر مخصص لأكثر من يوم', () => {
    const w = { rate: 10, att: [1, 2, 3, 4], rateOverrides: { 1: 20, 3: 15 } };
    expect(calcDailyTotal(w)).toBe(55); // 20 + 10 + 15 + 10
  });

  test('يُعيد 0 لقائمة حضور فارغة', () => {
    const w = { rate: 10, att: [] };
    expect(calcDailyTotal(w)).toBe(0);
  });

  test('يتعامل مع w فارغ تماماً', () => {
    expect(calcDailyTotal({})).toBe(0);
  });

  test('أجر مخصص = 0 لا يُلغى — يعني دفع صفر لذلك اليوم', () => {
    const w = { rate: 10, att: [1, 2], rateOverrides: { 1: 0 } };
    expect(calcDailyTotal(w)).toBe(10); // 0 + 10
  });

  test('calcTotals يُجمّع أجور اليوميين مع الأجر المخصص', () => {
    const month = {
      sales: [], purchases: [], obligations: [], mSal: {}, advances: [], cashflow: {},
      dWages: {
        emp1: { rate: 10, att: [1, 2, 3], rateOverrides: { 2: 20 } },
      },
    };
    const dailyEmps = [{ id: 'emp1' }];
    const t = calcTotals(month, [], dailyEmps);
    expect(t.dwTotal).toBe(40); // 10 + 20 + 10
  });
});

// ─── calcTotals ───────────────────────────────────────────────────────────────

describe('calcTotals()', () => {
  test('netSales = نقدي + فيزا (لا تشمل pmts)', () => {
    const month = mockMonth({
      sales: [{ cash: 100, visa: 50, pmts: 20 }],
    });
    const r = calcTotals(month);
    expect(r.netSales).toBe(150);
    expect(r.pmts).toBe(20);
    expect(r.rev).toBe(170);
  });

  test('الالتزامات غير المدفوعة لا تدخل في المصروفات', () => {
    const month = mockMonth({
      sales: [{ cash: 1000, visa: 0, pmts: 0 }],
      obligations: [
        { amt: 500,  paid: true  },
        { amt: 1000, paid: false },
      ],
    });
    const r = calcTotals(month);
    expect(r.oblPaid).toBe(500);
    expect(r.oblTotal).toBe(1500);
  });

  test('الرواتب غير المدفوعة لا تُخفض الربح', () => {
    const emps = [{ id: 'e1' }];
    const month = mockMonth({
      sales:    [{ cash: 1000, visa: 0, pmts: 0 }],
      mSal:     { e1: { base: 400, allow: 0, ded: 0, paid: false } },
      advances: [],
    });
    const r = calcTotals(month, emps);
    expect(r.mSalPaid).toBe(0);
    expect(r.mSalAccrued).toBe(400);
    expect(r.totalExp).toBe(0);
    expect(r.profit).toBe(1000);
  });

  test('الرواتب المدفوعة تُخفض الربح', () => {
    const emps = [{ id: 'e1' }];
    const month = mockMonth({
      sales:    [{ cash: 1000, visa: 0, pmts: 0 }],
      mSal:     { e1: { base: 400, allow: 0, ded: 0, paid: true } },
      advances: [],
    });
    const r = calcTotals(month, emps);
    expect(r.mSalPaid).toBe(400);
    expect(r.profit).toBe(600);
  });

  test('لا قسمة على صفر عندما netSales = 0', () => {
    const month = mockMonth();
    const r = calcTotals(month);
    expect(r.margin).toBe(0);
    expect(r.cogsRatio).toBe(0);
    expect(r.expRatio).toBe(0);
  });

  test('السلف المعلقة تُخفض الراتب الصافي للموظف', () => {
    const emps = [{ id: 'e1' }];
    const month = mockMonth({
      sales:    [{ cash: 1000, visa: 0, pmts: 0 }],
      mSal:     { e1: { base: 500, allow: 0, ded: 0, paid: true } },
      advances: [{ empId: 'e1', status: 'مستحقة', amt: 100 }],
    });
    const r = calcTotals(month, emps);
    expect(r.mSalPaid).toBe(400);
  });

  test('الراتب الصافي لا يقل عن صفر', () => {
    const emps = [{ id: 'e1' }];
    const month = mockMonth({
      sales:    [{ cash: 1000, visa: 0, pmts: 0 }],
      mSal:     { e1: { base: 100, allow: 0, ded: 0, paid: true } },
      advances: [{ empId: 'e1', status: 'مستحقة', amt: 500 }],
    });
    const r = calcTotals(month, emps);
    expect(r.mSalPaid).toBe(0);
  });

  test('COGS تُحسب ضمن المصروفات', () => {
    const month = mockMonth({
      sales:     [{ cash: 1000, visa: 0, pmts: 0 }],
      purchases: [{ cat: 'COGS', amt: 300 }],
    });
    const r = calcTotals(month);
    expect(r.bycat.COGS).toBe(300);
    expect(r.totalExp).toBe(300);
    expect(r.profit).toBe(700);
  });

  test('grossP = netSales - COGS', () => {
    const month = mockMonth({
      sales:     [{ cash: 1000, visa: 0, pmts: 0 }],
      purchases: [{ cat: 'COGS', amt: 250 }],
    });
    const r = calcTotals(month);
    expect(r.grossP).toBe(750);
  });

  test('الأيام النشطة تحتسب فقط الأيام ذات إيراد', () => {
    const month = mockMonth({
      sales: [
        { cash: 100, visa: 0, pmts: 0 },
        { cash: 0,   visa: 0, pmts: 0 },
        { cash: 0,   visa: 50, pmts: 0 },
      ],
    });
    const r = calcTotals(month);
    expect(r.daysActive).toBe(2);
  });
});

// ─── initMonth ────────────────────────────────────────────────────────────────

describe('initMonth()', () => {
  test('فبراير غير كبيس = 28 يوماً', () => {
    expect(initMonth('2025-02').sales).toHaveLength(28);
  });

  test('فبراير كبيس = 29 يوماً', () => {
    expect(initMonth('2024-02').sales).toHaveLength(29);
  });

  test('يناير = 31 يوماً', () => {
    expect(initMonth('2025-01').sales).toHaveLength(31);
  });

  test('أبريل = 30 يوماً', () => {
    expect(initMonth('2025-04').sales).toHaveLength(30);
  });

  test('أرقام الأيام تبدأ من 1 وتكون متسلسلة', () => {
    const m = initMonth('2025-03');
    m.sales.forEach((s, i) => expect(s.day).toBe(i + 1));
  });

  test('كل يوم تكون قيم cash و visa و pmts مهيأة بالصفر', () => {
    const m = initMonth('2025-05');
    m.sales.forEach(s => {
      expect(s.cash).toBe(0);
      expect(s.visa).toBe(0);
      expect(s.pmts).toBe(0);
    });
  });

  test('يحتوي على 7 التزامات افتراضية كلها غير مدفوعة', () => {
    const m = initMonth('2025-06');
    expect(m.obligations).toHaveLength(7);
    m.obligations.forEach(o => expect(o.paid).toBe(false));
  });

  test('إيجار المحل مُعبأ بـ 500 بشكل افتراضي', () => {
    const m = initMonth('2025-07');
    expect(m.obligations.find(o => o.id === 'o1').amt).toBe(500);
  });

  test('الموظفون الشهريون يُهيَّأون في mSal بأصفار', () => {
    const emps = [{ id: 'e1' }, { id: 'e2' }];
    const m = initMonth('2025-08', emps);
    expect(m.mSal.e1).toEqual({ base: 0, allow: 0, ded: 0 });
    expect(m.mSal.e2).toEqual({ base: 0, allow: 0, ded: 0 });
  });

  test('قائمة السلف فارغة في الشهر الجديد', () => {
    expect(initMonth('2025-09').advances).toEqual([]);
  });
});

// ─── validatePasswordChange ───────────────────────────────────────────────────

describe('validatePasswordChange()', () => {
  const correctPwd = 'test1234';
  let stored;

  beforeAll(async () => {
    stored = await sha256(correctPwd);
  });

  test('تنجح مع كلمة المرور الصحيحة', async () => {
    const r = await validatePasswordChange(stored, correctPwd, 'newpass', 'newpass');
    expect(r.ok).toBe(true);
  });

  test('ترفض كلمة المرور القديمة الخاطئة', async () => {
    const r = await validatePasswordChange(stored, 'wrongpwd', 'newpass', 'newpass');
    expect(r.ok).toBe(false);
    expect(r.error).toBe('كلمة المرور الحالية غير صحيحة');
  });

  test('ترفض كلمة المرور الجديدة أقل من 4 أحرف', async () => {
    const r = await validatePasswordChange(stored, correctPwd, 'ab', 'ab');
    expect(r.ok).toBe(false);
    expect(r.error).toBe('يجب أن تكون 4 أحرف على الأقل');
  });

  test('ترفض كلمتَي المرور غير المتطابقتين', async () => {
    const r = await validatePasswordChange(stored, correctPwd, 'newpass', 'different');
    expect(r.ok).toBe(false);
    expect(r.error).toBe('كلمتا المرور غير متطابقتين');
  });

  test('تنجح بعد ترحيل كلمة المرور إلى SHA-256', async () => {
    const sha256Stored = await sha256(correctPwd);
    const result = await validatePasswordChange(sha256Stored, correctPwd, 'newpass', 'newpass');
    expect(result.ok).toBe(true);
  });
});

// ─── detectSyncConflict ───────────────────────────────────────────────────────

describe('detectSyncConflict()', () => {
  const deviceA = 'Mozilla/5.0 Device-A';
  const deviceB = 'Mozilla/5.0 Device-B';

  const time = (offsetMs = 0) =>
    new Date(Date.now() + offsetMs).toISOString();

  test('لا تعارض إذا كان الجهاز نفسه', () => {
    const result = detectSyncConflict({
      cloudSavedAt:  time(-120000), // قبل دقيقتين
      cloudDevice:   deviceA,
      localLastPush: time(0),
      localDevice:   deviceA,       // نفس الجهاز
    });
    expect(result.hasConflict).toBe(false);
  });

  test('لا تعارض إذا كانت السحابة أحدث', () => {
    const result = detectSyncConflict({
      cloudSavedAt:  time(0),        // السحابة أحدث
      cloudDevice:   deviceB,
      localLastPush: time(-120000),  // المحلي أقدم بدقيقتين
      localDevice:   deviceA,
    });
    expect(result.hasConflict).toBe(false);
  });

  test('لا تعارض إذا كان الفارق أقل من 60 ثانية', () => {
    const result = detectSyncConflict({
      cloudSavedAt:  time(-30000),  // السحابة قبل 30 ثانية
      cloudDevice:   deviceB,
      localLastPush: time(0),       // المحلي الآن
      localDevice:   deviceA,
    });
    expect(result.hasConflict).toBe(false);
  });

  test('تعارض: المحلي أحدث من السحابة بأكثر من 60 ثانية من جهاز آخر', () => {
    const result = detectSyncConflict({
      cloudSavedAt:  time(-120000), // السحابة قبل دقيقتين
      cloudDevice:   deviceB,
      localLastPush: time(0),       // المحلي الآن
      localDevice:   deviceA,
    });
    expect(result.hasConflict).toBe(true);
  });

  test('تُعيد توقيتَي السحابة والمحلي عند التعارض للعرض في رسالة التأكيد', () => {
    const cloudTime = time(-120000);
    const localTime = time(0);
    const result = detectSyncConflict({
      cloudSavedAt:  cloudTime,
      cloudDevice:   deviceB,
      localLastPush: localTime,
      localDevice:   deviceA,
    });
    expect(result.cloudSavedAt).toBe(cloudTime);
    expect(result.localLastPush).toBe(localTime);
  });

  test('لا تعارض إذا كانت بيانات السحابة بدون جهاز (أول رفع)', () => {
    const result = detectSyncConflict({
      cloudSavedAt:  null,
      cloudDevice:   null,
      localLastPush: time(0),
      localDevice:   deviceA,
    });
    expect(result.hasConflict).toBe(false);
  });

  test('لا تعارض إذا لم يكن هناك رفع محلي سابق', () => {
    const result = detectSyncConflict({
      cloudSavedAt:  time(-120000),
      cloudDevice:   deviceB,
      localLastPush: null,           // لا يوجد رفع محلي
      localDevice:   deviceA,
    });
    expect(result.hasConflict).toBe(false);
  });
});
