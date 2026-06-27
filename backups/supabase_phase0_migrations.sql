-- ════════════════════════════════════════════════════════════════════
-- ريحانة — المرحلة ٠: إصلاحات قاعدة Supabase (project uxwreejvcokwkbgwbrdj)
-- طُبّقت 2026-06-27. مرجع توثيقي (الهجرات مطبّقة فعلياً على القاعدة).
-- ════════════════════════════════════════════════════════════════════

-- (1) migration: rh_store_safety_history_and_rls
--     - جدول أرشيف rh_store_history + مُشغِّل يحفظ النسخة السابقة عند كل تعديل/حذف
--     - سياسات RLS تعيد للعميل القراءة/الإضافة/التحديث على rh_store
-- (2) migration: rh_store_grants_for_client_roles
--     - GRANT select/insert/update على rh_store لدورَي anon, authenticated
-- (3) migration: rh_store_guard_block_empty_overwrite
--     - rh_store_nonzero_days(jsonb): عدّ أيام المبيعات الحقيقية
--     - rh_store_guard(): يمنع استبدال بيانات غنية بأخرى شبه فارغة
--       (يُمنع عند old_days>=20 و new_days < 50% من old_days)
--       تجاوز يدوي: أرسل القيمة مع "_force": true

-- ─── الحارس (المرجع الكامل) ───────────────────────────────────────────
create or replace function public.rh_store_nonzero_days(v jsonb)
returns integer language sql immutable as $fn$
  select coalesce(sum(
           (select count(*) from jsonb_array_elements(coalesce(m.value->'sales','[]'::jsonb)) s
             where (s->>'cash')::numeric > 0
                or (s->>'visa')::numeric > 0
                or (s->>'pmts')::numeric > 0)
         ),0)::int
  from jsonb_each(coalesce(v->'months','{}'::jsonb)) m;
$fn$;

create or replace function public.rh_store_guard()
returns trigger language plpgsql as $fn$
declare old_days int; new_days int;
begin
  if coalesce((NEW.value->>'_force')::boolean, false) then return NEW; end if;
  old_days := public.rh_store_nonzero_days(OLD.value);
  new_days := public.rh_store_nonzero_days(NEW.value);
  if old_days >= 20 and new_days < (old_days * 0.5) then
    raise exception
      'rh_store guard: refusing overwrite that drops sales days from % to % (data loss prevented).',
      old_days, new_days using errcode = 'check_violation';
  end if;
  return NEW;
end;
$fn$;

-- استرجاع أغنى نسخة مؤرشفة (للطوارئ):
-- update rh_store r set value=(select value from rh_store_history
--   where key='rayhana_cafe_v26' order by rh_store_nonzero_days(value) desc limit 1), updated_at=now()
-- where r.key='rayhana_cafe_v26';
