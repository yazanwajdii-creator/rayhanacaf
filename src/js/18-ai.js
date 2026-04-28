// AI ASSISTANT — Full Claude API Chat
// ════════════════════════════════════════════════
const _aiHistory=[]; let _aiLoading=false;

function buildCafeContext(){
  var t=totals(),d=G();
  var ym=S.activeKey.split('-');
  var monthName=MNA[parseInt(ym[1])-1]+' '+ym[0];
  var days=daysIn(S.activeKey);
  var active=d.sales.filter(function(s){return (s.cash||0)+(s.visa||0)+(s.pmts||0)>0;});
  var avg=active.length?t.rev/active.length:0;
  var daysLeft=days-active.length;

  // رواتب
  var salLines=[];
  var totalMonSal=0;
  S.monthlyEmps.forEach(function(e){
    var ms=d.mSal[e.id]||{base:0,allow:0,ded:0};
    var net=(ms.base||0)+(ms.allow||0)-(ms.ded||0);
    totalMonSal+=net;
    salLines.push(e.name+': '+n3(net)+' JD (أساسي '+n3(ms.base||0)+' + علاوة '+n3(ms.allow||0)+')');
  });
  var totalDayWages=0;
  S.dailyEmps.forEach(function(e){
    var dw=d.dWages[e.id]||{rate:0,att:[]};
    var att=(dw.att||[]).length;
    var wage=(dw.rate||0)*att;
    totalDayWages+=wage;
    salLines.push(e.name+': '+n3(wage)+' JD ('+att+' يوم × '+n3(dw.rate||0)+')');
  });

  // الالتزامات
  var oblPaid=0,oblUnpaid=[],oblTotal=0;
  d.obligations.forEach(function(o){
    oblTotal+=o.amt||0;
    if(o.paid)oblPaid+=o.amt||0;
    else oblUnpaid.push(o.name+': '+n3(o.amt||0)+' JD');
  });

  // الشهر السابق
  var prevKey=ym[1]==='01'?(parseInt(ym[0])-1)+'-12':(ym[0]+'-'+String(parseInt(ym[1])-1).padStart(2,'0'));
  var prevM=S.months[prevKey];
  var prevRev=0;
  if(prevM)prevM.sales.forEach(function(s){prevRev+=(s.cash||0)+(s.visa||0)+(s.pmts||0);});

  // أكبر الموردين
  var suppMap={};
  d.purchases.forEach(function(p){suppMap[p.sName]=(suppMap[p.sName]||0)+p.amt;});
  var topSupp=Object.entries(suppMap).sort(function(a,b){return b[1]-a[1];}).slice(0,4).map(function(e){return e[0]+': '+n3(e[1])+' JD';});

  // السلف
  var totalAdv=0;
  d.advances.forEach(function(a){if(a.status!=='مسددة')totalAdv+=a.amt||0;});

  // المخزون المنخفض
  var lowInv=(S.inventory||[]).filter(function(i){return i.min>0&&i.qty<=i.min;}).map(function(i){return i.name+' ('+i.qty+'/'+i.min+' '+i.unit+')';});

  // الهدف
  var goal=S.targets&&S.targets[S.activeKey]?S.targets[S.activeKey]:0;
  var goalPct=goal>0?(t.rev/goal*100).toFixed(1):null;

  // أيام تفصيلية آخر 7
  var last7=active.slice(-7).map(function(s){return 'يوم '+s.day+': '+n3((s.cash||0)+(s.visa||0)+(s.pmts||0))+' JD';});

  var lines=[
    '# بيانات ريحانة كافيه — '+monthName,
    '',
    '## الإيرادات',
    '- إجمالي: '+n3(t.rev)+' JD | نقدي: '+n3(t.cash)+' | فيزا: '+n3(t.visa)+' | مدفوعات للعمال: '+n3(t.pmts),
    '- صافي البيع (نقدي+فيزا): '+n3(t.netSales)+' JD',
    '- أيام مُدخلة: '+active.length+'/'+days+' | متوسط يومي: '+n3(avg)+' JD | متبقي: '+daysLeft+' يوم',
    '- إسقاط متوقع نهاية الشهر: '+n3(t.rev+avg*daysLeft)+' JD',
    '- الشهر السابق: '+n3(prevRev)+' JD'+(prevRev>0?' | التغيير: '+(((t.rev-prevRev)/prevRev)*100).toFixed(1)+'%':''),
    '',
    '## التكاليف والمصروفات',
    '- تكلفة البضاعة COGS: '+n3(t.bycat.COGS)+' JD ('+( t.rev>0?(t.bycat.COGS/t.rev*100).toFixed(1):'0')+'% من الإيراد)',
    '- مصاريف تشغيلية: '+n3(t.bycat.OPS)+' JD',
    '- إجمالي المصروفات: '+n3(t.totalExp)+' JD',
    '- صافي الربح: '+n3(t.profit)+' JD | هامش: '+t.margin.toFixed(1)+'%',
    '- الهامش الإجمالي (إيراد - COGS): '+n3(t.grossP)+' JD',
    '',
    '## أكبر الموردين هذا الشهر',
    topSupp.join(' | ')||'لا بيانات',
    '',
    '## الرواتب والأجور',
    '- رواتب شهرية: '+n3(totalMonSal)+' JD',
    '- أجور يومية: '+n3(totalDayWages)+' JD',
    '- إجمالي تكلفة الموظفين: '+n3(totalMonSal+totalDayWages)+' JD ('+( t.rev>0?((totalMonSal+totalDayWages)/t.rev*100).toFixed(1):'0')+'% من الإيراد)',
    salLines.join(' | '),
    '- سلف قائمة: '+n3(totalAdv)+' JD',
    '',
    '## الالتزامات',
    '- إجمالي: '+n3(oblTotal)+' JD | مسدد: '+n3(oblPaid)+' JD',
    oblUnpaid.length?'- غير مسددة: '+oblUnpaid.join(' | '):'- جميع الالتزامات مسددة',
    '',
    '## المخزون',
    lowInv.length?'- ⚠️ منخفض: '+lowInv.join(' | '):'- لا تنبيهات مخزون',
    '- عدد الأصناف المتابعة: '+((S.inventory||[]).length),
    '',
    '## الهدف الشهري',
    goal?'- الهدف: '+n3(goal)+' JD | محقق: '+goalPct+'% | متبقي: '+n3(Math.max(0,goal-t.rev))+' JD':'- لم يُحدَّد هدف',
    '',
    '## آخر 7 أيام مُدخلة',
    last7.join(' | ')||'لا بيانات',
    '',
    '---',
    'أنت مستشار مالي خبير في إدارة المقاهي في الأردن.',
    'استخدم هذه البيانات للإجابة. أجب دائماً بالعربية.',
    'كن دقيقاً ومحدداً. استخدم الأرقام. قدم توصيات عملية قابلة للتنفيذ.',
    'إذا كانت البيانات غير كاملة (بداية الشهر) وضّح ذلك.'
  ];
  return lines.join('\n');
}

function updateAiContext(){
  var t=totals();
  var ym=S.activeKey.split('-');
  var d=G(),active=d.sales.filter(function(s){return (s.cash||0)+(s.visa||0)+(s.pmts||0)>0;});
  T('aiCtxMonth',MNA[parseInt(ym[1])-1]+' '+ym[0]);
  T('aiCtxRev','إيراد: '+n3(t.rev));
  T('aiCtxProfit','ربح: '+n3(t.profit));
  T('aiCtxDays',active.length+' يوم');
}

function _appendMsg(text,role){
  var msgs=document.getElementById('aiMsgs');if(!msgs)return null;
  var div=document.createElement('div');
  div.className='ai-msg '+(role==='user'?'user':'bot');
  var safe=text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  safe=safe.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>');
  safe=safe.replace(/\n/g,'<br>');
  div.innerHTML=safe;
  msgs.appendChild(div);
  msgs.scrollTop=msgs.scrollHeight;
  return div;
}

function aiQuick(q){ askAI(q); }

function clearAiChat(){
  aiHistory=[];
  var msgs=document.getElementById('aiMessages');
  if(msgs)msgs.innerHTML='<div class="ai-msg assistant ai-welcome">تم المسح. كيف يمكنني مساعدتك؟ 🌿</div>';
}

// ════════════════════════════════════════════════
// HOOK INTO pg(), renderAll(), saveAll(), loadStore()
// ════════════════════════════════════════════════
const _pgOrig=pg;
pg=function(id,btn){
  _pgOrig(id,btn);
  if(id==='inv'){try{renderInvList();}catch(e){}}
  if(id==='annual'){try{initAnnualYear();renderAnnual();}catch(e){}}
  if(id==='ai'){try{updateAiContext();}catch(e){}}
};

const _raOrig=renderAll;
renderAll=function(){
  _raOrig();
  try{renderTarget();}catch(e){}
  try{updateAiContext();}catch(e){}
};

// saveAll و loadStore يتضمنان targets و inventory أصلاً — لا حاجة لـ override

// ═══════════════════════════════════════════════════════════════════════════
// SMART ANALYTICS V14 PRO - البطاقات الذكية الجديدة
// ═══════════════════════════════════════════════════════════════════════════

// تحديث بطاقة صحة الكافيه
function updateHealthCardNew() {
  var scoreEl = document.getElementById('healthScoreValue');
  var labelEl = document.getElementById('healthScoreLabel');
  var gaugeEl = document.getElementById('healthGaugeFill');
  var barsEl = document.getElementById('healthBars');
  if (!scoreEl || !labelEl || !gaugeEl || !barsEl) return;

  var t = totals(), d = G();
  var active = d.sales.filter(function(s) { return (s.cash||0)+(s.visa||0)+(s.pmts||0) > 0; });
  var days = daysIn(S.activeKey);

  if (active.length < 3) {
    scoreEl.textContent = '—';
    labelEl.textContent = 'أدخل ' + (3 - active.length) + ' أيام إضافية';
    gaugeEl.style.strokeDashoffset = 110;
    barsEl.innerHTML = '<div style="text-align:center;color:var(--tx3);font-size:11px;padding:8px">📊 تحتاج 3 أيام على الأقل لحساب الصحة</div>';
    return;
  }

  // حساب النقاط
  var scores = [];
  
  // 1. هامش الربح (30 نقطة)
  var marginScore = t.margin >= 20 ? 30 : t.margin >= 10 ? 22 : t.margin >= 0 ? 12 : 0;
  scores.push({label: 'الربحية', score: marginScore, max: 30, color: marginScore >= 22 ? 'var(--gn)' : marginScore >= 12 ? 'var(--yw)' : 'var(--rd)'});

  // 2. نسبة COGS (25 نقطة)
  var cogsScore = 25;
  if (t.rev > 0) {
    var cp = t.bycat.COGS / t.rev * 100;
    cogsScore = cp <= 30 ? 25 : cp <= 40 ? 18 : cp <= 50 ? 10 : 3;
  }
  scores.push({label: 'التكاليف', score: cogsScore, max: 25, color: cogsScore >= 18 ? 'var(--gn)' : cogsScore >= 10 ? 'var(--yw)' : 'var(--rd)'});

  // 3. انتظام الإدخال (25 نقطة)
  var inputScore = Math.min(25, Math.round(active.length / days * 25));
  scores.push({label: 'الانتظام', score: inputScore, max: 25, color: inputScore >= 18 ? 'var(--gn)' : inputScore >= 10 ? 'var(--yw)' : 'var(--rd)'});

  // 4. الالتزامات (20 نقطة)
  var unpaid = d.obligations.filter(function(o) { return !o.paid && o.amt > 0; }).length;
  var oblScore = unpaid === 0 ? 20 : unpaid <= 2 ? 12 : 5;
  scores.push({label: 'الالتزامات', score: oblScore, max: 20, color: oblScore >= 12 ? 'var(--gn)' : oblScore >= 5 ? 'var(--yw)' : 'var(--rd)'});

  var total = scores.reduce(function(s, x) { return s + x.score; }, 0);
  
  // تحديث العداد
  var offset = 110 - (total / 100 * 110);
  gaugeEl.style.strokeDashoffset = offset;
  gaugeEl.style.stroke = total >= 70 ? 'var(--gn)' : total >= 45 ? 'var(--yw)' : 'var(--rd)';
  
  scoreEl.textContent = total;
  scoreEl.style.color = total >= 70 ? 'var(--gn)' : total >= 45 ? 'var(--yw)' : 'var(--rd)';
  
  var grade = total >= 85 ? 'ممتاز 🌟' : total >= 70 ? 'جيد جداً' : total >= 55 ? 'جيد' : total >= 40 ? 'مقبول' : 'يحتاج تحسين';
  labelEl.textContent = grade;

  // أشرطة التفاصيل
  barsEl.innerHTML = scores.map(function(s) {
    var pct = (s.score / s.max * 100).toFixed(0);
    return '<div class="hb-row"><div class="hb-label">' + s.label + '</div><div class="hb-track"><div class="hb-fill" style="width:' + pct + '%;background:' + s.color + '"></div></div><div class="hb-val">' + s.score + '/' + s.max + '</div></div>';
  }).join('');
}

// تحديث بطاقة نقطة التعادل
function updateBreakevenCardNew() {
  var contentEl = document.getElementById('beContentNew');
  if (!contentEl) return;

  var t = totals(), d = G();
  var days = daysIn(S.activeKey);
  var active = d.sales.filter(function(s) { return (s.cash||0)+(s.visa||0)+(s.pmts||0) > 0; });
  var avg = active.length ? t.rev / active.length : 0;

  var fixedMonthly = d.obligations.filter(function(o){return o.paid;}).reduce(function(s, o) { return s + (o.amt || 0); }, 0) + (t.mSalPaid || 0);
  
  if (fixedMonthly === 0) {
    contentEl.innerHTML = '<div style="text-align:center;padding:15px 0"><div style="font-size:28px;margin-bottom:8px">📋</div><div style="font-size:11px;color:var(--tx3);line-height:1.6">أضف <strong style="color:var(--gold)">الالتزامات</strong> و<strong style="color:var(--gold)">الرواتب</strong><br>لحساب نقطة التعادل</div></div>';
    return;
  }

  // varRate = فقط COGS (تكلفة بضاعة متغيرة فعلاً) — OPS تكلفة شبه ثابتة
  var varRate = t.rev > 0 ? t.bycat.COGS / t.rev : 0.35;
  var dailyFixed = fixedMonthly / days;
  var dailyBE = (1 - varRate) > 0 ? dailyFixed / (1 - varRate) : 0;
  var monthlyBE = dailyBE * days;
  var above = avg >= dailyBE && avg > 0;
  var surplus = avg - dailyBE;

  contentEl.innerHTML = 
    '<div class="be-metric"><div class="be-metric-label">التكاليف الثابتة/شهر</div><div class="be-metric-value">' + n3(fixedMonthly) + ' JD</div></div>' +
    '<div class="be-metric"><div class="be-metric-label">إيراد التعادل/يوم</div><div class="be-metric-value" style="color:var(--bl)">' + n3(dailyBE) + ' JD</div></div>' +
    '<div class="be-metric"><div class="be-metric-label">متوسطك اليومي</div><div class="be-metric-value" style="color:' + (above ? 'var(--gn)' : 'var(--rd)') + '">' + n3(avg) + ' JD</div></div>' +
    (active.length > 0 ? '<div class="be-status-badge ' + (above ? 'be-above' : 'be-below') + '">' + 
      (above ? '✅ فوق التعادل بـ ' + n3(Math.abs(surplus)) + ' JD/يوم — فائض شهري: ' + n3(Math.abs(surplus)*days) + ' JD' 
             : '⚠️ تحت التعادل بـ ' + n3(Math.abs(surplus)) + ' JD/يوم — تحتاج تحسين ' + n3(Math.abs(surplus)) + ' JD/يوم') + 
      '</div>' : '');
}

// تحديث بطاقة الأداء الأسبوعي
function updateWeeklyCardNew() {
  var gridEl = document.getElementById('weeklyGridNew');
  var avgBadge = document.getElementById('weeklyAvgBadge');
  if (!gridEl) return;

  var d = G();
  var active = d.sales.filter(function(s) { return (s.cash||0)+(s.visa||0)+(s.pmts||0) > 0; });
  
  if (active.length === 0) {
    gridEl.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:20px"><div style="font-size:32px;margin-bottom:8px">📅</div><div style="color:var(--tx3);font-size:12px">أدخل بيانات الإيرادات لعرض الأداء</div></div>';
    if (avgBadge) avgBadge.textContent = '—';
    return;
  }

  var last7 = active.slice(-7);
  var sum7 = last7.reduce(function(s, x) { return s + (x.cash||0) + (x.visa||0) + (x.pmts||0); }, 0);
  var avg7 = sum7 / last7.length;
  var maxRev = Math.max.apply(null, last7.map(function(s) { return (s.cash||0)+(s.visa||0)+(s.pmts||0); })) || 1;

  if (avgBadge) avgBadge.textContent = n3(avg7) + ' JD';

  var ym = S.activeKey.split('-');
  var dayNames = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

  // ملء حتى 7 أيام
  var padded = [];
  for (var i = 0; i < 7 - last7.length; i++) padded.push(null);
  last7.forEach(function(s) { padded.push(s); });

  gridEl.innerHTML = padded.map(function(s, idx) {
    if (!s) return '<div class="wg-day" style="opacity:.3"><div class="wg-dn">—</div><div class="wg-val">—</div></div>';
    
    var rev = (s.cash||0) + (s.visa||0) + (s.pmts||0);
    var pct = rev / maxRev;
    var cls = pct >= 0.8 ? 'high' : pct >= 0.5 ? 'mid' : 'low';
    var trend = rev > avg7 ? '↑' : rev < avg7 ? '↓' : '→';
    var trendColor = rev > avg7 ? 'var(--gn)' : rev < avg7 ? 'var(--rd)' : 'var(--tx3)';
    
    var date = new Date(ym[0], parseInt(ym[1]) - 1, s.day);
    var dayName = dayNames[date.getDay()];
    
    return '<div class="wg-day ' + cls + '"><div class="wg-dn">' + dayName + ' ' + s.day + '</div><div class="wg-val">' + n3(rev) + '</div><div class="wg-trend" style="color:' + trendColor + '">' + trend + '</div></div>';
  }).join('');
}

// ═══════════════════════════════════════════════════════════════════════════
// AI SMART ASSISTANT V14 PRO - يعمل محلياً بدون API
// ═══════════════════════════════════════════════════════════════════════════

let aiHistory = [];
let aiLoading = false;

function updateQuickInsights() {
  var container = document.getElementById('aiQuickInsights');
  if (!container) return;

  var t = totals(), d = G();
  var active = d.sales.filter(function(s) { return (s.cash||0)+(s.visa||0)+(s.pmts||0) > 0; });
  var avg = active.length ? t.rev / active.length : 0;
  var days = daysIn(S.activeKey);
  var projected = avg * days;

  var insights = [];
  
  // هامش الربح
  var marginClass = t.margin >= 15 ? 'positive' : t.margin >= 5 ? 'warning' : 'negative';
  insights.push({icon: '📈', text: 'الهامش', value: t.margin.toFixed(1) + '%', cls: marginClass});
  
  // الإسقاط
  if (avg > 0) {
    var projClass = projected >= (S.targets && S.targets[S.activeKey] || projected) ? 'positive' : 'warning';
    insights.push({icon: '🎯', text: 'المتوقع', value: n3(projected) + ' JD', cls: projClass});
  }
  
  // الالتزامات
  var unpaid = d.obligations.filter(function(o) { return !o.paid && o.amt > 0; });
  if (unpaid.length > 0) {
    var unpaidTotal = unpaid.reduce(function(s, o) { return s + o.amt; }, 0);
    insights.push({icon: '⚠️', text: 'غير مسدد', value: n3(unpaidTotal) + ' JD', cls: 'warning'});
  }
  
  // أفضل يوم
  if (active.length > 0) {
    var maxDay = active.reduce(function(best, s) {
      var rev = (s.cash||0)+(s.visa||0)+(s.pmts||0);
      return rev > best.rev ? {day: s.day, rev: rev} : best;
    }, {day: 0, rev: 0});
    insights.push({icon: '🏆', text: 'أفضل يوم', value: maxDay.day + ' (' + n3(maxDay.rev) + ')', cls: 'positive'});
  }

  container.innerHTML = insights.map(function(i) {
    return '<div class="ai-insight-chip ' + i.cls + '"><span class="aic-icon">' + i.icon + '</span><span class="aic-text">' + i.text + '</span><span class="aic-value">' + i.value + '</span></div>';
  }).join('');
}

function askAI(question) {
  var input = document.getElementById('aiInput');
  if (input) input.value = question;
  sendAIMessage();
}

function addAIMessage(text, role) {
  var container = document.getElementById('aiMessages');
  if (!container) return;
  
  // إزالة رسالة الترحيب إذا كانت موجودة
  var welcome = container.querySelector('.ai-welcome');
  if (welcome) welcome.remove();
  
  var div = document.createElement('div');
  div.className = 'ai-msg ' + role;
  
  // تحويل النص
  var safe = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  safe = safe.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  safe = safe.replace(/\n/g, '<br>');
  
  div.innerHTML = '<div class="ai-msg-text">' + safe + '</div>';
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
  
  return div;
}

// ═══════════════════════════════════════════════════════════════════════════
// نظام AI المحلي الذكي - يعمل بدون API
// ═══════════════════════════════════════════════════════════════════════════

function getLocalAIResponse(question) {
  var t = totals(), d = G();
  var active = d.sales.filter(function(s) { return (s.cash||0)+(s.visa||0)+(s.pmts||0) > 0; });
  var days = daysIn(S.activeKey);
  var avg = active.length ? t.rev / active.length : 0;
  var ym = S.activeKey.split('-');
  var monthName = MNA[parseInt(ym[1])-1];
  
  var q = question.toLowerCase();
  
  // ═══ تحليل شامل ═══
  if (q.indexOf('شامل') > -1 || q.indexOf('تقرير') > -1 || q.indexOf('كامل') > -1) {
    var response = '📈 **تقرير شامل - ' + monthName + ' ' + ym[0] + '**\n\n';
    
    response += '💰 **الإيرادات:**\n';
    response += '• الإجمالي: ' + n3(t.rev) + ' JD\n';
    response += '• المتوسط اليومي: ' + n3(avg) + ' JD\n';
    response += '• أيام التشغيل: ' + active.length + '/' + days + '\n\n';
    
    response += '📉 **التكاليف:**\n';
    response += '• COGS: ' + n3(t.bycat.COGS) + ' JD (' + (t.rev > 0 ? (t.bycat.COGS/t.rev*100).toFixed(0) : 0) + '%)\n';
    response += '• الرواتب: ' + n3(t.mSalG + t.dwTotal) + ' JD\n';
    response += '• الالتزامات: ' + n3(t.oblTotal) + ' JD\n';
    response += '• إجمالي: ' + n3(t.totalExp) + ' JD\n\n';
    
    response += '📊 **النتيجة:**\n';
    response += '• صافي الربح: **' + n3(t.profit) + ' JD**\n';
    response += '• هامش الربح: **' + t.margin.toFixed(1) + '%**\n\n';
    
    // التقييم
    var score = 0;
    if (t.margin >= 15) score += 25; else if (t.margin >= 5) score += 15;
    if (t.rev > 0 && t.bycat.COGS/t.rev < 0.35) score += 25; else if (t.bycat.COGS/t.rev < 0.45) score += 15;
    if (active.length >= days * 0.8) score += 25; else if (active.length >= days * 0.5) score += 15;
    if (t.profit > 0) score += 25;
    
    response += '⭐ **التقييم العام: ' + score + '/100**\n';
    if (score >= 80) response += '✅ أداء ممتاز!';
    else if (score >= 60) response += '👍 أداء جيد مع مجال للتحسين';
    else if (score >= 40) response += '⚠️ يحتاج تحسينات';
    else response += '🚨 يحتاج مراجعة عاجلة';
    
    return response;
  }
  
  // ═══ المشاكل والمخاطر ═══
  if (q.indexOf('مشاكل') > -1 || q.indexOf('مخاطر') > -1 || q.indexOf('تحذير') > -1) {
    var problems = [];
    
    if (t.margin < 5) problems.push('🚨 **هامش ربح خطير:** ' + t.margin.toFixed(1) + '% - أقل من 5%!');
    else if (t.margin < 10) problems.push('⚠️ **هامش ربح منخفض:** ' + t.margin.toFixed(1) + '% - المعيار 15-25%');
    
    if (t.rev > 0 && t.bycat.COGS/t.rev > 0.45) problems.push('🛒 **تكلفة بضاعة مرتفعة جداً:** ' + (t.bycat.COGS/t.rev*100).toFixed(0) + '% - المعيار 28-35%');
    
    if (t.rev > 0 && (t.mSalG + t.dwTotal)/t.rev > 0.35) problems.push('👥 **تكلفة عمالة مرتفعة:** ' + ((t.mSalG + t.dwTotal)/t.rev*100).toFixed(0) + '% - المعيار 25-30%');
    
    var unpaid = d.obligations.filter(function(o) { return !o.paid && o.amt > 0; });
    if (unpaid.length > 0) {
      var total = unpaid.reduce(function(s,o){return s+o.amt;},0);
      problems.push('📋 **التزامات غير مسددة:** ' + unpaid.length + ' بقيمة ' + n3(total) + ' JD');
    }
    
    if (active.length < days * 0.5) problems.push('📅 **بيانات ناقصة:** فقط ' + active.length + ' يوم من ' + days);
    
    if (t.profit < 0) problems.push('💸 **خسارة صافية:** ' + n3(Math.abs(t.profit)) + ' JD');
    
    if (problems.length === 0) {
      return '✅ **لا توجد مشاكل كبيرة!**\n\nالكافيه يعمل بشكل جيد:\n• هامش الربح: ' + t.margin.toFixed(1) + '%\n• لا التزامات متأخرة\n• البيانات مكتملة\n\nاستمر على هذا الأداء! 🌟';
    }
    
    return '⚠️ **المشاكل والمخاطر المكتشفة:**\n\n' + problems.join('\n\n') + '\n\n💡 **التوصية:** راجع هذه النقاط بعناية واتخذ إجراءات تصحيحية.';
  }
  
  // ═══ المقارنة ═══
  if (q.indexOf('قارن') > -1 || q.indexOf('مقارنة') > -1 || q.indexOf('تغير') > -1 || q.indexOf('سابق') > -1) {
    var prev = getPrevMonthTotals();
    
    if (!prev || !prev.rev) {
      return '📊 **لا توجد بيانات للمقارنة**\n\nلا تتوفر بيانات الشهر السابق للمقارنة.\n\nأدخل بيانات شهر سابق للحصول على مقارنات مفصلة.';
    }
    
    var revChange = t.rev - prev.rev;
    var revPct = prev.rev > 0 ? (revChange/prev.rev*100) : 0;
    var profitChange = t.profit - prev.profit;
    
    var response = '⚖️ **مقارنة الشهر الحالي بالسابق:**\n\n';
    response += '💰 **الإيراد:**\n';
    response += '• الحالي: ' + n3(t.rev) + ' JD\n';
    response += '• السابق: ' + n3(prev.rev) + ' JD\n';
    response += '• التغيير: ' + (revChange >= 0 ? '↑' : '↓') + ' ' + Math.abs(revPct).toFixed(0) + '%\n\n';
    
    response += '📈 **الربح:**\n';
    response += '• الحالي: ' + n3(t.profit) + ' JD\n';
    response += '• السابق: ' + n3(prev.profit) + ' JD\n';
    response += '• التغيير: ' + (profitChange >= 0 ? '↑' : '↓') + ' ' + n3(Math.abs(profitChange)) + ' JD\n\n';
    
    if (revChange > 0 && profitChange > 0) response += '✅ **تحسن ممتاز!** الإيراد والربح في ازدياد.';
    else if (revChange > 0 && profitChange <= 0) response += '⚠️ **انتبه!** الإيراد زاد لكن الربح انخفض - راجع التكاليف.';
    else if (revChange <= 0 && profitChange > 0) response += '👍 **جيد!** رغم انخفاض الإيراد، الربح تحسن - إدارة تكاليف فعالة.';
    else response += '🚨 **تراجع!** الإيراد والربح انخفضا - يجب اتخاذ إجراءات.';
    
    return response;
  }
  
  // ═══ الرواتب ═══
  if (q.indexOf('رواتب') > -1 || q.indexOf('موظفين') > -1 || q.indexOf('عمالة') > -1) {
    var totalSal = t.mSalG + t.dwTotal;
    var salRatio = t.rev > 0 ? (totalSal/t.rev*100) : 0;
    
    var response = '👷 **تحليل الرواتب والعمالة:**\n\n';
    response += '💰 **إجمالي الرواتب:** ' + n3(totalSal) + ' JD\n';
    response += '• رواتب شهرية: ' + n3(t.mSalG) + ' JD\n';
    response += '• أجور يومية: ' + n3(t.dwTotal) + ' JD\n\n';
    
    response += '📊 **نسبة العمالة للإيراد:** ' + salRatio.toFixed(1) + '%\n';
    response += '• المعيار العالمي: 25-30%\n\n';
    
    if (salRatio <= 25) {
      response += '✅ **ممتاز!** تكلفة العمالة منخفضة ومناسبة.\n';
      response += '💡 يمكنك الاستثمار في تدريب أو مكافآت للموظفين.';
    } else if (salRatio <= 30) {
      response += '👍 **جيد!** تكلفة العمالة ضمن المعيار.\n';
      response += '💡 حافظ على هذا المستوى.';
    } else if (salRatio <= 35) {
      response += '⚠️ **مرتفعة قليلاً!** تكلفة العمالة أعلى من المعيار.\n';
      response += '💡 راجع جدول الورديات وتحقق من الكفاءة.';
    } else {
      response += '🚨 **مرتفعة جداً!** تكلفة العمالة تأكل الأرباح.\n';
      response += '💡 أعد هيكلة الورديات أو راجع عدد الموظفين.';
    }
    
    return response;
  }
  
  // ═══ المشتريات والموردين ═══
  if (q.indexOf('مشتريات') > -1 || q.indexOf('موردين') > -1 || q.indexOf('توفير') > -1) {
    var cogsRatio = t.rev > 0 ? (t.bycat.COGS/t.rev*100) : 0;
    
    var response = '🛒 **تحليل المشتريات:**\n\n';
    response += '💰 **إجمالي COGS:** ' + n3(t.bycat.COGS) + ' JD\n';
    response += '📊 **نسبة من الإيراد:** ' + cogsRatio.toFixed(1) + '%\n';
    response += '• المعيار للمقاهي: 28-35%\n\n';
    
    // تحليل الموردين
    var suppliers = {};
    d.purchases.forEach(function(p) {
      if (!suppliers[p.supplier]) suppliers[p.supplier] = 0;
      suppliers[p.supplier] += p.amt;
    });
    
    var suppArr = Object.keys(suppliers).map(function(k) {
      return {name: k, total: suppliers[k]};
    }).sort(function(a,b) { return b.total - a.total; });
    
    if (suppArr.length > 0) {
      response += '📋 **أعلى الموردين:**\n';
      suppArr.slice(0,5).forEach(function(s, i) {
        response += '• ' + (i+1) + '. ' + s.name + ': ' + n3(s.total) + ' JD\n';
      });
      response += '\n';
    }
    
    if (cogsRatio <= 30) {
      response += '✅ **ممتاز!** تكلفة المشتريات منخفضة.\n';
      response += '💡 تفاوضك مع الموردين فعال.';
    } else if (cogsRatio <= 35) {
      response += '👍 **جيد!** التكلفة ضمن المعيار.';
    } else if (cogsRatio <= 40) {
      response += '⚠️ **مرتفعة!** حاول التفاوض على أسعار أفضل.';
    } else {
      response += '🚨 **مرتفعة جداً!**\n';
      response += '💡 **للتوفير:**\n';
      response += '• تفاوض مع الموردين الحاليين\n';
      response += '• ابحث عن موردين بديلين\n';
      response += '• راجع كميات الطلب والهدر';
    }
    
    return response;
  }
  
  // ═══ أيام الذروة ═══
  if (q.indexOf('ذروة') > -1 || q.indexOf('أيام') > -1 || q.indexOf('ضعيفة') > -1) {
    if (active.length < 5) {
      return '📅 **نحتاج بيانات أكثر**\n\nأدخل بيانات 5 أيام على الأقل لتحليل أيام الذروة.';
    }
    
    var sorted = active.slice().sort(function(a,b) {
      return ((b.cash||0)+(b.visa||0)+(b.pmts||0)) - ((a.cash||0)+(a.visa||0)+(a.pmts||0));
    });
    
    var response = '📅 **تحليل أيام المبيعات:**\n\n';
    response += '🏆 **أفضل 3 أيام:**\n';
    sorted.slice(0,3).forEach(function(s, i) {
      var rev = (s.cash||0)+(s.visa||0)+(s.pmts||0);
      response += '• يوم ' + s.day + ': ' + n3(rev) + ' JD\n';
    });
    
    response += '\n📉 **أضعف 3 أيام:**\n';
    sorted.slice(-3).reverse().forEach(function(s, i) {
      var rev = (s.cash||0)+(s.visa||0)+(s.pmts||0);
      response += '• يوم ' + s.day + ': ' + n3(rev) + ' JD\n';
    });
    
    response += '\n💡 **التوصيات:**\n';
    response += '• ركز التسويق في الأيام الضعيفة\n';
    response += '• قدم عروض خاصة لجذب العملاء\n';
    response += '• حلل أسباب قوة أيام الذروة وكررها';
    
    return response;
  }
  
  // ═══ الالتزامات ═══
  if (q.indexOf('التزامات') > -1 || q.indexOf('إيجار') > -1 || q.indexOf('جمعية') > -1 || q.indexOf('ثابتة') > -1) {
    var response = '📋 **تحليل الالتزامات الثابتة:**\n\n';
    response += '💰 **إجمالي الالتزامات:** ' + n3(t.oblTotal) + ' JD/شهر\n\n';
    
    if (d.obligations && d.obligations.length > 0) {
      response += '📝 **التفاصيل:**\n';
      d.obligations.forEach(function(o) {
        if (o.amt > 0) {
          response += '• ' + o.name + ': ' + n3(o.amt) + ' JD ' + (o.paid ? '✅' : '⏳') + '\n';
        }
      });
      response += '\n';
    }
    
    var oblRatio = t.rev > 0 ? (t.oblTotal/t.rev*100) : 0;
    response += '📊 **نسبة من الإيراد:** ' + oblRatio.toFixed(1) + '%\n\n';
    
    if (oblRatio <= 15) {
      response += '✅ **مستدامة!** الالتزامات الثابتة منخفضة ومريحة.';
    } else if (oblRatio <= 25) {
      response += '👍 **مقبولة!** الالتزامات ضمن الحد المعقول.';
    } else {
      response += '⚠️ **مرتفعة!** الالتزامات تشكل عبئاً على الربحية.\n';
      response += '💡 حاول إعادة التفاوض على الإيجار أو تقليل الالتزامات.';
    }
    
    return response;
  }
  
  // ═══ خطة العمل ═══
  if (q.indexOf('خطة') > -1 || q.indexOf('عمل') > -1 || q.indexOf('تطوير') > -1) {
    var response = '🗺️ **خطة عمل لتحسين أداء ريحانة كافيه:**\n\n';
    
    response += '📅 **الأسبوع 1-2:**\n';
    if (t.rev > 0 && t.bycat.COGS/t.rev > 0.35) {
      response += '• تفاوض مع الموردين على أسعار أفضل\n';
      response += '• راجع قائمة المشتريات وأزل غير الضروري\n';
    }
    if (t.margin < 15) {
      response += '• راجع أسعار القائمة (زيادة 5-10%)\n';
    }
    response += '• حدد المنتجات الأكثر ربحية\n\n';
    
    response += '📅 **الأسبوع 3-4:**\n';
    response += '• أطلق عرض ترويجي للأيام الضعيفة\n';
    response += '• فعّل برنامج ولاء للعملاء المتكررين\n';
    response += '• حسّن تجربة العميل\n\n';
    
    response += '🎯 **الأهداف:**\n';
    var targetRev = avg * 1.15 * days;
    response += '• زيادة الإيراد 15% (' + n3(targetRev) + ' JD)\n';
    response += '• رفع هامش الربح إلى 20%+\n';
    response += '• تقليل COGS تحت 35%\n\n';
    
    response += '💪 **ابدأ اليوم وتابع التقدم أسبوعياً!**';
    
    return response;
  }
  
  // ═══ تحليل الأداء ═══
  if (q.indexOf('أداء') > -1 || q.indexOf('الشهر') > -1 || q.indexOf('كيف') > -1) {
    var response = '📊 **تحليل أداء ' + monthName + ' ' + ym[0] + '**\n\n';
    
    response += '💰 **الإيرادات:**\n';
    response += '• إجمالي الإيراد: ' + n3(t.rev) + ' JD\n';
    response += '• صافي البيع (نقد+فيزا): ' + n3(t.netSales) + ' JD\n';
    response += '• متوسط اليومي: ' + n3(avg) + ' JD\n';
    response += '• أيام التشغيل: ' + active.length + ' من ' + days + '\n\n';
    
    response += '📉 **المصروفات:**\n';
    response += '• إجمالي المصروفات: ' + n3(t.totalExp) + ' JD\n';
    response += '• تكلفة البضاعة: ' + n3(t.bycat.COGS) + ' JD\n\n';
    
    response += '📈 **النتيجة:**\n';
    response += '• صافي الربح: ' + n3(t.profit) + ' JD\n';
    response += '• هامش الربح: ' + t.margin.toFixed(1) + '%\n\n';
    
    if (t.margin >= 20) {
      response += '✅ **ممتاز!** هامش الربح قوي جداً. استمر على هذا الأداء!';
    } else if (t.margin >= 10) {
      response += '👍 **جيد!** هامش الربح مقبول. حاول تقليل التكاليف لزيادته.';
    } else if (t.margin >= 0) {
      response += '⚠️ **تنبيه!** هامش الربح منخفض. راجع أسعار البيع والتكاليف.';
    } else {
      response += '🚨 **خسارة!** المصروفات تتجاوز الإيرادات. يجب مراجعة فورية!';
    }
    
    return response;
  }
  
  // ═══ التوقعات ═══
  if (q.indexOf('توقع') > -1 || q.indexOf('متوقع') > -1 || q.indexOf('نهاية') > -1) {
    if (active.length < 3) {
      return '📅 **نحتاج بيانات أكثر**\n\nأدخل بيانات 3 أيام على الأقل لحساب التوقعات بدقة.\n\nحالياً لديك: ' + active.length + ' يوم فقط.';
    }
    
    var projected = avg * days;
    var daysLeft = days - active.length;
    var expectedMore = avg * daysLeft;
    
    var response = '🎯 **توقعات ' + monthName + '**\n\n';
    response += '📊 **البيانات الحالية:**\n';
    response += '• أيام مُدخلة: ' + active.length + ' يوم\n';
    response += '• متوسط اليومي: ' + n3(avg) + ' JD\n\n';
    
    response += '🔮 **التوقعات:**\n';
    response += '• الإيراد المتوقع نهاية الشهر: **' + n3(projected) + ' JD**\n';
    response += '• أيام متبقية: ' + daysLeft + ' يوم\n';
    response += '• إيراد متوقع إضافي: ' + n3(expectedMore) + ' JD\n\n';
    
    var goal = S.targets && S.targets[S.activeKey] ? S.targets[S.activeKey] : 0;
    if (goal > 0) {
      var goalPct = (projected / goal * 100).toFixed(0);
      response += '🎯 **مقارنة بالهدف (' + n3(goal) + ' JD):**\n';
      if (projected >= goal) {
        response += '✅ متوقع تحقيق ' + goalPct + '% من الهدف - ممتاز!';
      } else {
        var needed = (goal - t.rev) / daysLeft;
        response += '⚠️ متوقع تحقيق ' + goalPct + '% فقط\n';
        response += '💡 تحتاج ' + n3(needed) + ' JD/يوم لتحقيق الهدف';
      }
    }
    
    return response;
  }
  
  // ═══ النصائح ═══
  if (q.indexOf('نصائح') > -1 || q.indexOf('نصيحة') > -1 || q.indexOf('تحسين') > -1 || q.indexOf('زيادة') > -1 || q.indexOf('أرباح') > -1) {
    var tips = [];
    
    if (t.rev > 0) {
      var cogsRatio = t.bycat.COGS / t.rev * 100;
      if (cogsRatio > 40) {
        tips.push('🛒 **تكلفة البضاعة مرتفعة (' + cogsRatio.toFixed(0) + '%)**\n   المعيار للمقاهي 28-35%. تفاوض مع الموردين أو ابحث عن بدائل.');
      }
    }
    
    if (t.rev > 0) {
      var salRatio = (t.mSalG + t.dwTotal) / t.rev * 100;
      if (salRatio > 35) {
        tips.push('👥 **تكلفة الموظفين مرتفعة (' + salRatio.toFixed(0) + '%)**\n   المعيار 25-30%. راجع جدول الورديات وكفاءة العمل.');
      }
    }
    
    var unpaid = d.obligations.filter(function(o) { return !o.paid && o.amt > 0; });
    if (unpaid.length > 0) {
      var unpaidTotal = unpaid.reduce(function(s,o) { return s + o.amt; }, 0);
      tips.push('📋 **' + unpaid.length + ' التزامات غير مسددة (' + n3(unpaidTotal) + ' JD)**\n   سددها قبل تراكم الفوائد أو الغرامات.');
    }
    
    if (active.length > 0) {
      var lowDays = active.filter(function(s) { return (s.cash||0)+(s.visa||0)+(s.pmts||0) < avg * 0.5; });
      if (lowDays.length > 3) {
        tips.push('📉 **' + lowDays.length + ' أيام ضعيفة**\n   حلل أسباب انخفاض المبيعات في هذه الأيام وحسّن التسويق.');
      }
    }
    
    if (t.margin < 15) {
      tips.push('💡 **لزيادة هامش الربح:**\n   • راجع أسعار المنتجات الأكثر مبيعاً\n   • قلل الهدر في المواد الخام\n   • ركز على المنتجات ذات الهامش العالي');
    }
    
    if (tips.length === 0) {
      return '✨ **أداء ممتاز!**\n\nلا توجد مشاكل واضحة. استمر على هذا المستوى!\n\n💡 **للتطوير المستمر:**\n• جرب منتجات جديدة\n• وسّع قاعدة العملاء\n• استثمر في التسويق الرقمي';
    }
    
    return '💡 **نصائح لتحسين الأداء:**\n\n' + tips.join('\n\n');
  }
  
  // ═══ المصروفات ═══
  if (q.indexOf('مصروف') > -1 || q.indexOf('تكاليف') > -1 || q.indexOf('تكلفة') > -1) {
    var response = '📉 **تحليل المصروفات:**\n\n';
    
    response += '🛒 **تكلفة البضاعة (COGS):** ' + n3(t.bycat.COGS) + ' JD';
    if (t.rev > 0) response += ' (' + (t.bycat.COGS/t.rev*100).toFixed(0) + '%)';
    response += '\n';
    
    response += '⚙️ **تشغيلية:** ' + n3(t.bycat.OPS) + ' JD\n';
    response += '📋 **إدارية:** ' + n3(t.bycat.ADM) + ' JD\n';
    response += '📢 **تسويقية:** ' + n3(t.bycat.MKT) + ' JD\n\n';
    
    response += '🏠 **الالتزامات الثابتة:** ' + n3(t.oblTotal) + ' JD\n';
    response += '👥 **الرواتب والأجور:** ' + n3(t.mSalG + t.dwTotal) + ' JD\n\n';
    
    response += '📊 **الإجمالي:** ' + n3(t.totalExp) + ' JD\n\n';
    
    var items = [
      {name: 'تكلفة البضاعة', val: t.bycat.COGS},
      {name: 'الالتزامات', val: t.oblTotal},
      {name: 'الرواتب', val: t.mSalG + t.dwTotal},
      {name: 'التشغيلية', val: t.bycat.OPS}
    ].sort(function(a,b) { return b.val - a.val; });
    
    response += '🔍 **أكبر بند:** ' + items[0].name + ' (' + n3(items[0].val) + ' JD)';
    
    return response;
  }
  
  // ═══ الإجابة الافتراضية ═══
  return '☕ **مرحباً من مستشار ريحانة!**\n\nيمكنني مساعدتك في:\n\n• 📊 **أداء الشهر** - اكتب "كيف أداء الشهر"\n• 🎯 **التوقعات** - اكتب "ما التوقعات"\n• 💡 **نصائح** - اكتب "أعطني نصائح"\n• 📉 **المصروفات** - اكتب "حلل المصروفات"\n• ⚠️ **المشاكل** - اكتب "ما المشاكل"\n• ⚖️ **مقارنة** - اكتب "قارن بالشهر السابق"\n• 👷 **الرواتب** - اكتب "حلل الرواتب"\n• 🗺️ **خطة عمل** - اكتب "أعطني خطة"\n\nأو اضغط على الأزرار السريعة!';
}

// ═══════════════════════════════════════════════════════════════════════════
// AI SETTINGS - إعدادات المستشار الذكي
// ═══════════════════════════════════════════════════════════════════════════

function showAISettings() {
  var modal = document.getElementById('aiSettingsModal');
  if (modal) {
    modal.style.display = 'flex';
    var claudeInput = document.getElementById('claudeApiKeyInput');
    var groqInput = document.getElementById('groqApiKeyInput');
    if (claudeInput) claudeInput.value = safeLS.getItem('rh_claude_key') || '';
    if (groqInput) groqInput.value = safeLS.getItem('rh_groq_key') || '';
    // تحديث الحالة الحالية
    var statusEl = document.getElementById('aiCurrentStatus');
    if (statusEl) {
      var gk = safeLS.getItem('rh_groq_key') || '';
      var ck = safeLS.getItem('rh_claude_key') || '';
      statusEl.textContent = gk.startsWith('gsk_') ? '🟢 Groq AI مفعّل' : ck.startsWith('sk-') ? '🔵 Claude AI مفعّل' : '🟡 محلي (بدون AI)';
    }
  }
}

function saveGroqSettings() {
  var input = document.getElementById('groqApiKeyInput');
  if (!input) return;
  var key = input.value.trim();
  if (key && !key.startsWith('gsk_')) { toast('⚠️ مفتاح Gemini يبدأ بـ gsk_'); return; }
  if (key) { safeLS.setItem('rh_groq_key', key); toast('✅ تم حفظ مفتاح Groq — AI مجاني مفعّل!'); }
  else { safeLS.removeItem('rh_groq_key'); toast('🗑️ تم مسح مفتاح Groq'); }
  updateAIStatus(true);
  closeAISettings();
}

function closeAISettings() {
  var modal = document.getElementById('aiSettingsModal');
  if (modal) modal.style.display = 'none';
}

function saveAISettings() {
  var input = document.getElementById('claudeApiKeyInput');
  if (!input) return;
  
  var key = input.value.trim();
  
  if (key && !key.startsWith('sk-')) {
    toast('⚠️ المفتاح يجب أن يبدأ بـ sk-');
    return;
  }
  
  if (key) {
    safeLS.setItem('rh_claude_key', key);
    toast('✅ تم حفظ مفتاح API');
    updateAIStatus(true);
  } else {
    safeLS.removeItem('rh_claude_key');
    updateAIStatus(false);
  }
  
  closeAISettings();
}

function clearAIKey() {
  safeLS.removeItem('rh_claude_key');
  var input = document.getElementById('claudeApiKeyInput');
  if (input) input.value = '';
  updateAIStatus(false);
  toast('🗑️ تم مسح المفتاح');
  closeAISettings();
}

function updateAIStatus(hasKey) {
  var statusText = document.getElementById('aiStatusText');
  var statusDot = document.querySelector('.ai-status-dot');
  var geminiKey = safeLS.getItem('rh_groq_key') || '';
  var claudeKey = safeLS.getItem('rh_claude_key') || '';
  var hasGemini = geminiKey.startsWith('gsk_');
  var hasClaude = claudeKey.startsWith('sk-');
  if (hasGemini) {
    if (statusText) statusText.textContent = '🟢 Groq AI (مجاني)';
    if (statusDot) statusDot.style.background = '#10B981';
  } else if (hasClaude) {
    if (statusText) statusText.textContent = '🔵 Claude AI';
    if (statusDot) statusDot.style.background = '#3B82F6';
  } else {
    if (statusText) statusText.textContent = '🟡 محلي (بدون AI)';
    if (statusDot) statusDot.style.background = '#F59E0B';
  }
}

// تحديث حالة AI عند التحميل
(function() {
  setTimeout(function() {
    var groqK = safeLS.getItem('rh_groq_key');
    var claudeK = safeLS.getItem('rh_claude_key');
    updateAIStatus(groqK && groqK.startsWith('gsk_'));
  }, 1000);
})();

function sendAIMessage() {
  if (aiLoading) return;
  
  var input = document.getElementById('aiInput');
  var sendBtn = document.getElementById('aiSendBtn');
  if (!input) return;
  
  var question = input.value.trim();
  if (!question) return;
  
  input.value = '';
  aiLoading = true;
  if (sendBtn) sendBtn.disabled = true;
  
  // إضافة سؤال المستخدم
  addAIMessage(question, 'user');
  
  // إظهار رسالة التفكير
  var thinkingMsg = addAIMessage('🤔 جاري تحليل البيانات...', 'thinking');
  
  // جمع بيانات الكافيه للسياق
  var context = null;
  try {
    context = buildAIContext();
  } catch(e) {
    console.warn('buildAIContext error:', e);
    context = { month: S.activeKey, revenue: 0, expenses: 0, profit: 0, margin: 0, avgDaily: 0, activeDays: 0, totalDays: 30 };
  }
  
  // V25: ترتيب الأولوية: Groq (مجاني) → Claude → محلي
  var geminiKey = safeLS.getItem('rh_groq_key') || '';
  var claudeKey = safeLS.getItem('rh_claude_key') || '';

  var responseTimeout = setTimeout(function() {
    if (aiLoading) {
      if (thinkingMsg) thinkingMsg.remove();
      addAIMessage('⚠️ انتهت مهلة الانتظار. جرب مرة أخرى.', 'assistant');
      aiLoading = false;
      if (sendBtn) sendBtn.disabled = false;
    }
  }, 18000);

  // Gemini أولاً (مجاني)
  if (geminiKey && geminiKey.startsWith('gsk_')) {
    callGroqAPI(question, context)
      .then(function(response) {
        clearTimeout(responseTimeout);
        if (thinkingMsg) thinkingMsg.remove();
        addAIMessage(response, 'assistant');
        aiLoading = false;
        if (sendBtn) sendBtn.disabled = false;
      })
      .catch(function(err) {
        console.warn('Groq error, trying local:', err);
        clearTimeout(responseTimeout);
        if (thinkingMsg) thinkingMsg.remove();
        try { addAIMessage(getEnhancedLocalAIResponse(question, context), 'assistant'); }
        catch(e) { addAIMessage('⚠️ حدث خطأ. جرب مرة أخرى.', 'assistant'); }
        aiLoading = false;
        if (sendBtn) sendBtn.disabled = false;
      });
  } else if (claudeKey && claudeKey.startsWith('sk-')) {
    // Claude كـ fallback
    callClaudeAPI(question, context, claudeKey)
      .then(function(response) {
        clearTimeout(responseTimeout);
        if (thinkingMsg) thinkingMsg.remove();
        addAIMessage(response, 'assistant');
        aiLoading = false;
        if (sendBtn) sendBtn.disabled = false;
      })
      .catch(function(err) {
        clearTimeout(responseTimeout);
        if (thinkingMsg) thinkingMsg.remove();
        try { addAIMessage(getEnhancedLocalAIResponse(question, context), 'assistant'); }
        catch(e) { addAIMessage('⚠️ حدث خطأ. جرب مرة أخرى.', 'assistant'); }
        aiLoading = false;
        if (sendBtn) sendBtn.disabled = false;
      });
  } else {
    // استخدام النظام المحلي المحسّن
    setTimeout(function() {
      clearTimeout(responseTimeout);
      if (thinkingMsg) thinkingMsg.remove();
      try {
        var response = getEnhancedLocalAIResponse(question, context);
        addAIMessage(response, 'assistant');
      } catch(e) {
        console.warn('AI Response Error:', e);
        addAIMessage('☕ **مستشار ريحانة**\n\nيمكنني مساعدتك في:\n• كيف أداء الشهر؟\n• قارن بالشهر السابق\n• حلل التكاليف\n• أعطني نصائح', 'assistant');
      }
      aiLoading = false;
      if (sendBtn) sendBtn.disabled = false;
    }, 500);
  }
}

// بناء سياق البيانات للـ AI
function buildAIContext() {
  try {
    var t = totals(), d = G();
    var active = d.sales.filter(function(s) { return (s.cash||0)+(s.visa||0)+(s.pmts||0) > 0; });
    var days = daysIn(S.activeKey);
    var avg = active.length ? (t.rev || 0) / active.length : 0;
    var ym = S.activeKey.split('-');
    var monthName = MNA[parseInt(ym[1])-1] || 'الشهر';
    
    // بيانات الشهر السابق
    var prevKey = getPrevMonthKey();
    var prev = prevKey && S.months[prevKey] ? getPrevMonthTotals() : null;
    
    // V24-3 FIX: استخدام الرواتب المدفوعة فعلاً
    var salaries = (t.mSalPaid || 0);
    var cogsVal = (t.bycat && t.bycat.COGS) || 0;
    
    return {
      month: monthName + ' ' + ym[0],
      revenue: t.rev || 0,
      expenses: t.totalExp || 0,
      profit: t.profit || 0,
      margin: t.margin || 0,
      avgDaily: avg,
      activeDays: active.length,
      totalDays: days,
      cogs: cogsVal,
      cogsRatio: (t.rev || 0) > 0 ? (cogsVal / t.rev * 100) : 0,
      salaries: salaries,
      salariesPaid: (t.mSalPaid || 0),
      salariesAccrued: (t.mSalAccrued || 0),
      salaryRatio: (t.rev || 0) > 0 ? (salaries / t.rev * 100) : 0,
      obligations: t.oblTotal || 0,
      unpaidObl: d.obligations.filter(function(o) { return !o.paid && o.amt > 0; }).length,
      prevRevenue: prev ? (prev.rev || 0) : 0,
      prevProfit: prev ? (prev.profit || 0) : 0,
      goal: S.targets && S.targets[S.activeKey] ? S.targets[S.activeKey] : 0
    };
  } catch(e) {
    console.warn('buildAIContext error:', e);
    return {
      month: S.activeKey || '',
      revenue: 0, expenses: 0, profit: 0, margin: 0,
      avgDaily: 0, activeDays: 0, totalDays: 30,
      cogs: 0, cogsRatio: 0, salaries: 0, salaryRatio: 0,
      obligations: 0, unpaidObl: 0, prevRevenue: 0, prevProfit: 0, goal: 0
    };
  }
}

// استدعاء Gemini API (مجاني)
async function callNetlifyAI(provider, prompt, model) {
  var res = await fetch('/.netlify/functions/ai', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({provider, prompt, model})
  });
  var data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

async function callGroqAPI(question, context) {
  var key = safeLS.getItem('rh_groq_key') || '';
  var ym = S.activeKey.split('-');
  var monthName = MNA[parseInt(ym[1])-1] || MN[parseInt(ym[1])-1] || 'الشهر';
  var prompt = 'أنت مستشار مالي خبير لمقهى ريحانة في الأردن. أجب بالعربية بشكل مختصر ومفيد مع أرقام دقيقة.\n\n' +
    'بيانات الكافيه — ' + monthName + ' ' + ym[0] + ':\n' +
    '• إجمالي الإيراد: ' + n3(context.revenue) + ' JD\n' +
    '• صافي البيع (نقد+فيزا): ' + n3(context.netSales||context.revenue) + ' JD\n' +
    '• إجمالي التكاليف الفعلية: ' + n3(context.expenses) + ' JD\n' +
    '• صافي الربح: ' + n3(context.profit) + ' JD\n' +
    '• هامش الربح: ' + (context.margin||0).toFixed(1) + '%\n' +
    '• متوسط يومي: ' + n3(context.avgDaily) + ' JD\n' +
    '• أيام التشغيل: ' + context.activeDays + '/' + context.totalDays + '\n' +
    '• نسبة COGS: ' + (context.cogsRatio||0).toFixed(0) + '%\n' +
    '• رواتب مدفوعة: ' + n3(context.salariesPaid||0) + ' JD\n' +
    '• رواتب مستحقة لم تُدفع: ' + n3(context.salariesAccrued||0) + ' JD\n' +
    '• التزامات غير مسددة: ' + (context.unpaidObl||0) + '\n\n' +
    'السؤال: ' + question;
  // جرّب Netlify proxy أولاً — إذا فشل استخدم المفتاح المحلي
  try { return await callNetlifyAI('groq', prompt, 'llama-3.1-8b-instant'); } catch(_) {}
  if(!key || !key.startsWith('gsk_')) throw new Error('no groq key');
  var res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {'Content-Type':'application/json','Authorization':'Bearer '+key},
    body: JSON.stringify({model:'llama-3.1-8b-instant',messages:[{role:'user',content:prompt}],max_tokens:700,temperature:0.4})
  });
  var data = await res.json();
  if(data.choices && data.choices[0]) return data.choices[0].message.content;
  if(data.error) throw new Error(data.error.message);
  throw new Error('no response');
}

// استدعاء Claude API (يحتاج مفتاح خاص)
async function callClaudeAPI(question, context, apiKey) {
  var systemPrompt = 'أنت مستشار مالي خبير لكافيه ريحانة في الأردن. ' +
    'تحلل البيانات المالية وتقدم نصائح عملية مباشرة. ' +
    'أجب بالعربية بشكل مختصر ومفيد. استخدم الأرقام والنسب.';
  
  var userPrompt = 'بيانات الكافيه الحالية:\n' +
    '- الشهر: ' + context.month + '\n' +
    '- الإيراد: ' + n3(context.revenue) + ' JD\n' +
    '- المصروفات: ' + n3(context.expenses) + ' JD\n' +
    '- صافي الربح: ' + n3(context.profit) + ' JD\n' +
    '- هامش الربح: ' + context.margin.toFixed(1) + '%\n' +
    '- المتوسط اليومي: ' + n3(context.avgDaily) + ' JD\n' +
    '- أيام التشغيل: ' + context.activeDays + '/' + context.totalDays + '\n' +
    '- تكلفة البضاعة (COGS): ' + context.cogsRatio.toFixed(0) + '%\n' +
    '- تكلفة العمالة: ' + context.salaryRatio.toFixed(0) + '%\n' +
    (context.prevRevenue > 0 ? '- إيراد الشهر السابق: ' + n3(context.prevRevenue) + ' JD\n' : '') +
    (context.goal > 0 ? '- الهدف الشهري: ' + n3(context.goal) + ' JD\n' : '') +
    '\nسؤال العميل: ' + question;
  
  var fullPrompt = systemPrompt + '\n\n' + userPrompt;

  // جرّب Netlify proxy أولاً — إذا فشل استخدم المفتاح المحلي
  try { return await callNetlifyAI('claude', fullPrompt, 'claude-haiku-4-5-20251001'); } catch(_) {}

  if (!apiKey) throw new Error('no claude key');
  var response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [{ role: 'user', content: fullPrompt }]
    })
  });

  if (!response.ok) throw new Error('API Error: ' + response.status);
  var data = await response.json();
  return data.content[0].text;
}

// النظام المحلي المحسّن
function getEnhancedLocalAIResponse(question, ctx) {
  var q = question.toLowerCase();
  var response = '';
  var d = G();
  
  // ═══════════════════════════════════════════════════════════════════════════
  // V24 PRO - نظام AI ذكي يعمل بدون إنترنت
  // يعتمد على البيانات المحلية فقط ويعطي قرارات حقيقية
  // ═══════════════════════════════════════════════════════════════════════════
  
  // ═══ 1. TREND ANALYSIS - تحليل الاتجاه ═══
  if (q.indexOf('اتجاه') > -1 || q.indexOf('trend') > -1 || q.indexOf('نمط') > -1 || q.indexOf('توجه') > -1) {
    return generateTrendAnalysis(ctx, d);
  }
  
  // ═══ 2. FORECAST - التوقعات ═══
  if (q.indexOf('توقع') > -1 || q.indexOf('متوقع') > -1 || q.indexOf('نهاية الشهر') > -1 || q.indexOf('forecast') > -1) {
    return generateForecast(ctx, d);
  }
  
  // ═══ 3. ALERTS - التنبيهات ═══
  if (q.indexOf('تنبيه') > -1 || q.indexOf('تحذير') > -1 || q.indexOf('مشاكل') > -1 || q.indexOf('مخاطر') > -1 || q.indexOf('alert') > -1) {
    return generateAlerts(ctx, d);
  }
  
  // ═══ 4. أسئلة الربح ═══
  if (q.indexOf('ربح') > -1 || q.indexOf('صافي') > -1 || q.indexOf('profit') > -1) {
    return analyzeProfitability(ctx, d);
  }
  
  // ═══ 5. أسئلة المصاريف ═══
  if (q.indexOf('مصاريف') > -1 || q.indexOf('مصروفات') > -1 || q.indexOf('تكاليف') > -1 || q.indexOf('expense') > -1) {
    return analyzeExpenses(ctx, d);
  }
  
  // ═══ 6. أسئلة الإيراد ═══
  if (q.indexOf('إيراد') > -1 || q.indexOf('ايراد') > -1 || q.indexOf('دخل') > -1 || q.indexOf('مبيعات') > -1 || q.indexOf('revenue') > -1) {
    return analyzeRevenue(ctx, d);
  }
  
  // ═══ 7. أسئلة الأداء العام ═══
  if (q.indexOf('كيف') > -1 || q.indexOf('أداء') > -1 || q.indexOf('وضع') > -1 || q.indexOf('حال') > -1) {
    return generatePerformanceReport(ctx, d);
  }
  
  // ═══ 8. المقارنة ═══
  if (q.indexOf('قارن') > -1 || q.indexOf('مقارنة') > -1 || q.indexOf('فرق') > -1 || q.indexOf('سابق') > -1) {
    return generateComparison(ctx, d);
  }
  
  // ═══ 9. النصائح ═══
  if (q.indexOf('نصيحة') > -1 || q.indexOf('نصائح') > -1 || q.indexOf('اقتراح') > -1 || q.indexOf('تحسين') > -1 || q.indexOf('خطة') > -1) {
    return generateActionPlan(ctx, d);
  }
  
  // ═══ 10. الرواتب ═══
  if (q.indexOf('راتب') > -1 || q.indexOf('رواتب') > -1 || q.indexOf('موظف') > -1 || q.indexOf('عمالة') > -1) {
    return analyzeSalaries(ctx, d);
  }
  
  // ═══ 11. الالتزامات ═══
  if (q.indexOf('التزام') > -1 || q.indexOf('إيجار') > -1 || q.indexOf('جمعية') > -1) {
    return analyzeObligations(ctx, d);
  }
  
  // ═══ 12. تقرير شامل ═══
  if (q.indexOf('شامل') > -1 || q.indexOf('تقرير') > -1 || q.indexOf('كامل') > -1 || q.indexOf('تحليل') > -1) {
    return generateFullReport(ctx, d);
  }
  
  // ═══ 13. قرار سريع ═══
  return generateQuickDecision(ctx, d, question);
}

// ═══════════════════════════════════════════════════════════════════════════
// دوال التحليل الذكي
// ═══════════════════════════════════════════════════════════════════════════

function generateTrendAnalysis(ctx, d) {
  var sales = d.sales.filter(function(s) { return (s.cash||0)+(s.visa||0)+(s.pmts||0) > 0; });
  if (sales.length < 3) {
    return '📊 **تحليل الاتجاه**\n\nتحتاج 3 أيام بيانات على الأقل لتحليل الاتجاه.\n\nأدخل المزيد من البيانات اليومية.';
  }
  
  // حساب الاتجاه
  var firstHalf = sales.slice(0, Math.floor(sales.length/2));
  var secondHalf = sales.slice(Math.floor(sales.length/2));
  
  var avgFirst = firstHalf.reduce(function(s,x){return s+(x.cash||0)+(x.visa||0)+(x.pmts||0);},0) / firstHalf.length;
  var avgSecond = secondHalf.reduce(function(s,x){return s+(x.cash||0)+(x.visa||0)+(x.pmts||0);},0) / secondHalf.length;
  
  var trendPct = avgFirst > 0 ? ((avgSecond - avgFirst) / avgFirst * 100) : 0;
  var trendDir = trendPct > 5 ? '📈 صاعد' : trendPct < -5 ? '📉 هابط' : '➡️ مستقر';
  var trendEmoji = trendPct > 5 ? '🟢' : trendPct < -5 ? '🔴' : '🟡';
  
  var response = '📊 **تحليل الاتجاه - ' + ctx.month + '**\n\n';
  response += trendEmoji + ' **الاتجاه العام:** ' + trendDir + '\n\n';
  response += '📈 **المقارنة:**\n';
  response += '• النصف الأول: ' + n3(avgFirst) + ' JD/يوم\n';
  response += '• النصف الثاني: ' + n3(avgSecond) + ' JD/يوم\n';
  response += '• التغيير: ' + (trendPct >= 0 ? '+' : '') + trendPct.toFixed(1) + '%\n\n';
  
  // التوصية بناءً على الاتجاه
  response += '💡 **القرار:**\n';
  if (trendPct > 10) {
    response += '✅ الأداء يتحسن بشكل ممتاز! استمر على نفس الاستراتيجية.\n';
    response += '• فكر في التوسع أو زيادة المخزون';
  } else if (trendPct > 0) {
    response += '👍 نمو بطيء ولكن إيجابي.\n';
    response += '• حافظ على الجودة وابحث عن فرص زيادة المبيعات';
  } else if (trendPct > -10) {
    response += '⚠️ الأداء مستقر مع ميل للانخفاض.\n';
    response += '• راجع أسعار القائمة والعروض الترويجية';
  } else {
    response += '🚨 **تحذير:** انخفاض واضح في المبيعات!\n';
    response += '• راجع جودة الخدمة والمنتجات فوراً\n';
    response += '• تحقق من المنافسين\n';
    response += '• فعّل عروض ترويجية عاجلة';
  }
  
  return response;
}

function generateForecast(ctx, d) {
  var sales = d.sales.filter(function(s) { return (s.cash||0)+(s.visa||0)+(s.pmts||0) > 0; });
  var today = new Date().getDate();
  var daysLeft = ctx.totalDays - today;
  
  var response = '🎯 **التوقعات المالية - ' + ctx.month + '**\n\n';
  
  // التوقع الشهري
  var projected = ctx.avgDaily * ctx.totalDays;
  var projectedProfit = projected - ctx.expenses;
  var projectedMargin = projected > 0 ? (projectedProfit / projected * 100) : 0;
  
  response += '📅 **توقع نهاية الشهر:**\n';
  response += '• الإيراد المتوقع: **' + n3(projected) + ' JD**\n';
  response += '• الربح المتوقع: **' + n3(projectedProfit) + ' JD**\n';
  response += '• الهامش المتوقع: **' + projectedMargin.toFixed(1) + '%**\n\n';
  
  // ما تحتاجه للوصول للهدف
  if (ctx.goal > 0) {
    var needed = ctx.goal - ctx.revenue;
    var neededDaily = daysLeft > 0 ? needed / daysLeft : needed;
    response += '🎯 **للوصول للهدف (' + n3(ctx.goal) + ' JD):**\n';
    if (needed <= 0) {
      response += '✅ **تم تحقيق الهدف!** تجاوزت بـ ' + n3(Math.abs(needed)) + ' JD\n\n';
    } else {
      response += '• المتبقي: ' + n3(needed) + ' JD\n';
      response += '• تحتاج يومياً: ' + n3(neededDaily) + ' JD\n';
      response += '• الأيام المتبقية: ' + daysLeft + ' يوم\n\n';
    }
  }
  
  // التوقع السنوي
  var yearlyProjected = projected * 12;
  var yearlyProfit = projectedProfit * 12;
  response += '📆 **التوقع السنوي (تقريبي):**\n';
  response += '• الإيراد: ~' + n3(yearlyProjected) + ' JD\n';
  response += '• الربح: ~' + n3(yearlyProfit) + ' JD\n\n';
  
  // القرار
  response += '💡 **القرار:**\n';
  if (projectedMargin >= 20) {
    response += '✅ التوقعات ممتازة! الكافيه في وضع مالي قوي.';
  } else if (projectedMargin >= 10) {
    response += '👍 التوقعات جيدة. ركز على خفض التكاليف لزيادة الهامش.';
  } else if (projectedMargin >= 0) {
    response += '⚠️ التوقعات متواضعة. يجب مراجعة التكاليف والأسعار.';
  } else {
    response += '🚨 **تحذير:** التوقعات تشير لخسارة! اتخذ إجراءات فورية.';
  }
  
  return response;
}

function generateAlerts(ctx, d) {
  var alerts = [];
  
  // فحص الربحية
  if (ctx.profit < 0) {
    alerts.push({level: 'danger', icon: '🚨', msg: 'خسارة صافية: ' + n3(Math.abs(ctx.profit)) + ' JD', action: 'راجع التكاليف فوراً وقلل المصروفات غير الضرورية'});
  } else if (ctx.margin < 5) {
    alerts.push({level: 'danger', icon: '🔴', msg: 'هامش ربح خطير: ' + ctx.margin.toFixed(1) + '%', action: 'ارفع الأسعار أو قلل تكلفة البضاعة'});
  } else if (ctx.margin < 10) {
    alerts.push({level: 'warning', icon: '🟡', msg: 'هامش ربح منخفض: ' + ctx.margin.toFixed(1) + '%', action: 'ابحث عن طرق لتحسين الكفاءة'});
  }
  
  // فحص التكاليف
  if (ctx.expenses > ctx.revenue * 0.7) {
    var expPct = (ctx.expenses / ctx.revenue * 100).toFixed(0);
    alerts.push({level: 'warning', icon: '⚠️', msg: 'المصروفات مرتفعة: ' + expPct + '% من الإيراد', action: 'راجع بنود المصروفات وحدد أين يمكن التوفير'});
  }
  
  // فحص COGS
  if (ctx.cogsRatio > 45) {
    alerts.push({level: 'danger', icon: '🛒', msg: 'تكلفة بضاعة مرتفعة جداً: ' + ctx.cogsRatio.toFixed(0) + '%', action: 'تفاوض مع الموردين أو غيّر المصادر'});
  } else if (ctx.cogsRatio > 38) {
    alerts.push({level: 'warning', icon: '📦', msg: 'تكلفة بضاعة فوق المعيار: ' + ctx.cogsRatio.toFixed(0) + '%', action: 'المعيار 28-35%'});
  }
  
  // فحص العمالة
  if (ctx.salaryRatio > 40) {
    alerts.push({level: 'danger', icon: '👥', msg: 'تكلفة عمالة مرتفعة جداً: ' + ctx.salaryRatio.toFixed(0) + '%', action: 'راجع جدولة الورديات وعدد الموظفين'});
  } else if (ctx.salaryRatio > 32) {
    alerts.push({level: 'warning', icon: '👷', msg: 'تكلفة عمالة فوق المعيار: ' + ctx.salaryRatio.toFixed(0) + '%', action: 'المعيار 25-30%'});
  }
  
  // فحص الالتزامات
  var unpaid = d.obligations.filter(function(o) { return !o.paid && o.amt > 0; });
  if (unpaid.length > 0) {
    var unpaidTotal = unpaid.reduce(function(s,o){return s+o.amt;},0);
    alerts.push({level: 'warning', icon: '📋', msg: unpaid.length + ' التزامات غير مسددة: ' + n3(unpaidTotal) + ' JD', action: 'سدد الالتزامات لتجنب الغرامات'});
  }
  
  // فحص البيانات
  if (ctx.activeDays < ctx.totalDays * 0.5) {
    alerts.push({level: 'info', icon: 'ℹ️', msg: 'بيانات ناقصة: ' + ctx.activeDays + '/' + ctx.totalDays + ' يوم', action: 'أكمل إدخال البيانات اليومية'});
  }
  
  if (alerts.length === 0) {
    return '✅ **لا توجد تنبيهات!**\n\n🌟 الكافيه يعمل بشكل ممتاز:\n• هامش الربح: ' + ctx.margin.toFixed(1) + '%\n• التكاليف تحت السيطرة\n• لا التزامات متأخرة\n\nاستمر على هذا الأداء الرائع! 💪';
  }
  
  var response = '🔔 **تنبيهات ' + ctx.month + '** (' + alerts.length + ')\n\n';
  
  // ترتيب حسب الخطورة
  var dangerAlerts = alerts.filter(function(a){return a.level==='danger';});
  var warningAlerts = alerts.filter(function(a){return a.level==='warning';});
  var infoAlerts = alerts.filter(function(a){return a.level==='info';});
  
  if (dangerAlerts.length > 0) {
    response += '🚨 **خطير:**\n';
    dangerAlerts.forEach(function(a) {
      response += a.icon + ' ' + a.msg + '\n→ ' + a.action + '\n\n';
    });
  }
  
  if (warningAlerts.length > 0) {
    response += '⚠️ **تحذير:**\n';
    warningAlerts.forEach(function(a) {
      response += a.icon + ' ' + a.msg + '\n→ ' + a.action + '\n\n';
    });
  }
  
  if (infoAlerts.length > 0) {
    response += 'ℹ️ **معلومات:**\n';
    infoAlerts.forEach(function(a) {
      response += a.icon + ' ' + a.msg + '\n→ ' + a.action + '\n\n';
    });
  }
  
  return response;
}

function analyzeProfitability(ctx, d) {
  var response = '💰 **تحليل الربحية - ' + ctx.month + '**\n\n';
  
  response += '📊 **الأرقام:**\n';
  response += '• الإيراد: ' + n3(ctx.revenue) + ' JD\n';
  response += '• المصروفات: ' + n3(ctx.expenses) + ' JD\n';
  response += '• **صافي الربح: ' + n3(ctx.profit) + ' JD**\n';
  response += '• **هامش الربح: ' + ctx.margin.toFixed(1) + '%**\n\n';
  
  // تقييم الربحية
  var status = '';
  if (ctx.profit < 0) {
    status = '🚨 **خسارة!** الكافيه يخسر ' + n3(Math.abs(ctx.profit)) + ' JD\n\n';
    status += '**الإجراءات المطلوبة:**\n';
    status += '1. راجع كل بنود المصروفات\n';
    status += '2. ارفع الأسعار بنسبة 10-15%\n';
    status += '3. قلل الهدر في المواد الخام\n';
    status += '4. أعد تقييم عدد الموظفين';
  } else if (ctx.margin < 10) {
    status = '⚠️ **ربح ضعيف** - الهامش أقل من 10%\n\n';
    status += '**للتحسين:**\n';
    status += '• ارفع الأسعار تدريجياً\n';
    status += '• فاوض الموردين على أسعار أفضل';
  } else if (ctx.margin < 20) {
    status = '👍 **ربح جيد** - يمكن تحسينه\n\n';
    status += '**للوصول لـ 20%:**\n';
    status += '• خفض COGS بنسبة ' + Math.max(0, ctx.cogsRatio - 32).toFixed(0) + '%';
  } else {
    status = '✅ **ربحية ممتازة!**\n\n';
    status += 'الكافيه يحقق هامش ربح صحي.\n';
    status += 'فكر في التوسع أو الاستثمار في التسويق.';
  }
  
  response += status;
  return response;
}

function analyzeExpenses(ctx, d) {
  var response = '📉 **تحليل المصروفات - ' + ctx.month + '**\n\n';
  
  var expPct = ctx.revenue > 0 ? (ctx.expenses / ctx.revenue * 100) : 0;
  
  response += '💵 **الإجمالي:** ' + n3(ctx.expenses) + ' JD (' + expPct.toFixed(0) + '% من الإيراد)\n\n';
  
  response += '📊 **التوزيع:**\n';
  response += '┌─────────────────────────────────┐\n';
  response += '│ تكلفة البضاعة: ' + n3(ctx.cogs) + ' (' + ctx.cogsRatio.toFixed(0) + '%)' + (ctx.cogsRatio <= 35 ? ' ✅' : ' ⚠️') + '\n';
  response += '│ الرواتب والأجور: ' + n3(ctx.salaries) + ' (' + ctx.salaryRatio.toFixed(0) + '%)' + (ctx.salaryRatio <= 30 ? ' ✅' : ' ⚠️') + '\n';
  response += '│ الالتزامات: ' + n3(ctx.obligations) + '\n';
  response += '└─────────────────────────────────┘\n\n';
  
  // التوصيات
  response += '💡 **القرار:**\n';
  if (expPct > 85) {
    response += '🚨 **المصروفات تستهلك أكثر من 85% من الإيراد!**\n';
    response += '• هذا وضع خطير يجب معالجته فوراً\n';
    response += '• راجع كل بند وحدد أين يمكن التوفير';
  } else if (expPct > 70) {
    response += '⚠️ المصروفات مرتفعة (' + expPct.toFixed(0) + '%)\n';
    response += '• الهدف: إبقاء المصروفات تحت 75%\n';
    response += '• ركز على خفض أكبر بند (';
    if (ctx.cogsRatio >= ctx.salaryRatio) response += 'تكلفة البضاعة';
    else response += 'الرواتب';
    response += ')';
  } else {
    response += '✅ المصروفات تحت السيطرة (' + expPct.toFixed(0) + '%)\n';
    response += '• حافظ على هذا المستوى';
  }
  
  return response;
}

function analyzeRevenue(ctx, d) {
  var response = '💰 **تحليل الإيرادات - ' + ctx.month + '**\n\n';
  
  var sales = d.sales.filter(function(s) { return (s.cash||0)+(s.visa||0)+(s.pmts||0) > 0; });
  var cashTotal = d.sales.reduce(function(s,x){return s+(x.cash||0);},0);
  var visaTotal = d.sales.reduce(function(s,x){return s+(x.visa||0);},0);
  
  response += '📊 **الأرقام:**\n';
  response += '• إجمالي الإيراد: **' + n3(ctx.revenue) + ' JD**\n';
  response += '• المتوسط اليومي: ' + n3(ctx.avgDaily) + ' JD\n';
  response += '• أيام التشغيل: ' + ctx.activeDays + '/' + ctx.totalDays + '\n\n';
  
  response += '💳 **طرق الدفع:**\n';
  response += '• نقدي: ' + n3(cashTotal) + ' JD\n';
  response += '• فيزا: ' + n3(visaTotal) + ' JD\n\n';
  
  // أفضل وأسوأ يوم
  if (sales.length > 0) {
    var best = sales.reduce(function(b,s){var r=(s.cash||0)+(s.visa||0);return r>b.rev?{day:s.day,rev:r}:b;},{day:0,rev:0});
    var worst = sales.reduce(function(w,s){var r=(s.cash||0)+(s.visa||0);return r<w.rev?{day:s.day,rev:r}:w;},{day:0,rev:Infinity});
    
    response += '📅 **التحليل:**\n';
    response += '• أفضل يوم: ' + best.day + ' (' + n3(best.rev) + ' JD) 🏆\n';
    response += '• أقل يوم: ' + worst.day + ' (' + n3(worst.rev) + ' JD)\n\n';
  }
  
  // القرار
  response += '💡 **القرار:**\n';
  if (ctx.avgDaily >= 100) {
    response += '✅ إيراد يومي قوي! استمر على هذا الأداء.';
  } else if (ctx.avgDaily >= 50) {
    response += '👍 إيراد مقبول. ابحث عن طرق لزيادته:\n';
    response += '• عروض ترويجية\n• تحسين القائمة\n• تسويق على السوشيال ميديا';
  } else {
    response += '⚠️ الإيراد منخفض. يجب:\n';
    response += '• تحسين الموقع والديكور\n• إضافة منتجات جديدة\n• تفعيل التسويق الرقمي';
  }
  
  return response;
}

function generatePerformanceReport(ctx, d) {
  var response = '📊 **تقرير الأداء - ' + ctx.month + '**\n\n';
  
  // حساب النقاط
  var score = 0;
  var details = [];
  
  // الربحية (25 نقطة)
  if (ctx.margin >= 20) { score += 25; details.push('✅ هامش ممتاز'); }
  else if (ctx.margin >= 15) { score += 20; details.push('👍 هامش جيد'); }
  else if (ctx.margin >= 10) { score += 15; details.push('⚠️ هامش متوسط'); }
  else if (ctx.margin >= 0) { score += 5; details.push('🔴 هامش ضعيف'); }
  else { details.push('🚨 خسارة!'); }
  
  // COGS (25 نقطة)
  if (ctx.cogsRatio <= 32) { score += 25; details.push('✅ COGS ممتاز'); }
  else if (ctx.cogsRatio <= 38) { score += 20; details.push('👍 COGS جيد'); }
  else if (ctx.cogsRatio <= 45) { score += 10; details.push('⚠️ COGS مرتفع'); }
  else { details.push('🔴 COGS خطير'); }
  
  // العمالة (25 نقطة)
  if (ctx.salaryRatio <= 25) { score += 25; details.push('✅ عمالة ممتازة'); }
  else if (ctx.salaryRatio <= 32) { score += 20; details.push('👍 عمالة جيدة'); }
  else if (ctx.salaryRatio <= 40) { score += 10; details.push('⚠️ عمالة مرتفعة'); }
  else { details.push('🔴 عمالة مكلفة'); }
  
  // الانتظام (25 نقطة)
  var opRate = ctx.activeDays / ctx.totalDays;
  if (opRate >= 0.9) { score += 25; details.push('✅ انتظام ممتاز'); }
  else if (opRate >= 0.7) { score += 20; details.push('👍 انتظام جيد'); }
  else if (opRate >= 0.5) { score += 10; details.push('⚠️ بيانات ناقصة'); }
  else { details.push('🔴 بيانات قليلة'); }
  
  // عرض النتيجة
  var grade = score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B' : score >= 60 ? 'C' : score >= 50 ? 'D' : 'F';
  var gradeColor = score >= 80 ? '🟢' : score >= 60 ? '🟡' : '🔴';
  
  response += gradeColor + ' **التقييم: ' + grade + ' (' + score + '/100)**\n\n';
  
  response += '📈 **الأرقام الرئيسية:**\n';
  response += '• الإيراد: ' + n3(ctx.revenue) + ' JD\n';
  response += '• الربح: ' + n3(ctx.profit) + ' JD\n';
  response += '• الهامش: ' + ctx.margin.toFixed(1) + '%\n\n';
  
  response += '📋 **التفاصيل:**\n';
  details.forEach(function(d) { response += d + '\n'; });
  
  response += '\n💡 **القرار:**\n';
  if (score >= 80) {
    response += '✅ أداء ممتاز! استمر واستثمر في النمو.';
  } else if (score >= 60) {
    response += '👍 أداء جيد مع مجال للتحسين. راجع التفاصيل أعلاه.';
  } else {
    response += '⚠️ يحتاج تحسينات جوهرية. ركز على النقاط الحمراء.';
  }
  
  return response;
}

function generateComparison(ctx, d) {
  if (ctx.prevRevenue === 0) {
    return '📊 **لا توجد بيانات للمقارنة**\n\nلا تتوفر بيانات الشهر السابق.\n\nأدخل بيانات شهر سابق للحصول على مقارنات مفصلة.';
  }
  
  var revChange = ctx.revenue - ctx.prevRevenue;
  var revPct = (revChange / ctx.prevRevenue * 100);
  var profitChange = ctx.profit - ctx.prevProfit;
  
  var response = '⚖️ **مقارنة شهرية - ' + ctx.month + '**\n\n';
  
  response += '💰 **الإيراد:**\n';
  response += '├─ الحالي: ' + n3(ctx.revenue) + ' JD\n';
  response += '├─ السابق: ' + n3(ctx.prevRevenue) + ' JD\n';
  response += '└─ التغيير: ' + (revChange >= 0 ? '↑' : '↓') + ' ' + Math.abs(revPct).toFixed(0) + '% ' + (revChange >= 0 ? '🟢' : '🔴') + '\n\n';
  
  response += '📈 **الربح:**\n';
  response += '├─ الحالي: ' + n3(ctx.profit) + ' JD\n';
  response += '├─ السابق: ' + n3(ctx.prevProfit) + ' JD\n';
  response += '└─ التغيير: ' + (profitChange >= 0 ? '+' : '') + n3(profitChange) + ' JD\n\n';
  
  response += '💡 **القرار:**\n';
  if (revChange > 0 && profitChange > 0) {
    response += '✅ **تحسن ممتاز!** الإيراد والربح في نمو.\n';
    response += 'استمر على نفس الاستراتيجية!';
  } else if (revChange > 0 && profitChange <= 0) {
    response += '⚠️ **انتبه!** الإيراد زاد لكن الربح انخفض.\n';
    response += '→ التكاليف زادت بنسبة أكبر من الإيراد\n';
    response += '→ راجع المصروفات وتكلفة البضاعة';
  } else if (revChange <= 0 && profitChange > 0) {
    response += '👍 **إدارة جيدة!** رغم انخفاض الإيراد، الربح تحسن.\n';
    response += 'التكاليف مُدارة بكفاءة.';
  } else {
    response += '🚨 **تراجع!** انخفاض في الإيراد والربح.\n';
    response += '→ راجع جودة المنتجات والخدمة\n';
    response += '→ فعّل عروض ترويجية\n';
    response += '→ قلل المصروفات غير الضرورية';
  }
  
  return response;
}

function generateActionPlan(ctx, d) {
  var response = '🗺️ **خطة العمل - ' + ctx.month + '**\n\n';
  
  var actions = [];
  var priority = 1;
  
  // تحليل الوضع وتحديد الإجراءات
  if (ctx.profit < 0) {
    actions.push({p: priority++, a: '🚨 وقف الخسارة', d: 'راجع كل المصروفات وأوقف غير الضروري منها'});
  }
  
  if (ctx.cogsRatio > 38) {
    actions.push({p: priority++, a: '🛒 خفض تكلفة البضاعة', d: 'تفاوض مع الموردين أو ابحث عن بدائل (الهدف: 32%)'});
  }
  
  if (ctx.salaryRatio > 32) {
    actions.push({p: priority++, a: '👥 تحسين الورديات', d: 'راجع جدولة الموظفين حسب أوقات الذروة'});
  }
  
  var unpaid = d.obligations.filter(function(o) { return !o.paid && o.amt > 0; });
  if (unpaid.length > 0) {
    actions.push({p: priority++, a: '📋 سداد الالتزامات', d: unpaid.length + ' التزامات متأخرة بقيمة ' + n3(unpaid.reduce(function(s,o){return s+o.amt;},0)) + ' JD'});
  }
  
  if (ctx.margin < 15 && ctx.profit >= 0) {
    actions.push({p: priority++, a: '💰 زيادة الهامش', d: 'راجع أسعار القائمة - ارفع 5-10%'});
  }
  
  if (ctx.activeDays < ctx.totalDays * 0.7) {
    actions.push({p: priority++, a: '📅 تحسين الانتظام', d: 'أكمل إدخال البيانات اليومية'});
  }
  
  if (actions.length === 0) {
    actions.push({p: 1, a: '📈 التوسع والنمو', d: 'الوضع ممتاز - فكر في إضافة منتجات جديدة'});
    actions.push({p: 2, a: '📱 التسويق الرقمي', d: 'زيادة الحضور على السوشيال ميديا'});
  }
  
  response += '📋 **الإجراءات حسب الأولوية:**\n\n';
  actions.forEach(function(a) {
    response += '**' + a.p + '. ' + a.a + '**\n';
    response += '   → ' + a.d + '\n\n';
  });
  
  response += '⏰ **نصيحة:** ابدأ بالإجراء #1 هذا الأسبوع!';
  
  return response;
}

function analyzeSalaries(ctx, d) {
  var response = '👥 **تحليل الرواتب - ' + ctx.month + '**\n\n';
  
  response += '💵 **الإجمالي:** ' + n3(ctx.salaries) + ' JD (' + ctx.salaryRatio.toFixed(0) + '% من الإيراد)\n\n';
  
  // المعيار
  var standard = ctx.revenue * 0.28;
  var diff = ctx.salaries - standard;
  
  response += '📊 **المقارنة بالمعيار:**\n';
  response += '• المعيار (28%): ' + n3(standard) + ' JD\n';
  response += '• الفرق: ' + (diff > 0 ? '+' : '') + n3(diff) + ' JD\n\n';
  
  response += '💡 **القرار:**\n';
  if (ctx.salaryRatio <= 25) {
    response += '✅ تكلفة العمالة ممتازة!\n';
    response += 'يمكنك التفكير في تحسينات للموظفين أو مكافآت.';
  } else if (ctx.salaryRatio <= 32) {
    response += '👍 تكلفة العمالة مقبولة.\n';
    response += 'راقب الوضع ولا تزد عدد الموظفين حالياً.';
  } else if (ctx.salaryRatio <= 40) {
    response += '⚠️ تكلفة العمالة مرتفعة.\n';
    response += '• راجع جدولة الورديات\n';
    response += '• هل عدد الموظفين مناسب لحجم العمل؟';
  } else {
    response += '🚨 تكلفة العمالة خطيرة!\n';
    response += '• الرواتب تستهلك ' + ctx.salaryRatio.toFixed(0) + '% من الإيراد\n';
    response += '• يجب إعادة هيكلة فريق العمل\n';
    response += '• أو زيادة الإيرادات بشكل كبير';
  }
  
  return response;
}

function analyzeObligations(ctx, d) {
  var response = '📋 **تحليل الالتزامات - ' + ctx.month + '**\n\n';
  
  var paid = d.obligations.filter(function(o) { return o.paid; });
  var unpaid = d.obligations.filter(function(o) { return !o.paid && o.amt > 0; });
  var paidTotal = paid.reduce(function(s,o){return s+(o.amt||0);},0);
  var unpaidTotal = unpaid.reduce(function(s,o){return s+(o.amt||0);},0);
  
  response += '💵 **الإجمالي:** ' + n3(ctx.obligations) + ' JD\n';
  response += '✅ المسدد: ' + n3(paidTotal) + ' JD (' + paid.length + ')\n';
  response += '❌ غير المسدد: ' + n3(unpaidTotal) + ' JD (' + unpaid.length + ')\n\n';
  
  if (unpaid.length > 0) {
    response += '📝 **الالتزامات المتأخرة:**\n';
    unpaid.forEach(function(o) {
      response += '• ' + o.name + ': ' + n3(o.amt) + ' JD\n';
    });
    response += '\n';
  }
  
  // نسبة الالتزامات للإيراد
  var oblRatio = ctx.revenue > 0 ? (ctx.obligations / ctx.revenue * 100) : 0;
  
  response += '💡 **القرار:**\n';
  if (unpaid.length > 2) {
    response += '🚨 **تحذير:** ' + unpaid.length + ' التزامات متأخرة!\n';
    response += 'سدد فوراً لتجنب الغرامات والمشاكل.';
  } else if (oblRatio > 20) {
    response += '⚠️ الالتزامات مرتفعة (' + oblRatio.toFixed(0) + '% من الإيراد)\n';
    response += 'حاول إعادة التفاوض على الإيجار أو الأقساط.';
  } else if (unpaid.length > 0) {
    response += '👍 وضع مقبول. فقط سدد الالتزامات المتأخرة.';
  } else {
    response += '✅ ممتاز! جميع الالتزامات مسددة.';
  }
  
  return response;
}

function generateFullReport(ctx, d) {
  var alerts = [];
  if (ctx.profit < 0) alerts.push('🚨 خسارة');
  if (ctx.cogsRatio > 40) alerts.push('⚠️ COGS مرتفع');
  if (ctx.salaryRatio > 35) alerts.push('⚠️ رواتب مرتفعة');
  
  var response = '📈 **التقرير الشامل - ' + ctx.month + '**\n\n';
  
  if (alerts.length > 0) {
    response += '🔔 **تنبيهات:** ' + alerts.join(' | ') + '\n\n';
  }
  
  response += '═══════════════════════════\n';
  response += '💰 **الإيرادات**\n';
  response += '   الإجمالي: ' + n3(ctx.revenue) + ' JD\n';
  response += '   المتوسط: ' + n3(ctx.avgDaily) + ' JD/يوم\n';
  response += '═══════════════════════════\n';
  response += '📉 **المصروفات**\n';
  response += '   الإجمالي: ' + n3(ctx.expenses) + ' JD\n';
  response += '   COGS: ' + ctx.cogsRatio.toFixed(0) + '%\n';
  response += '   رواتب: ' + ctx.salaryRatio.toFixed(0) + '%\n';
  response += '═══════════════════════════\n';
  response += '📊 **النتيجة**\n';
  response += '   الربح: **' + n3(ctx.profit) + ' JD**\n';
  response += '   الهامش: **' + ctx.margin.toFixed(1) + '%**\n';
  response += '═══════════════════════════\n\n';
  
  // التقييم السريع
  var score = 0;
  if (ctx.margin >= 15) score += 40;
  else if (ctx.margin >= 5) score += 20;
  if (ctx.cogsRatio <= 35) score += 30;
  else if (ctx.cogsRatio <= 45) score += 15;
  if (ctx.salaryRatio <= 30) score += 30;
  else if (ctx.salaryRatio <= 40) score += 15;
  
  response += '⭐ **التقييم: ' + score + '/100**\n';
  if (score >= 80) response += '✅ أداء ممتاز!';
  else if (score >= 50) response += '👍 أداء جيد مع مجال للتحسين';
  else response += '⚠️ يحتاج تحسينات جوهرية';
  
  return response;
}

function generateQuickDecision(ctx, d, question) {
  // الرد الافتراضي الذكي بناءً على الوضع الحالي
  var response = '💡 **تحليل سريع - ' + ctx.month + '**\n\n';
  
  // الوضع العام
  if (ctx.profit < 0) {
    response += '🚨 **الوضع:** خسارة ' + n3(Math.abs(ctx.profit)) + ' JD\n\n';
    response += '**الإجراء الفوري:**\n';
    response += '1. راجع المصروفات الكبيرة\n';
    response += '2. ارفع الأسعار 10%\n';
    response += '3. قلل الهدر';
  } else if (ctx.margin < 10) {
    response += '⚠️ **الوضع:** ربح ضعيف (' + ctx.margin.toFixed(1) + '%)\n\n';
    response += '**الإجراء المقترح:**\n';
    response += '1. تفاوض مع الموردين\n';
    response += '2. راجع أسعار القائمة';
  } else {
    response += '✅ **الوضع:** جيد (هامش ' + ctx.margin.toFixed(1) + '%)\n\n';
    response += '**الأرقام:**\n';
    response += '• الإيراد: ' + n3(ctx.revenue) + ' JD\n';
    response += '• الربح: ' + n3(ctx.profit) + ' JD\n\n';
    response += '💬 اسألني عن: الاتجاه، التوقعات، التنبيهات، التكاليف، الرواتب...';
  }
  
  return response;
}

// ═══════════════════════════════════════════════════════════════════════════
// تكامل البطاقات الجديدة مع النظام (مُدمج في updateDash الأصلي)
// ═══════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════
