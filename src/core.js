/**
 * core.js — الدوال النقية المستخرجة من index.html
 * هذه الدوال لا تعتمد على DOM أو حالة عامة، وهي قابلة للاختبار مباشرة.
 */

// ─── أدوات مساعدة ────────────────────────────────────────────────────────────

async function sha256(str) {
  const buf = await globalThis.crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(str + '__rh_v25__')
  );
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

const daysIn = key => {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m, 0).getDate();
};

const n3 = v => (parseFloat(v) || 0).toFixed(3);

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * يحسب إجمالي أجر موظفة يومية مع مراعاة الأجر المخصص لكل يوم.
 * rateOverrides: {day: rate} — إذا غاب اليوم يُستخدم الأجر الأساسي.
 */
function calcDailyTotal(w) {
  const att = w.att || [];
  const overrides = w.rateOverrides || {};
  const base = w.rate || 0;
  return att.reduce((sum, day) => sum + (overrides[day] !== undefined ? overrides[day] : base), 0);
}

// ─── منطق الأعمال (نقي — يقبل البيانات كمعاملات بدلاً من الحالة العامة) ─────

/**
 * يحسب مجموع السلف المعلقة لموظف معين.
 * مستخرج من pendAdv() في index.html السطر 4640.
 */
function calcPendAdv(advances, empId) {
  return advances
    .filter(a => a.empId === empId && (a.status === 'مستحقة' || a.status === 'مسددة جزئياً'))
    .reduce((sum, a) => sum + (a.amt || 0), 0);
}

/**
 * يحسب إجماليات الشهر المالية كاملة.
 * مستخرج من totals() في index.html الأسطر 4119–4196.
 */
function calcTotals(monthData, monthlyEmps = [], dailyEmps = []) {
  const d = monthData;
  let cash = 0, visa = 0, pmts = 0;
  d.sales.forEach(s => { cash += s.cash || 0; visa += s.visa || 0; pmts += s.pmts || 0; });

  const netSales = cash + visa;
  const rev = cash + visa + pmts;

  const bycat = { COGS: 0, OPS: 0, ADM: 0, MKT: 0, OTHER: 0, total: 0 };
  d.purchases.forEach(p => {
    const c = p.cat || 'COGS';
    bycat[c] = (bycat[c] || 0) + p.amt;
    bycat.total += p.amt;
  });

  const oblTotal = d.obligations.reduce((s, o) => s + (o.amt || 0), 0);
  const oblPaid  = d.obligations.filter(o => o.paid).reduce((s, o) => s + (o.amt || 0), 0);

  let mSalG = 0, mSalNet = 0, mSalPaid = 0, mSalAccrued = 0;
  monthlyEmps.forEach(e => {
    const s = d.mSal[e.id] || {};
    const gross = (s.base || 0) + (s.allow || 0);
    const adv   = calcPendAdv(d.advances, e.id);
    const net   = Math.max(0, gross - (s.ded || 0) - adv);
    mSalG   += gross;
    mSalNet += net;
    if (s.paid) mSalPaid    += net;
    else        mSalAccrued += net;
  });

  let dwTotal = 0;
  dailyEmps.forEach(e => {
    const w = d.dWages[e.id] || {};
    dwTotal += calcDailyTotal(w);
  });

  const dailyWagesPaid = pmts;
  const grossP    = netSales - bycat.COGS;
  const totalExp  = bycat.total + oblPaid + mSalPaid;
  const profit    = netSales - totalExp;
  const margin    = netSales > 0 ? (profit / netSales) * 100 : 0;

  let advP = 0;
  d.advances
    .filter(a => a.status === 'مستحقة' || a.status === 'مسددة جزئياً')
    .forEach(a => { advP += a.amt || 0; });

  const _active   = d.sales.filter(s => (s.cash || 0) + (s.visa || 0) + (s.pmts || 0) > 0);
  const avgDaily  = _active.length ? rev / _active.length : 0;
  const daysActive = _active.length;

  const cogsRatio    = netSales > 0 ? (bycat.COGS  / netSales) * 100 : 0;
  const salaryRatio  = netSales > 0 ? (mSalPaid    / netSales) * 100 : 0;
  const oblPaidRatio = netSales > 0 ? (oblPaid     / netSales) * 100 : 0;
  const expRatio     = netSales > 0 ? (totalExp    / netSales) * 100 : 0;

  return {
    cash, visa, pmts, netSales, rev, bycat,
    oblTotal, oblPaid,
    mSalG, mSalNet, mSalPaid, mSalAccrued, dwTotal, dailyWagesPaid,
    grossP, totalExp, profit, margin, advP,
    avgDaily, daysActive,
    cogsRatio, salaryRatio, oblPaidRatio, expRatio,
    obls: d.obligations,
  };
}

/**
 * ينشئ هيكل بيانات شهر جديد فارغ.
 * مستخرج من getMonth() في index.html الأسطر 3798–3805.
 */
function initMonth(key, monthlyEmps = [], dailyEmps = []) {
  const days = daysIn(key);
  return {
    sales: Array.from({ length: days }, (_, i) => ({
      day: i + 1, cash: 0, visa: 0, pmts: 0, notes: '',
    })),
    purchases: [],
    obligations: [
      { id: 'o1', name: 'إيجار المحل',          amt: 500,  paid: false, due: '' },
      { id: 'o2', name: 'فاتورة الكهرباء والمياه', amt: 0,    paid: false, due: '' },
      { id: 'o3', name: 'قسط الجمعية',           amt: 1000, paid: false, due: '' },
      { id: 'o4', name: 'اشتراك الإنترنت',        amt: 0,    paid: false, due: '' },
      { id: 'o5', name: 'مواد التنظيف',           amt: 0,    paid: false, due: '' },
      { id: 'o6', name: 'مصروفات الصيانة',        amt: 0,    paid: false, due: '' },
      { id: 'o7', name: 'مصروفات أخرى',          amt: 0,    paid: false, due: '' },
    ],
    mSal:   monthlyEmps.reduce((o, e) => { o[e.id] = { base: 0, allow: 0, ded: 0 }; return o; }, {}),
    dWages: dailyEmps.reduce((o, e)   => { o[e.id] = { rate: 0, att: [] };           return o; }, {}),
    advances: [],
    cashflow: { opening: 0, actual: 0 },
  };
}

/**
 * يتحقق من صحة طلب تغيير كلمة المرور (بدون DOM).
 * يعكس المنطق الحالي في changePwd() — index.html السطر 3713.
 *
 * ⚠️ خلل موثق: هذه الدالة تقارن باستخدام btoa فقط.
 * بعد ترحيل كلمة المرور إلى SHA-256 (يحدث تلقائياً في checkPwd)،
 * ستفشل المقارنة دائماً لأن stored أصبح SHA-256 وليس base64.
 */
function validatePasswordChange(stored, oldRaw, newPwd, confirmPwd) {
  if (btoa(oldRaw) !== stored)  return { ok: false, error: 'كلمة المرور الحالية غير صحيحة' };
  if (newPwd.length < 4)        return { ok: false, error: 'يجب أن تكون 4 أحرف على الأقل' };
  if (newPwd !== confirmPwd)    return { ok: false, error: 'كلمتا المرور غير متطابقتين' };
  return { ok: true };
}

/**
 * يكشف إذا كانت البيانات المحلية أحدث من السحابة (تعارض محتمل).
 * مستخرج من منطق supaSync('pull') في index.html الأسطر 10595–10602.
 *
 * @param {object} opts
 * @param {string|null} opts.cloudSavedAt  - وقت آخر رفع على السحابة (ISO string)
 * @param {string|null} opts.cloudDevice   - معرّف الجهاز الذي رفع للسحابة
 * @param {string|null} opts.localLastPush - وقت آخر رفع محلي (ISO string)
 * @param {string}      opts.localDevice   - معرّف الجهاز الحالي
 * @returns {{ hasConflict: boolean, cloudSavedAt: string|null, localLastPush: string|null }}
 */
function detectSyncConflict({ cloudSavedAt, cloudDevice, localLastPush, localDevice }) {
  if (!cloudDevice || !cloudSavedAt || !localLastPush) {
    return { hasConflict: false, cloudSavedAt, localLastPush };
  }
  if (cloudDevice === localDevice) {
    return { hasConflict: false, cloudSavedAt, localLastPush };
  }
  const localT  = new Date(localLastPush).getTime();
  const remoteT = new Date(cloudSavedAt).getTime();
  const hasConflict = localT > remoteT + 60000; // المحلي أحدث بأكثر من دقيقة
  return { hasConflict, cloudSavedAt, localLastPush };
}

module.exports = {
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
};
