// PASSWORD LOGIN
// ═══════════════════════════════════════════
const DEFAULT_PWD = '1234';
const PWD_KEY = 'rh_mgr_pwd';

async function sha256(str){
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str+'__rh_v25__'));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

let _pwdFailCount = 0;
let _pwdLockUntil = 0;

function checkPwd() {
  var input = document.getElementById('pwdInput');
  var err = document.getElementById('pwd-err');
  if (!input || !err) return;

  var now = Date.now();
  if (_pwdLockUntil > now) {
    err.textContent = '🔒 محظور مؤقتاً — انتظر ' + Math.ceil((_pwdLockUntil - now) / 1000) + ' ثانية';
    return;
  }

  var val = input.value;
  if (!val) { err.textContent = '⚠️ أدخل كلمة المرور'; return; }
  input.value = '';

  var stored = safeLS.getItem(PWD_KEY);

  // No stored password → first launch, only accept default
  if (!stored) {
    if (val === DEFAULT_PWD) {
      _pwdFailCount = 0;
      safeLS.setItem(PWD_KEY, btoa(DEFAULT_PWD));
      doLogin('manager');
      // upgrade to SHA-256 in background if available
      if (typeof sha256 === 'function') {
        sha256(val).then(function(h){ safeLS.setItem(PWD_KEY, h); }).catch(function(){});
      }
    } else {
      _loginFail(input, err);
    }
    return;
  }

  // btoa-format stored password
  if (stored === btoa(val)) {
    _pwdFailCount = 0;
    doLogin('manager');
    if (typeof sha256 === 'function') {
      sha256(val).then(function(h){ safeLS.setItem(PWD_KEY, h); }).catch(function(){});
    }
    return;
  }

  // SHA-256 check (async)
  if (typeof sha256 === 'function') {
    sha256(val).then(function(hash) {
      if (hash === stored) {
        _pwdFailCount = 0;
        doLogin('manager');
      } else {
        _loginFail(input, err);
      }
    }).catch(function() {
      _loginFail(input, err);
    });
  } else {
    _loginFail(input, err);
  }
}

function _loginFail(input, err) {
  _pwdFailCount++;
  if (_pwdFailCount >= 5) {
    _pwdLockUntil = Date.now() + 5 * 60 * 1000;
    _pwdFailCount = 0;
    err.textContent = '🔒 5 محاولات فاشلة — محظور 5 دقائق';
  } else {
    err.textContent = '❌ كلمة المرور غير صحيحة (' + _pwdFailCount + '/5)';
  }
  input.focus();
  input.style.borderColor = 'rgba(239,68,68,.8)';
  setTimeout(function(){ input.style.borderColor = 'rgba(255,255,255,.15)'; }, 1200);
}

function showResetBox() {
  var box = document.getElementById('resetBox');
  if (box) { box.style.display = box.style.display === 'none' ? 'block' : 'none'; }
}

function doReset() {
  safeLS.removeItem(PWD_KEY);
  _pwdFailCount = 0;
  _pwdLockUntil = 0;
  var box = document.getElementById('resetBox');
  if (box) box.style.display = 'none';
  var err = document.getElementById('pwd-err');
  if (err) { err.style.color = '#166534'; err.textContent = '✅ تمت إعادة التعيين — كلمة المرور: 1234'; }
}

function doLogin(role) {
  try {
    CR = role;
    CRN = 'المدير';
    var ps = document.getElementById('pinScreen');
    var app = document.getElementById('app');
    var uname = document.getElementById('uname');
    if (ps) ps.style.display = 'none';
    if (app) { app.style.display = 'flex'; app.classList.add('on'); }
    if (uname) uname.textContent = CRN;
  } catch(e) {}
  setTimeout(function() {
    try { loadStore(); } catch(e) {}
    try { buildMonthSel(); } catch(e) {}
    try { buildSelects(); } catch(e) {}
    try { renderRevTable(); } catch(e) {}
    try { qeInit(); } catch(e) {}
    try { injectPWAManifest(); } catch(e) {}
    try { initSalTables(); } catch(e) {}
    try { renderAll(); } catch(e) {}
    try { applyRoles(); } catch(e) {}
    try { resetInact(); } catch(e) {}
    try { updLkChips(); } catch(e) {}
    try { _restoreLastPage(); } catch(e) {}
    
    // V15 ULTIMATE - تحديث كل الميزات الجديدة
    setTimeout(function() {
      try { startLiveClock(); } catch(e) {}
      try { updateLiveStats(); } catch(e) { console.log('LiveStats:', e); }
      try { updateGoalTracker(); } catch(e) { console.log('GoalTracker:', e); }
      try { updateAnalyticsCards(); } catch(e) { console.log('Analytics:', e); }
      try { updateHealthCardNew(); } catch(e) { console.log('Health:', e); }
      try { updateBreakevenCardNew(); } catch(e) { console.log('BE:', e); }
      try { updateWeeklyCardNew(); } catch(e) { console.log('Weekly:', e); }
      try { updateForecastCard(); } catch(e) { console.log('Forecast:', e); }
      try { updatePeriodCompare(); } catch(e) { console.log('Compare:', e); }
      try { updateCostAnalysis(); } catch(e) { console.log('Cost:', e); }
      try { updateSmartAlertsV15(); } catch(e) { console.log('Alerts:', e); }
      try { updateShiftSummary(); } catch(e) { console.log('Shift:', e); }
      try { updateDailyInsights(); } catch(e) { console.log('Insights:', e); }
      try { updateQuickInsights(); } catch(e) { console.log('QuickIns:', e); }
      try { startAutoSave(); } catch(e) { console.log('AutoSave:', e); }
      try { initV24Features(); } catch(e) { console.log('V24:', e); }
    // Supabase: تهيئة وتحميل بعد الدخول
    try {
      supaInit();
      supaUpdateUI(!!SUPA);
      // فقط اسحب إذا كانت المزامنة التلقائية مفعّلة سابقاً
      var _autoWasOn = _kGet('rh_supa_auto') === '1';
      if(SUPA && _autoWasOn){ SUPA_AUTO=true; _supaStartupPull(0); }
    } catch(e) {}
    }, 500);
  }, 100);
}

async function changePwd() {
  var old = document.getElementById('pwdOld') ? document.getElementById('pwdOld').value : '';
  var nw  = document.getElementById('pwdNew') ? document.getElementById('pwdNew').value : '';
  var cf  = document.getElementById('pwdConf') ? document.getElementById('pwdConf').value : '';
  var err = document.getElementById('pwdChgErr');
  var stored = safeLS.getItem(PWD_KEY);
  if (!stored) stored = btoa(DEFAULT_PWD);
  var oldHash = null;
  try { oldHash = await sha256(old); } catch(e) {}
  var oldValid = (oldHash && oldHash === stored) || (btoa(old) === stored) || (!safeLS.getItem(PWD_KEY) && old === DEFAULT_PWD);
  if (!oldValid) { if(err) err.textContent = 'كلمة المرور الحالية غير صحيحة'; return; }
  if (nw.length < 4) { if(err) err.textContent = 'يجب أن تكون 4 أحرف على الأقل'; return; }
  if (nw !== cf) { if(err) err.textContent = 'كلمتا المرور غير متطابقتين'; return; }
  // حفظ كلمة المرور الجديدة بـ SHA-256
  safeLS.setItem(PWD_KEY, await sha256(nw));
  if(err) err.textContent = '';
  ['pwdOld','pwdNew','pwdConf'].forEach(id => { var e = document.getElementById(id); if(e) e.value = ''; });
  cmo('moPwd');
  toast('✅ تم تغيير كلمة المرور');
  log('تغيير كلمة المرور');
}


