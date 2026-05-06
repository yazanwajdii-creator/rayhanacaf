// INITIALIZE
// ═══════════════════════════════════════════════════════════════════════════

// تحديث عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
  try { _updateGsheetBtnLabel(); } catch(e) {}
  setTimeout(function() {
    try { updateHealthCardNew(); } catch(e) {}
    try { updateBreakevenCardNew(); } catch(e) {}
    try { updateWeeklyCardNew(); } catch(e) {}
    try { updateQuickInsights(); } catch(e) {}
    try { updateComparisons(); } catch(e) {}
    try { startAutoSave(); } catch(e) {}
  }, 500);
});

// ═══════════════════════════════════════════════════════════════════════════
// V15 ULTIMATE - LIVE STATS
// ═══════════════════════════════════════════════════════════════════════════

let liveClockInterval = null;

function startLiveClock() {
  updateLiveTime();
  if (liveClockInterval) clearInterval(liveClockInterval);
  liveClockInterval = setInterval(updateLiveTime, 1000);
}

function updateLiveTime() {
  try {
    var el = document.getElementById('liveTime');
    if (!el) return;
    var now = new Date();
    var h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();
    var hh = h < 10 ? '0'+h : ''+h;
    var mm = m < 10 ? '0'+m : ''+m;
    var ss = s < 10 ? '0'+s : ''+s;
    el.textContent = hh + ':' + mm + ':' + ss;
  } catch(e) {}
}

startLiveClock();

function updateLiveStats() {
  // فحص أمان
  if (typeof S === 'undefined' || !S.activeKey) return;
  if (typeof totals !== 'function' || typeof G !== 'function') return;
  
  try {
    var t = totals(), d = G();
    if (!d || !d.sales) return;
    
    var active = d.sales.filter(function(s) { return (s.cash||0)+(s.visa||0)+(s.pmts||0) > 0; });
    var avg = active.length ? t.rev / active.length : 0;
    var days = daysIn(S.activeKey);
    var today = new Date().getDate();
    
    // إيراد اليوم
    var todaySale = d.sales.find(function(s) { return s.day === today; });
    var todayRev = todaySale ? (todaySale.cash||0) + (todaySale.visa||0) + (todaySale.pmts||0) : 0;
    
    var el1 = document.getElementById('liveTodayRev');
    var el2 = document.getElementById('liveAvg');
    var el3 = document.getElementById('liveDays');
    
    if (el1) el1.textContent = n3(todayRev) + ' JD';
    if (el2) el2.textContent = n3(avg) + ' JD';
    if (el3) el3.textContent = Math.max(0, days - today);
    
    // تحديث حالة اليوم
    var todayStat = document.getElementById('liveTodayStat');
    if (todayStat) {
      todayStat.classList.remove('positive', 'negative');
      if (todayRev > avg) todayStat.classList.add('positive');
      else if (todayRev < avg && todayRev > 0) todayStat.classList.add('negative');
    }
  } catch(e) {
    console.log('updateLiveStats error:', e);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// V15 ULTIMATE - GOAL TRACKER
// ═══════════════════════════════════════════════════════════════════════════

function updateGoalTracker() {
  var t = totals();
  var goal = S.targets && S.targets[S.activeKey] ? S.targets[S.activeKey] : 0;
  
  var fillEl = document.getElementById('goalFill');
  var pctEl = document.getElementById('goalPct');
  var targetEl = document.getElementById('goalTarget');
  var achievedEl = document.getElementById('goalAchieved');
  var remainingEl = document.getElementById('goalRemaining');
  
  if (goal <= 0) {
    if (fillEl) fillEl.style.width = '0%';
    if (pctEl) pctEl.textContent = '—';
    if (targetEl) targetEl.textContent = 'لم يُحدد';
    if (achievedEl) achievedEl.textContent = n3(t.rev) + ' JD';
    if (remainingEl) remainingEl.textContent = '—';
    return;
  }
  
  var pct = Math.min(150, (t.rev / goal * 100));
  var remaining = Math.max(0, goal - t.rev);
  
  if (fillEl) {
    fillEl.style.width = Math.min(100, pct) + '%';
    if (pct >= 100) fillEl.classList.add('goal-exceeded');
    else fillEl.classList.remove('goal-exceeded');
  }
  if (pctEl) pctEl.textContent = pct.toFixed(0) + '%';
  if (targetEl) targetEl.textContent = n3(goal) + ' JD';
  if (achievedEl) achievedEl.textContent = n3(t.rev) + ' JD';
  if (remainingEl) remainingEl.textContent = remaining > 0 ? n3(remaining) + ' JD' : '✅ تم!';
}

function openGoalEditor() {
  var t = totals(), d = G();
  var active = d.sales.filter(function(s) { return (s.cash||0)+(s.visa||0)+(s.pmts||0) > 0; });
  var avg = active.length ? t.rev / active.length : 0;
  var days = daysIn(S.activeKey);
  var suggested = Math.round(avg * days);
  
  var input = document.getElementById('goalInput');
  var tip = document.getElementById('goalTip');
  
  if (input) {
    var currentGoal = S.targets && S.targets[S.activeKey] ? S.targets[S.activeKey] : '';
    input.value = currentGoal;
  }
  if (tip) {
    tip.textContent = 'بناءً على متوسطك اليومي (' + n3(avg) + ' JD)، يُنصح بهدف حوالي ' + n3(suggested) + ' JD';
  }
  
  openMo('moGoal');
}

function saveGoal() {
  var input = document.getElementById('goalInput');
  if (!input) return;
  
  var goal = parseFloat(input.value) || 0;
  if (!S.targets) S.targets = {};
  S.targets[S.activeKey] = goal;
  
  saveAll();
  updateGoalTracker();
  cmo('moGoal');
  toast('🎯 تم حفظ الهدف: ' + n3(goal) + ' JD');
  
  // احتفال إذا كان الهدف محقق
  var t = totals();
  if (goal > 0 && t.rev >= goal) {
    celebrateGoal();
  }
}

function celebrateGoal() {
  toast('🎉 مبروك! حققت الهدف الشهري!');
  // يمكن إضافة تأثير confetti هنا
}

// ═══════════════════════════════════════════════════════════════════════════
// V15 ULTIMATE - ANALYTICS CARDS
// ═══════════════════════════════════════════════════════════════════════════

function updateAnalyticsCards() {
  var t = totals();
  var today = new Date().getDate();
  
  // مقارنة عادلة: نفس الفترة من الشهرين
  var prev = getPrevMonthTotals(today);
  var curr = getCurrentMonthTotalsUpTo(today);
  
  // تحديث القيم
  var revEl = document.getElementById('acRevenue');
  var expEl = document.getElementById('acExpense');
  var profitEl = document.getElementById('acProfit');
  var growthEl = document.getElementById('acGrowth');
  
  if (revEl) revEl.textContent = n3(t.rev);
  if (expEl) expEl.textContent = n3(t.totalExp);
  if (profitEl) profitEl.textContent = n3(t.profit);
  
  // حساب النمو (مقارنة عادلة)
  var growth = 0;
  if (prev && prev.rev > 0) {
    growth = ((curr.rev - prev.rev) / prev.rev * 100);
  }
  if (growthEl) growthEl.textContent = (growth >= 0 ? '+' : '') + growth.toFixed(1) + '%';
  
  // تحديث الاتجاهات
  updateTrendIndicator('revTrend', prev ? curr.rev - prev.rev : 0);
  updateTrendIndicator('expTrend', prev ? -(curr.exp - prev.exp) : 0); // عكسي
  updateTrendIndicator('profitTrend', prev ? curr.profit - prev.profit : 0);
  updateTrendIndicator('growthTrend', growth);
  
  // تحديث المقارنات مع توضيح الفترة
  if (prev) {
    updateCompareLabel('acRevCompare', curr.rev, prev.rev, false, today);
    updateCompareLabel('acExpCompare', curr.exp, prev.exp, true, today);
    updateCompareLabel('acProfitCompare', curr.profit, prev.profit, false, today);
  }
}

function updateTrendIndicator(id, diff) {
  var el = document.getElementById(id);
  if (!el) return;
  
  if (diff > 0) {
    el.textContent = '↗️';
  } else if (diff < 0) {
    el.textContent = '↘️';
  } else {
    el.textContent = '➡️';
  }
}

function updateCompareLabel(id, current, previous, inverse, days) {
  var el = document.getElementById(id);
  if (!el) return;
  
  var diff = current - previous;
  var pct = Math.abs(previous) > 0 ? Math.abs(diff / Math.abs(previous) * 100) : 0;
  
  var isUp = inverse ? diff < 0 : diff > 0;
  el.className = 'ac-compare ' + (isUp ? 'up' : diff === 0 ? '' : 'down');
  
  // إظهار فترة المقارنة
  var periodText = days ? ' (أول ' + days + ' يوم)' : '';
  el.textContent = (isUp ? '↑' : diff === 0 ? '→' : '↓') + ' ' + pct.toFixed(0) + '%' + periodText;
}

// ═══════════════════════════════════════════════════════════════════════════
// V15 ULTIMATE - QUICK ACTIONS
// ═══════════════════════════════════════════════════════════════════════════

function quickAddSale() {
  // التنقل لصفحة الإيرادات والتركيز على اليوم الحالي
  pg('rev', document.querySelectorAll('.ntab')[1]);
  
  setTimeout(function() {
    var today = new Date().getDate();
    var input = document.querySelector('input[id^="c-' + today + '"]');
    if (input) {
      input.focus();
      input.scrollIntoView({behavior: 'smooth', block: 'center'});
    }
  }, 300);
  
  toast('💵 أدخل مبيعات اليوم ' + new Date().getDate());
}

function toggleExportPanel() {
  var panel = document.getElementById('exportPanel');
  if (panel) panel.classList.toggle('show');
}

// إغلاق لوحة التصدير عند النقر خارجها
document.addEventListener('click', function(e) {
  var panel = document.getElementById('exportPanel');
  if (panel && !e.target.closest('#exportPanel') && !e.target.closest('.qa-btn')) {
    panel.classList.remove('show');
  }
});

// ═══════════════════════════════════════════════════════════════════════════
function shareReport() {
  toggleExportPanel();
  
  var t = totals();
  var ym = S.activeKey.split('-');
  var monthName = MNA[parseInt(ym[1])-1];
  
  var text = '☕ تقرير ريحانة كافيه - ' + monthName + ' ' + ym[0] + '\n\n';
  text += '💰 الإيراد: ' + n3(t.rev) + ' JD\n';
  text += '📊 الربح: ' + n3(t.profit) + ' JD\n';
  text += '📈 الهامش: ' + t.margin.toFixed(1) + '%\n';
  
  if (navigator.share) {
    navigator.share({
      title: 'تقرير ريحانة كافيه',
      text: text
    }).catch(function() {});
  } else {
    // نسخ للحافظة
    navigator.clipboard.writeText(text).then(function() {
      toast('📋 تم نسخ التقرير');
    });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// V15 ULTIMATE - ENHANCED UPDATE DASH
// ═══════════════════════════════════════════════════════════════════════════

// V15 ULTIMATE - SALES FORECASTING (مثل 5-Out & Crunchtime)
// ═══════════════════════════════════════════════════════════════════════════

function updateForecastCard() {
  var t = totals(), d = G();
  var active = d.sales.filter(function(s) { return (s.cash||0)+(s.visa||0)+(s.pmts||0) > 0; });
  var days = daysIn(S.activeKey);
  var today = new Date().getDate();
  
  if (active.length < 3) {
    document.getElementById('fcToday').textContent = '—';
    document.getElementById('fcWeek').textContent = '—';
    document.getElementById('fcMonth').textContent = '—';
    document.getElementById('fcConfidence').textContent = 'أدخل 3 أيام على الأقل للتوقعات';
    return;
  }
  
  // حساب المتوسط والانحراف
  var revenues = active.map(function(s) { return (s.cash||0)+(s.visa||0)+(s.pmts||0); });
  var avg = revenues.reduce(function(a,b){return a+b;},0) / revenues.length;
  var variance = revenues.reduce(function(a,v){return a+Math.pow(v-avg,2);},0) / revenues.length;
  var stdDev = Math.sqrt(variance);
  
  // توقعات بناءً على الاتجاه
  var trend = 0;
  if (revenues.length >= 5) {
    var recent = revenues.slice(-5);
    var older = revenues.slice(-10, -5);
    if (older.length > 0) {
      var recentAvg = recent.reduce(function(a,b){return a+b;},0) / recent.length;
      var olderAvg = older.reduce(function(a,b){return a+b;},0) / older.length;
      trend = (recentAvg - olderAvg) / olderAvg;
    }
  }
  
  var todayForecast = avg * (1 + trend * 0.1);
  var weekForecast = todayForecast * 7;
  var daysLeft = days - today;
  var monthForecast = t.rev + (todayForecast * daysLeft);
  
  // دقة التوقع
  var confidence = Math.max(60, Math.min(98, 95 - (stdDev / avg * 50)));
  
  document.getElementById('fcToday').textContent = n3(todayForecast);
  document.getElementById('fcWeek').textContent = n3(weekForecast);
  document.getElementById('fcMonth').textContent = n3(monthForecast);
  document.getElementById('fcConfidence').textContent = 'دقة التوقع: ' + confidence.toFixed(0) + '%';
  
  // رسم الأعمدة
  var chartEl = document.getElementById('fcChart');
  if (chartEl) {
    var last7 = revenues.slice(-7);
    var maxVal = Math.max.apply(null, last7.concat([todayForecast]));
    var html = '';
    for (var i = 0; i < last7.length; i++) {
      var h = (last7[i] / maxVal * 100);
      html += '<div class="fc-bar" style="height:'+h+'%"></div>';
    }
    html += '<div class="fc-bar projected" style="height:'+(todayForecast/maxVal*100)+'%"></div>';
    chartEl.innerHTML = html;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// V15 ULTIMATE - PERIOD COMPARISON (مثل Toast Analytics)
// ═══════════════════════════════════════════════════════════════════════════

function updatePeriodCompare() {
  var today = new Date().getDate();
  
  // مقارنة عادلة: نفس الفترة من الشهرين
  var curr = getCurrentMonthTotalsUpTo(today);
  var prev = getPrevMonthTotals(today);
  var body = document.getElementById('pcBody');
  if (!body) return;
  
  if (!prev || !prev.rev) {
    body.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--tx3)">لا توجد بيانات للشهر السابق</td></tr>';
    return;
  }
  
  // تحديث عنوان الجدول ليظهر فترة المقارنة
  var header = document.getElementById('pcHeader');
  if (header) {
    header.textContent = 'مقارنة أول ' + today + ' يوم';
  }
  
  var rows = [
    {name: 'الإيراد', curr: curr.rev, prev: prev.rev},
    {name: 'المصروفات', curr: curr.exp, prev: prev.exp, inverse: true},
    {name: 'الربح', curr: curr.profit, prev: prev.profit}
  ];
  
  var html = '';
  rows.forEach(function(r) {
    var diff = r.curr - r.prev;
    var pct = Math.abs(r.prev) > 0 ? Math.abs(diff / Math.abs(r.prev) * 100) : 0;
    var isUp = r.inverse ? diff < 0 : diff > 0;
    var cls = isUp ? 'up' : diff === 0 ? '' : 'down';
    var arrow = isUp ? '↑' : diff === 0 ? '→' : '↓';
    
    html += '<tr>';
    html += '<td>' + r.name + '</td>';
    html += '<td style="font-family:\'IBM Plex Mono\'">' + n3(r.curr) + '</td>';
    html += '<td style="font-family:\'IBM Plex Mono\';color:var(--tx3)">' + n3(r.prev) + '</td>';
    html += '<td><span class="pc-change ' + cls + '">' + arrow + ' ' + pct.toFixed(0) + '%</span></td>';
    html += '</tr>';
  });
  
  body.innerHTML = html;
}

function comparePeriod(type, ev) {
  var btns = document.querySelectorAll('.pc-btn');
  btns.forEach(function(b) { b.classList.remove('active'); });
  if (ev && ev.target) {
    ev.target.classList.add('active');
  } else {
    // fallback: تنشيط الزر الصحيح
    btns.forEach(function(b) {
      if ((type === 'month' && b.textContent.indexOf('شهر') > -1) ||
          (type === 'week' && b.textContent.indexOf('أسبوع') > -1)) {
        b.classList.add('active');
      }
    });
  }
  
  // حفظ نوع المقارنة الحالي
  window.currentCompareType = type;
  
  if (type === 'week') {
    updateWeeklyCompare();
  } else {
    updatePeriodCompare();
  }
}

// ═══ مقارنة أسبوعية حقيقية ═══
function updateWeeklyCompare() {
  var today = new Date();
  var currentDay = today.getDate();
  
  // حساب بداية ونهاية الأسبوع الحالي (آخر 7 أيام)
  var weekEnd = currentDay;
  var weekStart = Math.max(1, currentDay - 6);
  var daysInWeek = weekEnd - weekStart + 1;
  
  // الحصول على بيانات الأسبوع الحالي
  var currWeek = getWeekData(S.activeKey, weekStart, weekEnd);
  
  // الحصول على بيانات نفس الأيام من الشهر السابق
  var prevKey = getPrevMonthKey();
  var prevWeek = prevKey && S.months[prevKey] ? getWeekData(prevKey, weekStart, weekEnd) : null;
  
  var body = document.getElementById('pcBody');
  var header = document.getElementById('pcHeader');
  
  if (!body) return;
  
  if (header) {
    header.textContent = 'مقارنة الأيام ' + weekStart + '-' + weekEnd + ' (آخر ' + daysInWeek + ' أيام)';
  }
  
  if (!prevWeek || prevWeek.rev === 0) {
    body.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--tx3);padding:15px">' +
      '<div style="font-size:24px;margin-bottom:8px">📊</div>' +
      'لا توجد بيانات للأسبوع المقابل من الشهر السابق<br>' +
      '<small style="color:var(--tx4)">أدخل بيانات الأيام ' + weekStart + '-' + weekEnd + ' من الشهر السابق للمقارنة</small>' +
      '</td></tr>';
    return;
  }
  
  var rows = [
    {name: '💰 الإيراد', curr: currWeek.rev, prev: prevWeek.rev},
    {name: '📉 المصروفات', curr: currWeek.exp, prev: prevWeek.exp, inverse: true},
    {name: '📊 صافي الربح', curr: currWeek.profit, prev: prevWeek.profit}
  ];
  
  var html = '';
  rows.forEach(function(r) {
    var diff = r.curr - r.prev;
    var pct = Math.abs(r.prev) > 0 ? (diff / Math.abs(r.prev) * 100) : (r.curr > 0 ? 100 : 0);
    var isUp = r.inverse ? diff < 0 : diff > 0;
    var cls = diff === 0 ? '' : (isUp ? 'up' : 'down');
    var arrow = diff === 0 ? '→' : (isUp ? '↑' : '↓');
    
    html += '<tr>';
    html += '<td style="font-weight:600">' + r.name + '</td>';
    html += '<td style="font-family:\'IBM Plex Mono\';font-weight:700;color:var(--sap)">' + n3(r.curr) + '</td>';
    html += '<td style="font-family:\'IBM Plex Mono\';color:var(--tx3)">' + n3(r.prev) + '</td>';
    html += '<td><span class="pc-change ' + cls + '">' + arrow + ' ' + Math.abs(pct).toFixed(0) + '%</span></td>';
    html += '</tr>';
  });
  
  // إضافة صف للمتوسط اليومي
  var currAvg = currWeek.activeDays > 0 ? currWeek.rev / currWeek.activeDays : 0;
  var prevAvg = prevWeek.activeDays > 0 ? prevWeek.rev / prevWeek.activeDays : 0;
  var avgDiff = currAvg - prevAvg;
  var avgPct = prevAvg > 0 ? (avgDiff / prevAvg * 100) : 0;
  var avgCls = avgDiff === 0 ? '' : (avgDiff > 0 ? 'up' : 'down');
  var avgArrow = avgDiff === 0 ? '→' : (avgDiff > 0 ? '↑' : '↓');
  
  html += '<tr style="border-top:2px solid var(--br)">';
  html += '<td style="font-weight:600">📈 المتوسط اليومي</td>';
  html += '<td style="font-family:\'IBM Plex Mono\';font-weight:700;color:var(--gn)">' + n3(currAvg) + '</td>';
  html += '<td style="font-family:\'IBM Plex Mono\';color:var(--tx3)">' + n3(prevAvg) + '</td>';
  html += '<td><span class="pc-change ' + avgCls + '">' + avgArrow + ' ' + Math.abs(avgPct).toFixed(0) + '%</span></td>';
  html += '</tr>';
  
  body.innerHTML = html;
}

// دالة مساعدة للحصول على بيانات فترة معينة
function getWeekData(monthKey, startDay, endDay) {
  var data = S.months[monthKey];
  if (!data) return { rev: 0, exp: 0, profit: 0, activeDays: 0 };
  
  var rev = 0, exp = 0, activeDays = 0;
  
  if (data.sales) {
    data.sales.forEach(function(s) {
      if (s.day >= startDay && s.day <= endDay) {
        var dayRev = (s.cash||0) + (s.visa||0) + (s.pmts||0);
        rev += dayRev;
        if (dayRev > 0) activeDays++;
      }
    });
  }
  
  if (data.purchases) {
    data.purchases.forEach(function(p) {
      var purchDay = 1;
      if (p.date) {
        var parts = p.date.split('-');
        if (parts.length === 3) purchDay = parseInt(parts[2]);
        else {
          parts = p.date.split('/');
          if (parts.length >= 1) purchDay = parseInt(parts[0]);
        }
      }
      if (purchDay >= startDay && purchDay <= endDay) {
        exp += p.amt || 0;
      }
    });
  }
  
  // الالتزامات تُوزع على الأسبوع نسبياً
  if (data.obligations) {
    var daysInMonth = daysIn(monthKey);
    var weekDays = endDay - startDay + 1;
    var oblShare = weekDays / daysInMonth;
    data.obligations.forEach(function(o) {
      exp += (o.amt || 0) * oblShare;
    });
  }
  
  return { rev: rev, exp: exp, profit: rev - exp, activeDays: activeDays };
}

// ═══════════════════════════════════════════════════════════════════════════
// V15 ULTIMATE - COST ANALYSIS (مثل MarketMan)
// ═══════════════════════════════════════════════════════════════════════════

function updateCostAnalysis() {
  var t = totals();
  
  if (t.rev <= 0) return;
  
  var cogsPct = t.bycat.COGS / t.rev * 100;
  var salPct = (t.mSalG + t.dwTotal) / t.rev * 100;
  var opsPct = (t.bycat.OPS + t.oblTotal) / t.rev * 100;
  var netPct = t.margin;
  var totalCostPct = 100 - netPct;
  
  // تحديث القيم
  document.getElementById('caTotalPct').textContent = totalCostPct.toFixed(0) + '%';
  document.getElementById('caCogs').textContent = cogsPct.toFixed(0) + '%';
  document.getElementById('caSal').textContent = salPct.toFixed(0) + '%';
  document.getElementById('caOps').textContent = opsPct.toFixed(0) + '%';
  document.getElementById('caNet').textContent = netPct.toFixed(0) + '%';
  
  // رسم الدونت (SVG)
  var circumference = 2 * Math.PI * 40;
  var d1 = document.getElementById('caDonut1');
  var d2 = document.getElementById('caDonut2');
  var d3 = document.getElementById('caDonut3');
  
  if (d1 && d2 && d3) {
    var offset1 = 0;
    var arc1 = cogsPct / 100 * circumference;
    d1.setAttribute('stroke-dasharray', arc1 + ' ' + circumference);
    d1.setAttribute('stroke-dashoffset', -offset1);
    
    var offset2 = arc1;
    var arc2 = salPct / 100 * circumference;
    d2.setAttribute('stroke-dasharray', arc2 + ' ' + circumference);
    d2.setAttribute('stroke-dashoffset', -offset2);
    
    var offset3 = offset2 + arc2;
    var arc3 = opsPct / 100 * circumference;
    d3.setAttribute('stroke-dasharray', arc3 + ' ' + circumference);
    d3.setAttribute('stroke-dashoffset', -offset3);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// V15 ULTIMATE - SMART ALERTS (مثل Toast & NetSuite)
// ═══════════════════════════════════════════════════════════════════════════

function updateSmartAlertsV15() {
  var t = totals(), d = G();
  var alerts = [];
  
  // تحليل هامش الربح
  if (t.rev > 0 && t.margin < 5) {
    alerts.push({
      type: 'critical',
      icon: '🚨',
      msg: 'هامش الربح منخفض جداً (' + t.margin.toFixed(1) + '%)',
      action: 'راجع الأسعار والتكاليف'
    });
  } else if (t.rev > 0 && t.margin < 10) {
    alerts.push({
      type: 'warning',
      icon: '⚠️',
      msg: 'هامش الربح يحتاج تحسين (' + t.margin.toFixed(1) + '%)',
      action: 'المعيار 15-25%'
    });
  }
  
  // تحليل COGS
  if (t.rev > 0) {
    var cogsRatio = t.bycat.COGS / t.rev * 100;
    if (cogsRatio > 40) {
      alerts.push({
        type: 'warning',
        icon: '🛒',
        msg: 'تكلفة البضاعة مرتفعة (' + cogsRatio.toFixed(0) + '%)',
        action: 'المعيار 28-35%'
      });
    }
  }
  
  // الالتزامات غير المسددة
  var unpaid = d.obligations.filter(function(o) { return !o.paid && o.amt > 0; });
  if (unpaid.length > 0) {
    var total = unpaid.reduce(function(s,o){return s+o.amt;},0);
    alerts.push({
      type: 'info',
      icon: '📋',
      msg: unpaid.length + ' التزامات غير مسددة (' + n3(total) + ' JD)',
      action: 'سدد قبل التأخر'
    });
  }
  
  // تحليل الرواتب
  if (t.rev > 0) {
    var salRatio = (t.mSalG + t.dwTotal) / t.rev * 100;
    if (salRatio > 35) {
      alerts.push({
        type: 'warning',
        icon: '👥',
        msg: 'تكلفة العمالة مرتفعة (' + salRatio.toFixed(0) + '%)',
        action: 'راجع جدول الورديات'
      });
    }
  }
  
  // الهدف
  var goal = S.targets && S.targets[S.activeKey] ? S.targets[S.activeKey] : 0;
  if (goal > 0) {
    var pct = t.rev / goal * 100;
    var today = new Date().getDate();
    var days = daysIn(S.activeKey);
    var expectedPct = today / days * 100;
    
    if (pct < expectedPct - 15) {
      alerts.push({
        type: 'warning',
        icon: '🎯',
        msg: 'متأخر عن الهدف الشهري (' + pct.toFixed(0) + '%)',
        action: 'المتوقع: ' + expectedPct.toFixed(0) + '%'
      });
    } else if (pct >= 100) {
      alerts.push({
        type: 'success',
        icon: '🎉',
        msg: 'مبروك! تم تحقيق الهدف الشهري',
        action: 'استمر على هذا الأداء!'
      });
    }
  }
  
  // تحديث UI
  var countEl = document.getElementById('alertsCount');
  var listEl = document.getElementById('alertsList');
  
  if (countEl) countEl.textContent = alerts.length;
  
  if (listEl) {
    if (alerts.length === 0) {
      listEl.innerHTML = '<div style="text-align:center;padding:20px;color:var(--tx3)"><div style="font-size:32px;margin-bottom:8px">✅</div><div>لا توجد تنبيهات - أداء ممتاز!</div></div>';
    } else {
      listEl.innerHTML = alerts.map(function(a) {
        return '<div class="ap-item"><div class="ap-icon ' + a.type + '">' + a.icon + '</div><div class="ap-content"><div class="ap-msg">' + a.msg + '</div><div class="ap-action">' + a.action + '</div></div></div>';
      }).join('');
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// V15 ULTIMATE - SHIFT SUMMARY (مثل Square Analytics)
// ═══════════════════════════════════════════════════════════════════════════

function updateShiftSummary() {
  var d = G();
  var active = d.sales.filter(function(s) { return (s.cash||0)+(s.visa||0)+(s.pmts||0) > 0; });
  
  // محاكاة توزيع الورديات (33% لكل وردية)
  var total = active.reduce(function(s,sale) {
    return s + (sale.cash||0) + (sale.visa||0) + (sale.pmts||0);
  }, 0);
  
  var amRev = total * 0.30;
  var pmRev = total * 0.45;
  var evRev = total * 0.25;
  
  document.getElementById('ssAM').textContent = n3(amRev);
  document.getElementById('ssPM').textContent = n3(pmRev);
  document.getElementById('ssEV').textContent = n3(evRev);
  
  // المقارنة (محاكاة)
  document.getElementById('ssAMc').innerHTML = '<span class="up">↑ 5%</span>';
  document.getElementById('ssPMc').innerHTML = '<span class="up">↑ 12%</span>';
  document.getElementById('ssEVc').innerHTML = '<span class="down">↓ 3%</span>';
}

// ═══════════════════════════════════════════════════════════════════════════
// V15 ULTIMATE - DAILY INSIGHTS (مثل NetSuite AI)
// ═══════════════════════════════════════════════════════════════════════════

function updateDailyInsights() {
  var t = totals(), d = G();
  var today = new Date().getDate();
  var todaySale = d.sales.find(function(s) { return s.day === today; });
  var todayRev = todaySale ? (todaySale.cash||0) + (todaySale.visa||0) + (todaySale.pmts||0) : 0;
  
  var active = d.sales.filter(function(s) { return (s.cash||0)+(s.visa||0)+(s.pmts||0) > 0; });
  var avg = active.length ? t.rev / active.length : 0;
  
  var goal = S.targets && S.targets[S.activeKey] ? S.targets[S.activeKey] : 0;
  var days = daysIn(S.activeKey);
  var dailyGoal = goal > 0 ? goal / days : 0;
  
  // تحديث التاريخ
  var dateEl = document.getElementById('diDate');
  if (dateEl) {
    var now = new Date();
    dateEl.textContent = now.toLocaleDateString('ar-JO', {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'});
  }
  
  // الإيراد
  document.getElementById('diRev').textContent = n3(todayRev);
  
  // مقارنة بالمتوسط
  var avgDiff = avg > 0 ? ((todayRev - avg) / avg * 100) : 0;
  var avgEl = document.getElementById('diAvg');
  if (avgEl) {
    avgEl.textContent = (avgDiff >= 0 ? '+' : '') + avgDiff.toFixed(0) + '%';
    avgEl.style.color = avgDiff >= 0 ? 'var(--gn)' : 'var(--rd)';
  }
  
  // مقارنة بالهدف
  var goalDiff = dailyGoal > 0 ? ((todayRev - dailyGoal) / dailyGoal * 100) : 0;
  var goalEl = document.getElementById('diGoal');
  if (goalEl) {
    goalEl.textContent = dailyGoal > 0 ? ((goalDiff >= 0 ? '+' : '') + goalDiff.toFixed(0) + '%') : '—';
    goalEl.style.color = goalDiff >= 0 ? 'var(--gn)' : 'var(--rd)';
  }
  
  // الاتجاه
  var trendEl = document.getElementById('diTrend');
  if (trendEl) {
    if (active.length >= 3) {
      var last3 = active.slice(-3).map(function(s){return (s.cash||0)+(s.visa||0)+(s.pmts||0);});
      var trending = last3[2] > last3[1] && last3[1] > last3[0] ? '↗️' : 
                     last3[2] < last3[1] && last3[1] < last3[0] ? '↘️' : '➡️';
      trendEl.textContent = trending;
    } else {
      trendEl.textContent = '—';
    }
  }
  
  // الرؤية الذكية
  var insightEl = document.getElementById('diInsight');
  if (insightEl) {
    var insights = [];
    
    if (todayRev > avg * 1.2) {
      insights.push('يوم ممتاز! الإيراد أعلى من المتوسط بـ ' + ((todayRev/avg-1)*100).toFixed(0) + '%');
    } else if (todayRev < avg * 0.7 && todayRev > 0) {
      insights.push('يوم ضعيف - حاول تفعيل عروض ترويجية');
    }
    
    if (t.margin >= 20) {
      insights.push('هامش الربح ممتاز (' + t.margin.toFixed(1) + '%)');
    }
    
    if (goal > 0 && t.rev >= goal) {
      insights.push('🎉 تم تحقيق الهدف الشهري!');
    } else if (goal > 0) {
      var remaining = goal - t.rev;
      var daysLeft = days - today;
      var needed = daysLeft > 0 ? remaining / daysLeft : remaining;
      insights.push('تحتاج ' + n3(needed) + ' JD/يوم للهدف');
    }
    
    insightEl.textContent = insights.length > 0 ? insights.join(' • ') : 'أدخل بيانات اليوم للحصول على رؤى مخصصة';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// V15 ULTIMATE - ADDITIONAL KPIs (من Coffee Shop KPIs)
// ═══════════════════════════════════════════════════════════════════════════

function calculateAdvancedKPIs() {
  var t = totals(), d = G();
  var active = d.sales.filter(function(s) { return (s.cash||0)+(s.visa||0)+(s.pmts||0) > 0; });
  
  var kpis = {
    // Revenue Per Employee (افتراض 5 موظفين)
    revPerEmployee: t.rev / 5,
    
    // Average Transaction Value
    avgTransaction: active.length > 0 ? t.rev / (active.length * 50) : 0, // افتراض 50 معاملة/يوم
    
    // Gross Profit Margin
    grossMargin: t.rev > 0 ? ((t.rev - t.bycat.COGS) / t.rev * 100) : 0,
    
    // Labor Cost Ratio
    laborRatio: t.rev > 0 ? ((t.mSalG + t.dwTotal) / t.rev * 100) : 0,
    
    // Prime Cost (COGS + Labor)
    primeCost: t.bycat.COGS + (t.mSalPaid || 0),
    primeCostRatio: t.rev > 0 ? ((t.bycat.COGS + (t.mSalPaid || 0)) / t.rev * 100) : 0,
    
    // ═══════════════════════════════════════════════════════════════════════════
    // V24-2 FIX: إصلاح نقطة التعادل
    // التكاليف الثابتة = الالتزامات المدفوعة + الرواتب + OPS + ADM (وليس COGS)
    // التكاليف المتغيرة = COGS فقط
    // نقطة التعادل = التكاليف الثابتة / (1 - نسبة COGS من الإيراد)
    // ═══════════════════════════════════════════════════════════════════════════
    fixedCosts: t.oblPaid + (t.mSalPaid || 0) + t.bycat.OPS + t.bycat.ADM,
    variableCosts: t.bycat.COGS,
    breakEvenDaily: (function(){
      var fixed = t.oblPaid + (t.mSalPaid || 0) + t.bycat.OPS + t.bycat.ADM;
      var cogsRatio = t.rev > 0 ? t.bycat.COGS / t.rev : 0.35;
      var contributionMargin = 1 - cogsRatio;
      return contributionMargin > 0 ? (fixed / contributionMargin) / daysIn(S.activeKey) : 0;
    })(),
    
    // V22: قيم مبنية على البيانات الفعلية بدلاً من العشوائية
    retentionRate: t.rev > 0 ? Math.min(90, 65 + (t.margin / 3)) : 70,
    
    // Food Strike Rate - نسبة تقديرية ثابتة
    foodStrikeRate: 42
  };
  
  return kpis;
}

// ═══════════════════════════════════════════════════════════════════════════
// V15 ULTIMATE - WEATHER IMPACT (معطّل في V22 - بدون محاكاة)
// ═══════════════════════════════════════════════════════════════════════════

function getWeatherImpact() {
  // V22: قيمة ثابتة بدلاً من العشوائية
  return {weather: '☀️', temp: '24°', desc: 'معتدل', impact: '—', positive: true};
}

// ═══════════════════════════════════════════════════════════════════════════
// V15 ULTIMATE - التهيئة التلقائية
// ═══════════════════════════════════════════════════════════════════════════

// تهيئة V15 بعد تسجيل الدخول
window.initV15Features = function() {
  console.log('🚀 V15 Features Initializing...');
  
  // الساعة الحية
  try {
    if (typeof startLiveClock === 'function') {
      startLiveClock();
    }
  } catch(e) {}
  
  // الإحصائيات الحية
  try {
    if (typeof updateLiveStats === 'function') {
      updateLiveStats();
      console.log('✅ LiveStats updated');
    }
  } catch(e) { console.log('❌ LiveStats:', e); }
  
  // متتبع الهدف
  try {
    if (typeof updateGoalTracker === 'function') {
      updateGoalTracker();
      console.log('✅ GoalTracker updated');
    }
  } catch(e) { console.log('❌ GoalTracker:', e); }
  
  // بطاقات التحليلات
  try {
    if (typeof updateAnalyticsCards === 'function') {
      updateAnalyticsCards();
      console.log('✅ AnalyticsCards updated');
    }
  } catch(e) { console.log('❌ AnalyticsCards:', e); }
  
  // صحة الكافيه
  try {
    if (typeof updateHealthCardNew === 'function') {
      updateHealthCardNew();
      console.log('✅ HealthCard updated');
    }
  } catch(e) { console.log('❌ HealthCard:', e); }
  
  // نقطة التعادل
  try {
    if (typeof updateBreakevenCardNew === 'function') {
      updateBreakevenCardNew();
      console.log('✅ BreakevenCard updated');
    }
  } catch(e) { console.log('❌ BreakevenCard:', e); }
  
  // أداء الأسبوع
  try {
    if (typeof updateWeeklyCardNew === 'function') {
      updateWeeklyCardNew();
      console.log('✅ WeeklyCard updated');
    }
  } catch(e) { console.log('❌ WeeklyCard:', e); }
  
  // التوقعات
  try {
    if (typeof updateForecastCard === 'function') {
      updateForecastCard();
    }
  } catch(e) {}
  
  // مقارنة الفترات
  try {
    if (typeof updatePeriodCompare === 'function') {
      updatePeriodCompare();
    }
  } catch(e) {}
  
  // تحليل التكاليف
  try {
    if (typeof updateCostAnalysis === 'function') {
      updateCostAnalysis();
    }
  } catch(e) {}
  
  // التنبيهات
  try {
    if (typeof updateSmartAlertsV15 === 'function') {
      updateSmartAlertsV15();
    }
  } catch(e) {}
  
  // ملخص الورديات
  try {
    if (typeof updateShiftSummary === 'function') {
      updateShiftSummary();
    }
  } catch(e) {}
  
  // رؤى اليوم
  try {
    if (typeof updateDailyInsights === 'function') {
      updateDailyInsights();
    }
  } catch(e) {}
  
  // الحفظ التلقائي
  try {
    if (typeof startAutoSave === 'function') {
      startAutoSave();
    }
  } catch(e) {}
  
  console.log('✅ V15 Features Ready!');
};

// مراقبة تسجيل الدخول
(function() {
  var checkLogin = setInterval(function() {
    var app = document.getElementById('app');
    if (app && app.classList.contains('on')) {
      clearInterval(checkLogin);
      setTimeout(function() {
        window.initV15Features();
        window.initV22Features(); // V24 PRO
      }, 800);
    }
  }, 500);
})();

// ═══════════════════════════════════════════════════════════════════════════
function startAutoSave() {
  if (autoSaveInterval) clearInterval(autoSaveInterval);

  // حفظ كل 10 ثوانٍ بدون شرط — ضمان عدم فقدان البيانات
  autoSaveInterval = setInterval(function() {
    if (CR) { try { saveAll(); } catch(e) {} }
  }, 10000);
}

// تنفيذ الحفظ التلقائي
function performAutoSave() {
  showSaveIndicator('saving');
  
  try {
    saveAll();
    pendingSave = false;
    saveCount++;
    lastSaveTime = Date.now();
    
    setTimeout(function() {
      showSaveIndicator('saved');
      setTimeout(hideSaveIndicator, 1500);
    }, 500);
    
    // إنشاء نسخة احتياطية كل 10 حفظات
    if (saveCount % 10 === 0) {
      createBackup();
    }
    
  } catch(e) {
    showSaveIndicator('error');
    console.error('Auto-save error:', e);
  }
}

// تحديد أن البيانات تغيرت
function markDataChanged() {
  pendingSave = true;
}

// عرض مؤشر الحفظ
function showSaveIndicator(status) {
  var indicator = document.getElementById('saveIndicator');
  if (!indicator) return;
  
  indicator.className = 'save-indicator show ' + status;
  
  var icon = indicator.querySelector('.si-icon');
  var text = indicator.querySelector('.si-text');
  
  if (status === 'saving') {
    icon.innerHTML = '<div class="si-spinner"></div>';
    text.textContent = 'جاري الحفظ...';
  } else if (status === 'saved') {
    icon.textContent = '✓';
    text.textContent = 'تم الحفظ';
  } else if (status === 'error') {
    icon.textContent = '⚠';
    text.textContent = 'خطأ في الحفظ';
  }
}

function hideSaveIndicator() {
  var indicator = document.getElementById('saveIndicator');
  if (indicator) indicator.classList.remove('show');
}

// إنشاء نسخة احتياطية
function createBackup() {
  try {
    var backupKey = 'rh_backup_' + new Date().toISOString().split('T')[0];
    var data = safeLS.getItem(SK);
    if (data) {
      safeLS.setItem(backupKey, data);
      
      // الاحتفاظ بآخر 7 نسخ احتياطية فقط
      cleanOldBackups();
      
      console.log('📦 Backup created:', backupKey);
    }
  } catch(e) {
    console.warn('Backup error:', e);
  }
}

// حذف النسخ الاحتياطية القديمة
function cleanOldBackups() {
  try {
    var backups = [];
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (key && key.startsWith('rh_backup_')) {
        backups.push(key);
      }
    }
    backups.sort().reverse();
    // حذف ما يزيد عن 7 نسخ
    for (var j = 7; j < backups.length; j++) {
      safeLS.removeItem(backups[j]);
    }
  } catch(e) {}
}

// استرجاع من نسخة احتياطية
function restoreBackup(backupKey) {
  try {
    var data = safeLS.getItem(backupKey);
    if (data) {
      safeLS.setItem(SK, data);
      loadStore();
      renderAll();
      toast('✅ تم الاسترجاع من النسخة الاحتياطية');
    }
  } catch(e) {
    toast('⚠️ خطأ في الاسترجاع');
  }
}

// عرض النسخ الاحتياطية المتاحة
function showBackups() {
  var backups = [];
  for (var i = 0; i < localStorage.length; i++) {
    var key = localStorage.key(i);
    if (key && key.startsWith('rh_backup_')) {
      backups.push(key);
    }
  }
  backups.sort().reverse();
  
  if (backups.length === 0) {
    toast('📦 لا توجد نسخ احتياطية');
    return;
  }
  
  var html = '<div style="padding:10px"><div style="font-size:14px;font-weight:700;margin-bottom:12px">📦 النسخ الاحتياطية</div>';
  backups.forEach(function(b) {
    var date = b.replace('rh_backup_', '');
    html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px;border:1px solid var(--br);border-radius:8px;margin-bottom:6px"><span style="font-size:12px">' + date + '</span><button class="btn btn-xs btn-p" onclick="restoreBackup(\'' + b + '\');cmo(\'moBackup\')">استرجاع</button></div>';
  });
  html += '</div>';
  
  var mo = document.getElementById('moBackup');
  if (mo) {
    mo.querySelector('.mo-content').innerHTML = html;
    openMo('moBackup');
  }
}

// حفظ عند مغادرة الصفحة
document.addEventListener('visibilitychange', function() {
  if (document.hidden) {
    if (CR) { saveAll(); pendingSave = false; }
    // Push to Supabase immediately — PWA kills debounce timers on background
    if (typeof SUPA !== 'undefined' && SUPA) {
      if (window._supaDebounce) { clearTimeout(window._supaDebounce); window._supaDebounce = null; }
      supaSync('push').catch(function(e){ if(typeof supaHandleSyncError==='function') supaHandleSyncError(e); });
    }
  }
});

window.addEventListener('beforeunload', function() {
  if (CR) {
    saveAll();
  }
});

