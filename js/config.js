// Supabase Configuration
// User provided Supabase credentials
const SUPABASE_URL = 'https://nrtcawiysqjpgnaazhzq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ydGNhd2l5c3FqcGduYWF6aHpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzMTczNDEsImV4cCI6MjEwNzg5MzM0MX0.YCMg4hOQU9778e83kjBWeIHi_s0t_YxmdaguLhW-W7I';

// Initialize Supabase client.
// NOTE: the CDN library already declares a global named `supabase`,
// so our client is stored in `db` to avoid a name clash.
const db = (typeof window !== 'undefined' && window.supabase && typeof window.supabase.createClient === 'function')
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

// Expose for debugging from the browser console (optional)
window.db = db;

// Table and Storage names
const TABLE_DEPARTMENTS = 'departments';
const TABLE_SUBJECTS = 'subjects';
const TABLE_EXAMS = 'exams';
const TABLE_MATERIALS = 'materials';
const STORAGE_BUCKET = 'exam-files';

// Toast utility
function showToast(message, type = 'success', duration = 3000) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.className = 'toast';
    if (type === 'error') toast.classList.add('error');
    if (type === 'warning') toast.classList.add('warning');
    if (type === 'info') toast.classList.add('info');
    
    toast.style.display = 'block';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, duration);
}

// Format date
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Format file size
function formatFileSize(bytes) {
    if (!bytes) return '0 KB';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ===== الحد الأقصى لحجم ملف الامتحان =====
// ملاحظة مهمة: يجب أن يكون هذا الرقم مطابقاً لحدّ سلة التخزين في Supabase
// (Storage > exam-files > File size limit) وإلا سيرفض الخادم الملف.
// الأقصى المسموح به في خطة Supabase المجانية هو 50 ميجابايت.
const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;

// Validate PDF file
function validatePDF(file) {
    if (!file) return { valid: false, error: 'لم يتم اختيار ملف' };

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        return { valid: false, error: 'يجب أن يكون الملف بصيغة PDF فقط' };
    }

    if (file.size > MAX_FILE_SIZE) {
        return {
            valid: false,
            error: `حجم الملف كبير جداً (${formatFileSize(file.size)}). الحد الأقصى ${MAX_FILE_SIZE_MB} ميجابايت`
        };
    }

    return { valid: true };
}

// Check if URL is valid
function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch (e) {
        return false;
    }
}

// Translate Supabase auth errors into simple Arabic messages
function translateAuthError(error) {
    const raw = (error && (error.message || error.error_description || error.msg)) || '';
    const lower = String(raw).toLowerCase();

    if (lower.includes('invalid login credentials')) {
        return 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
    }
    if (lower.includes('email not confirmed')) {
        return 'البريد الإلكتروني غير مُفعّل. يرجى تأكيده أولاً';
    }
    if (lower.includes('user already registered')) {
        return 'هذا البريد الإلكتروني مسجل مسبقاً';
    }
    if (lower.includes('password should be at least')) {
        return 'كلمة المرور قصيرة جداً (6 أحرف على الأقل)';
    }
    if (lower.includes('unable to validate email') || lower.includes('invalid email')) {
        return 'صيغة البريد الإلكتروني غير صحيحة';
    }
    if (lower.includes('rate limit') || lower.includes('too many')) {
        return 'محاولات كثيرة، يرجى المحاولة بعد قليل';
    }
    if (lower.includes('failed to fetch') || lower.includes('network')) {
        return 'تعذّر الاتصال بالخادم. تحقق من الإنترنت';
    }
    return raw || 'حدث خطأ غير متوقع';
}

// Translate database / storage errors into clear Arabic messages
function translateDbError(error) {
    if (!error) return 'حدث خطأ غير متوقع';
    const code = error.code || '';
    const raw = error.message || String(error);
    const lower = raw.toLowerCase();

    if (code === 'PGRST205' || lower.includes('could not find the table')) {
        return 'جداول قاعدة البيانات غير موجودة. يرجى تنفيذ ملف supabase/schema.sql في Supabase';
    }
    if (code === '23505' || lower.includes('duplicate key')) {
        return 'يوجد عنصر بنفس الاسم مسبقاً';
    }
    if (code === '23503' || lower.includes('foreign key')) {
        return 'لا يمكن تنفيذ العملية لوجود بيانات مرتبطة';
    }
    if (code === '23514' || lower.includes('check constraint')) {
        return 'القيمة المدخلة غير مسموحة (تحقق من السنة والفصل الدراسي)';
    }
    if (lower.includes('bucket not found')) {
        return 'سلة التخزين غير موجودة. يرجى إنشاء سلة باسم exam-files';
    }
    if (lower.includes('row-level security') || code === '42501') {
        return 'غير مصرح لك بهذه العملية. تأكد من تسجيل دخول المدير';
    }
    if (lower.includes('payload too large') || lower.includes('exceeded the maximum') || lower.includes('entity too large')) {
        return `حجم الملف يتجاوز الحد المسموح في التخزين (${MAX_FILE_SIZE_MB} ميجابايت)`;
    }
    if (lower.includes('mime type') || lower.includes('invalid mime')) {
        return 'نوع الملف غير مسموح. يجب أن يكون PDF';
    }
    if (lower.includes('failed to fetch') || lower.includes('network')) {
        return 'تعذّر الاتصال بالخادم. تحقق من الإنترنت';
    }
    return raw;
}