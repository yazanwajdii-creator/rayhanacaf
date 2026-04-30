/* PURCHASES */
const catLbl=c=>({COGS:"تكلفة البضاعة",OPS:"تشغيلية",ADM:"إدارية",MKT:"تسويقية",OTHER:"أخرى"}[c]||c);
let buyerF='all'; // فلتر المشتري

function buildPurchSupp(){const sel=$("pSupp");if(!sel)return;sel.innerHTML='<option value="">— اختر —</option>';S.suppliers.forEach(s=>{const o=document.createElement("option");o.value=s.id;o.textContent=s.name;sel.appendChild(o);});}

function filterCat(cat,btn){catF=cat;document.querySelectorAll(".ect").forEach(b=>b.classList.remove("on"));if(btn)btn.classList.add("on");renderPurch();}

function filterBuyer(who,btn){
  buyerF=who;
  document.querySelectorAll(".ebt").forEach(b=>b.classList.remove("on"));
  if(btn)btn.classList.add("on");
  renderPurch();
}

function addPurch(){ savePurch(); }

function renderPurch(){
  const b=$("purchBody");if(!b)return;b.innerHTML="";
  const p=G().purchases;
  const pFrom=$("purchFrom")?$("purchFrom").value:"";
  const pTo=$("purchTo")?$("purchTo").value:"";
  const isFiltered=pFrom||pTo||catF!=="all"||buyerF!=="all";
  let shown=0,shownAmt=0,tot=0;
  if(!p.length){b.innerHTML='<tr><td colspan="8" style="padding:22px;color:var(--tx4)">لا توجد مشتريات</td></tr>';T("t-purch","0.000");const sum=$("purchFilterSummary");if(sum)sum.innerHTML="";return;}
  p.forEach((r,i)=>{
    tot+=r.amt;
    if(catF!=="all"&&r.cat!==catF)return;
    if(buyerF!=="all"&&(r.buyer||"")!==buyerF)return;
    if(pFrom&&r.date<pFrom)return;
    if(pTo&&r.date>pTo)return;
    shownAmt+=r.amt;shown++;
    const cls={COGS:"td-y",OPS:"td-b",ADM:"td-g",MKT:"td-r"}[r.cat||"COGS"]||"td-y";
    const bcls={COGS:"bg-w",OPS:"bg-i",ADM:"bg-ok",MKT:"bg-e"}[r.cat||"COGS"]||"bg-w";
    const bCls=r.buyer==="يزن"?"who-yz":r.buyer==="عبدالرحمن"?"who-ab":"";
    const tr=document.createElement("tr");
    tr.innerHTML="<td class='num' style='font-size:11.5px'>"+r.date+"</td>"+
      "<td style='font-weight:600'>"+r.sName+"</td>"+
      "<td><span class='badge "+bcls+"'>"+catLbl(r.cat||"COGS")+"</span></td>"+
      "<td style='font-size:12px'>"+(r.desc||"—")+"</td>"+
      "<td class='"+cls+" num'>"+n3(r.amt)+"</td>"+
      "<td><span class='who-sel "+bCls+"' style='cursor:default'>"+(r.buyer||"—")+"</span></td>"+
      "<td style='font-size:11px;color:var(--tx3)'>"+(r.inv||"—")+"</td>"+
      "<td style='display:flex;gap:3px;justify-content:center'>"+
        "<button class='btn btn-ghost btn-xs' onclick='editPurch("+i+")'>✏️</button>"+
        "<button class='btn btn-r btn-xs del-btn' onclick='delPurch("+i+")'>×</button>"+
      "</td>";
    b.appendChild(tr);
  });
  if(!shown){b.innerHTML='<tr><td colspan="8" style="padding:22px;color:var(--tx4)">لا توجد نتائج للفلتر المحدد</td></tr>';}
  T("t-purch",n3(shownAmt));T("t-cat-lbl",catF==="all"?"الكل":catLbl(catF));

  // ملخص الفلتر
  const sum=$("purchFilterSummary");
  if(sum){
    if(isFiltered){
      // مجموع حسب المشتري
      const byWho={يزن:0,عبدالرحمن:0,other:0};
      p.forEach(r=>{
        if(catF!=="all"&&r.cat!==catF)return;
        if(buyerF!=="all"&&(r.buyer||"")!==buyerF)return;
        if(pFrom&&r.date<pFrom)return;if(pTo&&r.date>pTo)return;
        if(r.buyer==="يزن")byWho.يزن+=r.amt;
        else if(r.buyer==="عبدالرحمن")byWho.عبدالرحمن+=r.amt;
        else byWho.other+=r.amt;
      });
      let chips=`<span class="df-chip df-chip-red">💸 ${n3(shownAmt)} JD</span><span class="df-chip df-chip-blue">📄 ${shown} مستند</span>`;
      if(pFrom||pTo){const fd=pFrom?pFrom.slice(5).replace("-","/"):"";const td=pTo?pTo.slice(5).replace("-","/"):"";chips=`<span class="df-chip df-chip-blue">📅 ${fd}${fd&&td?" – ":""}${td}</span>`+chips;}
      if(byWho.يزن>0)chips+=`<span class="df-chip df-chip-blue">👤 يزن: ${n3(byWho.يزن)} JD</span>`;
      if(byWho.عبدالرحمن>0)chips+=`<span class="df-chip df-chip-gold">👤 عبدالرحمن: ${n3(byWho.عبدالرحمن)} JD</span>`;
      if(byWho.other>0)chips+=`<span class="df-chip">غير محدد: ${n3(byWho.other)} JD</span>`;
      sum.innerHTML=chips;
    } else {sum.innerHTML="";}
  }
  renderCatSum();
}

function editPurch(i){
  var p=G().purchases[i];if(!p)return;
  var d=$("pDate"),s=$("pSupp"),c=$("pCat"),desc=$("pDesc"),amt=$("pAmt"),inv=$("pInv"),buyer=$("pBuyer");
  if(d) d.value=p.date||"";
  if(s){var found=Array.from(s.options).find(function(o){return o.value===p.sId||o.text===p.sName;});if(found) s.value=found.value;else s.value=p.sId||p.sName||"";}
  if(c) c.value=p.cat||"COGS";
  if(desc) desc.value=p.desc||"";
  if(amt) amt.value=p.amt||"";
  if(inv) inv.value=p.inv||"";
  if(buyer) buyer.value=p.buyer||"";
  var hiddenIdx=document.getElementById("pEditIdx");
  if(hiddenIdx) hiddenIdx.value=i;
  var title=document.querySelector("#moPurch .mo-title");
  if(title) title.textContent="✏️ تعديل مشتريات";
  openMo("moPurch");
}

function savePurch(){
  if(isLocked()){toast("الشهر مغلق");return;}
  var date=$("pDate").value,sId=$("pSupp").value,cat=$("pCat").value,
    desc=$("pDesc").value.trim(),amt=parseFloat($("pAmt").value)||0,
    inv=$("pInv").value.trim(),buyer=$("pBuyer")?$("pBuyer").value:"";
  if(!date||!sId||amt<=0){toast("⚠️ تحقق من التاريخ والمورد والمبلغ");return;}
  var sup=S.suppliers.find(function(s){return s.id===sId;})||{name:sId};
  var hiddenIdx=document.getElementById("pEditIdx");
  var editIdx=hiddenIdx?parseInt(hiddenIdx.value):-1;
  var newRec={date:date,sId:sId,sName:sup.name,cat:cat,desc:desc,amt:amt,inv:inv,buyer:buyer};
  if(editIdx>=0&&editIdx<G().purchases.length){
    G().purchases[editIdx]=newRec;
    toast("✅ تم تعديل المشتريات");
    log("تعديل مشتريات — "+sup.name+" — "+n3(amt)+" JD");
  } else {
    G().purchases.push(newRec);
    toast("✅ تم التسجيل");
    log("مشتريات — "+sup.name+" — "+n3(amt)+" JD");
  }
  renderPurch();renderSuppRpt();renderCatSum();updateDash();
  closePurchModal();saveAll();
}

function closePurchModal(){
  cmo("moPurch");
  var hiddenIdx=document.getElementById("pEditIdx");
  if(hiddenIdx) hiddenIdx.value="-1";
  var title=document.querySelector("#moPurch .mo-title");
  if(title) title.textContent="🛒 تسجيل مستند مشترى";
  ["pDesc","pAmt","pInv"].forEach(function(id){var e=$(id);if(e)e.value="";});
  if($("pBuyer"))$("pBuyer").value="";
}

function clearPurchFilter(){
  var pf=$("purchFrom"),pt=$("purchTo");
  if(pf)pf.value="";if(pt)pt.value="";
  catF="all";buyerF="all";
  document.querySelectorAll(".ect").forEach(b=>b.classList.remove("on"));
  var allCat=document.querySelector(".ect");if(allCat)allCat.classList.add("on");
  document.querySelectorAll(".ebt").forEach(b=>b.classList.remove("on"));
  var allBuyer=document.querySelector(".ebt");if(allBuyer)allBuyer.classList.add("on");
  renderPurch();
}

function delPurch(i){if(CR!=="manager"){toast("⚠️ صلاحية المدير");return;}if(isLocked()){toast("🔒 الشهر مغلق");return;}if(!confirm("حذف المستند؟"))return;G().purchases.splice(i,1);renderPurch();renderSuppRpt();updateDash();saveAll();toast("🗑️ تم الحذف");}

function renderCatSum(){
  const c=$("catSum");if(!c)return;
  const bc={COGS:0,OPS:0,ADM:0,MKT:0,OTHER:0};G().purchases.forEach(x=>{bc[x.cat||"COGS"]=(bc[x.cat||"COGS"]||0)+x.amt;});
  const total=Object.values(bc).reduce((a,b)=>a+b,0)||1;
  // بحسب المشتري
  const byWho={يزن:0,عبدالرحمن:0,other:0};
  G().purchases.forEach(p=>{
    if(p.buyer==="يزن")byWho.يزن+=p.amt;
    else if(p.buyer==="عبدالرحمن")byWho.عبدالرحمن+=p.amt;
    else byWho.other+=p.amt;
  });
  const whoHtml=(byWho.يزن>0||byWho.عبدالرحمن>0)?
    `<div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap">
      ${byWho.يزن>0?`<span class="df-chip df-chip-blue">👤 يزن: ${n3(byWho.يزن)} JD</span>`:''}
      ${byWho.عبدالرحمن>0?`<span class="df-chip df-chip-gold">👤 عبدالرحمن: ${n3(byWho.عبدالرحمن)} JD</span>`:''}
      ${byWho.other>0?`<span class="df-chip">غير محدد: ${n3(byWho.other)} JD</span>`:''}
    </div>`:'';
  c.innerHTML=whoHtml+`<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${Object.entries(bc).filter(([,v])=>v>0).map(([cat,val])=>`<div style="padding:11px;border-radius:8px;border:1px solid var(--br);background:var(--surf2)"><div style="font-size:11px;font-weight:600;color:var(--tx3);margin-bottom:4px">${catLbl(cat)}</div><div style="font-size:15px;font-weight:700;font-family:'IBM Plex Mono'">${n3(val)} JD</div><div class="prog"><div class="prog-f" style="width:${(val/total*100).toFixed(0)}%"></div></div><div style="font-size:10px;color:var(--tx3)">${(val/total*100).toFixed(1)}%</div></div>`).join("")}</div>`;
}
