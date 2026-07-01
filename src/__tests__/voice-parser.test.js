/**
 * اختبارات محلّل الأوامر الصوتية — v56
 * أرقام عربية + استخراج نوايا (شراء/مبيعات/سلفة/راتب)
 */

const {
  _normalizeArabic,
  _parseArabicNumber,
  _parseVoiceCommand,
} = require('../voice-parser');

const FIXED_DATE = new Date('2026-05-29T10:00:00Z'); // 29 = اليوم في كل الاختبارات

const SUPPLIERS = [
  { id: 'yahya', name: 'يحيى رسمي' },
  { id: 'ahmad-veg', name: 'أحمد للخضار' },
  { id: 'milkco', name: 'شركة الألبان' },
];

const EMPLOYEES = [
  { id: 'hani', name: 'هاني' },
  { id: 'sidra', name: 'سدرة' },
  { id: 'aya', name: 'آية' },
];

const CTX = { suppliers: SUPPLIERS, employees: EMPLOYEES, today: FIXED_DATE };

// ─── تطبيع ────────────────────────────────────────────────────────────────────
describe('_normalizeArabic', () => {
  test('يحوّل الأرقام العربية إلى غربية', () => {
    expect(_normalizeArabic('١٢٣')).toBe('123');
    expect(_normalizeArabic('٢٠٢٦')).toBe('2026');
  });
  test('يوحّد ألفات الهمز', () => {
    expect(_normalizeArabic('أحمد')).toBe('احمد');
    expect(_normalizeArabic('إحسان')).toBe('احسان');
    expect(_normalizeArabic('آلاف')).toBe('الاف');
  });
  test('يحوّل تاء مربوطة إلى هاء', () => {
    expect(_normalizeArabic('سلفة')).toBe('سلفه');
    expect(_normalizeArabic('فاتورة')).toBe('فاتوره');
  });
  test('يزيل التشكيل والتطويل', () => {
    expect(_normalizeArabic('مَرحَبا')).toBe('مرحبا');
    expect(_normalizeArabic('السـلام')).toBe('السلام');
  });
});

// ─── أرقام عربية ──────────────────────────────────────────────────────────────
describe('_parseArabicNumber — منطوقة', () => {
  test.each([
    ['واحد', 1],
    ['اثنين', 2],
    ['خمسة', 5],
    ['عشرة', 10],
    ['خمستعش', 15],
    ['عشرين', 20],
    ['خمسين', 50],
    ['مية', 100],
    ['ميه', 100],
    ['ميتين', 200],
    ['خمسمية', 500],
    ['تسعمية', 900],
    ['ألف', 1000],
    ['ألفين', 2000],
  ])('"%s" → %i', (txt, expected) => {
    expect(_parseArabicNumber(txt)).toBe(expected);
  });
});

describe('_parseArabicNumber — مركّبة', () => {
  test.each([
    ['خمسة وعشرين', 25],
    ['اثنين وثلاثين', 32],
    ['مية وخمسين', 150],
    ['ميتين وخمسة وعشرين', 225],
    ['ألف وخمسمية', 1500],
    ['ألفين وميتين وخمسة وعشرين', 2225],
    ['خمسة آلاف', 5000],
    ['ثلاثة آلاف وخمسمية', 3500],
  ])('"%s" → %i', (txt, expected) => {
    expect(_parseArabicNumber(txt)).toBe(expected);
  });
});

describe('_parseArabicNumber — رقمية', () => {
  test('يعرب الأرقام العربية الهندية', () => {
    expect(_parseArabicNumber('١٠٠')).toBe(100);
    expect(_parseArabicNumber('٢٥٠')).toBe(250);
    expect(_parseArabicNumber('١٥٠٠')).toBe(1500);
  });
  test('يعرب الأرقام الغربية', () => {
    expect(_parseArabicNumber('100')).toBe(100);
    expect(_parseArabicNumber('1500.5')).toBe(1500.5);
  });
  test('يتجاهل الكلمات غير الرقمية', () => {
    expect(_parseArabicNumber('100 دينار')).toBe(100);
    expect(_parseArabicNumber('بقيمة مية')).toBe(100);
  });
});

describe('_parseArabicNumber — حواف', () => {
  test('null لنصّ فارغ أو غير رقمي', () => {
    expect(_parseArabicNumber('')).toBeNull();
    expect(_parseArabicNumber(null)).toBeNull();
    expect(_parseArabicNumber('مرحبا كيف الحال')).toBeNull();
  });
});

// ─── نوايا: شراء ──────────────────────────────────────────────────────────────
describe('_parseVoiceCommand — شراء', () => {
  test('"اشتريت من يحيى رسمي بقيمة مية" → فاتورة كاملة', () => {
    const r = _parseVoiceCommand('اشتريت من يحيى رسمي بقيمة مية', CTX);
    expect(r.intent).toBe('purchase');
    expect(r.fields.sId).toBe('yahya');
    expect(r.fields.sName).toBe('يحيى رسمي');
    expect(r.fields.amt).toBe(100);
    expect(r.fields.cat).toBe('COGS');
  });

  test('"اشتريت من يحيى فواتير بميتين" → يطابق على الاسم الأول', () => {
    const r = _parseVoiceCommand('اشتريت من يحيى فواتير بميتين', CTX);
    expect(r.intent).toBe('purchase');
    expect(r.fields.sId).toBe('yahya');
    expect(r.fields.amt).toBe(200);
  });

  test('"اشتريت من احمد للخضار بألف وخمسمية" → اسم مركّب + مبلغ مركّب', () => {
    const r = _parseVoiceCommand('اشتريت من احمد للخضار بألف وخمسمية', CTX);
    expect(r.intent).toBe('purchase');
    expect(r.fields.sId).toBe('ahmad-veg');
    expect(r.fields.amt).toBe(1500);
  });

  test('"اشتريت من مورد غير معروف بمية" → يحفظ التخمين بلا sId', () => {
    const r = _parseVoiceCommand('اشتريت من مورد جديد بمية', CTX);
    expect(r.intent).toBe('purchase');
    expect(r.fields.supplierGuess).toBeTruthy();
    expect(r.fields.sId).toBeUndefined();
    expect(r.fields.amt).toBe(100);
  });
});

// ─── نوايا: مبيعات ────────────────────────────────────────────────────────────
describe('_parseVoiceCommand — مبيعات', () => {
  test('"اليوم كاش ثلاثمية وفيزا خمسين" → كاش 300 + فيزا 50', () => {
    const r = _parseVoiceCommand('اليوم كاش ثلاثمية وفيزا خمسين', CTX);
    expect(r.intent).toBe('sale');
    expect(r.fields.cash).toBe(300);
    expect(r.fields.visa).toBe(50);
    expect(r.fields.day).toBe(29);
  });

  test('"كاش ١٠٠" بأرقام عربية → كاش 100', () => {
    const r = _parseVoiceCommand('كاش ١٠٠', CTX);
    expect(r.intent).toBe('sale');
    expect(r.fields.cash).toBe(100);
  });

  test('"اليوم فيزا ميتين ومدفوعات عشرين" → فيزا 200 + مدفوعات 20', () => {
    const r = _parseVoiceCommand('اليوم فيزا ميتين ومدفوعات عشرين', CTX);
    expect(r.intent).toBe('sale');
    expect(r.fields.visa).toBe(200);
    expect(r.fields.pmts).toBe(20);
  });

  test('"امس كاش مية" → يوم = الأمس', () => {
    const r = _parseVoiceCommand('امس كاش مية', CTX);
    expect(r.fields.day).toBe(28);
    expect(r.fields.cash).toBe(100);
  });

  // v57 BUG: «ال» على الكلمات المفتاحية كانت تكسر الاستخراج (cash يأخذ مجموع كل الأرقام)
  test('"النقد 685 الفيزا 123 المدفوعات 40" → ال prefix لا يخلط الأرقام', () => {
    const r = _parseVoiceCommand('النقد 685 الفيزا 123 المدفوعات 40', CTX);
    expect(r.intent).toBe('sale');
    expect(r.fields.cash).toBe(685);
    expect(r.fields.visa).toBe(123);
    expect(r.fields.pmts).toBe(40);
  });

  test('مزج «ال» و «و» على الكلمات المفتاحية', () => {
    const r = _parseVoiceCommand('اليوم النقد ميتين والفيزا خمسين', CTX);
    expect(r.fields.cash).toBe(200);
    expect(r.fields.visa).toBe(50);
  });

  test('رقم بدون كلمة مفتاحية يُعتبر كاش (سلوك سابق)', () => {
    const r = _parseVoiceCommand('اليوم بعت بمية', CTX);
    expect(r.fields.cash).toBe(100);
  });
});

// ─── نوايا: سلفة ──────────────────────────────────────────────────────────────
describe('_parseVoiceCommand — سلفة', () => {
  test('"سلفة لهاني عشرين دينار" → موظف + مبلغ', () => {
    const r = _parseVoiceCommand('سلفة لهاني عشرين دينار', CTX);
    expect(r.intent).toBe('advance');
    expect(r.fields.empId).toBe('hani');
    expect(r.fields.amt).toBe(20);
  });

  test('"سلفة لسدرة مية وخمسين" → سدرة + 150', () => {
    const r = _parseVoiceCommand('سلفة لسدرة مية وخمسين', CTX);
    expect(r.intent).toBe('advance');
    expect(r.fields.empId).toBe('sidra');
    expect(r.fields.amt).toBe(150);
  });
});

// ─── حالات: غير معروف ────────────────────────────────────────────────────────
describe('_parseVoiceCommand — حواف', () => {
  test('نصّ غير ذي صلة → intent=unknown', () => {
    const r = _parseVoiceCommand('مرحبا كيف الحال', CTX);
    expect(r.intent).toBe('unknown');
  });

  test('نصّ فارغ → intent=unknown', () => {
    const r = _parseVoiceCommand('', CTX);
    expect(r.intent).toBe('unknown');
  });

  test('يحتفظ بالنصّ الأصلي', () => {
    const r = _parseVoiceCommand('اشتريت من يحيى بمية', CTX);
    expect(r.raw).toBe('اشتريت من يحيى بمية');
  });
});
