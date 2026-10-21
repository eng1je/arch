-- ============================================================
--  جداول «المنهج والشيتات» — إضافة لمشروع أرشيف الامتحانات
--  شغّل هذا الملف مرة واحدة من: Supabase → SQL Editor
-- ============================================================

create table if not exists public.materials (
    id          uuid primary key default gen_random_uuid(),
    subject_id  uuid not null references public.subjects(id) on delete cascade,
    kind        text not null default 'syllabus'
                check (kind in ('syllabus', 'sheet', 'other')),
    title       text not null,
    file_url    text,
    file_path   text,
    file_name   text,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz
);

create index if not exists materials_subject_idx on public.materials (subject_id);
create index if not exists materials_created_idx on public.materials (created_at desc);

-- الحماية (RLS): الجميع يقرأ، المسجّل فقط يكتب
alter table public.materials enable row level security;

drop policy if exists "materials_public_read" on public.materials;
create policy "materials_public_read"
    on public.materials for select
    using (true);

drop policy if exists "materials_auth_write" on public.materials;
create policy "materials_auth_write"
    on public.materials for all
    to authenticated
    using (true)
    with check (true);

-- ملاحظة: ملفات المنهج/الشيتات تُرفع إلى نفس المخزن exam-files
-- داخل مجلد materials/ — لذلك لا حاجة لسياسات تخزين جديدة.
