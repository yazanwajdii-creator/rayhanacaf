/* REPORTS */
/* ═══════════════════════════════════════════════════════════════════════════
   V24-2 FIX: تحديث التقرير ليعكس الحسابات الصحيحة
   - المدفوعات اليومية (pmts) تظهر في الإيرادات للتوثيق
   - الالتزامات المدفوعة فقط تُحسب في المصاريف
   - لا خسارة وهمية بسبب التزامات لم تُدفع بعد
═══════════════════════════════════════════════════════════════════════════ */
function updateRpt(){
  const t=totals();
  const ym=S.activeKey.split('-');
  const mn=MN[parseInt(ym[1])-1];
  T('rpt-month-label', mn+' '+ym[0]);

  // ── Hero Card ──
  const profitCard=document.getElementById('rpt-hero-profit-card');
  const isProfit=t.profit>=0;
  if(profitCard) profitCard.className='rpt-hero-card rpt-hero-main'+(isProfit?'':' loss');
  T('r-profit', n3(t.profit));
  T('r-profit-2', n3(t.profit)+' JD');
  T('r-margin', 'Net Margin: '+t.margin.toFixed(2)+'%');
  T('r-margin-2', 'Net Margin: '+t.margin.toFixed(2)+'%');
  // Net result section color
  const netRes=document.getElementById('rpt-result');
  if(netRes) netRes.className='rpt-net-result '+(isProfit?'profit':'loss');
  // Health badge
  var _hs=Math.max(0,Math.min(100,Math.round(50+(t.margin>=20?30:t.margin>=15?15:t.margin>=10?8:t.margin>=5?2:t.margin<0?-25:0)+(t.cogsRatio<=28?20:t.cogsRatio<=35?15:t.cogsRatio<=40?8:t.cogsRatio<=45?2:-10)+(t.salaryRatio<=25?15:t.salaryRatio<=30?10:t.salaryRatio<=35?5:-5))));
  var hBadge=document.getElementById('rpt-health-badge');
  if(hBadge){
    hBadge.textContent='مؤشر الصحة '+_hs+'/100';
    hBadge.style.background=_hs>=70?'var(--gnb)':_hs>=45?'var(--ywb)':'var(--rdb)';
    hBadge.style.color=_hs>=70?'var(--gn)':_hs>=45?'var(--yw)':'var(--rd)';
  }
  // Mini cards
  T('r-nrev', n3(t.netSales)+' JD');
  T('r-nrev-2', n3(t.netSales)+' JD');
  T('rpt-exp-val', n3(t.totalExp)+' JD');
  T('rpt-gross-val', n3(t.grossP)+' JD');

  // ── Ratio Bars ──
  function setBar(barId, valId, pct, good, warn){
    var bar=document.getElementById(barId);
    var valEl=document.getElementById(valId);
    if(!bar||!valEl) return;
    var color=pct<=good?'var(--gn)':pct<=warn?'var(--yw)':'var(--rd)';
    bar.style.width=Math.min(100,pct).toFixed(1)+'%';
    bar.style.background=color;
    valEl.style.color=color;
    valEl.textContent=pct.toFixed(1)+'%';
  }
  // هامش الربح — مرتفع = أخضر
  var mBar=document.getElementById('bar-margin');
  var mVal=document.getElementById('rpt-margin-pct');
  if(mBar&&mVal){
    var mp=Math.max(0,t.margin);
    mBar.style.width=Math.min(100,mp*2).toFixed(1)+'%'; // scale: 50% = 100% width
    mBar.style.background=t.margin>=20?'var(--gn)':t.margin>=10?'var(--yw)':'var(--rd)';
    mVal.style.color=t.margin>=20?'var(--gn)':t.margin>=10?'var(--yw)':'var(--rd)';
    mVal.textContent=t.margin.toFixed(1)+'%';
  }
  setBar('bar-cogs','rpt-cogs-pct',t.cogsRatio,35,45);
  setBar('bar-sal','rpt-sal-pct',t.salaryRatio,30,40);
  setBar('bar-exp','rpt-exp-pct',t.expRatio,70,85);

  // ── Statement Lines ──
  T('r-cash', n3(t.cash)+' JD');
  T('r-visa', n3(t.visa)+' JD');
  T('r-pmts', n3(t.pmts)+' JD');
  T('r-rev', n3(t.rev)+' JD');
  T('r-cogs', n3(t.bycat.COGS)+' JD');
  // Gross profit color
  var gEl=document.getElementById('r-gross');
  if(gEl){gEl.textContent=n3(t.grossP)+' JD';gEl.className='rpt-row-val bold '+(t.grossP>=0?'green':'red');}

  // Obligations
  const oblTot=t.obls.filter(o=>o.amt>0).reduce((s,o)=>s+o.amt,0);
  T('r-obl-total-val', n3(oblTot)+' JD');
  const or=document.getElementById('r-obl-rows');
  if(or) or.innerHTML=t.obls.filter(o=>o.amt>0).map(o=>
    `<div class="rpt-row rpt-row-sub${!o.paid?' rpt-row-muted':''}">
      <span class="rpt-row-lbl">${o.paid?'✅':'⏳'} ${o.name}${!o.paid?' <small>غير مدفوع — لا يُطرح</small>':''}</span>
      <span class="rpt-row-val ${o.paid?'red':'muted'}">${n3(o.amt)} JD</span>
    </div>`).join('');

  // Salaries
  T('r-sal-total', n3(t.mSalPaid)+' JD');
  T('r-msal', n3(t.mSalPaid)+' JD');
  T('r-msal-accrued', n3(t.mSalAccrued)+' JD');
  // Hide accrued row if zero
  var accRow=document.getElementById('r-accrued-row');
  if(accRow) accRow.style.display=t.mSalAccrued>0?'flex':'none';
  // Daily wages — show per-employee breakdown
  var dwSec=document.getElementById('r-dwages-section');
  var dwRows=document.getElementById('r-dwages-rows');
  if(t.dwTotal>0){
    T('r-dwages',n3(t.dwTotal)+' JD');
    if(dwSec) dwSec.style.display='';
    if(dwRows){
      var _dwd=G();
      dwRows.innerHTML=S.dailyEmps.filter(function(e){var w=_dwd.dWages[e.id]||{};return(w.att||[]).length>0;}).map(function(e){
        var w=_dwd.dWages[e.id]||{};var days=(w.att||[]).length;var tot=(w.rate||0)*days;
        return '<div class="rpt-row rpt-row-sub" style="padding-right:40px">'
          +'<span class="rpt-row-lbl">👤 '+e.name+'<small> '+days+' يوم × '+n3(w.rate||0)+' JD</small></span>'
          +'<span class="rpt-row-val" style="color:var(--yw)">'+n3(tot)+' JD</span>'
          +'</div>';
      }).join('');
    }
  } else {
    if(dwSec) dwSec.style.display='none';
  }

  // Other expenses
  var otherSec=document.getElementById('r-other-section');
  var hasOther=(t.bycat.OPS+t.bycat.ADM+t.bycat.MKT)>0;
  if(otherSec) otherSec.style.display=hasOther?'block':'none';
  T('r-other-total', n3(t.bycat.OPS+t.bycat.ADM+t.bycat.MKT)+' JD');
  T('r-ops', n3(t.bycat.OPS)+' JD');
  T('r-adm', n3(t.bycat.ADM)+' JD');
  T('r-mkt', n3(t.bycat.MKT)+' JD');
  var opsR=document.getElementById('r-ops-row');
  var admR=document.getElementById('r-adm-row');
  var mktR=document.getElementById('r-mkt-row');
  if(opsR) opsR.style.display=t.bycat.OPS>0?'flex':'none';
  if(admR) admR.style.display=t.bycat.ADM>0?'flex':'none';
  if(mktR) mktR.style.display=t.bycat.MKT>0?'flex':'none';

  T('r-texp', n3(t.totalExp)+' JD');

  // Chart total label
  T('rpt-chart-total', 'إجمالي: '+n3(t.totalExp)+' JD');

  // ── Chart ──
  const ctx=document.getElementById('chRpt');
  if(!ctx) return;
  if(CH.rp){try{CH.rp.destroy();}catch(e){} CH.rp=null;}
  const cats=[],vals=[],colors=[];
  const PAL=['#C8920F','#3B82F6','#10B981','#8B5CF6','#EF4444','#F59E0B','#0891B2','#059669','#6366F1'];
  let ci=0;
  if(t.bycat.COGS>0){cats.push('COGS');vals.push(t.bycat.COGS);colors.push(PAL[ci++]);}
  t.obls.filter(o=>o.paid&&o.amt>0).forEach(o=>{cats.push(o.name+' ✅');vals.push(o.amt);colors.push(PAL[ci++%PAL.length]);});
  if(t.mSalPaid>0){cats.push('رواتب ✅');vals.push(t.mSalPaid);colors.push(PAL[ci++%PAL.length]);}
  if(t.mSalAccrued>0){cats.push('رواتب ⏳');vals.push(t.mSalAccrued);colors.push('#4B5563');}
  if(t.bycat.OPS>0){cats.push('تشغيلية');vals.push(t.bycat.OPS);colors.push(PAL[ci++%PAL.length]);}
  if(t.bycat.ADM>0){cats.push('إدارية');vals.push(t.bycat.ADM);colors.push(PAL[ci++%PAL.length]);}
  if(t.bycat.MKT>0){cats.push('تسويقية');vals.push(t.bycat.MKT);colors.push(PAL[ci++%PAL.length]);}
  if(!vals.length) return;
  CH.rp=new Chart(ctx,{type:'bar',data:{labels:cats,datasets:[{data:vals,backgroundColor:colors,borderRadius:6,borderWidth:0,borderSkipped:false}]},
    options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false},tooltip:{backgroundColor:'rgba(12,10,8,.95)',bodyColor:'var(--tx)',titleColor:'var(--gold2)',padding:10,cornerRadius:8,
        callbacks:{label:c=>`${n3(c.raw)} JD  (${t.totalExp>0?(c.raw/t.totalExp*100).toFixed(1):'0'}%)`}}},
      scales:{x:{beginAtZero:true,ticks:{callback:v=>v+' JD',font:{family:'IBM Plex Mono',size:10},color:'#5C5048'},grid:{color:'rgba(255,255,255,.04)'}},
              y:{ticks:{font:{size:11},color:'#8C8070'},grid:{display:false}}}}});
}

function getPrevMonthKey() {
  var ym = S.activeKey.split('-');
  var y = parseInt(ym[0]), m = parseInt(ym[1]);
  m--;
  if (m < 1) { m = 12; y--; }
  return y + '-' + String(m).padStart(2, '0');
}

function getPrevMonthTotals(upToDay) {
  var prevKey = getPrevMonthKey();
  if (!S.months[prevKey]) return null;
  
  var d = S.months[prevKey];
  var rev = 0, exp = 0;
  
  // إذا تم تحديد يوم معين، نجمع فقط حتى هذا اليوم
  var maxDay = upToDay || 31;
  var daysInPrevMonth = daysIn(prevKey);
  
  if (d.sales) d.sales.forEach(function(s) { 
    if (s.day <= maxDay) {
      rev += (s.cash||0) + (s.visa||0) + (s.pmts||0); 
    }
  });
  if (d.purchases) d.purchases.forEach(function(p) { 
    // المشتريات حسب التاريخ إذا موجود
    var purchDay = p.date ? parseInt(p.date.split('-')[2] || p.date.split('/')[0]) : 1;
    if (purchDay <= maxDay) {
      exp += p.amt || 0; 
    }
  });
  
  // V22: الالتزامات توزع نسبياً على الأيام (مقارنة عادلة)
  if (d.obligations) {
    var oblShare = maxDay / daysInPrevMonth;
    d.obligations.forEach(function(o) { 
      exp += (o.amt || 0) * oblShare; 
    });
  }
  
  return { rev: rev, exp: exp, profit: rev - exp, days: maxDay };
}

// دالة جديدة للحصول على مجاميع الشهر الحالي حتى يوم معين
function getCurrentMonthTotalsUpTo(upToDay) {
  var d = G();
  var rev = 0, exp = 0;
  var maxDay = upToDay || 31;
  var daysInMonth = daysIn(S.activeKey);
  
  if (d.sales) d.sales.forEach(function(s) { 
    if (s.day <= maxDay) {
      rev += (s.cash||0) + (s.visa||0) + (s.pmts||0); 
    }
  });
  if (d.purchases) d.purchases.forEach(function(p) { 
    var purchDay = p.date ? parseInt(p.date.split('-')[2] || p.date.split('/')[0]) : 1;
    if (purchDay <= maxDay) {
      exp += p.amt || 0; 
    }
  });
  
  // V22: الالتزامات توزع نسبياً على الأيام (مقارنة عادلة)
  if (d.obligations) {
    var oblShare = maxDay / daysInMonth;
    d.obligations.forEach(function(o) { 
      exp += (o.amt || 0) * oblShare; 
    });
  }
  
  return { rev: rev, exp: exp, profit: rev - exp, days: maxDay };
}

function updateComparisons() {
  var today = new Date().getDate();
  
  // مقارنة عادلة: نفس الفترة من الشهرين
  var prev = getPrevMonthTotals(today);
  var curr = getCurrentMonthTotalsUpTo(today);
  
  if (!prev) return;
  
  // مقارنة الإيراد
  var revDiff = curr.rev - prev.rev;
  var revPct = prev.rev > 0 ? (revDiff / prev.rev * 100) : 0;
  updateCompareEl('compare-rev', revDiff, revPct);
  
  // مقارنة المصروفات
  var expDiff = curr.exp - prev.exp;
  var expPct = prev.exp > 0 ? (expDiff / prev.exp * 100) : 0;
  updateCompareEl('compare-exp', -expDiff, -expPct); // عكسي - الانخفاض جيد
  
  // مقارنة الربح
  var profitDiff = curr.profit - prev.profit;
  var profitPct = Math.abs(prev.profit) > 0 ? (profitDiff / Math.abs(prev.profit) * 100) : 0;
  updateCompareEl('compare-profit', profitDiff, profitPct);
}

function updateCompareEl(id, diff, pct) {
  var el = document.getElementById(id);
  if (!el) return;
  
  var cls = diff > 0 ? 'up' : diff < 0 ? 'down' : 'same';
  var arrow = diff > 0 ? '↑' : diff < 0 ? '↓' : '→';
  
  el.className = 'compare-badge ' + cls;
  el.innerHTML = '<span class="compare-arrow">' + arrow + '</span> ' + Math.abs(pct).toFixed(0) + '%';
}

// ═══════════════════════════════════════════════════════════════════════════
// KEYBOARD SHORTCUTS
// ═══════════════════════════════════════════════════════════════════════════

