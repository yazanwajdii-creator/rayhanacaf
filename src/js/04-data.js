/* TOTALS ENGINE */
/* ═══════════════════════════════════════════════════════════════════════════
   V24-2 FIX: إصلاحات محاسبية حرجة
   
   1. المدفوعات اليومية (pmts):
      - خُصمت من الكاش قبل التسليم للمدير
      - لا تُضاف للمصروفات مرة أخرى
   
   2. الالتزامات المدفوعة فقط (oblPaid):
      - فقط الالتزامات المدفوعة تُحسب في المصاريف
      - الالتزامات غير المدفوعة لا تُسبب خسارة وهمية
   
   المعادلة الصحيحة:
   - صافي البيع = نقدي + فيزا
   - إجمالي الإيراد = نقدي + فيزا + مدفوعات (للتوثيق)
   - المصروفات = COGS + التزامات مدفوعة + رواتب شهرية صافية
   - صافي الربح = صافي البيع - المصروفات
═══════════════════════════════════════════════════════════════════════════ */
function totals(){
  const d=G();let cash=0,visa=0,pmts=0;
  d.sales.forEach(s=>{cash+=s.cash||0;visa+=s.visa||0;pmts+=s.pmts||0;});
  
  // الإيراد الصافي للمدير = ما استلمه فعلاً (الكاش بعد دفع الأجور + فيزا)
  const netSales=cash+visa;
  // الإيراد الإجمالي = يشمل الأجور اليومية المدفوعة من الكاش (للتوثيق والمعرفة)
  const rev=cash+visa+pmts;
  
  const bycat={COGS:0,OPS:0,ADM:0,MKT:0,OTHER:0,total:0};
  d.purchases.forEach(p=>{const c=p.cat||"COGS";bycat[c]=(bycat[c]||0)+p.amt;bycat.total+=p.amt;});
  
  const oblTotal=d.obligations.reduce((s,o)=>s+(o.amt||0),0);
  const oblPaid=d.obligations.filter(o=>o.paid).reduce((s,o)=>s+(o.amt||0),0);
  
  // الرواتب الشهرية — المعادلة الصحيحة:
  // الصافي المستحق = الأساسي + البدلات - الاستقطاعات - السلف المستحقة
  let mSalG=0,mSalNet=0,mSalPaid=0,mSalAccrued=0;
  S.monthlyEmps.forEach(e=>{
    const s=d.mSal[e.id]||{};
    const gross=(s.base||0)+(s.allow||0);
    const adv=pendAdv(e.id); // السلف المستحقة على الموظف
    const net=Math.max(0, gross-(s.ded||0)-adv); // الصافي بعد كل الخصومات
    mSalG+=gross;
    mSalNet+=net;
    // فقط الرواتب المُسجَّلة كمدفوعة تدخل في المصاريف الفعلية
    if(s.paid) mSalPaid+=net;
    else mSalAccrued+=net;
  });
  
  // الأجور اليومية من جدول الحضور (للمرجع فقط)
  let dwTotal=0;
  S.dailyEmps.forEach(e=>{const w=d.dWages[e.id]||{};dwTotal+=(w.rate||0)*(w.att||[]).length;});
  
  // ═══ V24-2 FIX: استخدام pmts كمصدر للأجور اليومية ═══
  // المدفوعات اليومية (pmts) هي ما دُفع فعلاً للموظفين من الكاش
  // لذا نستخدمها بدلاً من dwTotal لتجنب الحساب المزدوج
  const dailyWagesPaid = pmts; // المدفوعات الفعلية من الكاش
  
  // الربح الإجمالي = إيراد المدير الصافي - تكلفة البضاعة
  const grossP=netSales-bycat.COGS;

  // إجمالي المصروفات الفعلية على المدير: مشتريات + التزامات مدفوعة + رواتب شهرية مدفوعة
  const totalExp=bycat.total+oblPaid+mSalPaid;

  // صافي الربح = إيراد المدير الصافي - مصاريفه الفعلية
  const profit=netSales-totalExp;
  const margin=netSales>0?profit/netSales*100:0;

  let advP=0;d.advances.filter(a=>a.status==="مستحقة"||a.status==="مسددة جزئياً").forEach(a=>advP+=a.amt||0);

  // النسب المئوية — على أساس إيراد المدير الصافي (netSales)
  const _active=d.sales.filter(s=>(s.cash||0)+(s.visa||0)+(s.pmts||0)>0);
  const avgDaily=_active.length?rev/_active.length:0;
  const daysActive=_active.length;
  const cogsRatio=netSales>0?bycat.COGS/netSales*100:0;
  const salaryRatio=netSales>0?mSalPaid/netSales*100:0;
  const oblPaidRatio=netSales>0?oblPaid/netSales*100:0;
  const expRatio=netSales>0?totalExp/netSales*100:0;
  
  // ══ حسابات المديرين التفصيلية ══
  // ما استلمه كل مدير (نقدي)
  let yzR=0,abdR=0;
  d.sales.forEach(s=>{
    const c=s.cash||0;
    if(s.receivedBy==="يزن")yzR+=c;
    else if(s.receivedBy==="عبدالرحمن")abdR+=c;
  });

  // مشتريات كل مدير
  let yzP=0,abdP=0;
  d.purchases.forEach(p=>{
    if(p.buyer==="يزن")yzP+=p.amt;
    else if(p.buyer==="عبدالرحمن")abdP+=p.amt;
  });

  // التزامات مدفوعة بحسب من دفع
  let yzO=0,abdO=0;
  d.obligations.filter(o=>o.paid).forEach(o=>{
    if(o.paidBy==="يزن")yzO+=o.amt||0;
    else if(o.paidBy==="عبدالرحمن")abdO+=o.amt||0;
  });

  // رواتب بحسب مصدر الدفع
  let yzS=0,abdS=0,visaSal=0;
  S.monthlyEmps.forEach(e=>{
    const s=d.mSal[e.id]||{};
    if(!s.paid)return;
    const gross=(s.base||0)+(s.allow||0);
    const adv=pendAdv(e.id);
    const net=Math.max(0,gross-(s.ded||0)-adv);
    if(s.paidBy==="يزن")yzS+=net;
    else if(s.paidBy==="عبدالرحمن")abdS+=net;
    else if(s.paidBy==="فيزا")visaSal+=net;
  });

  // رصيد الفيزا = مبيعات الفيزا − الرواتب المدفوعة من الفيزا
  const visaBalance=visa-visaSal;

  // صافي كل مدير
  const yznNet=yzR-yzP-yzO-yzS;
  const abdNet=abdR-abdP-abdO-abdS;

  // الربح النهائي الموحّد
  const finalProfit=yznNet+abdNet+visaBalance;

  return{
    cash,visa,pmts,netSales,rev,bycat,
    oblTotal,oblPaid,
    mSalG,mSalNet,mSalPaid,mSalAccrued,dwTotal,dailyWagesPaid,
    grossP,totalExp,profit,margin,advP,
    avgDaily,daysActive,
    cogsRatio,salaryRatio,oblPaidRatio,expRatio,
    obls:d.obligations,
    // Manager breakdown
    yzR,abdR,yzP,abdP,yzO,abdO,yzS,abdS,
    yznNet,abdNet,visaSal,visaBalance,finalProfit
  };
}

/* RENDER ALL */
function renderAll(){if(!CR||!S.months)return;calcRevTots();renderPurch();renderSuppList();renderSuppRpt();renderCatSum();renderObligList();renderAdv();renderAdvLedger();loadCashFields();calcCash();updateDash();updateRpt();updLkChips();}
function loadCashFields(){const cf=G().cashflow||{};const o=$("cfOpen"),a=$("cfAct");if(o)o.value=cf.opening||0;if(a)a.value=cf.actual||0;}
function buildSelects(){buildPurchSupp();buildAdvEmpSel();}

/* ═══════════════════════════════════════════════════════════════════════════ */
/* SMART AUTO-SAVE SYSTEM V14 PRO                                              */
/* ═══════════════════════════════════════════════════════════════════════════ */

let autoSaveInterval = null;
let pendingSave = false;
let lastSaveTime = 0;
let saveCount = 0;

// بدء نظام الحفظ التلقائي
// V24 PRO - ADVANCED FEATURES ENGINE
// نظام متكامل للتحليل المالي الذكي
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
// 1. CALCULATION ENGINE - مصدر واحد للحقيقة
// ═══════════════════════════════════════════════════════════════════════════

let _calcCache = null;
let _calcCacheTime = 0;

function getCalc() {
  // Cache لمدة ثانية واحدة
  if (_calcCache && (Date.now() - _calcCacheTime) < 1000) return _calcCache;
  
  try {
    var t = totals();
    var d = G();
    var today = new Date().getDate();
    var daysInMonth = daysIn(S.activeKey);
    
    // حساب الأيام النشطة
    var activeDays = d.sales.filter(function(s) {
      return (s.cash||0) + (s.visa||0) + (s.pmts||0) > 0;
    }).length;
    
    // الشهر السابق
    var prevKey = getPrevMonthKey();
    var prevData = prevKey && S.months[prevKey] ? getPrevMonthTotals() : null;
    
    var calc = {
      // === الإيرادات ===
      revenue: t.rev || 0,
      cash: t.cash || 0,
      visa: t.visa || 0,
      netSales: t.netSales || 0,
      avgDaily: activeDays > 0 ? (t.rev || 0) / activeDays : 0,
      activeDays: activeDays,
      
      // === المصروفات (V24-2 FIX) ===
      expenses: t.totalExp || 0,
      cogs: (t.bycat && t.bycat.COGS) || 0,
      opsExp: (t.bycat && t.bycat.OPS) || 0,
      salaries: (t.mSalPaid || 0),         // فقط الرواتب المدفوعة
      monthlySalaries: t.mSalPaid || 0,
      salariesAccrued: (t.mSalAccrued || 0), // رواتب مستحقة لم تُدفع
      dailyWages: t.pmts || 0, // V24-2: استخدام pmts بدلاً من dwTotal
      obligations: t.oblTotal || 0,
      oblPaid: t.oblPaid || 0,
      oblUnpaid: (t.oblTotal || 0) - (t.oblPaid || 0),
      purchases: t.bycat || {COGS:0,OPS:0,ADM:0,MKT:0,OTHER:0,total:0},
      
      // === الربحية ===
      profit: t.profit || 0,
      margin: t.margin || 0,
      grossProfit: t.grossP || 0,
      grossMargin: (t.rev || 0) > 0 ? ((t.grossP || 0) / t.rev * 100) : 0,
      
      // === النسب المئوية ===
      expenseRatio: (t.rev || 0) > 0 ? ((t.totalExp || 0) / t.rev * 100) : 0,
      cogsRatio: t.cogsRatio || ((t.rev || 0) > 0 ? (((t.bycat && t.bycat.COGS) || 0) / t.rev * 100) : 0),
      salaryRatio: (t.rev || 0) > 0 ? ((t.mSalPaid || 0) / t.rev * 100) : 0,
      oblRatio: (t.rev || 0) > 0 ? ((t.oblTotal || 0) / t.rev * 100) : 0,
      
      // === المقارنة مع الشهر السابق ===
      prevRevenue: prevData ? (prevData.rev || 0) : 0,
      prevProfit: prevData ? (prevData.profit || 0) : 0,
      revenueChange: prevData && prevData.rev > 0 ? (((t.rev || 0) - prevData.rev) / prevData.rev * 100) : 0,
      profitChange: prevData && prevData.profit !== 0 ? (((t.profit || 0) - prevData.profit) / Math.abs(prevData.profit) * 100) : 0,
      
      // === التوقعات ===
      remainingDays: daysInMonth - today,
      projectedRevenue: activeDays >= 3 ? ((t.rev || 0) / activeDays) * daysInMonth : 0,
      projectedExpenses: activeDays > 0 ? ((t.totalExp || 0) / activeDays) * daysInMonth : 0,
      projectedProfit: 0,
      
      // === مؤشرات الصحة ===
      isProfit: (t.profit || 0) >= 0,
      isHealthy: (t.margin || 0) >= 15 && ((t.rev || 0) > 0 ? ((t.totalExp || 0) / t.rev * 100) : 100) <= 70,
      healthScore: 0,
      
      // === معلومات الفترة ===
      today: today,
      daysInMonth: daysInMonth,
      monthKey: S.activeKey
    };
    
    // حساب الربح المتوقع
    calc.projectedProfit = calc.projectedRevenue - calc.projectedExpenses;
    
    // مؤشر الصحة المالية (0-100) — معادلة دقيقة لمقهى
    // المعايير: هامش ربح 15-25% صحي، COGS 28-35%، رواتب 25-30%
    var score = 50; // نقطة البداية
    
    // هامش الربح (30 نقطة)
    if (calc.margin >= 25) score += 30;
    else if (calc.margin >= 20) score += 22;
    else if (calc.margin >= 15) score += 15;
    else if (calc.margin >= 10) score += 8;
    else if (calc.margin >= 5) score += 2;
    else if (calc.margin < 0) score -= 25;
    
    // نسبة COGS (20 نقطة)
    if (calc.cogsRatio <= 28) score += 20;
    else if (calc.cogsRatio <= 35) score += 15;
    else if (calc.cogsRatio <= 40) score += 8;
    else if (calc.cogsRatio <= 45) score += 2;
    else score -= 10;
    
    // نسبة الرواتب (15 نقطة)
    if (calc.salaryRatio <= 25) score += 15;
    else if (calc.salaryRatio <= 30) score += 10;
    else if (calc.salaryRatio <= 35) score += 5;
    else score -= 5;
    
    // نمو الإيراد (10 نقطة)
    if (calc.revenueChange > 15) score += 10;
    else if (calc.revenueChange > 5) score += 6;
    else if (calc.revenueChange > 0) score += 3;
    else if (calc.revenueChange < -15) score -= 10;
    else if (calc.revenueChange < -5) score -= 5;
    
    // التزامات مستحقة (خصم)
    if (calc.oblUnpaid > 0) score -= Math.min(15, Math.round(calc.oblUnpaid / 100));
    
    // لا بيانات كافية — عقوبة
    if (calc.activeDays < 5) score -= 15;
    
    calc.healthScore = Math.max(0, Math.min(100, Math.round(score)));
    
    _calcCache = calc;
    _calcCacheTime = Date.now();
    
    return calc;
  } catch(e) {
    console.error('getCalc error:', e);
    return {
      revenue: 0, cash: 0, visa: 0, netSales: 0, avgDaily: 0, activeDays: 0,
      expenses: 0, cogs: 0, opsExp: 0, salaries: 0, monthlySalaries: 0, dailyWages: 0,
      obligations: 0, oblPaid: 0, oblUnpaid: 0, purchases: {COGS:0,OPS:0,ADM:0,MKT:0,OTHER:0,total:0},
      profit: 0, margin: 0, grossProfit: 0, grossMargin: 0,
      expenseRatio: 0, cogsRatio: 0, salaryRatio: 0, oblRatio: 0,
      prevRevenue: 0, prevProfit: 0, revenueChange: 0, profitChange: 0,
      remainingDays: 0, projectedRevenue: 0, projectedExpenses: 0, projectedProfit: 0,
      isProfit: true, isHealthy: false, healthScore: 50,
      today: new Date().getDate(), daysInMonth: 30, monthKey: S.activeKey
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. CASH FLOW FORECASTING - توقعات التدفقات النقدية
// ═══════════════════════════════════════════════════════════════════════════

function getCashFlowForecast() {
  var calc = getCalc();
  var months = [];
  var ym = S.activeKey.split('-');
  var year = parseInt(ym[0]);
  var month = parseInt(ym[1]);
  
  // الشهر الحالي
  months.push({
    key: S.activeKey,
    name: MNA[month - 1],
    revenue: calc.revenue,
    expenses: calc.expenses,
    profit: calc.profit,
    cashFlow: calc.profit,
    type: 'current'
  });
  
  // التوقعات لـ 3 أشهر قادمة
  var avgDailyRev = calc.avgDaily || 0;
  var avgDailyExp = calc.activeDays > 0 ? calc.expenses / calc.activeDays : 0;
  
  // معامل النمو/الانخفاض بناءً على الاتجاه
  var trend = calc.revenueChange / 100;
  trend = Math.max(-0.2, Math.min(0.2, trend / 10)); // تقييد التغيير بـ 20%
  
  for (var i = 1; i <= 3; i++) {
    var nextMonth = month + i;
    var nextYear = year;
    if (nextMonth > 12) {
      nextMonth -= 12;
      nextYear++;
    }
    
    var daysInNext = new Date(nextYear, nextMonth, 0).getDate();
    var projRev = avgDailyRev * daysInNext * (1 + trend * i);
    var projExp = avgDailyExp * daysInNext * 1.02; // زيادة طفيفة في المصاريف
    var projProfit = projRev - projExp;
    
    months.push({
      key: nextYear + '-' + String(nextMonth).padStart(2, '0'),
      name: MNA[nextMonth - 1],
      revenue: Math.round(projRev),
      expenses: Math.round(projExp),
      profit: Math.round(projProfit),
      cashFlow: Math.round(projProfit),
      type: 'projected'
    });
  }
  
  return {
    months: months,
    totalProjected: months.slice(1).reduce(function(s, m) { return s + m.profit; }, 0),
    avgMonthlyProfit: months.length > 1 ? months.slice(1).reduce(function(s, m) { return s + m.profit; }, 0) / 3 : 0,
    trend: trend > 0.05 ? 'up' : trend < -0.05 ? 'down' : 'stable'
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. DAY OF WEEK ANALYSIS - تحليل أيام الأسبوع
// ═══════════════════════════════════════════════════════════════════════════

function analyzeWeekdays() {
  var d = G();
  var dayStats = {
    0: { name: 'الأحد', total: 0, count: 0, avg: 0 },
    1: { name: 'الإثنين', total: 0, count: 0, avg: 0 },
    2: { name: 'الثلاثاء', total: 0, count: 0, avg: 0 },
    3: { name: 'الأربعاء', total: 0, count: 0, avg: 0 },
    4: { name: 'الخميس', total: 0, count: 0, avg: 0 },
    5: { name: 'الجمعة', total: 0, count: 0, avg: 0 },
    6: { name: 'السبت', total: 0, count: 0, avg: 0 }
  };
  
  var ym = S.activeKey.split('-');
  var year = parseInt(ym[0]);
  var month = parseInt(ym[1]);
  
  d.sales.forEach(function(s) {
    var revenue = (s.cash || 0) + (s.visa || 0) + (s.pmts || 0);
    if (revenue > 0) {
      var date = new Date(year, month - 1, s.day);
      var dayOfWeek = date.getDay();
      dayStats[dayOfWeek].total += revenue;
      dayStats[dayOfWeek].count++;
    }
  });
  
  // حساب المتوسطات
  var maxAvg = 0;
  var minAvg = Infinity;
  var bestDay = null;
  var worstDay = null;
  
  Object.keys(dayStats).forEach(function(key) {
    var stat = dayStats[key];
    if (stat.count > 0) {
      stat.avg = stat.total / stat.count;
      if (stat.avg > maxAvg) {
        maxAvg = stat.avg;
        bestDay = stat;
      }
      if (stat.avg < minAvg) {
        minAvg = stat.avg;
        worstDay = stat;
      }
    }
  });
  
  // الترتيب
  var sorted = Object.values(dayStats)
    .filter(function(s) { return s.count > 0; })
    .sort(function(a, b) { return b.avg - a.avg; });
  
  return {
    stats: dayStats,
    sorted: sorted,
    bestDay: bestDay,
    worstDay: worstDay,
    recommendations: generateDayRecommendations(bestDay, worstDay, dayStats)
  };
}

function generateDayRecommendations(best, worst, stats) {
  var recs = [];
  
  if (best && worst && best.avg > worst.avg * 1.5) {
    recs.push({
      icon: '📈',
      text: 'يوم ' + best.name + ' هو الأفضل بمتوسط ' + n3(best.avg) + ' JD',
      action: 'زِد العمالة والمخزون في هذا اليوم'
    });
  }
  
  if (worst && worst.avg < 50) {
    recs.push({
      icon: '📉',
      text: 'يوم ' + worst.name + ' ضعيف بمتوسط ' + n3(worst.avg) + ' JD',
      action: 'قدم عروض ترويجية أو قلل ساعات العمل'
    });
  }
  
  // تحليل الجمعة والسبت
  if (stats[5].avg > stats[0].avg * 1.3) {
    recs.push({
      icon: '🕌',
      text: 'الجمعة أفضل من الأحد بـ ' + n3(stats[5].avg - stats[0].avg) + ' JD',
      action: 'ركز الجهود يوم الجمعة'
    });
  }
  
  return recs;
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. ACTIONABLE INSIGHTS - توصيات قابلة للتنفيذ بأرقام محددة
// ═══════════════════════════════════════════════════════════════════════════

function getActionableInsights() {
  var calc = getCalc();
  var insights = [];
  
  // 1. تخفيض COGS
  if (calc.cogsRatio > 35 && calc.cogs > 0) {
    var saving5pct = calc.cogs * 0.05;
    insights.push({
      type: 'warning',
      icon: '🛒',
      title: 'خفض تكلفة البضاعة 5%',
      text: 'COGS حالياً ' + calc.cogsRatio.toFixed(0) + '% (المثالي 30-35%)',
      value: 'وفر ' + n3(saving5pct) + ' JD شهرياً',
      action: 'تفاوض مع الموردين أو ابحث عن بدائل'
    });
  }
  
  // 2. زيادة الأسعار
  if (calc.margin < 20 && calc.revenue > 0) {
    var priceIncrease = calc.revenue * 0.05;
    insights.push({
      type: 'info',
      icon: '💰',
      title: 'زيادة الأسعار 5%',
      text: 'هامش الربح ' + calc.margin.toFixed(0) + '% فقط',
      value: 'إضافة ' + n3(priceIncrease) + ' JD شهرياً',
      action: 'زيادة طفيفة لن يلاحظها معظم الزبائن'
    });
  }
  
  // 3. تقليل الرواتب
  if (calc.salaryRatio > 30 && calc.salaries > 0) {
    var salarySaving = calc.salaries * 0.1;
    insights.push({
      type: 'warning',
      icon: '👥',
      title: 'تحسين كفاءة العمالة',
      text: 'الرواتب تستهلك ' + calc.salaryRatio.toFixed(0) + '% من الإيراد',
      value: 'وفر ' + n3(salarySaving) + ' JD بتحسين الجدولة',
      action: 'راجع ورديات الموظفين وأوقات الذروة'
    });
  }
  
  // 4. سداد الالتزامات
  if (calc.oblUnpaid > 0) {
    insights.push({
      type: 'danger',
      icon: '📋',
      title: 'التزامات غير مسددة',
      text: calc.oblUnpaid.toFixed(0) + ' JD متأخرة',
      value: 'سدد قبل تراكم الغرامات',
      action: 'راجع صفحة الالتزامات'
    });
  }
  
  // 5. إيجابي - أداء ممتاز
  if (calc.margin >= 25 && calc.isHealthy) {
    insights.push({
      type: 'success',
      icon: '🌟',
      title: 'أداء ممتاز!',
      text: 'هامش ربح ' + calc.margin.toFixed(0) + '% • مصاريف ' + calc.expenseRatio.toFixed(0) + '%',
      value: 'استمر على هذا المستوى',
      action: 'فكر في التوسع أو إضافة منتجات جديدة'
    });
  }
  
  // 6. تقليل الهدر
  if (calc.cogs > 0) {
    var wasteReduction = calc.cogs * 0.03;
    insights.push({
      type: 'info',
      icon: '♻️',
      title: 'تقليل الهدر 3%',
      text: 'مراقبة المنتجات المنتهية والكميات',
      value: 'وفر ' + n3(wasteReduction) + ' JD شهرياً',
      action: 'راقب تواريخ الصلاحية واطلب كميات أقل'
    });
  }
  
  return insights;
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. PREDICTIVE ALERTS - تنبيهات تنبؤية متقدمة
// ═══════════════════════════════════════════════════════════════════════════

function getPredictiveAlerts() {
  var calc = getCalc();
  var dayAnalysis = analyzeWeekdays();
  var alerts = [];
  
  // 1. توقع انخفاض المبيعات
  if (calc.revenueChange < -10) {
    alerts.push({
      type: 'warning',
      icon: '📉',
      title: 'توقع انخفاض المبيعات',
      desc: 'انخفاض ' + Math.abs(calc.revenueChange).toFixed(0) + '% عن الشهر السابق',
      action: 'زِد العروض الترويجية'
    });
  }
  
  // 2. COGS مرتفع
  if (calc.cogsRatio > 40) {
    alerts.push({
      type: 'danger',
      icon: '🚨',
      title: 'COGS تتجاوز 40%',
      desc: 'تكلفة البضاعة ' + calc.cogsRatio.toFixed(0) + '% من الإيراد',
      action: 'تفاوض مع الموردين فوراً'
    });
  }
  
  // 3. توقع نهاية الشهر
  if (calc.projectedProfit < 0 && calc.remainingDays > 5) {
    var needed = Math.abs(calc.projectedProfit) / calc.remainingDays;
    alerts.push({
      type: 'danger',
      icon: '⚠️',
      title: 'خطر خسارة نهاية الشهر',
      desc: 'تحتاج زيادة ' + n3(needed) + ' JD يومياً للتعادل',
      action: 'زِد المبيعات أو قلل المصاريف'
    });
  }
  
  // 4. أفضل يوم قادم
  if (dayAnalysis.bestDay) {
    var today = new Date().getDay();
    var bestDayNum = Object.keys(dayAnalysis.stats).find(function(k) {
      return dayAnalysis.stats[k] === dayAnalysis.bestDay;
    });
    if (parseInt(bestDayNum) > today) {
      alerts.push({
        type: 'success',
        icon: '📈',
        title: dayAnalysis.bestDay.name + ' قادم',
        desc: 'متوسط المبيعات ' + n3(dayAnalysis.bestDay.avg) + ' JD',
        action: 'جهز مخزون إضافي'
      });
    }
  }
  
  // 5. هامش صحي
  if (calc.margin >= 20 && calc.expenseRatio <= 65) {
    alerts.push({
      type: 'success',
      icon: '✅',
      title: 'الوضع المالي صحي',
      desc: 'هامش ' + calc.margin.toFixed(0) + '% • مصاريف ' + calc.expenseRatio.toFixed(0) + '%',
      action: 'استمر على هذا الأداء'
    });
  }
  
  return alerts;
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. NATURAL LANGUAGE INPUT - إدخال البيانات بالكلام
// ═══════════════════════════════════════════════════════════════════════════

function processNaturalLanguageInput(text) {
  var result = { success: false, type: null, data: null, message: '' };
  var t = text.toLowerCase().trim();
  
  // أنماط المبيعات
  var salesPatterns = [
    /مبيعات?\s*(اليوم|يوم\s*(\d+))?\s*(\d+(?:\.\d+)?)/,
    /بعت\s*(\d+(?:\.\d+)?)/,
    /إيراد\s*(\d+(?:\.\d+)?)/,
    /(\d+(?:\.\d+)?)\s*دينار?\s*مبيعات/
  ];
  
  // أنماط المشتريات
  var purchasePatterns = [
    /مشتريات?\s*(\d+(?:\.\d+)?)\s*(من|عند)?\s*(.+)?/,
    /اشتريت?\s*(\d+(?:\.\d+)?)\s*(من|عند)?\s*(.+)?/,
    /(\d+(?:\.\d+)?)\s*دينار?\s*(من|شراء)\s*(.+)?/
  ];
  
  // أنماط السلف
  var advancePatterns = [
    /سلفة?\s*(\d+(?:\.\d+)?)\s*(لـ?|إلى)?\s*(.+)?/,
    /صرفت?\s*سلفة?\s*(\d+(?:\.\d+)?)\s*(لـ?|إلى)?\s*(.+)?/
  ];
  
  // محاولة مطابقة المبيعات
  for (var i = 0; i < salesPatterns.length; i++) {
    var match = t.match(salesPatterns[i]);
    if (match) {
      var amount = parseFloat(match[3] || match[1] || match[2]);
      if (amount > 0) {
        result.success = true;
        result.type = 'sale';
        result.data = { amount: amount, day: new Date().getDate() };
        result.message = '💵 تم تسجيل مبيعات ' + n3(amount) + ' JD';
        return result;
      }
    }
  }
  
  // محاولة مطابقة المشتريات
  for (var i = 0; i < purchasePatterns.length; i++) {
    var match = t.match(purchasePatterns[i]);
    if (match) {
      var amount = parseFloat(match[1]);
      var supplier = match[3] ? match[3].trim() : 'متفرقات';
      if (amount > 0) {
        result.success = true;
        result.type = 'purchase';
        result.data = { amount: amount, supplier: supplier };
        result.message = '🛒 تم تسجيل مشتريات ' + n3(amount) + ' JD من ' + supplier;
        return result;
      }
    }
  }
  
  // محاولة مطابقة السلف
  for (var i = 0; i < advancePatterns.length; i++) {
    var match = t.match(advancePatterns[i]);
    if (match) {
      var amount = parseFloat(match[1]);
      var employee = match[3] ? match[3].trim() : '';
      if (amount > 0) {
        result.success = true;
        result.type = 'advance';
        result.data = { amount: amount, employee: employee };
        result.message = '💵 تم تسجيل سلفة ' + n3(amount) + ' JD';
        return result;
      }
    }
  }
  
  result.message = 'لم أفهم. جرب: "مبيعات اليوم 150" أو "مشتريات 50 من السوق"';
  return result;
}

// تنفيذ الإدخال الطبيعي
function executeNLPInput(result) {
  if (!result.success) return false;
  
  var d = G();
  
  if (result.type === 'sale') {
    var dayIdx = result.data.day - 1;
    if (d.sales[dayIdx]) {
      d.sales[dayIdx].cash = (d.sales[dayIdx].cash || 0) + result.data.amount;
      saveAll();
      renderAll();
      return true;
    }
  }
  
  if (result.type === 'purchase') {
    d.purchases.push({
      id: 'p' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      sName: result.data.supplier,
      desc: 'إدخال صوتي',
      amt: result.data.amount,
      cat: 'COGS'
    });
    saveAll();
    renderAll();
    return true;
  }
  
  return false;
}

// ═══════════════════════════════════════════════════════════════════════════
// 8. SMART REPORT GENERATOR - مولد التقارير الذكية
// ═══════════════════════════════════════════════════════════════════════════

function generateSmartReport() {
  var calc = getCalc();
  var insights = getActionableInsights();
  var alerts = getPredictiveAlerts();
  var dayAnalysis = analyzeWeekdays();
  var forecast = getCashFlowForecast();
  
  var ym = S.activeKey.split('-');
  var monthName = MNA[parseInt(ym[1]) - 1] + ' ' + ym[0];
  
  var report = '═══════════════════════════════════════\n';
  report += '📊 تقرير ريحانة كافيه - ' + monthName + '\n';
  report += '═══════════════════════════════════════\n\n';
  
  // الملخص المالي
  report += '💰 الملخص المالي:\n';
  report += '• الإيراد: ' + n3(calc.revenue) + ' JD\n';
  report += '• المصروفات: ' + n3(calc.expenses) + ' JD (' + calc.expenseRatio.toFixed(0) + '%)\n';
  report += '• صافي الربح: ' + n3(calc.profit) + ' JD\n';
  report += '• هامش الربح: ' + calc.margin.toFixed(1) + '%\n';
  report += '• مؤشر الصحة: ' + calc.healthScore + '/100\n\n';
  
  // المقارنة
  if (calc.prevRevenue > 0) {
    report += '📈 مقارنة بالشهر السابق:\n';
    report += '• تغير الإيراد: ' + (calc.revenueChange >= 0 ? '+' : '') + calc.revenueChange.toFixed(0) + '%\n';
    report += '• تغير الربح: ' + (calc.profitChange >= 0 ? '+' : '') + calc.profitChange.toFixed(0) + '%\n\n';
  }
  
  // أفضل الأيام
  if (dayAnalysis.bestDay) {
    report += '📅 تحليل الأيام:\n';
    report += '• أفضل يوم: ' + dayAnalysis.bestDay.name + ' (' + n3(dayAnalysis.bestDay.avg) + ' JD)\n';
    if (dayAnalysis.worstDay) {
      report += '• أضعف يوم: ' + dayAnalysis.worstDay.name + ' (' + n3(dayAnalysis.worstDay.avg) + ' JD)\n';
    }
    report += '\n';
  }
  
  // التوقعات
  if (forecast.months.length > 1) {
    report += '🔮 التوقعات:\n';
    forecast.months.slice(1).forEach(function(m) {
      report += '• ' + m.name + ': ' + n3(m.profit) + ' JD ' + (m.profit >= 0 ? '✅' : '⚠️') + '\n';
    });
    report += '\n';
  }
  
  // التوصيات
  if (insights.length > 0) {
    report += '💡 توصيات:\n';
    insights.slice(0, 3).forEach(function(i) {
      report += '• ' + i.title + ': ' + i.value + '\n';
    });
  }
  
  report += '\n═══════════════════════════════════════\n';
  report += 'تم إنشاء التقرير: ' + new Date().toLocaleString('ar-JO') + '\n';
  
  return report;
}

// ═══════════════════════════════════════════════════════════════════════════
// 9. AI RESPONSE ENGINE V22 - محرك الذكاء الاصطناعي المحسّن
// ═══════════════════════════════════════════════════════════════════════════

function getV22AIResponse(question, ctx) {
  var calc = getCalc();
  var q = question.toLowerCase();
  
  // معالجة الإدخال الطبيعي أولاً
  var nlpResult = processNaturalLanguageInput(question);
  if (nlpResult.success) {
    executeNLPInput(nlpResult);
    return nlpResult.message + '\n\n📊 تم تحديث البيانات تلقائياً.';
  }
  
  // التقرير الشامل
  if (q.indexOf('تقرير') > -1 || q.indexOf('شامل') > -1 || q.indexOf('ملخص كامل') > -1) {
    return generateSmartReport();
  }
  
  // التدفق النقدي
  if (q.indexOf('تدفق') > -1 || q.indexOf('cash flow') > -1 || q.indexOf('توقع') > -1) {
    var forecast = getCashFlowForecast();
    var response = '💰 **توقعات التدفق النقدي:**\n\n';
    forecast.months.forEach(function(m) {
      var icon = m.type === 'current' ? '📍' : '🔮';
      var status = m.profit >= 0 ? '✅' : '⚠️';
      response += icon + ' **' + m.name + ':** ' + n3(m.profit) + ' JD ' + status + '\n';
    });
    response += '\n📊 إجمالي متوقع 3 أشهر: **' + n3(forecast.totalProjected) + ' JD**';
    return response;
  }
  
  // تحليل الأيام
  if (q.indexOf('يوم') > -1 || q.indexOf('أيام') > -1 || q.indexOf('ذروة') > -1) {
    var analysis = analyzeWeekdays();
    var response = '📅 **تحليل أيام الأسبوع:**\n\n';
    analysis.sorted.slice(0, 5).forEach(function(day, i) {
      var medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '•';
      response += medal + ' ' + day.name + ': **' + n3(day.avg) + ' JD**\n';
    });
    if (analysis.recommendations.length > 0) {
      response += '\n💡 **توصيات:**\n';
      analysis.recommendations.forEach(function(r) {
        response += r.icon + ' ' + r.text + '\n   → ' + r.action + '\n';
      });
    }
    return response;
  }
  
  // التوصيات
  if (q.indexOf('نصيحة') > -1 || q.indexOf('توصية') > -1 || q.indexOf('تحسين') > -1) {
    var insights = getActionableInsights();
    var response = '💡 **توصيات لتحسين الربحية:**\n\n';
    insights.forEach(function(i) {
      response += i.icon + ' **' + i.title + '**\n';
      response += '   ' + i.text + '\n';
      response += '   💰 ' + i.value + '\n';
      response += '   → ' + i.action + '\n\n';
    });
    return response;
  }
  
  // الأداء
  if (q.indexOf('أداء') > -1 || q.indexOf('كيف') > -1 || q.indexOf('وضع') > -1) {
    var response = '📊 **تحليل الأداء:**\n\n';
    response += '💰 الإيراد: **' + n3(calc.revenue) + ' JD**\n';
    response += '📤 المصاريف: **' + n3(calc.expenses) + ' JD** (' + calc.expenseRatio.toFixed(0) + '%)\n';
    response += '📈 الربح: **' + n3(calc.profit) + ' JD**\n';
    response += '📊 الهامش: **' + calc.margin.toFixed(1) + '%**\n';
    response += '❤️ مؤشر الصحة: **' + calc.healthScore + '/100**\n\n';
    
    if (calc.profit < 0) {
      response += '🚨 **تحذير:** في خسارة! يجب زيادة الإيراد أو تقليل المصاريف.';
    } else if (calc.expenseRatio > 70) {
      response += '⚠️ **تحذير:** المصاريف مرتفعة جداً!';
    } else if (calc.margin >= 20) {
      response += '✅ **ممتاز!** استمر على هذا الأداء.';
    } else {
      response += '👍 **جيد** مع مجال للتحسين.';
    }
    
    return response;
  }
  
  // fallback — use original (pre-override) to avoid infinite recursion
  return window._originalGetEnhanced ? window._originalGetEnhanced(question, ctx) : '❓ لم أفهم سؤالك. جرب: "ما الربح؟" أو "ما الوضع المالي؟"';
}

// ربط V22 AI بالنظام
const originalGetEnhancedLocal = typeof getEnhancedLocalAIResponse === 'function' ? getEnhancedLocalAIResponse : null;
if (originalGetEnhancedLocal) {
  window._originalGetEnhanced = originalGetEnhancedLocal;
  getEnhancedLocalAIResponse = function(question, ctx) {
    return getV22AIResponse(question, ctx);
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 10. V22 INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

window.initV22Features = function() {
  console.log('🚀 V24 PRO Features Initialized');
  
  // ربط الحفظ الذكي بجميع inputs — blur فقط (change يعيد ضبط debounce المزامنة)
  document.querySelectorAll('input[type="number"], input[type="text"]').forEach(function(input) {
    input.addEventListener('blur', function() {
      // التحقق من القيم السالبة
      if (this.type === 'number' && parseFloat(this.value) < 0) {
        this.classList.add('input-error');
        toast('⚠️ لا يمكن إدخال قيمة سالبة');
        this.value = 0;
        setTimeout(function() { this.classList.remove('input-error'); }.bind(this), 2000);
      }
      saveAll();
    });
  });
  
  // حفظ عند التنقل
  document.querySelectorAll('.ntab').forEach(function(tab) {
    tab.addEventListener('click', function(){saveAll();});
  });
  
  // حفظ عند الإغلاق
  window.addEventListener('beforeunload', function(){saveAll();});
  window.addEventListener('pagehide', function(){saveAll();});
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) saveAll();
  });
  
  // تحديث Dashboard بالميزات الجديدة
  updateV22Dashboard();
  
  // تحديث دوري كل 30 ثانية
  setInterval(updateV22Dashboard, 30000);
};

function updateV22Dashboard() {
  try {
    var calc = getCalc();
    
    // === تحديث بطاقة الربح الرئيسية ===
    var profitHero = document.getElementById('profitHero');
    var profitValue = document.getElementById('profitHeroValue');
    var profitSub = document.getElementById('profitHeroSub');
    var profitTrend = document.getElementById('profitHeroTrend');
    
    if (profitValue) {
      profitValue.textContent = n3(calc.profit) + ' JD';
    }
    if (profitHero) {
      if (calc.profit < 0) {
        profitHero.classList.add('loss');
      } else {
        profitHero.classList.remove('loss');
      }
    }
    if (profitSub) {
      profitSub.textContent = 'هامش ' + calc.margin.toFixed(0) + '% • مؤشر الصحة ' + calc.healthScore + '/100';
    }
    if (profitTrend) {
      var trendIcon = calc.profitChange >= 0 ? '↑' : '↓';
      var trendText = calc.profitChange !== 0 ? (trendIcon + ' ' + Math.abs(calc.profitChange).toFixed(0) + '%') : '—';
      profitTrend.innerHTML = '<span>' + trendText + '</span> مقارنة بالشهر السابق';
    }
    
    // === تحديث KPIs ===
    var kpiRevenue = document.getElementById('kpiRevenue');
    var kpiExpenses = document.getElementById('kpiExpenses');
    var kpiAvgDaily = document.getElementById('kpiAvgDaily');
    var kpiGoalPct = document.getElementById('kpiGoalPct');
    var kpiRevChange = document.getElementById('kpiRevChange');
    var kpiExpRatio = document.getElementById('kpiExpRatio');
    var kpiActiveDays = document.getElementById('kpiActiveDays');
    var kpiGoalRemain = document.getElementById('kpiGoalRemain');
    
    if (kpiRevenue) kpiRevenue.textContent = n3(calc.revenue);
    if (kpiExpenses) kpiExpenses.textContent = n3(calc.expenses);
    if (kpiAvgDaily) kpiAvgDaily.textContent = n3(calc.avgDaily);
    
    if (kpiRevChange) {
      var rc = calc.revenueChange;
      kpiRevChange.textContent = (rc >= 0 ? '+' : '') + rc.toFixed(0) + '%';
      kpiRevChange.className = 'kv-change ' + (rc >= 0 ? 'up' : 'down');
    }
    
    if (kpiExpRatio) {
      kpiExpRatio.textContent = calc.expenseRatio.toFixed(0) + '%';
      kpiExpRatio.className = 'kv-change ' + (calc.expenseRatio <= 70 ? 'up' : 'down');
    }
    
    if (kpiActiveDays) {
      kpiActiveDays.textContent = calc.activeDays + ' يوم';
    }
    
    // الهدف
    var goal = (S.targets && S.targets[S.activeKey]) || 0;
    if (kpiGoalPct) {
      var goalPct = goal > 0 ? (calc.revenue / goal * 100) : 0;
      kpiGoalPct.textContent = goalPct.toFixed(0) + '%';
    }
    if (kpiGoalRemain) {
      if (goal > 0) {
        var remain = goal - calc.revenue;
        kpiGoalRemain.textContent = remain > 0 ? (n3(remain) + ' متبقي') : '✅ محقق';
        kpiGoalRemain.className = 'kv-change ' + (remain <= 0 ? 'up' : '');
      } else {
        kpiGoalRemain.textContent = 'لم يحدد';
      }
    }
    
    // === تحديث التنبيهات ===
    var alerts = getPredictiveAlerts();
    var alertsBar = document.getElementById('alertsBar');
    var v22Alerts = document.getElementById('v22Alerts');
    
    if (alertsBar && alerts.length > 0) {
      var html = '';
      alerts.slice(0, 2).forEach(function(a) {
        var cls = a.type === 'danger' ? 'al-d' : a.type === 'success' ? 'al-s' : 'al-w';
        html += '<div class="sa ' + cls + '">' + a.icon + ' ' + a.title + '</div>';
      });
      alertsBar.innerHTML = html;
      alertsBar.style.display = 'flex';
    }
    
    if (v22Alerts && alerts.length > 0) {
      var html = '';
      alerts.slice(0, 3).forEach(function(a) {
        html += '<div class="predictive-alert ' + a.type + '">';
        html += '<div class="pa-icon">' + a.icon + '</div>';
        html += '<div class="pa-content">';
        html += '<div class="pa-title">' + a.title + '</div>';
        html += '<div class="pa-desc">' + a.desc + '</div>';
        html += '<div class="pa-action">💡 ' + a.action + '</div>';
        html += '</div></div>';
      });
      v22Alerts.innerHTML = html;
    }
    
  } catch(e) {
    console.warn('V22 Dashboard update error:', e);
  }
}

// ربط التحديث بـ renderAll الأصلي
// ═══════════════════════════════════════════════════════════════════════════
// V24-2 FIX: ضمان تحديث البطاقات عند التحميل
// ═══════════════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(function() {
    if (typeof updateV22Dashboard === 'function') updateV22Dashboard();
    if (typeof updateLiveStats === 'function') updateLiveStats();
    try { updateDash(); } catch(e) {}
    if (typeof updateDash === 'function') updateDash();
  }, 500);
});

// تحديث إضافي عند فتح التطبيق
window.addEventListener('load', function() {
  setTimeout(function() {
    if (typeof renderAll === 'function') renderAll();
    try { updateDash(); } catch(e) {}
  }, 1000);
  
  // تحديث دوري كل دقيقتين (كان 5 ثوانٍ — ثقيل جداً)
  setInterval(function() {
    try { updateDash(); } catch(e) {}
  }, 120000);
});

console.log('📦 ريحانة V24-3 PRO loaded');

/* ═══════════════════════════════════════════════════════════════════════════ */
/* V24-3 PRO: نظام التصحيح المتقدم (يُعطّل في الإنتاج)                         */
/* ═══════════════════════════════════════════════════════════════════════════ */
