const {
  sha256,
  daysIn,
  n3,
  esc,
  calcPendAdv,
  calcTotals,
  initMonth,
  validatePasswordChange,
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

  test('تُطبق الـ salt الداخلية (__rh_v25__) — نتيجتها تختلف عن SHA-256 بدون salt', async () => {
    // إذا لم يكن هناك salt، لكان الهاش مختلفاً
    const withSalt    = await sha256('abc');
    const rawInput    = new TextEncoder().encode('abc' + '__rh_v25__');
    const buf         = await globalThis.crypto.subtle.digest('SHA-256', rawInput);
    const manualHash  = Array.from(new Uint8Array(buf))
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
    // يجب عدم استخدام esc() داخل معالجات أحداث JS (onclick="...") لهذا السبب
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
    expect(calcPendAdv(advances, 'e1')).toBe(150); // 100 + 50
  });

  test('تستثني السلف المسددة بالكامل', () => {
    // 200 مسددة يجب ألا تُحسب
    expect(calcPendAdv(advances, 'e1')).not.toBe(350);
  });

  test('تستثني سلف موظف آخر', () => {
    expect(calcPendAdv(advances, 'e1')).toBe(150); // ليس 450
  });

  test('تُعيد 0 لموظف بدون سلف', () => {
    expect(calcPendAdv(advances, 'e3')).toBe(0);
  });

  test('تُعيد 0 لقائمة سلف فارغة', () => {
    expect(calcPendAdv([], 'e1')).toBe(0);
  });

  test('تتعامل مع حقل amt مفقود', () => {
    const adv = [{ empId: 'e1', status: 'مستحقة' }]; // بدون amt
    expect(calcPendAdv(adv, 'e1')).toBe(0);
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
    expect(r.rev).toBe(170); // rev يشمل pmts للتوثيق
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
      sales:   [{ cash: 1000, visa: 0, pmts: 0 }],
      mSal:    { e1: { base: 400, allow: 0, ded: 0, paid: false } },
      advances: [],
    });
    const r = calcTotals(month, emps);
    expect(r.mSalPaid).toBe(0);
    expect(r.mSalAccrued).toBe(400);
    // المصروفات لا تشمل الراتب غير المدفوع
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
    // الراتب الصافي = 500 - 100 (سلفة) = 400
    expect(r.mSalPaid).toBe(400);
  });

  test('الراتب الصافي لا يقل عن صفر (حتى لو السلف أكبر)', () => {
    const emps = [{ id: 'e1' }];
    const month = mockMonth({
      sales:    [{ cash: 1000, visa: 0, pmts: 0 }],
      mSal:     { e1: { base: 100, allow: 0, ded: 0, paid: true } },
      advances: [{ empId: 'e1', status: 'مستحقة', amt: 500 }],
    });
    const r = calcTotals(month, emps);
    expect(r.mSalPaid).toBe(0); // Math.max(0, ...)
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

  test('الأيام النشطة تحتسب اليوم فقط إذا كان فيه أي إيراد', () => {
    const month = mockMonth({
      sales: [
        { cash: 100, visa: 0, pmts: 0 },
        { cash: 0,   visa: 0, pmts: 0 }, // يوم فارغ
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
    const m = initMonth('2025-02');
    expect(m.sales).toHaveLength(28);
  });

  test('فبراير كبيس = 29 يوماً', () => {
    const m = initMonth('2024-02');
    expect(m.sales).toHaveLength(29);
  });

  test('يناير = 31 يوماً', () => {
    const m = initMonth('2025-01');
    expect(m.sales).toHaveLength(31);
  });

  test('أبريل = 30 يوماً', () => {
    const m = initMonth('2025-04');
    expect(m.sales).toHaveLength(30);
  });

  test('أرقام الأيام تبدأ من 1 وتكون متسلسلة', () => {
    const m = initMonth('2025-03');
    expect(m.sales[0].day).toBe(1);
    expect(m.sales[30].day).toBe(31);
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
    const rent = m.obligations.find(o => o.id === 'o1');
    expect(rent.amt).toBe(500);
  });

  test('الموظفون الشهريون يُهيَّأون في mSal بأصفار', () => {
    const emps = [{ id: 'e1' }, { id: 'e2' }];
    const m = initMonth('2025-08', emps);
    expect(m.mSal.e1).toEqual({ base: 0, allow: 0, ded: 0 });
    expect(m.mSal.e2).toEqual({ base: 0, allow: 0, ded: 0 });
  });

  test('قائمة السلف فارغة في الشهر الجديد', () => {
    const m = initMonth('2025-09');
    expect(m.advances).toEqual([]);
  });
});

// ─── validatePasswordChange ───────────────────────────────────────────────────

describe('validatePasswordChange()', () => {
  const correctPwd = 'test1234';
  const stored     = btoa(correctPwd); // كلمة مرور مخزنة كـ base64

  test('تنجح مع كلمة المرور الصحيحة', () => {
    const result = validatePasswordChange(stored, correctPwd, 'newpass', 'newpass');
    expect(result.ok).toBe(true);
  });

  test('ترفض كلمة المرور القديمة الخاطئة', () => {
    const result = validatePasswordChange(stored, 'wrongpwd', 'newpass', 'newpass');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('كلمة المرور الحالية غير صحيحة');
  });

  test('ترفض كلمة المرور الجديدة أقل من 4 أحرف', () => {
    const result = validatePasswordChange(stored, correctPwd, 'ab', 'ab');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('يجب أن تكون 4 أحرف على الأقل');
  });

  test('ترفض كلمتَي المرور غير المتطابقتين', () => {
    const result = validatePasswordChange(stored, correctPwd, 'newpass', 'different');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('كلمتا المرور غير متطابقتين');
  });

  // ⚠️ اختبار يكشف الخلل: بعد الترحيل إلى SHA-256 لا يمكن تغيير كلمة المرور
  test('⚠️ خلل: تفشل بعد ترحيل كلمة المرور إلى SHA-256', async () => {
    const sha256Stored = await sha256(correctPwd); // ما يُخزَّن بعد checkPwd
    // الدالة الحالية تقارن btoa فقط — ستفشل دائماً مع هاش SHA-256
    const result = validatePasswordChange(sha256Stored, correctPwd, 'newpass', 'newpass');
    expect(result.ok).toBe(false); // هذا الفشل هو الخلل — يجب أن تنجح
    expect(result.error).toBe('كلمة المرور الحالية غير صحيحة');
  });
});
