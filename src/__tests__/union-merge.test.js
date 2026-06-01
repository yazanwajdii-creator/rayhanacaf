/* v68: اختبار محرّك الدمج الاتحادي — يُثبت رياضياً عدم فقد البيانات
 * يستخرج الدوال من index.html ويختبرها بمعزل عن DOM/network.
 */
const fs = require('fs');
const path = require('path');

function loadUnionMerge() {
  const html = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf-8');
  const start = html.indexOf('function _recContent');
  const end = html.indexOf('// تطبيق نتيجة الدمج');
  if (start < 0 || end < 0) throw new Error('Could not locate union-merge block');
  const code = html.slice(start, end);
  const sandbox = {};
  new Function('with(this){' + code + '; this._recContent=_recContent; this._pickBetter=_pickBetter; this._mergeArr=_mergeArr; this._mergeObj=_mergeObj; this._mergeMonth=_mergeMonth; this.safeUnionMerge=safeUnionMerge;}').call(sandbox);
  return sandbox;
}

const M = loadUnionMerge();

function activeSales(month){ return (month.sales||[]).filter(s => (s.cash||0)+(s.visa||0)+(s.pmts||0) > 0); }

describe('v68: الدمج الاتحادي (UNION MERGE) — صفر فقد بيانات', () => {
  const local = {
    months: { '2026-05': {
      sales: [{day:1,cash:100,visa:50,pmts:10},{day:2,cash:200,visa:0,pmts:0},{day:3,cash:0,visa:0,pmts:0}],
      purchases: [
        {date:'2026-05-01',amt:50,sName:'مورد أ',desc:'بضاعة',cat:'COGS',buyer:'يزن'},
        {date:'2026-05-02',amt:30,sName:'مورد ب',desc:'',cat:'COGS',buyer:'عبدالرحمن'},
      ],
      advances: [{date:'2026-05-01',amt:20,empId:'hani',note:'سلفة'}],
      obligations: [{id:'o1',name:'إيجار',amt:500,paid:true}],
      mSal: {hani:{base:150,paid:true}},
      dWages: {enaa:{att:[1,2,3],rate:10}},
    }},
    suppliers: [{id:'s1',name:'مورد أ'},{id:'s2',name:'مورد ب'}],
    monthlyEmps: [{id:'hani',name:'هاني'}],
    dailyEmps: [{id:'enaa',name:'عيناء'}],
  };
  const emptyCloud = { months:{'2026-05':{sales:[],purchases:[],advances:[],obligations:[],mSal:{},dWages:{}}}, suppliers:[], monthlyEmps:[], dailyEmps:[] };

  test('سحابة فارغة + محلي ممتلئ → يحفظ كل المحلي', () => {
    const m = M.safeUnionMerge(local, emptyCloud);
    expect(activeSales(m.months['2026-05']).length).toBe(2);
    expect(m.months['2026-05'].purchases.length).toBe(2);
    expect(m.suppliers.length).toBe(2);
    expect(m.monthlyEmps.length).toBe(1);
    expect(m.dailyEmps.length).toBe(1);
  });

  test('السحابة فيها أيام مختلفة → يدمج الكلّ (اتحاد)', () => {
    const cloud = { months:{'2026-05':{
      sales: [{day:4,cash:300,visa:100,pmts:0},{day:5,cash:150,visa:0,pmts:0}],
      purchases: [{date:'2026-05-04',amt:80,sName:'مورد ج',desc:'',cat:'COGS',buyer:'يزن'}],
      advances:[], obligations:[], mSal:{}, dWages:{},
    }}, suppliers:[{id:'s3',name:'مورد ج'}], monthlyEmps:[], dailyEmps:[] };
    const m = M.safeUnionMerge(local, cloud);
    expect(activeSales(m.months['2026-05']).length).toBe(4); // أيام 1,2,4,5
    expect(m.months['2026-05'].purchases.length).toBe(3);
    expect(m.suppliers.length).toBe(3);
  });

  test('تعارض: محلي ممتلئ vs سحابة فارغة لنفس اليوم → المحتوى يفوز', () => {
    const cloud = { months:{'2026-05':{
      sales:[{day:1,cash:0,visa:0,pmts:0},{day:2,cash:0,visa:0,pmts:0}],
      purchases:[], advances:[], obligations:[], mSal:{}, dWages:{},
    }}, suppliers:[], monthlyEmps:[], dailyEmps:[] };
    const m = M.safeUnionMerge(local, cloud);
    const d1 = m.months['2026-05'].sales.find(s => s.day === 1);
    expect(d1.cash).toBe(100); // المحلي الممتلئ ربح
  });

  test('الاتجاه المعكوس: محلي فارغ، سحابة ممتلئة → كل بيانات السحابة تُنقَل', () => {
    const m = M.safeUnionMerge(emptyCloud, local);
    expect(activeSales(m.months['2026-05']).length).toBe(2);
    expect(m.months['2026-05'].purchases.length).toBe(2);
    expect(m.suppliers.length).toBe(2);
  });

  test('_mt الأحدث يفوز عند تعارض ممتلئَين بنفس المفتاح', () => {
    const localMt = { months:{'2026-05':{sales:[{day:1,cash:100,visa:0,pmts:0,_mt:1000}],purchases:[],advances:[],obligations:[],mSal:{},dWages:{}}}, suppliers:[],monthlyEmps:[],dailyEmps:[] };
    const cloudMt = { months:{'2026-05':{sales:[{day:1,cash:999,visa:0,pmts:0,_mt:2000}],purchases:[],advances:[],obligations:[],mSal:{},dWages:{}}}, suppliers:[],monthlyEmps:[],dailyEmps:[] };
    const m = M.safeUnionMerge(localMt, cloudMt);
    expect(m.months['2026-05'].sales.find(s => s.day === 1).cash).toBe(999);
  });

  test('دمج الموظفين: نفس الـid → يدمج، مختلف → اتحاد', () => {
    const cloud = { months:{}, suppliers:[], monthlyEmps:[{id:'hani',name:'هاني'},{id:'sidra',name:'سدرة'}], dailyEmps:[{id:'waad',name:'وعد'}] };
    const m = M.safeUnionMerge(local, cloud);
    expect(m.monthlyEmps.length).toBe(2); // هاني + سدرة
    expect(m.dailyEmps.length).toBe(2);   // عيناء + وعد
  });

  test('شهر موجود محلياً فقط لا يُحذف أبداً', () => {
    const localTwoMonths = { ...local, months: { ...local.months, '2026-04': {sales:[{day:10,cash:500,visa:0,pmts:0}], purchases:[], advances:[], obligations:[], mSal:{}, dWages:{}} } };
    const m = M.safeUnionMerge(localTwoMonths, emptyCloud);
    expect(m.months['2026-04']).toBeDefined();
    expect(activeSales(m.months['2026-04']).length).toBe(1);
  });

  test('الفواتير: نفس key (تاريخ+مبلغ+مورد+بيان) → سجل واحد، اختلاف → اثنين', () => {
    const cloud = { months:{'2026-05':{
      sales:[], advances:[], obligations:[], mSal:{}, dWages:{},
      purchases: [
        {date:'2026-05-01',amt:50,sName:'مورد أ',desc:'بضاعة',cat:'COGS',buyer:'يزن'}, // مكرّر للمحلي
        {date:'2026-05-03',amt:99,sName:'مورد د',desc:'فاتورة جديدة',cat:'COGS',buyer:'يزن'},
      ],
    }}, suppliers:[],monthlyEmps:[],dailyEmps:[] };
    const m = M.safeUnionMerge(local, cloud);
    // المحلي عنده 2 فواتير + السحابة فيها 2 (واحدة مكرّرة) → النتيجة 3
    expect(m.months['2026-05'].purchases.length).toBe(3);
  });

  test('قائمة lockedMonths: اتحاد بلا تكرار', () => {
    const m = M.safeUnionMerge(
      { ...local, lockedMonths:['2026-04','2026-03'] },
      { months:{}, suppliers:[], monthlyEmps:[], dailyEmps:[], lockedMonths:['2026-03','2026-02'] }
    );
    expect(m.lockedMonths.sort()).toEqual(['2026-02','2026-03','2026-04']);
  });

  test('تكرارية مزدوجة: merge(merge(A,B), B) = merge(A,B) (idempotent)', () => {
    const cloud = { months:{'2026-05':{
      sales:[{day:7,cash:77,visa:0,pmts:0}], purchases:[], advances:[], obligations:[], mSal:{}, dWages:{},
    }}, suppliers:[], monthlyEmps:[], dailyEmps:[] };
    const m1 = M.safeUnionMerge(local, cloud);
    const m2 = M.safeUnionMerge(m1, cloud);
    expect(m1.months['2026-05'].sales.length).toBe(m2.months['2026-05'].sales.length);
    expect(m1.months['2026-05'].purchases.length).toBe(m2.months['2026-05'].purchases.length);
  });

  test('السيناريو الحقيقي: استيراد JSON كامل + سحابة فيها snapshot قديم ناقص → لا فقد', () => {
    // المحلي: 27 يوماً، 50 فاتورة، 6 موظفين (مثل بيانات يزن الكاملة)
    const fullLocal = {
      months: {'2026-05': {
        sales: Array.from({length:27}, (_,i) => ({day:i+1,cash:100+i,visa:50,pmts:5})),
        purchases: Array.from({length:50}, (_,i) => ({date:'2026-05-'+String((i%27)+1).padStart(2,'0'),amt:10+i,sName:'م'+i,desc:'d'+i,cat:'COGS',buyer:i%2?'يزن':'عبدالرحمن'})),
        advances:[], obligations:[], mSal:{}, dWages:{},
      }},
      suppliers:[], monthlyEmps:[{id:'a',name:'آية'},{id:'h',name:'هاني'},{id:'s',name:'سدرة'}],
      dailyEmps:[{id:'e',name:'عيناء'},{id:'w',name:'وعد'},{id:'t',name:'ثراء'}],
    };
    // السحابة: snapshot قديم ناقص (19 يوماً فقط)
    const stalecloud = {
      months: {'2026-05': {
        sales: Array.from({length:19}, (_,i) => ({day:i+1,cash:100+i,visa:50,pmts:5})),
        purchases: Array.from({length:38}, (_,i) => ({date:'2026-05-'+String((i%19)+1).padStart(2,'0'),amt:10+i,sName:'م'+i,desc:'d'+i,cat:'COGS',buyer:'يزن'})),
        advances:[], obligations:[], mSal:{}, dWages:{},
      }}, suppliers:[], monthlyEmps:[], dailyEmps:[]
    };
    const m = M.safeUnionMerge(fullLocal, stalecloud);
    // النتيجة: 27 يوم محفوظة (لا نقص)، الفواتير = اتحاد (50 + المختلف من 38)
    expect(activeSales(m.months['2026-05']).length).toBe(27);
    expect(m.months['2026-05'].purchases.length).toBeGreaterThanOrEqual(50);
    expect(m.monthlyEmps.length).toBe(3);
    expect(m.dailyEmps.length).toBe(3);
  });
});
