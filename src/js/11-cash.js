/* CASH BOX — تحديث فوري عند تغيير الالتزامات */
function calcCash(){
  const open=pf("cfOpen"),act=pf("cfAct");G().cashflow={opening:open,actual:act};
  const t=totals();
  const oblPaid=G().obligations.filter(o=>o.paid).reduce((s,o)=>s+(o.amt||0),0);
  // السلف المستحقة فقط (مستحقة أو مسددة جزئياً) — لا تُحتسب المسددة بالكامل
  const advAll=G().advances.filter(a=>a.status==="مستحقة"||a.status==="مسددة جزئياً").reduce((s,a)=>s+(a.amt||0),0);
  // الصندوق: رصيد أول المدة + نقد مستلم − مشتريات − التزامات مدفوعة − سلف
  const exp=open+t.cash-t.bycat.total-oblPaid-advAll;
  const diff=act-exp;
  T("cf-open",n3(open));T("cf-cash",n3(t.cash));T("cf-purch",n3(t.bycat.total));T("cf-obl",n3(oblPaid));T("cf-adv",n3(advAll));T("cf-exp",n3(exp));T("cf-act2",n3(act));
  const de=$("cf-diff");if(de){de.textContent=`${diff>=0?"+":""}${n3(diff)}`;de.className=`rl-val big ${diff>=0?"cr":"dr"}`;}
  const res=$("cf-result");if(res)res.className=`rpt-line ${diff>=0?"net-p":"net-n"}`;
  saveAll();
}

