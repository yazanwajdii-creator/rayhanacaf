var SUPA = null;           // Supabase client
var SUPA_AUTO = false;     // auto-sync enabled
var SUPA_TIMER = null;     // auto-sync interval
var SUPA_URL_KEY = 'rh_supa_url';
var SUPA_KEY_KEY = 'rh_supa_key';
var SUPA_TABLE   = 'rh_store';
var SUPA_ROW     = 'rayhana_cafe_v25';

/* ── استعادة البيانات عند بدء التشغيل (مع شاشة تحميل وإعادة محاولة) ── */
function _supaStartupPull(attempt){
  // شاشة تحميل — تمنع المستخدم من رؤية بيانات فارغة
  var OL_ID = '_supaStartOL';
  if(attempt === 0){
    var old = document.getElementById(OL_ID);
    if(old) old.remove();
    var ol = document.createElement('div');
    ol.id = OL_ID;
    ol.style.cssText = 'position:fixed;inset:0;background:rgba(237,234,216,.92);z-index:8500;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px';
    ol.innerHTML = '<div style="font-size:40px">☁️</div>'
      + '<div style="font-weight:700;font-size:16px;color:#1A4A28">جاري استعادة البيانات...</div>'
      + '<div style="font-size:12px;color:#6B7280">يتصل بـ Supabase</div>';
    document.body.appendChild(ol);
  }
  supaSync('pull').then(function(){
    var ol = document.getElementById(OL_ID);
    if(ol) ol.remove();
    toast('☁️ تم استعادة البيانات من السحابة');
  }).catch(function(e){
    if(attempt < 2){
      // إعادة المحاولة تلقائياً: بعد 3ث ثم 6ث
      var delay = (attempt + 1) * 3000;
      var ol = document.getElementById(OL_ID);
      if(ol){
        var sub = ol.querySelector('div:last-child');
        if(sub) sub.textContent = 'إعادة المحاولة خلال ' + (delay/1000) + ' ثوانٍ... (' + (attempt+1) + '/3)';
      }
      setTimeout(function(){ _supaStartupPull(attempt + 1); }, delay);
    } else {
      // فشل بعد 3 محاولات — أزل الشاشة واعرض خطأ مع زر إعادة
      var ol = document.getElementById(OL_ID);
      if(ol){
        ol.innerHTML = '<div style="font-size:36px">⚠️</div>'
          + '<div style="font-weight:700;font-size:15px;color:#DC2626">تعذّر استعادة البيانات</div>'
          + '<div style="font-size:12px;color:#6B7280;text-align:center;padding:0 24px">تحقق من الإنترنت ثم اضغط إعادة المحاولة</div>'
          + '<div style="display:flex;gap:10px;margin-top:4px">'
          + '<button onclick="_supaStartupPull(0)" style="background:#1A4A28;color:#fff;border:none;padding:10px 20px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">🔄 إعادة المحاولة</button>'
          + '<button onclick="document.getElementById(\'' + OL_ID + '\').remove()" style="background:transparent;color:#6B7280;border:1px solid #D1D5DB;padding:10px 20px;border-radius:10px;font-size:13px;cursor:pointer;font-family:inherit">تجاهل</button>'
          + '</div>';
      }
    }
  });
}

/* ── إنشاء الاتصال ── */
function supaInit(){
  var url = _kGet(SUPA_URL_KEY);
  var key = _kGet(SUPA_KEY_KEY);
  if(!url || !key) return;
  try{
    SUPA = supabase.createClient(url, key);
    supaUpdateUI(true);
  } catch(e){
    console.warn('Supabase init error:', e);
    SUPA = null;
  }
}

/* ── ربط مع اختبار فوري ── */
function supaConnectAndTest(){
  var url=(document.getElementById('supaUrl')||{}).value||'';
  var key=(document.getElementById('supaAnonKey')||{}).value||'';
  var errEl=document.getElementById('supaConnectErr');
  url=url.trim(); key=key.trim();
  if(errEl) errEl.textContent='';
  if(!url||!url.startsWith('https://')){
    if(errEl) errEl.textContent='⚠️ أدخل Project URL صحيح يبدأ بـ https://';
    return;
  }
  if(!key||key.length<30){
    if(errEl) errEl.textContent='⚠️ أدخل Anon Key صحيح';
    return;
  }
  _kSet(SUPA_URL_KEY, url);
  _kSet(SUPA_KEY_KEY, key);
  supaInit();
  if(!SUPA){
    if(errEl) errEl.textContent='❌ فشل إنشاء الاتصال — تحقق من البيانات';
    _kRemove(SUPA_URL_KEY);
    _kRemove(SUPA_KEY_KEY);
    return;
  }
  toast('⏳ جاري الاختبار...');
  supaSync('push').then(function(){
    toast('✅ تم الربط بنجاح! بياناتك في السحابة ☁️');
    log('تفعيل Supabase');
    supaUpdateUI(true);
    SUPA_AUTO=true;
    _kSet('rh_supa_auto','1');
    _supaLastPushedSig = _supaGetDataSig ? _supaGetDataSig() : null;
  }).catch(function(e){
    var msg = e && e.message ? e.message : String(e);
    var hint = '— تأكد من تنفيذ SQL في الخطوة ٣';
    if(/allowlist|not in allowlist/i.test(msg)){
      hint = '— اذهب لـ Settings ← API في Supabase وعطّل "API Allowlist" (الخطوة ٣٫٥)';
    } else if(/relation.*does not exist|table.*not found/i.test(msg)){
      hint = '— لم يتم إنشاء الجدول بعد، شغّل SQL في الخطوة ٣';
    } else if(/invalid.*key|unauthorized|403/i.test(msg)){
      hint = '— تحقق من صحة anon public key';
    }
    if(errEl) errEl.textContent = '❌ ' + msg + ' ' + hint;
    SUPA=null;
    _kRemove(SUPA_URL_KEY);
    _kRemove(SUPA_KEY_KEY);
    supaUpdateUI(false);
  });
}

/* ── رفع وتحميل ── */
async function supaSync(direction){
  if(!SUPA) throw new Error('Supabase not connected');
  
  if(direction === 'push'){
    // تأجيل إطار واحد حتى لا تتجمد واجهة المستخدم أثناء التسلسل
    await new Promise(function(r){ setTimeout(r, 0); });
    supaSetStatus('saving', '☁️ جاري الحفظ في السحابة...');
    var payload = {
      v: 25,
      activeKey: S.activeKey,
      months: S.months,
      monthlyEmps: S.monthlyEmps,
      dailyEmps: S.dailyEmps,
      lockedMonths: S.lockedMonths||[],
      suppliers: S.suppliers||[],
      targets: S.targets||{},
      inventory: S.inventory||[],
      savedAt: new Date().toISOString(),
      device: navigator.userAgent.slice(0,60)
    };
    var res = await SUPA
      .from(SUPA_TABLE)
      .upsert({key: SUPA_ROW, value: payload, updated_at: new Date().toISOString()});
    if(res.error) throw new Error(res.error.message);
    var now = new Date().toLocaleTimeString('ar');
    _kSet('rh_supa_last', now);
    _kSet('rh_last_push_at', payload.savedAt);
    supaSetStatus('ok', '✅ محفوظ في السحابة · '+now);
    T('supaLastSync', 'آخر مزامنة: '+now);
    setTimeout(function(){supaSetStatus('ok','✅ متصل بـ Supabase');},3000);
    
  } else if(direction === 'pull'){
    supaSetStatus('loading', '⬇️ جاري التحميل من السحابة...');
    var res = await SUPA
      .from(SUPA_TABLE)
      .select('value, updated_at')
      .eq('key', SUPA_ROW)
      .single();
    if(res.error){
      if(res.error.code === 'PGRST116'){
        supaSetStatus('ok','☁️ لا توجد بيانات في السحابة بعد — ارفع أولاً');
        return;
      }
      throw new Error(res.error.message);
    }
    var sv = res.data.value;
    // Supabase يعيد value كـ object (jsonb) أو string (text) — نحوّل إذا لزم
    if(typeof sv === 'string'){
      try{ sv = JSON.parse(sv); }catch(e){ throw new Error('بيانات السحابة تالفة — تعذّر التحليل'); }
    }
    if(!sv || typeof sv !== 'object'){ throw new Error('بيانات السحابة فارغة أو غير صالحة'); }
    // Conflict info — note if cloud data is from a different device (non-blocking)
    var _localDevice = navigator.userAgent.slice(0,60);
    var _localLastPush = _kGet('rh_last_push_at');
    if(sv.device && sv.device !== _localDevice && _localLastPush && sv.savedAt){
      var _localT = new Date(_localLastPush).getTime();
      var _remoteT = new Date(sv.savedAt).getTime();
      if(_localT > _remoteT + 60000){
        toast('⚠️ تنبيه: بياناتك المحلية أحدث من السحابة — تحقق من آخر رفع');
      }
    }
    if(sv.months) Object.keys(sv.months).forEach(function(k){S.months[k]=sv.months[k];});
    if(sv.monthlyEmps&&sv.monthlyEmps.length) S.monthlyEmps=sv.monthlyEmps;
    if(sv.dailyEmps&&sv.dailyEmps.length) S.dailyEmps=sv.dailyEmps;
    if(sv.activeKey) S.activeKey = sv.activeKey >= _ck ? sv.activeKey : _ck;
    if(sv.lockedMonths) S.lockedMonths=sv.lockedMonths;
    if(sv.suppliers&&sv.suppliers.length) S.suppliers=sv.suppliers;
    if(sv.targets&&Object.keys(sv.targets).length) S.targets=sv.targets;
    if(sv.inventory&&sv.inventory.length) S.inventory=sv.inventory;
    saveAll();
    // تحديث واجهة الشهر قبل الرسم
    if(typeof buildMonthSel==='function') buildMonthSel();
    var mSel=document.getElementById('monthSel');
    if(mSel) mSel.value=S.activeKey;
    if(typeof renderRevTable==='function') try{renderRevTable();}catch(e){}
    if(typeof initSalTables==='function') try{initSalTables();}catch(e){}
    renderAll();
    var when = res.data.updated_at ? new Date(res.data.updated_at).toLocaleString('ar') : '—';
    supaSetStatus('ok','✅ تم التحميل · آخر رفع: '+when);
    T('supaLastSync','آخر مزامنة: '+new Date().toLocaleTimeString('ar'));
    toast('✅ تم تحميل البيانات من السحابة');
    log('تحميل من Supabase · '+when);
  }
}

/* ── مزامنة تلقائية ── */
function toggleSupaAuto(){
  SUPA_AUTO = !SUPA_AUTO;
  _kSet('rh_supa_auto', SUPA_AUTO?'1':'0');
  var btn = document.getElementById('supaAutoBtn');
  if(SUPA_AUTO){
    if(btn) btn.textContent='إيقاف';
    if(SUPA_TIMER) clearInterval(SUPA_TIMER);
    SUPA_TIMER = setInterval(function(){
      if(SUPA) requestAnimationFrame(function(){ setTimeout(function(){ supaSync('push').then(function(){_supaRetryCount=0;}).catch(supaHandleSyncError); }, 0); });
    }, 5*60*1000);
    toast('🔄 مزامنة تلقائية كل 5 دقائق');
  } else {
    if(btn) btn.textContent='تشغيل';
    if(SUPA_TIMER){clearInterval(SUPA_TIMER); SUPA_TIMER=null;}
    toast('⏸ المزامنة التلقائية متوقفة');
  }
}

/* ── قطع الاتصال ── */
function supaDisconnect(){
  rhConfirm('قطع الاتصال بـ Supabase؟ البيانات ستبقى محلياً.',function(){
    SUPA=null;
    SUPA_AUTO=false;
    if(SUPA_TIMER){clearInterval(SUPA_TIMER); SUPA_TIMER=null;}
    _kRemove(SUPA_URL_KEY);
    _kRemove(SUPA_KEY_KEY);
    _kRemove('rh_supa_auto');
    supaUpdateUI(false);
    toast('⛔ تم قطع الاتصال');
    log('قطع اتصال Supabase');
  },{icon:'🔌',title:'قطع الاتصال',yesText:'قطع',noText:'إلغاء'});
}

function tbSyncRefresh(){
  var btn=document.getElementById('syncRefreshBtn');
  if(btn){btn.style.opacity='.5';btn.style.pointerEvents='none';}
  if(!SUPA){toast('⚠️ لا يوجد اتصال بالسحابة — فعّل Supabase أولاً');if(btn){btn.style.opacity='';btn.style.pointerEvents='';}return;}
  supaSync('pull').then(function(){
    toast('✅ تم تحديث البيانات');
    if(btn){btn.style.opacity='';btn.style.pointerEvents='';}
  }).catch(function(){
    toast('❌ تعذّر التحديث');
    if(btn){btn.style.opacity='';btn.style.pointerEvents='';}
  });
}

/* ── واجهة الحالة ── */
function supaUpdateUI(connected){
  var dot=document.getElementById('supaDot');
  // cloud page elements
  var setupWizard=document.getElementById('cloudSetupWizard');
  var connPanel=document.getElementById('cloudConnectedPanel');
  var whyBox=document.getElementById('cloudWhyBox');
  var statusTitle=document.getElementById('cloudStatusTitle');
  var statusSub=document.getElementById('cloudStatusSub');
  var last=_kGet('rh_supa_last');

  if(connected&&SUPA){
    if(dot){dot.style.background='var(--gn)';dot.classList.add('on');}
    if(statusTitle) statusTitle.textContent='Supabase — متصل ✅';
    if(statusSub) statusSub.textContent=last?'آخر مزامنة: '+last:'جاهز للمزامنة';
    if(setupWizard) setupWizard.style.display='none';
    if(connPanel) connPanel.style.display='block';
    if(whyBox) whyBox.style.display='none';
    var syncRefBtn=document.getElementById('syncRefreshBtn');
    if(syncRefBtn) syncRefBtn.style.display='flex';
    // cloud tab indicator
    var cloudTab=document.getElementById('cloudTab');
    if(cloudTab) cloudTab.textContent='☁️✅ السحابة';
    // auto sync
    var autoOn=_kGet('rh_supa_auto')==='1';
    var autoBtn=document.getElementById('supaAutoBtn');
    if(autoBtn) autoBtn.textContent=autoOn?'إيقاف':'تشغيل';
    T('supaLastSync',last?'آخر مزامنة: '+last:'لم تتم مزامنة بعد');
    if(autoOn&&!SUPA_TIMER){
      SUPA_TIMER=setInterval(function(){
        if(SUPA) requestAnimationFrame(function(){ setTimeout(function(){ supaSync('push').then(function(){_supaRetryCount=0;}).catch(supaHandleSyncError); }, 0); });
      },5*60*1000);
    }
  } else {
    if(dot){dot.style.background='var(--tx4)';dot.classList.remove('on');}
    if(statusTitle) statusTitle.textContent='Supabase — غير مفعّل';
    if(statusSub) statusSub.textContent='بياناتك محلية فقط — خطر الفقدان';
    if(setupWizard) setupWizard.style.display='block';
    if(connPanel) connPanel.style.display='none';
    if(whyBox) whyBox.style.display='block';
    var syncRefBtn=document.getElementById('syncRefreshBtn');
    if(syncRefBtn) syncRefBtn.style.display='none';
    var cloudTab=document.getElementById('cloudTab');
    if(cloudTab) cloudTab.textContent='☁️ السحابة';
  }
}

function supaSetStatus(type, txt){
  var statusSub = document.getElementById('cloudStatusSub');
  var dot = document.getElementById('supaDot');
  if(statusSub) statusSub.textContent=txt;
  if(dot) dot.style.background = type==='ok'?'var(--gn)':type==='saving'||type==='loading'?'var(--yw)':'var(--rd)';
  // Topbar sync pill
  var pill = document.getElementById('syncPill');
  var pillTxt = document.getElementById('syncPillTxt');
  var pillDot = document.getElementById('syncPillDot');
  if(!pill) return;
  if(type==='saving'){
    pill.style.display='flex';pill.style.background='rgba(217,119,6,.15)';pill.style.borderColor='rgba(217,119,6,.3)';
    if(pillDot){pillDot.style.background='#D97706';pillDot.style.animation='syncpulse 1s infinite';}
    if(pillTxt) pillTxt.textContent='يحفظ...';
  } else if(type==='ok'){
    pill.style.display='flex';pill.style.background='rgba(5,150,105,.15)';pill.style.borderColor='rgba(5,150,105,.3)';
    if(pillDot){pillDot.style.background='#5AC18E';pillDot.style.animation='';}
    if(pillTxt) pillTxt.textContent='محفوظ ☁️';
    setTimeout(function(){if(pill) pill.style.display='none';},4000);
  } else if(type==='error'){
    pill.style.display='flex';pill.style.background='rgba(220,38,38,.15)';pill.style.borderColor='rgba(220,38,38,.3)';
    if(pillDot){pillDot.style.background='#EF4444';pillDot.style.animation='';}
    if(pillTxt) pillTxt.textContent='خطأ في الحفظ';
  }
}

/* ── فحص وتشخيص الربط الشامل ── */
function supaRunDiag(){
  var box=document.getElementById('supaDiagBox');
  if(!box) return;
  box.style.display='block';
  box.innerHTML='<div style="color:var(--tx3)">⏳ جاري الفحص...</div>';

  var checks=[];

  // 1. هل SUPA موجود؟
  checks.push({label:'اتصال Supabase', ok:!!SUPA, detail: SUPA ? 'تم إنشاء الاتصال' : 'لا يوجد اتصال — تحقق من URL والمفتاح'});

  // 2. هل URL محفوظ؟
  var url=_kGet(SUPA_URL_KEY)||'';
  checks.push({label:'Project URL', ok:!!url&&url.startsWith('https://'), detail: url ? url.slice(0,40)+'...' : 'غير محفوظ'});

  // 3. هل المفتاح محفوظ؟
  var key=_kGet(SUPA_KEY_KEY)||'';
  checks.push({label:'Anon Key', ok:key.length>30, detail: key ? 'محفوظ ('+key.length+' حرف)' : 'غير محفوظ'});

  // 4. آخر مزامنة
  var last=_kGet('rh_supa_last')||'';
  checks.push({label:'آخر رفع', ok:!!last, detail: last||'لم تتم مزامنة بعد'});

  // 5. المزامنة التلقائية
  checks.push({label:'المزامنة التلقائية', ok:SUPA_AUTO, detail: SUPA_AUTO?'مفعّلة ✅':'معطّلة (البيانات تُرفع عند كل تغيير وعند الإغلاق)'});

  // 6. حجم البيانات المحلية
  var months=Object.keys(S.months||{}).length;
  checks.push({label:'بيانات محلية', ok:months>0, detail: months+' شهر محفوظ'});

  // عرض نتائج فورية
  _renderDiag(box, checks, null);

  if(!SUPA){ return; }

  // 7. اختبار شبكي حقيقي
  SUPA.from(SUPA_TABLE).select('updated_at').eq('key',SUPA_ROW).single()
    .then(function(res){
      var netOk = !res.error || res.error.code==='PGRST116';
      var detail = res.error
        ? (res.error.code==='PGRST116' ? 'الجدول موجود — لا توجد بيانات بعد (ارفع الآن)' : '❌ '+res.error.message)
        : 'الجدول موجود ✅ — آخر تحديث: '+(res.data&&res.data.updated_at ? new Date(res.data.updated_at).toLocaleString('ar') : '—');
      checks.push({label:'اتصال الشبكة بـ Supabase', ok:netOk, detail:detail});
      _renderDiag(box, checks, netOk);
    })
    .catch(function(e){
      checks.push({label:'اتصال الشبكة بـ Supabase', ok:false, detail:'❌ '+e.message});
      _renderDiag(box, checks, false);
    });
}

function _renderDiag(box, checks, netResult){
  var allOk = checks.every(function(c){return c.ok;}) && netResult!==false;
  var html='<div style="font-weight:700;font-size:13px;margin-bottom:10px;color:'+(allOk?'var(--gn)':netResult===null?'var(--tx)':'var(--rd)')+'">'
    +(netResult===null?'⏳ جاري التحقق من الشبكة...':allOk?'✅ كل شيء يعمل بشكل صحيح':'⚠️ يوجد مشكلة — راجع التفاصيل')+'</div>';
  checks.forEach(function(c){
    html+='<div style="display:flex;justify-content:space-between;align-items:flex-start;padding:6px 0;border-bottom:1px solid var(--br);gap:8px">'
      +'<span style="font-size:11.5px;color:var(--tx2);flex-shrink:0">'+(c.ok?'✅':'❌')+' '+c.label+'</span>'
      +'<span style="font-size:11px;color:'+(c.ok?'var(--tx3)':'var(--rd)')+';text-align:left;direction:ltr">'+c.detail+'</span>'
      +'</div>';
  });
  if(netResult!==null && !allOk){
    html+='<button onclick="supaSync(\'push\').then(function(){toast(\'✅ تم الرفع\');supaRunDiag();}).catch(function(e){toast(\'❌ \'+e.message);})" style="width:100%;margin-top:10px;padding:10px;background:var(--gn);color:#fff;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">☁️ رفع البيانات الآن</button>';
  } else if(netResult===true){
    html+='<div style="margin-top:8px;padding:8px 10px;background:rgba(5,150,105,.08);border-radius:8px;font-size:11.5px;color:var(--gn);font-weight:600">✅ Supabase مهيأ بشكل صحيح — بياناتك محمية</div>';
  }
  box.innerHTML=html;
}

/* ── نسخ SQL ── */
function copySupaSQL(){
  var el = document.getElementById('supaSQL');
  if(!el)return;
  var txt = el.textContent;
  if(navigator.clipboard){
    navigator.clipboard.writeText(txt).then(function(){toast('📋 تم نسخ SQL');});
  } else {
    var ta=document.createElement('textarea');
    ta.value=txt; document.body.appendChild(ta);
    ta.select(); document.execCommand('copy');
    document.body.removeChild(ta);
    toast('📋 تم نسخ SQL');
  }
}

/* ── معالجة أخطاء المزامنة مع retry تلقائي ── */
var _supaRetryCount = 0;
var _supaRetryTimer = null;
var _supaLastErrorMsg = '';

function supaHandleSyncError(e) {
  _supaRetryCount++;
  var errMsg = (e && e.message) ? e.message : String(e);
  var isNetwork = /fetch|network|failed|timeout/i.test(errMsg);

  if (_supaRetryCount <= 3) {
    var delay = Math.pow(2, _supaRetryCount) * 1000; // 2s → 4s → 8s
    var delaySec = delay / 1000;
    _supaLastErrorMsg = '⚠️ فشل الحفظ في السحابة — إعادة المحاولة خلال ' + delaySec + 'ث';
    toast(_supaLastErrorMsg);
    supaSetStatus('error', _supaLastErrorMsg);
    if (_supaRetryTimer) clearTimeout(_supaRetryTimer);
    _supaRetryTimer = setTimeout(function() {
      if (!SUPA) return;
      supaSync('push').then(function() {
        _supaRetryCount = 0;
        _supaRetryTimer = null;
        toast('✅ تم الحفظ في السحابة');
        supaSetStatus('ok', '✅ متصل بـ Supabase');
      }).catch(function(e2) {
        supaHandleSyncError(e2);
      });
    }, delay);
  } else {
    // بعد 3 محاولات فاشلة
    _supaRetryCount = 0;
    _supaRetryTimer = null;
    var finalMsg = '❌ تعذّر الوصول للسحابة — بياناتك محفوظة محلياً فقط';
    toast(finalMsg);
    supaSetStatus('error', finalMsg);
  }
}

/* ── سحب صامت عند العودة للتطبيق (بدون overlay) ── */
// يُستدعى من onResume — يسحب فقط إذا مرّت أكثر من 3 دقائق منذ آخر سحب
var _supaLastPullAt = 0;
function _supaSilentPull(){
  if(!SUPA || !CR) return;
  var now = Date.now();
  if(now - _supaLastPullAt < 3 * 60 * 1000) return; // أقل من 3 دقائق — لا تسحب
  _supaLastPullAt = now;
  supaSync('pull').then(function(){
    toast('🔄 تم التزامن مع السحابة');
  }).catch(function(e){
    console.warn('silent pull error:', e && e.message);
  });
}

/* ── رفع فوري (debounced) بعد كل saveAll ── */
// يُستدعى من saveAll() — يرفع خلال 5 ثوانٍ من آخر تغيير بدل الانتظار 90 ثانية
var _supaQueueTimer = null;
function _supaQueuePush(){
  if(!SUPA || !CR) return;
  if(_supaQueueTimer) clearTimeout(_supaQueueTimer);
  _supaQueueTimer = setTimeout(function(){
    _supaQueueTimer = null;
    _supaPushIfChanged();
  }, 5000);
}

/* ── Supabase push — interval مستقل عن saveAll ── */
// يتحقق من تغيُّر البيانات كل 90 ثانية (شبكة ضعيفة / إغلاق بطيء)
var _supaLastPushedSig = null;
var _supaPushInProgress = false; // منع التزامن المتعدد
var _supaPushIntervalId = null;  // لإيقافه عند قفل التطبيق

function _supaGetDataSig() {
  try {
    var raw = (window.AndroidStorage ? window.AndroidStorage.load() : null)
              || safeLS.getItem('rh_v6');
    if (!raw) return null;
    var obj = JSON.parse(raw);
    return obj.savedAt || raw.length;
  } catch(e) { return null; }
}

function _supaPushIfChanged() {
  if (!SUPA || !CR) return;                        // لا مزامنة قبل تسجيل الدخول
  if (_supaPushInProgress) return;                 // منع التزامن المتعدد
  var sig = _supaGetDataSig();
  if (!sig || sig === _supaLastPushedSig) return;
  _supaPushInProgress = true;
  supaSync('push').then(function(){
    _supaLastPushedSig = sig;
    _supaRetryCount = 0;
  }).catch(supaHandleSyncError).finally(function(){
    _supaPushInProgress = false;
  });
}

// رفع كل 90 ثانية إذا تغيّرت البيانات
if(_supaPushIntervalId) clearInterval(_supaPushIntervalId);
_supaPushIntervalId = setInterval(_supaPushIfChanged, 90000);

// رفع فوري عند إخفاء التطبيق (Home/مهام)
document.addEventListener('visibilitychange', function(){
  if(document.hidden && SUPA) setTimeout(_supaPushIfChanged, 800);
});

/* ── Supabase: تهيئة عند تحميل الصفحة ── */
if(typeof supabase !== 'undefined'){
  setTimeout(supaInit, 500);
}

