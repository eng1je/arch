// Main Application JavaScript
let currentDepartmentId = null;
let currentSubjectId = null;

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    if (!db) {
        showToast('خطأ في إعدادات Supabase. يرجى التحقق من ملف config.js', 'error');
        return;
    }
    
    setYear();
    setupEventListeners();
    await loadDepartments();
}

// Set current year in footer
function setYear() {
    const yearElement = document.getElementById('year');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
}

// Setup event listeners
function setupEventListeners() {
    // Search toggle
    const searchToggleBtn = document.getElementById('searchToggleBtn');
    const searchBarContainer = document.getElementById('searchBarContainer');
    
    if (searchToggleBtn) {
        searchToggleBtn.addEventListener('click', function() {
            if (searchBarContainer.style.display === 'none') {
                searchBarContainer.style.display = 'block';
                document.getElementById('globalSearch').focus();
            } else {
                searchBarContainer.style.display = 'none';
                document.getElementById('searchResults').style.display = 'none';
                document.getElementById('globalSearch').value = '';
            }
        });
    }
    
    // Global search
    const globalSearch = document.getElementById('globalSearch');
    if (globalSearch) {
        globalSearch.addEventListener('input', handleGlobalSearch);
        globalSearch.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                handleGlobalSearch();
            }
        });
    }
    
    const searchBtn = document.getElementById('searchBtn');
    if (searchBtn) {
        searchBtn.addEventListener('click', handleGlobalSearch);
    }
    
    // Back buttons
    const backToDepartments = document.getElementById('backToDepartments');
    if (backToDepartments) {
        backToDepartments.addEventListener('click', function() {
            document.getElementById('subjectsSection').style.display = 'none';
            document.getElementById('departmentsSection').style.display = 'block';
            document.getElementById('examsSection').style.display = 'none';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
    
    const backToSubjects = document.getElementById('backToSubjects');
    if (backToSubjects) {
        backToSubjects.addEventListener('click', function() {
            document.getElementById('examsSection').style.display = 'none';
            document.getElementById('subjectsSection').style.display = 'block';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
    
    // PDF Modal
    const pdfModalClose = document.getElementById('pdfModalClose');
    const pdfModalCloseBtn = document.getElementById('pdfModalCloseBtn');
    const pdfModal = document.getElementById('pdfModal');
    
    if (pdfModalClose) {
        pdfModalClose.addEventListener('click', closePDFModal);
    }
    if (pdfModalCloseBtn) {
        pdfModalCloseBtn.addEventListener('click', closePDFModal);
    }
    if (pdfModal) {
        pdfModal.addEventListener('click', function(e) {
            if (e.target === pdfModal) {
                closePDFModal();
            }
        });
    }
}

// Load departments
async function loadDepartments() {
    const loading = document.getElementById('departmentsLoading');
    const grid = document.getElementById('departmentsGrid');
    const empty = document.getElementById('departmentsEmpty');
    
    if (loading) loading.style.display = 'block';
    if (grid) grid.style.display = 'none';
    if (empty) empty.style.display = 'none';
    
    try {
        const { data, error } = await db
            .from(TABLE_DEPARTMENTS)
            .select('id, name, created_at')
            .order('created_at', { ascending: true });
        
        if (error) throw error;
        
        if (loading) loading.style.display = 'none';
        
        if (data && data.length > 0) {
            if (grid) {
                grid.innerHTML = '';
                data.forEach(dept => {
                    const card = document.createElement('div');
                    card.className = 'card';
                    card.innerHTML = `
                        <div class="card-icon">
                            <i class="fas fa-building-columns"></i>
                        </div>
                        <h3 class="card-title">${escapeHtml(dept.name)}</h3>
                        <p class="card-subtitle">اضغط لعرض المواد الدراسية</p>
                    `;
                    card.addEventListener('click', function() {
                        loadSubjects(dept.id, dept.name);
                    });
                    grid.appendChild(card);
                });
                grid.style.display = 'grid';
            }
        } else {
            if (empty) empty.style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading departments:', error);
        showToast(translateDbError(error), 'error');
        if (loading) loading.style.display = 'none';
        if (empty) empty.style.display = 'block';
    }
}

// Load subjects by department
async function loadSubjects(departmentId, departmentName) {
    currentDepartmentId = departmentId;
    
    document.getElementById('departmentsSection').style.display = 'none';
    document.getElementById('subjectsSection').style.display = 'block';
    document.getElementById('examsSection').style.display = 'none';
    
    const loading = document.getElementById('subjectsLoading');
    const grid = document.getElementById('subjectsGrid');
    const empty = document.getElementById('subjectsEmpty');
    const subtitle = document.getElementById('departmentNameSubtitle');
    
    if (subtitle) subtitle.textContent = `(${departmentName})`;
    if (loading) loading.style.display = 'block';
    if (grid) grid.style.display = 'none';
    if (empty) empty.style.display = 'none';
    
    try {
        const { data, error } = await db
            .from(TABLE_SUBJECTS)
            .select('id, name, created_at')
            .eq('department_id', departmentId)
            .order('created_at', { ascending: true });
        
        if (error) throw error;
        
        if (loading) loading.style.display = 'none';
        
        if (data && data.length > 0) {
            if (grid) {
                grid.innerHTML = '';
                data.forEach(subject => {
                    const card = document.createElement('div');
                    card.className = 'card';
                    card.innerHTML = `
                        <div class="card-icon">
                            <i class="fas fa-book"></i>
                        </div>
                        <h3 class="card-title">${escapeHtml(subject.name)}</h3>
                        <p class="card-subtitle">اضغط لعرض امتحانات السنوات السابقة</p>
                    `;
                    card.addEventListener('click', function() {
                        loadExams(subject.id, subject.name, departmentName);
                    });
                    grid.appendChild(card);
                });
                grid.style.display = 'grid';
            }
        } else {
            if (empty) empty.style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading subjects:', error);
        showToast(translateDbError(error), 'error');
        if (loading) loading.style.display = 'none';
        if (empty) empty.style.display = 'block';
    }
}

// Load exams by subject
async function loadExams(subjectId, subjectName, departmentName) {
    currentSubjectId = subjectId;
    
    document.getElementById('subjectsSection').style.display = 'none';
    document.getElementById('examsSection').style.display = 'block';
    
    const loading = document.getElementById('examsLoading');
    const list = document.getElementById('examsList');
    const empty = document.getElementById('examsEmpty');
    const subtitle = document.getElementById('subjectNameSubtitle');
    
    if (subtitle) subtitle.textContent = `(${[subjectName, departmentName].filter(Boolean).join(' - ')})`;
    if (loading) loading.style.display = 'block';
    if (list) list.style.display = 'none';
    if (empty) empty.style.display = 'none';
    
    try {
        const { data, error } = await db
            .from(TABLE_EXAMS)
            .select('*')
            .eq('subject_id', subjectId)
            .order('year', { ascending: false })
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (loading) loading.style.display = 'none';
        
        if (data && data.length > 0) {
            if (list) {
                list.innerHTML = '';
                data.forEach(exam => {
                    const item = document.createElement('div');
                    item.className = 'exam-item';
                    item.innerHTML = `
                        <div class="exam-info">
                            <h3 class="exam-name">${escapeHtml(exam.name)}</h3>
                            <div class="exam-meta">
                                <span class="exam-meta-item">
                                    <i class="fas fa-calendar-alt"></i>
                                    <span>السنة: ${exam.year}</span>
                                </span>
                                <span class="exam-meta-item">
                                    <i class="fas fa-graduation-cap"></i>
                                    <span>الفصل: ${exam.semester}</span>
                                </span>
                            </div>
                            ${exam.description ? `<p class="exam-description">${escapeHtml(exam.description)}</p>` : ''}
                        </div>
                        <div class="exam-actions">
                            <button class="btn btn-info" onclick="previewPDF('${escapeJs(exam.file_url)}', '${escapeJs(exam.name)}')">
                                <i class="fas fa-eye"></i> معاينة
                            </button>
                            <a href="${escapeHtml(exam.file_url)}" target="_blank" download class="btn btn-primary">
                                <i class="fas fa-download"></i> تحميل
                            </a>
                        </div>
                    `;
                    list.appendChild(item);
                });
                list.style.display = 'flex';
            }
        } else {
            if (empty) empty.style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading exams:', error);
        showToast(translateDbError(error), 'error');
        if (loading) loading.style.display = 'none';
        if (empty) empty.style.display = 'block';
    }
}

// Preview PDF
function previewPDF(fileUrl, examName) {
    const modal = document.getElementById('pdfModal');
    const iframe = document.getElementById('pdfViewer');
    const title = document.getElementById('pdfModalTitle');
    const downloadBtn = document.getElementById('pdfDownloadBtn');
    
    if (modal && iframe && title && downloadBtn) {
        title.textContent = `معاينة: ${examName}`;
        iframe.src = fileUrl + '#view=FitH';
        downloadBtn.href = fileUrl;
        downloadBtn.download = `${examName.replace(/[^a-z0-9\u0600-\u06FF]/gi, '_')}.pdf`;
        modal.style.display = 'flex';
    }
}

// Close PDF Modal
function closePDFModal() {
    const modal = document.getElementById('pdfModal');
    const iframe = document.getElementById('pdfViewer');
    if (modal) modal.style.display = 'none';
    if (iframe) iframe.src = '';
}

// Global search
async function handleGlobalSearch() {
    const searchInput = document.getElementById('globalSearch');
    const resultsDiv = document.getElementById('searchResults');
    
    if (!searchInput || !resultsDiv) return;
    
    const query = searchInput.value.trim().toLowerCase();
    
    if (query.length < 2) {
        resultsDiv.style.display = 'none';
        return;
    }
    
    resultsDiv.innerHTML = '<div style="padding: 1rem; text-align: center; color: var(--text-secondary);">جاري البحث...</div>';
    resultsDiv.style.display = 'block';
    
    try {
        let results = [];
        
        // Search departments
        const { data: depts } = await db
            .from(TABLE_DEPARTMENTS)
            .select('id, name')
            .ilike('name', `%${query}%`);
        
        depts?.forEach(dept => {
            results.push({
                type: 'department',
                id: dept.id,
                name: dept.name,
                icon: 'fas fa-building-columns',
                text: `قسم: ${dept.name}`
            });
        });
        
        // Search subjects
        const { data: subjects } = await db
            .from(TABLE_SUBJECTS)
            .select('id, name, departments(id, name)')
            .ilike('name', `%${query}%`);
        
        subjects?.forEach(subj => {
            results.push({
                type: 'subject',
                id: subj.id,
                name: subj.name,
                deptId: subj.departments?.id,
                deptName: subj.departments?.name,
                icon: 'fas fa-book',
                text: `مادة: ${subj.name} (${subj.departments?.name || ''})`
            });
        });
        
        // Search exams
        let examFilter = `name.ilike.%${sanitizeFilter(query)}%`;
        if (/^\d{4}$/.test(query)) {
            examFilter += `,year.eq.${query}`;
        }
        const { data: exams } = await db
            .from(TABLE_EXAMS)
            .select('id, name, year, semester, subjects(id, name, departments(id, name))')
            .or(examFilter);
        
        exams?.forEach(exam => {
            results.push({
                type: 'exam',
                id: exam.id,
                name: exam.name,
                year: exam.year,
                semester: exam.semester,
                subjectId: exam.subjects?.id,
                subjectName: exam.subjects?.name,
                deptId: exam.subjects?.departments?.id,
                deptName: exam.subjects?.departments?.name,
                icon: 'fas fa-file-pdf',
                text: `امتحان: ${exam.name} - ${exam.year} - ${exam.semester}`
            });
        });
        
        // Display results
        if (results.length === 0) {
            resultsDiv.innerHTML = '<div style="padding: 1rem; text-align: center; color: var(--text-secondary);">لا توجد نتائج</div>';
            return;
        }
        
        resultsDiv.innerHTML = '';
        results.slice(0, 10).forEach(item => {
            const resultItem = document.createElement('div');
            resultItem.className = 'search-result-item';
            resultItem.innerHTML = `
                <div class="search-result-icon">
                    <i class="${item.icon}"></i>
                </div>
                <div class="search-result-info">
                    <h4>${escapeHtml(item.name)}</h4>
                    <p>${escapeHtml(item.text)}</p>
                </div>
            `;
            resultItem.addEventListener('click', function() {
                resultsDiv.style.display = 'none';
                document.getElementById('globalSearch').value = '';
                
                if (item.type === 'department') {
                    loadSubjects(item.id, item.name);
                } else if (item.type === 'subject') {
                    openSubject(item.deptId, item.deptName, item.id, item.name);
                } else if (item.type === 'exam') {
                    openSubject(item.deptId, item.deptName, item.subjectId, item.subjectName);
                }
            });
            resultsDiv.appendChild(resultItem);
        });
        
    } catch (error) {
        console.error('Search error:', error);
        resultsDiv.innerHTML = `<div style="padding: 1rem; text-align: center; color: var(--danger-color);">${escapeHtml(translateDbError(error))}</div>`;
    }
}

// Navigate directly to a subject's exams (used by global search)
async function openSubject(deptId, deptName, subjectId, subjectName) {
    if (!subjectId) return;
    if (deptId) {
        await loadSubjects(deptId, deptName || '');
    }
    await loadExams(subjectId, subjectName || '', deptName || '');
}

// Remove characters that would break PostgREST filter syntax
function sanitizeFilter(text) {
    if (!text) return '';
    return String(text).replace(/[,()%*\\]/g, '').trim();
}

// Escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Escape JS
function escapeJs(text) {
    if (!text) return '';
    return text.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

// Close search results when clicking outside
document.addEventListener('click', function(e) {
    const searchBarContainer = document.getElementById('searchBarContainer');
    const searchToggleBtn = document.getElementById('searchToggleBtn');
    const resultsDiv = document.getElementById('searchResults');
    
    if (searchBarContainer && resultsDiv && searchToggleBtn) {
        if (!searchBarContainer.contains(e.target) && !searchToggleBtn.contains(e.target)) {
            searchBarContainer.style.display = 'none';
            resultsDiv.style.display = 'none';
        }
    }
});
