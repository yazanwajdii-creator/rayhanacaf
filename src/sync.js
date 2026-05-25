/**
 * sync.js — منطق المزامنة السحابية النقي (Supabase)
 * مستخرج من index.html للاختبار المستقل.
 */

/**
 * يبني payload المزامنة (نفس صيغة الـ JSON المصدّر).
 * يحفظ snapshot ثابت يمكن مقارنته/استرداده.
 */
function buildSyncPayload(state) {
  return {
    version: state.version || 'v35',
    savedAt: new Date().toISOString(),
    device: (typeof navigator !== 'undefined' && navigator.userAgent)
      ? navigator.userAgent.slice(0, 60)
      : 'unknown',
    activeKey: state.activeKey,
    months: state.months || {},
    monthlyEmps: state.monthlyEmps || [],
    dailyEmps: state.dailyEmps || [],
    lockedMonths: state.lockedMonths || [],
    suppliers: state.suppliers || [],
  };
}

/**
 * يستخرج timestamp بأمان من الـ payload.
 */
function payloadTimestamp(payload) {
  if (!payload) return 0;
  var t = payload.savedAt;
  if (!t) return 0;
  var ms = new Date(t).getTime();
  return isNaN(ms) ? 0 : ms;
}

/**
 * يقرّر ما إذا كان يجب الرفع لـ Supabase الآن.
 * يمنع الرفع المتكرر خلال نافذة قصيرة (debounce logic للاختبار).
 */
function shouldPush(lastPushTime, nowMs, debounceMs) {
  debounceMs = debounceMs || 3000;
  if (!lastPushTime) return true;
  return (nowMs - lastPushTime) >= debounceMs;
}

/**
 * يقرّر استراتيجية الدمج بين بيانات محلية وسحابية.
 * يُرجع: 'use_cloud' | 'use_local' | 'conflict' | 'no_change'
 */
function mergeStrategy(localPayload, cloudPayload, localDevice) {
  if (!cloudPayload) return 'use_local';
  if (!localPayload) return 'use_cloud';

  var localT = payloadTimestamp(localPayload);
  var cloudT = payloadTimestamp(cloudPayload);

  // نفس الجهاز رفع كلا الجانبين → نأخذ الأحدث بدون تعارض
  if (cloudPayload.device === localDevice) {
    return localT > cloudT ? 'use_local' : 'use_cloud';
  }

  // أجهزة مختلفة
  if (Math.abs(localT - cloudT) < 60000) return 'use_cloud'; // <1min: thrash protection
  if (localT > cloudT + 60000) return 'conflict';            // local أحدث ربما تحتاج تأكيد
  if (cloudT > localT) return 'use_cloud';
  return 'no_change';
}

/**
 * يفحص صحة الـ payload قبل الرفع/الاستيراد.
 * يحمي من بيانات تالفة تكتب فوق البيانات السليمة.
 */
function validatePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return { ok: false, error: 'payload ليس كائناً' };
  }
  if (!payload.months || typeof payload.months !== 'object') {
    return { ok: false, error: 'months مفقود' };
  }
  if (!Array.isArray(payload.suppliers)) {
    return { ok: false, error: 'suppliers يجب أن يكون مصفوفة' };
  }
  if (!Array.isArray(payload.monthlyEmps) || !Array.isArray(payload.dailyEmps)) {
    return { ok: false, error: 'الموظفون يجب أن تكون مصفوفة' };
  }
  // كل شهر يجب أن يكون فيه sales كمصفوفة
  var keys = Object.keys(payload.months);
  for (var i = 0; i < keys.length; i++) {
    var m = payload.months[keys[i]];
    if (!m || !Array.isArray(m.sales)) {
      return { ok: false, error: 'الشهر ' + keys[i] + ' لا يحتوي sales كمصفوفة' };
    }
  }
  return { ok: true };
}

module.exports = {
  buildSyncPayload,
  payloadTimestamp,
  shouldPush,
  mergeStrategy,
  validatePayload,
};
