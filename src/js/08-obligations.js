/* OBLIGATIONS */
function renderObligList(){
  const c=$("obligList");if(!c)return;
  const locked=isLocked();
  const obls=G().obligations;
  c.innerHTML=obls.map((o,i)=>{
    const payerTag=o.paid&&o.paidBy
      ?`<span style="font-size:10px;padding:2px 6px;border-radius:10px;background:${o.paidBy==='يزن'?'rgba(0,112,242,.12)':'rgba(184,134,11,.12)'};color:${o.paidBy==='يزن'?'#0070F2':'#B8860B'};font-weight:600;margin-right:4px">${o.paidBy}</span>`
      :'';
    return `<div class="obl-row ${o.paid?"paid":""}">
      <div class="obl-info">
        <div class="obl-name">${o.name}${payerTag}</div>
        <div class="obl-meta"><span class="num">${n3(o.amt)}</span> JD${o.due?" | "+o.due:""}</div>
      </div>
      <span class="badge ${o.paid?"bg-ok":"bg-e"}">${o.paid?"✅":"❌"}</span>
      <button class="obl-toggle ${o.paid?"ps":""}" onclick="toggleOblig(${i})" ${locked?"disabled":""}>
        ${o.paid?"✅":"❌"}
      </button>
      <div style="display:flex;gap:5px">
        <button class="btn btn-ghost btn-xs" onclick="editOblig(${i})">✏️</button>
        <button class="btn btn-r btn-xs del-btn" onclick="delOblig(${i})">🗑️</button>
      </div>
    </div>`;
  }).join("");

  const total=obls.reduce((s,o)=>s+(o.amt||0),0);
  const paid=obls.filter(o=>o.paid).reduce((s,o)=>s+(o.amt||0),0);
  T("obl-tot",n3(total)+" JD");T("obl-paid",n3(paid)+" JD");T("obl-due",n3(total-paid)+" JD");

  // ملخص حسب من دفع
  const yzPaid=obls.filter(o=>o.paid&&o.paidBy==="يزن").reduce((s,o)=>s+(o.amt||0),0);
  const abPaid=obls.filter(o=>o.paid&&o.paidBy==="عبدالرحمن").reduce((s,o)=>s+(o.amt||0),0);
  T("obl-yz",n3(yzPaid));T("obl-ab",n3(abPaid));
  const oblByWho=$("oblByWho");
  if(oblByWho){
    oblByWho.style.display=(yzPaid>0||abPaid>0)?'flex':'none';
  }
  applyRoles();
}

function toggleOblig(i){
  if(isLocked()){toast("🔒 الشهر مغلق");return;}
  const o=G().obligations[i];
  if(!o.paid){
    // عرض mini-picker لاختيار من دفع
    var old=document.getElementById('_oblPayPicker');if(old)old.remove();
    var ov=document.createElement('div');
    ov.id='_oblPayPicker';
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9800;display:flex;align-items:flex-end;justify-content:center';
    ov.innerHTML=`<div style="background:var(--surf);border-radius:16px 16px 0 0;width:100%;max-width:480px;padding:20px 16px 28px">
      <div style="text-align:center;font-weight:700;font-size:15px;margin-bottom:6px">💳 من دفع هذا الالتزام؟</div>
      <div style="text-align:center;font-size:13px;color:var(--tx3);margin-bottom:18px">${o.name} — ${n3(o.amt)} JD</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <button onclick="confirmOblPay(${i},'يزن')" style="padding:16px;font-size:15px;font-weight:700;border:2px solid #0070F2;background:rgba(0,112,242,.08);color:#0070F2;border-radius:12px;cursor:pointer;font-family:inherit">👤 يزن</button>
        <button onclick="confirmOblPay(${i},'عبدالرحمن')" style="padding:16px;font-size:15px;font-weight:700;border:2px solid #B8860B;background:rgba(184,134,11,.08);color:#B8860B;border-radius:12px;cursor:pointer;font-family:inherit">👤 عبدالرحمن</button>
      </div>
      <button onclick="document.getElementById('_oblPayPicker').remove()" style="width:100%;margin-top:10px;padding:12px;border:1px solid var(--br);background:transparent;border-radius:10px;font-size:13px;color:var(--tx3);cursor:pointer;font-family:inherit">إلغاء</button>
    </div>`;
    ov.onclick=function(e){if(e.target===ov)ov.remove();};
    document.body.appendChild(ov);
  } else {
    o.paid=false;delete o.paidBy;
    renderObligList();updateDash();calcCash();updateRpt();saveAll();
    toast(`❌ ${o.name} — غير مدفوع`);
    log(`إلغاء تسديد التزام — ${o.name}`);
  }
}

function confirmOblPay(i,who){
  var ov=document.getElementById('_oblPayPicker');if(ov)ov.remove();
  const o=G().obligations[i];if(!o)return;
  o.paid=true;o.paidBy=who;
  renderObligList();updateDash();calcCash();updateRpt();saveAll();
  toast(`✅ ${o.name} — مدفوع (${who})`);
  log(`تسديد التزام — ${o.name} (${who})`);
}

function editOblig(i){
  const o=G().obligations[i];
  $("oblTit").textContent="✏️ تعديل الالتزام";
  $("oblEI").value=i;
  $("oName").value=o.name;
  $("oAmt").value=o.amt;
  $("oDue").value=o.due||"";
  var pb=$("oPaidBy");if(pb)pb.value=o.paidBy||"";
  openMo("moOblig");
}

function saveOblig(){
  if(isLocked()){toast("🔒 الشهر مغلق");return;}
  const nm=$("oName").value.trim(),amt=parseFloat($("oAmt").value)||0,due=$("oDue").value;
  const paidBy=$("oPaidBy")?$("oPaidBy").value:"";
  if(!nm){toast("⚠️ أدخل الاسم");return;}
  const ei=$("oblEI").value;
  if(ei!==""){
    const i=parseInt(ei);
    G().obligations[i]={...G().obligations[i],name:nm,amt,due};
    if(paidBy) G().obligations[i].paidBy=paidBy;
  } else {
    G().obligations.push({id:"o"+Date.now(),name:nm,amt,paid:false,due});
  }
  $("oblEI").value="";$("oblTit").textContent="📋 إضافة التزام";
  ["oName","oAmt","oDue"].forEach(id=>{const e=$(id);if(e)e.value="";});
  var pb=$("oPaidBy");if(pb)pb.value="";
  renderObligList();updateDash();calcCash();updateRpt();cmo("moOblig");saveAll();toast("✅ تم الحفظ");
}

function delOblig(i){if(CR!=="manager"){toast("⚠️ صلاحية المدير");return;}if(isLocked()){toast("🔒 الشهر مغلق");return;}if(!confirm(`حذف "${G().obligations[i].name}"؟`))return;G().obligations.splice(i,1);renderObligList();updateDash();calcCash();updateRpt();saveAll();toast("🗑️ تم الحذف");}
