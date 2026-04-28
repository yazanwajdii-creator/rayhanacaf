/* DASHBOARD */

/* ═══════════════════════════════════════════════════════════════════════════
   V24-2 FIX: حساب صافي المدير
   
   التدفق الصحيح:
   1. الموظفة تغلق الكاش (مثلاً 300 JD)
   2. تدفع يوميات الموظفين (مثلاً 50 JD) = المدفوعات
   3. تسلم المسؤول النقد الصافي (250 JD) = cash
   
   إذن:
   - النقد المُدخل (cash) = صافي بعد خصم اليوميات
   - المدفوعات (pmts) = اليوميات التي خرجت من الكاش
   - صافي المدير = cash - مشتريات فقط (اليوميات خُصمت مسبقاً!)
═══════════════════════════════════════════════════════════════════════════ */
function updateMgrTotals(){
  var d=G();
  var yz={r:0,p:0},ab={r:0,p:0},un={r:0,p:0};
  
  // حساب النقدي الصافي المستلم لكل مدير (بعد خصم اليوميات من الموظفة)
  d.sales.forEach(function(s){
    var cash=(s.cash||0); // هذا هو النقد الصافي بعد خصم اليوميات
    if(!cash && !(s.receivedBy)) return;
    if(s.receivedBy==="يزن")yz.r+=cash;
    else if(s.receivedBy==="عبدالرحمن")ab.r+=cash;
    else un.r+=cash;
  });
  
  // حساب المشتريات لكل مدير
  d.purchases.forEach(function(p){
    if(p.buyer==="يزن")yz.p+=p.amt;
    else if(p.buyer==="عبدالرحمن")ab.p+=p.amt;
    else un.p+=p.amt;
  });
  
  T("mgr-yz-r",n3(yz.r)+" JD");T("mgr-yz-p",n3(yz.p)+" JD");
  T("mgr-ab-r",n3(ab.r)+" JD");T("mgr-ab-p",n3(ab.p)+" JD");
  T("mgr-un-r",n3(un.r)+" JD");T("mgr-un-p",n3(un.p)+" JD");
  // صافي كل مدير = نقد مستلم − مشتريات أجراها
  var yN=yz.r-yz.p, aN=ab.r-ab.p;
  var yn=document.getElementById("mgr-yz-n"), an=document.getElementById("mgr-ab-n");
  if(yn){yn.textContent=n3(yN)+" JD";yn.style.color=yN>=0?"var(--gn)":"var(--rd)";}
  if(an){an.textContent=n3(aN)+" JD";an.style.color=aN>=0?"var(--gn)":"var(--rd)";}

  var tR=yz.r+ab.r||1,tP=yz.p+ab.p||1;
  var b1=document.getElementById("b-yz-r"),b2=document.getElementById("b-ab-r");
  var b3=document.getElementById("b-yz-p"),b4=document.getElementById("b-ab-p");
  if(b1)b1.style.width=(yz.r/tR*100).toFixed(0)+"%";
  if(b2)b2.style.width=(ab.r/tR*100).toFixed(0)+"%";
  if(b3)b3.style.width=(yz.p/tP*100).toFixed(0)+"%";
  if(b4)b4.style.width=(ab.p/tP*100).toFixed(0)+"%";
  var s=[];if(yz.r>0)s.push("يزن: "+n3(yz.r));if(ab.r>0)s.push("عبدالرحمن: "+n3(ab.r));
  T("t-who-sum",s.join(" | ")||"—");
}
function updateDash(){
  const t=totals(),d=G();
  
  // V24-2: تحديث جميع البطاقات مباشرة
  T("kv-rev",n3(t.rev));T("kv-nrev",n3(t.netSales));T("kv-profit",n3(t.profit));T("kv-exp",n3(t.totalExp));
  // هامش الربح + مؤشر الصحة المدمج
  var _hs=Math.max(0,Math.min(100,Math.round(50+(t.margin>=20?30:t.margin>=15?15:t.margin>=10?8:t.margin>=5?2:t.margin<0?-25:0)+(t.cogsRatio<=28?20:t.cogsRatio<=35?15:t.cogsRatio<=40?8:t.cogsRatio<=45?2:-10)+(t.salaryRatio<=25?15:t.salaryRatio<=30?10:t.salaryRatio<=35?5:-5))));
  T("kv-margin","هامش "+t.margin.toFixed(1)+"% · صحة "+_hs+"/100");
  // تحديث البيانات الفرعية للبطاقات
  T("kv-avg-daily", t.avgDaily>0 ? `متوسط ${n3(t.avgDaily)} JD/يوم` : 'لا توجد بيانات بعد');
  T("kv-cogs-ratio", t.netSales>0 ? `COGS ${t.cogsRatio.toFixed(1)}%` : 'صافي البيع');
  T("kv-exp-ratio", t.netSales>0 ? `${t.expRatio.toFixed(1)}% من صافي البيع` : 'المصروفات الفعلية');
  // ألوان ديناميكية لبطاقة الربح
  var profitTile=document.getElementById('kv-profit-tile');
  if(profitTile){
    profitTile.style.borderTopColor=t.profit>=0?'var(--gn)':'var(--rd)';
    var pv=document.getElementById('kv-profit');
    if(pv) pv.style.color=t.profit>=0?'var(--gn)':'var(--rd)';
  }
  // شريط تحذير الرواتب المستحقة
  var accrBanner=document.getElementById('kv-accrued');
  var accrTxt=document.getElementById('kv-accrued-txt');
  if(accrBanner){
    if(t.mSalAccrued>0){
      accrBanner.style.display='flex';
      if(accrTxt) accrTxt.textContent='رواتب مستحقة ⏳ '+n3(t.mSalAccrued)+' JD — لا تُطرح من الربح حتى تُسجَّل كمدفوعة ✅';
    } else {
      accrBanner.style.display='none';
    }
  }
  
  // V24-2: تحديث البطاقات الجديدة
  var profitHeroValue = document.getElementById('profitHeroValue');
  if (profitHeroValue) profitHeroValue.textContent = n3(t.profit) + ' JD';
  
  var kpiRevenue = document.getElementById('kpiRevenue');
  if (kpiRevenue) kpiRevenue.textContent = n3(t.rev);
  
  var kpiExpenses = document.getElementById('kpiExpenses');
  if (kpiExpenses) kpiExpenses.textContent = n3(t.totalExp);
  
  var activeDays = (d.sales||[]).filter(function(s) { return (s.cash||0)+(s.visa||0)+(s.pmts||0) > 0; }).length;
  var kpiAvgDaily = document.getElementById('kpiAvgDaily');
  if (kpiAvgDaily) kpiAvgDaily.textContent = activeDays > 0 ? n3(t.rev / activeDays) : '0';
  
  // Line chart
  const lx=$("chLine");
  if(lx){if(CH.l){try{CH.l.destroy();}catch(e){}CH.l=null;}
    const g=lx.getContext("2d").createLinearGradient(0,0,0,270);g.addColorStop(0,"rgba(200,146,15,.3)");g.addColorStop(1,"rgba(200,146,15,0)");
    const g2=lx.getContext("2d").createLinearGradient(0,0,0,270);g2.addColorStop(0,"rgba(59,130,246,.25)");g2.addColorStop(1,"rgba(59,130,246,0)");
    CH.l=new Chart(lx,{type:"line",data:{labels:d.sales.map(s=>s.day),datasets:[
      {label:"إجمالي الإيراد",data:d.sales.map(s=>(s.cash||0)+(s.visa||0)+(s.pmts||0)),borderColor:"#C8920F",backgroundColor:g,tension:.4,fill:true,borderWidth:2.5,pointRadius:3,pointHoverRadius:6,pointBackgroundColor:"#C8920F",pointBorderColor:"#fff",pointBorderWidth:1.5},
      {label:"صافي البيع",data:d.sales.map(s=>(s.cash||0)+(s.visa||0)),borderColor:"#3B82F6",backgroundColor:g2,tension:.4,fill:true,borderWidth:2,pointRadius:2.5,pointHoverRadius:5}
    ]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:"index",intersect:false},
      plugins:{legend:{labels:{boxWidth:12,font:{size:12,family:"IBM Plex Sans Arabic"}}},tooltip:{backgroundColor:"rgba(15,6,4,.92)",titleFont:{family:"IBM Plex Sans Arabic"},bodyFont:{family:"IBM Plex Mono"},padding:11,cornerRadius:8,callbacks:{label:c=>`${c.dataset.label}: ${n3(c.raw)} JD`}}},
      scales:{y:{beginAtZero:true,ticks:{callback:v=>v+" JD",font:{size:10,family:"IBM Plex Mono"}},grid:{color:"rgba(0,0,0,.05)"}},x:{ticks:{font:{size:10}},grid:{display:false}}}}});}
  // Pie
  const px=$("chPie");
  if(px){if(CH.p){try{CH.p.destroy();}catch(e){}CH.p=null;}
    const cats=[],vals=[];
    if(t.bycat.COGS>0){cats.push("COGS");vals.push(t.bycat.COGS);}if(t.bycat.OPS>0){cats.push("تشغيلية");vals.push(t.bycat.OPS);}if(t.bycat.ADM>0){cats.push("إدارية");vals.push(t.bycat.ADM);}if(t.bycat.MKT>0){cats.push("تسويقية");vals.push(t.bycat.MKT);}
    t.obls.forEach(o=>{if(o.paid&&o.amt>0){cats.push(o.name+" ✅");vals.push(o.amt);}});
    if(t.mSalPaid>0){cats.push("رواتب مدفوعة ✅");vals.push(t.mSalPaid);}if(t.mSalAccrued>0){cats.push("رواتب مستحقة ⏳");vals.push(t.mSalAccrued);}if(t.dwTotal>0){cats.push("أجور يومية");vals.push(t.dwTotal);}
    if(vals.length)CH.p=new Chart(px,{type:"doughnut",data:{labels:cats,datasets:[{data:vals,backgroundColor:["#C8920F","#3B82F6","#10B981","#8B5CF6","#EF4444","#F59E0B","#0891B2","#059669"],borderWidth:2.5,borderColor:"#fff",hoverOffset:6}]},options:{responsive:true,maintainAspectRatio:false,cutout:"65%",plugins:{legend:{position:"right",labels:{boxWidth:11,font:{size:11},padding:11}},tooltip:{backgroundColor:"rgba(15,6,4,.92)",callbacks:{label:c=>`${c.label}: ${n3(c.raw)} JD`}}}}});}
  // Top suppliers
  const sx=$("chSD");
  if(sx){if(CH.sd){try{CH.sd.destroy();}catch(e){}CH.sd=null;}
    const sm={};G().purchases.forEach(p=>{sm[p.sName]=(sm[p.sName]||0)+p.amt;});
    const ents=Object.entries(sm).sort((a,b)=>b[1]-a[1]).slice(0,5);
    if(ents.length)CH.sd=new Chart(sx,{type:"bar",data:{labels:ents.map(([n])=>n),datasets:[{data:ents.map(([,v])=>v),backgroundColor:"#0070F2",borderRadius:5,borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,indexAxis:"y",plugins:{legend:{display:false},tooltip:{backgroundColor:"rgba(15,6,4,.92)",callbacks:{label:c=>`${n3(c.raw)} JD`}}},scales:{x:{beginAtZero:true,ticks:{callback:v=>v+" JD",font:{size:10}},grid:{color:"rgba(0,0,0,.05)"}},y:{ticks:{font:{size:11}},grid:{display:false}}}}});}
  // KPIs
  const active=d.sales.filter(s=>(s.cash||0)+(s.visa||0)+(s.pmts||0)>0);
  const maxD=Math.max(0,...d.sales.map(s=>(s.cash||0)+(s.visa||0)+(s.pmts||0)));
  const minD=active.length?Math.min(...active.map(s=>(s.cash||0)+(s.visa||0)+(s.pmts||0))):0;
  const avg=active.length?t.rev/active.length:0;
  const days=daysIn(S.activeKey);
  const kb=$("kpiBox");
  if(kb)kb.innerHTML=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
    <div style="background:var(--ywl);border:1px solid var(--ywb);border-radius:8px;padding:11px;text-align:center"><div style="font-size:10.5px;font-weight:600;color:var(--ywd);margin-bottom:4px">متوسط اليومي</div><div style="font-size:16px;font-weight:700;font-family:'IBM Plex Mono'">${n3(avg)}</div><div style="font-size:10px;color:var(--tx3)">JD</div></div>
    <div style="background:var(--gnl);border:1px solid var(--gnb);border-radius:8px;padding:11px;text-align:center"><div style="font-size:10.5px;font-weight:600;color:var(--gnd);margin-bottom:4px">أعلى يوم</div><div style="font-size:16px;font-weight:700;font-family:'IBM Plex Mono';color:var(--gnd)">${n3(maxD)}</div><div style="font-size:10px;color:var(--tx3)">JD</div></div>
    <div style="background:var(--rdl);border:1px solid var(--rdb);border-radius:8px;padding:11px;text-align:center"><div style="font-size:10.5px;font-weight:600;color:var(--rdd);margin-bottom:4px">أدنى يوم</div><div style="font-size:16px;font-weight:700;font-family:'IBM Plex Mono';color:var(--rdd)">${n3(minD)}</div><div style="font-size:10px;color:var(--tx3)">JD</div></div>
    <div style="background:var(--bll);border:1px solid var(--blb);border-radius:8px;padding:11px;text-align:center"><div style="font-size:10.5px;font-weight:600;color:var(--bld);margin-bottom:4px">أيام التشغيل</div><div style="font-size:16px;font-weight:700;font-family:'IBM Plex Mono';color:var(--bld)">${active.length}/${days}</div><div style="font-size:10px;color:var(--tx3)">يوم</div></div>
  </div>`;
  genInsights(t,d,active,avg,maxD,days);
  updateMgrTotals();
  
  // V15 ULTIMATE - تحديث كل البطاقات الجديدة
  setTimeout(function() {
    try { updateLiveStats(); } catch(e) {}
    try { updateGoalTracker(); } catch(e) {}
    try { updateAnalyticsCards(); } catch(e) {}
    try { updateHealthCardNew(); } catch(e) {}
    try { updateBreakevenCardNew(); } catch(e) {}
    try { updateWeeklyCardNew(); } catch(e) {}
    try { updateForecastCard(); } catch(e) {}
    try { updatePeriodCompare(); } catch(e) {}
    try { updateCostAnalysis(); } catch(e) {}
    try { updateSmartAlertsV15(); } catch(e) {}
    try { updateShiftSummary(); } catch(e) {}
    try { updateDailyInsights(); } catch(e) {}
    try { updateQuickInsights(); } catch(e) {}
    try { updateComparisons(); } catch(e) {}
  }, 50);
}
function genInsights(t,d,active,avg,maxD,days){
  const c=$("aiBox");if(!c)return;
  if(!active.length){c.innerHTML='<div class="alert al-i">⏳ أدخل بيانات الإيرادات لتفعيل التحليل</div>';return;}
  const ins=[];
  const[,m]=S.activeKey.split("-");
  const daysEntered = active.length;       // عدد الأيام المُدخلة
  const daysLeft = days - daysEntered;     // الأيام المتبقية
  const monthProgress = daysEntered / days; // نسبة اكتمال الشهر
  const isEarlyMonth = daysEntered <= 7;   // أول أسبوع
  const isMidMonth = daysEntered > 7 && daysEntered <= 20;
  const isLateMonth = daysEntered > 20;

  // ── تقدم الشهر ──
  const progressPct = Math.round(monthProgress * 100);
  ins.push({
    cls: "ins-b",
    ico: "📅",
    txt: `تقدم الشهر: ${daysEntered} من ${days} يوم (${progressPct}%) — متوسط يومي: ${n3(avg)} JD`
  });

  // ── الإسقاط التقديري (دائماً يظهر) ──
  if(avg > 0 && daysLeft > 0){
    const projected = t.rev + (avg * daysLeft);
    ins.push({
      cls: "ins-b",
      ico: "🎯",
      txt: `الإسقاط المتوقع نهاية الشهر: ${n3(projected)} JD (${daysLeft} يوم متبقي)`
    });
  }

  // ── تحليل الهامش — فقط بعد أسبوع ──
  if(!isEarlyMonth){
    // ═══════════════════════════════════════════════════════════════════════════
    // V24-2 FIX: إصلاح تحليل نقطة التعادل
    // المشكلة: OPS كانت تُصنَّف كتكاليف متغيرة مع COGS
    // الإصلاح: OPS انتقلت إلى التكاليف الثابتة، والمتغير أصبح COGS فقط
    // ═══════════════════════════════════════════════════════════════════════════
    // التكاليف الثابتة = التزامات مدفوعة + رواتب شهرية + OPS + ADM
    // التكاليف الثابتة = التزامات مدفوعة + رواتب مدفوعة + مصاريف إدارية/تشغيلية
    const fixedCosts = t.oblPaid + (t.mSalPaid||0) + (t.bycat.OPS||0) + (t.bycat.ADM||0);
    const fixedSoFar = fixedCosts * monthProgress; // حصة الأيام المنقضية من التكاليف الثابتة
    // التكاليف المتغيرة = COGS فقط (تتغير مع حجم المبيعات)
    const variableCosts = t.bycat.COGS;
    const adjustedProfit = t.rev - variableCosts - fixedSoFar;
    const adjustedMargin = t.rev > 0 ? adjustedProfit / t.rev * 100 : 0;

    if(adjustedMargin >= 20) ins.push({cls:"ins-g",ico:"📈",txt:`هامش الربح حتى الآن ممتاز (${adjustedMargin.toFixed(1)}%) — أداء قوي.`});
    else if(adjustedMargin >= 10) ins.push({cls:"ins-y",ico:"📊",txt:`هامش مقبول حتى الآن (${adjustedMargin.toFixed(1)}%) — مجال للتحسين.`});
    else if(adjustedMargin >= 0) ins.push({cls:"ins-y",ico:"⚠️",txt:`هامش منخفض حتى الآن (${adjustedMargin.toFixed(1)}%) — راجع التكاليف.`});
    else ins.push({cls:"ins-r",ico:"🚨",txt:`الإيراد لا يغطي التكاليف حتى الآن (${adjustedMargin.toFixed(1)}%) — راجع المصروفات.`});
  } else {
    // أول أسبوع — فقط عرض المتوسط
    ins.push({cls:"ins-b",ico:"💡",txt:`أول أسبوع من الشهر — التحليل المالي الكامل يظهر بعد اليوم 7.`});
  }

  // ── نسبة COGS — فقط إذا كافية البيانات ──
  if(t.rev > 0 && !isEarlyMonth){
    const cp = t.bycat.COGS / t.rev * 100;
    if(cp > 45) ins.push({cls:"ins-r",ico:"🛒",txt:`نسبة تكلفة البضاعة مرتفعة (${cp.toFixed(1)}%) — المعيار للمقاهي 28-35%.`});
    else if(cp > 35) ins.push({cls:"ins-y",ico:"🛒",txt:`نسبة تكلفة البضاعة (${cp.toFixed(1)}%) — قريبة من الحد الأعلى للمعيار.`});
    else if(cp > 0) ins.push({cls:"ins-g",ico:"✅",txt:`نسبة تكلفة البضاعة جيدة (${cp.toFixed(1)}%) — ضمن المعيار.`});
  }

  // ── الالتزامات غير المسددة ──
  const up = G().obligations.filter(o=>!o.paid&&o.amt>0);
  if(up.length){
    const total = up.reduce((s,o)=>s+o.amt,0);
    ins.push({cls:"ins-y",ico:"📋",txt:`${up.length} التزامات معلقة (${n3(total)} JD): ${up.map(o=>o.name).join("، ")}`});
  }

  // ── أيام ضعيفة — فقط إذا كافية البيانات ──
  if(daysEntered >= 5 && avg > 50){
    const an = active.filter(s=>{
      const tot=(s.cash||0)+(s.visa||0)+(s.pmts||0);
      return tot < avg*0.5;
    });
    if(an.length) ins.push({cls:"ins-y",ico:"⚠️",txt:`${an.length} أيام بإيراد أقل من النصف: ${an.map(s=>`${s.day}/${m}`).join("، ")}`});
  }

  // ── أفضل يوم ──
  const mx = d.sales.find(s=>(s.cash||0)+(s.visa||0)+(s.pmts||0)===maxD);
  if(mx && maxD > 0) ins.push({cls:"ins-g",ico:"🏆",txt:`أفضل يوم: ${mx.day}/${m} — ${n3(maxD)} JD`});

  c.innerHTML = ins.map(i=>`<div class="insight ${i.cls}"><span style="font-size:16px;flex-shrink:0">${i.ico}</span><span>${i.txt}</span></div>`).join("");
}

