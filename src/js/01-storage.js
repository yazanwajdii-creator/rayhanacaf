const _mem = {};
const safeLS = (function() {
  try {
    localStorage.setItem('__ping__', '1');
    localStorage.removeItem('__ping__');
    return localStorage;
  } catch(e) {
    return {
      getItem: function(k) { return _mem.hasOwnProperty(k) ? _mem[k] : null; },
      setItem: function(k, v) { _mem[k] = String(v); },
      removeItem: function(k) { delete _mem[k]; },
      key: function(i) { return Object.keys(_mem)[i] || null; },
      get length() { return Object.keys(_mem).length; }
    };
  }
}());

// ── مخزن مفاتيح مزدوج: AndroidStorage + localStorage ──────────────────────
// يُستخدم لبيانات Supabase والإعدادات الحساسة التي يجب ألا تُفقد عند إغلاق التطبيق
function _kSet(key, value) {
  safeLS.setItem(key, value);
  if(window.AndroidStorage){ try{ window.AndroidStorage.saveKey(key, value); }catch(e){} }
}
function _kGet(key) {
  if(window.AndroidStorage){
    try{
      var v = window.AndroidStorage.loadKey(key);
      if(v !== null && v !== undefined && v !== 'null') return v;
    }catch(e){}
  }
  return safeLS.getItem(key);
}
function _kRemove(key) {
  safeLS.removeItem(key);
  if(window.AndroidStorage){ try{ window.AndroidStorage.removeKey(key); }catch(e){} }
}

/* STORAGE */
function saveAll(){
  try{
    // حفظ الصفحة الحالية مع البيانات
    var _curPg = null;
    try{ var _onEl=document.querySelector('.pg.on'); if(_onEl) _curPg=_onEl.id; }catch(e){}
    var data = JSON.stringify({
      activeKey:S.activeKey,
      months:S.months,
      suppliers:S.suppliers,
      lockedMonths:S.lockedMonths||[],
      dailyEmps:S.dailyEmps,
      monthlyEmps:S.monthlyEmps,
      targets:S.targets||{},
      inventory:S.inventory||[],
      lastPage:_curPg||'dash',
      savedAt:new Date().toISOString()
    });
    // 1) Android file storage — الأكثر موثوقية (لا يُحذف عند إغلاق التطبيق)
    if(window.AndroidStorage){ try{ window.AndroidStorage.save(data); }catch(e){} }
    // 2) localStorage — احتياطي للمتصفح
    safeLS.setItem(SK, data);
    lastSaveTime = Date.now();
    pendingSave = false;
    showSaveIndicator('saved');
    setTimeout(hideSaveIndicator, 1500);
  }catch(e){
    var isQuota = e && (e.name==='QuotaExceededError'||e.name==='NS_ERROR_DOM_QUOTA_REACHED'||e.code===22||e.code===1014);
    if(isQuota){
      toast('⚠️ الذاكرة المحلية ممتلئة! صدّر نسخة احتياطية الآن');
      showSaveIndicator('error');
    }
    console.warn("saveAll error:",e);
  }
}
function loadStore(){
  try{
    // 1) Android file storage أولاً — أكثر موثوقية من localStorage
    var r = null;
    if(window.AndroidStorage){ try{ r = window.AndroidStorage.load(); }catch(e){} }
    // 2) fallback: localStorage
    if(!r) r = safeLS.getItem(SK);
    if(r){
      const sv=JSON.parse(r);
      if(sv.months){
        Object.keys(sv.months).forEach(k=>{S.months[k]=sv.months[k];});
      }
      if(sv.suppliers&&sv.suppliers.length)S.suppliers=sv.suppliers;
      if(sv.activeKey) S.activeKey = sv.activeKey >= _ck ? sv.activeKey : _ck;
      if(sv.lockedMonths)S.lockedMonths=sv.lockedMonths;
      if(sv.dailyEmps&&sv.dailyEmps.length)S.dailyEmps=sv.dailyEmps;
      if(sv.monthlyEmps&&sv.monthlyEmps.length)S.monthlyEmps=sv.monthlyEmps;
      if(sv.targets&&Object.keys(sv.targets).length)S.targets=sv.targets;
      if(sv.inventory&&sv.inventory.length)S.inventory=sv.inventory;
      // حفظ آخر صفحة لاستعادتها بعد تسجيل الدخول
      if(sv.lastPage) try{ _kSet('rh_last_page', sv.lastPage); }catch(e){}
    }
    if(!S.months[S.activeKey])getMonth(S.activeKey);
    if(!S.months[_ck])getMonth(_ck);
    if(!S.lockedMonths)S.lockedMonths=[];
    // Parse all notes to fill attendance from existing data
    setTimeout(syncAttFromAllNotes, 300);
  }catch(e){console.warn("loadStore error:",e);}
}

function syncAttFromAllNotes(){
  // Sync attendance from notes for ALL months — safe, data-only
  Object.keys(S.months).forEach(function(key){
    var month = S.months[key];
    if(!month||!month.sales) return;
    if(!month.dWages) month.dWages = {};
    month.sales.forEach(function(s){
      if(!s.notes || !s.notes.trim()) return;
      S.dailyEmps.forEach(function(e){
        if(!month.dWages[e.id]) month.dWages[e.id] = {rate:0, att:[]};
        var att = month.dWages[e.id].att;
        if(s.notes.indexOf(e.name) > -1 && att.indexOf(s.day) === -1){
          att.push(s.day);
          att.sort(function(a,b){return a-b;});
        }
      });
    });
  });
  console.log("syncAttFromAllNotes done");
}
