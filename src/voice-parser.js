/**
 * voice-parser.js — محلّل أوامر صوتية/كتابية عربية
 *
 * هذا الملف هو المصدر المرجعي الذي تُجرى عليه اختبارات Jest.
 * النسخة المنسوخة داخل index.html (داخل قسم SECTION: VOICE INPUT)
 * يجب أن تبقى مطابقة. أي تعديل هنا = تعديل في index.html.
 *
 * يتعامل مع:
 *   - أرقام عربية مكتوبة (٠-٩) ومنطوقة (مية، ميتين، ألف وخمسمية)
 *   - استخراج نية الأمر: شراء، مبيعات، سلفة، تعليم راتب
 *   - استخراج الكيانات: مبلغ، مورد، اسم موظف، نقدي/فيزا/مدفوعات
 */

'use strict';

const _AR_DIGITS = {'٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9',
                    '۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9'};

const _AR_UNITS = {
  'صفر':0,'لا':0,
  'واحد':1,'واحده':1,'وحده':1,
  'اثنين':2,'اتنين':2,'تنين':2,'اثنان':2,'اثنتين':2,'ثنين':2,
  'ثلاثه':3,'ثلاث':3,'تلاته':3,'تلت':3,
  'اربعه':4,'اربع':4,
  'خمسه':5,'خمس':5,
  'سته':6,'ست':6,
  'سبعه':7,'سبع':7,
  'ثمانيه':8,'تمانيه':8,'تمن':8,'ثمن':8,
  'تسعه':9,'تسع':9,
  'عشره':10,'عشر':10
};

const _AR_TEENS = {
  'حداعش':11,'احداعش':11,'احدعشر':11,
  'اطناعش':12,'اتناعش':12,'اطنعش':12,'اتنعش':12,
  'تلتعش':13,'تلطعش':13,'تلتطعش':13,
  'اربعطعش':14,'اربعتعش':14,
  'خمسطعش':15,'خمستعش':15,
  'ستطعش':16,'ستتعش':16,
  'سبعطعش':17,'سبعتعش':17,
  'تمنطعش':18,'تمنتعش':18,
  'تسعطعش':19,'تسعتعش':19
};

const _AR_TENS = {
  'عشرين':20,'عشرون':20,
  'ثلاثين':30,'تلاتين':30,'ثلاثون':30,
  'اربعين':40,
  'خمسين':50,
  'ستين':60,
  'سبعين':70,
  'تمانين':80,'ثمانين':80,
  'تسعين':90
};

const _AR_HUNDREDS = {
  'ميه':100,'مايه':100,'ميا':100,'مايا':100,'مئه':100,'مائه':100,
  'ميتين':200,'مئتين':200,'مايتين':200,
  'تلتميه':300,'ثلاثميه':300,'ثلاثمائه':300,'تلاتميه':300,
  'اربعميه':400,'اربعمائه':400,
  'خمسميه':500,'خمسمائه':500,
  'ستميه':600,'ستمائه':600,
  'سبعميه':700,'سبعمائه':700,
  'تمنميه':800,'ثمنميه':800,'تمانميه':800,'ثمانمائه':800,
  'تسعميه':900,'تسعمائه':900
};

const _AR_THOUSANDS = {'الف':1000,'ألف':1000,'الفين':2000,'ألفين':2000,'الفان':2000};
const _AR_TH_MULT = {'الاف':1000,'آلاف':1000,'تلاف':1000,'تالاف':1000};

function _normalizeArabic(s){
  if(!s) return '';
  s = String(s);
  s = s.replace(/[٠-٩۰-۹]/g, function(d){ return _AR_DIGITS[d] || d; });
  s = s.replace(/[إأآا]/g,'ا');
  s = s.replace(/ى/g,'ي');
  s = s.replace(/ة/g,'ه');
  s = s.replace(/ؤ/g,'و').replace(/ئ/g,'ي');
  s = s.replace(/[ً-ْٰ]/g,'');
  s = s.replace(/ـ/g,'');
  s = s.replace(/[،,]/g,' ');
  s = s.replace(/\s+/g,' ').trim();
  return s;
}

/**
 * يجرّد بادئات «و» (and) و«ب» (with/by) من توكن لأغراض كشف الأرقام.
 * "وخمسين" → "خمسين"، "بمية" → "ميه".
 * لكن لا نُجرّد إن كانت الكلمة الكاملة رقماً معروفاً («واحد» = 1، «الف» ≠ "ل + الف»).
 * هكذا «ألف» (1000) يبقى، و«واحد» (1) يبقى، و«وعشرين» (و+20) تُجرّد.
 */
function _stripNumPrefix(t){
  if(!t) return '';
  const s = String(t);
  if(Object.prototype.hasOwnProperty.call(_AR_UNITS, s)
      || Object.prototype.hasOwnProperty.call(_AR_TEENS, s)
      || Object.prototype.hasOwnProperty.call(_AR_TENS, s)
      || Object.prototype.hasOwnProperty.call(_AR_HUNDREDS, s)
      || Object.prototype.hasOwnProperty.call(_AR_THOUSANDS, s)
      || Object.prototype.hasOwnProperty.call(_AR_TH_MULT, s)){
    return s;
  }
  return s.replace(/^و/,'').replace(/^ب(?=[ا-ي])/,'');
}

function _isNumberToken(t){
  if(!t) return false;
  const s = _stripNumPrefix(t);
  if(!s) return false;
  return Object.prototype.hasOwnProperty.call(_AR_UNITS, s)
      || Object.prototype.hasOwnProperty.call(_AR_TEENS, s)
      || Object.prototype.hasOwnProperty.call(_AR_TENS, s)
      || Object.prototype.hasOwnProperty.call(_AR_HUNDREDS, s)
      || Object.prototype.hasOwnProperty.call(_AR_THOUSANDS, s)
      || Object.prototype.hasOwnProperty.call(_AR_TH_MULT, s)
      || /^\d+(?:\.\d+)?$/.test(s);
}

function _parseArabicNumber(text){
  if(text == null) return null;
  const norm = _normalizeArabic(text);
  if(!norm) return null;
  if(/^[\d.]+$/.test(norm)) return parseFloat(norm);
  const tokens = norm.split(/\s+/);
  let total = 0, current = 0, found = false;
  for(let i=0; i<tokens.length; i++){
    const t = _stripNumPrefix(tokens[i]);
    if(!t) continue;
    if(Object.prototype.hasOwnProperty.call(_AR_UNITS, t)){ current = _AR_UNITS[t]; found = true; }
    else if(Object.prototype.hasOwnProperty.call(_AR_TEENS, t)){ total += _AR_TEENS[t]; current = 0; found = true; }
    else if(Object.prototype.hasOwnProperty.call(_AR_TENS, t)){ total += _AR_TENS[t] + current; current = 0; found = true; }
    else if(Object.prototype.hasOwnProperty.call(_AR_HUNDREDS, t)){ total += _AR_HUNDREDS[t]; current = 0; found = true; }
    else if(Object.prototype.hasOwnProperty.call(_AR_THOUSANDS, t)){ total += _AR_THOUSANDS[t]; current = 0; found = true; }
    else if(Object.prototype.hasOwnProperty.call(_AR_TH_MULT, t)){ total += (current || 1) * 1000; current = 0; found = true; }
    else if(/^\d+(?:\.\d+)?$/.test(t)){ total += parseFloat(t); found = true; }
  }
  total += current;
  return found ? total : null;
}

/**
 * يستخرج النية والكيانات من نصّ أمر عربي.
 * @param {string} text  الأمر المنطوق/المكتوب
 * @param {object} [ctx] السياق: { suppliers:[{id,name}], employees:[{id,name}], today:Date }
 * @returns {object}     { intent, fields, raw, normalized, amounts }
 */
function _parseVoiceCommand(text, ctx){
  ctx = ctx || {};
  const suppliers = ctx.suppliers || [];
  const employees = ctx.employees || [];
  const today = ctx.today || new Date();

  if(!text) return { intent:'unknown', fields:{}, raw:'', normalized:'', amounts:[] };
  const raw = String(text).trim();
  const norm = _normalizeArabic(raw).toLowerCase();

  let intent = 'unknown';
  if(/سلفه|اعطيت.{0,15}سلف/.test(norm)) intent = 'advance';
  else if(/اشتري|فاتور|اخذت من|استلمت من/.test(norm)) intent = 'purchase';
  else if(/كاش|فيزا|مبيعات|بعت|باع|مدفوعات/.test(norm)) intent = 'sale';
  else if(/دفعت.{0,15}راتب|راتب.{0,15}دفعت|سلمت.{0,15}راتب/.test(norm)) intent = 'salary';

  const fields = {};
  const tokens = norm.split(/\s+/);

  // كل التسلسلات الرقمية (يحافظ على «و» المنفصلة بين الأرقام)
  const runs = [];
  let cur = [];
  for(let i=0; i<tokens.length; i++){
    const tk = tokens[i];
    if(_isNumberToken(tk) || (cur.length && tk === 'و')){
      cur.push(tk);
    } else {
      if(cur.length){ runs.push(cur.join(' ')); cur = []; }
    }
  }
  if(cur.length) runs.push(cur.join(' '));
  const amounts = runs.map(_parseArabicNumber).filter(n => n != null && n > 0);

  let dayNum = today.getDate();
  if(/امس|البارحه/.test(norm)) dayNum = Math.max(1, dayNum - 1);

  if(intent === 'sale'){
    function _amtAfter(keyword){
      const m = norm.match(new RegExp(keyword + '\\s+([^\\.،,؟!]*?)(?:\\s+(?:و(?:كاش|فيزا|مدفوعات))|$)','u'));
      if(!m) return null;
      return _parseArabicNumber(m[1]);
    }
    fields.cash = _amtAfter('كاش') || _amtAfter('نقدي') || _amtAfter('نقد');
    fields.visa = _amtAfter('فيزا') || _amtAfter('شبكه');
    fields.pmts = _amtAfter('مدفوعات') || _amtAfter('مدفوع');
    fields.day = dayNum;
    if(!fields.cash && !fields.visa && !fields.pmts && amounts.length){
      fields.cash = amounts[0];
    }
  }

  if(intent === 'purchase'){
    const suppM = norm.match(/من\s+(?:عند\s+)?([؀-ۿ]+(?:\s+[؀-ۿ]+)?)/);
    if(suppM){
      let rawSupp = suppM[1].replace(/\b(فواتير|فاتوره|بضاعه|بقيمه|قيمتها|قيمتو)\b.*$/,'').trim();
      const sTokens = rawSupp.split(/\s+/);
      const clean = [];
      for(let j=0; j<sTokens.length; j++){
        if(_isNumberToken(sTokens[j].replace(/^و/,''))) break;
        clean.push(sTokens[j]);
      }
      rawSupp = clean.join(' ').trim();
      if(rawSupp){
        fields.supplierGuess = rawSupp;
        let bestMatch = null, bestScore = 0;
        suppliers.forEach(function(s){
          const n = _normalizeArabic(s.name).toLowerCase();
          let score = 0;
          if(n === rawSupp) score = 100;
          else if(n.indexOf(rawSupp) >= 0) score = 80;
          else if(rawSupp.indexOf(n) >= 0) score = 70;
          else {
            const sw = n.split(' '), tw = rawSupp.split(' ');
            for(let k=0; k<sw.length; k++) for(let l=0; l<tw.length; l++){
              if(sw[k].length>2 && sw[k] === tw[l]) score = Math.max(score, 60);
            }
          }
          if(score > bestScore){ bestScore = score; bestMatch = s; }
        });
        if(bestMatch){ fields.sId = bestMatch.id; fields.sName = bestMatch.name; }
      }
    }
    if(amounts.length){ fields.amt = Math.max.apply(null, amounts); }
    fields.date = today.toISOString().slice(0,10);
    fields.cat = 'COGS';
  }

  if(intent === 'advance'){
    const nameM = norm.match(/سلفه\s+ل?([؀-ۿ]+)/) || norm.match(/ل([؀-ۿ]+)\s+سلف/);
    if(nameM){
      const rawName = nameM[1].trim();
      fields.nameGuess = rawName;
      const emp = employees.find(function(e){
        const n = _normalizeArabic(e.name).toLowerCase();
        return n === rawName || n.indexOf(rawName) >= 0 || rawName.indexOf(n) >= 0;
      });
      if(emp){ fields.empId = emp.id; fields.empName = emp.name; }
    }
    if(amounts.length){ fields.amt = Math.max.apply(null, amounts); }
    fields.date = today.toISOString().slice(0,10);
  }

  if(intent === 'salary'){
    const nm = norm.match(/ل([؀-ۿ]+)\s+(?:راتب|راتبه|راتبها)/) || norm.match(/راتب\s+([؀-ۿ]+)/);
    if(nm){
      const rn = nm[1].trim();
      fields.nameGuess = rn;
      const em = employees.find(function(e){
        const n = _normalizeArabic(e.name).toLowerCase();
        return n === rn || n.indexOf(rn) >= 0 || rn.indexOf(n) >= 0;
      });
      if(em){ fields.empId = em.id; fields.empName = em.name; }
    }
  }

  return { intent, fields, raw, normalized:norm, amounts };
}

module.exports = {
  _normalizeArabic,
  _parseArabicNumber,
  _parseVoiceCommand,
};
