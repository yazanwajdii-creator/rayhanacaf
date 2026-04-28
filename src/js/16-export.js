
/* EXPORT */

function exportJSON(){
  var data={
    version:'v25',
    activeKey:S.activeKey,
    months:S.months,
    monthlyEmps:S.monthlyEmps,
    dailyEmps:S.dailyEmps,
    lockedMonths:S.lockedMonths||[],
    suppliers:S.suppliers||[],
    exported:new Date().toISOString()
  };
  var json=JSON.stringify(data,null,2);
  var ym=S.activeKey.split('-');
  var fname='rayhana_v25_'+ym[0]+'_'+ym[1]+'.json';

  // دائماً: اعرض نافذة النسخ أولاً حتى لا يضيع الملف
  _showCopyModal(json, fname);

  // حاول Share API في الخلفية (أندرويد) — بدون return حتى تبقى النافذة مفتوحة
  if(navigator.share){
    try{
      var shareFile=new File([json],fname,{type:'application/json'});
      var canShare=false;
      try{ canShare=!navigator.canShare||navigator.canShare({files:[shareFile]}); }catch(e){ canShare=true; }
      if(canShare){
        navigator.share({files:[shareFile],title:'نسخة احتياطية ريحانة كافيه'})
          .then(function(){ toast('✅ تم الإرسال عبر قائمة المشاركة'); })
          .catch(function(){});
      }
    }catch(e){}
  }
  log('تصدير JSON — '+S.activeKey);
}

// ═══════════════════════════════════════════════════════
// تصدير Google Sheets (CSV متوافق مع العربية)
// ═══════════════════════════════════════════════════════
function exportGoogleSheets(){
  var d = G();
  var t = totals();
  var ym = S.activeKey.split('-');
  var monthName = (typeof MNA !== 'undefined' ? MNA[parseInt(ym[1])-1] : ym[1]) + ' ' + ym[0];
  var fname = 'rayhana_' + ym[0] + '_' + ym[1] + '.csv';
  var rows = [];

  function q(v){ // تحويل قيمة لخلية CSV آمنة
    var s = String(v === null || v === undefined ? '' : v);
    if(s.indexOf(',') > -1 || s.indexOf('"') > -1 || s.indexOf('\n') > -1){
      return '"' + s.replace(/"/g,'""') + '"';
    }
    return s;
  }
  function row(){ return Array.prototype.slice.call(arguments).map(q).join(','); }
  function blank(){ rows.push(''); }
  function header(t){ rows.push(row(t)); }

  // ── الغلاف ─────────────────────────────────────────
  rows.push(row('ريحانة كافيه — تقرير ' + monthName));
  rows.push(row('تاريخ التصدير', new Date().toLocaleString('ar-JO')));
  blank();

  // ── ملخص مالي ──────────────────────────────────────
  header('=== الملخص المالي ===');
  rows.push(row('البيان','المبلغ (JD)'));
  rows.push(row('إجمالي الإيرادات', n3(t.rev)));
  rows.push(row('إجمالي المصروفات', n3(t.totalExp)));
  rows.push(row('صافي الربح', n3(t.profit)));
  rows.push(row('هامش الربح %', t.margin.toFixed(2) + '%'));
  rows.push(row('إيرادات نقد', n3(t.cash)));
  rows.push(row('إيرادات فيزا', n3(t.visa)));
  rows.push(row('تكلفة البضاعة (COGS)', n3(t.bycat ? t.bycat.COGS : 0)));
  rows.push(row('مصاريف التشغيل', n3(t.bycat ? t.bycat.OPS : 0)));
  rows.push(row('مجموع الرواتب الشهرية', n3(t.mSalG)));
  rows.push(row('مجموع الأجور اليومية', n3(t.dwTotal)));
  rows.push(row('الالتزامات المسددة', n3(t.oblPaid)));
  rows.push(row('الالتزامات غير المسددة', n3(t.oblTotal - t.oblPaid)));
  blank();

  // ── المبيعات اليومية ───────────────────────────────
  header('=== المبيعات اليومية ===');
  rows.push(row('اليوم','نقد','فيزا','دفعات أخرى','الإجمالي','الملاحظات'));
  d.sales.forEach(function(s){
    var total = (s.cash||0)+(s.visa||0)+(s.pmts||0);
    rows.push(row(s.day, n3(s.cash||0), n3(s.visa||0), n3(s.pmts||0), n3(total), s.notes||''));
  });
  blank();

  // ── المشتريات ──────────────────────────────────────
  header('=== المشتريات ===');
  rows.push(row('التاريخ','المورد','التصنيف','الوصف','المبلغ (JD)'));
  (d.purchases||[]).forEach(function(p){
    rows.push(row(p.date||'', p.sName||'', p.cat||'', p.desc||'', n3(p.amt||0)));
  });
  if(!(d.purchases||[]).length) rows.push(row('لا توجد مشتريات'));
  blank();

  // ── الالتزامات ─────────────────────────────────────
  header('=== الالتزامات الشهرية ===');
  rows.push(row('البند','المبلغ (JD)','الحالة','تاريخ الاستحقاق'));
  (d.obligations||[]).forEach(function(o){
    rows.push(row(o.name||'', n3(o.amt||0), o.paid ? 'مسدد ✓' : 'غير مسدد', o.due||''));
  });
  blank();

  // ── الرواتب الشهرية ────────────────────────────────
  if(S.monthlyEmps && S.monthlyEmps.length){
    header('=== الرواتب الشهرية ===');
    rows.push(row('الموظف','الأساسي','البدلات','الخصومات','الصافي','مسدد؟'));
    S.monthlyEmps.forEach(function(e){
      var sal = (d.mSal||{})[e.id] || {};
      var net = (sal.base||0)+(sal.allow||0)-(sal.ded||0);
      rows.push(row(e.name, n3(sal.base||0), n3(sal.allow||0), n3(sal.ded||0), n3(net), sal.paid ? 'نعم ✓' : 'لا'));
    });
    blank();
  }

  // ── الأجور اليومية ─────────────────────────────────
  if(S.dailyEmps && S.dailyEmps.length){
    header('=== الأجور اليومية ===');
    rows.push(row('الموظف','الأجر اليومي','أيام الحضور','الإجمالي'));
    S.dailyEmps.forEach(function(e){
      var w = (d.dWages||{})[e.id] || {rate:0,att:[]};
      var days = (w.att||[]).length;
      rows.push(row(e.name, n3(w.rate||0), days, n3((w.rate||0)*days)));
    });
    blank();
  }

  // ── السلف ──────────────────────────────────────────
  if((d.advances||[]).length){
    header('=== السلف والمدفوعات ===');
    rows.push(row('التاريخ','الموظف','المبلغ','الحالة','ملاحظة'));
    d.advances.forEach(function(a){
      rows.push(row(a.date||'', a.empName||'', n3(a.amt||0), a.status||'', a.note||''));
    });
    blank();
  }

  // BOM لدعم العربية في Excel/Sheets + تجميع
  var csv = '﻿' + rows.join('\r\n');

  // مشاركة عبر Android أو تنزيل
  if(navigator.share){
    try{
      var f = new File([csv], fname, {type:'text/csv;charset=utf-8'});
      if(navigator.canShare && navigator.canShare({files:[f]})){
        navigator.share({files:[f], title:'تقرير ريحانة كافيه — ' + monthName})
          .then(function(){ toast('🟢 تم تصدير Google Sheets'); })
          .catch(function(err){ if(err.name!=='AbortError') _csvFallback(csv,fname); });
        return;
      }
    }catch(e){}
  }
  _csvFallback(csv, fname);
}

function _csvFallback(csv, fname){
  try{
    var blob = new Blob([csv], {type:'text/csv;charset=utf-8'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = fname;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(url); }, 5000);
    toast('🟢 تم تصدير CSV لـ Google Sheets');
  }catch(e){
    _showCopyModal(csv, fname);
  }
}

function _exportFallback(json,fname){
  // محاولة تنزيل عبر blob URL (متصفح عادي)
  try{
    var blob=new Blob([json],{type:'application/json'});
    var url=URL.createObjectURL(blob);
    var a=document.createElement('a');
    a.href=url; a.download=fname;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function(){URL.revokeObjectURL(url);},5000);
    toast('💾 تم تصدير النسخة الاحتياطية');
    log('تصدير JSON — '+S.activeKey);
  }catch(e){
    _showCopyModal(json,fname);
  }
}

function _showCopyModal(json,fname){
  var old=document.getElementById('jsonExportModal');
  if(old) old.remove();
  var modal=document.createElement('div');
  modal.id='jsonExportModal';
  modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:flex-end;justify-content:center';

  var box=document.createElement('div');
  box.style.cssText='background:var(--surf);border-radius:16px 16px 0 0;width:100%;max-width:600px;max-height:85vh;display:flex;flex-direction:column;overflow:hidden';

  // Header
  var hdr=document.createElement('div');
  hdr.style.cssText='padding:14px 16px 10px;border-bottom:1px solid var(--br);flex-shrink:0';
  hdr.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">'
    +'<div style="font-weight:700;font-size:15px">💾 نسخة احتياطية — '+fname+'</div>'
    +'<button onclick="document.getElementById(\'jsonExportModal\').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:var(--tx);padding:0;line-height:1">✕</button>'
    +'</div>'
    +'<div style="background:rgba(26,92,40,.12);border:1px solid rgba(26,92,40,.25);border-radius:8px;padding:9px 12px;font-size:12px;color:#1A4A28;font-weight:600">'
    +'📌 اضغط <strong>نسخ</strong> ثم الصقه في ملاحظات أو واتساب — أو شاركه مباشرة'
    +'</div>';

  // Textarea
  var bd=document.createElement('div');
  bd.style.cssText='padding:12px;flex:1;overflow:auto;min-height:0';
  var ta=document.createElement('textarea');
  ta.readOnly=true;
  ta.style.cssText='width:100%;height:200px;font-family:monospace;font-size:10px;border:1px solid var(--br);border-radius:8px;padding:8px;background:var(--bg);color:var(--tx);resize:none;box-sizing:border-box;direction:ltr';
  ta.value=json;
  bd.appendChild(ta);

  // Footer buttons
  var ft=document.createElement('div');
  ft.style.cssText='padding:12px;border-top:1px solid var(--br);flex-shrink:0;display:flex;flex-direction:column;gap:8px';

  var cpBtn=document.createElement('button');
  cpBtn.style.cssText='width:100%;padding:13px;background:#1A4A28;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit';
  cpBtn.textContent='📋 نسخ النص كاملاً';
  cpBtn.onclick=function(){
    ta.select(); ta.setSelectionRange(0,99999);
    if(navigator.clipboard){
      navigator.clipboard.writeText(json).then(function(){
        cpBtn.textContent='✅ تم النسخ!';
        cpBtn.style.background='#059669';
        setTimeout(function(){cpBtn.textContent='📋 نسخ النص كاملاً';cpBtn.style.background='#1A4A28';},2500);
      }).catch(function(){ document.execCommand('copy'); cpBtn.textContent='✅ تم النسخ!'; });
    } else { document.execCommand('copy'); cpBtn.textContent='✅ تم النسخ!'; }
  };

  var shareBtn=document.createElement('button');
  shareBtn.style.cssText='width:100%;padding:11px;background:transparent;color:var(--tx2);border:1.5px solid var(--br);border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit';
  shareBtn.textContent='📤 مشاركة عبر واتساب / تيليغرام';
  shareBtn.onclick=function(){
    if(navigator.share){
      try{
        var f=new File([json],fname,{type:'application/json'});
        navigator.share({files:[f],title:'نسخة احتياطية ريحانة كافيه'}).catch(function(){});
      }catch(e){ navigator.share({text:json,title:fname}).catch(function(){}); }
    } else { toast('المشاركة غير متوفرة في هذا المتصفح'); }
  };

  // زر تحميل مباشر — يعمل على المتصفح والموقع
  var dlBtn=document.createElement('button');
  dlBtn.style.cssText='width:100%;padding:11px;background:transparent;color:#0070F2;border:1.5px solid #0070F2;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit';
  dlBtn.textContent='⬇️ تحميل الملف مباشرة';
  dlBtn.onclick=function(){
    try{
      var blob=new Blob([json],{type:'application/json'});
      var url=URL.createObjectURL(blob);
      var a=document.createElement('a');
      a.href=url; a.download=fname; a.style.display='none';
      document.body.appendChild(a); a.click();
      setTimeout(function(){ URL.revokeObjectURL(url); a.remove(); },1000);
      dlBtn.textContent='✅ جاري التحميل...';
      setTimeout(function(){ dlBtn.textContent='⬇️ تحميل الملف مباشرة'; },2000);
    }catch(e){ toast('⚠️ تعذّر التحميل — استخدم نسخ النص'); }
  };

  ft.appendChild(cpBtn);
  ft.appendChild(dlBtn);
  ft.appendChild(shareBtn);
  box.appendChild(hdr); box.appendChild(bd); box.appendChild(ft);
  modal.appendChild(box);
  modal.onclick=function(e){if(e.target===modal)modal.remove();};
  document.body.appendChild(modal);
  setTimeout(function(){ta.focus();ta.select();},300);
}
function importJSON(ev){
  var file=ev.target.files[0]; if(!file)return;
  var reader=new FileReader();
  reader.onload=function(e){
    try{
      var data=JSON.parse(e.target.result);
      // تحقق من صحة الملف
      if(!data.months && !data.data){toast('❌ ملف غير صالح — لا توجد بيانات شهرية');ev.target.value='';return;}
      
      // دعم صيغة V22 القديمة
      if(data.data && data.data.months) data = data.data;
      
      var monthCount = Object.keys(data.months||{}).length;
      
      if(!confirm('⚠️ سيتم استبدال بيانات النظام الحالية ببيانات الملف.\n\nعدد الأشهر في الملف: '+monthCount+'\n\nهل أنت متأكد؟')){
        ev.target.value=''; return;
      }
      
      // استيراد البيانات المالية فقط — لا يمس الموظفين أو الموردين أو الهيكل الحالي
      var isOldVersion = !data.version;
      if(data.months){
        Object.keys(data.months).forEach(function(k){
          var incoming = data.months[k];
          if(!incoming) return;
          // توافق مع الإصدارات القديمة — أضف حقل paid للرواتب إذا غاب
          if(incoming.mSal){
            Object.keys(incoming.mSal).forEach(function(eid){
              if(incoming.mSal[eid] && incoming.mSal[eid].paid === undefined){
                incoming.mSal[eid].paid = false;
              }
            });
          }
          // للإصدارات القديمة: احتفظ ببيانات الرواتب الحالية للموظفين الموجودين
          if(isOldVersion && S.months[k] && S.months[k].mSal){
            if(!incoming.mSal) incoming.mSal = {};
            Object.keys(S.months[k].mSal).forEach(function(eid){
              if(!incoming.mSal[eid]) incoming.mSal[eid] = S.months[k].mSal[eid];
            });
          }
          S.months[k] = incoming;
        });
      }
      // الموظفون والموردون والهيكل: لا يُستبدلان من ملف قديم
      if(!isOldVersion){
        if(data.monthlyEmps&&data.monthlyEmps.length) S.monthlyEmps=data.monthlyEmps;
        if(data.dailyEmps&&data.dailyEmps.length) S.dailyEmps=data.dailyEmps;
        if(data.suppliers&&data.suppliers.length) S.suppliers=data.suppliers;
        if(data.lockedMonths) S.lockedMonths=data.lockedMonths;
      }
      if(data.activeKey) S.activeKey=data.activeKey;
      
      renderAll(); saveAll();
      
      // رفع تلقائي لـ Supabase بعد الاستيراد
      if(SUPA){
        supaSync('push').then(function(){
          toast('✅ تم الاستيراد وحفظه في السحابة ☁️');
        }).catch(function(){
          toast('✅ تم الاستيراد محلياً (Supabase لاحقاً)');
        });
      } else {
        toast('✅ تم الاستيراد — '+monthCount+' شهر');
      }
      log('استيراد JSON — '+monthCount+' شهر');
    }catch(err){ toast('❌ ملف تالف: '+err.message); }
  };
  reader.readAsText(file);
  ev.target.value='';
}

function importFromText(){
  var old=document.getElementById('pasteImportModal');
  if(old) old.remove();
  var modal=document.createElement('div');
  modal.id='pasteImportModal';
  modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:flex-end;justify-content:center;padding:0';
  var box=document.createElement('div');
  box.style.cssText='background:var(--surf);border-radius:16px 16px 0 0;width:100%;max-width:600px;padding:16px;max-height:80vh;display:flex;flex-direction:column;gap:10px';
  box.innerHTML='<div style="font-weight:700;font-size:15px;color:var(--tx)">📋 لصق نص JSON</div>'
    +'<div style="font-size:12px;color:var(--tx3)">افتح ملف JSON في أي محرر نصوص، انسخ المحتوى كاملاً، ثم الصقه هنا</div>'
    +'<textarea id="pasteImportTA" style="flex:1;min-height:200px;padding:10px;border:1.5px solid var(--br);border-radius:10px;font-size:11px;font-family:monospace;background:var(--bg);color:var(--tx);resize:none;direction:ltr" placeholder=\'{"version":"v25","months":{...}}\'></textarea>'
    +'<div style="display:flex;gap:8px">'
    +'<button onclick="document.getElementById(\'pasteImportModal\').remove()" style="flex:1;padding:12px;border:1px solid var(--br);background:transparent;border-radius:10px;font-size:13px;cursor:pointer;font-family:inherit;color:var(--tx)">إلغاء</button>'
    +'<button onclick="_doPasteImport()" style="flex:2;padding:12px;background:#1A4A28;color:#fff;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit">✅ استيراد</button>'
    +'</div>';
  modal.appendChild(box);
  modal.onclick=function(e){if(e.target===modal){modal.remove();}};
  document.body.appendChild(modal);
  setTimeout(function(){var ta=document.getElementById('pasteImportTA');if(ta)ta.focus();},200);
}

function _doPasteImport(){
  var ta=document.getElementById('pasteImportTA');
  if(!ta||!ta.value.trim()){toast('⚠️ الحقل فارغ');return;}
  var fakeEv={target:{files:[new Blob([ta.value],{type:'application/json'})],value:''}};
  fakeEv.target.files[0].name='paste.json';
  var modal=document.getElementById('pasteImportModal');
  // استخدم FileReader مباشرة
  var reader=new FileReader();
  reader.onload=function(e){
    try{
      var data=JSON.parse(e.target.result);
      if(!data.months&&!data.data){toast('❌ ملف غير صالح');return;}
      if(data.data&&data.data.months) data=data.data;
      var monthCount=Object.keys(data.months||{}).length;
      if(!confirm('⚠️ سيتم استبدال البيانات الحالية.\n\nعدد الأشهر: '+monthCount+'\n\nهل أنت متأكد؟')){return;}
      if(modal) modal.remove();
      if(data.months) Object.keys(data.months).forEach(function(k){S.months[k]=data.months[k];});
      if(data.monthlyEmps&&data.monthlyEmps.length) S.monthlyEmps=data.monthlyEmps;
      if(data.dailyEmps&&data.dailyEmps.length) S.dailyEmps=data.dailyEmps;
      if(data.suppliers&&data.suppliers.length) S.suppliers=data.suppliers;
      if(data.lockedMonths) S.lockedMonths=data.lockedMonths;
      if(data.activeKey) S.activeKey=data.activeKey;
      renderAll(); saveAll();
      if(SUPA) supaSync('push').then(function(){toast('✅ تم الاستيراد وحفظ في السحابة ☁️');}).catch(function(){toast('✅ تم الاستيراد — '+monthCount+' شهر');});
      else toast('✅ تم الاستيراد — '+monthCount+' شهر');
      log('استيراد JSON لصق — '+monthCount+' شهر');
    }catch(err){toast('❌ نص JSON غير صالح: '+err.message);}
  };
  reader.readAsText(new Blob([ta.value],{type:'application/json'}));
}

function exportExcel(){
  if(!window.XLSX){toast("❌ مكتبة Excel غير محملة");return;}
  const t=totals(),d=G();const[y,m]=S.activeKey.split("-");const mn=MN[parseInt(m)-1];
  const wb=XLSX.utils.book_new();
  const rv=[["ريحانة كافيه — الإيرادات"],[],["اليوم","نقدي","فيزا","مدفوعات","صافي البيع","إجمالي الإيراد","ملاحظات"]];
  let tC=0,tV=0,tP=0;
  d.sales.forEach(s=>{if((s.cash||0)+(s.visa||0)+(s.pmts||0)>0){const c=s.cash||0,v=s.visa||0,p=s.pmts||0;rv.push([`${s.day}/${m}`,c,v,p,c+v,c+v+p,s.notes||""]);tC+=c;tV+=v;tP+=p;}});
  rv.push(["المجموع",tC,tV,tP,tC+tV,tC+tV+tP,""]);
  const wsR=XLSX.utils.aoa_to_sheet(rv);wsR["!cols"]=[{wch:10},{wch:12},{wch:12},{wch:14},{wch:18},{wch:18},{wch:26}];XLSX.utils.book_append_sheet(wb,wsR,"الإيرادات");
  const pr=[["ريحانة كافيه — المشتريات"],[],["التاريخ","المورد","الفئة","البيان","المبلغ","الفاتورة"]];
  d.purchases.forEach(p=>pr.push([p.date,p.sName,catLbl(p.cat||"COGS"),p.desc||"",p.amt,p.inv||""]));
  pr.push(["الإجمالي","","","",d.purchases.reduce((s,p)=>s+p.amt,0),""]);
  const wsPr=XLSX.utils.aoa_to_sheet(pr);wsPr["!cols"]=[{wch:14},{wch:22},{wch:14},{wch:26},{wch:12},{wch:14}];XLSX.utils.book_append_sheet(wb,wsPr,"المشتريات");
  const ob=[["ريحانة كافيه — الالتزامات"],[],["الالتزام","المبلغ","الحالة","الاستحقاق"]];
  d.obligations.forEach(o=>ob.push([o.name,o.amt||0,o.paid?"مدفوع":"غير مدفوع",o.due||""]));
  ob.push(["الإجمالي",d.obligations.reduce((s,o)=>s+(o.amt||0),0),"",""]);
  const wsOb=XLSX.utils.aoa_to_sheet(ob);wsOb["!cols"]=[{wch:26},{wch:12},{wch:14},{wch:14}];XLSX.utils.book_append_sheet(wb,wsOb,"الالتزامات");
  const sl=[["ريحانة كافيه — الرواتب والأجور"],[],["الموظف","النوع","الأساسي","البدلات","الاستقطاعات","أيام الحضور","الإجمالي"]];
  S.monthlyEmps.forEach(e=>{const s=d.mSal[e.id]||{};sl.push([e.name,"شهري",s.base||0,s.allow||0,s.ded||0,"—",(s.base||0)+(s.allow||0)-(s.ded||0)]);});
  S.dailyEmps.forEach(e=>{const w=d.dWages[e.id]||{};const dy=(w.att||[]).length;sl.push([e.name,"يومي",w.rate||0,0,0,dy,(w.rate||0)*dy]);});
  const wsSl=XLSX.utils.aoa_to_sheet(sl);wsSl["!cols"]=[{wch:14},{wch:10},{wch:12},{wch:12},{wch:12},{wch:12},{wch:14}];XLSX.utils.book_append_sheet(wb,wsSl,"الرواتب");
  const av=[["ريحانة كافيه — السلف"],[],["الموظف","التاريخ","المبلغ","الحالة","الملاحظة"]];
  d.advances.forEach(a=>av.push([a.empName,a.date,a.amt,a.status,a.note||""]));
  const wsAv=XLSX.utils.aoa_to_sheet(av);wsAv["!cols"]=[{wch:14},{wch:14},{wch:12},{wch:16},{wch:26}];XLSX.utils.book_append_sheet(wb,wsAv,"السلف");
  const is=[["ريحانة كافيه — قائمة الدخل"],[`${mn} ${y}`],[],["البند","المبلغ (JD)"],
    ["الإيرادات",""],["نقدي",t.cash],["فيزا",t.visa],["صافي البيع",t.netSales],["مدفوعات",t.pmts],["إجمالي الإيرادات",t.rev],[],
    ["COGS",t.bycat.COGS],["مجمل الربح",t.grossP],[],["المصاريف التشغيلية",""],
    ...d.obligations.filter(o=>o.amt>0).map(o=>[o.name+(o.paid?" ✅":" ❌"),o.amt]),
    ["رواتب مدفوعة ✅",t.mSalPaid],["رواتب مستحقة ⏳",t.mSalAccrued],["أجور يومية (توثيق)",t.dwTotal],["OPS",t.bycat.OPS],["ADM",t.bycat.ADM],["MKT",t.bycat.MKT],
    ["إجمالي التكاليف",t.totalExp],[],["صافي الدخل",t.profit],["هامش الربح",t.margin.toFixed(2)+"%"]
  ];
  const wsIs=XLSX.utils.aoa_to_sheet(is);wsIs["!cols"]=[{wch:36},{wch:16}];XLSX.utils.book_append_sheet(wb,wsIs,"قائمة الدخل");
  XLSX.writeFile(wb,`ريحانة_كافيه_${mn}_${y}.xlsx`);toast("📗 تم تصدير Excel");log(`تصدير Excel — ${mn} ${y}`);
}
/* ═══════════════════════════════════════════════════════════════════════
   V25: PDF عربي صحيح — html2canvas يصوّر الصفحة كاملةً
   يحافظ على العربية 100% لأنه يحول الـ HTML لصورة ثم PDF
═══════════════════════════════════════════════════════════════════════ */
function exportPDF(){
  // أولاً: اذهب لصفحة التقرير وحدّثها
  const rptTab=document.querySelectorAll('.ntab')[3];
  pg('rpt',rptTab);
  updateRpt();
  toast('⏳ جاري إنشاء PDF — انتظر...');
  setTimeout(function(){
    const area=document.getElementById('rpt-printable');
    if(!area){
      // fallback: صوّر صفحة التقرير كاملة
      exportPDFFallback();
      return;
    }
    _renderPDFFromElement(area);
  },400);
}

function exportPDFFallback(){
  // صوّر كل محتوى التقرير
  const rptPage=document.getElementById('rpt');
  if(!rptPage||typeof html2canvas==='undefined'){
    toast('❌ مكتبة html2canvas غير محملة');
    return;
  }
  _renderPDFFromElement(rptPage);
}

function _renderPDFFromElement(el){
  if(typeof html2canvas==='undefined'){
    toast('❌ مكتبة html2canvas غير محملة');
    return;
  }
  // إضافة ترويسة عربية مؤقتة
  const[y,m]=S.activeKey.split('-');
  const mn=MN[parseInt(m)-1];
  const t=totals();
  // بناء HTML مؤقت للطباعة
  const printDiv=document.createElement('div');
  printDiv.style.cssText='position:fixed;top:-9999px;left:0;width:800px;background:#fff;color:#000;font-family:IBM Plex Sans Arabic,sans-serif;direction:rtl;padding:30px;font-size:13px;line-height:1.7';
  printDiv.innerHTML=`
    <div style="text-align:center;border-bottom:3px solid #C8920F;padding-bottom:16px;margin-bottom:20px">
      <div style="font-size:22px;font-weight:800;color:#1a1a1a">☕ ريحانة كافيه</div>
      <div style="font-size:15px;color:#666;margin-top:4px">قائمة الدخل — ${mn} ${y}</div>
      <div style="font-size:11px;color:#999;margin-top:2px">${new Date().toLocaleDateString('ar-JO',{year:'numeric',month:'long',day:'numeric'})}</div>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
      <thead><tr style="background:#1a1a1a;color:#fff"><th style="padding:10px;text-align:right">البند</th><th style="padding:10px;text-align:left;font-family:monospace">المبلغ (JD)</th></tr></thead>
      <tbody>
        <tr style="background:#f8f4ee"><td style="padding:8px 10px;font-weight:700;color:#C8920F">💰 الإيرادات</td><td></td></tr>
        <tr><td style="padding:6px 10px 6px 20px">النقدي الصافي</td><td style="padding:6px 10px;text-align:left;font-family:monospace;color:#059669">${n3(t.cash)}</td></tr>
        <tr><td style="padding:6px 10px 6px 20px">الفيزا</td><td style="padding:6px 10px;text-align:left;font-family:monospace;color:#059669">${n3(t.visa)}</td></tr>
        <tr style="background:#EFF6FF"><td style="padding:8px 10px 8px 20px;font-weight:700">صافي البيع (نقد + فيزا)</td><td style="padding:8px 10px;text-align:left;font-family:monospace;font-weight:700;color:#1d4ed8">${n3(t.netSales)}</td></tr>
        <tr style="color:#888"><td style="padding:6px 10px 6px 20px;font-size:11px">مدفوعات يومية (توثيق)</td><td style="padding:6px 10px;text-align:left;font-family:monospace;font-size:11px">${n3(t.pmts)}</td></tr>
        <tr style="background:#FEF9C3"><td style="padding:8px 10px;font-weight:700">إجمالي الإيرادات</td><td style="padding:8px 10px;text-align:left;font-family:monospace;font-weight:700">${n3(t.rev)}</td></tr>
        
        <tr style="background:#f8f4ee"><td style="padding:8px 10px;font-weight:700;color:#C8920F">📦 تكلفة البضاعة</td><td></td></tr>
        <tr><td style="padding:6px 10px 6px 20px">COGS</td><td style="padding:6px 10px;text-align:left;font-family:monospace;color:#DC2626">(${n3(t.bycat.COGS)})</td></tr>
        <tr style="background:${t.grossP>=0?'#F0FDF4':'#FEF2F2'}"><td style="padding:8px 10px;font-weight:700">مجمل الربح</td><td style="padding:8px 10px;text-align:left;font-family:monospace;font-weight:700;color:${t.grossP>=0?'#059669':'#DC2626'}">${n3(t.grossP)}</td></tr>
        
        <tr style="background:#f8f4ee"><td style="padding:8px 10px;font-weight:700;color:#C8920F">⚙️ المصاريف التشغيلية</td><td></td></tr>
        ${G().obligations.filter(o=>o.amt>0).map(o=>`<tr${!o.paid?' style="opacity:.5"':''}><td style="padding:6px 10px 6px 20px">${o.name}${o.paid?' ✅':' ⏳ (لم تُدفع)'}</td><td style="padding:6px 10px;text-align:left;font-family:monospace;color:${o.paid?'#DC2626':'#92400E'}">${o.paid?'('+n3(o.amt)+')':'—'}</td></tr>`).join('')}
        <tr><td style="padding:6px 10px 6px 20px">رواتب شهرية مدفوعة ✅</td><td style="padding:6px 10px;text-align:left;font-family:monospace;color:#DC2626">(${n3(t.mSalPaid)})</td></tr>
        ${t.mSalAccrued>0?`<tr style="opacity:.6"><td style="padding:6px 10px 6px 20px;font-size:11px">رواتب مستحقة ⏳ (لا تُطرح)</td><td style="padding:6px 10px;text-align:left;font-family:monospace;font-size:11px;color:#92400E">[${n3(t.mSalAccrued)}]</td></tr>`:''}
        <tr style="opacity:.5"><td style="padding:6px 10px 6px 20px;font-size:11px">أجور يومية (توثيق)</td><td style="padding:6px 10px;text-align:left;font-family:monospace;font-size:11px">(${n3(t.dwTotal)})</td></tr>
        
        <tr style="background:#FEF2F2"><td style="padding:8px 10px;font-weight:700">إجمالي التكاليف الفعلية</td><td style="padding:8px 10px;text-align:left;font-family:monospace;font-weight:700;color:#DC2626">(${n3(t.totalExp)})</td></tr>
      </tbody>
      <tfoot>
        <tr style="background:${t.profit>=0?'#059669':'#DC2626'};color:#fff">
          <td style="padding:14px 10px;font-size:16px;font-weight:800">صافي الدخل</td>
          <td style="padding:14px 10px;text-align:left;font-family:monospace;font-size:18px;font-weight:800">${n3(t.profit)} JD</td>
        </tr>
      </tfoot>
    </table>
    <div style="text-align:center;color:#666;font-size:10px;border-top:1px solid #eee;padding-top:10px">
      هامش الربح الصافي: ${t.margin.toFixed(2)}% | 
      المعادلة: صافي الربح = (نقد+فيزا) − (مشتريات + التزامات مدفوعة ✅ + رواتب مدفوعة ✅)
    </div>`;
  document.body.appendChild(printDiv);
  html2canvas(printDiv,{scale:2,backgroundColor:'#ffffff',useCORS:true,logging:false}).then(function(canvas){
    document.body.removeChild(printDiv);
    const imgData=canvas.toDataURL('image/png');
    const{jsPDF}=window.jspdf;
    const doc=new jsPDF({orientation:'p',unit:'mm',format:'a4'});
    const pdfW=doc.internal.pageSize.getWidth();
    const imgH=canvas.height*pdfW/canvas.width;
    const pdfH=doc.internal.pageSize.getHeight();
    if(imgH<=pdfH){
      doc.addImage(imgData,'PNG',0,0,pdfW,imgH);
    } else {
      let posY=0;
      while(posY<imgH){
        if(posY>0) doc.addPage();
        doc.addImage(imgData,'PNG',0,-posY,pdfW,imgH);
        posY+=pdfH;
      }
    }
    doc.save(`ريحانة_${mn}_${y}.pdf`);
    toast('📄 تم تصدير PDF بالعربية ✅');
    log(`تصدير PDF عربي — ${mn} ${y}`);
  }).catch(function(e){ toast('❌ خطأ PDF: '+e.message); });
}


// ════════════════════════════════════════════════════════════════
function renderAlerts() {
  var bar = document.getElementById('alertsBar');
  if (!bar) return;
  var t = totals(), d = G();
  var days = daysIn(S.activeKey);
  var active = d.sales.filter(function(s) { return (s.cash||0)+(s.visa||0)+(s.pmts||0) > 0; });
  var avg = active.length ? t.rev / active.length : 0;
  var alerts = [];

  // حساب يوم الشهر الحالي
  var ym = S.activeKey.split('-');
  var today = new Date();
  var isCurrentMonth = (today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')) === S.activeKey;
  var todayDay = isCurrentMonth ? today.getDate() : days;

  // 1. إيراد اليوم — إذا كان الشهر الحالي ولم يُدخل اليوم
  if (isCurrentMonth && active.length > 0) {
    var todaySale = d.sales.find(function(s) { return s.day === todayDay; });
    var todayRev = todaySale ? (todaySale.cash||0)+(todaySale.visa||0)+(todaySale.pmts||0) : 0;
    if (todayDay > 1 && todayRev === 0) {
      alerts.push({type:'warn', ico:'⏰', title:'لم يُدخل إيراد اليوم', sub:'اليوم '+todayDay+' من الشهر — أدخل البيانات في صفحة الإيرادات'});
    }
  }

  // 2. هامش الربح
  if (active.length >= 7 && t.margin < 0) {
    alerts.push({type:'crit', ico:'🚨', title:'الكافيه يعمل بخسارة', sub:'صافي الربح: '+n3(t.profit)+' JD — هامش: '+t.margin.toFixed(1)+'%'});
  } else if (active.length >= 7 && t.margin < 10 && t.margin >= 0) {
    alerts.push({type:'warn', ico:'⚠️', title:'هامش الربح منخفض جداً', sub:t.margin.toFixed(1)+'% — المعيار المقبول أعلى من 15%'});
  }

  // 3. COGS مرتفعة
  if (t.rev > 0 && active.length >= 5) {
    var cogsPct = t.bycat.COGS / t.rev * 100;
    if (cogsPct > 45) {
      alerts.push({type:'crit', ico:'🛒', title:'تكلفة البضاعة مرتفعة جداً', sub:cogsPct.toFixed(1)+'% من الإيراد — المعيار: 28-35%'});
    }
  }

  // 4. الالتزامات المتأخرة
  var overdue = d.obligations.filter(function(o) { return !o.paid && o.amt > 0; });
  if (overdue.length > 0) {
    var total = overdue.reduce(function(s,o) { return s + (o.amt||0); }, 0);
    alerts.push({type:'warn', ico:'📋', title:overdue.length+' التزامات غير مسددة', sub:n3(total)+' JD — '+overdue.map(function(o){return o.name;}).join(' | ')});
  }

  // 5. مخزون منخفض
  var lowInv = (S.inventory||[]).filter(function(i) { return i.min > 0 && i.qty <= i.min; });
  if (lowInv.length > 0) {
    alerts.push({type:'warn', ico:'📦', title:lowInv.length+' أصناف بحاجة تعبئة', sub:lowInv.map(function(i){return i.name;}).join(' | ')});
  }

  // 6. هدف الشهر
  var goal = S.targets && S.targets[S.activeKey] ? S.targets[S.activeKey] : 0;
  if (goal > 0 && active.length >= 7) {
    var projected = avg * days;
    if (projected < goal * 0.8) {
      alerts.push({type:'warn', ico:'🎯', title:'الإسقاط المتوقع أقل من الهدف', sub:'متوقع: '+n3(projected)+' JD | الهدف: '+n3(goal)+' JD'});
    } else if (t.rev >= goal) {
      alerts.push({type:'good', ico:'🎉', title:'تم تحقيق هدف الشهر!', sub:n3(t.rev)+' JD من '+n3(goal)+' JD'});
    }
  }

  // 7. رواتب الموظفين نسبة من الإيراد
  if (t.rev > 0 && active.length >= 7) {
    var salPct = (t.mSalG + t.dwTotal) / t.rev * 100;
    if (salPct > 40) {
      alerts.push({type:'warn', ico:'👷', title:'تكلفة الموظفين مرتفعة', sub:salPct.toFixed(1)+'% من الإيراد — راجع جدولة الحضور'});
    }
  }

  // 8. أداء إيجابي
  if (active.length >= 7 && t.margin >= 20) {
    alerts.push({type:'good', ico:'💚', title:'أداء ممتاز هذا الشهر', sub:'هامش '+t.margin.toFixed(1)+'% — استمر هكذا!'});
  }

  if (!alerts.length) {
    bar.style.display = 'none';
    return;
  }
  bar.style.display = 'flex';
  bar.innerHTML = alerts.map(function(a) {
    return '<div class="sa-item '+a.type+'">'+
      '<div class="sa-ico">'+a.ico+'</div>'+
      '<div class="sa-txt">'+
        '<div class="sa-title">'+a.title+'</div>'+
        (a.sub ? '<div class="sa-sub">'+a.sub+'</div>' : '')+
      '</div></div>';
  }).join('');
}

// ════════════════════════════════════════════════════════════════
// CAFE HEALTH SCORE (0-100)
// ════════════════════════════════════════════════════════════════
function renderHealthScore() {
  var scoreEl = document.getElementById('hsScore');
  var fillEl = document.getElementById('hsFill');
  var detailsEl = document.getElementById('hsDetails');
  if (!scoreEl || !fillEl || !detailsEl) return;

  var t = totals(), d = G();
  var active = d.sales.filter(function(s) { return (s.cash||0)+(s.visa||0)+(s.pmts||0) > 0; });
  var days = daysIn(S.activeKey);

  if (active.length < 3) {
    scoreEl.textContent = '—';
    var remaining = 3 - active.length;
    detailsEl.innerHTML = '<div style="font-size:11px;color:var(--tx3);margin-top:4px;text-align:center">📊 أدخل <strong style="color:var(--sap)">' + remaining + '</strong> ' + (remaining === 1 ? 'يوم إضافي' : 'أيام إضافية') + ' لتفعيل التقييم</div><div style="font-size:10px;color:var(--tx4);margin-top:6px">(' + active.length + ' من 3 أيام مطلوبة)</div>';
    fillEl.style.strokeDashoffset = 207.3;
    return;
  }

  // ── مكونات النقاط ──
  var scores = [];

  // 1. هامش الربح (25 نقطة)
  var marginScore = 0;
  if (t.margin >= 25) marginScore = 25;
  else if (t.margin >= 15) marginScore = 20;
  else if (t.margin >= 5)  marginScore = 12;
  else if (t.margin >= 0)  marginScore = 5;
  else marginScore = 0;
  scores.push({label:'هامش الربح', score:marginScore, max:25, color: marginScore>=20?'#34D399':marginScore>=12?'#F59E0B':'#EF4444'});

  // 2. نسبة COGS (20 نقطة)
  var cogsScore = 0;
  if (t.rev > 0) {
    var cp = t.bycat.COGS / t.rev * 100;
    if (cp <= 30) cogsScore = 20;
    else if (cp <= 38) cogsScore = 15;
    else if (cp <= 45) cogsScore = 8;
    else cogsScore = 2;
  } else { cogsScore = 10; }
  scores.push({label:'تكلفة البضاعة', score:cogsScore, max:20, color: cogsScore>=15?'#34D399':cogsScore>=8?'#F59E0B':'#EF4444'});

  // 3. نسبة الرواتب للإيراد (20 نقطة)
  var salScore = 0;
  if (t.rev > 0) {
    var sp = (t.mSalG + t.dwTotal) / t.rev * 100;
    if (sp <= 25) salScore = 20;
    else if (sp <= 35) salScore = 14;
    else if (sp <= 45) salScore = 7;
    else salScore = 2;
  } else { salScore = 10; }
  scores.push({label:'تكلفة الموظفين', score:salScore, max:20, color: salScore>=14?'#34D399':salScore>=7?'#F59E0B':'#EF4444'});

  // 4. انتظام الإدخال (15 نقطة)
  var inputScore = Math.min(15, Math.round(active.length / days * 15));
  scores.push({label:'انتظام الإدخال', score:inputScore, max:15, color: inputScore>=12?'#34D399':inputScore>=8?'#F59E0B':'#EF4444'});

  // 5. الالتزامات (10 نقطة)
  var oblScore = 0;
  var unpaid = d.obligations.filter(function(o) { return !o.paid && o.amt > 0; }).length;
  var total_obl = d.obligations.length;
  if (total_obl === 0) oblScore = 10;
  else if (unpaid === 0) oblScore = 10;
  else if (unpaid <= 1) oblScore = 6;
  else oblScore = 2;
  scores.push({label:'الالتزامات', score:oblScore, max:10, color: oblScore>=8?'#34D399':oblScore>=5?'#F59E0B':'#EF4444'});

  // 6. تحقيق الهدف (10 نقطة)
  var goalScore = 0;
  var goal = S.targets && S.targets[S.activeKey] ? S.targets[S.activeKey] : 0;
  var avg = active.length ? t.rev / active.length : 0;
  if (goal > 0) {
    var proj = avg * days;
    var goalPct = proj / goal;
    if (goalPct >= 1.0) goalScore = 10;
    else if (goalPct >= 0.85) goalScore = 7;
    else if (goalPct >= 0.7) goalScore = 4;
    else goalScore = 1;
  } else { goalScore = 5; }
  scores.push({label:'تحقق الهدف', score:goalScore, max:10, color: goalScore>=7?'#34D399':goalScore>=4?'#F59E0B':'#EF4444'});

  var total = scores.reduce(function(s,x) { return s + x.score; }, 0);

  // Update score circle
  var circumference = 2 * Math.PI * 33;
  var offset = circumference * (1 - total / 100);
  fillEl.style.strokeDashoffset = offset;
  var scoreColor = total >= 75 ? '#34D399' : total >= 50 ? '#F59E0B' : '#EF4444';
  fillEl.style.stroke = scoreColor;
  scoreEl.textContent = total;
  scoreEl.style.color = scoreColor;

  // Grade
  var grade = total >= 85 ? 'ممتاز' : total >= 70 ? 'جيد جداً' : total >= 55 ? 'جيد' : total >= 40 ? 'مقبول' : 'يحتاج تحسين';

  // Details bars
  detailsEl.innerHTML = '<div style="font-size:10px;font-weight:600;color:'+scoreColor+';margin-bottom:5px">'+grade+'</div>' +
    scores.slice(0, 4).map(function(s) {
      var pct = (s.score / s.max * 100).toFixed(0);
      return '<div class="hs-bar-row">'+
        '<div class="hs-br-label">'+s.label+'</div>'+
        '<div class="hs-br-track"><div class="hs-br-fill" style="width:'+pct+'%;background:'+s.color+'"></div></div>'+
        '<div class="hs-br-val">'+s.score+'/'+s.max+'</div>'+
        '</div>';
    }).join('');
}

// ════════════════════════════════════════════════════════════════
// BREAK-EVEN TRACKER
// ════════════════════════════════════════════════════════════════
function renderBreakEven() {
  var body = document.getElementById('beBody');
  if (!body) return;
  var t = totals(), d = G();
  var days = daysIn(S.activeKey);
  var active = d.sales.filter(function(s) { return (s.cash||0)+(s.visa||0)+(s.pmts||0) > 0; });
  var avg = active.length ? t.rev / active.length : 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // V24-2 FIX: إصلاح نقطة التعادل
  // التكاليف الثابتة = التزامات مدفوعة + رواتب شهرية + OPS + ADM
  // التكاليف المتغيرة = COGS فقط
  // ═══════════════════════════════════════════════════════════════════════════
  // Fixed costs = التزامات مدفوعة + رواتب شهرية + OPS + ADM
  var fixedMonthly = d.obligations.filter(function(o) { return o.paid; }).reduce(function(s,o) { return s+(o.amt||0); }, 0) 
                   + (t.mSalPaid||0) 
                   + (t.bycat.OPS||0) 
                   + (t.bycat.ADM||0);
  // Variable costs per JD revenue = COGS% فقط (تتغير مع حجم المبيعات)
  var varRate = t.rev > 0 ? t.bycat.COGS / t.rev : 0.35;
  // Daily break-even = fixed/days / (1 - varRate)
  var dailyFixed = fixedMonthly / days;
  var dailyBE = (1 - varRate) > 0 ? dailyFixed / (1 - varRate) : 0;
  // Monthly break-even
  var monthlyBE = dailyBE * days;

  var above = avg >= dailyBE && avg > 0;
  var surplus = avg - dailyBE;

  if (fixedMonthly === 0) {
    body.innerHTML = '<div style="text-align:center;padding:10px 0"><div style="font-size:24px;margin-bottom:8px">📋</div><div style="font-size:11px;color:var(--tx3);line-height:1.6">أضف <strong style="color:var(--sap)">الالتزامات الثابتة</strong> و<strong style="color:var(--sap)">الرواتب الشهرية</strong><br>لحساب نقطة التعادل</div><div style="font-size:10px;color:var(--tx4);margin-top:8px">← من تبويب الالتزامات والرواتب</div></div>';
    return;
  }

  body.innerHTML =
    '<div class="be-row"><div class="be-lbl">تكاليف ثابتة/شهر</div><div class="be-val">'+n3(fixedMonthly)+' JD</div></div>'+
    '<div class="be-row"><div class="be-lbl">إيراد التعادل اليومي</div><div class="be-val" style="color:'+(above?'var(--gn)':'var(--rd)')+'">'+n3(dailyBE)+' JD</div></div>'+
    '<div class="be-row"><div class="be-lbl">متوسطك اليومي</div><div class="be-val">'+n3(avg)+' JD</div></div>'+
    (active.length > 0 ?
    '<div class="be-status '+(above?'above':'below')+'">'+
      (above ? '✅ فوق نقطة التعادل بـ '+n3(Math.abs(surplus))+' JD/يوم' : '❌ تحت نقطة التعادل بـ '+n3(Math.abs(surplus))+' JD/يوم')+
    '</div>' : '<div class="be-status" style="background:var(--surf3);color:var(--tx3)">أدخل بيانات لتفعيل المقارنة</div>');
}

// ════════════════════════════════════════════════════════════════
// WEEKLY HEATMAP (آخر 7 أيام مُدخلة)
// ════════════════════════════════════════════════════════════════
function renderWeeklyHeat() {
  var grid = document.getElementById('weeklyHeat');
  if (!grid) return;
  var d = G();
  var active = d.sales.filter(function(s) { return (s.cash||0)+(s.visa||0)+(s.pmts||0) > 0; });
  if (!active.length) { 
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:15px 8px"><div style="font-size:20px;margin-bottom:6px">📅</div><div style="color:var(--tx3);font-size:11px">أدخل بيانات الإيرادات لعرض أداء الأيام</div><div style="color:var(--tx4);font-size:10px;margin-top:4px">← من تبويب الإيرادات</div></div>'; 
    return; 
  }

  var last7 = active.slice(-7);
  var maxRev = Math.max.apply(null, last7.map(function(s) { return (s.cash||0)+(s.visa||0)+(s.pmts||0); })) || 1;
  var avg7 = last7.reduce(function(sum,s) { return sum+(s.cash||0)+(s.visa||0)+(s.pmts||0); }, 0) / last7.length;
  var ym = S.activeKey.split('-');

  // pad to 7 cells
  var padded = [];
  for (var i = 0; i < 7 - last7.length; i++) padded.push(null);
  last7.forEach(function(s) { padded.push(s); });

  grid.innerHTML = padded.map(function(s) {
    if (!s) return '<div class="wh-day" style="opacity:.2"><div class="wh-dn">—</div><div class="wh-dv" style="color:var(--tx4)">—</div></div>';
    var rev = (s.cash||0)+(s.visa||0)+(s.pmts||0);
    var ratio = rev / maxRev;
    var alpha = 0.1 + ratio * 0.6;
    var isHigh = rev >= avg7 * 1.15;
    var isLow = rev < avg7 * 0.8;
    var col = isHigh ? 'rgba(52,211,153,' : isLow ? 'rgba(239,68,68,' : 'rgba(200,146,15,';
    var textCol = isHigh ? '#34D399' : isLow ? '#EF4444' : '#C8920F';
    return '<div class="wh-day" style="background:'+col+alpha+')">' +
      '<div class="wh-dn">'+s.day+'/'+ym[1]+'</div>'+
      '<div class="wh-dv" style="color:'+textCol+'">'+n3(rev)+'</div>'+
      '<div class="wh-ds">'+(s.receivedBy||'—')+'</div>'+
    '</div>';
  }).join('');
}

// ════════════════════════════════════════════════════════════════
// HOOK: extend updateDash to call new functions
// ════════════════════════════════════════════════════════════════
const _udOrig2 = updateDash;
updateDash = function() {
  _udOrig2();
  try { renderAlerts(); } catch(e) { console.error('renderAlerts error:', e); }
  try { renderHealthScore(); } catch(e) { console.error('renderHealthScore error:', e); }
  try { renderBreakEven(); } catch(e) { console.error('renderBreakEven error:', e); }
  try { renderWeeklyHeat(); } catch(e) { console.error('renderWeeklyHeat error:', e); }
};


// ════════════════════════════════════════════════
// TARGETS
// ════════════════════════════════════════════════
function saveTarget(){
  var v=parseFloat(document.getElementById('targetInput').value)||0;
  if(!S.targets)S.targets={};
  S.targets[S.activeKey]=v;
  saveAll();renderTarget();toast('✅ تم حفظ الهدف');
}
function renderTarget(){
  if(!S.targets)S.targets={};
  var goal=S.targets[S.activeKey]||0;
  var t=totals();
  var inp=document.getElementById('targetInput');
  if(inp&&goal>0&&inp.value==='')inp.value=goal;
  var pct=goal>0?Math.min(100,t.rev/goal*100):0;
  var bar=document.getElementById('targetBar');
  var pctEl=document.getElementById('targetPct');
  var curEl=document.getElementById('targetCurrent');
  var remEl=document.getElementById('targetRemain');
  if(bar){
    bar.style.width=pct.toFixed(0)+'%';
    bar.style.background=pct>=100?'linear-gradient(90deg,#34D399,#059669)':pct>=70?'linear-gradient(90deg,#C8920F,#F0B429)':'linear-gradient(90deg,#EF4444,#F97316)';
  }
  if(pctEl){pctEl.textContent=pct.toFixed(0)+'%';pctEl.style.color=pct>=100?'var(--gn)':pct>=70?'#F0B429':'var(--rd)';}
  if(curEl)curEl.textContent='محقق: '+n3(t.rev)+' JD';
  if(remEl)remEl.textContent=goal>0?'متبقي: '+n3(Math.max(0,goal-t.rev))+' JD':'حدد هدفاً';
}

// ════════════════════════════════════════════════
