function toast(m){const t=$("toast");t.textContent=m;t.classList.add("show");clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove("show"),2800);}
function toggleDark(){document.body.classList.toggle("dark");safeLS.setItem("rh_dark",document.body.classList.contains("dark")?"1":"0");}
if(safeLS.getItem("rh_dark")==="1")document.body.classList.add("dark");
function openMo(id){$(id).classList.add("open");document.body.style.overflow="hidden";}
function cmo(id){$(id).classList.remove("open");document.body.style.overflow="";}
function moOut(e,id){if(e.target===$(id))cmo(id);}
["click","touchstart","keydown","scroll"].forEach(e=>document.addEventListener(e,resetInact,{passive:true}));

// حفظ عند الخروج — مسجّل منذ بداية تحميل الصفحة (لا ينتظر تسجيل الدخول)
window.addEventListener('pagehide', function(){ try{ if(CR) saveAll(); }catch(e){} });
window.addEventListener('beforeunload', function(){ try{ if(CR) saveAll(); }catch(e){} });
document.addEventListener('visibilitychange', function(){ try{ if(document.hidden && CR) saveAll(); }catch(e){} });

function resetInact(){
  clearTimeout(iT);clearTimeout(wT);
  const b=$("lkbanner");if(b)b.style.display="none";
  if(!$("app").classList.contains("on"))return;
  wT=setTimeout(()=>{const b=$("lkbanner");if(b)b.style.display="block";},4*60*1000);
  iT=setTimeout(()=>{$("lkbanner").style.display="none";lockApp();toast("🔒 تم القفل تلقائياً");},5*60*1000);
}
const daysIn=k=>{const[y,m]=k.split("-").map(Number);return new Date(y,m,0).getDate();};
function G(){return getMonth(S.activeKey);}
function isLocked(){return(S.lockedMonths||[]).includes(S.activeKey);}
function getMonth(key){
  if(!S.months[key]){
    const days=daysIn(key);
    if(PL[key]){
      S.months[key]=JSON.parse(JSON.stringify(PL[key]));
      const ex=S.months[key].sales.map(s=>s.day);
      for(let d=1;d<=days;d++)if(!ex.includes(d))S.months[key].sales.push({day:d,cash:0,visa:0,pmts:0,notes:""});
      S.months[key].sales.sort((a,b)=>a.day-b.day);
    }else{
      S.months[key]={
        sales:Array.from({length:days},(_,i)=>({day:i+1,cash:0,visa:0,pmts:0,notes:""})),
        purchases:[],
        obligations:[{id:"o1",name:"إيجار المحل",amt:500,paid:false,due:""},{id:"o2",name:"فاتورة الكهرباء والمياه",amt:0,paid:false,due:""},{id:"o3",name:"قسط الجمعية",amt:1000,paid:false,due:""},{id:"o4",name:"اشتراك الإنترنت",amt:0,paid:false,due:""},{id:"o5",name:"مواد التنظيف",amt:0,paid:false,due:""},{id:"o6",name:"مصروفات الصيانة",amt:0,paid:false,due:""},{id:"o7",name:"مصروفات أخرى",amt:0,paid:false,due:""}],
        mSal:S.monthlyEmps.reduce((o,e)=>{o[e.id]={base:0,allow:0,ded:0};return o},{}),
        dWages:S.dailyEmps.reduce((o,e)=>{o[e.id]={rate:0,att:[]};return o},{}),
        advances:[],cashflow:{opening:0,actual:0}
      };
    }
  }
  return S.months[key];
}

/* HTML ESCAPE */
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

/* LOG */
function log(d){try{const ls=JSON.parse(safeLS.getItem(LK)||"[]");ls.unshift({t:new Date().toLocaleString("ar-JO"),u:CRN||"نظام",r:CR||"sys",d});if(ls.length>500)ls.splice(500);safeLS.setItem(LK,JSON.stringify(ls));}catch(e){}}
function renderLog(){const c=$("auditList");if(!c)return;try{const ls=JSON.parse(safeLS.getItem(LK)||"[]");if(!ls.length){c.innerHTML='<div class="alert al-i" style="margin:12px">لا توجد سجلات</div>';return;}c.innerHTML=ls.map(l=>`<div class="log-item"><span class="log-t">${l.t}</span><span class="log-u lu-${l.r==="manager"?"m":l.r==="accountant"?"a":"s"}">${l.u}</span><span style="flex:1">${l.d}</span></div>`).join("");}catch(e){}}
function clearLog(){if(!confirm("مسح السجل؟"))return;safeLS.removeItem(LK);renderLog();toast("🗑️ تم المسح");}

/* LOGIN SYSTEM */
function applyRoles(){const m=CR==="manager";document.querySelectorAll(".del-btn").forEach(e=>{e.style.opacity=m?"1":"0.3";e.style.pointerEvents=m?"":"none";});}
function lockApp(){
  try{ saveAll(); }catch(e){}           // حفظ قبل القفل
  CR=null;CRN="";
  SUPA_AUTO=false;                       // إيقاف المزامنة
  var app=document.getElementById("app");
  var ps=document.getElementById("pinScreen");
  var pi=document.getElementById("pwdInput");
  if(app){app.classList.remove("on");app.style.display="none";}
  if(ps){ps.style.display="flex";}
  if(pi){pi.value="";setTimeout(function(){pi.focus();},300);}
  clearTimeout(iT);clearTimeout(wT);
  if(autoSaveInterval){clearInterval(autoSaveInterval);autoSaveInterval=null;}
  if(typeof _supaPushIntervalId!=='undefined'&&_supaPushIntervalId){clearInterval(_supaPushIntervalId);_supaPushIntervalId=null;}
  if(typeof SUPA_TIMER!=='undefined'&&SUPA_TIMER){clearInterval(SUPA_TIMER);SUPA_TIMER=null;}
}
/* ═══════════════════════════════════════════════════════════════════════════ */
/* V24-3: تحذير النسخ الاحتياطي اليومي — حماية من فقدان البيانات              */
/* ═══════════════════════════════════════════════════════════════════════════ */
function showBackupBanner(dataSize){
  // إذا Supabase متصل — لا حاجة للتحذير
  if(typeof SUPA !== 'undefined' && SUPA) return;
  // إنشاء البانر فوق الصفحة
  var existing=document.getElementById('backupWarningBanner');
  if(existing)existing.remove();
  
  var banner=document.createElement('div');
  banner.id='backupWarningBanner';
  banner.style.cssText='position:fixed;top:92px;left:50%;transform:translateX(-50%);z-index:9000;background:#1E293B;color:#fff;border:1.5px solid rgba(217,119,6,.5);border-radius:12px;padding:12px 16px;font-family:IBM Plex Sans Arabic,sans-serif;font-size:12px;box-shadow:0 8px 24px rgba(0,0,0,.35);display:flex;align-items:center;gap:10px;max-width:340px;width:90%;direction:rtl';
  banner.innerHTML='<span style="font-size:20px">⚠️</span><div style="flex:1"><div style="font-weight:700;color:#FEF3C7;margin-bottom:3px">تحذير: بياناتك في خطر!</div><div style="color:rgba(255,255,255,.7);font-size:11px">الذاكرة المحلية ('+(dataSize||'?')+' KB) قد تُمسح عند مسح الكاش. اعمل نسخة احتياطية الآن.</div></div><button onclick="exportJSON();this.closest(\'#backupWarningBanner\').remove();" style="background:#D97706;border:none;color:#fff;padding:8px 12px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap;font-family:IBM Plex Sans Arabic,sans-serif">💾 احتياطي</button><button onclick="this.closest(\'#backupWarningBanner\').remove();" style="background:transparent;border:1px solid rgba(255,255,255,.2);color:rgba(255,255,255,.5);padding:6px 10px;border-radius:8px;font-size:11px;cursor:pointer;font-family:IBM Plex Sans Arabic,sans-serif">تجاهل</button>';
  document.body.appendChild(banner);
  
  // يختفي تلقائياً بعد 15 ثانية
  setTimeout(function(){ if(banner.parentNode) banner.remove(); }, 15000);
}

function changePin(){ changePwd(); } // alias

/* LOCK MONTH */
function toggleLockMonth(){
  if(CR!=="manager"){toast("⚠️ صلاحية المدير مطلوبة");return;}
  if(!S.lockedMonths)S.lockedMonths=[];
  const k=S.activeKey,idx=S.lockedMonths.indexOf(k);
  if(idx>-1){if(!confirm(`فتح الشهر ${k}؟`))return;S.lockedMonths.splice(idx,1);toast("🔓 تم فتح الشهر");}
  else{if(!confirm(`قفل الشهر ${k}؟`))return;S.lockedMonths.push(k);toast("🔒 تم قفل الشهر");}
  saveAll();updLkChips();renderRevTable();renderObligList();
}
function updLkChips(){
  const lk=isLocked();
  const chip=lk?'<span class="lock-chip locked">🔒 مغلق</span>':'<span class="lock-chip">🔓 مفتوح</span>';
  ["lk-dash","lk-rev","lk-obl","lk-rpt"].forEach(id=>{const e=$(id);if(e)e.innerHTML=chip;});
  const b=$("lkMonthBtn");if(b)b.textContent=lk?"🔓 فتح الشهر":"🔒 قفل الشهر";
}

/* INIT */
window.addEventListener("load",function(){
  setInterval(saveAll,60000);
  // PWA install detection
  var deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', function(e){
    e.preventDefault();
    deferredPrompt = e;
    var banner = document.getElementById('pwaBanner');
    var btn = document.getElementById('pwaBtn');
    var desc = document.getElementById('pwaDesc');
    if(banner){ banner.style.display='flex'; }
    if(desc) desc.textContent = 'اضغط تثبيت لإضافة التطبيق لشاشتك الرئيسية';
    if(btn) btn.onclick = function(){
      if(deferredPrompt){ deferredPrompt.prompt(); deferredPrompt.userChoice.then(function(r){ if(r.outcome==='accepted'){banner.style.display='none';toast('✅ تم التثبيت!');}  deferredPrompt=null; }); }
    };
  });
  // Check if already installed
  if(window.matchMedia('(display-mode: standalone)').matches){
    var banner = document.getElementById('pwaBanner');
    if(banner) banner.style.display='none';
  } else {
    // Show manual install guide for content:// files
    setTimeout(function(){
      var banner = document.getElementById('pwaBanner');
      if(banner && banner.style.display==='none'){
        banner.style.display='flex';
        var desc = document.getElementById('pwaDesc');
        if(desc) desc.textContent = 'لفتح التطبيق بسرعة من شاشتك الرئيسية';
      }
    }, 2000);
  }
});

function showInstallGuide(){
  var steps = [
    "طريقة إضافة التطبيق لشاشتك الرئيسية:",
    "",
    "1. افتح Chrome",
    "2. اضغط على القائمة (3 نقاط) اعلى اليمين",
    "3. اختر: اضافة الى الشاشة الرئيسية",
    "4. اضغط اضافة",
    "",
    "ملاحظة: اذا لم يظهر الخيار، انسخ الملف",
    "الى التخزين الداخلي وافتحه من هناك."
  ];
  alert(steps.join(String.fromCharCode(10)));
  var banner = document.getElementById("pwaBanner");
  if(banner) banner.style.display="none";
}
function buildMonthSel(){const sel=$("monthSel");sel.innerHTML="";[2025,2026,2027].forEach(y=>{for(let m=1;m<=12;m++){const k=`${y}-${String(m).padStart(2,"0")}`;const o=document.createElement("option");o.value=k;o.textContent=`${MN[m-1]} ${y}`;if(k===S.activeKey)o.selected=true;sel.appendChild(o);}});}
function switchMonth(k){S.activeKey=k;getMonth(k);renderRevTable();initSalTables();renderAll();saveAll();const[y,m]=k.split("-");toast(`📅 ${MN[parseInt(m)-1]} ${y}${isLocked()?" 🔒":""}`);updLkChips();try{qeInit();}catch(e){}}
function pg(id,btn){
  document.querySelectorAll(".pg").forEach(p=>p.classList.remove("on"));
  document.querySelectorAll(".ntab").forEach(t=>t.classList.remove("on"));
  var el=$(id); if(!el) return;
  el.classList.add("on");
  if(btn) btn.classList.add("on");
  // حفظ الصفحة الأخيرة
  try{ _kSet('rh_last_page', id); }catch(e){}
  // lazy render حسب الصفحة
  if(id==="audit") renderLog();
  else if(id==="rpt") {updateDash();setTimeout(function(){try{updateRpt();}catch(e){}},60);}
  else if(id==="sal") {setTimeout(function(){try{initSalTables();}catch(e){}},60);}
  else if(id==="adv") {renderAdv();renderAdvLedger();}
  else if(id==="oblig") renderObligList();
  else if(id==="purch") renderPurch();
  else if(id==="supp") {renderSuppList();renderSuppRpt();}
  else if(id==="dash"||id==="mgr") updateDash();
  else if(id==="inv") try{renderInvList();}catch(e){}
  else if(id==="annual") try{initAnnualYear();renderAnnual();}catch(e){}
  else if(id==="ai") try{updateAiContext();}catch(e){}
  else renderAll();
}

// استعادة الصفحة الأخيرة بعد تسجيل الدخول
function _restoreLastPage(){
  try{
    var last = _kGet('rh_last_page');
    if(!last) return;
    var el = $(last);
    if(!el) return;
    // إيجاد زر التبويب المقابل
    var btn = document.querySelector('.ntab[onclick*="\''+last+'\'"]');
    pg(last, btn);
  }catch(e){}
}

/* SEARCH */
function doSearch(q){
  const res=$("sres");if(!q||q.length<2){res.classList.remove("open");return;}
  const r=[];
  S.suppliers.filter(s=>s.name.includes(q)||s.cat.includes(q)).forEach(s=>r.push({ico:"📦",text:s.name,sub:s.cat,act:"pg('supp',document.querySelectorAll('.ntab')[3])"}));
  G().purchases.filter(p=>p.sName.includes(q)||(p.desc||"").includes(q)).forEach(p=>r.push({ico:"🛒",text:p.sName,sub:`${n3(p.amt)} JD`,act:"pg('purch',document.querySelectorAll('.ntab')[2])"}));
  [...S.monthlyEmps,...S.dailyEmps].filter(e=>e.name.includes(q)).forEach(e=>r.push({ico:"👤",text:e.name,sub:"موظف",act:"pg('sal',document.querySelectorAll('.ntab')[5])"}));
  G().obligations.filter(o=>o.name.includes(q)).forEach(o=>r.push({ico:"📋",text:o.name,sub:`${n3(o.amt)} JD ${o.paid?"✅":"❌"}`,act:"pg('oblig',document.querySelectorAll('.ntab')[4])"}));
  if(!r.length){res.innerHTML='<div class="sri">لا نتائج</div>';res.classList.add("open");return;}
  res.innerHTML=r.slice(0,7).map(x=>`<div class="sri" onclick="${x.act};closeSearch()"><span>${x.ico}</span><div style="flex:1"><div style="font-size:13px;font-weight:600">${esc(x.text)}</div><div style="font-size:11px;color:var(--tx3)">${esc(x.sub)}</div></div></div>`).join("");
  res.classList.add("open");
}
function closeSearch(){$("sres").classList.remove("open");$("gSearch").value="";}

// SMART NOTIFICATIONS SYSTEM
// ═══════════════════════════════════════════════════════════════════════════

let notifications = [];

function toggleNotifications() {
  var nc = document.getElementById('notifCenter');
  if (nc) nc.classList.toggle('open');
}

function addNotification(type, message) {
  notifications.unshift({
    id: Date.now(),
    type: type,
    message: message,
    time: new Date(),
    read: false
  });
  
  // الاحتفاظ بآخر 20 إشعار
  if (notifications.length > 20) notifications.pop();
  
  renderNotifications();
  updateNotifBadge();
}

function renderNotifications() {
  var list = document.getElementById('notifList');
  if (!list) return;
  
  if (notifications.length === 0) {
    list.innerHTML = '<div class="nc-empty"><div class="nc-empty-icon">🔔</div><div>لا توجد إشعارات</div></div>';
    return;
  }
  
  list.innerHTML = notifications.map(function(n) {
    var iconClass = n.type === 'warn' ? 'warn' : n.type === 'error' ? 'error' : n.type === 'success' ? 'success' : 'info';
    var icon = n.type === 'warn' ? '⚠️' : n.type === 'error' ? '❌' : n.type === 'success' ? '✅' : 'ℹ️';
    var timeAgo = getTimeAgo(n.time);
    
    return '<div class="nc-item ' + (n.read ? '' : 'unread') + '" onclick="markNotifRead(' + n.id + ')"><div class="nc-icon ' + iconClass + '">' + icon + '</div><div class="nc-content"><div class="nc-msg">' + n.message + '</div><div class="nc-time">' + timeAgo + '</div></div></div>';
  }).join('');
}

function markNotifRead(id) {
  var n = notifications.find(function(x) { return x.id === id; });
  if (n) n.read = true;
  renderNotifications();
  updateNotifBadge();
}

function clearNotifications() {
  notifications = [];
  renderNotifications();
  updateNotifBadge();
}

function updateNotifBadge() {
  var count = notifications.filter(function(n) { return !n.read; }).length;
  var badge = document.getElementById('notifCount');
  var dot = document.getElementById('notifDot');
  
  if (badge) badge.textContent = count;
  if (dot) dot.style.display = count > 0 ? 'block' : 'none';
}

function getTimeAgo(date) {
  var seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return 'الآن';
  if (seconds < 3600) return Math.floor(seconds / 60) + ' دقيقة';
  if (seconds < 86400) return Math.floor(seconds / 3600) + ' ساعة';
  return Math.floor(seconds / 86400) + ' يوم';
}

// التنبيهات الذكية
function checkSmartAlerts() {
  var t = totals(), d = G();
  var active = d.sales.filter(function(s) { return (s.cash||0)+(s.visa||0)+(s.pmts||0) > 0; });
  var avg = active.length ? t.rev / active.length : 0;
  
  // تنبيه هامش ربح منخفض
  if (t.margin < 5 && t.rev > 0) {
    var existing = notifications.find(function(n) { return n.message.indexOf('هامش الربح') > -1; });
    if (!existing) {
      addNotification('warn', 'هامش الربح منخفض جداً (' + t.margin.toFixed(1) + '%) - راجع التكاليف');
    }
  }
  
  // تنبيه التزامات غير مسددة
  var unpaid = d.obligations.filter(function(o) { return !o.paid && o.amt > 0; });
  if (unpaid.length >= 3) {
    var existing = notifications.find(function(n) { return n.message.indexOf('التزامات') > -1; });
    if (!existing) {
      addNotification('warn', unpaid.length + ' التزامات غير مسددة بإجمالي ' + n3(unpaid.reduce(function(s,o){return s+o.amt},0)) + ' JD');
    }
  }
  
  // تنبيه المخزون المنخفض
  if (S.inventory) {
    var lowItems = S.inventory.filter(function(i) { return i.qty <= (i.min || 0); });
    if (lowItems.length > 0) {
      var existing = notifications.find(function(n) { return n.message.indexOf('مخزون') > -1; });
      if (!existing) {
        addNotification('error', lowItems.length + ' أصناف في المخزون تحتاج إعادة طلب');
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPARISON WITH PREVIOUS MONTH
// ═══════════════════════════════════════════════════════════════════════════

function showShortcuts() {
  var overlay = document.getElementById('shortcutsOverlay');
  if (overlay) overlay.classList.add('show');
}

function hideShortcuts() {
  var overlay = document.getElementById('shortcutsOverlay');
  if (overlay) overlay.classList.remove('show');
}

document.addEventListener('keydown', function(e) {
  // تجاهل إذا كان المستخدم يكتب في حقل
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  
  // Ctrl + S للحفظ
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault();
    performAutoSave();
    toast('💾 تم الحفظ');
  }
  
  // مفاتيح الأرقام للتنقل
  if (!e.ctrlKey && !e.altKey) {
    var tabs = document.querySelectorAll('.ntab');
    if (e.key === '1' && tabs[0]) { tabs[0].click(); }
    if (e.key === '2' && tabs[1]) { tabs[1].click(); }
    if (e.key === '3' && tabs[2]) { tabs[2].click(); }
    if (e.key === '4' && tabs[3]) { tabs[3].click(); }
  }
  
  // D للوضع الليلي
  if (e.key === 'd' || e.key === 'D') {
    toggleDark();
  }
  
  // / للبحث
  if (e.key === '/') {
    e.preventDefault();
    var search = document.getElementById('gSearch');
    if (search) search.focus();
  }
  
  // ? لعرض الاختصارات
  if (e.key === '?') {
    showShortcuts();
  }
  
  // Escape للإغلاق
  if (e.key === 'Escape') {
    hideShortcuts();
    var nc = document.getElementById('notifCenter');
    if (nc) nc.classList.remove('open');
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// PRESENTATION MODE
// ═══════════════════════════════════════════════════════════════════════════

function togglePresentationMode() {
  document.body.classList.toggle('presentation-mode');
  var isOn = document.body.classList.contains('presentation-mode');
  toast(isOn ? '📺 وضع العرض - اضغط ESC للخروج' : '📺 الوضع العادي');
}

// ═══════════════════════════════════════════════════════════════════════════
// SPARKLINES
// ═══════════════════════════════════════════════════════════════════════════

function createSparkline(containerId, data) {
  var container = document.getElementById(containerId);
  if (!container || !data || !data.length) return;
  
  var max = Math.max.apply(null, data);
  if (max === 0) max = 1;
  
  container.innerHTML = data.slice(-10).map(function(v) {
    var height = Math.max(4, (v / max * 100));
    var cls = v >= 0 ? '' : 'negative';
    return '<div class="spark-bar ' + cls + '" style="height:' + height + '%"></div>';
  }).join('');
}

// ═══════════════════════════════════════════════════════════════════════════
