const DEBUG_MODE = false;
const originalConsole = {
  log: console.log,
  warn: console.warn,
  error: console.error
};

function debugLog() {
  if (DEBUG_MODE) originalConsole.log.apply(console, arguments);
}

// تعطيل console.log في الإنتاج
if (!DEBUG_MODE) {
  console.log = function() {};
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* V24-3 PRO: نظام النسخ الاحتياطي التلقائي                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */
var BACKUP_KEY = 'rh_backups';
var MAX_BACKUPS = 7; // أسبوع من النسخ

function createAutoBackup() {
  try {
    var backups = JSON.parse(safeLS.getItem(BACKUP_KEY) || '[]');
    var today = new Date().toISOString().split('T')[0];
    
    // تحقق إذا كان هناك نسخة لهذا اليوم
    var todayBackup = backups.find(function(b) { return b.date === today; });
    if (todayBackup) return; // نسخة اليوم موجودة
    
    // إنشاء نسخة جديدة
    var backup = {
      date: today,
      time: new Date().toLocaleTimeString('ar-JO'),
      data: safeLS.getItem(SK),
      version: 'V24-3'
    };
    
    backups.unshift(backup);
    
    // الاحتفاظ بآخر 7 نسخ فقط
    if (backups.length > MAX_BACKUPS) {
      backups = backups.slice(0, MAX_BACKUPS);
    }
    
    safeLS.setItem(BACKUP_KEY, JSON.stringify(backups));
    debugLog('✅ تم إنشاء نسخة احتياطية:', today);
  } catch(e) {
    debugLog('❌ خطأ في النسخ الاحتياطي:', e);
  }
}

function listBackups() {
  try {
    var backups = JSON.parse(safeLS.getItem(BACKUP_KEY) || '[]');
    return backups;
  } catch(e) {
    return [];
  }
}

function restoreBackup(date) {
  var backups = listBackups();
  var backup = backups.find(function(b) { return b.date === date; });
  if (!backup || !backup.data) { toast('❌ لم يتم العثور على النسخة'); return; }
  if (!confirm('⚠️ سيتم استبدال البيانات الحالية ببيانات ' + date + '. متأكد؟')) return;
  try {
    safeLS.setItem(SK, backup.data);
    loadStore();
    renderAll();
    cmo('moBackup');
    toast('✅ تمت الاستعادة من نسخة ' + date);
  } catch(e) {
    toast('❌ فشل استعادة النسخة: ' + e.message);
  }
}

function showBackupManager() {
  var backups = listBackups();
  var html = '<div style="padding:16px">';
  html += '<h3 style="margin-bottom:16px;color:var(--gold)">💾 النسخ الاحتياطية</h3>';
  
  if (backups.length === 0) {
    html += '<div class="alert al-i">لا توجد نسخ احتياطية</div>';
  } else {
    html += '<div style="display:flex;flex-direction:column;gap:8px">';
    backups.forEach(function(b) {
      html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:var(--surf2);border-radius:10px">';
      html += '<div><div style="font-weight:700">' + b.date + '</div><div style="font-size:11px;color:var(--tx3)">' + b.time + ' - ' + b.version + '</div></div>';
      html += '<button class="btn btn-sm" onclick="restoreBackup(\'' + b.date + '\')">استعادة</button>';
      html += '</div>';
    });
    html += '</div>';
  }
  
  html += '<div style="margin-top:16px"><button class="btn btn-full" onclick="cmo(\'moBackup\')">إغلاق</button></div>';
  html += '</div>';
  
  var modal = document.getElementById('moBackup');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'moBackup';
    modal.className = 'mo';
    modal.innerHTML = '<div class="mo-box">' + html + '</div>';
    modal.onclick = function(e) { if(e.target === modal) cmo('moBackup'); };
    document.body.appendChild(modal);
  } else {
    modal.querySelector('.mo-box').innerHTML = html;
  }
  openMo('moBackup');
}

// إنشاء نسخة احتياطية عند فتح التطبيق
setTimeout(createAutoBackup, 5000);

/* ═══════════════════════════════════════════════════════════════════════════ */
/* V24-3 PRO: تحليل الاتجاهات والتوقعات                                        */
/* ═══════════════════════════════════════════════════════════════════════════ */
function analyzeTrends() {
  var months = [];
  var keys = Object.keys(S.months || {}).sort();
  
  // جمع بيانات آخر 6 أشهر
  keys.slice(-6).forEach(function(k) {
    var d = S.months[k];
    if (!d) return;
    
    var cash = 0, visa = 0, pmts = 0, purchases = 0;
    (d.sales || []).forEach(function(s) {
      cash += s.cash || 0;
      visa += s.visa || 0;
      pmts += s.pmts || 0;
    });
    (d.purchases || []).forEach(function(p) {
      purchases += p.amt || 0;
    });
    
    months.push({
      key: k,
      revenue: cash + visa,
      expenses: purchases,
      profit: (cash + visa) - purchases
    });
  });
  
  if (months.length < 2) {
    return { trend: 'insufficient', forecast: 0, confidence: 0 };
  }
  
  // حساب الاتجاه
  var revenueGrowth = [];
  for (var i = 1; i < months.length; i++) {
    var prev = months[i-1].revenue || 1;
    var curr = months[i].revenue;
    revenueGrowth.push((curr - prev) / prev * 100);
  }
  
  var avgGrowth = revenueGrowth.reduce(function(a,b){return a+b;}, 0) / revenueGrowth.length;
  var lastRevenue = months[months.length - 1].revenue;
  var forecast = lastRevenue * (1 + avgGrowth / 100);
  
  // حساب الثقة بناءً على استقرار النمو
  var variance = 0;
  revenueGrowth.forEach(function(g) {
    variance += Math.pow(g - avgGrowth, 2);
  });
  variance = Math.sqrt(variance / revenueGrowth.length);
  var confidence = Math.max(0, Math.min(100, 100 - variance * 2));
  
  return {
    trend: avgGrowth > 2 ? 'up' : avgGrowth < -2 ? 'down' : 'stable',
    avgGrowth: avgGrowth,
    forecast: forecast,
    confidence: confidence,
    months: months
  };
}

function renderTrendAnalysis() {
  var container = document.getElementById('trendAnalysis');
  if (!container) return;
  
  var analysis = analyzeTrends();
  
  var trendIcon = analysis.trend === 'up' ? '📈' : analysis.trend === 'down' ? '📉' : '➡️';
  var trendText = analysis.trend === 'up' ? 'صاعد' : analysis.trend === 'down' ? 'هابط' : 'مستقر';
  var trendColor = analysis.trend === 'up' ? 'var(--gn)' : analysis.trend === 'down' ? 'var(--rd)' : 'var(--gold)';
  
  var html = '<div class="smart-card">';
  html += '<div class="sc-header"><div class="sc-icon" style="background:linear-gradient(135deg,#FEF8E8,#FAE9B8)">' + trendIcon + '</div>';
  html += '<div class="sc-title">تحليل الاتجاهات</div></div>';
  
  if (analysis.trend === 'insufficient') {
    html += '<div style="text-align:center;padding:20px;color:var(--tx3)">بيانات غير كافية للتحليل<br><small>يحتاج شهرين على الأقل</small></div>';
  } else {
    html += '<div style="text-align:center;margin-bottom:12px">';
    html += '<div style="font-size:28px;font-weight:800;color:' + trendColor + '">' + trendText + '</div>';
    html += '<div style="font-size:12px;color:var(--tx3)">' + (analysis.avgGrowth >= 0 ? '+' : '') + analysis.avgGrowth.toFixed(1) + '% متوسط النمو</div>';
    html += '</div>';
    
    html += '<div style="background:var(--surf2);border-radius:10px;padding:12px;margin-bottom:10px">';
    html += '<div style="font-size:11px;color:var(--tx3);margin-bottom:4px">التوقع للشهر القادم</div>';
    html += '<div style="font-size:20px;font-weight:700;font-family:monospace">' + n3(analysis.forecast) + ' JD</div>';
    html += '<div style="font-size:10px;color:var(--tx4)">ثقة: ' + analysis.confidence.toFixed(0) + '%</div>';
    html += '</div>';
    
    // Sparkline
    if (analysis.months.length > 0) {
      var maxRev = Math.max.apply(null, analysis.months.map(function(m){return m.revenue;})) || 1;
      html += '<div class="sparkline-container">';
      analysis.months.forEach(function(m, idx) {
        var height = (m.revenue / maxRev * 100);
        var isLast = idx === analysis.months.length - 1;
        html += '<div class="sparkline-bar" style="height:' + Math.max(5, height) + '%;' + (isLast ? 'background:var(--gold)' : '') + '" title="' + m.key + ': ' + n3(m.revenue) + '"></div>';
      });
      html += '</div>';
    }
  }
  
  html += '</div>';
  container.innerHTML = html;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* V24-3 PRO: مقارنة شهرية                                                     */
/* ═══════════════════════════════════════════════════════════════════════════ */
function renderMonthComparison() {
  var container = document.getElementById('monthComparison');
  if (!container) return;
  
  var keys = Object.keys(S.months || {}).sort().slice(-3);
  if (keys.length < 2) {
    container.innerHTML = '<div class="alert al-i" style="margin:0">بيانات غير كافية للمقارنة</div>';
    return;
  }
  
  var data = keys.map(function(k) {
    var d = S.months[k];
    var cash = 0, visa = 0, purchases = 0;
    (d.sales || []).forEach(function(s) { cash += s.cash || 0; visa += s.visa || 0; });
    (d.purchases || []).forEach(function(p) { purchases += p.amt || 0; });
    var rev = cash + visa;
    return { key: k, revenue: rev, expenses: purchases, profit: rev - purchases };
  });
  
  var maxVal = Math.max.apply(null, data.map(function(d) { return Math.max(d.revenue, d.expenses); })) || 1;
  
  var html = '<div class="card" style="margin:0"><div class="card-hd"><div class="card-title"><span class="ct-ico ct-b">📊</span>مقارنة الأشهر</div></div>';
  html += '<div class="card-body">';
  
  data.forEach(function(d) {
    var parts = d.key.split('-');
    var monthName = MN ? MN[parseInt(parts[1]) - 1] : parts[1];
    var revPct = (d.revenue / maxVal * 100).toFixed(0);
    var expPct = (d.expenses / maxVal * 100).toFixed(0);
    
    html += '<div style="margin-bottom:16px">';
    html += '<div style="font-weight:700;margin-bottom:6px">' + monthName + ' ' + parts[0] + '</div>';
    html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">';
    html += '<span style="width:60px;font-size:11px;color:var(--tx3)">الإيراد</span>';
    html += '<div style="flex:1;height:12px;background:var(--br);border-radius:6px;overflow:hidden">';
    html += '<div style="width:' + revPct + '%;height:100%;background:var(--gn);border-radius:6px"></div></div>';
    html += '<span style="font-size:12px;font-weight:600;width:70px;text-align:left;font-family:monospace">' + n3(d.revenue) + '</span>';
    html += '</div>';
    
    html += '<div style="display:flex;align-items:center;gap:8px">';
    html += '<span style="width:60px;font-size:11px;color:var(--tx3)">المصاريف</span>';
    html += '<div style="flex:1;height:12px;background:var(--br);border-radius:6px;overflow:hidden">';
    html += '<div style="width:' + expPct + '%;height:100%;background:var(--rd);border-radius:6px"></div></div>';
    html += '<span style="font-size:12px;font-weight:600;width:70px;text-align:left;font-family:monospace">' + n3(d.expenses) + '</span>';
    html += '</div>';
    html += '</div>';
  });
  
  html += '</div></div>';
  container.innerHTML = html;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* V24-3 PRO: تقرير الموظفين                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */
function renderEmployeeReport() {
  var container = document.getElementById('employeeReport');
  if (!container) return;
  
  var d = G();
  var html = '<div class="card" style="margin:0"><div class="card-hd"><div class="card-title"><span class="ct-ico ct-g">👥</span>تقرير الموظفين</div></div>';
  html += '<div class="card-body">';
  
  // الموظفين الشهريين
  if (S.monthlyEmps && S.monthlyEmps.length > 0) {
    html += '<div style="font-size:12px;font-weight:700;color:var(--tx3);margin-bottom:10px">📋 الموظفين الشهريين</div>';
    S.monthlyEmps.forEach(function(e) {
      var sal = d.mSal[e.id] || {};
      var gross = (sal.base || 0) + (sal.allow || 0);
      var net = gross - (sal.ded || 0);
      
      html += '<div class="employee-report-card">';
      html += '<div class="emp-report-header">';
      html += '<div style="display:flex;align-items:center;gap:10px"><div class="emp-avatar">👤</div>';
      html += '<div><div class="emp-name">' + e.name + '</div><div class="emp-role">راتب شهري</div></div></div>';
      html += '</div>';
      html += '<div class="emp-stats-grid">';
      html += '<div class="emp-stat"><div class="emp-stat-value" style="color:var(--bl)">' + n3(sal.base || 0) + '</div><div class="emp-stat-label">الأساسي</div></div>';
      html += '<div class="emp-stat"><div class="emp-stat-value" style="color:var(--gn)">' + n3(sal.allow || 0) + '</div><div class="emp-stat-label">البدلات</div></div>';
      html += '<div class="emp-stat"><div class="emp-stat-value" style="color:var(--gold)">' + n3(net) + '</div><div class="emp-stat-label">الصافي</div></div>';
      html += '</div></div>';
    });
  }
  
  // الموظفين اليوميين
  if (S.dailyEmps && S.dailyEmps.length > 0) {
    html += '<div style="font-size:12px;font-weight:700;color:var(--tx3);margin:16px 0 10px">⏰ الموظفين اليوميين</div>';
    S.dailyEmps.forEach(function(e) {
      var w = d.dWages[e.id] || {};
      var days = (w.att || []).length;
      var total = (w.rate || 0) * days;
      var daysInMonth = new Date(S.activeKey.split('-')[0], S.activeKey.split('-')[1], 0).getDate();
      var attendance = ((days / daysInMonth) * 100).toFixed(0);
      
      html += '<div class="employee-report-card">';
      html += '<div class="emp-report-header">';
      html += '<div style="display:flex;align-items:center;gap:10px"><div class="emp-avatar">👷</div>';
      html += '<div><div class="emp-name">' + e.name + '</div><div class="emp-role">أجر يومي</div></div></div>';
      html += '</div>';
      html += '<div class="emp-stats-grid">';
      html += '<div class="emp-stat"><div class="emp-stat-value" style="color:var(--bl)">' + days + '</div><div class="emp-stat-label">أيام الحضور</div></div>';
      html += '<div class="emp-stat"><div class="emp-stat-value" style="color:var(--gn)">' + n3(w.rate || 0) + '</div><div class="emp-stat-label">الأجر اليومي</div></div>';
      html += '<div class="emp-stat"><div class="emp-stat-value" style="color:var(--gold)">' + n3(total) + '</div><div class="emp-stat-label">الإجمالي</div></div>';
      html += '</div>';
      // شريط الحضور
      html += '<div style="margin-top:10px"><div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:4px"><span>نسبة الحضور</span><span>' + attendance + '%</span></div>';
      html += '<div style="height:6px;background:var(--br);border-radius:3px;overflow:hidden"><div style="width:' + attendance + '%;height:100%;background:var(--gold);border-radius:3px"></div></div></div>';
      html += '</div>';
    });
  }
  
  html += '</div></div>';
  container.innerHTML = html;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* V24-3 PRO: وضع العرض (Presentation Mode)                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */
function enterPresentationMode() {
  document.body.classList.add('presentation-mode');
  
  var calc = getCalc();
  var analysis = analyzeTrends();
  
  // إنشاء واجهة العرض
  var html = '<button class="presentation-exit" onclick="exitPresentationMode()">✕ خروج</button>';
  html += '<div class="presentation-dashboard">';
  
  // Header
  html += '<div class="presentation-header">';
  html += '<div class="presentation-logo">☕ ريحانة كافيه</div>';
  html += '<div style="text-align:left"><div class="presentation-time" id="presTime"></div><div class="presentation-date" id="presDate"></div></div>';
  html += '</div>';
  
  // Card 1: الإيراد
  html += '<div class="presentation-card">';
  html += '<div class="presentation-card-title">💰 إيراد الشهر</div>';
  html += '<div class="presentation-big-number positive">' + n3(calc.revenue) + ' JD</div>';
  html += '<div style="text-align:center;color:var(--tx3)">متوسط يومي: ' + n3(calc.avgDaily) + ' JD</div>';
  html += '</div>';
  
  // Card 2: الربح
  html += '<div class="presentation-card">';
  html += '<div class="presentation-card-title">📊 صافي الربح</div>';
  html += '<div class="presentation-big-number ' + (calc.profit >= 0 ? 'positive' : 'negative') + '">' + n3(calc.profit) + ' JD</div>';
  html += '<div style="text-align:center;color:var(--tx3)">هامش الربح: ' + calc.margin.toFixed(1) + '%</div>';
  html += '</div>';
  
  // Card 3: الاتجاه
  var trendIcon = analysis.trend === 'up' ? '📈' : analysis.trend === 'down' ? '📉' : '➡️';
  var hasGrowthData = analysis.trend !== 'insufficient' && typeof analysis.avgGrowth === 'number';
  html += '<div class="presentation-card">';
  html += '<div class="presentation-card-title">' + trendIcon + ' اتجاه النمو</div>';
  if (hasGrowthData) {
    html += '<div class="presentation-big-number" style="color:' + (analysis.avgGrowth >= 0 ? 'var(--gn)' : 'var(--rd)') + '">' + (analysis.avgGrowth >= 0 ? '+' : '') + analysis.avgGrowth.toFixed(1) + '%</div>';
    html += '<div style="text-align:center;color:var(--tx3)">توقع الشهر القادم: ' + n3(analysis.forecast) + ' JD</div>';
  } else {
    html += '<div class="presentation-big-number" style="color:var(--tx3)">—</div>';
    html += '<div style="text-align:center;color:var(--tx3)">بيانات غير كافية (يحتاج شهرين)</div>';
  }
  html += '</div>';
  
  // Card 4: مؤشر الصحة
  html += '<div class="presentation-card">';
  html += '<div class="presentation-card-title">❤️ مؤشر الصحة المالية</div>';
  html += '<div class="presentation-big-number" style="color:' + (calc.healthScore >= 70 ? 'var(--gn)' : calc.healthScore >= 40 ? 'var(--gold)' : 'var(--rd)') + '">' + calc.healthScore + '/100</div>';
  html += '<div style="text-align:center;color:var(--tx3)">' + (calc.healthScore >= 70 ? 'ممتاز' : calc.healthScore >= 40 ? 'جيد' : 'يحتاج تحسين') + '</div>';
  html += '</div>';
  
  html += '</div>';
  
  // إضافة العناصر
  var overlay = document.createElement('div');
  overlay.id = 'presentationOverlay';
  overlay.innerHTML = html;
  document.body.appendChild(overlay);
  
  // تحديث الوقت
  function updatePresTime() {
    var now = new Date();
    var timeEl = document.getElementById('presTime');
    var dateEl = document.getElementById('presDate');
    if (timeEl) timeEl.textContent = now.toLocaleTimeString('ar-JO', {hour: '2-digit', minute: '2-digit', second: '2-digit'});
    if (dateEl) dateEl.textContent = now.toLocaleDateString('ar-JO', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'});
  }
  updatePresTime();
  window.presInterval = setInterval(updatePresTime, 1000);
  
  // الخروج بضغط Escape
  document.addEventListener('keydown', function escHandler(e) {
    if (e.key === 'Escape') {
      exitPresentationMode();
      document.removeEventListener('keydown', escHandler);
    }
  });
}

function exitPresentationMode() {
  document.body.classList.remove('presentation-mode');
  var overlay = document.getElementById('presentationOverlay');
  if (overlay) overlay.remove();
  if (window.presInterval) clearInterval(window.presInterval);
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* V24-3 PRO: تهيئة الميزات الجديدة                                            */
/* ═══════════════════════════════════════════════════════════════════════════ */
var _v24Interval = null;
function initV24Features() {
  debugLog('🚀 V24-3 Features Initializing...');

  setTimeout(function() {
    renderTrendAnalysis();
    renderMonthComparison();
    renderEmployeeReport();
  }, 500);

  if (_v24Interval) clearInterval(_v24Interval);
  _v24Interval = setInterval(function() {
    renderTrendAnalysis();
    renderMonthComparison();
  }, 60000);
}

// تركيز تلقائي على حقل الباسورد
document.addEventListener('DOMContentLoaded', function(){
  var pw = document.getElementById('pwdInput');
  if(pw) setTimeout(function(){ pw.focus(); }, 300);
});

// إضافة زر وضع العرض
setTimeout(function() {
  var fabContainer = document.querySelector('.fab-container');
  if (fabContainer && !document.getElementById('fabPresentation')) {
    var presBtn = document.createElement('div');
    presBtn.id = 'fabPresentation';
    presBtn.className = 'fab-btn';
    presBtn.innerHTML = '📺';
    presBtn.title = 'وضع العرض';
    presBtn.onclick = enterPresentationMode;
    presBtn.style.background = 'linear-gradient(135deg, #8B5CF6, #6366F1)';
    fabContainer.insertBefore(presBtn, fabContainer.firstChild);
  }
  
  // إضافة زر النسخ الاحتياطي
  if (fabContainer && !document.getElementById('fabBackup')) {
    var backupBtn = document.createElement('div');
    backupBtn.id = 'fabBackup';
    backupBtn.className = 'fab-btn';
    backupBtn.innerHTML = '💾';
    backupBtn.title = 'النسخ الاحتياطي';
    backupBtn.onclick = showBackupManager;
    backupBtn.style.background = 'linear-gradient(135deg, #10B981, #059669)';
    fabContainer.insertBefore(backupBtn, fabContainer.firstChild);
  }
}, 2000);

/* ═══════════════════════════════════════════════════════════════════════
   ريحانة V25 — SUPABASE SYNC ENGINE
   بيانات آمنة في السحابة + مزامنة فورية بين الأجهزة
   
   المنطق:
   - localStorage = cache محلي للعمل بدون إنترنت
   - Supabase = مصدر الحقيقة في السحابة
   - كل save → يرفع Supabase تلقائياً (debounced)
   - عند الدخول → يحمّل من Supabase أولاً
═══════════════════════════════════════════════════════════════════════ */

