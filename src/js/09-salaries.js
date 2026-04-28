/* SALARIES */
function initSalTables(){
  const d=G(),mb=$("mSalBody");
  if(mb){mb.innerHTML="";S.monthlyEmps.forEach(e=>{const sal=d.mSal[e.id]||{base:0,allow:0,ded:0,paid:false};const isPaid=sal.paid||false;const tr=document.createElement("tr");tr.innerHTML=`<td style="font-weight:700">${e.name}</td><td><input class="inp" type="number" step="0.001" min="0" id="ms_${e.id}_b" value="${sal.base||""}" placeholder="0" onchange="calcSal()"></td><td><input class="inp" type="number" step="0.001" min="0" id="ms_${e.id}_a" value="${sal.allow||""}" placeholder="0" onchange="calcSal()"></td><td class="td-y num" id="ms_${e.id}_g">${n3((sal.base||0)+(sal.allow||0))}</td><td><input class="inp" type="number" step="0.001" min="0" id="ms_${e.id}_d" value="${sal.ded||""}" placeholder="0" onchange="calcSal()"></td><td class="td-r num" id="ms_${e.id}_av">${n3(pendAdv(e.id))}</td><td class="td-g num" id="ms_${e.id}_n">${n3((sal.base||0)+(sal.allow||0)-(sal.ded||0)-pendAdv(e.id))}</td><td style="text-align:center"><button class="obl-toggle ${isPaid?'ps':''}" id="salpay_${e.id}" onclick="toggleSalPaid('${e.id}')" style="width:44px;height:36px;font-size:18px" title="${isPaid?'مدفوع — اضغط للإلغاء':'غير مدفوع — اضغط للتأكيد'}">${isPaid?'✅':'⏳'}</button></td>`;mb.appendChild(tr);});}
  buildAttGrid();calcSal();
}
const pendAdv=empId=>G().advances.filter(a=>a.empId===empId&&(a.status==="مستحقة"||a.status==="مسددة جزئياً")).reduce((s,a)=>s+(a.amt||0),0);
function buildAttGrid(){
  const c=$("attGrid");if(!c)return;
  const d=G(),days=daysIn(S.activeKey);c.innerHTML="";
  S.dailyEmps.forEach(e=>{
    const w=d.dWages[e.id]||{rate:0,att:[]},present=w.att||[];
    const div=document.createElement("div");div.className="att-card";
    div.innerHTML=`<div class="att-hdr"><div class="att-name">👷 ${e.name}</div><span class="att-sum-badge" id="att_s_${e.id}">${present.length} يوم</span></div><div class="att-rate-row"><label>الأجر اليومي (JD):</label><input class="att-ri" type="number" step="0.001" min="0" id="att_r_${e.id}" value="${w.rate||""}" placeholder="0" onchange="calcSal()"></div><div class="att-days" id="att_g_${e.id}">${Array.from({length:days},(_,i)=>{const day=i+1,on=present.includes(day);return`<div class="att-d ${on?"here":""}" id="attd_${e.id}_${day}" onclick="toggleAtt('${e.id}',${day})">${day}</div>`;}).join("")}</div><div class="att-foot"><span style="font-size:12px;font-weight:600;color:var(--ywd)">إجمالي أجر ${e.name}</span><span style="font-size:15px;font-weight:700;font-family:'IBM Plex Mono'" id="att_t_${e.id}">${n3((w.rate||0)*present.length)} JD</span></div>`;
    c.appendChild(div);
  });
}
function toggleAtt(empId,day){
  if(isLocked()){toast("🔒 الشهر مغلق");return;}
  const d=G();if(!d.dWages[empId])d.dWages[empId]={rate:0,att:[]};
  const att=d.dWages[empId].att,idx=att.indexOf(day);
  if(idx>-1)att.splice(idx,1);else att.push(day);att.sort((a,b)=>a-b);
  const el=document.getElementById(`attd_${empId}_${day}`);if(el)el.className=`att-d ${att.includes(day)?"here":""}`;
  calcSal();saveAll();
}
function calcSal(){
  const d=G();let msB=0,msA=0,msG=0,msD=0,msAv=0,msN=0;
  S.monthlyEmps.forEach(e=>{
    const base=pf(`ms_${e.id}_b`),allow=pf(`ms_${e.id}_a`),ded=pf(`ms_${e.id}_d`),pa=pendAdv(e.id);
    const gross=base+allow,net=gross-ded-pa;
    T(`ms_${e.id}_g`,n3(gross));T(`ms_${e.id}_av`,n3(pa));T(`ms_${e.id}_n`,n3(Math.max(0,net)));
    // V24-3: الحفاظ على بيانات الدفع بما فيها علامة paid
    if(!d.mSal[e.id])d.mSal[e.id]={};
    d.mSal[e.id].base=base;d.mSal[e.id].allow=allow;d.mSal[e.id].ded=ded;
    // paid لا تُلمس هنا — تُغيَّر فقط بضغط الزر
    msB+=base;msA+=allow;msG+=gross;msD+=ded;msAv+=pa;msN+=Math.max(0,net);
  });
  T("ms-b",n3(msB));T("ms-a",n3(msA));T("ms-g",n3(msG));T("ms-d",n3(msD));T("ms-av",n3(msAv));T("ms-n",n3(msN));
  let dwT=0;
  S.dailyEmps.forEach(e=>{
    const rate=pf(`att_r_${e.id}`);
    // V24: الحفاظ على بيانات الدفع
    if(!d.dWages[e.id])d.dWages[e.id]={rate:0,att:[]};
    d.dWages[e.id].rate=rate;
    const att=d.dWages[e.id].att||[],tot=rate*att.length;dwT+=tot;
    T(`att_s_${e.id}`,`${att.length} يوم`);T(`att_t_${e.id}`,`${n3(tot)} JD`);
  });
  T("dwtotal",n3(dwT)+" JD");saveAll();
}

/* TOGGLE SALARY PAID — V24-3 FIX */
function toggleSalPaid(empId){
  if(isLocked()){toast("🔒 الشهر مغلق");return;}
  var d=G();
  if(!d.mSal[empId])d.mSal[empId]={base:0,allow:0,ded:0,paid:false};
  d.mSal[empId].paid=!d.mSal[empId].paid;
  var isPaid=d.mSal[empId].paid;
  var btn=document.getElementById("salpay_"+empId);
  if(btn){
    btn.textContent=isPaid?"✅":"⏳";
    btn.className="obl-toggle"+(isPaid?" ps":"");
    btn.title=isPaid?"مدفوع — اضغط للإلغاء":"غير مدفوع — اضغط للتأكيد";
  }
  // تحديث عداد المدفوع في footer
  var paidCount=S.monthlyEmps.filter(function(e){return(G().mSal[e.id]||{}).paid;}).length;
  T("ms-paid-count",paidCount+"/"+S.monthlyEmps.length+" مدفوع");
  var empName=S.monthlyEmps.find(function(e){return e.id===empId;});
  toast((isPaid?"✅ تم تسجيل دفع راتب ":"⏳ تم إلغاء تسجيل دفع راتب ")+(empName?empName.name:empId));
  log((isPaid?"تسجيل دفع راتب ":"إلغاء دفع راتب ")+(empName?empName.name:empId));
  updateDash();updateRpt();saveAll();
}

