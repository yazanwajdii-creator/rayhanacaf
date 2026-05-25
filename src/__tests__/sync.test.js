const {
  buildSyncPayload,
  payloadTimestamp,
  shouldPush,
  mergeStrategy,
  validatePayload,
} = require('../sync');

describe('buildSyncPayload()', () => {
  test('يبني payload بالحقول الأساسية', () => {
    var state = {
      activeKey: '2026-05',
      months: { '2026-05': { sales: [] } },
      monthlyEmps: [{ id: 'a', name: 'علي' }],
      dailyEmps: [],
      lockedMonths: [],
      suppliers: [{ id: 's1', name: 'مورد' }],
    };
    var p = buildSyncPayload(state);
    expect(p.activeKey).toBe('2026-05');
    expect(p.months['2026-05']).toBeDefined();
    expect(p.monthlyEmps).toHaveLength(1);
    expect(p.suppliers).toHaveLength(1);
    expect(p.savedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(p.version).toBe('v35');
  });

  test('يضع قيماً افتراضية للحقول الناقصة', () => {
    var p = buildSyncPayload({});
    expect(p.months).toEqual({});
    expect(p.monthlyEmps).toEqual([]);
    expect(p.suppliers).toEqual([]);
    expect(p.lockedMonths).toEqual([]);
  });
});

describe('payloadTimestamp()', () => {
  test('يستخرج التوقيت من ISO string', () => {
    var p = { savedAt: '2026-05-25T12:00:00Z' };
    expect(payloadTimestamp(p)).toBe(new Date('2026-05-25T12:00:00Z').getTime());
  });

  test('يُرجع 0 للـ null', () => {
    expect(payloadTimestamp(null)).toBe(0);
    expect(payloadTimestamp({})).toBe(0);
    expect(payloadTimestamp({ savedAt: 'invalid' })).toBe(0);
  });
});

describe('shouldPush()', () => {
  test('يرفع لو لا يوجد آخر رفع', () => {
    expect(shouldPush(0, Date.now())).toBe(true);
    expect(shouldPush(null, Date.now())).toBe(true);
  });

  test('يمنع الرفع خلال debounce window', () => {
    var now = 10000;
    expect(shouldPush(now - 1000, now, 3000)).toBe(false);
    expect(shouldPush(now - 2999, now, 3000)).toBe(false);
  });

  test('يسمح بالرفع بعد debounce window', () => {
    var now = 10000;
    expect(shouldPush(now - 3000, now, 3000)).toBe(true);
    expect(shouldPush(now - 5000, now, 3000)).toBe(true);
  });
});

describe('mergeStrategy()', () => {
  test('use_cloud إذا لا يوجد local', () => {
    expect(mergeStrategy(null, { savedAt: '2026-05-25T10:00:00Z' }, 'device-A')).toBe('use_cloud');
  });

  test('use_local إذا لا يوجد cloud', () => {
    expect(mergeStrategy({ savedAt: '2026-05-25T10:00:00Z' }, null, 'device-A')).toBe('use_local');
  });

  test('نفس الجهاز: الأحدث يفوز بدون تعارض', () => {
    var local = { savedAt: '2026-05-25T11:00:00Z' };
    var cloud = { savedAt: '2026-05-25T10:00:00Z', device: 'device-A' };
    expect(mergeStrategy(local, cloud, 'device-A')).toBe('use_local');

    var local2 = { savedAt: '2026-05-25T10:00:00Z' };
    var cloud2 = { savedAt: '2026-05-25T11:00:00Z', device: 'device-A' };
    expect(mergeStrategy(local2, cloud2, 'device-A')).toBe('use_cloud');
  });

  test('أجهزة مختلفة + local أحدث بأكثر من دقيقة = conflict', () => {
    var local = { savedAt: '2026-05-25T11:00:00Z' };
    var cloud = { savedAt: '2026-05-25T10:00:00Z', device: 'device-B' };
    expect(mergeStrategy(local, cloud, 'device-A')).toBe('conflict');
  });

  test('أجهزة مختلفة + cloud أحدث = use_cloud', () => {
    var local = { savedAt: '2026-05-25T10:00:00Z' };
    var cloud = { savedAt: '2026-05-25T11:00:00Z', device: 'device-B' };
    expect(mergeStrategy(local, cloud, 'device-A')).toBe('use_cloud');
  });

  test('فارق أقل من دقيقة = use_cloud (لتجنّب thrashing)', () => {
    var local = { savedAt: '2026-05-25T11:00:30Z' };
    var cloud = { savedAt: '2026-05-25T11:00:00Z', device: 'device-B' };
    expect(mergeStrategy(local, cloud, 'device-A')).toBe('use_cloud');
  });
});

describe('validatePayload()', () => {
  test('يقبل payload صحيح', () => {
    var p = {
      months: { '2026-05': { sales: [] } },
      monthlyEmps: [],
      dailyEmps: [],
      suppliers: [],
    };
    expect(validatePayload(p)).toEqual({ ok: true });
  });

  test('يرفض null أو غير كائن', () => {
    expect(validatePayload(null).ok).toBe(false);
    expect(validatePayload('string').ok).toBe(false);
    expect(validatePayload(123).ok).toBe(false);
  });

  test('يرفض إذا months مفقود', () => {
    var r = validatePayload({ suppliers: [], monthlyEmps: [], dailyEmps: [] });
    expect(r.ok).toBe(false);
    expect(r.error).toContain('months');
  });

  test('يرفض إذا suppliers ليس مصفوفة', () => {
    var r = validatePayload({
      months: {},
      suppliers: 'not array',
      monthlyEmps: [],
      dailyEmps: [],
    });
    expect(r.ok).toBe(false);
    expect(r.error).toContain('suppliers');
  });

  test('يرفض إذا شهر بدون sales', () => {
    var r = validatePayload({
      months: { '2026-05': {} },
      suppliers: [],
      monthlyEmps: [],
      dailyEmps: [],
    });
    expect(r.ok).toBe(false);
    expect(r.error).toContain('2026-05');
  });

  test('يرفض إذا monthlyEmps ليست مصفوفة', () => {
    var r = validatePayload({
      months: {},
      suppliers: [],
      monthlyEmps: 'bad',
      dailyEmps: [],
    });
    expect(r.ok).toBe(false);
  });
});
