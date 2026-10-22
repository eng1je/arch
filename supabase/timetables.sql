-- ============================================================================
--  جداول الدراسة (الجداول الدراسية) — يمكن للمدير إضافتها وتعديلها من لوحة الإدارة
--  نفّذ هذا الملف داخل: Supabase → SQL Editor → New query → Run
--  آمن للتشغيل أكثر من مرة.
-- ============================================================================

create table if not exists public.timetables (
    id           uuid primary key default gen_random_uuid(),
    department   text        not null,
    term         text        not null default 'فصل الخريف',
    year         text        not null default '2026 – 2027',
    slots        jsonb       not null default '[]'::jsonb,   -- ["9 – 11","11 – 1","1 – 3"]
    days         jsonb       not null default '[]'::jsonb,   -- [{"name":"السبت","courses":["","رياضيات 3"]}]
    is_new       boolean     not null default false,
    is_published boolean     not null default true,
    sort_order   integer     not null default 0,
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now()
);

create index if not exists timetables_published_idx
    on public.timetables (is_published, sort_order, created_at);

-- تحديث تاريخ التعديل تلقائياً
create or replace function public.set_timetables_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists trg_timetables_updated_at on public.timetables;
create trigger trg_timetables_updated_at
    before update on public.timetables
    for each row execute function public.set_timetables_updated_at();

-- ============================================================================
--  الأمان (RLS)
--  - الزائر يقرأ الجداول المنشورة فقط
--  - المدير (authenticated) يضيف/يعدّل/يحذف
-- ============================================================================

alter table public.timetables enable row level security;

drop policy if exists "timetables_public_read" on public.timetables;
create policy "timetables_public_read"
    on public.timetables
    for select
    to anon, authenticated
    using (is_published = true);

drop policy if exists "timetables_admin_write" on public.timetables;
create policy "timetables_admin_write"
    on public.timetables
    for all
    to authenticated
    using (true)
    with check (true);

-- ============================================================================
--  (اختياري) مثال لجدول — احذفه أو عدّله من لوحة الإدارة
-- ============================================================================
-- insert into public.timetables (department, term, year, slots, days, is_new, sort_order)
-- values (
--     'هندسة الحاسوب',
--     'فصل الخريف',
--     '2026 – 2027',
--     '["9 – 11","11 – 1","1 – 3"]'::jsonb,
--     '[
--        {"name":"السبت","courses":["","شبكات الحاسوب","رياضيات متقطعة"]},
--        {"name":"الأحد","courses":["برمجة 2","قواعد البيانات",""]}
--      ]'::jsonb,
--     true,
--     1
-- );
