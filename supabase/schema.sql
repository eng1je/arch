-- ============================================================
--  أرشيف امتحانات كلية الهندسة – جامعة الجفرة
--  ملف إعداد قاعدة البيانات وتخزين الملفات على Supabase
--  الطريقة: افتح Supabase > SQL Editor > New query
--           الصق هذا الملف بالكامل ثم اضغط Run
--  الملف آمن لتشغيله أكثر من مرة (Idempotent)
--
--  ⚠️ خطوة أمنية مهمة بعد التنفيذ:
--     شغّل الملف supabase/restrict-admin-write.sql حتى تصبح الكتابة
--     مقصورة على بريد المدير فقط. (بدونه: أي حساب يستطيع إنشاءه
--     أحدهم بنفسه يحصل على صلاحية التعديل والحذف!)
-- ============================================================

-- ------------------------------------------------------------
-- 1) الجداول
-- ------------------------------------------------------------

-- جدول الأقسام الدراسية
CREATE TABLE IF NOT EXISTS public.departments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- جدول المواد الدراسية
CREATE TABLE IF NOT EXISTS public.subjects (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT subjects_name_department_unique UNIQUE (name, department_id)
);

-- جدول الامتحانات
CREATE TABLE IF NOT EXISTS public.exams (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL,
  subject_id  UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  year        INTEGER NOT NULL CHECK (year >= 1990 AND year <= 2030),
  semester    VARCHAR(50) NOT NULL CHECK (semester IN ('الاول', 'الثاني', 'الصيفي', 'كليهما')),
  description TEXT,
  file_url    TEXT NOT NULL,
  file_path   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- فهارس لتسريع الاستعلام
CREATE INDEX IF NOT EXISTS idx_subjects_department ON public.subjects(department_id);
CREATE INDEX IF NOT EXISTS idx_exams_subject       ON public.exams(subject_id);
CREATE INDEX IF NOT EXISTS idx_exams_year          ON public.exams(year DESC);

-- ------------------------------------------------------------
-- 2) تحديث updated_at تلقائياً
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_departments_updated_at ON public.departments;
CREATE TRIGGER trg_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_subjects_updated_at ON public.subjects;
CREATE TRIGGER trg_subjects_updated_at
  BEFORE UPDATE ON public.subjects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_exams_updated_at ON public.exams;
CREATE TRIGGER trg_exams_updated_at
  BEFORE UPDATE ON public.exams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------
-- 3) تفعيل الحماية Row Level Security
-- ------------------------------------------------------------
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams       ENABLE ROW LEVEL SECURITY;

-- قراءة عامة للزوار (بدون تسجيل دخول)
DROP POLICY IF EXISTS "Public read departments" ON public.departments;
CREATE POLICY "Public read departments" ON public.departments
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public read subjects" ON public.subjects;
CREATE POLICY "Public read subjects" ON public.subjects
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public read exams" ON public.exams;
CREATE POLICY "Public read exams" ON public.exams
  FOR SELECT TO public USING (true);

-- الكتابة/التعديل/الحذف للمدير المسجل فقط
DROP POLICY IF EXISTS "Admin write departments" ON public.departments;
CREATE POLICY "Admin write departments" ON public.departments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admin write subjects" ON public.subjects;
CREATE POLICY "Admin write subjects" ON public.subjects
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admin write exams" ON public.exams;
CREATE POLICY "Admin write exams" ON public.exams
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ------------------------------------------------------------
-- 4) سلة تخزين ملفات PDF
--    (أنشئ السلة من Storage > New bucket باسم exam-files واجعله Public)
--    الحد الأقصى لحجم الملف: 50 ميجابايت (أقصى ما تسمح به الخطة المجانية)
--    إن أردت تغييره، عدّل الرقم في السطور أدناه وفي js/config.js (MAX_FILE_SIZE_MB)
-- ------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('exam-files', 'exam-files', true, 52428800, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE
  SET public = true,
      file_size_limit = 52428800,
      allowed_mime_types = ARRAY['application/pdf'];

-- سياسات التخزين: قراءة عامة + إدارة للمدير فقط
DROP POLICY IF EXISTS "Public read exam files" ON storage.objects;
CREATE POLICY "Public read exam files" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'exam-files');

DROP POLICY IF EXISTS "Admin insert exam files" ON storage.objects;
CREATE POLICY "Admin insert exam files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'exam-files');

DROP POLICY IF EXISTS "Admin update exam files" ON storage.objects;
CREATE POLICY "Admin update exam files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'exam-files')
  WITH CHECK (bucket_id = 'exam-files');

DROP POLICY IF EXISTS "Admin delete exam files" ON storage.objects;
CREATE POLICY "Admin delete exam files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'exam-files');

-- ------------------------------------------------------------
-- 5) بيانات تجريبية (اختيارية)
--    افتح تعليق الأسطر التالية إذا أردت أقساماً جاهزة للتجربة
-- ------------------------------------------------------------
-- INSERT INTO public.departments (name) VALUES
--   ('هندسة النفط'), ('الهندسة المدنية'), ('الهندسة الكهربائية'),
--   ('الهندسة الميكانيكية'), ('الهندسة الكيميائية')
-- ON CONFLICT (name) DO NOTHING;

-- ============================================================
--  انتهى الإعداد بنجاح
-- ============================================================
