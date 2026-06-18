// مصادقة بسيطة لمستخدم واحد:
// • POST /api/login  { password } → cookie httpOnly
// • أي طلب آخر يجب أن يحمل الـcookie صالح
const crypto = require('crypto');

const COOKIE_NAME = 'rh_sess';
const COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 يوم

function getSecret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error('SESSION_SECRET مطلوب وطوله ≥16 حرف');
  }
  return s;
}

function sign(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', getSecret()).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verify(token) {
  if (!token || typeof token !== 'string') return null;
  const [data, sig] = token.split('.');
  if (!data || !sig) return null;
  const expected = crypto.createHmac('sha256', getSecret()).update(data).digest('base64url');
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf-8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

function login(req, res) {
  const password = (req.body && req.body.password) || '';
  const expected = process.env.APP_PASSWORD || '';
  if (!expected) {
    return res.status(500).json({ error: 'APP_PASSWORD غير معرّف على السيرفر' });
  }

  // مقارنة بزمن ثابت لتجنّب timing attacks
  const a = Buffer.from(password.padEnd(64, '\0').slice(0, 64));
  const b = Buffer.from(expected.padEnd(64, '\0').slice(0, 64));
  if (!crypto.timingSafeEqual(a, b) || password.length !== expected.length) {
    return res.status(401).json({ error: 'كلمة المرور غير صحيحة' });
  }

  const token = sign({ user: 'yazan', exp: Date.now() + COOKIE_MAX_AGE_MS });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE_MS,
  });
  res.json({ ok: true });
}

function logout(req, res) {
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
}

function requireAuth(req, res, next) {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  const payload = verify(token);
  if (!payload) {
    return res.status(401).json({ error: 'غير مصرّح — يرجى تسجيل الدخول' });
  }
  req.user = payload;
  next();
}

module.exports = { login, logout, requireAuth };
