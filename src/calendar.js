/**
 * calendar.js — منطق التقويم الأردني (ميلادي + هجري)
 * نسخة قابلة للاختبار — لا تعتمد على DOM.
 * يُستخدم في index.html عن طريق نسخ القاموسين والدوال (أو تضمين الملف عند التقسيم الكامل).
 */

// عطل ميلادية أردنية ثابتة (مفتاح: MM-DD)
const JO_HOLIDAYS_GREG = {
  '01-01': { name: 'رأس السنة الميلادية', emoji: '🎉', closed: false },
  '05-01': { name: 'عيد العمال',         emoji: '⚒️', closed: true  },
  '05-25': { name: 'عيد الاستقلال الأردني', emoji: '🇯🇴', closed: true  },
  '12-25': { name: 'عيد الميلاد المجيد',   emoji: '🎄', closed: false },
};

// عطل هجرية أردنية رئيسية ({m: شهر هجري، d: يوم هجري})
const JO_HOLIDAYS_HIJRI = [
  { m:  1, d:  1, name: 'رأس السنة الهجرية',          emoji: '🌙', closed: true  },
  { m:  1, d: 10, name: 'عاشوراء',                     emoji: '🕋', closed: false },
  { m:  3, d: 12, name: 'المولد النبوي الشريف',         emoji: '🕌', closed: true  },
  { m:  7, d: 27, name: 'الإسراء والمعراج',            emoji: '✨', closed: false },
  { m:  9, d:  1, name: 'بداية شهر رمضان',             emoji: '🌙', closed: false },
  { m: 10, d:  1, name: 'عيد الفطر (اليوم الأول)',      emoji: '🎊', closed: true  },
  { m: 10, d:  2, name: 'عيد الفطر (اليوم الثاني)',     emoji: '🎊', closed: true  },
  { m: 10, d:  3, name: 'عيد الفطر (اليوم الثالث)',     emoji: '🎊', closed: true  },
  { m: 12, d:  9, name: 'يوم عرفة',                    emoji: '🕋', closed: false },
  { m: 12, d: 10, name: 'عيد الأضحى المبارك (اليوم الأول)', emoji: '🐑', closed: true },
  { m: 12, d: 11, name: 'عيد الأضحى (اليوم الثاني)',     emoji: '🐑', closed: true },
  { m: 12, d: 12, name: 'عيد الأضحى (اليوم الثالث)',     emoji: '🐑', closed: true },
  { m: 12, d: 13, name: 'عيد الأضحى (اليوم الرابع)',     emoji: '🐑', closed: true },
];

const HIJRI_MONTHS = [
  '', 'محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر',
  'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان',
  'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة',
];

/**
 * يحوّل تاريخ ميلادي إلى هجري {y, m, d} باستخدام تقويم أم القرى.
 * يفشل لـ null في بيئات لا تدعم Intl.
 */
function gregToHijri(date) {
  const tryCalendar = (cal) => {
    const parts = new Intl.DateTimeFormat('en-u-ca-' + cal, {
      year: 'numeric', month: 'numeric', day: 'numeric',
    }).formatToParts(date);
    const out = {};
    parts.forEach(p => {
      if (p.type === 'year')  out.y = parseInt(p.value);
      else if (p.type === 'month') out.m = parseInt(p.value);
      else if (p.type === 'day')   out.d = parseInt(p.value);
    });
    return out.y && out.m && out.d ? out : null;
  };
  try { return tryCalendar('islamic-umalqura'); }
  catch (e1) { try { return tryCalendar('islamic'); } catch (e2) { return null; } }
}

function formatHijri(date) {
  const h = gregToHijri(date);
  if (!h) return '';
  return `${h.d} ${HIJRI_MONTHS[h.m] || ''} ${h.y} هـ`;
}

/**
 * يفحص إذا كان التاريخ عطلة. يُرجع كائن العطلة أو null.
 */
function getHolidayInfo(date) {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const greg = JO_HOLIDAYS_GREG[`${mm}-${dd}`];
  if (greg) return Object.assign({ source: 'gregorian' }, greg);
  const h = gregToHijri(date);
  if (h) {
    for (const hh of JO_HOLIDAYS_HIJRI) {
      if (h.m === hh.m && h.d === hh.d) return Object.assign({ source: 'hijri' }, hh);
    }
  }
  return null;
}

/**
 * يبحث عن أقرب عطلة قادمة خلال N يوم (لا يشمل اليوم الحالي).
 * يُرجع {date, daysUntil, info} أو null.
 */
function getUpcomingHoliday(fromDate, withinDays = 14) {
  for (let i = 1; i <= withinDays; i++) {
    const d = new Date(fromDate.getTime() + i * 86400000);
    const info = getHolidayInfo(d);
    if (info) return { date: d, daysUntil: i, info };
  }
  return null;
}

module.exports = {
  JO_HOLIDAYS_GREG,
  JO_HOLIDAYS_HIJRI,
  HIJRI_MONTHS,
  gregToHijri,
  formatHijri,
  getHolidayInfo,
  getUpcomingHoliday,
};
