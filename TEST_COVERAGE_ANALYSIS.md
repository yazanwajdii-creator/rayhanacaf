# Test Coverage Analysis — Rayhana Café App

## Summary

The codebase has **0% test coverage**. No test files, no test frameworks, and no test-related configuration exist anywhere in the project. Every line of business logic, security code, and data-sync logic runs completely unverified.

---

## Current State

| Metric | Value |
|---|---|
| Test files | 0 |
| Source lines (JS in `index.html`) | ~10,835 |
| Source lines (Java `MainActivity.java`) | ~137 |
| Functions identified | ~150+ |
| Functions with tests | 0 |
| Testing frameworks configured | None |
| CI test step | None (build-only GitHub Action) |

---

## Priority Areas for New Tests

Ranked by risk (bug impact × likelihood).

---

### 1. Authentication & Password Logic — CRITICAL

**Files:** `index.html` lines 3630–3728

**Why it matters:** A bug here locks every user out or lets anyone in.

**Known bug (confirmed by code reading):** `changePwd()` and `checkPwd()` are out of sync on how they store/read the password hash.

- `checkPwd()` (line 3642) compares against a **SHA-256** hash and silently migrates legacy base64 passwords to SHA-256 on first use.
- `changePwd()` (line 3719) validates the *old* password using `btoa(old) !== stored` — this will **always fail** after migration, because `btoa` produces base64 but the stored value is now SHA-256.
- `changePwd()` (line 3722) then stores the *new* password as `btoa(nw)` — plain base64 — undoing the migration.

**Effect:** Once a user logs in for the first time after the SHA-256 migration, they can never change their password. The change-password form will always show "كلمة المرور الحالية غير صحيحة".

**Tests to write:**

```js
// sha256() — pure async function, easy to test
test('sha256 applies salt before hashing', async () => {
  const h1 = await sha256('abc');
  const h2 = await sha256('abc');
  expect(h1).toBe(h2);               // deterministic
  expect(h1).toHaveLength(64);       // valid hex SHA-256
  expect(h1).not.toBe(await sha256('xyz'));
});

// checkPwd() — mock localStorage and DOM
test('checkPwd accepts correct SHA-256 password', async () => { /* ... */ });
test('checkPwd migrates base64 password to SHA-256 on login', async () => { /* ... */ });
test('checkPwd rejects wrong password', async () => { /* ... */ });

// changePwd() — should use SHA-256 for both read and write
test('changePwd validates old password correctly after SHA-256 migration', async () => { /* ... */ });
test('changePwd stores new password as SHA-256, not base64', async () => { /* ... */ });
```

---

### 2. Financial Calculation Engine — CRITICAL

**Files:** `index.html` lines 4093–4213 (`totals()`, `calcRevTots()`)

**Why it matters:** Incorrect profit/expense calculations produce wrong financial reports. The code has already had two breaking fixes ("V24-2 FIX", "V24-3 FIX") with comments about critical accounting errors — tests would have caught these regressions.

**Key formulas to verify:**

- `netSales = cash + visa` (not including `pmts`)
- `totalExp = bycat.total + oblPaid + mSalPaid` (only *paid* obligations and salaries)
- `profit = netSales - totalExp`
- `margin = profit / netSales * 100`
- Net salary per employee: `max(0, base + allow - ded - pendingAdvances)`

**Tests to write:**

```js
// totals() — pure calculation given a month data object
describe('totals()', () => {
  test('netSales excludes pmts (daily wage payments)', () => {
    const month = mockMonth({ sales: [{ cash: 100, visa: 50, pmts: 20 }] });
    const r = totals(month);
    expect(r.netSales).toBe(150);  // not 170
  });

  test('only paid obligations count toward expenses', () => {
    const month = mockMonth({
      obligations: [
        { amt: 500, paid: true },
        { amt: 1000, paid: false }
      ]
    });
    const r = totals(month);
    expect(r.oblPaid).toBe(500);   // 1000 must not appear
  });

  test('unpaid salaries do not reduce profit', () => { /* ... */ });

  test('profit margin is zero when netSales is zero (no division by zero)', () => { /* ... */ });

  test('pending advances reduce employee net salary', () => { /* ... */ });
});
```

---

### 3. Data Initialization — HIGH

**Files:** `index.html` lines 3789–3808 (`getMonth()`)

**Why it matters:** This is the data factory for every month. A bug here corrupts all financial data, salary tables, and obligation lists for new months.

**Tests to write:**

```js
describe('getMonth()', () => {
  test('creates correct number of days for a 28-day month (Feb non-leap)', () => {
    const m = getMonth('2025-02');
    expect(m.sales).toHaveLength(28);
  });

  test('creates correct number of days for a 31-day month', () => {
    const m = getMonth('2025-01');
    expect(m.sales).toHaveLength(31);
  });

  test('leap year February has 29 days', () => {
    const m = getMonth('2024-02');
    expect(m.sales).toHaveLength(29);
  });

  test('each day entry has cash, visa, pmts initialized to 0', () => { /* ... */ });

  test('returns same object on repeated calls (no re-initialization)', () => {
    const m1 = getMonth('2025-03');
    m1.sales[0].cash = 999;
    const m2 = getMonth('2025-03');
    expect(m2.sales[0].cash).toBe(999);
  });

  test('new month has default obligations pre-populated', () => {
    const m = getMonth('2025-06');
    expect(m.obligations.length).toBeGreaterThan(0);
    expect(m.obligations[0].name).toBeTruthy();
    expect(m.obligations[0].paid).toBe(false);
  });
});
```

---

### 4. Supabase Sync Conflict Detection — HIGH

**Files:** `index.html` lines 10546–10630 (`supaSync()`)

**Why it matters:** The conflict detection logic (lines 10593–10602) uses timestamp comparisons to warn when local data is newer than cloud data. An off-by-one in the 60-second threshold or a timezone issue silently swallows data from another device.

**Tests to write:**

```js
describe('supaSync conflict detection', () => {
  test('warns when local push is more than 60s newer than cloud', () => { /* mock toast */ });
  test('does not warn when timestamps differ by less than 60s', () => { /* ... */ });
  test('does not warn when device is the same', () => { /* ... */ });
  test('pull merges cloud months into local state without overwriting', () => { /* ... */ });
  test('pull throws when Supabase returns non-PGRST116 error', () => { /* ... */ });
});
```

---

### 5. Pending Advances Calculation — MEDIUM

**Files:** `index.html` line 4640 (`pendAdv()`)

**Why it matters:** Advances incorrectly deducted from salary cause employees to be underpaid. This feeds directly into `totals()` and every salary display.

```js
const pendAdv = empId =>
  G().advances
    .filter(a => a.empId === empId && (a.status === 'مستحقة' || a.status === 'مسددة جزئياً'))
    .reduce((s, a) => s + (a.amt || 0), 0);
```

**Tests to write:**

```js
describe('pendAdv()', () => {
  test('sums only pending and partially-paid advances', () => { /* ... */ });
  test('excludes fully-settled advances', () => { /* ... */ });
  test('excludes advances for other employees', () => { /* ... */ });
  test('returns 0 when employee has no advances', () => { /* ... */ });
  test('handles missing amt field gracefully', () => { /* ... */ });
});
```

---

### 6. HTML Escape Utility — MEDIUM

**Files:** `index.html` line 3812 (`esc()`)

**Why it matters:** `esc()` is used throughout the rendering layer to prevent XSS. A missed character (e.g., single quote) could allow stored XSS via supplier names, employee names, or notes.

```js
function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
```

**Tests to write:**

```js
describe('esc()', () => {
  test('escapes &', () => expect(esc('a & b')).toBe('a &amp; b'));
  test('escapes <', () => expect(esc('<script>')).toBe('&lt;script&gt;'));
  test('escapes "', () => expect(esc('"hello"')).toBe('&quot;hello&quot;'));
  test('handles null/undefined', () => expect(esc(null)).toBe(''));
  test('does NOT escape single quotes — document this known gap', () => {
    // Single quotes are unescaped; callers must not use esc() in JS event handlers
    expect(esc("it's")).toBe("it's");
  });
});
```

---

### 7. `daysIn()` Utility — MEDIUM

**Files:** `index.html` line 3786

**Why it matters:** Wrong day count = missing rows in the sales table or out-of-bounds access. This is the root of `getMonth()`.

```js
const daysIn = k => { const [y, m] = k.split('-').map(Number); return new Date(y, m, 0).getDate(); };
```

**Tests to write:**

```js
describe('daysIn()', () => {
  test.each([
    ['2025-01', 31], ['2025-02', 28], ['2024-02', 29],
    ['2025-04', 30], ['2025-12', 31],
  ])('%s has %d days', (key, expected) => {
    expect(daysIn(key)).toBe(expected);
  });
});
```

---

### 8. Number Formatting — LOW

**Files:** `index.html` line 3766 (`n3()`)

**Why it matters:** `n3()` formats all monetary values. A wrong decimal means financial reports show incorrect amounts.

```js
const n3 = v => (parseFloat(v) || 0).toFixed(3);
```

**Tests to write:**

```js
describe('n3()', () => {
  test('formats to 3 decimal places', () => expect(n3(1.5)).toBe('1.500'));
  test('returns "0.000" for null/undefined/NaN', () => {
    expect(n3(null)).toBe('0.000');
    expect(n3(undefined)).toBe('0.000');
    expect(n3('abc')).toBe('0.000');
  });
  test('handles string numbers', () => expect(n3('12.5')).toBe('12.500'));
});
```

---

## Recommended Test Setup

### Step 1: Extract pure functions into a testable module

The biggest obstacle to testing is that all logic lives inside a single HTML file with DOM dependencies woven throughout. The pure functions listed above (`sha256`, `daysIn`, `n3`, `esc`, `pendAdv`, `totals` logic) have no inherent DOM dependency and can be extracted into a plain `.js` module.

**Approach:** Create `src/core.js` exporting just the pure functions. Import it in `index.html` via `<script src="src/core.js">`. Test `src/core.js` with Jest.

### Step 2: Install Jest

```bash
npm init -y
npm install --save-dev jest
```

Add to `package.json`:
```json
{
  "scripts": {
    "test": "jest --coverage",
    "test:watch": "jest --watch"
  },
  "jest": {
    "coverageThreshold": {
      "global": { "functions": 70, "lines": 70 }
    }
  }
}
```

### Step 3: Add tests to CI

In `.github/workflows/build-android.yml`, add a test job that runs before the build:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm test
  build:
    needs: test
    # ... existing build steps
```

---

## Prioritized Backlog

| # | Area | Risk | Effort | Tests Needed |
|---|---|---|---|---|
| 1 | `changePwd()` / `checkPwd()` SHA-256 mismatch bug | Critical | Low | 5 |
| 2 | `totals()` financial formulas | Critical | Medium | 8 |
| 3 | `getMonth()` data initialization | High | Low | 6 |
| 4 | `supaSync()` conflict detection | High | Medium | 5 |
| 5 | `pendAdv()` advance deduction | Medium | Low | 5 |
| 6 | `esc()` XSS escaping | Medium | Low | 5 |
| 7 | `daysIn()` calendar math | Medium | Low | 5 |
| 8 | `n3()` number formatting | Low | Low | 4 |
