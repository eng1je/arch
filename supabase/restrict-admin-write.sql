-- ============================================================
--  🔒 تقييد صلاحيات الكتابة على بريد المدير فقط
--  أرشيف امتحانات كلية الهندسة – جامعة الجفرة
-- ============================================================
--  الطريقة:
--    1. افتح مشروعك في Supabase.
--    2. SQL Editor ← New query.
--    3. الصق هذا الملف بالكامل ثم اضغط Run.
--
--  آمن تماماً: لا يحذف أي بيانات، ويُعاد تنفيذه بلا مشاكل (Idempotent).
--
--  ماذا يفعل؟
--    ① ينشئ جدول public.admins فيه بريد/بُرد المديرين.
--    ② يسمح بالكتابة (إضافة/تعديل/حذف) لصاحب البريد الموجود في الجدول فقط.
--    ③ يمنع أي حساب آخر — حتى لو أُنشئ مستقبلاً — من تعديل الأرشيف أو ملفاته.
--
--  ⚠️ ملاحظة مهمة:
--    إن أعدتَ تشغيل supabase/schema.sql بعد هذا الملف، فسيُعيد صلاحيات
--    الكتابة المفتوحة. الحل: أعد تشغيل هذا الملف بعده (أو لا تُعِد schema.sql).
--
--  ✏️ لإضافة مدير ثانٍ لاحقاً: أضف بريده في القسم ① كما هو موضّح في المثال.
-- ------------------------------------------------------------


-- ------------------------------------------------------------
-- ① قائمة المديرين
-- ------------------------------------------------------------
create table if not exists public.admins (
  email      text primary key,
  created_at timestamptz not null default now()
);

-- ✏️ عدّل البريد هنا (وأضف سطراً لكل مدير إضافي)
insert into public.admins (email) values
  ('jehad123@mm.com')
  -- ,('مدير-آخر@example.com')
on conflict (email) do nothing;

-- حماية الجدول: لا يُقرأ ولا يُعدَّل من المتصفح إطلاقاً.
-- (تُقرأ فقط عبر الدالة أدناه، وهي تعمل بصلاحية مُرتفعة داخلياً)
alter table public.admins enable row level security;


-- ------------------------------------------------------------
-- ② دالة التحقق: هل المستخدم الحالي مدير؟
-- ------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admins a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

grant execute on function public.is_admin() to authenticated;


-- ------------------------------------------------------------
-- ③ الجداول: الكتابة للمدير فقط (القراءة تبقى عامة للزوار)
-- ------------------------------------------------------------
drop policy if exists "Admin write departments" on public.departments;
create policy "Admin write departments" on public.departments
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admin write subjects" on public.subjects;
create policy "Admin write subjects" on public.subjects
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admin write exams" on public.exams;
create policy "Admin write exams" on public.exams
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());


-- ------------------------------------------------------------
-- ④ التخزين: رفع/تعديل/حذف الملفات للمدير فقط
--    (القراءة والتحميل تبقى عامة للزوار)
-- ------------------------------------------------------------
drop policy if exists "Admin insert exam files" on storage.objects;
create policy "Admin insert exam files" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'exam-files' and public.is_admin());

drop policy if exists "Admin update exam files" on storage.objects;
create policy "Admin update exam files" on storage.objects
  for update to authenticated
  using (bucket_id = 'exam-files' and public.is_admin())
  with check (bucket_id = 'exam-files' and public.is_admin());

drop policy if exists "Admin delete exam files" on storage.objects;
create policy "Admin delete exam files" on storage.objects
  for delete to authenticated
  using (bucket_id = 'exam-files' and public.is_admin());


-- ------------------------------------------------------------
-- ⑤ تحقق نهائي (يظهر في نتائج التشغيل)
-- ------------------------------------------------------------
select email as "البريد المسموح له بالكتابة" from public.admins order by email;

select policyname as "السياسة", cmd as "النوع", 'مقيّدة بالمدير' as "ملاحظة"
from pg_policies
where schemaname = 'public' and policyname like 'Admin%'
union all
select policyname, cmd, 'مقيّدة بالمدير'
from pg_policies
where schemaname = 'storage' and policyname like 'Admin%'
order by 1;
