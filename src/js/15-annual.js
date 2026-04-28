// ANNUAL VIEW
// ════════════════════════════════════════════════
const MNA=['\u064a\u0646\u0627\u064a\u0631','\u0641\u0628\u0631\u0627\u064a\u0631','\u0645\u0627\u0631\u0633','\u0623\u0628\u0631\u064a\u0644','\u0645\u0627\u064a\u0648','\u064a\u0648\u0646\u064a\u0648','\u064a\u0648\u0644\u064a\u0648','\u0623\u063a\u0633\u0637\u0633','\u0633\u0628\u062a\u0645\u0628\u0631','\u0623\u0643\u062a\u0648\u0628\u0631','\u0646\u0648\u0641\u0645\u0628\u0631','\u062f\u064a\u0633\u0645\u0628\u0631'];
function initAnnualYear(){
  var sel=document.getElementById('annualYear');if(!sel)return;
  sel.innerHTML='';
  [2024,2025,2026,2027].forEach(function(y){
    var o=document.createElement('option');o.value=y;o.textContent=y;
    if(y===parseInt(S.activeKey.split('-')[0]))o.selected=true;
    sel.appendChild(o);
  });
  buildCmpSelects();
}
function buildCmpSelects(){
  ['cmpA','cmpB'].forEach(function(sid){
    var sel=document.getElementById(sid);if(!sel)return;
    sel.innerHTML='';
    [2025,2026,2027].forEach(function(yr){
      for(var m=1;m<=12;m++){
        var k=yr+'-'+String(m).padStart(2,'0');
        var md=S.months[k];
        var hasData=md&&md.sales.some(function(s){return (s.cash||0)+(s.visa||0)+(s.pmts||0)>0;});
        if(!hasData)continue;
        var o=document.createElement('option');o.value=k;o.textContent=MNA[m-1]+' '+yr;
        if(sid==='cmpA'&&k===S.activeKey)o.selected=true;
        sel.appendChild(o);
      }
    });
  });
}
function renderAnnual(){
  var sel=document.getElementById('annualYear');if(!sel)return;
  var year=parseInt(sel.value)||2026;
  var grid=document.getElementById('annualGrid');if(!grid)return;
  var annRev=0,annExp=0,bestM='',bestRev=0;
  var rows=[];
  for(var m=1;m<=12;m++){
    var key=year+'-'+String(m).padStart(2,'0');
    var md=S.months[key];
    var rev=0,exp=0;
    if(md){
      md.sales.forEach(function(s){rev+=(s.cash||0)+(s.visa||0)+(s.pmts||0);});
      md.purchases.forEach(function(p){exp+=p.amt||0;});
    }
    annRev+=rev;annExp+=exp;
    if(rev>bestRev){bestRev=rev;bestM=MNA[m-1];}
    rows.push({m:m,key:key,rev:rev,exp:exp,profit:rev-exp,hasData:rev>0||exp>0,isActive:key===S.activeKey,name:MNA[m-1]});
  }
  T('ann-tot-rev',n3(annRev));T('ann-tot-exp',n3(annExp));
  var profEl=document.getElementById('ann-tot-profit');
  if(profEl){profEl.textContent=n3(annRev-annExp);profEl.style.color=(annRev-annExp)>=0?'var(--gn)':'var(--rd)';}
  T('ann-best-month',bestM||'\u2014');
  var maxR=0;rows.forEach(function(r){if(r.rev>maxR)maxR=r.rev;});if(!maxR)maxR=1;
  grid.innerHTML=rows.map(function(r){
    var bw=(r.rev/maxR*100).toFixed(0);
    var cls=(r.isActive?'active-month':'')+(r.hasData?' has-data':'');
    var pc=r.profit>=0?'var(--gn)':'var(--rd)';
    var onclick="switchMonth('"+r.key+"');pg('rev',document.querySelectorAll('.ntab')[1])";
    return '<div class="ann-cell '+cls+'" onclick="'+onclick+'">'+
      '<div class="ann-m">'+r.name+'</div>'+
      (r.hasData?
        '<div class="ann-v">'+n3(r.rev)+'</div>'+
        '<div class="ann-sub" style="color:'+pc+'">'+n3(r.profit)+'</div>'+
        '<div class="ann-bar"><div class="ann-bar-f" style="width:'+bw+'%"></div></div>':
        '<div class="ann-sub" style="color:var(--tx4)">\u2014</div>'+
        '<div class="ann-bar"></div>')+
      '</div>';
  }).join('');
  buildCmpSelects();
  renderCompare();
}
function renderCompare(){
  var aEl=document.getElementById('cmpA'),bEl=document.getElementById('cmpB');
  var c=document.getElementById('compareResult');if(!c)return;
  if(!aEl||!bEl||!aEl.value||!bEl.value||aEl.value===bEl.value){
    c.innerHTML='<div class="alert al-i">\u0627\u062e\u062a\u0631 \u0634\u0647\u0631\u064a\u0646 \u0645\u062e\u062a\u0644\u0641\u064a\u0646 \u0644\u0644\u0645\u0642\u0627\u0631\u0646\u0629</div>';return;
  }
  function gs(key){
    var md=S.months[key];if(!md)return{rev:0,exp:0,profit:0,days:0,avg:0,cogs:0};
    var rev=0,exp=0,days=0,cogs=0;
    md.sales.forEach(function(s){var t=(s.cash||0)+(s.visa||0)+(s.pmts||0);rev+=t;if(t>0)days++;});
    md.purchases.forEach(function(p){exp+=p.amt||0;if(p.cat==='COGS')cogs+=p.amt||0;});
    return{rev:rev,exp:exp,profit:rev-exp,days:days,avg:days?rev/days:0,cogs:cogs};
  }
  var A=gs(aEl.value),B=gs(bEl.value);
  var aN=MNA[parseInt(aEl.value.split('-')[1])-1],bN=MNA[parseInt(bEl.value.split('-')[1])-1];
  function row(lbl,av,bv,hib){
    var diff=av-bv,pct=bv>0?(diff/bv*100):0;
    var col=diff===0?'var(--tx3)':((diff>0)===hib?'var(--gn)':'var(--rd)');
    var arr=diff>0?'\u25b2':diff<0?'\u25bc':'=';
    return '<tr>'+
      '<td style="font-size:11px;padding:5px 4px;color:var(--tx2)">'+lbl+'</td>'+
      '<td class="num" style="font-size:12px;font-weight:700">'+n3(av)+'</td>'+
      '<td class="num" style="font-size:12px;font-weight:700">'+n3(bv)+'</td>'+
      '<td class="num" style="font-size:11px;font-weight:700;color:'+col+'">'+arr+' '+Math.abs(pct).toFixed(1)+'%</td>'+
      '</tr>';
  }
  c.innerHTML='<div class="tbl-wrap"><table>'+
    '<thead><tr><th>\u0627\u0644\u0628\u0646\u062f</th><th>'+aN+'</th><th>'+bN+'</th><th>\u0627\u0644\u0641\u0631\u0642</th></tr></thead>'+
    '<tbody>'+
    row('\u0627\u0644\u0625\u064a\u0631\u0627\u062f \u0627\u0644\u0643\u0644\u064a',A.rev,B.rev,true)+
    row('\u062a\u0643\u0644\u0641\u0629 \u0627\u0644\u0628\u0636\u0627\u0639\u0629 COGS',A.cogs,B.cogs,false)+
    row('\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062a',A.exp,B.exp,false)+
    row('\u0635\u0627\u0641\u064a \u0627\u0644\u0631\u0628\u062d',A.profit,B.profit,true)+
    row('\u0627\u0644\u0645\u062a\u0648\u0633\u0637 \u0627\u0644\u064a\u0648\u0645\u064a',A.avg,B.avg,true)+
    row('\u0623\u064a\u0627\u0645 \u0627\u0644\u062a\u0634\u063a\u064a\u0644',A.days,B.days,true)+
    '</tbody></table></div>';
}

// ════════════════════════════════════════════════
