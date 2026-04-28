/* ADVANCES */
function buildAdvEmpSel(){const sel=$("aEmp");if(!sel)return;sel.innerHTML='<option value="">— اختر —</option>';[...S.monthlyEmps,...S.dailyEmps].forEach(e=>{const o=document.createElement("option");o.value=e.id;o.textContent=e.name;sel.appendChild(o);});}
function addAdv(){
  const date=$("aDate").value,empId=$("aEmp").value,amt=parseFloat($("aAmt").value)||0,status=$("aStat").value,note=$("aNote").value.trim();
  if(!date||!empId||amt<=0){toast("⚠️ تأكد من ملء جميع الحقول");return;}
  const emp=[...S.monthlyEmps,...S.dailyEmps].find(e=>e.id===empId)||{name:empId};
  G().advances.push({date,empId,empName:emp.name,amt,status,note});
  renderAdv();renderAdvLedger();initSalTables();updateDash();cmo("moAdv");
  ["aAmt","aNote"].forEach(id=>$(id).value="");
  saveAll();toast(`✅ سلفة — ${emp.name} — ${n3(amt)} JD`);log(`إضافة سلفة — ${emp.name} — ${n3(amt)} JD`);
}
function renderAdv(){
  const b=$("advBody");if(!b)return;b.innerHTML="";let tot=0;
  const adv=G().advances;
  if(!adv.length){b.innerHTML='<tr><td colspan="6" style="padding:22px;color:var(--tx4)">لا توجد سلف</td></tr>';T("t-adv","0.000");return;}
  adv.forEach((a,i)=>{
    if(a.status==="مستحقة"||a.status==="مسددة جزئياً")tot+=a.amt;
    const sc=a.status==="مسددة"?"bg-ok":a.status==="مسددة جزئياً"?"bg-w":"bg-e";
    const tr=document.createElement("tr");
    tr.innerHTML=`<td class="num" style="font-size:11.5px">${a.date}</td><td style="font-weight:600">${a.empName}</td><td class="td-y num">${n3(a.amt)}</td><td><span class="badge ${sc}">${a.status}</span></td><td style="font-size:11px;color:var(--tx3)">${a.note||"—"}</td><td><select class="inp" style="font-size:11px;padding:4px" onchange="updAdvStat(${i},this.value)"><option ${a.status==="مستحقة"?"selected":""}>مستحقة</option><option ${a.status==="مسددة"?"selected":""}>مسددة</option><option ${a.status==="مسددة جزئياً"?"selected":""}>مسددة جزئياً</option></select><button class="btn btn-r btn-xs del-btn" onclick="delAdv(${i})" style="margin-top:3px;display:block">🗑️</button></td>`;
    b.appendChild(tr);
  });T("t-adv",n3(tot));
}
function renderAdvLedger(){
  const c=$("advLedger");if(!c)return;
  const allE=[...S.monthlyEmps,...S.dailyEmps];
  c.innerHTML=allE.map(e=>{
    const emAdv=G().advances.filter(a=>a.empId===e.id);
    const pending=emAdv.filter(a=>a.status==="مستحقة"||a.status==="مسددة جزئياً").reduce((s,a)=>s+a.amt,0);
    const total=emAdv.reduce((s,a)=>s+a.amt,0);
    if(!emAdv.length)return`<div class="adv-block"><div class="adv-emp-hd"><span class="adv-emp-name">👤 ${e.name}</span><span class="badge bg-ok">لا توجد سلف</span></div></div>`;
    return`<div class="adv-block"><div class="adv-emp-hd"><span class="adv-emp-name">👤 ${e.name}</span><span class="adv-bal" style="color:${pending>0?"var(--rdd)":"var(--gnd)"}">مستحق: <span class="num">${n3(pending)}</span> JD <span style="color:var(--tx3);font-size:11px;font-weight:400">/ إجمالي: ${n3(total)} JD</span></span></div><div class="tbl-wrap" style="border:none;border-radius:0"><table><thead><tr><th>التاريخ</th><th>المبلغ</th><th>الحالة</th><th>الملاحظة</th></tr></thead><tbody>${emAdv.map(a=>`<tr><td class="num" style="font-size:11px">${a.date}</td><td class="num">${n3(a.amt)}</td><td><span class="badge ${a.status==="مسددة"?"bg-ok":a.status==="مسددة جزئياً"?"bg-w":"bg-e"}">${a.status}</span></td><td style="font-size:11px;color:var(--tx3)">${a.note||"—"}</td></tr>`).join("")}</tbody></table></div></div>`;
  }).join("");
}
function updAdvStat(i,status){G().advances[i].status=status;renderAdv();renderAdvLedger();S.monthlyEmps.forEach(e=>{const pa=pendAdv(e.id);T(`ms_${e.id}_av`,n3(pa));const base=pf(`ms_${e.id}_b`),allow=pf(`ms_${e.id}_a`),ded=pf(`ms_${e.id}_d`);T(`ms_${e.id}_n`,n3(Math.max(0,base+allow-ded-pa)));});updateDash();saveAll();toast("✅ تم التحديث");}
function delAdv(i){if(CR!=="manager"){toast("⚠️ صلاحية المدير");return;}if(!confirm("حذف السلفة؟"))return;G().advances.splice(i,1);renderAdv();renderAdvLedger();initSalTables();updateDash();saveAll();toast("🗑️ تم الحذف");}

