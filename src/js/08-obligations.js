/* OBLIGATIONS — تحديث فوري */
function renderObligList(){
  const c=$("obligList");if(!c)return;
  const locked=isLocked();
  c.innerHTML=G().obligations.map((o,i)=>`<div class="obl-row ${o.paid?"paid":""}">
    <div class="obl-info"><div class="obl-name">${o.name}</div><div class="obl-meta"><span class="num">${n3(o.amt)}</span> JD${o.due?" | "+o.due:""}</div></div>
    <span class="badge ${o.paid?"bg-ok":"bg-e"}">${o.paid?"✅ مدفوع":"❌ غير مدفوع"}</span>
    <button class="obl-toggle ${o.paid?"ps":""}" onclick="toggleOblig(${i})" ${locked?"disabled":""} title="${locked?"الشهر مغلق":""}">${o.paid?"✅":"❌"}</button>
    <div style="display:flex;gap:5px"><button class="btn btn-ghost btn-xs" onclick="editOblig(${i})">✏️</button><button class="btn btn-r btn-xs del-btn" onclick="delOblig(${i})">🗑️</button></div>
  </div>`).join("");
  const obls=G().obligations;
  const total=obls.reduce((s,o)=>s+(o.amt||0),0);
  const paid=obls.filter(o=>o.paid).reduce((s,o)=>s+(o.amt||0),0);
  T("obl-tot",n3(total)+" JD");T("obl-paid",n3(paid)+" JD");T("obl-due",n3(total-paid)+" JD");
  applyRoles();
}
function toggleOblig(i){
  if(isLocked()){toast("🔒 الشهر مغلق");return;}
  const o=G().obligations[i];o.paid=!o.paid;
  renderObligList();
  updateDash();  // ✅ تحديث فوري للوحة التحكم
  calcCash();    // ✅ تحديث فوري للصندوق
  updateRpt();   // ✅ تحديث فوري للتقارير
  saveAll();
  log(`${o.paid?"تسديد":"إلغاء"} التزام — ${o.name}`);
  toast(o.paid?`✅ ${o.name} — مدفوع`:`❌ ${o.name} — غير مدفوع`);
}
function editOblig(i){const o=G().obligations[i];$("oblTit").textContent="✏️ تعديل الالتزام";$("oblEI").value=i;$("oName").value=o.name;$("oAmt").value=o.amt;$("oDue").value=o.due||"";openMo("moOblig");}
function saveOblig(){
  if(isLocked()){toast("🔒 الشهر مغلق");return;}
  const nm=$("oName").value.trim(),amt=parseFloat($("oAmt").value)||0,due=$("oDue").value;
  if(!nm){toast("⚠️ أدخل الاسم");return;}
  const ei=$("oblEI").value;
  if(ei!==""){const i=parseInt(ei);G().obligations[i]={...G().obligations[i],name:nm,amt,due};}
  else G().obligations.push({id:"o"+Date.now(),name:nm,amt,paid:false,due});
  $("oblEI").value="";$("oblTit").textContent="📋 إضافة التزام";
  ["oName","oAmt","oDue"].forEach(id=>{const e=$(id);if(e)e.value="";});
  renderObligList();updateDash();calcCash();updateRpt();cmo("moOblig");saveAll();toast("✅ تم الحفظ");
}
function delOblig(i){if(CR!=="manager"){toast("⚠️ صلاحية المدير");return;}if(isLocked()){toast("🔒 الشهر مغلق");return;}if(!confirm(`حذف "${G().obligations[i].name}"؟`))return;G().obligations.splice(i,1);renderObligList();updateDash();calcCash();updateRpt();saveAll();toast("🗑️ تم الحذف");}

