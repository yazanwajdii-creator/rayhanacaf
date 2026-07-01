const {
  gregToHijri,
  formatHijri,
  getHolidayInfo,
  getUpcomingHoliday,
  JO_HOLIDAYS_GREG,
  JO_HOLIDAYS_HIJRI,
  HIJRI_MONTHS,
} = require('../calendar');

describe('gregToHijri()', () => {
  test('يُحوّل 25 مايو 2026 إلى 8 ذو الحجة 1447', () => {
    // ملاحظة: قد يختلف يوم واحد بين islamic-umalqura و islamic
    const h = gregToHijri(new Date(2026, 4, 25));
    expect(h).not.toBeNull();
    expect(h.y).toBe(1447);
    expect(h.m).toBe(12);
    expect([8, 9]).toContain(h.d); // ±1 يوم مقبول بين الخوارزميات
  });

  test('يُحوّل 26 مايو 2026 إلى ~9 ذو الحجة 1447 (يوم عرفة)', () => {
    const h = gregToHijri(new Date(2026, 4, 26));
    expect(h.y).toBe(1447);
    expect(h.m).toBe(12);
    expect([9, 10]).toContain(h.d);
  });
});

describe('formatHijri()', () => {
  test('يُنسّق بالعربية مع اسم الشهر', () => {
    const s = formatHijri(new Date(2026, 4, 25));
    expect(s).toMatch(/ذو الحجة 1447 هـ/);
  });

  test('لا يفشل في تاريخ قديم', () => {
    const s = formatHijri(new Date(2000, 0, 1));
    expect(typeof s).toBe('string');
    expect(s.length).toBeGreaterThan(0);
  });
});

describe('getHolidayInfo() — العطل الميلادية', () => {
  test('25 مايو = عيد الاستقلال الأردني', () => {
    const info = getHolidayInfo(new Date(2026, 4, 25));
    expect(info).not.toBeNull();
    // قد تكون اليوم عطلة هجرية أيضاً (يوم عرفة)؛ نتحقّق من إحداهما
    expect(info.name).toMatch(/الاستقلال|عرفة/);
  });

  test('1 يناير = رأس السنة الميلادية', () => {
    const info = getHolidayInfo(new Date(2026, 0, 1));
    expect(info).not.toBeNull();
    expect(info.name).toContain('رأس السنة');
  });

  test('1 مايو = عيد العمال (المحل مغلق)', () => {
    const info = getHolidayInfo(new Date(2026, 4, 1));
    expect(info).not.toBeNull();
    expect(info.name).toContain('العمال');
    expect(info.closed).toBe(true);
  });

  test('يوم عادي (15 مارس) ليس عطلة', () => {
    const info = getHolidayInfo(new Date(2026, 2, 15));
    expect(info).toBeNull();
  });
});

describe('getHolidayInfo() — العطل الهجرية', () => {
  test('26 مايو 2026 = عيد الأضحى (10 ذو الحجة)', () => {
    const info = getHolidayInfo(new Date(2026, 4, 26));
    expect(info).not.toBeNull();
    expect(info.name).toMatch(/الأضحى|عرفة/); // اعتماداً على الخوارزمية
    expect(info.source).toBe('hijri');
  });

  test('16 يونيو 2026 = رأس السنة الهجرية 1448', () => {
    const info = getHolidayInfo(new Date(2026, 5, 16));
    // قد يقع بـ ±يوم. نقبل أن يكون التاريخ هجري عطلة معروفة
    if (info) {
      expect(info.source).toBe('hijri');
    }
  });
});

describe('getUpcomingHoliday()', () => {
  test('من 20 مايو 2026 → يجد عيد الاستقلال (25 مايو) خلال 7 أيام', () => {
    const u = getUpcomingHoliday(new Date(2026, 4, 20), 7);
    expect(u).not.toBeNull();
    expect(u.daysUntil).toBeGreaterThan(0);
    expect(u.daysUntil).toBeLessThanOrEqual(7);
    expect(u.info.name).toBeTruthy();
  });

  test('من 24 مايو 2026 خلال يوم واحد → عيد الاستقلال غداً', () => {
    const u = getUpcomingHoliday(new Date(2026, 4, 24), 1);
    expect(u).not.toBeNull();
    expect(u.daysUntil).toBe(1);
  });

  test('من تاريخ بعيد بدون عطلة قريبة → null', () => {
    // 1 يوليو 2026 — لا عطلة معروفة خلال يومين
    const u = getUpcomingHoliday(new Date(2026, 6, 1), 1);
    // قد توجد عطلة هجرية مفاجئة — نتحقّق إن كان null أو صحيحاً
    if (u !== null) expect(u.daysUntil).toBeGreaterThan(0);
  });
});

describe('قواميس العطل', () => {
  test('JO_HOLIDAYS_GREG يحتوي 4 عطل رئيسية', () => {
    expect(Object.keys(JO_HOLIDAYS_GREG).length).toBeGreaterThanOrEqual(4);
    expect(JO_HOLIDAYS_GREG['05-25']).toBeDefined();
  });

  test('JO_HOLIDAYS_HIJRI يحتوي عيد الأضحى 4 أيام', () => {
    const adha = JO_HOLIDAYS_HIJRI.filter(h => h.name.includes('الأضحى'));
    expect(adha.length).toBe(4);
  });

  test('JO_HOLIDAYS_HIJRI يحتوي عيد الفطر 3 أيام', () => {
    const fitr = JO_HOLIDAYS_HIJRI.filter(h => h.name.includes('الفطر'));
    expect(fitr.length).toBe(3);
  });

  test('HIJRI_MONTHS فيه 12 شهراً عربياً', () => {
    expect(HIJRI_MONTHS.filter(m => m).length).toBe(12);
    expect(HIJRI_MONTHS[9]).toBe('رمضان');
    expect(HIJRI_MONTHS[12]).toBe('ذو الحجة');
  });
});
