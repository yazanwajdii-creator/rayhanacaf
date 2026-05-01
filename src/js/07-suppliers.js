/* SUPPLIERS */
const SICO={"مواد غذائية ومواد خام":"🥗","مشروبات ومواد القهوة":"☕","مواد التعبئة والتغليف":"📦","مواد النظافة والتعقيم":"🧹","مستلزمات التشغيل":"⚙️","خدمات وصيانة":"🔧","أخرى":"📋"};
function renderSuppList(){const c=$("suppList");if(!c)return;if(!S.suppliers.length){c.innerHTML='<div class="alert al-i">لا يوجد موردون</div>';return;}c.innerHTML=S.suppliers.map((s,i)=>`<div class="sup-card"><div class="sup-ico">${SICO[s.cat]||"📦"}</div><div class="sup-info"><div class="sup-name">${s.name}</div><div class="sup-cat">${s.cat}${s.note?" — "+s.note:""}</div></div><div style="display:flex;gap:5px"><button class="btn btn-ghost btn-xs" onclick="editSupp(${i})">✏️</button><button class="btn btn-r btn-xs del-btn" onclick="delSupp(${i})">🗑️</button></div></div>`).join("");applyRoles();}
function editSupp(i){const s=S.suppliers[i];$("suppTit").textContent="✏️ تعديل المورد";$("suppEI").value=i;$("sName").value=s.name;$("sCat").value=s.cat;$("sNote").value=s.note||"";openMo("moSupp");}
function saveSupp(){const n=$("sName").value.trim(),c=$("sCat").value,nt=$("sNote").value.trim();if(!n){toast("⚠️ أدخل اسم المورد");return;}const ei=$("suppEI").value;if(ei!==""){S.suppliers[parseInt(ei)]={...S.suppliers[parseInt(ei)],name:n,cat:c,note:nt};}else{S.suppliers.push({id:"s"+Date.now(),name:n,cat:c,note:nt});}buildPurchSupp();renderSuppList();renderSuppRpt();cmo("moSupp");$("suppEI").value="";$("suppTit").textContent="📦 إضافة مورد";["sName","sNote"].forEach(id=>$(id).value="");saveAll();toast("✅ تم الحفظ");}
function delSupp(i){if(CR!=="manager"){toast("⚠️ صلاحية المدير");return;}if(!confirm(`حذف "${S.suppliers[i].name}"؟`))return;S.suppliers.splice(i,1);buildPurchSupp();renderSuppList();renderSuppRpt();saveAll();toast("🗑️ تم الحذف");}
function renderSuppRpt(){
  const c=$("suppRpt");if(!c)return;
  const sm={};G().purchases.forEach(p=>{if(!sm[p.sName])sm[p.sName]={t:0,n:0};sm[p.sName].t+=p.amt;sm[p.sName].n++;});
  const ents=Object.entries(sm).sort((a,b)=>b[1].t-a[1].t);
  if(!ents.length){c.innerHTML='<div class="alert al-i">لا توجد مشتريات</div>';return;}
  const grand=ents.reduce((s,[,v])=>s+v.t,0);
  c.innerHTML=`<div class="tbl-wrap"><table><thead><tr><th>المورد</th><th>عمليات</th><th>الإجمالي</th><th>النسبة</th></tr></thead><tbody>${ents.map(([nm,v])=>{const p=(v.t/grand*100).toFixed(1);return`<tr><td style="text-align:right;font-weight:600">${nm}</td><td>${v.n}</td><td class="td-y num">${n3(v.t)}</td><td><div class="prog"><div class="prog-f" style="width:${p}%"></div></div>${p}%</td></tr>`;}).join("")}</tbody><tfoot><tr><td>الإجمالي</td><td>${ents.reduce((s,[,v])=>s+v.n,0)}</td><td>${n3(grand)}</td><td>100%</td></tr></tfoot></table></div>`;
  const ctx=$("chSupp");if(!ctx)return;if(CH.su){try{CH.su.destroy();}catch(e){}CH.su=null;}
  if(ents.length)CH.su=new Chart(ctx,{type:"bar",data:{labels:ents.map(([n])=>n),datasets:[{data:ents.map(([,v])=>v.t),backgroundColor:"#0070F2",borderRadius:5,borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{backgroundColor:"rgba(15,6,4,.9)",callbacks:{label:c=>`${n3(c.raw)} JD`}}},scales:{y:{beginAtZero:true,ticks:{callback:v=>v+" JD",font:{family:"IBM Plex Mono",size:10}},grid:{color:"rgba(0,0,0,.05)"}},x:{ticks:{font:{size:10}},grid:{display:false}}}}});
}

