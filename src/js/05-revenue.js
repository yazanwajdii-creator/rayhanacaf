// ═══════════════════════════════════════════
// QUICK ENTRY — Single Day Revenue
// ═══════════════════════════════════════════
let QE_DAY = 1;
let QE_WHO = '';

function qeInit() {
  // Set to today's date if in active month, else last day
  var today = new Date();
  var ym = S.activeKey.split('-');
  var activeYear = parseInt(ym[0]), activeMonth = parseInt(ym[1]);
  var todayYear = today.getFullYear(), todayMonth = today.getMonth()+1, todayDay = today.getDate();
  var days = daysIn(S.activeKey);
  
  if(activeYear === todayYear && activeMonth === todayMonth) {
    QE_DAY = todayDay;
  } else {
    // Find first empty day
    var d = G();
    var empty = d.sales.find(function(s){ return !((s.cash||0)+(s.visa||0)+(s.pmts||0)>0); });
    QE_DAY = empty ? empty.day : 1;
  }
  qeRender();
}

function qeRender() {
  var days = daysIn(S.activeKey);
  if(QE_DAY < 1) QE_DAY = 1;
  if(QE_DAY > days) QE_DAY = days;
  
  var m = S.activeKey.split('-')[1];
  var MNs = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  var monName = MNs[parseInt(m)-1];
  
  var title = document.getElementById('qeTitle');
  var sub = document.getElementById('qeSub');
  if(title) title.textContent = QE_DAY + ' ' + monName;
  
  // Load existing data for this day
  var d = G();
  var s = d.sales.find(function(x){ return x.day === QE_DAY; });
  var hasData = s && ((s.cash||0)+(s.visa||0)+(s.pmts||0) > 0);
  
  if(sub) sub.textContent = hasData ? '✅ تم إدخال بيانات هذا اليوم — يمكنك التعديل' : '📝 أدخل إيراد هذا اليوم';
  if(sub) sub.style.color = hasData ? 'rgba(52,211,153,.7)' : 'rgba(255,255,255,.4)';
  
  var cashEl = document.getElementById('qeCash');
  var visaEl = document.getElementById('qeVisa');
  var pmtsEl = document.getElementById('qePmts');
  var notesEl = document.getElementById('qeNotes');
  
  if(cashEl) cashEl.value = s && s.cash > 0 ? s.cash : '';
  if(visaEl) visaEl.value = s && s.visa > 0 ? s.visa : '';
  if(pmtsEl) pmtsEl.value = s && s.pmts > 0 ? s.pmts : '';
  if(notesEl) notesEl.value = s ? (s.notes||'') : '';
  
  QE_WHO = s ? (s.receivedBy||'') : '';
  qeUpdateWho();
  qeCalc();
  qeUpdateMonthCount();
}

function qeUpdateMonthCount() {
  var d = G();
  var filled = d.sales.filter(function(s){ return (s.cash||0)+(s.visa||0)+(s.pmts||0) > 0; }).length;
  var total = daysIn(S.activeKey);
  var el = document.getElementById('mtCount');
  if(el) el.textContent = '(' + filled + '/' + total + ' يوم مُدخل)';
}

function qeCalc() {
  var cash = parseFloat(document.getElementById('qeCash').value)||0;
  var visa = parseFloat(document.getElementById('qeVisa').value)||0;
  var pmts = parseFloat(document.getElementById('qePmts').value)||0;
  var ns = cash + visa;
  var tot = ns + pmts;
  var nsEl = document.getElementById('qeNs');
  var totEl = document.getElementById('qeTot');
  if(nsEl) nsEl.textContent = n3(ns);
  if(totEl) totEl.textContent = n3(tot);
}

function qeNotesChange() {
  // Live preview of who will be marked present
  var notes = document.getElementById('qeNotes').value;
  var names = S.dailyEmps.filter(function(e){ return notes.indexOf(e.name) > -1; }).map(function(e){ return e.name; });
  var sub = document.getElementById('qeSub');
  if(names.length && sub) {
    sub.textContent = '👷 سيُسجَّل حضور: ' + names.join('، ');
    sub.style.color = 'rgba(52,211,153,.8)';
  }
}

function qeSetWho(who) {
  QE_WHO = who;
  qeUpdateWho();
}

function qeUpdateWho() {
  var none = document.getElementById('qeWhoNone');
  var yz = document.getElementById('qeWhoYz');
  var ab = document.getElementById('qeWhoAb');
  if(none) none.className = 'qe-who-btn' + (QE_WHO===''?' sel-none':'');
  if(yz) yz.className = 'qe-who-btn' + (QE_WHO==='يزن'?' sel-yz':'');
  if(ab) ab.className = 'qe-who-btn' + (QE_WHO==='عبدالرحمن'?' sel-ab':'');
}

function qeSave() {
  if(isLocked()){ toast('🔒 الشهر مغلق'); return; }
  var cash = parseFloat(document.getElementById('qeCash').value)||0;
  var visa = parseFloat(document.getElementById('qeVisa').value)||0;
  var pmts = parseFloat(document.getElementById('qePmts').value)||0;
  var notes = document.getElementById('qeNotes').value;
  
  var d = G();
  var s = d.sales.find(function(x){ return x.day === QE_DAY; });
  if(!s){ d.sales.push({day:QE_DAY,cash:0,visa:0,pmts:0,notes:'',receivedBy:''}); s=d.sales.find(function(x){return x.day===QE_DAY;}); }
  if(!s) return;
  
  s.cash = cash; s.visa = visa; s.pmts = pmts;
  s.notes = notes; s.receivedBy = QE_WHO;
  
  if(notes) autoAttFromNotes(QE_DAY, notes);
  
  // Update table row if visible
  var rnEl = document.getElementById('rn-'+QE_DAY);
  var rtEl = document.getElementById('rt-'+QE_DAY);
  if(rnEl) rnEl.textContent = n3(cash+visa);
  if(rtEl) rtEl.textContent = n3(cash+visa+pmts);
  
  calcRevTots(); updateDash(); saveAll();
  qeRender();
  
  // Auto-advance to next day
  if(QE_DAY < daysIn(S.activeKey)) {
    setTimeout(function(){
      QE_DAY++;
      qeRender();
    }, 800);
  }
  toast('✅ تم حفظ ' + QE_DAY + '/' + S.activeKey.split('-')[1]);
  log('إيراد يوم ' + QE_DAY + ' — ' + n3(cash+visa+pmts) + ' JD');
}

function qePrev() {
  var days = daysIn(S.activeKey);
  if(QE_DAY <= 1) { toast("أول يوم في الشهر"); return; }
  QE_DAY--;
  var el = document.getElementById("btnPrev");
  if(el) { el.style.background="rgba(200,146,15,.3)"; setTimeout(function(){el.style.background="rgba(255,255,255,.1)";},200); }
  qeRender();
}
function qeNext() {
  var days = daysIn(S.activeKey);
  if(QE_DAY >= days) { toast("آخر يوم في الشهر"); return; }
  QE_DAY++;
  var el = document.getElementById("btnNext");
  if(el) { el.style.background="rgba(200,146,15,.3)"; setTimeout(function(){el.style.background="rgba(255,255,255,.1)";},200); }
  qeRender();
}

function toggleMonthTable() {
  var wrap = document.getElementById('monthTableWrap');
  var arrow = document.getElementById('mtArrow');
  if(!wrap) return;
  var isOpen = wrap.classList.contains('open');
  wrap.classList.toggle('open');
  if(arrow) arrow.classList.toggle('open');
  if(!isOpen) { renderRevTable(); }
}

// ═══════════════════════════════════════════
/* REVENUE */
function clearRevFilter(){const f=$("revFrom"),t=$("revTo");if(f)f.value="";if(t)t.value="";renderRevTable();toast("✕ تم إلغاء الفلتر");}
function clearPurchFilter(){const f=$("purchFrom"),t=$("purchTo");if(f)f.value="";if(t)t.value="";renderPurch();toast("✕ تم إلغاء الفلتر");}

function renderRevTable(){
  var d=G(),lk=isLocked(),ym=S.activeKey.split("-"),m=ym[1];
  var td=daysIn(S.activeKey);
  var fv=$("revFrom")?$("revFrom").value:"",tv=$("revTo")?$("revTo").value:"";
  var fd=fv?Math.max(1,parseInt(fv)):1,tdd=tv?Math.min(td,parseInt(tv)):td;
  var rows=d.sales.filter(function(s){return s.day>=fd&&s.day<=tdd;});
  var all=d.sales.filter(function(s){return (s.cash||0)+(s.visa||0)+(s.pmts||0)>0;});
  var avg=all.length?all.reduce(function(a,x){return a+(x.cash||0)+(x.visa||0)+(x.pmts||0);},0)/all.length:0;
  var b=$("revBody");if(!b)return;b.innerHTML="";
  var fC=0,fV=0,fP=0;

  rows.forEach(function(s){
    var ns=(s.cash||0)+(s.visa||0),tot=ns+(s.pmts||0);
    var anom=avg>50&&tot>0&&tot<avg*0.5;
    fC+=s.cash||0;fV+=s.visa||0;fP+=s.pmts||0;
    var who=s.receivedBy||"";
    var dis=lk?"disabled":"";
    var wOpts="<option value=''>-</option>"+
      "<option value='يزن'"+(who==="يزن"?" selected":"")+">يزن</option>"+
      "<option value='عبدالرحمن'"+(who==="عبدالرحمن"?" selected":"")+">عبدالرحمن</option>";
    var wCls="who-sel"+(who==="يزن"?" who-yz":who==="عبدالرحمن"?" who-ab":"");
    var anomStyle=anom?";color:var(--rd)":"";
    var cashV=(s.cash||0)>0?(s.cash||0):"";
    var visaV=(s.visa||0)>0?(s.visa||0):"";
    var pmtsV=(s.pmts||0)>0?(s.pmts||0):"";
    var notesV=esc(s.notes||"");
    var tr=document.createElement("tr");
    tr.setAttribute("data-day", s.day);
    tr.innerHTML=
      "<td style='font-weight:700;font-size:12px"+anomStyle+"'>"+s.day+"/"+m+"</td>"+
      "<td><input class='inp' type='number' step='0.001' min='0' value='"+cashV+"' placeholder='0' "+dis+" oninput=\"updSale("+s.day+",'cash',this.value)\" onchange=\"updSale("+s.day+",'cash',this.value)\">"+"</td>"+
      "<td><input class='inp' type='number' step='0.001' min='0' value='"+visaV+"' placeholder='0' "+dis+" oninput=\"updSale("+s.day+",'visa',this.value)\" onchange=\"updSale("+s.day+",'visa',this.value)\">"+"</td>"+
      "<td><input class='inp' type='number' step='0.001' min='0' value='"+pmtsV+"' placeholder='0' "+dis+" oninput=\"updSale("+s.day+",'pmts',this.value)\" onchange=\"updSale("+s.day+",'pmts',this.value)\">"+"</td>"+

      "<td class='td-b num' id='rn-"+s.day+"'>"+n3(ns)+"</td>"+
      "<td class='td-g num' id='rt-"+s.day+"'>"+n3(tot)+"</td>"+
      "<td><input class='inp inp-r' type='text' value=\""+notesV+"\" placeholder='ملاحظات...' "+dis+" oninput=\"updSale("+s.day+",'notes',this.value)\" onchange=\"updSale("+s.day+",'notes',this.value)\">"+"</td>"+
      "<td><select class='"+wCls+"' "+dis+" onchange=\"updSaleWho("+s.day+",this)\">"+wOpts+"</select></td>";

    b.appendChild(tr);
  });

  T("t-cash",n3(fC));T("t-visa",n3(fV));T("t-pmts",n3(fP));
  T("t-nrev",n3(fC+fV));T("t-rev",n3(fC+fV+fP));
  var chips=$("revFilterSummary");
  if(chips&&(fv||tv)){
    var act=rows.filter(function(s){return (s.cash||0)+(s.visa||0)+(s.pmts||0)>0;}).length;
    chips.innerHTML="<span class='df-chip chip-b'>"+fd+"-"+tdd+"/"+m+"</span><span class='df-chip chip-y'>"+n3(fC+fV+fP)+" JD</span><span class='df-chip chip-r'>"+act+" أيام</span>";
  } else if(chips) chips.innerHTML="";
}

function updSaleWho(day,selEl){
  var v=selEl.value;
  selEl.className="who-sel"+(v==="يزن"?" who-yz":v==="عبدالرحمن"?" who-ab":"");
  updSale(day,"receivedBy",v);
}
let _updSaleTimer = null;
function updSale(day,field,val){
  if(isLocked()){toast("الشهر مغلق");return;}
  var d=G();
  var s=d.sales.find(function(x){return x.day===day;});
  if(!s){
    d.sales.push({day:day,cash:0,visa:0,pmts:0,notes:"",receivedBy:""});
    s=d.sales.find(function(x){return x.day===day;});
  }
  if(!s)return;
  if(field==="notes"||field==="receivedBy"){
    s[field]=String(val||"");
  } else {
    var v=parseFloat(val);
    s[field]=isNaN(v)?0:v;
  }
  var ns=(s.cash||0)+(s.visa||0);
  var tot=ns+(s.pmts||0);
  var rnEl=document.getElementById("rn-"+day);
  var rtEl=document.getElementById("rt-"+day);
  if(rnEl)rnEl.textContent=n3(ns);
  if(rtEl)rtEl.textContent=n3(tot);
  if(field==="notes") {
    autoAttFromNotes(day, String(val||""));
  } else {
    calcRevTots(); // update totals row immediately for numeric fields
  }
  // debounce heavy operations — avoid lag on every keystroke
  if(_updSaleTimer) clearTimeout(_updSaleTimer);
  _updSaleTimer = setTimeout(function(){
    updateDash();
    saveAll();
  }, 600);
}

function autoAttFromNotes(day, notes) {
  if(!notes || !notes.trim()) return;
  try {
    var d = G();
    var changed = [];
    S.dailyEmps.forEach(function(e) {
      if(!d.dWages[e.id]) d.dWages[e.id] = {rate:0, att:[]};
      var att = d.dWages[e.id].att;
      // Robust matching: check if name appears anywhere in notes
      var mentioned = notes.indexOf(e.name) > -1;
      var alreadyIn = att.indexOf(day) > -1;
      if(mentioned && !alreadyIn) {
        att.push(day);
        att.sort(function(a,b){return a-b;});
        // Update attendance UI if salary tab is rendered
        var el = document.getElementById("attd_"+e.id+"_"+day);
        if(el) el.className = "att-d here";
        var sumEl = document.getElementById("att_s_"+e.id);
        if(sumEl) sumEl.textContent = att.length + " يوم";
        // Update total display if visible
        var totEl = document.getElementById("att_t_"+e.id);
        if(totEl) totEl.textContent = n3((d.dWages[e.id].rate||0)*att.length) + " JD";
        changed.push(e.name);
      }
    });
    if(changed.length > 0) {
      // Update salary totals ONLY from data, not DOM (safe even if tab not open)
      updateDailyWageTotal();
      toast("✅ حضور: " + changed.join("، "));
    }
  } catch(err) { console.warn("autoAttFromNotes error:", err); }
}

function updateDailyWageTotal() {
  // Safe salary update that reads from data not DOM
  try {
    var d = G();
    var dwT = 0;
    S.dailyEmps.forEach(function(e) {
      var w = d.dWages[e.id] || {};
      var rate = w.rate || 0;
      var days = (w.att || []).length;
      dwT += rate * days;
      // Update UI if visible
      var tEl = document.getElementById("att_t_"+e.id);
      var sEl = document.getElementById("att_s_"+e.id);
      if(tEl) tEl.textContent = n3(rate*days) + " JD";
      if(sEl) sEl.textContent = days + " يوم";
    });
    var dwEl = document.getElementById("dwtotal");
    if(dwEl) dwEl.textContent = n3(dwT) + " JD";
  } catch(err) {}
}
function calcRevTots(){
  const d=G();let tC=0,tV=0,tP=0;
  d.sales.forEach(s=>{tC+=s.cash||0;tV+=s.visa||0;tP+=s.pmts||0;});
  T("t-cash",n3(tC));T("t-visa",n3(tV));T("t-pmts",n3(tP));
  T("t-nrev",n3(tC+tV));T("t-rev",n3(tC+tV+tP));
}
function saveRev(){if(isLocked()){toast("🔒 الشهر مغلق");return;}saveAll();toast("✅ تم حفظ الإيرادات");log("حفظ الإيرادات");}

