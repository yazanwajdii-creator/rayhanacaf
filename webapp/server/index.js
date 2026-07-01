const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');

const { login, logout, requireAuth } = require('./auth');
const monthsRoutes = require('./routes/months');
const salesRoutes = require('./routes/sales');
const purchasesRoutes = require('./routes/purchases');
const suppliersRoutes = require('./routes/suppliers');
const employeesRoutes = require('./routes/employees');
const salariesRoutes = require('./routes/salaries');
const advancesRoutes = require('./routes/advances');
const obligationsRoutes = require('./routes/obligations');
const reportsRoutes = require('./routes/reports');

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// طلبات API
app.post('/api/login', login);
app.post('/api/logout', logout);

// كل ما بعدها يتطلّب مصادقة
app.use('/api', requireAuth);

app.get('/api/me', (req, res) => res.json({ user: req.user.user }));
app.use('/api/months', monthsRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/purchases', purchasesRoutes);
app.use('/api/suppliers', suppliersRoutes);
app.use('/api/employees', employeesRoutes);
app.use('/api/salaries', salariesRoutes);
app.use('/api/advances', advancesRoutes);
app.use('/api/obligations', obligationsRoutes);
app.use('/api/reports', reportsRoutes);

// الواجهة الثابتة
app.use(express.static(path.join(__dirname, '..', 'public')));

// SPA fallback (لو في route غير معروف، أرجع index.html)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// معالج الأخطاء العام
app.use((err, req, res, _next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message || 'خطأ داخلي' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`☕ ريحانة كافيه — http://localhost:${port}`);
});
