// ريحانة كافيه — واجهة الويب
'use strict';

const $ = (id) => document.getElementById(id);
const el = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const k in attrs) {
    if (k === 'class') e.className = attrs[k];
    else if (k === 'style') e.style.cssText = attrs[k];
    else if (k.startsWith('on') && typeof attrs[k] === 'function') e.addEventListener(k.slice(2), attrs[k]);
    else if (attrs[k] !== null && attrs[k] !== undefined) e.setAttribute(k, attrs[k]);
  }
  for (const k of kids) {
    if (k === null || k === undefined || k === false) continue;
    e.appendChild(typeof k === 'string' || typeof k === 'number' ? document.createTextNode(k) : k);
  }
  return e;
};
const fmt = (n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const fmtInt = (n) => Number(n || 0).toLocaleString('en-US');
const todayISO = () => new Date().toISOString().slice(0, 10);
const MN = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const monthLabel = (ym) => { const [y, m] = ym.split('-'); return MN[parseInt(m, 10) - 1] + ' ' + y; };
const currentYM = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
const daysInMonth = (ym) => { const [y, m] = ym.split('-').map(Number); return new Date(y, m, 0).getDate(); };
const shiftYM = (ym, delta) => {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
};

// ========== الحالة العامة ==========
const state = {
  ym: currentYM(),
  months: [],
  totals: null,
  sales: [],
  purchases: [],
  suppliers: [],
  monthlyEmps: [],
  dailyEmps: [],
  monthlySalaries: [],
  dailyWages: [],
  advances: [],
  obligations: [],
};

// ========== API ==========
async function api(path, opts = {}) {
  const r = await fetch('/api' + path, {
    headers: { 'content-type': 'application/json' },
    credentials: 'same-origin',
    ...opts,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  if (r.status === 401) { showLogin(); throw new Error('غير مصرّح'); }
  if (!r.ok) {
    let msg = 'خطأ';
    try { msg = (await r.json()).error || msg; } catch {}
    throw new Error(msg);
  }
  if (r.status === 204) return null;
  return r.json();
}

// ========== Toast ==========
let toastTimer = null;
function toast(msg, kind = '') {
  const t = $('toast');
  t.textContent = msg;
  t.className = 'toast show ' + kind;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.classList.remove('show'); }, 2400);
}

// ========== Modal ==========
function openModal(title, body) {
  $('modalTitle').textContent = title;
  const b = $('modalBody');
  b.innerHTML = '';
  if (typeof body === 'string') b.innerHTML = body;
  else b.appendChild(body);
  $('modal').classList.remove('hidden');
}
function closeModal() { $('modal').classList.add('hidden'); }
function closeModalIfBackdrop(e) { if (e.target.id === 'modal') closeModal(); }
window.closeModal = closeModal;
window.closeModalIfBackdrop = closeModalIfBackdrop;

// ========== شاشات ==========
function showLogin() { $('app').classList.add('hidden'); $('login').classList.remove('hidden'); }
function showApp() { $('login').classList.add('hidden'); $('app').classList.remove('hidden'); }

// ========== الدخول ==========
$('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  $('loginErr').textContent = '';
  $('loginBtn').disabled = true;
  try {
    await api('/login', { method: 'POST', body: { password: $('pw').value } });
    $('pw').value = '';
    await boot();
  } catch (err) {
    $('loginErr').textContent = err.message;
  } finally {
    $('loginBtn').disabled = false;
  }
});

async function logout() {
  try { await api('/logout', { method: 'POST' }); } catch {}
  showLogin();
}
window.logout = logout;

// ========== التبويبات ==========
document.querySelectorAll('.tab').forEach(t => {
  t.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(x => x.classList.remove('on'));
    document.querySelectorAll('.tab-pane').forEach(x => x.classList.remove('on'));
    t.classList.add('on');
    $('tab-' + t.dataset.tab).classList.add('on');
    renderTab(t.dataset.tab);
  });
});

// ========== تنقّل الأشهر ==========
$('monthSel').addEventListener('change', async (e) => {
  state.ym = e.target.value;
  await loadAllForMonth();
  renderCurrentTab();
});
$('monthPrev').addEventListener('click', async () => {
  state.ym = shiftYM(state.ym, -1);
  await ensureMonthOption(state.ym);
  $('monthSel').value = state.ym;
  await loadAllForMonth();
  renderCurrentTab();
});
$('monthNext').addEventListener('click', async () => {
  state.ym = shiftYM(state.ym, +1);
  await ensureMonthOption(state.ym);
  $('monthSel').value = state.ym;
  await loadAllForMonth();
  renderCurrentTab();
});

async function ensureMonthOption(ym) {
  if (!state.months.find(m => m.ym === ym)) {
    // أنشئه على السيرفر
    await api('/months/' + ym, { method: 'PUT', body: {} });
    state.months.unshift({ ym, locked: false, ended: false });
    rebuildMonthSelect();
  }
}

function rebuildMonthSelect() {
  const sel = $('monthSel');
  sel.innerHTML = '';
  state.months.forEach(m => {
    const o = el('option', { value: m.ym }, monthLabel(m.ym) + (m.locked ? ' 🔒' : m.ended ? ' ✅' : ''));
    sel.appendChild(o);
  });
  sel.value = state.ym;
}

// ========== تحميل البيانات ==========
async function loadMonths() {
  state.months = await api('/months');
  if (!state.months.find(m => m.ym === state.ym)) {
    await api('/months/' + state.ym, { method: 'PUT', body: {} });
    state.months.unshift({ ym: state.ym, locked: false, ended: false });
  }
  rebuildMonthSelect();
}

async function loadAllForMonth() {
  const ym = state.ym;
  const [totals, sales, purchases, suppliers, emps, mSal, dWag, adv, obl] = await Promise.all([
    api('/reports/totals/' + ym).catch(() => null),
    api('/sales/' + ym).catch(() => []),
    api('/purchases/' + ym).catch(() => []),
    api('/suppliers').catch(() => []),
    api('/employees').catch(() => ({ monthly: [], daily: [] })),
    api('/salaries/monthly/' + ym).catch(() => []),
    api('/salaries/daily/' + ym).catch(() => []),
    api('/advances/' + ym).catch(() => []),
    api('/obligations/' + ym).catch(() => []),
  ]);
  state.totals = totals;
  state.sales = sales;
  state.purchases = purchases;
  state.suppliers = suppliers;
  state.monthlyEmps = emps.monthly || [];
  state.dailyEmps = emps.daily || [];
  state.monthlySalaries = mSal;
  state.dailyWages = dWag;
  state.advances = adv;
  state.obligations = obl;
}

// ========== Render ==========
function currentTab() {
  const t = document.querySelector('.tab.on');
  return t ? t.dataset.tab : 'dash';
}
function renderCurrentTab() { renderTab(currentTab()); }

function renderTab(name) {
  const fn = ({
    dash: renderDash, sales: renderSales, purchases: renderPurchases,
    salaries: renderSalaries, advances: renderAdvances, obligations: renderObligations,
    suppliers: renderSuppliers, employees: renderEmployees,
  })[name];
  if (fn) fn();
}

// ---- لوحة ----
function renderDash() {
  const t = state.totals || {};
  const root = $('tab-dash');
  root.innerHTML = '';
  const kpis = el('div', { class: 'kpi-grid' });
  const tile = (l, v, cls = '', h = '') =>
    el('div', { class: 'kpi ' + cls },
      el('div', { class: 'l' }, l),
      el('div', { class: 'v' }, v),
      h ? el('div', { class: 'h' }, h) : null
    );
  kpis.append(
    tile('نقد', fmt(t.cash)),
    tile('فيزا', fmt(t.visa)),
    tile('صافي الإيرادات', fmt(t.netSales), '', 'نقد + فيزا'),
    tile('مدفوعات (توثيق)', fmt(t.pmts), '', 'لا تُضاف للربح'),
    tile('COGS', fmt((t.bycat && t.bycat.COGS) || 0)),
    tile('مجمل الربح', fmt(t.grossP)),
    tile('رواتب مدفوعة', fmt(t.mSalPaid)),
    tile('سلف الشهر', fmt(t.advTotal)),
    tile('التزامات مدفوعة', fmt(t.oblPaid)),
    tile('إجمالي المصاريف', fmt(t.totalExp)),
    tile('صافي الربح', fmt(t.profit), (t.profit || 0) >= 0 ? 'profit' : 'loss'),
    tile('هامش الربح', (t.margin || 0).toFixed(2) + '%', (t.margin || 0) >= 0 ? 'profit' : 'loss')
  );
  root.append(
    el('h2', { class: 'section-title' }, '📊 ' + monthLabel(state.ym)),
    kpis,
    el('div', { class: 'section-title' }, el('h3', {}, 'مصاريف حسب الفئة')),
    renderCategoryBreakdown(t.bycat || {})
  );
}

function renderCategoryBreakdown(bycat) {
  const rows = [
    ['COGS — تكلفة البضاعة', bycat.COGS || 0],
    ['OPS — تشغيلية', bycat.OPS || 0],
    ['ADM — إدارية', bycat.ADM || 0],
    ['MKT — تسويق', bycat.MKT || 0],
    ['OTHER — متفرّقات', bycat.OTHER || 0],
  ];
  const total = rows.reduce((s, r) => s + r[1], 0);
  const t = el('table', { class: 'tbl' });
  t.appendChild(el('thead', {}, el('tr', {},
    el('th', {}, 'الفئة'),
    el('th', { class: 'num' }, 'المبلغ'),
    el('th', { class: 'num' }, 'النسبة'))));
  const tb = el('tbody');
  rows.forEach(([label, val]) => {
    tb.appendChild(el('tr', {},
      el('td', {}, label),
      el('td', { class: 'num' }, fmt(val)),
      el('td', { class: 'num' }, (total > 0 ? (val / total * 100).toFixed(1) : '0.0') + '%')));
  });
  tb.appendChild(el('tr', { class: 'foot' },
    el('td', {}, 'الإجمالي'),
    el('td', { class: 'num' }, fmt(total)),
    el('td', { class: 'num' }, '100%')));
  t.appendChild(tb);
  return el('div', { class: 'tbl-wrap' }, t);
}

// ---- مبيعات يومية ----
function renderSales() {
  const root = $('tab-sales');
  root.innerHTML = '';
  const ndays = daysInMonth(state.ym);
  const map = new Map(state.sales.map(s => [s.day, s]));

  let totC = 0, totV = 0, totP = 0;
  const tbody = el('tbody');
  for (let d = 1; d <= ndays; d++) {
    const s = map.get(d) || {};
    totC += +s.cash || 0; totV += +s.visa || 0; totP += +s.pmts || 0;
    const tr = el('tr', { 'data-day': d });
    tr.append(
      el('td', { style: 'font-weight:600;color:var(--tx2)' }, d + '/' + state.ym.split('-')[1]),
      cellInput('cash', s.cash || '', d),
      cellInput('visa', s.visa || '', d),
      cellInput('pmts', s.pmts || '', d),
      el('td', { class: 'num', id: 'totD' + d }, fmt((+s.cash || 0) + (+s.visa || 0))),
      cellInput('received_by', s.received_by || '', d, 'text'),
      cellInput('notes', s.notes || '', d, 'text')
    );
    tbody.appendChild(tr);
  }
  tbody.appendChild(el('tr', { class: 'foot' },
    el('td', {}, 'المجموع'),
    el('td', { class: 'num' }, fmt(totC)),
    el('td', { class: 'num' }, fmt(totV)),
    el('td', { class: 'num' }, fmt(totP)),
    el('td', { class: 'num' }, fmt(totC + totV)),
    el('td', {}, ''),
    el('td', {}, '')
  ));

  const t = el('table', { class: 'tbl' },
    el('thead', {}, el('tr', {},
      el('th', {}, 'اليوم'),
      el('th', { class: 'num' }, 'نقد'),
      el('th', { class: 'num' }, 'فيزا'),
      el('th', { class: 'num' }, 'مدفوعات'),
      el('th', { class: 'num' }, 'الإجمالي'),
      el('th', {}, 'مَن استلم'),
      el('th', {}, 'ملاحظات')
    )),
    tbody
  );
  root.append(
    el('h2', { class: 'section-title' }, '💰 المبيعات اليومية — ' + monthLabel(state.ym),
      el('span', { class: 'muted' }, 'التغييرات تُحفظ تلقائياً عند الخروج من الخانة')),
    el('div', { class: 'tbl-wrap' }, t)
  );
}

function cellInput(field, value, day, type = 'number') {
  const i = el('input', {
    type, value: value === null || value === undefined ? '' : value,
    step: type === 'number' ? '0.001' : null,
    'data-field': field, 'data-day': day,
    onblur: onSaleBlur,
    onkeydown: (e) => { if (e.key === 'Enter') e.target.blur(); },
  });
  const td = el('td', { class: type === 'number' ? 'num' : '' });
  td.appendChild(i);
  return td;
}

async function onSaleBlur(e) {
  const input = e.target;
  const day = parseInt(input.dataset.day, 10);
  const field = input.dataset.field;
  const tr = input.closest('tr');
  const get = (f) => {
    const x = tr.querySelector(`input[data-field="${f}"]`);
    if (!x) return null;
    if (['cash','visa','pmts'].includes(f)) return +x.value || 0;
    return x.value || null;
  };
  const body = { cash: get('cash'), visa: get('visa'), pmts: get('pmts'), received_by: get('received_by'), notes: get('notes') };
  try {
    await api(`/sales/${state.ym}/${day}`, { method: 'PUT', body });
    // حدّث إجمالي اليوم
    const tot = $('totD' + day);
    if (tot) tot.textContent = fmt((body.cash || 0) + (body.visa || 0));
    // إعادة حساب التقرير في الخلفية
    refreshTotalsInBg();
  } catch (err) {
    toast('فشل الحفظ: ' + err.message, 'err');
  }
}

let refreshTimer = null;
function refreshTotalsInBg() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(async () => {
    try {
      state.totals = await api('/reports/totals/' + state.ym);
      // إن كنّا على تبويب اللوحة، أعد رسمها
      if (currentTab() === 'dash') renderDash();
    } catch {}
  }, 400);
}

// ---- المشتريات ----
function renderPurchases() {
  const root = $('tab-purchases');
  root.innerHTML = '';
  let total = 0;
  const tbody = el('tbody');
  state.purchases.forEach(p => {
    total += +p.amount || 0;
    tbody.appendChild(el('tr', {},
      el('td', {}, p.purchase_date),
      el('td', {}, p.supplier_name || '—'),
      el('td', {}, catLbl(p.category)),
      el('td', {}, p.description || '—'),
      el('td', { class: 'num' }, fmt(p.amount)),
      el('td', {}, p.buyer || '—'),
      el('td', {},
        el('button', { class: 'btn sm', onclick: () => openPurchaseForm(p) }, 'تعديل'),
        ' ',
        el('button', { class: 'btn sm danger', onclick: () => deletePurchase(p.id) }, 'حذف'))
    ));
  });
  if (state.purchases.length === 0) {
    tbody.appendChild(el('tr', {}, el('td', { colspan: '7', class: 'empty' }, 'لا توجد مشتريات هذا الشهر')));
  } else {
    tbody.appendChild(el('tr', { class: 'foot' },
      el('td', { colspan: '4' }, 'المجموع'),
      el('td', { class: 'num' }, fmt(total)),
      el('td', { colspan: '2' }, '')));
  }
  const t = el('table', { class: 'tbl' },
    el('thead', {}, el('tr', {},
      el('th', {}, 'التاريخ'),
      el('th', {}, 'المورد'),
      el('th', {}, 'الفئة'),
      el('th', {}, 'البيان'),
      el('th', { class: 'num' }, 'المبلغ'),
      el('th', {}, 'المشتري'),
      el('th', {}, ''))),
    tbody
  );
  root.append(
    el('h2', { class: 'section-title' }, '🛒 المشتريات',
      el('button', { class: 'btn primary', onclick: () => openPurchaseForm(null) }, '+ فاتورة جديدة')),
    el('div', { class: 'tbl-wrap' }, t)
  );
}

function catLbl(c) {
  return ({ COGS: 'بضاعة (COGS)', OPS: 'تشغيلية', ADM: 'إدارية', MKT: 'تسويق', OTHER: 'متفرّقات' })[c] || c;
}

function openPurchaseForm(p) {
  const isEdit = !!p;
  const body = el('div');
  const fields = el('div', { class: 'form-grid' });

  const fDate = inputField('التاريخ', 'date', p ? p.purchase_date : todayISO(), true);
  const fSup = selectField('المورد', state.suppliers.map(s => ({ value: s.id, label: s.name })), p ? p.supplier_id : '');
  const fCat = selectField('الفئة', [
    { value: 'COGS', label: 'بضاعة (COGS)' },
    { value: 'OPS', label: 'تشغيلية' },
    { value: 'ADM', label: 'إدارية' },
    { value: 'MKT', label: 'تسويق' },
    { value: 'OTHER', label: 'متفرّقات' },
  ], p ? p.category : 'COGS');
  const fDesc = inputField('البيان', 'text', p ? p.description || '' : '');
  const fAmt = inputField('المبلغ', 'number', p ? p.amount : '', true, '0.001');
  const fBuyer = inputField('المشتري', 'text', p ? p.buyer || '' : '');
  const fInv = inputField('رقم الفاتورة', 'text', p ? p.invoice || '' : '');

  fields.append(fDate.wrap, fSup.wrap, fCat.wrap, fDesc.wrap, fAmt.wrap, fBuyer.wrap, fInv.wrap);
  body.appendChild(fields);

  const btns = el('div', { class: 'btn-row', style: 'margin-top:18px;justify-content:flex-end' });
  const submit = async () => {
    try {
      const payload = {
        ym: state.ym,
        purchase_date: fDate.input.value,
        supplier_id: fSup.input.value || null,
        supplier_name: fSup.input.options[fSup.input.selectedIndex] ? fSup.input.options[fSup.input.selectedIndex].text : null,
        category: fCat.input.value,
        description: fDesc.input.value || null,
        amount: +fAmt.input.value,
        buyer: fBuyer.input.value || null,
        invoice: fInv.input.value || null,
      };
      if (!payload.purchase_date || !(payload.amount > 0)) { toast('التاريخ والمبلغ مطلوبان', 'err'); return; }
      if (isEdit) {
        await api('/purchases/' + p.id, { method: 'PUT', body: payload });
      } else {
        await api('/purchases', { method: 'POST', body: payload });
      }
      closeModal();
      toast(isEdit ? 'تم التعديل' : 'تمت الإضافة', 'ok');
      await loadAllForMonth();
      renderPurchases();
      refreshTotalsInBg();
    } catch (err) { toast(err.message, 'err'); }
  };
  btns.append(
    el('button', { class: 'btn', onclick: closeModal }, 'إلغاء'),
    el('button', { class: 'btn primary', onclick: submit }, isEdit ? 'حفظ' : 'إضافة')
  );
  body.appendChild(btns);
  openModal(isEdit ? 'تعديل فاتورة' : 'فاتورة جديدة', body);
}

async function deletePurchase(id) {
  if (!confirm('حذف هذه الفاتورة؟')) return;
  try {
    await api('/purchases/' + id, { method: 'DELETE' });
    toast('تم الحذف', 'ok');
    await loadAllForMonth();
    renderPurchases();
    refreshTotalsInBg();
  } catch (err) { toast(err.message, 'err'); }
}

// ---- الرواتب ----
function renderSalaries() {
  const root = $('tab-salaries');
  root.innerHTML = '';

  // شهري
  const mSalMap = new Map(state.monthlySalaries.map(s => [s.emp_id, s]));
  const advByEmp = new Map();
  state.advances.forEach(a => {
    if (a.status === 'مستحقة') advByEmp.set(a.emp_id, (advByEmp.get(a.emp_id) || 0) + +a.amount);
  });

  const mTbody = el('tbody');
  state.monthlyEmps.forEach(e => {
    const s = mSalMap.get(e.id) || { base: 0, allow: 0, ded: 0, paid: false };
    const adv = advByEmp.get(e.id) || 0;
    const net = Math.max(0, +s.base + +s.allow - +s.ded - adv);
    mTbody.appendChild(el('tr', {},
      el('td', {}, e.name),
      el('td', { class: 'num' }, salaryInput(e.id, 'base', s.base)),
      el('td', { class: 'num' }, salaryInput(e.id, 'allow', s.allow)),
      el('td', { class: 'num' }, salaryInput(e.id, 'ded', s.ded)),
      el('td', { class: 'num' }, fmt(adv)),
      el('td', { class: 'num', style: 'font-weight:600' }, fmt(net)),
      el('td', {},
        el('button', { class: 'btn sm ' + (s.paid ? '' : 'primary'), onclick: () => togglePaid(e.id, !s.paid) },
          s.paid ? '✓ مدفوع' : 'دفع'))
    ));
  });
  if (state.monthlyEmps.length === 0) {
    mTbody.appendChild(el('tr', {}, el('td', { colspan: '7', class: 'empty' }, 'لا يوجد موظفون شهريون')));
  }
  const mTbl = el('table', { class: 'tbl' },
    el('thead', {}, el('tr', {},
      el('th', {}, 'الموظف'),
      el('th', { class: 'num' }, 'الأساسي'),
      el('th', { class: 'num' }, 'البدلات'),
      el('th', { class: 'num' }, 'استقطاع'),
      el('th', { class: 'num' }, 'سلف'),
      el('th', { class: 'num' }, 'الصافي'),
      el('th', {}, ''))),
    mTbody);

  // يومي
  const dWMap = new Map(state.dailyWages.map(w => [w.emp_id, w]));
  const ndays = daysInMonth(state.ym);
  const dTbody = el('tbody');
  state.dailyEmps.forEach(e => {
    const w = dWMap.get(e.id) || { rate: 0, attendance: [], rate_overrides: {} };
    const att = Array.isArray(w.attendance) ? w.attendance : [];
    const ovr = w.rate_overrides || {};
    const total = att.reduce((s, d) => s + (+ovr[d] || +w.rate || 0), 0);
    dTbody.appendChild(el('tr', {},
      el('td', {}, e.name),
      el('td', { class: 'num' }, dailyRateInput(e.id, w.rate)),
      el('td', { class: 'num' }, att.length + ' / ' + ndays),
      el('td', { class: 'num', style: 'font-weight:600' }, fmt(total)),
      el('td', {},
        el('button', { class: 'btn sm', onclick: () => openAttendanceEditor(e, w) }, '📅 الحضور'))
    ));
  });
  if (state.dailyEmps.length === 0) {
    dTbody.appendChild(el('tr', {}, el('td', { colspan: '5', class: 'empty' }, 'لا يوجد موظفون يوميون')));
  }
  const dTbl = el('table', { class: 'tbl' },
    el('thead', {}, el('tr', {},
      el('th', {}, 'الموظف'),
      el('th', { class: 'num' }, 'الأجر اليومي'),
      el('th', { class: 'num' }, 'أيام الحضور'),
      el('th', { class: 'num' }, 'الإجمالي'),
      el('th', {}, ''))),
    dTbody);

  root.append(
    el('h2', { class: 'section-title' }, '💵 الرواتب الشهرية'),
    el('div', { class: 'tbl-wrap' }, mTbl),
    el('h2', { class: 'section-title' }, '📆 الأجور اليومية'),
    el('div', { class: 'tbl-wrap' }, dTbl)
  );
}

function salaryInput(empId, field, value) {
  const i = el('input', {
    type: 'number', step: '0.001', value: value || '',
    onblur: async (e) => {
      const body = { [field]: +e.target.value || 0 };
      try {
        await api(`/salaries/monthly/${state.ym}/${empId}`, { method: 'PUT', body });
        refreshTotalsInBg();
      } catch (err) { toast(err.message, 'err'); }
    },
    onkeydown: (e) => { if (e.key === 'Enter') e.target.blur(); }
  });
  return i;
}

function dailyRateInput(empId, value) {
  return el('input', {
    type: 'number', step: '0.001', value: value || '',
    onblur: async (e) => {
      const w = state.dailyWages.find(x => x.emp_id === empId) || { attendance: [], rate_overrides: {} };
      try {
        await api(`/salaries/daily/${state.ym}/${empId}`, {
          method: 'PUT',
          body: { rate: +e.target.value || 0, attendance: w.attendance || [], rate_overrides: w.rate_overrides || {} },
        });
        await loadAllForMonth();
        renderSalaries();
        refreshTotalsInBg();
      } catch (err) { toast(err.message, 'err'); }
    },
    onkeydown: (e) => { if (e.key === 'Enter') e.target.blur(); }
  });
}

async function togglePaid(empId, paid) {
  try {
    await api(`/salaries/monthly/${state.ym}/${empId}`, { method: 'PUT', body: { paid, paid_date: paid ? todayISO() : null } });
    await loadAllForMonth();
    renderSalaries();
    refreshTotalsInBg();
  } catch (err) { toast(err.message, 'err'); }
}

function openAttendanceEditor(emp, w) {
  const ndays = daysInMonth(state.ym);
  const att = new Set((Array.isArray(w.attendance) ? w.attendance : []).map(Number));
  const body = el('div');
  body.appendChild(el('p', { class: 'muted', style: 'margin-bottom:12px' }, `اختر أيام حضور ${emp.name} في ${monthLabel(state.ym)}`));
  const grid = el('div', { style: 'display:grid;grid-template-columns:repeat(7,1fr);gap:6px' });
  for (let d = 1; d <= ndays; d++) {
    const on = att.has(d);
    const b = el('button', {
      class: 'btn sm' + (on ? ' primary' : ''),
      style: 'padding:8px 0',
      onclick: (e) => {
        e.preventDefault();
        if (att.has(d)) att.delete(d); else att.add(d);
        b.classList.toggle('primary');
      }
    }, String(d));
    grid.appendChild(b);
  }
  body.appendChild(grid);
  const btnRow = el('div', { class: 'btn-row', style: 'margin-top:18px;justify-content:flex-end' });
  btnRow.append(
    el('button', { class: 'btn', onclick: closeModal }, 'إلغاء'),
    el('button', {
      class: 'btn primary',
      onclick: async () => {
        try {
          await api(`/salaries/daily/${state.ym}/${emp.id}`, {
            method: 'PUT',
            body: { rate: +w.rate || 0, attendance: [...att].sort((a, b) => a - b), rate_overrides: w.rate_overrides || {} }
          });
          closeModal();
          toast('تم حفظ الحضور', 'ok');
          await loadAllForMonth();
          renderSalaries();
          refreshTotalsInBg();
        } catch (err) { toast(err.message, 'err'); }
      }
    }, 'حفظ')
  );
  body.appendChild(btnRow);
  openModal(`حضور ${emp.name}`, body);
}

// ---- السلف ----
function renderAdvances() {
  const root = $('tab-advances');
  root.innerHTML = '';
  let total = 0;
  const tbody = el('tbody');
  state.advances.forEach(a => {
    total += +a.amount || 0;
    tbody.appendChild(el('tr', {},
      el('td', {}, a.emp_name),
      el('td', {}, a.adv_date),
      el('td', { class: 'num' }, fmt(a.amount)),
      el('td', {}, statusPill(a.status)),
      el('td', {}, a.note || '—'),
      el('td', {}, el('button', { class: 'btn sm danger', onclick: () => deleteAdvance(a.id) }, 'حذف'))
    ));
  });
  if (state.advances.length === 0) {
    tbody.appendChild(el('tr', {}, el('td', { colspan: '6', class: 'empty' }, 'لا توجد سلف')));
  } else {
    tbody.appendChild(el('tr', { class: 'foot' },
      el('td', { colspan: '2' }, 'المجموع'),
      el('td', { class: 'num' }, fmt(total)),
      el('td', { colspan: '3' }, '')));
  }
  const t = el('table', { class: 'tbl' },
    el('thead', {}, el('tr', {},
      el('th', {}, 'الموظف'),
      el('th', {}, 'التاريخ'),
      el('th', { class: 'num' }, 'المبلغ'),
      el('th', {}, 'الحالة'),
      el('th', {}, 'ملاحظة'),
      el('th', {}, ''))),
    tbody);
  root.append(
    el('h2', { class: 'section-title' }, '💸 السلف',
      el('button', { class: 'btn primary', onclick: openAdvanceForm }, '+ سلفة جديدة')),
    el('div', { class: 'tbl-wrap' }, t)
  );
}

function statusPill(s) {
  const cls = s === 'مستحقة' ? 'warn' : s === 'مخصومة' ? 'ok' : 'danger';
  return el('span', { class: 'pill ' + cls }, s);
}

function openAdvanceForm() {
  if (state.monthlyEmps.length === 0 && state.dailyEmps.length === 0) {
    toast('أضف موظفين أوّلاً', 'err'); return;
  }
  const body = el('div');
  const fields = el('div', { class: 'form-grid' });
  const allEmps = [...state.monthlyEmps, ...state.dailyEmps];
  const fEmp = selectField('الموظف', allEmps.map(e => ({ value: e.id, label: e.name })), allEmps[0].id);
  const fDate = inputField('التاريخ', 'date', todayISO(), true);
  const fAmt = inputField('المبلغ', 'number', '', true, '0.001');
  const fNote = inputField('ملاحظة', 'text', '');
  fields.append(fEmp.wrap, fDate.wrap, fAmt.wrap, fNote.wrap);
  body.appendChild(fields);
  const btns = el('div', { class: 'btn-row', style: 'margin-top:18px;justify-content:flex-end' });
  btns.append(
    el('button', { class: 'btn', onclick: closeModal }, 'إلغاء'),
    el('button', { class: 'btn primary', onclick: async () => {
      const emp = allEmps.find(e => e.id === fEmp.input.value);
      if (!emp || !(+fAmt.input.value > 0)) { toast('بيانات ناقصة', 'err'); return; }
      try {
        await api('/advances', { method: 'POST', body: {
          ym: state.ym, emp_id: emp.id, emp_name: emp.name,
          adv_date: fDate.input.value, amount: +fAmt.input.value, note: fNote.input.value || null
        }});
        closeModal(); toast('تمت الإضافة', 'ok');
        await loadAllForMonth(); renderAdvances(); refreshTotalsInBg();
      } catch (err) { toast(err.message, 'err'); }
    } }, 'إضافة')
  );
  body.appendChild(btns);
  openModal('سلفة جديدة', body);
}

async function deleteAdvance(id) {
  if (!confirm('حذف السلفة؟')) return;
  try {
    await api('/advances/' + id, { method: 'DELETE' });
    toast('تم الحذف', 'ok');
    await loadAllForMonth(); renderAdvances(); refreshTotalsInBg();
  } catch (err) { toast(err.message, 'err'); }
}

// ---- الالتزامات ----
function renderObligations() {
  const root = $('tab-obligations');
  root.innerHTML = '';
  let paid = 0, unpaid = 0;
  const tbody = el('tbody');
  state.obligations.forEach(o => {
    if (o.paid) paid += +o.amount; else unpaid += +o.amount;
    tbody.appendChild(el('tr', {},
      el('td', {}, o.name),
      el('td', { class: 'num' }, fmt(o.amount)),
      el('td', {}, o.paid ? el('span', { class: 'pill ok' }, '✓ مدفوع') : el('span', { class: 'pill warn' }, 'غير مدفوع')),
      el('td', {}, o.due_date || '—'),
      el('td', {}, o.paid_by || '—'),
      el('td', {},
        el('button', { class: 'btn sm', onclick: () => togglePayObligation(o) }, o.paid ? 'إلغاء' : 'دفع'),
        ' ',
        el('button', { class: 'btn sm danger', onclick: () => deleteObligation(o.id) }, 'حذف'))
    ));
  });
  if (state.obligations.length === 0) {
    tbody.appendChild(el('tr', {}, el('td', { colspan: '6', class: 'empty' }, 'لا توجد التزامات')));
  } else {
    tbody.appendChild(el('tr', { class: 'foot' },
      el('td', {}, 'الإجمالي'),
      el('td', { class: 'num' }, fmt(paid + unpaid)),
      el('td', { colspan: '4' }, `(مدفوع: ${fmt(paid)} | غير مدفوع: ${fmt(unpaid)})`)));
  }
  const t = el('table', { class: 'tbl' },
    el('thead', {}, el('tr', {},
      el('th', {}, 'الالتزام'),
      el('th', { class: 'num' }, 'المبلغ'),
      el('th', {}, 'الحالة'),
      el('th', {}, 'استحقاق'),
      el('th', {}, 'دفعه'),
      el('th', {}, ''))),
    tbody);
  root.append(
    el('h2', { class: 'section-title' }, '📋 الالتزامات',
      el('button', { class: 'btn primary', onclick: openObligationForm }, '+ التزام جديد')),
    el('div', { class: 'tbl-wrap' }, t)
  );
}

function openObligationForm() {
  const body = el('div');
  const fields = el('div', { class: 'form-grid' });
  const fName = inputField('الاسم', 'text', '', true);
  const fAmt = inputField('المبلغ', 'number', '', true, '0.001');
  const fDue = inputField('تاريخ الاستحقاق', 'date', '', false);
  fields.append(fName.wrap, fAmt.wrap, fDue.wrap);
  body.appendChild(fields);
  const btns = el('div', { class: 'btn-row', style: 'margin-top:18px;justify-content:flex-end' });
  btns.append(
    el('button', { class: 'btn', onclick: closeModal }, 'إلغاء'),
    el('button', { class: 'btn primary', onclick: async () => {
      if (!fName.input.value || !(+fAmt.input.value >= 0)) { toast('بيانات ناقصة', 'err'); return; }
      try {
        await api('/obligations', { method: 'POST', body: {
          ym: state.ym, name: fName.input.value, amount: +fAmt.input.value,
          due_date: fDue.input.value || null
        }});
        closeModal(); toast('تمت الإضافة', 'ok');
        await loadAllForMonth(); renderObligations(); refreshTotalsInBg();
      } catch (err) { toast(err.message, 'err'); }
    } }, 'إضافة')
  );
  body.appendChild(btns);
  openModal('التزام جديد', body);
}

async function togglePayObligation(o) {
  try {
    const newPaid = !o.paid;
    await api('/obligations/' + o.id, { method: 'PUT', body: {
      paid: newPaid, paid_date: newPaid ? todayISO() : null
    }});
    toast(newPaid ? 'تم الدفع' : 'تم الإلغاء', 'ok');
    await loadAllForMonth(); renderObligations(); refreshTotalsInBg();
  } catch (err) { toast(err.message, 'err'); }
}

async function deleteObligation(id) {
  if (!confirm('حذف الالتزام؟')) return;
  try {
    await api('/obligations/' + id, { method: 'DELETE' });
    toast('تم الحذف', 'ok');
    await loadAllForMonth(); renderObligations(); refreshTotalsInBg();
  } catch (err) { toast(err.message, 'err'); }
}

// ---- الموردون ----
function renderSuppliers() {
  const root = $('tab-suppliers');
  root.innerHTML = '';
  const tbody = el('tbody');
  state.suppliers.forEach(s => {
    tbody.appendChild(el('tr', {},
      el('td', {}, s.name),
      el('td', {}, s.phone || '—'),
      el('td', {}, s.notes || '—'),
      el('td', {},
        el('button', { class: 'btn sm', onclick: () => openSupplierForm(s) }, 'تعديل'),
        ' ',
        el('button', { class: 'btn sm danger', onclick: () => deleteSupplier(s.id) }, 'حذف'))
    ));
  });
  if (state.suppliers.length === 0) {
    tbody.appendChild(el('tr', {}, el('td', { colspan: '4', class: 'empty' }, 'لا يوجد موردون')));
  }
  const t = el('table', { class: 'tbl' },
    el('thead', {}, el('tr', {},
      el('th', {}, 'الاسم'),
      el('th', {}, 'الهاتف'),
      el('th', {}, 'ملاحظات'),
      el('th', {}, ''))),
    tbody);
  root.append(
    el('h2', { class: 'section-title' }, '🏢 الموردون',
      el('button', { class: 'btn primary', onclick: () => openSupplierForm(null) }, '+ مورد جديد')),
    el('div', { class: 'tbl-wrap' }, t)
  );
}

function openSupplierForm(s) {
  const isEdit = !!s;
  const body = el('div');
  const fields = el('div', { class: 'form-grid' });
  const fId = inputField('المعرّف (id)', 'text', isEdit ? s.id : 'sup_' + Date.now(), true);
  if (isEdit) fId.input.disabled = true;
  const fName = inputField('الاسم', 'text', s ? s.name : '', true);
  const fPhone = inputField('الهاتف', 'text', s ? s.phone || '' : '');
  const fNotes = inputField('ملاحظات', 'text', s ? s.notes || '' : '');
  fields.append(fId.wrap, fName.wrap, fPhone.wrap, fNotes.wrap);
  body.appendChild(fields);
  const btns = el('div', { class: 'btn-row', style: 'margin-top:18px;justify-content:flex-end' });
  btns.append(
    el('button', { class: 'btn', onclick: closeModal }, 'إلغاء'),
    el('button', { class: 'btn primary', onclick: async () => {
      if (!fId.input.value || !fName.input.value) { toast('المعرّف والاسم مطلوبان', 'err'); return; }
      try {
        await api('/suppliers/' + fId.input.value, { method: 'PUT', body: {
          name: fName.input.value, phone: fPhone.input.value || null, notes: fNotes.input.value || null
        }});
        closeModal(); toast(isEdit ? 'تم التعديل' : 'تمت الإضافة', 'ok');
        await loadAllForMonth(); renderSuppliers();
      } catch (err) { toast(err.message, 'err'); }
    } }, isEdit ? 'حفظ' : 'إضافة')
  );
  body.appendChild(btns);
  openModal(isEdit ? 'تعديل مورد' : 'مورد جديد', body);
}

async function deleteSupplier(id) {
  if (!confirm('أرشفة المورد؟ (لن يحذف الفواتير المرتبطة)')) return;
  try {
    await api('/suppliers/' + id, { method: 'DELETE' });
    toast('تمت الأرشفة', 'ok');
    await loadAllForMonth(); renderSuppliers();
  } catch (err) { toast(err.message, 'err'); }
}

// ---- الموظفون ----
function renderEmployees() {
  const root = $('tab-employees');
  root.innerHTML = '';
  function tableFor(type, list) {
    const tbody = el('tbody');
    list.forEach(e => {
      tbody.appendChild(el('tr', {},
        el('td', {}, e.name),
        el('td', { class: 'muted' }, e.id),
        el('td', {},
          el('button', { class: 'btn sm', onclick: () => openEmpForm(type, e) }, 'تعديل'),
          ' ',
          el('button', { class: 'btn sm danger', onclick: () => deleteEmp(type, e.id) }, 'حذف'))
      ));
    });
    if (list.length === 0) {
      tbody.appendChild(el('tr', {}, el('td', { colspan: '3', class: 'empty' }, 'لا يوجد')));
    }
    return el('table', { class: 'tbl' },
      el('thead', {}, el('tr', {}, el('th', {}, 'الاسم'), el('th', {}, 'المعرّف'), el('th', {}, ''))),
      tbody);
  }
  root.append(
    el('h2', { class: 'section-title' }, '👥 الموظفون الشهريون',
      el('button', { class: 'btn primary', onclick: () => openEmpForm('monthly', null) }, '+ موظف شهري')),
    el('div', { class: 'tbl-wrap' }, tableFor('monthly', state.monthlyEmps)),
    el('h2', { class: 'section-title' }, '📆 الموظفون اليوميون',
      el('button', { class: 'btn primary', onclick: () => openEmpForm('daily', null) }, '+ موظف يومي')),
    el('div', { class: 'tbl-wrap' }, tableFor('daily', state.dailyEmps))
  );
}

function openEmpForm(type, e) {
  const isEdit = !!e;
  const body = el('div');
  const fields = el('div', { class: 'form-grid' });
  const fId = inputField('المعرّف', 'text', isEdit ? e.id : 'emp_' + Date.now(), true);
  if (isEdit) fId.input.disabled = true;
  const fName = inputField('الاسم', 'text', e ? e.name : '', true);
  fields.append(fId.wrap, fName.wrap);
  body.appendChild(fields);
  const btns = el('div', { class: 'btn-row', style: 'margin-top:18px;justify-content:flex-end' });
  btns.append(
    el('button', { class: 'btn', onclick: closeModal }, 'إلغاء'),
    el('button', { class: 'btn primary', onclick: async () => {
      if (!fId.input.value || !fName.input.value) { toast('المعرّف والاسم مطلوبان', 'err'); return; }
      try {
        await api(`/employees/${type}/${fId.input.value}`, { method: 'PUT', body: { name: fName.input.value } });
        closeModal(); toast('تمّ', 'ok');
        await loadAllForMonth(); renderEmployees();
      } catch (err) { toast(err.message, 'err'); }
    } }, isEdit ? 'حفظ' : 'إضافة')
  );
  body.appendChild(btns);
  openModal(isEdit ? 'تعديل موظف' : 'موظف جديد', body);
}

async function deleteEmp(type, id) {
  if (!confirm('أرشفة الموظف؟')) return;
  try {
    await api(`/employees/${type}/${id}`, { method: 'DELETE' });
    toast('تمّت الأرشفة', 'ok');
    await loadAllForMonth(); renderEmployees();
  } catch (err) { toast(err.message, 'err'); }
}

// ========== Helpers للنماذج ==========
function inputField(label, type, value, required = false, step = null) {
  const wrap = el('div', { class: 'field' });
  const lbl = el('label', {}, label + (required ? ' *' : ''));
  const input = el('input', { type, value: value === null || value === undefined ? '' : value });
  if (step) input.setAttribute('step', step);
  if (required) input.setAttribute('required', 'required');
  wrap.append(lbl, input);
  return { wrap, input };
}

function selectField(label, options, value) {
  const wrap = el('div', { class: 'field' });
  const lbl = el('label', {}, label);
  const input = el('select');
  options.forEach(o => {
    const opt = el('option', { value: o.value }, o.label);
    if (o.value === value) opt.setAttribute('selected', '');
    input.appendChild(opt);
  });
  wrap.append(lbl, input);
  return { wrap, input };
}

// ========== Boot ==========
async function boot() {
  try { await api('/me'); } catch { showLogin(); return; }
  showApp();
  try {
    await loadMonths();
    await loadAllForMonth();
    renderCurrentTab();
  } catch (e) {
    toast('فشل التحميل: ' + e.message, 'err');
  }
}

boot();
