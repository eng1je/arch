# أرشيف امتحانات كلية الهندسة – جامعة الجفرة

موقع إلكتروني احترافي جدًا لأرشفة امتحانات السنوات السابقة لكلية الهندسة بجامعة الجفرة. يتيح للطلاب استعراض الأقسام الدراسية والمواد التابعة لها، والبحث عن امتحانات السنوات السابقة، معاينتها وتحميلها بصيغة PDF بسهولة.

## المميزات

### واجهة الطلبة
- ✅ صفحة رئيسية احترافية بتصميم عصري وفخم
- ✅ عرض الأقسام الدراسية والمواد المرتبطة بها
- ✅ عرض امتحانات السنوات السابقة مرتبة حسب السنة والفصل الدراسي
- ✅ معاينة ملفات PDF داخل الموقع مباشرة
- ✅ تحميل ملفات PDF بسهولة
- ✅ بحث سريع للعثور على القسم أو المادة أو الامتحان
- ✅ تصميم متجاوب (Responsive) يعمل على الهواتف والحواسيب
- ✅ دعم كامل للغة العربية واتجاه RTL
- ✅ قسم للتواصل مع واتساب وفيسبوك لإضافة أسئلة الامتحانات
- ✅ إظهار عبارة "إعداد جهاد سالم أحمد" أسفل الصفحة

### لوحة تحكم الإدارة
- ✅ تسجيل دخول آمن للمدير
- ✅ إضافة وتعديل وحذف الأقسام الدراسية
- ✅ إضافة وتعديل وحذف المواد الدراسية وربطها بالأقسام
- ✅ رفع ملفات PDF وإضافة بيانات الامتحان (الاسم، السنة، الفصل الدراسي، الوصف)
- ✅ تعديل بيانات الامتحانات واستبدال الملفات
- ✅ عرض جميع البيانات في جداول منظمة مع البحث والفرز
- ✅ إحصائيات عامة (عدد الأقسام، المواد، الامتحانات، الملفات)
- ✅ رسائل نجاح وأخطاء واضحة
- ✅ تأكيد عملية الحذف قبل تنفيذها
- ✅ حماية كاملة من وصول الزوار إلى لوحة الإدارة
- ✅ تأمين الصلاحيات عبر Supabase RLS

## التقنيات المستخدمة

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend/Database**: [Supabase](https://supabase.com/) - PostgreSQL Database + Authentication + Storage
- **Font Icons**: [Font Awesome 6](https://fontawesome.com/)
- **Fonts**: [Cairo](https://fonts.google.com/specimen/Cairo) - خط عربي جميل

## متطلبات التشغيل

- متصفح ويب حديث (Chrome, Firefox, Edge, Safari)
- حساب على [Supabase](https://supabase.com/) لإنشاء المشروع وربطه

## خطوات الإعداد والتشغيل

### 1. استنساخ المشروع

```bash
git clone https://github.com/your-username/engineering-exams-archive-jufra.git
cd engineering-exams-archive-jufra
```

أو يمكنك تحميل المشروع كملف ZIP مباشرة.

### 2. إعداد مشروع Supabase

1. اذهب إلى [Supabase Dashboard](https://app.supabase.com/)
2. أنشئ مشروع جديد
3. انتظر حتى يتم إعداد المشروع

### 3. إعداد قاعدة البيانات (Tables)

في Supabase، افتح **SQL Editor** وأدخل الأوامر التالية:

```sql
-- إنشاء جدول الأقسام
CREATE TABLE departments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء جدول المواد
CREATE TABLE subjects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, department_id)
);

-- إنشاء جدول الامتحانات
CREATE TABLE exams (
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

-- تفعيل RLS
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;

-- سياسات RLS للزوار (المستخدمين غير المسجلين)
-- يمكنهم قراءة جميع البيانات
CREATE POLICY "Anyone can view departments" ON departments FOR SELECT USING (true);
CREATE POLICY "Anyone can view subjects" ON subjects FOR SELECT USING (true);
CREATE POLICY "Anyone can view exams" ON exams FOR SELECT USING (true);

-- سياسات RLS للمديرين (المسجلين)
-- يمكنهم إجراء جميع العمليات
CREATE POLICY "Authenticated users can insert departments" ON departments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update departments" ON departments FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete departments" ON departments FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert subjects" ON subjects FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update subjects" ON subjects FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete subjects" ON subjects FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert exams" ON exams FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update exams" ON exams FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete exams" ON exams FOR DELETE USING (auth.role() = 'authenticated');
```

### 4. إعداد Storage (تخزين ملفات PDF)

1. في Supabase، اذهب إلى **Storage**
2. أنشئ Bucket جديد باسم `exam-files`
3. اضبط الخصائص:
   - Public bucket: **مفعل** (لتمكين المعاينة والتحميل المباشر)
4. في تبويب **Policies**، أضف السياسات التالية لهذا Bucket:

**للقراءة العامة:**
```sql
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'exam-files');
```

**للإدارة (المسجلين فقط):**
```sql
CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'exam-files' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update" ON storage.objects FOR UPDATE USING (bucket_id = 'exam-files' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete" ON storage.objects FOR DELETE USING (bucket_id = 'exam-files' AND auth.role() = 'authenticated');
```

### 5. إعداد المصادقة (Authentication)

1. في Supabase، اذهب إلى **Authentication > Providers**
2. تأكد من تفعيل **Email/Password**
3. انشئ حساب المدير من خلال **Authentication > Users > Add user** أو سجل حساب في لوحة الإدارة

### 6. ربط المشروع بالمفتاح

المشروع يستخدم المفاتيح التي أرسلتها. تم إعداد ملف `js/config.js` بالفعل بالمفاتيح الصحيحة.

إذا كنت تريد تغييرها، افتح ملف `js/config.js` وعدل القيم التالية:

```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

**ملاحظات مهمة:**
- استخدم `anon key` في الواجهة الأمامية، ولا تستخدم `service_role key` أبداً في الكود العام
- `service_role key` خاص جداً ويجب الاحتفاظ به سرًا

### 7. تشغيل المشروع محلياً

يمكنك تشغيل المشروع باستخدام أي خادم محلي بسيط. الخيار الأسهل هو استخدام Live Server في VS Code، أو أمر Python:

#### باستخدام Python
```bash
# Python 3
python -m http.server 8000

# أو باستخدام Python 2
python -m SimpleHTTPServer 8000
```

ثم افتح المتصفح على: `http://localhost:8000`

#### باستخدام Node.js (http-server)
```bash
npx http-server -p 8000
```

#### باستخدام VS Code
1. افتح المشروع في VS Code
2. تثبيت إضافة [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)
3. انقر على "Go Live" في أسفل الشاشة

## النشر على GitHub Pages

هذا المشروع يتكون من ملفات ثابتة (HTML, CSS, JS) ويمكن نشره بسهولة على GitHub Pages.

1. أنشئ مستودع جديد على GitHub
2. رفع جميع ملفات المشروع إلى المستودع (باستثناء `.env`)
3. اذهب إلى **Settings > Pages** في المستودع
4. تحت **Source**، اختر **Deploy from a branch**
5. اختر الفرع `main` والمجلد `/ (root)`
6. اضغط **Save**
7. بعد بضع دقائق، سيكون الموقع متاحًا على `https://your-username.github.io/repo-name/`

**ملاحظات لنشر GitHub Pages:**
- جميع المفاتيح موجودة في ملف `js/config.js` وهو عام للمتصفح وهذا طبيعي عند استخدام `anon key` مع Supabase (يتم التحكم بالصلاحيات عبر RLS)
- تأكد من إعداد RLS وStorage Policies كما هو موضح أعلاه
- GitHub Pages يدعم HTTPS تلقائياً

## النشر على Vercel (مُوصى به أكثر)

[Vercel](https://vercel.com/) ممتاز جدًا لهذا النوع من المشاريع.

1. اذهب إلى [vercel.com](https://vercel.com/) وسجل الدخول
2. انقر **Add New Project** واربط مستودع GitHub الخاص بك
3. اختر المشروع واضغط **Deploy**
4. لا حاجة لإعدادات خاصة - سيكتشف تلقائياً أنه مشروع Static
5. بعد النشر، ستحصل على رابط مباشر مثل `https://your-project.vercel.app`

## استخدام لوحة الإدارة

1. افتح الموقع وانتقل إلى "لوحة الإدارة" في أعلى الصفحة
2. أدخل البريد الإلكتروني وكلمة المرور الخاصة بحساب المدير
3. من لوحة الإدارة يمكنك:
   - إضافة الأقسام الدراسية من تبويب "الأقسام الدراسية"
   - إضافة المواد وربطها بالأقسام من تبويب "المواد الدراسية"
   - رفع امتحانات PDF وإدخال بياناتها من تبويب "الامتحانات"

## الأمان

- 🔐 المصادقة عبر Supabase Auth
- 🛡️ Row Level Security (RLS) تحمي قاعدة البيانات
- 📁 Storage Policies تحمي ملفات PDF من التعديل غير المصرح به
- 🚫 منع الزوار من الوصول لعمليات الإضافة/التعديل/الحذف
- 🚫 تأكيد الحذف قبل تنفيذ أي عملية حذف
- 🔒 لا يتم تخزين أي مفاتيح سرية في الواجهة الأمامية
- ✅ التحقق من صحة المدخلات ونوع وحجم الملفات

## بيانات الاتصال الموضحة في الموقع

- **واتساب**: +218943769102
- **فيسبوك**: [رابط فيسبوك](https://www.facebook.com/share/1DotxjdLmk/?mibextid=wwXIfr)

## الإعداد

تم إعداد المشروع بالفعل مع بيانات Supabase المقدمة:
- URL: https://nrtcawiysqjpgnaazhzq.supabase.co
- Anon Key: مُدرج في ملف config.js

**مهم جداً:** بعد رفع المشروع على GitHub، تأكد من:
1. إنشاء حساب مدير في Supabase Authentication
2. تنفيذ أوامر SQL لقاعدة البيانات
3. إنشاء bucket التخزين وإعداد السياسات

## الدعم والتطوير

المشروع من إعداد: **جهاد سالم أحمد**

لأي استفسارات أو اقتراحات، يمكن التواصل عبر واتساب أو فيسبوك المذكورين أعلاه.

## الترخيص

هذا المشروع مخصص للاستخدام التعليمي والإداري لكلية الهندسة - جامعة الجفرة.
