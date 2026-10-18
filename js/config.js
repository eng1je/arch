// Supabase Configuration
// User provided Supabase credentials
const SUPABASE_URL = 'https://nrtcawiysqjpgnaazhzq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ydGNhd2l5c3FqcGduYWF6aHpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIzMTczNDEsImV4cCI6MjEwNzg5MzM0MX0.YCMg4hOQU9778e83kjBWeIHi_s0t_YxmdaguLhW-W7I';

// Initialize Supabase client
const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// Table and Storage names
const TABLE_DEPARTMENTS = 'departments';
const TABLE_SUBJECTS = 'subjects';
const TABLE_EXAMS = 'exams';
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

// Validate PDF file
function validatePDF(file) {
    if (!file) return { valid: false, error: 'لم يتم اختيار ملف' };
    
    const maxSize = 10 * 1024 * 1024; // 10 MB
    if (file.size > maxSize) {
        return { valid: false, error: 'حجم الملف كبير جداً. الحد الأقصى 10 ميجابايت' };
    }
    
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        return { valid: false, error: 'يجب أن يكون الملف بصيغة PDF فقط' };
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