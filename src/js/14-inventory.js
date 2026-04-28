// INVENTORY
// ════════════════════════════════════════════════
const INV_ICO={'\u0642\u0647\u0648\u0629':'\u2615','\u062d\u0644\u064a\u0628':'\uD83E\uDD5B','\u0645\u0648\u0627\u062f':'\uD83E\uDDF4','\u062a\u0639\u0628\u0626\u0629':'\uD83D\uDCE6','\u0623\u062e\u0631\u0649':'\uD83D\uDCCB'};
function openInvEdit(idx){
  if(!S.inventory)S.inventory=[];
  var item=S.inventory[idx];
  if(!item)return;
  document.getElementById('invEditIdx').value=idx;
  document.getElementById('invName').value=item.name;
  document.getElementById('invCat').value=item.cat;
  document.getElementById('invQty').value=item.qty;
  document.getElementById('invUnit').value=item.unit;
  document.getElementById('invMin').value=item.min||0;
  document.getElementById('invPrice').value=item.price||0;
  openMo('moInv');
}
function saveInvItem(){
  if(!S.inventory)S.inventory=[];
  var name=document.getElementById('invName').value.trim();
  var cat=document.getElementById('invCat').value;
  var qty=parseFloat(document.getElementById('invQty').value)||0;
  var unit=document.getElementById('invUnit').value.trim()||'\u0648\u062d\u062f\u0629';
  var min=parseFloat(document.getElementById('invMin').value)||0;
  var price=parseFloat(document.getElementById('invPrice').value)||0;
  if(!name){toast('\u0623\u062f\u062e\u0644 \u0627\u0633\u0645 \u0627\u0644\u0635\u0646\u0641');return;}
  var ei=parseInt(document.getElementById('invEditIdx').value);
  if(ei>=0&&S.inventory[ei]){
    S.inventory[ei]={...S.inventory[ei],name:name,cat:cat,qty:qty,unit:unit,min:min,price:price};
  } else {
    S.inventory.push({id:'i'+Date.now(),name:name,cat:cat,qty:qty,unit:unit,min:min,price:price});
  }
  cmo('moInv');
  ['invName','invQty','invUnit','invMin','invPrice'].forEach(function(id){document.getElementById(id).value='';});
  document.getElementById('invEditIdx').value='-1';
  renderInvList();saveAll();
  toast('\u2705 \u062a\u0645 \u0627\u0644\u062d\u0641\u0638');
}
function renderInvList(){
  if(!S.inventory)S.inventory=[];
  var c=document.getElementById('invList');
  if(!c)return;
  renderTarget();
  if(!S.inventory.length){c.innerHTML='<div class="alert al-i">\u0623\u0636\u0641 \u0623\u0635\u0646\u0627\u0641 \u0627\u0644\u0645\u062e\u0632\u0648\u0646 \u0644\u0645\u062a\u0627\u0628\u0639\u0629 \u0627\u0644\u0643\u0645\u064a\u0627\u062a \u0648\u0627\u0644\u062a\u0646\u0628\u064a\u0647\u0627\u062a</div>';return;}
  var low=S.inventory.filter(function(i){return i.min>0&&i.qty<=i.min;});
  var html=low.length?'<div class="alert al-e" style="margin-bottom:10px">\u26a0\ufe0f '+low.length+' \u0623\u0635\u0646\u0627\u0641 \u0628\u062d\u0627\u062c\u0629 \u062a\u0639\u0628\u0626\u0629: '+low.map(function(i){return i.name;}).join('\u060c ')+'</div>':'';
  S.inventory.forEach(function(item,idx){
    var isLow=item.min>0&&item.qty<=item.min;
    var pct=item.min>0?Math.min(100,item.qty/(item.min)*100):50;
    var bc=isLow?'#EF4444':item.qty>item.min*2?'#34D399':'#F0B429';
    var ico=INV_ICO[item.cat]||'\uD83D\uDCE6';
    var totVal=item.price>0?n3(item.qty*item.price)+' JD':'';
    html+='<div class="inv-item '+(isLow?'low':'ok')+'" style="'+(isLow?'':'')+'">'+
      '<div class="inv-ico">'+ico+'</div>'+
      '<div class="inv-info">'+
        '<div class="inv-name">'+item.name+'</div>'+
        '<div class="inv-meta">'+item.cat+(item.price>0?' \u00b7 '+n3(item.price)+' JD/'+item.unit:'')+(totVal?' \u00b7 \u0642\u064a\u0645\u0629: '+totVal:'')+(item.min>0?' \u00b7 \u062d\u062f \u062f\u0646\u0649: '+item.min+' '+item.unit:'')+'</div>'+
        '<div class="inv-bar"><div class="inv-bar-f" style="width:'+pct+'%;background:'+bc+'"></div></div>'+
      '</div>'+
      '<div class="inv-qty">'+
        '<div class="inv-qty-val" style="color:'+(isLow?'var(--rd)':'var(--gn)')+'">'+item.qty+'</div>'+
        '<div class="inv-qty-unit">'+item.unit+'</div>'+
        '<div style="display:flex;gap:3px;margin-top:4px">'+
          '<button onclick="invAdj('+idx+',-1)" style="width:26px;height:22px;border-radius:5px;border:1px solid var(--br);background:var(--surf);color:var(--tx);cursor:pointer;font-size:13px;font-weight:700">\u2212</button>'+
          '<button onclick="invAdj('+idx+',1)" style="width:26px;height:22px;border-radius:5px;border:1px solid var(--br);background:var(--surf);color:var(--tx);cursor:pointer;font-size:13px;font-weight:700">+</button>'+
          '<button onclick="openInvEdit('+idx+')" style="width:26px;height:22px;border-radius:5px;border:1px solid var(--br);background:var(--surf);color:var(--tx3);cursor:pointer;font-size:11px">\u270e\ufe0f</button>'+
          '<button onclick="invDel('+idx+')" style="width:26px;height:22px;border-radius:5px;border:1px solid rgba(239,68,68,.4);background:rgba(239,68,68,.07);color:var(--rd);cursor:pointer;font-size:11px">\u00d7</button>'+
        '</div>'+
      '</div></div>';
  });
  c.innerHTML=html;
}
function invAdj(idx,dir){
  if(!S.inventory||!S.inventory[idx])return;
  var step=parseFloat(prompt('\u0643\u0645\u064a\u0629 \u0627\u0644\u062a\u0639\u062f\u064a\u0644\u061f','1'))||1;
  if(isNaN(step)||step<=0)return;
  S.inventory[idx].qty=Math.max(0,+(S.inventory[idx].qty+dir*step).toFixed(3));
  renderInvList();saveAll();
  log('\u0645\u062e\u0632\u0648\u0646 \u2014 '+S.inventory[idx].name+' \u2192 '+S.inventory[idx].qty+' '+S.inventory[idx].unit);
}
function invDel(idx){
  if(!confirm('\u062d\u0630\u0641 \u0627\u0644\u0635\u0646\u0641\u061f'))return;
  S.inventory.splice(idx,1);renderInvList();saveAll();toast('\uD83D\uDDD1\uFE0F \u062d\u064f\u0630\u0641');
}

// ════════════════════════════════════════════════
