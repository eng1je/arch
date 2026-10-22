// Admin Panel JavaScript
let currentUser = null;
let departments = [];
let subjects = [];
let exams = [];
let deleteCallback = null;

// Tab management
const tabs = document.querySelectorAll('.nav-item');
const tabContents = document.querySelectorAll('.tab-content');

tabs.forEach(tab => {
    tab.addEventListener('click', function() {
        const tabName = this.dataset.tab;
        
        // Update active tab
        tabs.forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        
        // Update active content
        tabContents.forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}Tab`).classList.add('active');
        
        // Update page title
        const pageTitle = document.getElementById('pageTitle');
        switch(tabName) {
            case 'dashboard':
                pageTitle.textContent = 'لوحة التحكم - الإحصائيات';
                break;
            case 'departments':
                pageTitle.textContent = 'إدارة الأقسام الدراسية';
                break;
            case 'subjects':
                pageTitle.textContent = 'إدارة المواد الدراسية';
                break;
            case 'exams':
                pageTitle.textContent = 'إدارة الامتحانات';
                break;
            case 'materials':
                pageTitle.textContent = 'إدارة المنهج والشيتات';
                break;
            case 'timetables':
                pageTitle.textContent = 'إدارة الجداول الدراسية';
                break;
            case 'activity':
                pageTitle.textContent = 'سجل النشاط';
                break;
            case 'backup':
                pageTitle.textContent = 'النسخ الاحتياطي والتصدير';
                break;
        }

        // Close the mobile sidebar after choosing a section
        const sidebar = document.getElementById('sidebar');
        if (sidebar) sidebar.classList.remove('open');
        const sidebarToggle = document.getElementById('sidebarToggle');
        if (sidebarToggle) sidebarToggle.setAttribute('aria-expanded', 'false');

        if (tabName === 'activity') renderActivityTable();
        if (tabName === 'materials') loadMaterialsAdmin();
        if (tabName === 'timetables') loadTimetablesAdmin();
        if (tabName === 'backup') renderBackupSummary();
    });
});

document.addEventListener('DOMContentLoaded', function() {
    initializeAdmin();
});

async function initializeAdmin() {
    if (!db) {
        showToast('خطأ في إعدادات Supabase. يرجى التحقق من ملف config.js', 'error');
        return;
    }
    
    setupEventListenersAdmin();
    loadActivityLog();
    setupAdminExtras();
    db.auth.onAuthStateChange(function (event) {
        if (event === 'SIGNED_OUT') {
            currentUser = null;
            showLoginForm();
        }
    });
    await checkAuth();
}

// Check authentication
async function checkAuth() {
    try {
        const { data: { session }, error } = await db.auth.getSession();
        if (error) throw error;
        
        if (session) {
            currentUser = session.user;
            showAdminDashboard();
            await loadAllData();
        } else {
            showLoginForm();
        }
    } catch (error) {
        console.error('Auth check error:', error);
        showLoginForm();
    }
}

// Show login form
function showLoginForm() {
    document.getElementById('loginSection').style.display = 'flex';
    document.getElementById('adminSection').style.display = 'none';
}

// Show admin dashboard
function showAdminDashboard() {
    document.getElementById('loginSection').style.display = 'none';
    document.getElementById('adminSection').style.display = 'flex';
    document.getElementById('userEmail').textContent = currentUser?.email || '';
}

// Setup event listeners
function setupEventListenersAdmin() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Department buttons
    const addDeptBtn = document.getElementById('addDeptBtn');
    if (addDeptBtn) {
        addDeptBtn.addEventListener('click', function() {
            showDeptModal('add');
        });
    }
    const deptModalClose = document.getElementById('deptModalClose');
    const deptCancelBtn = document.getElementById('deptCancelBtn');
    if (deptModalClose) deptModalClose.addEventListener('click', closeDeptModal);
    if (deptCancelBtn) deptCancelBtn.addEventListener('click', closeDeptModal);
    
    const deptForm = document.getElementById('deptForm');
    if (deptForm) {
        deptForm.addEventListener('submit', handleDeptSubmit);
    }
    
    // Subject buttons
    const addSubjBtn = document.getElementById('addSubjBtn');
    if (addSubjBtn) {
        addSubjBtn.addEventListener('click', function() {
            showSubjModal('add');
        });
    }
    const subjModalClose = document.getElementById('subjModalClose');
    const subjCancelBtn = document.getElementById('subjCancelBtn');
    if (subjModalClose) subjModalClose.addEventListener('click', closeSubjModal);
    if (subjCancelBtn) subjCancelBtn.addEventListener('click', closeSubjModal);
    
    const subjForm = document.getElementById('subjForm');
    if (subjForm) {
        subjForm.addEventListener('submit', handleSubjSubmit);
    }
    
    const deptFilter = document.getElementById('deptFilter');
    if (deptFilter) {
        deptFilter.addEventListener('change', filterSubjects);
    }
    const subjSearch = document.getElementById('subjSearch');
    if (subjSearch) {
        subjSearch.addEventListener('input', filterSubjects);
    }
    
    // Exam buttons
    const addExamBtn = document.getElementById('addExamBtn');
    if (addExamBtn) {
        addExamBtn.addEventListener('click', function() {
            showExamModal('add');
        });
    }
    const examModalClose = document.getElementById('examModalClose');
    const examCancelBtn = document.getElementById('examCancelBtn');
    if (examModalClose) examModalClose.addEventListener('click', closeExamModal);
    if (examCancelBtn) examCancelBtn.addEventListener('click', closeExamModal);
    
    const examForm = document.getElementById('examForm');
    if (examForm) {
        examForm.addEventListener('submit', handleExamSubmit);
    }
    
    const examDept = document.getElementById('examDept');
    const examSubj = document.getElementById('examSubj');
    if (examDept) {
        examDept.addEventListener('change', populateExamSubjects);
    }
    
    const examDeptFilter = document.getElementById('examDeptFilter');
    const examSubjFilter = document.getElementById('examSubjFilter');
    const examSearch = document.getElementById('examSearch');
    if (examDeptFilter) examDeptFilter.addEventListener('change', filterExams);
    if (examSubjFilter) examSubjFilter.addEventListener('change', filterExams);
    if (examSearch) examSearch.addEventListener('input', filterExams);
    
    // Delete modal
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const deleteModalClose = document.getElementById('deleteModalClose');
    const deleteModal = document.getElementById('deleteModal');
    if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', closeDeleteModal);
    if (confirmDeleteBtn) confirmDeleteBtn.addEventListener('click', confirmDelete);
    if (deleteModalClose) deleteModalClose.addEventListener('click', closeDeleteModal);
    if (deleteModal) {
        deleteModal.addEventListener('click', function(e) {
            if (e.target === deleteModal) closeDeleteModal();
        });
    }

    // PDF preview modal
    const pdfModalClose = document.getElementById('pdfModalClose');
    const pdfModalCloseBtn = document.getElementById('pdfModalCloseBtn');
    const pdfModal = document.getElementById('pdfModal');
    if (pdfModalClose) pdfModalClose.addEventListener('click', closePDFModal);
    if (pdfModalCloseBtn) pdfModalCloseBtn.addEventListener('click', closePDFModal);
    if (pdfModal) {
        pdfModal.addEventListener('click', function(e) {
            if (e.target === pdfModal) closePDFModal();
        });
    }
}

// Preview PDF inside admin panel
function previewPDF(fileUrl, examName) {
    const modal = document.getElementById('pdfModal');
    const iframe = document.getElementById('pdfViewer');
    const title = document.getElementById('pdfModalTitle');
    const downloadBtn = document.getElementById('pdfDownloadBtn');

    if (!fileUrl || !isValidUrl(fileUrl)) {
        showToast('رابط الملف غير صالح', 'error');
        return;
    }

    if (modal && iframe && title && downloadBtn) {
        title.textContent = `معاينة: ${examName}`;
        iframe.src = fileUrl + '#view=FitH';
        downloadBtn.href = fileUrl;
        downloadBtn.download = `${String(examName).replace(/[^a-z0-9\u0600-\u06FF]/gi, '_')}.pdf`;
        modal.style.display = 'flex';
    }
}

// Close PDF preview modal
function closePDFModal() {
    const modal = document.getElementById('pdfModal');
    const iframe = document.getElementById('pdfViewer');
    if (modal) modal.style.display = 'none';
    if (iframe) iframe.src = '';
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const loginBtn = document.getElementById('loginBtn');
    
    if (!email || !password) {
        showToast('يرجى إدخال البريد الإلكتروني وكلمة المرور', 'warning');
        return;
    }
    
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<div class="spinner" style="width: 20px; height: 20px; margin: 0 10px;"></div> جاري تسجيل الدخول...';
    
    try {
        const { data, error } = await db.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
        currentUser = data.user;
        showToast('تم تسجيل الدخول بنجاح', 'success');
        logActivity('دخول', 'حساب', email);
        showAdminDashboard();
        await loadAllData();
        e.target.reset();
    } catch (error) {
        console.error('Login error:', error);
        showToast(translateAuthError(error), 'error');
    } finally {
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> تسجيل الدخول';
    }
}

// Handle logout
async function handleLogout() {
    try {
        const { error } = await db.auth.signOut();
        if (error) throw error;
        logActivity('خروج', 'حساب', currentUser?.email || '');
        currentUser = null;
        showToast('تم تسجيل الخروج بنجاح', 'success');
        showLoginForm();
    } catch (error) {
        console.error('Logout error:', error);
        showToast('تعذّر تسجيل الخروج — ' + translateAuthError(error), 'error');
    }
}

// Load all data (sequential so the dependent dropdowns are filled in order)
async function loadAllData() {
    await loadDepartmentsAdmin();
    await loadSubjectsAdmin();
    await loadExamsAdmin();
    updateStats();
}

// Update statistics
function updateStats() {
    document.getElementById('statDepartments').textContent = departments.length;
    document.getElementById('statSubjects').textContent = subjects.length;
    document.getElementById('statExams').textContent = exams.length;
    document.getElementById('statFiles').textContent = exams.filter(e => e.file_url).length;
}

// Departments
async function loadDepartmentsAdmin() {
    try {
        const { data, error } = await db
            .from(TABLE_DEPARTMENTS)
            .select('*, subjects(count)')
            .order('created_at', { ascending: true });
        
        if (error) throw error;
        departments = data || [];
        renderDepartmentsTable();
        populateDeptSelects();
    } catch (error) {
        console.error('Error loading departments:', error);
        showToast('تعذّر تحميل الأقسام — ' + translateDbError(error), 'error');
    }
}

function renderDepartmentsTable() {
    const tbody = document.getElementById('departmentsTableBody');
    const empty = document.getElementById('deptTableEmpty');
    
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (departments.length === 0) {
        empty.style.display = 'block';
        return;
    }
    
    empty.style.display = 'none';
    
    departments.forEach((dept, index) => {
        const subjectsCount = dept.subjects?.[0]?.count || 0;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${escapeHtml(dept.name)}</strong></td>
            <td>${subjectsCount}</td>
            <td>${formatDate(dept.created_at)}</td>
            <td>
                <div class="table-actions">
                    <button class="btn btn-sm btn-edit" onclick="editDepartment('${dept.id}')">
                        <i class="fas fa-edit"></i> تعديل
                    </button>
                    <button class="btn btn-sm btn-delete" onclick="deleteDepartment('${dept.id}', '${escapeJs(dept.name)}')">
                        <i class="fas fa-trash"></i> حذف
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function populateDeptSelects() {
    const selects = [
        document.getElementById('subjDept'),
        document.getElementById('examDept'),
        document.getElementById('deptFilter'),
        document.getElementById('examDeptFilter')
    ];
    
    selects.forEach(select => {
        if (!select) return;
        const currentValue = select.value;
        // Keep first option
        const firstOption = select.options[0];
        select.innerHTML = '';
        if (firstOption) {
            select.appendChild(firstOption.cloneNode(true));
        }
        departments.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept.id;
            option.textContent = dept.name;
            select.appendChild(option);
        });
        if (currentValue && select.querySelector(`option[value="${currentValue}"]`)) {
            select.value = currentValue;
        }
    });
}

function showDeptModal(mode, dept = null) {
    const modal = document.getElementById('deptModal');
    const title = document.getElementById('deptModalTitle');
    const form = document.getElementById('deptForm');
    const deptId = document.getElementById('deptId');
    const deptName = document.getElementById('deptName');
    
    if (mode === 'add') {
        title.textContent = 'إضافة قسم جديد';
        deptId.value = '';
        form.reset();
    } else {
        title.textContent = 'تعديل القسم';
        deptId.value = dept.id;
        deptName.value = dept.name;
    }
    
    modal.style.display = 'flex';
    deptName.focus();
}

function closeDeptModal() {
    document.getElementById('deptModal').style.display = 'none';
}

async function handleDeptSubmit(e) {
    e.preventDefault();
    
    const deptId = document.getElementById('deptId').value;
    const deptName = document.getElementById('deptName').value.trim();
    const saveBtn = document.getElementById('deptSaveBtn');
    
    if (!deptName) {
        showToast('يرجى إدخال اسم القسم', 'warning');
        return;
    }
    
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<div class="spinner" style="width: 16px; height: 16px; margin: 0 5px;"></div> جاري الحفظ...';
    
    try {
        if (deptId) {
            // Update
            const { error } = await db
                .from(TABLE_DEPARTMENTS)
                .update({ name: deptName, updated_at: new Date().toISOString() })
                .eq('id', deptId);
            if (error) throw error;
            showToast('تم تحديث القسم بنجاح', 'success');
        } else {
            // Insert
            const { error } = await db
                .from(TABLE_DEPARTMENTS)
                .insert([{ name: deptName }]);
            if (error) throw error;
            showToast('تم إضافة القسم بنجاح', 'success');
        }
        logActivity(deptId ? 'تعديل' : 'إضافة', 'قسم', deptName);
        closeDeptModal();
        await loadDepartmentsAdmin();
        await loadSubjectsAdmin();
        updateStats();
    } catch (error) {
        console.error('Dept save error:', error);
        showToast('تعذّر حفظ القسم — ' + translateDbError(error), 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save"></i> حفظ';
    }
}

function editDepartment(id) {
    const dept = departments.find(d => d.id === id);
    if (dept) {
        showDeptModal('edit', dept);
    }
}

function deleteDepartment(id, name) {
    showDeleteModal(`هل أنت متأكد من حذف القسم "${name}"؟<br>سيتم حذف جميع المواد والامتحانات المرتبطة به أيضاً. لا يمكن التراجع عن هذه العملية.`, async function() {
        try {
            // Remove the PDF files of every exam inside this department (best effort)
            const { data: related } = await db
                .from(TABLE_EXAMS)
                .select('file_path, subjects!inner(department_id)')
                .eq('subjects.department_id', id);
            await removeStorageFiles((related || []).map(e => e.file_path));

            const { error } = await db
                .from(TABLE_DEPARTMENTS)
                .delete()
                .eq('id', id);
            if (error) throw error;
            showToast('تم حذف القسم بنجاح', 'success');
            logActivity('حذف', 'قسم', name);
            await loadAllData();
        } catch (error) {
            console.error('Delete dept error:', error);
            showToast('تعذّر حذف القسم — ' + translateDbError(error), 'error');
        }
    });
}

// Remove files from storage (ignores missing paths and errors)
async function removeStorageFiles(paths) {
    const list = (paths || []).filter(Boolean);
    if (list.length === 0) return;
    try {
        await db.storage.from(STORAGE_BUCKET).remove(list);
    } catch (e) {
        console.error('Storage cleanup error:', e);
    }
}

// Subjects
async function loadSubjectsAdmin() {
    try {
        const { data, error } = await db
            .from(TABLE_SUBJECTS)
            .select('*, departments(id, name), exams(count)')
            .order('created_at', { ascending: true });
        
        if (error) throw error;
        subjects = data || [];
        renderSubjectsTable();
        populateSubjectSelects();
        filterSubjects();
    } catch (error) {
        console.error('Error loading subjects:', error);
        showToast('تعذّر تحميل المواد — ' + translateDbError(error), 'error');
    }
}

function renderSubjectsTable(filteredSubjects = subjects) {
    const tbody = document.getElementById('subjectsTableBody');
    const empty = document.getElementById('subjTableEmpty');
    
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (filteredSubjects.length === 0) {
        empty.style.display = 'block';
        return;
    }
    
    empty.style.display = 'none';
    
    filteredSubjects.forEach((subj, index) => {
        const examsCount = subj.exams?.[0]?.count || 0;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${escapeHtml(subj.name)}</strong></td>
            <td>${escapeHtml(subj.departments?.name || '-')}</td>
            <td>${examsCount}</td>
            <td>${formatDate(subj.created_at)}</td>
            <td>
                <div class="table-actions">
                    <button class="btn btn-sm btn-edit" onclick="editSubject('${subj.id}')">
                        <i class="fas fa-edit"></i> تعديل
                    </button>
                    <button class="btn btn-sm btn-delete" onclick="deleteSubject('${subj.id}', '${escapeJs(subj.name)}')">
                        <i class="fas fa-trash"></i> حذف
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function filterSubjects() {
    const deptFilter = document.getElementById('deptFilter')?.value || 'all';
    const search = document.getElementById('subjSearch')?.value.trim().toLowerCase() || '';
    
    let filtered = [...subjects];
    
    if (deptFilter !== 'all') {
        filtered = filtered.filter(s => s.department_id === deptFilter);
    }
    
    if (search) {
        filtered = filtered.filter(s => s.name.toLowerCase().includes(search));
    }
    
    renderSubjectsTable(filtered);
}

function populateSubjectSelects() {
    const examSubj = document.getElementById('examSubj');
    const examSubjFilter = document.getElementById('examSubjFilter');
    
    [examSubj, examSubjFilter].forEach(select => {
        if (!select) return;
        const currentValue = select.value;
        const firstOption = select.options[0];
        select.innerHTML = '';
        if (firstOption) {
            select.appendChild(firstOption.cloneNode(true));
        }
        subjects.forEach(subj => {
            const option = document.createElement('option');
            option.value = subj.id;
            option.textContent = subj.name;
            if (subj.departments?.name) {
                option.textContent = `${subj.name} (${subj.departments.name})`;
            }
            select.appendChild(option);
        });
        if (currentValue && select.querySelector(`option[value="${currentValue}"]`)) {
            select.value = currentValue;
        }
    });
}

function populateExamSubjects() {
    const examDept = document.getElementById('examDept').value;
    const examSubj = document.getElementById('examSubj');
    
    if (!examSubj) return;
    const currentValue = examSubj.value;
    examSubj.innerHTML = '<option value="">اختر المادة</option>';
    
    const filtered = subjects.filter(s => !examDept || s.department_id === examDept);
    filtered.forEach(subj => {
        const option = document.createElement('option');
        option.value = subj.id;
        option.textContent = subj.name;
        examSubj.appendChild(option);
    });
    
    if (currentValue && examSubj.querySelector(`option[value="${currentValue}"]`)) {
        examSubj.value = currentValue;
    }
}

function showSubjModal(mode, subj = null) {
    const modal = document.getElementById('subjModal');
    const title = document.getElementById('subjModalTitle');
    const form = document.getElementById('subjForm');
    const subjId = document.getElementById('subjId');
    const subjDept = document.getElementById('subjDept');
    const subjName = document.getElementById('subjName');
    
    if (mode === 'add') {
        title.textContent = 'إضافة مادة جديدة';
        subjId.value = '';
        form.reset();
    } else {
        title.textContent = 'تعديل المادة';
        subjId.value = subj.id;
        subjDept.value = subj.department_id;
        subjName.value = subj.name;
    }
    
    modal.style.display = 'flex';
    subjName.focus();
}

function closeSubjModal() {
    document.getElementById('subjModal').style.display = 'none';
}

async function handleSubjSubmit(e) {
    e.preventDefault();
    
    const subjId = document.getElementById('subjId').value;
    const departmentId = document.getElementById('subjDept').value;
    const subjName = document.getElementById('subjName').value.trim();
    const saveBtn = document.getElementById('subjSaveBtn');
    
    if (!departmentId) {
        showToast('يرجى اختيار القسم', 'warning');
        return;
    }
    if (!subjName) {
        showToast('يرجى إدخال اسم المادة', 'warning');
        return;
    }
    
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<div class="spinner" style="width: 16px; height: 16px; margin: 0 5px;"></div> جاري الحفظ...';
    
    try {
        if (subjId) {
            const { error } = await db
                .from(TABLE_SUBJECTS)
                .update({ name: subjName, department_id: departmentId, updated_at: new Date().toISOString() })
                .eq('id', subjId);
            if (error) throw error;
            showToast('تم تحديث المادة بنجاح', 'success');
        } else {
            const { error } = await db
                .from(TABLE_SUBJECTS)
                .insert([{ name: subjName, department_id: departmentId }]);
            if (error) throw error;
            showToast('تم إضافة المادة بنجاح', 'success');
        }
        logActivity(subjId ? 'تعديل' : 'إضافة', 'مادة', subjName);
        closeSubjModal();
        await loadSubjectsAdmin();
        await loadExamsAdmin();
        updateStats();
    } catch (error) {
        console.error('Subj save error:', error);
        showToast('تعذّر حفظ المادة — ' + translateDbError(error), 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save"></i> حفظ';
    }
}

function editSubject(id) {
    const subj = subjects.find(s => s.id === id);
    if (subj) {
        showSubjModal('edit', subj);
    }
}

function deleteSubject(id, name) {
    showDeleteModal(`هل أنت متأكد من حذف المادة "${name}"؟<br>سيتم حذف جميع الامتحانات المرتبطة بها. لا يمكن التراجع عن هذه العملية.`, async function() {
        try {
            // Remove the PDF files of every exam inside this subject (best effort)
            const { data: related } = await db
                .from(TABLE_EXAMS)
                .select('file_path')
                .eq('subject_id', id);
            await removeStorageFiles((related || []).map(e => e.file_path));

            const { error } = await db
                .from(TABLE_SUBJECTS)
                .delete()
                .eq('id', id);
            if (error) throw error;
            showToast('تم حذف المادة بنجاح', 'success');
            logActivity('حذف', 'مادة', name);
            await loadAllData();
        } catch (error) {
            console.error('Delete subj error:', error);
            showToast('تعذّر حذف المادة — ' + translateDbError(error), 'error');
        }
    });
}

// Exams
async function loadExamsAdmin() {
    try {
        const { data, error } = await db
            .from(TABLE_EXAMS)
            .select('*, subjects(id, name, departments(id, name))')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        exams = data || [];
        renderExamsTable();
        filterExams();
    } catch (error) {
        console.error('Error loading exams:', error);
        showToast('تعذّر تحميل الامتحانات — ' + translateDbError(error), 'error');
    }
}

function renderExamsTable(filteredExams = exams) {
    const tbody = document.getElementById('examsTableBody');
    const empty = document.getElementById('examTableEmpty');
    
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (filteredExams.length === 0) {
        empty.style.display = 'block';
        return;
    }
    
    empty.style.display = 'none';
    
    filteredExams.forEach((exam, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${escapeHtml(exam.name)}</strong></td>
            <td>${escapeHtml(exam.subjects?.name || '-')}</td>
            <td>${escapeHtml(exam.subjects?.departments?.name || '-')}</td>
            <td>${exam.year}</td>
            <td>${exam.semester}</td>
            <td>${formatDate(exam.created_at)}</td>
            <td>
                <div class="table-actions">
                    <button class="btn btn-sm btn-info" onclick="previewPDF('${escapeJs(exam.file_url)}', '${escapeJs(exam.name)}')">
                        <i class="fas fa-eye"></i> معاينة
                    </button>
                    <button class="btn btn-sm btn-edit" onclick="editExam('${exam.id}')">
                        <i class="fas fa-edit"></i> تعديل
                    </button>
                    <button class="btn btn-sm btn-delete" onclick="deleteExam('${exam.id}', '${escapeJs(exam.name)}')">
                        <i class="fas fa-trash"></i> حذف
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function filterExams() {
    const deptFilter = document.getElementById('examDeptFilter')?.value || 'all';
    const subjFilter = document.getElementById('examSubjFilter')?.value || 'all';
    const search = document.getElementById('examSearch')?.value.trim().toLowerCase() || '';
    
    let filtered = [...exams];
    
    if (deptFilter !== 'all') {
        filtered = filtered.filter(e => e.subjects?.departments?.id === deptFilter);
    }
    
    if (subjFilter !== 'all') {
        filtered = filtered.filter(e => e.subject_id === subjFilter);
    }
    
    if (search) {
        filtered = filtered.filter(e => 
            e.name.toLowerCase().includes(search) ||
            e.year.toString().includes(search) ||
            e.semester.toLowerCase().includes(search)
        );
    }
    
    renderExamsTable(filtered);
}

function showExamModal(mode, exam = null) {
    const modal = document.getElementById('examModal');
    const title = document.getElementById('examModalTitle');
    const form = document.getElementById('examForm');
    const examId = document.getElementById('examId');
    const examDept = document.getElementById('examDept');
    const examSubj = document.getElementById('examSubj');
    const examName = document.getElementById('examName');
    const examYear = document.getElementById('examYear');
    const examSemester = document.getElementById('examSemester');
    const examDesc = document.getElementById('examDesc');
    const fileRequired = document.getElementById('fileRequired');
    const currentFile = document.getElementById('currentFile');
    const examFile = document.getElementById('examFile');
    
    if (mode === 'add') {
        title.textContent = 'إضافة امتحان جديد';
        examId.value = '';
        form.reset();
        fileRequired.style.display = 'inline';
        currentFile.style.display = 'none';
    } else {
        title.textContent = 'تعديل الامتحان';
        examId.value = exam.id;
        examName.value = exam.name;
        examYear.value = exam.year;
        examSemester.value = exam.semester;
        examDesc.value = exam.description || '';
        fileRequired.style.display = 'none';
        if (exam.file_url) {
            currentFile.innerHTML = `<i class="fas fa-file-pdf"></i> الملف الحالي: ${exam.name}.pdf`;
            currentFile.style.display = 'flex';
        } else {
            currentFile.style.display = 'none';
        }
        // Set department and subject
        const deptId = exam.subjects?.departments?.id;
        const subjId = exam.subjects?.id;
        if (deptId) {
            examDept.value = deptId;
            populateExamSubjects();
            if (subjId) {
                examSubj.value = subjId;
            }
        }
    }
    examFile.value = '';
    const fileInfoReset = document.getElementById('fileInfo');
    if (fileInfoReset) {
        fileInfoReset.style.display = 'none';
        fileInfoReset.innerHTML = '';
        fileInfoReset.className = 'file-info';
    }
    modal.style.display = 'flex';
    examName.focus();
}

function closeExamModal() {
    document.getElementById('examModal').style.display = 'none';
}

async function handleExamSubmit(e) {
    e.preventDefault();
    
    const examId = document.getElementById('examId').value;
    const subjectId = document.getElementById('examSubj').value;
    const examName = document.getElementById('examName').value.trim();
    const examYear = parseInt(document.getElementById('examYear').value);
    const examSemester = document.getElementById('examSemester').value;
    const examDesc = document.getElementById('examDesc').value.trim();
    const examFile = document.getElementById('examFile').files[0];
    const saveBtn = document.getElementById('examSaveBtn');
    
    // Validation
    if (!subjectId) {
        showToast('يرجى اختيار المادة', 'warning');
        return;
    }
    if (!examName) {
        showToast('يرجى إدخال اسم الامتحان', 'warning');
        return;
    }
    if (!examYear || examYear < 1990 || examYear > 2030) {
        showToast('يرجى إدخال سنة صحيحة (1990 - 2030)', 'warning');
        return;
    }
    if (!examSemester) {
        showToast('يرجى اختيار الفصل الدراسي', 'warning');
        return;
    }
    if (!examId && !examFile) {
        showToast('يرجى اختيار ملف PDF للامتحان', 'warning');
        return;
    }
    
    // Validate file if uploaded
    if (examFile) {
        const validation = validatePDF(examFile);
        if (!validation.valid) {
            showToast(validation.error, 'error');
            return;
        }
    }
    
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<div class="spinner" style="width: 16px; height: 16px; margin: 0 5px;"></div> جاري الحفظ...';

    let uploadedPath = null;

    try {
        let fileUrl = null;
        let filePath = null;
        
        // Upload file if provided
        if (examFile) {
            const uniqueName = `exam_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.pdf`;
            filePath = `exams/${uniqueName}`;
            
            const { error: uploadError } = await db.storage
                .from(STORAGE_BUCKET)
                .upload(filePath, examFile, {
                    cacheControl: '3600',
                    upsert: false,
                    contentType: 'application/pdf'
                });
            
            if (uploadError) throw uploadError;
            uploadedPath = filePath;
            
            // Get public URL
            const { data: urlData } = db.storage
                .from(STORAGE_BUCKET)
                .getPublicUrl(filePath);
            
            fileUrl = urlData.publicUrl;
        }
        
        if (examId) {
            const previous = exams.find(x => x.id === examId);
            // Update - build update object
            const updateData = {
                name: examName,
                subject_id: subjectId,
                year: examYear,
                semester: examSemester,
                description: examDesc || null,
                updated_at: new Date().toISOString()
            };
            if (fileUrl) {
                updateData.file_url = fileUrl;
                updateData.file_path = filePath;
            }
            const { error } = await db
                .from(TABLE_EXAMS)
                .update(updateData)
                .eq('id', examId);
            if (error) throw error;

            // Remove the previous PDF after a successful replacement
            if (fileUrl && previous && previous.file_path && previous.file_path !== filePath) {
                await removeStorageFiles([previous.file_path]);
            }
            showToast('تم تحديث الامتحان بنجاح', 'success');
        } else {
            // Insert
            const { error } = await db
                .from(TABLE_EXAMS)
                .insert([{
                    name: examName,
                    subject_id: subjectId,
                    year: examYear,
                    semester: examSemester,
                    description: examDesc || null,
                    file_url: fileUrl,
                    file_path: filePath
                }]);
            if (error) throw error;
            showToast('تم إضافة الامتحان بنجاح', 'success');
        }
        logActivity(examId ? 'تعديل' : 'إضافة', 'امتحان', examName);
        closeExamModal();
        await loadExamsAdmin();
        updateStats();
    } catch (error) {
        // If the DB write failed, remove the file we just uploaded so nothing is orphaned
        if (uploadedPath) {
            await removeStorageFiles([uploadedPath]);
        }
        console.error('Exam save error:', error);
        showToast('تعذّر حفظ الامتحان — ' + translateDbError(error), 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save"></i> حفظ';
    }
}

function editExam(id) {
    const exam = exams.find(e => e.id === id);
    if (exam) {
        showExamModal('edit', exam);
    }
}

function deleteExam(id, name) {
    showDeleteModal(`هل أنت متأكد من حذف الامتحان "${name}"؟<br>سيتم حذف الملف المرفوع أيضاً. لا يمكن التراجع عن هذه العملية.`, async function() {
        try {
            const exam = exams.find(e => e.id === id);
            if (exam && exam.file_path) {
                await db.storage
                    .from(STORAGE_BUCKET)
                    .remove([exam.file_path]);
            }
            const { error } = await db
                .from(TABLE_EXAMS)
                .delete()
                .eq('id', id);
            if (error) throw error;
            showToast('تم حذف الامتحان بنجاح', 'success');
            logActivity('حذف', 'امتحان', name);
            await loadExamsAdmin();
            updateStats();
        } catch (error) {
            console.error('Delete exam error:', error);
            showToast('تعذّر حذف الامتحان — ' + translateDbError(error), 'error');
        }
    });
}

// Delete modal
function showDeleteModal(message, callback) {
    const modal = document.getElementById('deleteModal');
    const messageEl = document.getElementById('deleteMessage');
    messageEl.innerHTML = message;
    deleteCallback = callback;
    modal.style.display = 'flex';
}

function closeDeleteModal() {
    document.getElementById('deleteModal').style.display = 'none';
    deleteCallback = null;
}

function confirmDelete() {
    if (deleteCallback) {
        deleteCallback();
    }
    closeDeleteModal();
}

// Utility functions
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function escapeJs(text) {
    if (!text) return '';
    return text.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

/* ==========================================================================
   ✦ إضافات اللوحة: سجل النشاط · النسخ الاحتياطي · أدوات إضافية
   ========================================================================== */

const ACTIVITY_KEY = 'admin_activity_log';
const ACTIVITY_MAX = 200;
let activityLog = [];

/* ------------------------------ سجل النشاط ------------------------------ */
function loadActivityLog() {
    try {
        const raw = localStorage.getItem(ACTIVITY_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        activityLog = Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        activityLog = [];
    }
}

function saveActivityLog() {
    try {
        localStorage.setItem(ACTIVITY_KEY, JSON.stringify(activityLog));
    } catch (e) {
        console.error('Activity log save error:', e);
    }
}

function logActivity(action, entity, name) {
    activityLog.unshift({
        action: action,
        entity: entity,
        name: name || '',
        at: new Date().toISOString(),
        user: (currentUser && currentUser.email) || ''
    });
    if (activityLog.length > ACTIVITY_MAX) {
        activityLog.length = ACTIVITY_MAX;
    }
    saveActivityLog();
    renderActivityTable();
}

function renderActivityTable() {
    const tbody = document.getElementById('activityTableBody');
    const empty = document.getElementById('activityEmpty');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!activityLog.length) {
        if (empty) empty.style.display = 'block';
        return;
    }
    if (empty) empty.style.display = 'none';

    const badge = {
        'إضافة': 'act-add',
        'تعديل': 'act-edit',
        'حذف': 'act-del',
        'دخول': 'act-in',
        'خروج': 'act-out'
    };

    activityLog.forEach(function (item, index) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td><span class="act-badge ${badge[item.action] || 'act-edit'}">${escapeHtml(item.action)}</span></td>
            <td>${escapeHtml(item.entity)}</td>
            <td>${item.name ? escapeHtml(item.name) : '—'}</td>
            <td>${formatDate(item.at)}</td>
        `;
        tbody.appendChild(row);
    });
}

function clearActivityLog() {
    if (!activityLog.length) {
        showToast('السجل فارغ بالفعل', 'warning');
        return;
    }
    showDeleteModal('هل أنت متأكد من مسح سجل النشاط بالكامل؟<br>لا يمكن التراجع عن هذه العملية.', function () {
        activityLog = [];
        saveActivityLog();
        renderActivityTable();
        showToast('تم مسح سجل النشاط', 'success');
    });
}

/* ------------------------------ تصدير الملفات ------------------------------ */
function downloadTextFile(filename, content, mime) {
    const blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
}

function csvCell(value) {
    const s = value == null ? '' : String(value);
    return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

// BOM في البداية حتى يقرأ Excel العربية بشكل صحيح
function buildCsv(header, rows) {
    const lines = [header].concat(rows).map(function (row) {
        return row.map(csvCell).join(',');
    });
    return '\ufeff' + lines.join('\r\n');
}

function today() {
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// تاريخ بأرقام لاتينية ليكون مناسباً لملفات CSV/Excel
function plainDate(value) {
    const d = value ? new Date(value) : new Date();
    if (isNaN(d.getTime())) return '';
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function subjectName(id) {
    const s = subjects.find(x => x.id === id);
    return s ? s.name : '';
}

function departmentNameOfSubject(id) {
    const s = subjects.find(x => x.id === id);
    if (!s) return '';
    const d = departments.find(x => x.id === s.department_id);
    return d ? d.name : '';
}

function exportDepartmentsCsv() {
    if (!departments.length) {
        showToast('لا توجد أقسام للتصدير', 'warning');
        return;
    }
    const rows = departments.map(function (d, i) {
        return [i + 1, d.name, (d.subjects && d.subjects[0] && d.subjects[0].count) || 0, plainDate(d.created_at)];
    });
    downloadTextFile(`الاقسام-${today()}.csv`, buildCsv(['#', 'اسم القسم', 'عدد المواد', 'تاريخ الإضافة'], rows), 'text/csv;charset=utf-8');
    showToast('تم تصدير الأقسام بنجاح', 'success');
}

function exportSubjectsCsv() {
    if (!subjects.length) {
        showToast('لا توجد مواد للتصدير', 'warning');
        return;
    }
    const rows = subjects.map(function (s, i) {
        const d = departments.find(x => x.id === s.department_id);
        const count = exams.filter(e => e.subject_id === s.id).length;
        return [i + 1, s.name, d ? d.name : '', count, plainDate(s.created_at)];
    });
    downloadTextFile(`المواد-${today()}.csv`, buildCsv(['#', 'اسم المادة', 'القسم', 'عدد الامتحانات', 'تاريخ الإضافة'], rows), 'text/csv;charset=utf-8');
    showToast('تم تصدير المواد بنجاح', 'success');
}

function exportExamsCsv() {
    if (!exams.length) {
        showToast('لا توجد امتحانات للتصدير', 'warning');
        return;
    }
    const rows = exams.map(function (e, i) {
        return [
            i + 1,
            e.name,
            subjectName(e.subject_id),
            departmentNameOfSubject(e.subject_id),
            e.year,
            e.semester,
            e.description || '',
            e.file_url || '',
            plainDate(e.created_at)
        ];
    });
    const header = ['#', 'اسم الامتحان', 'المادة', 'القسم', 'السنة', 'الفصل', 'الوصف', 'رابط الملف', 'تاريخ الإضافة'];
    downloadTextFile(`الامتحانات-${today()}.csv`, buildCsv(header, rows), 'text/csv;charset=utf-8');
    showToast('تم تصدير الامتحانات بنجاح', 'success');
}

function exportActivityCsv() {
    if (!activityLog.length) {
        showToast('السجل فارغ', 'warning');
        return;
    }
    const rows = activityLog.map(function (a, i) {
        return [i + 1, a.action, a.entity, a.name, plainDate(a.at), a.user];
    });
    const header = ['#', 'العملية', 'النوع', 'العنصر', 'التاريخ والوقت', 'المستخدم'];
    downloadTextFile(`سجل-النشاط-${today()}.csv`, buildCsv(header, rows), 'text/csv;charset=utf-8');
    showToast('تم تصدير السجل بنجاح', 'success');
}

function exportFullBackup() {
    const payload = {
        site: 'أرشيف امتحانات كلية الهندسة – جامعة الجفرة',
        exported_at: new Date().toISOString(),
        exported_by: (currentUser && currentUser.email) || '',
        counts: {
            departments: departments.length,
            subjects: subjects.length,
            exams: exams.length,
            files: exams.filter(e => e.file_url).length
        },
        departments: departments.map(d => ({ id: d.id, name: d.name, created_at: d.created_at })),
        subjects: subjects.map(s => ({ id: s.id, name: s.name, department_id: s.department_id, created_at: s.created_at })),
        exams: exams.map(e => ({
            id: e.id, name: e.name, subject_id: e.subject_id, year: e.year,
            semester: e.semester, description: e.description || null,
            file_url: e.file_url || null, created_at: e.created_at
        })),
        activity: activityLog
    };
    downloadTextFile(`نسخة-احتياطية-${today()}.json`, JSON.stringify(payload, null, 2), 'application/json;charset=utf-8');
    showToast('تم إنشاء النسخة الاحتياطية بنجاح', 'success');
}

/* ------------------------------ ملخّص الإحصائيات ------------------------------ */
function statsSummaryText() {
    const files = exams.filter(e => e.file_url).length;
    return [
        'أرشيف امتحانات كلية الهندسة – جامعة الجفرة',
        `عدد الأقسام: ${departments.length}`,
        `عدد المواد: ${subjects.length}`,
        `عدد الامتحانات: ${exams.length}`,
        `ملفات مرفوعة: ${files}`,
        `آخر تحديث: ${formatDate(new Date().toISOString())}`
    ].join('\n');
}

async function copyStatsSummary() {
    const text = statsSummaryText();
    try {
        await navigator.clipboard.writeText(text);
        showToast('تم نسخ الملخّص إلى الحافظة', 'success');
    } catch (e) {
        // بديل للمتصفحات التي تمنع الوصول للحافظة
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
            showToast('تم نسخ الملخّص إلى الحافظة', 'success');
        } catch (err) {
            showToast('تعذّر النسخ — انسخ النص يدوياً', 'error');
        }
        document.body.removeChild(ta);
    }
}

/* ------------------------------ ملخّص تبويب النسخ ------------------------------ */
function renderBackupSummary() {
    const box = document.getElementById('backupSummary');
    if (!box) return;
    const files = exams.filter(e => e.file_url).length;
    const cards = [
        { icon: 'fa-building-columns', value: departments.length, label: 'قسم' },
        { icon: 'fa-book', value: subjects.length, label: 'مادة' },
        { icon: 'fa-file-pdf', value: exams.length, label: 'امتحان' },
        { icon: 'fa-cloud', value: files, label: 'ملف PDF' }
    ];
    box.innerHTML = cards.map(function (c) {
        return `<div class="backup-stat">
                    <i class="fas ${c.icon}"></i>
                    <strong>${c.value}</strong>
                    <span>${c.label}</span>
                </div>`;
    }).join('');
}

/* ------------------------------ الربط والتفاعل ------------------------------ */
function setupAdminExtras() {
    const on = function (id, handler) {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', handler);
    };

    // أزرار الترويسة
    on('refreshBtn', async function () {
        showToast('جاري تحديث البيانات...', 'info', 1500);
        await loadAllData();
        renderBackupSummary();
        showToast('تم تحديث البيانات', 'success');
    });

    on('sidebarToggle', function () {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;
        const isOpen = sidebar.classList.toggle('open');
        this.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    // أزرار التصدير في التبويبات
    on('exportDeptBtn', exportDepartmentsCsv);
    on('exportSubjBtn', exportSubjectsCsv);
    on('exportExamBtn', exportExamsCsv);
    on('exportActivityBtn', exportActivityCsv);

    // سجل النشاط
    on('clearActivityBtn', clearActivityLog);

    // النسخ الاحتياطي
    on('backupJsonBtn', exportFullBackup);
    on('backupDeptCsvBtn', exportDepartmentsCsv);
    on('backupSubjCsvBtn', exportSubjectsCsv);
    on('backupExamCsvBtn', exportExamsCsv);
    on('copySummaryBtn', copyStatsSummary);
    on('refreshBackupBtn', function () {
        renderBackupSummary();
        showToast('تم تحديث الأرقام', 'success');
    });

    // إغلاق القائمة الجانبية بالنقر خارجها على الشاشات الصغيرة
    document.addEventListener('click', function (e) {
        const sidebar = document.getElementById('sidebar');
        const toggle = document.getElementById('sidebarToggle');
        if (!sidebar || !sidebar.classList.contains('open')) return;
        if (sidebar.contains(e.target) || (toggle && toggle.contains(e.target))) return;
        sidebar.classList.remove('open');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
    });

    // حجم ملف الامتحان: نص الحد + تحقّق فوري عند اختيار الملف
    const sizeHint = document.getElementById('fileSizeHint');
    if (sizeHint) {
        sizeHint.textContent = 'يجب أن يكون الملف بصيغة PDF، وحجمه لا يزيد عن ' + MAX_FILE_SIZE_MB + ' ميجابايت';
    }

    const examFileInput = document.getElementById('examFile');
    const fileInfo = document.getElementById('fileInfo');
    if (examFileInput && fileInfo) {
        examFileInput.addEventListener('change', function () {
            const file = examFileInput.files && examFileInput.files[0];
            if (!file) {
                fileInfo.style.display = 'none';
                fileInfo.innerHTML = '';
                return;
            }
            const result = validatePDF(file);
            fileInfo.style.display = 'flex';
            fileInfo.className = 'file-info ' + (result.valid ? 'is-ok' : 'is-bad');
            fileInfo.innerHTML = result.valid
                ? `<i class="fas fa-circle-check"></i> ${escapeHtml(file.name)} — ${formatFileSize(file.size)}`
                : `<i class="fas fa-circle-exclamation"></i> ${escapeHtml(result.error)}`;
            if (!result.valid) showToast(result.error, 'error');
        });
    }

    renderActivityTable();
    renderBackupSummary();

    const materialForm = document.getElementById('materialForm');
    if (materialForm) materialForm.addEventListener('submit', handleMaterialSubmit);
}

/* ============================================================
   المنهج والشيتات
   ============================================================ */
let materials = [];

const MATERIAL_KIND_LABELS = { syllabus: 'منهج', sheet: 'شيت', other: 'ملف' };

async function loadMaterialsAdmin() {
    const tbody = document.getElementById('materialsTableBody');
    if (!tbody) return;

    try {
        const { data, error } = await db
            .from(TABLE_MATERIALS)
            .select('*, subjects(id, name, department_id, departments(id, name))')
            .order('created_at', { ascending: false });

        if (error) throw error;
        materials = data || [];
        renderMaterialsTable();
        populateMaterialSubjects();
    } catch (error) {
        console.error('Error loading materials:', error);
        materials = [];
        renderMaterialsTable();
        showToast('تعذّر تحميل المنهج والشيتات — تأكد من تشغيل ملف supabase/materials.sql أولاً', 'error');
    }
}

function renderMaterialsTable() {
    const tbody = document.getElementById('materialsTableBody');
    const empty = document.getElementById('materialsTableEmpty');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (materials.length === 0) {
        if (empty) empty.style.display = 'block';
        return;
    }

    if (empty) empty.style.display = 'none';

    materials.forEach((item, index) => {
        const subject = item.subjects || {};
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${escapeHtml(item.title)}</strong></td>
            <td>${MATERIAL_KIND_LABELS[item.kind] || 'ملف'}</td>
            <td>${escapeHtml(subject.name || '-')}</td>
            <td>${escapeHtml(subject.departments?.name || '-')}</td>
            <td>${formatDate(item.created_at)}</td>
            <td>
                <div class="table-actions">
                    ${item.file_url ? `<button class="btn btn-sm btn-info" onclick="previewPDF('${escapeJs(item.file_url)}', '${escapeJs(item.title)}')">
                        <i class="fas fa-eye"></i> معاينة
                    </button>` : ''}
                    <button class="btn btn-sm btn-delete" onclick="deleteMaterial('${item.id}')">
                        <i class="fas fa-trash"></i> حذف
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function populateMaterialSubjects() {
    const select = document.getElementById('materialSubj');
    if (!select) return;

    const current = select.value;
    select.innerHTML = '<option value="">اختر المادة</option>';

    subjects.forEach(function (subj) {
        const option = document.createElement('option');
        option.value = subj.id;
        option.textContent = subj.departments?.name
            ? `${subj.name} — ${subj.departments.name}`
            : subj.name;
        select.appendChild(option);
    });

    if (current && select.querySelector(`option[value="${current}"]`)) {
        select.value = current;
    }
}

async function handleMaterialSubmit(e) {
    e.preventDefault();

    const subjectId = document.getElementById('materialSubj').value;
    const kind = document.getElementById('materialKind').value;
    const title = document.getElementById('materialTitle').value.trim();
    const fileInput = document.getElementById('materialFile');
    const file = fileInput && fileInput.files ? fileInput.files[0] : null;
    const saveBtn = document.getElementById('materialSaveBtn');

    if (!subjectId) { showToast('يرجى اختيار المادة', 'warning'); return; }
    if (!title) { showToast('يرجى كتابة العنوان', 'warning'); return; }

    if (file) {
        const validation = validatePDF(file);
        if (!validation.valid) { showToast(validation.error, 'error'); return; }
    }

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<div class="spinner" style="width: 16px; height: 16px; margin: 0 5px;"></div> جاري الإضافة...';

    let uploadedPath = null;

    try {
        let fileUrl = null;
        let fileName = null;

        if (file) {
            const uniqueName = `material_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.pdf`;
            uploadedPath = `materials/${uniqueName}`;

            const { error: uploadError } = await db.storage
                .from(STORAGE_BUCKET)
                .upload(uploadedPath, file, {
                    cacheControl: '3600',
                    upsert: false,
                    contentType: 'application/pdf'
                });

            if (uploadError) throw uploadError;

            const { data: urlData } = db.storage.from(STORAGE_BUCKET).getPublicUrl(uploadedPath);
            fileUrl = urlData.publicUrl;
            fileName = file.name;
        }

        const { error } = await db.from(TABLE_MATERIALS).insert([{
            subject_id: subjectId,
            kind: kind,
            title: title,
            file_url: fileUrl,
            file_path: uploadedPath,
            file_name: fileName
        }]);

        if (error) throw error;

        showToast('تمت الإضافة بنجاح', 'success');
        logActivity('إضافة', MATERIAL_KIND_LABELS[kind] || 'ملف', title);

        e.target.reset();
        await loadMaterialsAdmin();
    } catch (error) {
        if (uploadedPath) {
            try { await db.storage.from(STORAGE_BUCKET).remove([uploadedPath]); } catch (err) { /* لا شيء */ }
        }
        console.error('Material insert error:', error);
        showToast('تعذّرت الإضافة — ' + translateDbError(error), 'error');
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-plus"></i> إضافة';
    }
}

function deleteMaterial(id) {
    const item = materials.find(m => m.id === id);
    if (!item) return;

    showDeleteModal(
        `هل أنت متأكد من حذف "${escapeHtml(item.title)}"؟` +
        (item.file_path ? '<br>سيتم حذف الملف المرفوع أيضاً.' : '') +
        ' لا يمكن التراجع عن هذه العملية.',
        async function () {
            try {
                if (item.file_path) {
                    await db.storage.from(STORAGE_BUCKET).remove([item.file_path]);
                }
                const { error } = await db.from(TABLE_MATERIALS).delete().eq('id', id);
                if (error) throw error;

                showToast('تم الحذف بنجاح', 'success');
                logActivity('حذف', 'منهج/شيت', item.title);
                await loadMaterialsAdmin();
            } catch (error) {
                console.error('Delete material error:', error);
                showToast('تعذّر الحذف — ' + translateDbError(error), 'error');
            }
        }
    );
}

/* ============================================================
   الجداول الدراسية — إضافة / تعديل / حذف / نشر
   ============================================================ */
const TT_DAYS = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
const TT_MAX_SLOTS = 5;

let timetablesAdmin = [];
let ttEditingId = null;

function ttDefaultModel() {
    return {
        slots: ['9 – 11', '11 – 1', '1 – 3'],
        days: TT_DAYS.map(function (name) {
            return { name: name, courses: ['', '', ''] };
        })
    };
}

let ttModel = ttDefaultModel();

function ttFillCourses(day, count) {
    while (day.courses.length < count) day.courses.push('');
    if (day.courses.length > count) day.courses.length = count;
    return day;
}

function renderTTSlots() {
    const wrap = document.getElementById('ttSlots');
    if (!wrap) return;

    wrap.innerHTML = ttModel.slots.map(function (value, i) {
        return '' +
            '<div class="tt-slot-row">' +
                '<span class="tt-slot-num">' + (i + 1) + '</span>' +
                '<input type="text" class="tt-slot-input" data-slot="' + i + '" maxlength="18" dir="ltr"' +
                    ' value="' + escapeHtml(value) + '" aria-label="وقت الفترة ' + (i + 1) + '">' +
                '<button type="button" class="icon-btn tt-slot-del" data-slot-del="' + i + '"' +
                    ' title="حذف الفترة" aria-label="حذف الفترة ' + (i + 1) + '">' +
                    '<i class="fas fa-xmark"></i>' +
                '</button>' +
            '</div>';
    }).join('');
}

function renderTTGrid() {
    const wrap = document.getElementById('ttEditWrap');
    if (!wrap) return;

    const slots = ttModel.slots;

    const head = '<tr><th scope="col" class="tt-col-day">اليوم</th>' +
        slots.map(function (slot, i) {
            return '<th scope="col"><span class="tt-col-slot" dir="ltr" data-slot-label="' + i + '">' +
                escapeHtml(slot || ('فترة ' + (i + 1))) + '</span></th>';
        }).join('') + '</tr>';

    const body = TT_DAYS.map(function (name) {
        const day = ttModel.days.find(function (d) { return d.name === name; });
        const active = !!day;
        const courses = day ? day.courses : [];

        const cells = slots.map(function (slot, i) {
            return '<td>' +
                '<input type="text" class="tt-cell-input" data-day="' + escapeHtml(name) + '" data-slot="' + i + '"' +
                    ' value="' + escapeHtml(courses[i] || '') + '"' + (active ? '' : ' disabled') +
                    ' placeholder="—" aria-label="مادة ' + escapeHtml(name) + ' — ' + escapeHtml(slot) + '">' +
            '</td>';
        }).join('');

        return '<tr class="' + (active ? '' : 'is-off') + '">' +
            '<th scope="row">' +
                '<label class="tt-day-label">' +
                    '<input type="checkbox" class="tt-day-check" value="' + escapeHtml(name) + '"' + (active ? ' checked' : '') + '>' +
                    '<span>' + escapeHtml(name) + '</span>' +
                '</label>' +
            '</th>' + cells +
        '</tr>';
    }).join('');

    wrap.innerHTML = '<table class="tt-edit-grid"><thead>' + head + '</thead><tbody>' + body + '</tbody></table>';
}

function ttAddSlot() {
    if (ttModel.slots.length >= TT_MAX_SLOTS) {
        showToast('الحد الأقصى ' + TT_MAX_SLOTS + ' فترات', 'warning');
        return;
    }
    ttModel.slots.push('');
    ttModel.days.forEach(function (day) { day.courses.push(''); });
    renderTTSlots();
    renderTTGrid();

    const inputs = document.querySelectorAll('.tt-slot-input');
    if (inputs.length) inputs[inputs.length - 1].focus();
}

function ttRemoveSlot(index) {
    if (ttModel.slots.length <= 1) {
        showToast('يجب أن تبقى فترة واحدة على الأقل', 'warning');
        return;
    }
    ttModel.slots.splice(index, 1);
    ttModel.days.forEach(function (day) { day.courses.splice(index, 1); });
    renderTTSlots();
    renderTTGrid();
}

function resetTTForm() {
    ttEditingId = null;
    ttModel = ttDefaultModel();

    const form = document.getElementById('timetableForm');
    if (form) form.reset();

    const dept = document.getElementById('ttDepartment');
    const term = document.getElementById('ttTerm');
    const year = document.getElementById('ttYear');
    const isNew = document.getElementById('ttIsNew');
    const title = document.getElementById('ttFormTitle');
    const cancel = document.getElementById('ttCancelEdit');
    const save = document.getElementById('ttSaveBtn');

    if (dept) dept.value = '';
    if (term) term.value = 'فصل الخريف';
    if (year) year.value = '2026 – 2027';
    if (isNew) isNew.checked = false;
    if (title) title.innerHTML = '<i class="fas fa-plus"></i> إضافة جدول جديد';
    if (cancel) cancel.hidden = true;
    if (save) save.innerHTML = '<i class="fas fa-floppy-disk"></i> حفظ الجدول';

    renderTTSlots();
    renderTTGrid();
}

async function loadTimetablesAdmin() {
    const tbody = document.getElementById('timetablesTableBody');
    if (!tbody) return;

    try {
        const { data, error } = await db
            .from(TABLE_TIMETABLES)
            .select('*')
            .order('sort_order', { ascending: true })
            .order('created_at', { ascending: false });

        if (error) throw error;

        timetablesAdmin = data || [];
        renderTimetablesAdminTable();
    } catch (error) {
        console.error('Error loading timetables:', error);
        timetablesAdmin = [];
        renderTimetablesAdminTable();
        showToast('تعذّر تحميل الجداول — نفّذ ملف supabase/timetables.sql في Supabase أولاً', 'error', 5000);
    }
}

function renderTimetablesAdminTable() {
    const tbody = document.getElementById('timetablesTableBody');
    const empty = document.getElementById('timetablesTableEmpty');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (timetablesAdmin.length === 0) {
        if (empty) empty.style.display = 'block';
        return;
    }

    if (empty) empty.style.display = 'none';

    timetablesAdmin.forEach(function (item, index) {
        const daysCount = Array.isArray(item.days) ? item.days.length : 0;
        const row = document.createElement('tr');
        row.innerHTML = '' +
            '<td>' + (index + 1) + '</td>' +
            '<td><strong>' + escapeHtml(item.department) + '</strong>' +
                (item.is_new ? ' <span class="tt-badge-new">جديد</span>' : '') + '</td>' +
            '<td>' + escapeHtml(item.term || '-') + ' · ' + escapeHtml(item.year || '') + '</td>' +
            '<td>' + daysCount + ' أيام</td>' +
            '<td>' + (item.is_published
                ? '<span class="status-pill is-on"><i class="fas fa-circle-check"></i> منشور</span>'
                : '<span class="status-pill is-off"><i class="fas fa-eye-slash"></i> مخفي</span>') + '</td>' +
            '<td>' + formatDate(item.updated_at || item.created_at) + '</td>' +
            '<td>' +
                '<div class="table-actions">' +
                    '<button type="button" class="btn btn-sm btn-info" data-tt-edit="' + item.id + '">' +
                        '<i class="fas fa-pen"></i> تعديل</button>' +
                    '<button type="button" class="btn btn-sm btn-ghost" data-tt-toggle="' + item.id + '">' +
                        '<i class="fas fa-' + (item.is_published ? 'eye-slash' : 'eye') + '"></i> ' +
                        (item.is_published ? 'إخفاء' : 'نشر') + '</button>' +
                    '<button type="button" class="btn btn-sm btn-delete" data-tt-del="' + item.id + '">' +
                        '<i class="fas fa-trash"></i> حذف</button>' +
                '</div>' +
            '</td>';
        tbody.appendChild(row);
    });
}

function editTimetable(id) {
    const item = timetablesAdmin.find(function (row) { return row.id === id; });
    if (!item) return;

    ttEditingId = id;

    const slots = Array.isArray(item.slots) && item.slots.length ? item.slots.slice() : ['9 – 11', '11 – 1', '1 – 3'];
    const daysIn = Array.isArray(item.days) ? item.days : [];

    ttModel = {
        slots: slots.slice(0, TT_MAX_SLOTS),
        days: daysIn
            .filter(function (d) { return d && d.name; })
            .map(function (d) {
                return ttFillCourses({
                    name: d.name,
                    courses: Array.isArray(d.courses) ? d.courses.slice() : []
                }, slots.length);
            })
    };

    const dept = document.getElementById('ttDepartment');
    const term = document.getElementById('ttTerm');
    const year = document.getElementById('ttYear');
    const isNew = document.getElementById('ttIsNew');
    const title = document.getElementById('ttFormTitle');
    const cancel = document.getElementById('ttCancelEdit');
    const save = document.getElementById('ttSaveBtn');

    if (dept) dept.value = item.department || '';
    if (term) {
        const exists = Array.prototype.some.call(term.options, function (o) { return o.value === item.term; });
        term.value = exists ? item.term : 'فصل الخريف';
    }
    if (year) year.value = item.year || '2026 – 2027';
    if (isNew) isNew.checked = !!item.is_new;
    if (title) title.innerHTML = '<i class="fas fa-pen"></i> تعديل جدول: ' + escapeHtml(item.department);
    if (cancel) cancel.hidden = false;
    if (save) save.innerHTML = '<i class="fas fa-floppy-disk"></i> حفظ التعديلات';

    renderTTSlots();
    renderTTGrid();

    const form = document.getElementById('timetableForm');
    if (form && form.scrollIntoView) {
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (dept) dept.focus({ preventScroll: true });
}

function deleteTimetable(id) {
    const item = timetablesAdmin.find(function (row) { return row.id === id; });
    if (!item) return;

    showDeleteModal('هل أنت متأكد من حذف جدول «' + item.department + '»؟', async function () {
        try {
            const { error } = await db.from(TABLE_TIMETABLES).delete().eq('id', id);
            if (error) throw error;

            logActivity('حذف جدول', 'timetables', item.department);
            showToast('تم حذف الجدول', 'success');

            if (ttEditingId === id) resetTTForm();
            await loadTimetablesAdmin();
        } catch (error) {
            console.error('Error deleting timetable:', error);
            showToast(translateDbError(error), 'error');
        }
    });
}

async function toggleTimetablePublish(id) {
    const item = timetablesAdmin.find(function (row) { return row.id === id; });
    if (!item) return;

    try {
        const { error } = await db
            .from(TABLE_TIMETABLES)
            .update({ is_published: !item.is_published })
            .eq('id', id);

        if (error) throw error;

        showToast(item.is_published ? 'تم إخفاء الجدول من الموقع' : 'تم نشر الجدول على الموقع', 'success');
        logActivity(item.is_published ? 'إخفاء جدول' : 'نشر جدول', 'timetables', item.department);
        await loadTimetablesAdmin();
    } catch (error) {
        console.error('Error toggling timetable:', error);
        showToast(translateDbError(error), 'error');
    }
}

async function handleTimetableSubmit(e) {
    e.preventDefault();

    const dept = document.getElementById('ttDepartment').value.trim();
    const term = document.getElementById('ttTerm').value;
    const year = document.getElementById('ttYear').value.trim();
    const isNew = document.getElementById('ttIsNew').checked;
    const saveBtn = document.getElementById('ttSaveBtn');

    if (!dept) { showToast('يرجى كتابة اسم القسم', 'warning'); document.getElementById('ttDepartment').focus(); return; }

    if (!ttModel.slots.length) { showToast('أضف فترة واحدة على الأقل', 'warning'); return; }
    if (!ttModel.days.length) { showToast('اختر يوماً واحداً على الأقل', 'warning'); return; }

    const hasCourse = ttModel.days.some(function (day) {
        return day.courses.some(function (course) { return String(course || '').trim() !== ''; });
    });
    if (!hasCourse) { showToast('أضف مادة واحدة على الأقل داخل الجدول', 'warning'); return; }

    const payload = {
        department: dept,
        term: term,
        year: year || '2026 – 2027',
        slots: ttModel.slots.map(function (slot) { return String(slot || '').trim(); }),
        days: ttModel.days.map(function (day) {
            return {
                name: day.name,
                courses: day.courses.map(function (course) { return String(course || '').trim(); })
            };
        }),
        is_new: isNew,
        is_published: true
    };

    const originalLabel = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';

    try {
        if (ttEditingId) {
            const { error } = await db.from(TABLE_TIMETABLES).update(payload).eq('id', ttEditingId);
            if (error) throw error;
            logActivity('تعديل جدول', 'timetables', dept);
            showToast('تم تحديث الجدول بنجاح', 'success');
        } else {
            const { error } = await db.from(TABLE_TIMETABLES).insert([payload]);
            if (error) throw error;
            logActivity('إضافة جدول', 'timetables', dept);
            showToast('تمت إضافة الجدول بنجاح', 'success');
        }

        resetTTForm();
        await loadTimetablesAdmin();
    } catch (error) {
        console.error('Error saving timetable:', error);
        const missing = error && (error.code === 'PGRST205' || /could not find the table/i.test(error.message || ''));
        showToast(missing
            ? 'جدول الجداول غير موجود — نفّذ ملف supabase/timetables.sql في Supabase'
            : translateDbError(error), 'error', 5000);
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalLabel;
    }
}

function initTimetableAdmin() {
    const form = document.getElementById('timetableForm');
    if (!form) return;

    renderTTSlots();
    renderTTGrid();

    form.addEventListener('submit', handleTimetableSubmit);

    const slotsWrap = document.getElementById('ttSlots');
    if (slotsWrap) {
        slotsWrap.addEventListener('input', function (e) {
            const input = e.target.closest('.tt-slot-input');
            if (!input) return;
            const index = parseInt(input.dataset.slot, 10);
            ttModel.slots[index] = input.value;
            const label = document.querySelector('[data-slot-label="' + index + '"]');
            if (label) label.textContent = input.value || ('فترة ' + (index + 1));
        });

        slotsWrap.addEventListener('click', function (e) {
            const btn = e.target.closest('[data-slot-del]');
            if (!btn) return;
            ttRemoveSlot(parseInt(btn.getAttribute('data-slot-del'), 10));
        });
    }

    const addSlot = document.getElementById('ttAddSlot');
    if (addSlot) addSlot.addEventListener('click', ttAddSlot);

    const gridWrap = document.getElementById('ttEditWrap');
    if (gridWrap) {
        gridWrap.addEventListener('change', function (e) {
            const check = e.target.closest('.tt-day-check');
            if (!check) return;

            const name = check.value;

            if (check.checked) {
                if (!ttModel.days.some(function (d) { return d.name === name; })) {
                    ttModel.days.push(ttFillCourses({ name: name, courses: [] }, ttModel.slots.length));
                }
            } else {
                ttModel.days = ttModel.days.filter(function (d) { return d.name !== name; });
            }

            // حافظ على ترتيب أيام الأسبوع
            ttModel.days.sort(function (a, b) { return TT_DAYS.indexOf(a.name) - TT_DAYS.indexOf(b.name); });
            renderTTGrid();
        });

        gridWrap.addEventListener('input', function (e) {
            const input = e.target.closest('.tt-cell-input');
            if (!input) return;
            const day = ttModel.days.find(function (d) { return d.name === input.dataset.day; });
            if (!day) return;
            day.courses[parseInt(input.dataset.slot, 10)] = input.value;
        });
    }

    const cancel = document.getElementById('ttCancelEdit');
    if (cancel) cancel.addEventListener('click', function () {
        resetTTForm();
        showToast('تم إلغاء التعديل', 'info', 1800);
    });

    const reset = document.getElementById('ttResetBtn');
    if (reset) reset.addEventListener('click', function () {
        resetTTForm();
        showToast('تم تفريغ النموذج', 'info', 1800);
    });

    const newBtn = document.getElementById('ttNewBtn');
    if (newBtn) newBtn.addEventListener('click', function () {
        resetTTForm();
        const dept = document.getElementById('ttDepartment');
        if (dept) dept.focus();
        showToast('نموذج جدول جديد جاهز', 'info', 1800);
    });

    const tbody = document.getElementById('timetablesTableBody');
    if (tbody) {
        tbody.addEventListener('click', function (e) {
            const edit = e.target.closest('[data-tt-edit]');
            if (edit) { editTimetable(edit.getAttribute('data-tt-edit')); return; }

            const toggle = e.target.closest('[data-tt-toggle]');
            if (toggle) { toggleTimetablePublish(toggle.getAttribute('data-tt-toggle')); return; }

            const del = e.target.closest('[data-tt-del]');
            if (del) { deleteTimetable(del.getAttribute('data-tt-del')); }
        });
    }
}

document.addEventListener('DOMContentLoaded', initTimetableAdmin);
