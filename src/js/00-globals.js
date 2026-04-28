const MN=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const SK='rh_v6',LK='rh_v6_log';
let CR=null,CRN='',CH={},catF='all';
let iT=null,wT=null;

/* STATE */
const _nd=new Date(),_ck=_nd.getFullYear()+'-'+String(_nd.getMonth()+1).padStart(2,'0');
let S={activeKey:_ck,months:{},lockedMonths:[],
  suppliers:[
    {id:'s1',name:'المؤسسة العسكرية',cat:'مواد غذائية ومواد خام',note:''},
    {id:'s2',name:'الفيصل مول',cat:'مستلزمات التشغيل',note:''},
    {id:'s3',name:'يحيى رسمي',cat:'مواد غذائية ومواد خام',note:''},
    {id:'s4',name:'عيسى الخوره',cat:'مواد غذائية ومواد خام',note:''},
    {id:'s5',name:'ارض السكر',cat:'مواد غذائية ومواد خام',note:''},
    {id:'s6',name:'بن العميد',cat:'مشروبات ومواد القهوة',note:''},
    {id:'s7',name:'قهوه ايلي',cat:'مشروبات ومواد القهوة',note:''},
    {id:'s8',name:'بوظه',cat:'مواد غذائية ومواد خام',note:''},
    {id:'s9',name:'مونين',cat:'مشروبات ومواد القهوة',note:'سيروب'},
    {id:'s10',name:'مياه أفا',cat:'مشروبات ومواد القهوة',note:'مياه معدنية'}
  ],
  monthlyEmps:[{id:'hani',name:'هاني'},{id:'sidra',name:'سدرة'},{id:'aya',name:'آية'}],
  dailyEmps:[{id:'tharaa',name:'ثراء'},{id:'enaa',name:'عيناء'},{id:'waad',name:'وعد'}]
};

const PL={'2026-02':{
  sales:[{day:1,cash:122.5,visa:12.25,pmts:29,notes:'وعد + ثراء + عيناء'},{day:2,cash:154.25,visa:36.5,pmts:24,notes:'وعد + ثراء + عيناء'},{day:3,cash:76.5,visa:49.75,pmts:30,notes:''},{day:4,cash:175.5,visa:104.5,pmts:20,notes:''},{day:5,cash:295.5,visa:82.25,pmts:30,notes:''},{day:6,cash:98.75,visa:76.63,pmts:29,notes:''},{day:7,cash:204,visa:21.25,pmts:30,notes:''},{day:8,cash:215,visa:8.75,pmts:30,notes:''},{day:9,cash:220.75,visa:62.5,pmts:30,notes:''},{day:10,cash:217.25,visa:81.75,pmts:30,notes:''},{day:11,cash:164,visa:51,pmts:30,notes:''},{day:12,cash:227.5,visa:59,pmts:10,notes:'وعد'},{day:13,cash:259,visa:71.5,pmts:10,notes:'وعد'},{day:14,cash:164.9,visa:9.5,pmts:20,notes:''},{day:15,cash:366.5,visa:45.75,pmts:40,notes:'وعد+ثراء+عيناء+ثريا'},{day:16,cash:288.5,visa:88.3,pmts:30,notes:''},{day:17,cash:377.45,visa:178.75,pmts:20,notes:''},{day:18,cash:252.25,visa:78.5,pmts:30,notes:''},{day:19,cash:13.5,visa:0,pmts:28,notes:''},{day:20,cash:52.25,visa:18.25,pmts:30,notes:''},{day:21,cash:31.25,visa:68,pmts:30,notes:''},{day:22,cash:147.75,visa:27,pmts:5,notes:'وعد'},{day:23,cash:191,visa:89.5,pmts:10,notes:''},{day:24,cash:93,visa:35.5,pmts:30,notes:''},{day:25,cash:0,visa:0,pmts:0,notes:''},{day:26,cash:0,visa:0,pmts:0,notes:''},{day:27,cash:0,visa:0,pmts:0,notes:''},{day:28,cash:0,visa:0,pmts:0,notes:''}],
  purchases:[{date:'2026-02-23',sId:'s1',sName:'المؤسسة العسكرية',cat:'COGS',desc:'مشتريات فبراير',amt:1748.53,inv:''}],
  obligations:[{id:'o1',name:'إيجار المحل',amt:500,paid:false,due:''},{id:'o2',name:'فاتورة الكهرباء والمياه',amt:0,paid:false,due:''},{id:'o3',name:'قسط الجمعية',amt:1000,paid:false,due:''},{id:'o4',name:'اشتراك الإنترنت',amt:0,paid:false,due:''},{id:'o5',name:'مواد التنظيف',amt:0,paid:false,due:''},{id:'o6',name:'مصروفات الصيانة',amt:0,paid:false,due:''},{id:'o7',name:'مصروفات أخرى',amt:500,paid:false,due:''}],
  mSal:{hani:{base:150,allow:0,ded:0},sidra:{base:290,allow:0,ded:5},aya:{base:300,allow:0,ded:0}},
  dWages:{tharaa:{rate:10,att:[1,2,3,5,6,7,8,9,10,11,15,16,17,18,19,20,21,23,24]},enaa:{rate:10,att:[1,2,3,5,6,7,8,9,10,11,15,16,17,18,19,20,21,23,24]},waad:{rate:10,att:[1,2,3,5,6,7,8,9,10,11,12,13,15,16,17,18,19,20,21,22,24]}},
  advances:[{date:'2026-02-01',empId:'hani',empName:'هاني',amt:95,status:'مستحقة',note:'سلفة شخصية'}],
  cashflow:{opening:0,actual:0}
}};

/* UTILS */
const n3=v=>(parseFloat(v)||0).toFixed(3);
const pf=id=>{const e=document.getElementById(id);return e?parseFloat(e.value)||0:0;};
const $=id=>document.getElementById(id);
const T=(id,v)=>{const e=$(id);if(e)e.textContent=v;};
let toastT=null;
