# دليل إعداد Supabase خطوة بخطوة

هذا الدليل يوضح كيفية إعداد قاعدة البيانات والتخزين والمصادقة في Supabase للمشروع.

## 1. إنشاء مشروع Supabase

1. اذهب إلى [https://app.supabase.com/](https://app.supabase.com/)
2. سجل الدخول أو أنشئ حساب جديد
3. انقر على "New Project"
4. اختر منظمة (Organization)
5. املأ البيانات:
   - Name: `engineering-exams-archive`
   - Database Password: أنشئ كلمة مرور قوية (احفظها)
   - Region: اختر أقرب منطقة لك
6. انقر على "Create New Project"
7. انتظر عدة دقائق حتى يكتمل الإعداد

## 2. الحصول على المفاتيح

1. من Dashboard المشروع، اذهب إلى `Settings > API`
2. ستجد:
   - `Project URL` - سنستخدمه في config.js
   - `anon public` key - مفتاح عام للاستخدام في الواجهة الأمامية
   - `service_role secret` key - حساس جداً (لا نستخدمه في الواجهة الأمامية)

المفاتيح المستخدمة حالياً موجودة في ملف `js/config.js`. يمكنك تحديثها إذا كنت تريد استخدام مشروعك الخاص.

## 3. إعداد قاعدة البيانات (SQL)

1. من Dashboard، اذهب إلى `SQL Editor > New query`
2. انسخ الكود SQL التالي بالكامل
3. انقر على "Run" لتشغيله

```sql
-- إنشاء جدول الأقسام
CREATE TABLE IF NOT EXISTS departments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء جدول المواد
CREATE TABLE IF NOT EXISTS subjects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, department_id)
);

-- إنشاء جدول الامتحانات
CREATE TABLE IF NOT EXISTS exams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  year INTEGER NOT NULL CHECK (year >= 1990 AND year <= 2030),
  semester VARCHAR(50) NOT NULL CHECK (semester IN ('الاول', 'الثاني', 'الصيفي', 'كليهما')),
  description TEXT,
  file_url TEXT NOT NULL,
  file_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- تفعيل RLS (Row Level Security)
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;

-- سياسات قراءة عامة (للزوار)
DROP POLICY IF EXISTS "Anyone can view departments" ON departments;
CREATE POLICY "Anyone can view departments" ON departments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can view subjects" ON subjects;
CREATE POLICY "Anyone can view subjects" ON subjects FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can view exams" ON exams;
CREATE POLICY "Anyone can view exams" ON exams FOR SELECT USING (true);

-- سياسات الكتابة/التعديل/الحذف للمستخدمين المسجلين (المدير فقط)
DROP POLICY IF EXISTS "Authenticated users can insert departments" ON departments;
CREATE POLICY "Authenticated users can insert departments" ON departments FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update departments" ON departments;
CREATE POLICY "Authenticated users can update departments" ON departments FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete departments" ON departments;
CREATE POLICY "Authenticated users can delete departments" ON departments FOR DELETE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can insert subjects" ON subjects;
CREATE POLICY "Authenticated users can insert subjects" ON subjects FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update subjects" ON subjects;
CREATE POLICY "Authenticated users can update subjects" ON subjects FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete subjects" ON subjects;
CREATE POLICY "Authenticated users can delete subjects" ON subjects FOR DELETE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can insert exams" ON exams;
CREATE POLICY "Authenticated users can insert exams" ON exams FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can update exams" ON exams;
CREATE POLICY "Authenticated users can update exams" ON exams FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated users can delete exams" ON exams;
CREATE POLICY "Authenticated users can delete exams" ON exams FOR DELETE USING (auth.role() = 'authenticated');

-- إنشاء Triggers لتحديث updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_departments_updated_at ON departments;
CREATE TRIGGER update_departments_updated_at
BEFORE UPDATE ON departments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subjects_updated_at ON subjects;
CREATE TRIGGER update_subjects_updated_at
BEFORE UPDATE ON subjects
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_exams_updated_at ON exams;
CREATE TRIGGER update_exams_updated_at
BEFORE UPDATE ON exams
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

## 4. إعداد Storage (ملفات PDF)

1. من Dashboard، اذهب إلى `Storage`
2. انقر على "New bucket"
3. املأ:
   - Name: `exam-files`
   - Make public: ✅ ضع علامة (مهم لعرض وتحميل الملفات)
4. انقر على "Create bucket"

### إعداد سياسات Storage

1. في Bucket `exam-files`، اذهب إلى تبويب `Policies`
2. انقر على "New policy" > "Create from scratch"

**سياسة 1: قراءة عامة (Public Access)**
- Policy name: `Public Access`
- Allowed operation: `SELECT`
- Target roles: `public`
- Expression: `bucket_id = 'exam-files'`
- انقر "Save"

**سياسة 2: رفع الملفات للمسجلين**
- Policy name: `Authenticated users can upload`
- Allowed operation: `INSERT`
- Target roles: `authenticated`
- Expression: `bucket_id = 'exam-files'`
- انقر "Save"

**سياسة 3: تحديث الملفات للمسجلين**
- Policy name: `Authenticated users can update`
- Allowed operation: `UPDATE`
- Target roles: `authenticated`
- Expression: `bucket_id = 'exam-files'`
- انقر "Save"

**سياسة 4: حذف الملفات للمسجلين**
- Policy name: `Authenticated users can delete`
- Allowed operation: `DELETE`
- Target roles: `authenticated`
- Expression: `bucket_id = 'exam-files'`
- انقر "Save"

## 5. إعداد المصادقة (Authentication)

1. من Dashboard، اذهب إلى `Authentication > Providers`
2. ابحث عن `Email` وقم بتفعيل `Email Provider` (مفعل افتراضياً)
3. يمكنك ترك الإعدادات الافتراضية

### إنشاء حساب المدير

هناك طريقتين لإنشاء حساب المدير:

**الطريقة 1: من لوحة الإدارة (تسجيل حساب)**
1. افتح الموقع `admin.html`
2. يمكنك التسجيل بحساب جديد (إذا تم السماح بالتسجيل - الإعدادات الافتراضية تسمح)
3. لكن يفضل الطريقة 2 للحماية

**الطريقة 2: من Supabase Dashboard (مُوصى به)**
1. اذهب إلى `Authentication > Users`
2. انقر على "Add user" > "Create new user"
3. أدخل:
   - Email: البريد الإلكتروني للمدير
   - Password: كلمة المرور
4. انقر "Create user"

الآن يمكن استخدام هذا الحساب لتسجيل الدخول إلى لوحة الإدارة.

## 6. اختبار الإعداد

1. افتح `index.html` في المتصفح
2. تحقق من ظهور الأقسام (ستكون فارغة في البداية)
3. افتح `admin.html` وسجل الدخول بالحساب المدخل
4. جرب إضافة قسم ثم مادة ثم امتحان مع رفع ملف PDF
5. تحقق من ظهور البيانات في الواجهة الأمامية
6. جرب معاينة وتحميل ملف PDF
7. جرب البحث

## 7. حل المشاكل الشائعة

### الملفات لا تُرفع
- تحقق من أن Bucket `exam-files` عام (Public)
- تحقق من Storage Policies (INSERT للمسجلين)
- تحقق من حجم الملف (يجب أن يكون أقل من 10 ميجابايت)
- تأكد من أن الملف بصيغة PDF

### لا يمكن الدخول للوحة الإدارة
- تأكد من بيانات البريد/كلمة المرور صحيحة
- تحقق من أن Email Provider مفعل في Authentication

### البيانات لا تظهر
- تحقق من RLS Policies (SELECT عام)
- تحقق من اتصال Supabase في `js/config.js`

### أخطاء CORS
- Supabase يدعم CORS تلقائياً للتشغيل المحلي والنشر

## ملاحظات مهمة

- **anon key** آمن للاستخدام في الواجهة الأمامية طالما تم إعداد RLS بشكل صحيح
- **service_role key** يجب ألا يظهر أبداً في الكود الأمامي أو في مستودع عام
- ملفات PDF تُخزن في Storage وسعر URL عام لها
- عند حذف امتحان، يتم حذف ملف PDF المرتبط به تلقائياً من Storage

مبروك! تم إعداد المشروع بنجاح ✅
