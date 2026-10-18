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
        }
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