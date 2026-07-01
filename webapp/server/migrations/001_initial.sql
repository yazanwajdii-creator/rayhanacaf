-- ريحانة كافيه — Schema المبدئيّة
-- مبدأ التصميم:
--   • مفتاح الشهر نص بصيغة 'YYYY-MM' (مثل '2026-05') — متّسق مع التطبيق القديم
--   • كل البيانات المالية NUMERIC(12,3) — 3 منازل عشرية لـJOD
--   • TIMESTAMPTZ للتواريخ الزمنية، DATE للتواريخ التقويميّة فقط
--   • ON DELETE CASCADE من الشهر لتفاصيله — حذف شهر يحذف كل ما فيه

CREATE TABLE IF NOT EXISTS months (
  ym         TEXT PRIMARY KEY CHECK (ym ~ '^\d{4}-\d{2}$'),
  locked     BOOLEAN NOT NULL DEFAULT FALSE,
  ended      BOOLEAN NOT NULL DEFAULT FALSE,
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS suppliers (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  phone      TEXT,
  notes      TEXT,
  archived   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS suppliers_name_idx ON suppliers (name);

CREATE TABLE IF NOT EXISTS monthly_emps (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  archived   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_emps (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  archived   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- المبيعات اليومية — يوم واحد لكل صف
CREATE TABLE IF NOT EXISTS sales (
  ym          TEXT NOT NULL REFERENCES months(ym) ON DELETE CASCADE,
  day         SMALLINT NOT NULL CHECK (day BETWEEN 1 AND 31),
  cash        NUMERIC(12,3) NOT NULL DEFAULT 0,
  visa        NUMERIC(12,3) NOT NULL DEFAULT 0,
  pmts        NUMERIC(12,3) NOT NULL DEFAULT 0,
  received_by TEXT,
  notes       TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (ym, day)
);

-- المشتريات
CREATE TABLE IF NOT EXISTS purchases (
  id          BIGSERIAL PRIMARY KEY,
  ym          TEXT NOT NULL REFERENCES months(ym) ON DELETE CASCADE,
  purchase_date DATE NOT NULL,
  supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_name TEXT, -- نسخ احتياطي للاسم إن حُذف المورد
  category    TEXT NOT NULL DEFAULT 'COGS' CHECK (category IN ('COGS','OPS','ADM','MKT','OTHER')),
  description TEXT,
  amount      NUMERIC(12,3) NOT NULL CHECK (amount >= 0),
  buyer       TEXT,
  invoice     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS purchases_ym_idx ON purchases (ym);
CREATE INDEX IF NOT EXISTS purchases_date_idx ON purchases (purchase_date);

-- رواتب شهريّة — صف لكل (شهر، موظف)
CREATE TABLE IF NOT EXISTS monthly_salaries (
  ym         TEXT NOT NULL REFERENCES months(ym) ON DELETE CASCADE,
  emp_id     TEXT NOT NULL REFERENCES monthly_emps(id) ON DELETE CASCADE,
  base       NUMERIC(12,3) NOT NULL DEFAULT 0,
  allow      NUMERIC(12,3) NOT NULL DEFAULT 0,
  ded        NUMERIC(12,3) NOT NULL DEFAULT 0,
  paid       BOOLEAN NOT NULL DEFAULT FALSE,
  paid_date  DATE,
  paid_by    TEXT,
  notes      TEXT,
  PRIMARY KEY (ym, emp_id)
);

-- أجور يوميّة — صف لكل (شهر، موظف يومي)
CREATE TABLE IF NOT EXISTS daily_wages (
  ym             TEXT NOT NULL REFERENCES months(ym) ON DELETE CASCADE,
  emp_id         TEXT NOT NULL REFERENCES daily_emps(id) ON DELETE CASCADE,
  rate           NUMERIC(12,3) NOT NULL DEFAULT 0,
  attendance     JSONB NOT NULL DEFAULT '[]'::jsonb, -- مصفوفة أيام الحضور
  rate_overrides JSONB NOT NULL DEFAULT '{}'::jsonb, -- {day: rate}
  PRIMARY KEY (ym, emp_id)
);

-- السلف — كل سلفة سجل مستقلّ
CREATE TABLE IF NOT EXISTS advances (
  id         BIGSERIAL PRIMARY KEY,
  ym         TEXT NOT NULL REFERENCES months(ym) ON DELETE CASCADE,
  emp_id     TEXT NOT NULL,
  emp_name   TEXT NOT NULL, -- نسخ احتياطي
  adv_date   DATE NOT NULL,
  amount     NUMERIC(12,3) NOT NULL CHECK (amount > 0),
  status     TEXT NOT NULL DEFAULT 'مستحقة' CHECK (status IN ('مستحقة','مخصومة','ملغاة')),
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS advances_ym_idx ON advances (ym);
CREATE INDEX IF NOT EXISTS advances_emp_idx ON advances (emp_id);

-- الالتزامات
CREATE TABLE IF NOT EXISTS obligations (
  id         BIGSERIAL PRIMARY KEY,
  ym         TEXT NOT NULL REFERENCES months(ym) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  amount     NUMERIC(12,3) NOT NULL CHECK (amount >= 0),
  paid       BOOLEAN NOT NULL DEFAULT FALSE,
  due_date   DATE,
  paid_date  DATE,
  paid_by    TEXT,
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS obligations_ym_idx ON obligations (ym);

-- جدول لتسجيل الإجراءات (audit log) — يساعد لو ضاعت بيانات نعرف من غيّر ماذا ومتى
CREATE TABLE IF NOT EXISTS audit_log (
  id         BIGSERIAL PRIMARY KEY,
  ts         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  action     TEXT NOT NULL, -- 'INSERT' | 'UPDATE' | 'DELETE'
  entity     TEXT NOT NULL, -- 'sales' | 'purchases' | ...
  entity_key TEXT,          -- مفتاح السجل (ym|day، أو id)
  payload    JSONB          -- البيانات الجديدة/القديمة
);
CREATE INDEX IF NOT EXISTS audit_log_ts_idx ON audit_log (ts DESC);
CREATE INDEX IF NOT EXISTS audit_log_entity_idx ON audit_log (entity);

-- trigger لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS months_touch ON months;
CREATE TRIGGER months_touch BEFORE UPDATE ON months
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS sales_touch ON sales;
CREATE TRIGGER sales_touch BEFORE UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
