// frontend/script.js
// Complete client-side logic for Student Management Dashboard
// Connects to backend REST API (configured in config.js)
const API = (typeof CONFIG !== 'undefined' && CONFIG.API_URL) ? CONFIG.API_URL : 'http://localhost:3000/students';

// ─── State ────────────────────────────────────────────────
let allStudents  = [];   // full list cached from API
let deleteTarget = null; // ID queued for deletion

// ─── DOM References ───────────────────────────────────────
const studentTableBody  = document.getElementById('student-table-body');
const dashboardTableBody= document.getElementById('dashboard-table-body');
const recordCount       = document.getElementById('record-count');
const searchInput       = document.getElementById('search-input');

const alertBox          = document.getElementById('alert-box');
const alertText         = document.getElementById('alert-text');
const alertCloseBtn     = document.getElementById('alert-close-btn');

const formCard          = document.getElementById('form-card');
const formBody          = document.getElementById('form-body');
const formTitle         = document.getElementById('form-title');
const studentForm       = document.getElementById('student-form');
const editIdInput       = document.getElementById('edit-id');
const nameInput         = document.getElementById('f-name');
const emailInput        = document.getElementById('f-email');
const courseInput       = document.getElementById('f-course');
const submitBtn         = document.getElementById('submit-btn');
const cancelEditBtn     = document.getElementById('cancel-edit-btn');
const collapseFormBtn   = document.getElementById('collapse-form-btn');
const openAddFormBtn    = document.getElementById('open-add-form-btn');

const confirmModal      = document.getElementById('confirm-modal');
const confirmDeleteBtn  = document.getElementById('confirm-delete-btn');
const cancelDeleteBtn   = document.getElementById('cancel-delete-btn');

const jsonOutput        = document.getElementById('json-output');
const jsonStatus        = document.getElementById('json-status');
const refreshJsonBtn    = document.getElementById('refresh-json-btn');
const copyJsonBtn       = document.getElementById('copy-json-btn');
const testJsonOutput    = document.getElementById('test-json-output');
const testIdInput       = document.getElementById('test-id-input');
const testFetchBtn      = document.getElementById('test-fetch-btn');

const statusDot         = document.getElementById('status-dot');
const statusLabel       = document.getElementById('status-label');
const statTotal         = document.getElementById('stat-total');
const statCourses       = document.getElementById('stat-courses');
const statLast          = document.getElementById('stat-last');
const pageTitle         = document.getElementById('page-title');
const pageSubtitle      = document.getElementById('page-subtitle');

// ─── Section Navigation ───────────────────────────────────
const sections = document.querySelectorAll('.content-section');
const navItems = document.querySelectorAll('.nav-item');

const sectionMeta = {
    'dashboard-section': { title: 'Dashboard',  subtitle: 'Overview of your student database' },
    'students-section':  { title: 'Students',   subtitle: 'Manage student records – Add, Edit, Delete' },
    'json-section':      { title: 'API / JSON', subtitle: 'Live JSON output from the REST API' }
};

function showSection(id) {
    sections.forEach(s => s.classList.remove('active'));
    navItems.forEach(n => n.classList.remove('active'));

    const target = document.getElementById(id);
    if (target) target.classList.add('active');

    // Highlight matching nav item by checking its href
    navItems.forEach(n => {
        if (n.getAttribute('href') === '#' + id) n.classList.add('active');
    });

    const meta = sectionMeta[id];
    if (meta) {
        pageTitle.textContent    = meta.title;
        pageSubtitle.textContent = meta.subtitle;
    }

    // Auto-refresh JSON viewer when opening that section
    if (id === 'json-section') refreshJsonViewer();
}

// Attach nav link clicks
navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        const href = item.getAttribute('href');
        if (href && href.startsWith('#')) {
            showSection(href.slice(1));
        }
    });
});

// "View All" button on dashboard
document.getElementById('view-all-btn').addEventListener('click', (e) => {
    e.preventDefault();
    showSection('students-section');
});

// "Add Student" topbar button
openAddFormBtn.addEventListener('click', () => {
    showSection('students-section');
    resetForm();
    openForm();
});

// ─── API Health Check ─────────────────────────────────────
async function checkApiStatus() {
    try {
        const res = await fetch(API, { signal: AbortSignal.timeout(4000) });
        if (res.ok) {
            statusDot.className   = 'status-dot online';
            statusLabel.textContent = 'API Online';
        } else {
            throw new Error();
        }
    } catch {
        statusDot.className   = 'status-dot offline';
        statusLabel.textContent = 'API Offline';
    }
}

// ─── Fetch All Students ───────────────────────────────────
async function loadStudents() {
    try {
        const res  = await fetch(API);
        const data = await res.json();
        allStudents = data;

        renderStudentTable(allStudents);
        renderDashboardTable(allStudents);
        updateStats(allStudents);
        updateJsonViewer(allStudents);
        checkApiStatus();
    } catch (err) {
        console.error('Failed to load students:', err);
        studentTableBody.innerHTML  = `<tr><td colspan="6" class="empty-row">Could not connect to backend. Make sure <b>node server.js</b> is running on port 3000.</td></tr>`;
        dashboardTableBody.innerHTML= `<tr><td colspan="5" class="empty-row">Backend offline</td></tr>`;
        statusDot.className   = 'status-dot offline';
        statusLabel.textContent = 'API Offline';
    }
}

// ─── Render: Students Full Table ──────────────────────────
function renderStudentTable(students) {
    recordCount.textContent = `${students.length} student${students.length !== 1 ? 's' : ''} found`;

    if (students.length === 0) {
        studentTableBody.innerHTML = `<tr><td colspan="6" class="empty-row">No students found.</td></tr>`;
        return;
    }

    studentTableBody.innerHTML = students.map(s => `
        <tr>
            <td><b>${s.id}</b></td>
            <td>${escHtml(s.name)}</td>
            <td>${escHtml(s.email)}</td>
            <td>${escHtml(s.course)}</td>
            <td>${formatDate(s.created_at)}</td>
            <td>
                <button class="action-btn action-btn--edit"   onclick="handleEdit(${s.id})">✏ Edit</button>
                <button class="action-btn action-btn--delete" onclick="handleDeleteClick(${s.id})">🗑 Delete</button>
            </td>
        </tr>
    `).join('');
}

// ─── Render: Dashboard Preview Table (last 5) ─────────────
function renderDashboardTable(students) {
    const recent = [...students].slice(0, 5);
    if (recent.length === 0) {
        dashboardTableBody.innerHTML = `<tr><td colspan="5" class="empty-row">No students yet.</td></tr>`;
        return;
    }
    dashboardTableBody.innerHTML = recent.map(s => `
        <tr>
            <td><b>${s.id}</b></td>
            <td>${escHtml(s.name)}</td>
            <td>${escHtml(s.email)}</td>
            <td>${escHtml(s.course)}</td>
            <td>${formatDate(s.created_at)}</td>
        </tr>
    `).join('');
}

// ─── Update Dashboard Statistics ─────────────────────────
function updateStats(students) {
    statTotal.textContent   = students.length;

    const uniqueCourses     = [...new Set(students.map(s => s.course.trim()))];
    statCourses.textContent = uniqueCourses.length;

    // Most recently added student (first in array since ordered DESC)
    statLast.textContent = students.length > 0 ? students[0].name : '–';
}

// ─── JSON Viewer ──────────────────────────────────────────
function updateJsonViewer(data) {
    jsonOutput.textContent = JSON.stringify(data, null, 2);
    jsonStatus.textContent = '200 OK';
    jsonStatus.className   = 'json-status ok';
}

async function refreshJsonViewer() {
    jsonOutput.textContent = '// Fetching...';
    try {
        const res  = await fetch(API);
        const data = await res.json();
        jsonOutput.textContent = JSON.stringify(data, null, 2);
        jsonStatus.textContent = `${res.status} OK`;
        jsonStatus.className   = 'json-status ok';
    } catch {
        jsonOutput.textContent = `// Error: Could not reach backend at ${API.replace('/students', '')}`;
        jsonStatus.textContent = 'Error';
        jsonStatus.className   = 'json-status err';
    }
}

refreshJsonBtn.addEventListener('click', refreshJsonViewer);

// Copy JSON to clipboard
copyJsonBtn.addEventListener('click', () => {
    const text = jsonOutput.textContent;
    navigator.clipboard.writeText(text).then(() => {
        copyJsonBtn.textContent = '✅ Copied!';
        setTimeout(() => { copyJsonBtn.textContent = '📋 Copy'; }, 2000);
    });
});

// ─── Single Student Fetch (Tester) ───────────────────────
testFetchBtn.addEventListener('click', async () => {
    const id = testIdInput.value.trim();
    if (!id) {
        testJsonOutput.textContent = '// Please enter a student ID';
        return;
    }
    testJsonOutput.textContent = '// Fetching...';
    try {
        const res  = await fetch(`${API}/${id}`);
        const data = await res.json();
        testJsonOutput.textContent = JSON.stringify(data, null, 2);
    } catch {
        testJsonOutput.textContent = '// Error: Could not reach backend';
    }
});

// ─── Search / Filter ─────────────────────────────────────
searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim().toLowerCase();
    if (!q) {
        renderStudentTable(allStudents);
        return;
    }
    const filtered = allStudents.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.course.toLowerCase().includes(q)
    );
    renderStudentTable(filtered);
});

// ─── Form: Open / Close / Reset ──────────────────────────
function openForm() {
    formBody.style.display = 'block';
    collapseFormBtn.textContent = '▲';
}

function closeForm() {
    formBody.style.display = 'none';
    collapseFormBtn.textContent = '▼';
}

function resetForm() {
    studentForm.reset();
    editIdInput.value       = '';
    formTitle.textContent   = 'Add New Student';
    submitBtn.textContent   = 'Save Student';
    clearFieldErrors();
    hideAlert();
}

collapseFormBtn.addEventListener('click', () => {
    if (formBody.style.display === 'none') {
        openForm();
    } else {
        closeForm();
    }
});

cancelEditBtn.addEventListener('click', () => {
    resetForm();
});

// ─── Form: Submit (Add or Update) ────────────────────────
studentForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id     = editIdInput.value.trim();
    const name   = nameInput.value.trim();
    const email  = emailInput.value.trim();
    const course = courseInput.value.trim();

    // Client-side validation
    let valid = true;
    clearFieldErrors();

    if (!name) {
        showFieldError(nameInput, document.getElementById('err-name'), 'Name is required');
        valid = false;
    }
    if (!email) {
        showFieldError(emailInput, document.getElementById('err-email'), 'Email is required');
        valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showFieldError(emailInput, document.getElementById('err-email'), 'Enter a valid email address');
        valid = false;
    }
    if (!course) {
        showFieldError(courseInput, document.getElementById('err-course'), 'Course is required');
        valid = false;
    }
    if (!valid) return;

    // Disable button during request
    submitBtn.disabled     = true;
    submitBtn.textContent  = 'Saving...';

    try {
        const isEdit = id !== '';
        const url    = isEdit ? `${API}/${id}` : API;
        const method = isEdit ? 'PUT' : 'POST';

        const res    = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, course })
        });

        const result = await res.json();

        if (res.ok) {
            showAlert(result.message, 'success');
            resetForm();
            await loadStudents();
        } else {
            // Server returned validation error (e.g., duplicate email)
            if (result.message && result.message.toLowerCase().includes('email')) {
                showFieldError(emailInput, document.getElementById('err-email'), result.message);
            } else {
                showAlert(result.message || 'Something went wrong', 'error');
            }
        }
    } catch (err) {
        showAlert('Could not connect to backend. Is the server running?', 'error');
    } finally {
        submitBtn.disabled    = false;
        submitBtn.textContent = editIdInput.value ? 'Update Student' : 'Save Student';
    }
});

// ─── Edit: Load student data into form ───────────────────
function handleEdit(id) {
    const student = allStudents.find(s => s.id === id);
    if (!student) return;

    editIdInput.value   = student.id;
    nameInput.value     = student.name;
    emailInput.value    = student.email;
    courseInput.value   = student.course;

    formTitle.textContent  = 'Edit Student Details';
    submitBtn.textContent  = 'Update Student';
    clearFieldErrors();
    hideAlert();
    openForm();

    // Scroll form into view smoothly
    formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ─── Delete: Confirmation Flow ────────────────────────────
function handleDeleteClick(id) {
    deleteTarget = id;
    confirmModal.classList.remove('hidden');
}

cancelDeleteBtn.addEventListener('click', () => {
    deleteTarget = null;
    confirmModal.classList.add('hidden');
});

// Close modal if user clicks on the dark overlay
confirmModal.addEventListener('click', (e) => {
    if (e.target === confirmModal) {
        deleteTarget = null;
        confirmModal.classList.add('hidden');
    }
});

confirmDeleteBtn.addEventListener('click', async () => {
    if (!deleteTarget) return;
    confirmModal.classList.add('hidden');

    try {
        const res    = await fetch(`${API}/${deleteTarget}`, { method: 'DELETE' });
        const result = await res.json();

        if (res.ok) {
            showAlert(result.message, 'success');
            await loadStudents();
        } else {
            showAlert(result.message || 'Delete failed', 'error');
        }
    } catch {
        showAlert('Could not connect to backend', 'error');
    } finally {
        deleteTarget = null;
    }
});

// ─── Alert Banner ─────────────────────────────────────────
function showAlert(message, type) {
    alertBox.className    = `alert ${type}`;
    alertText.textContent = message;

    // Auto-hide after 4 seconds
    clearTimeout(alertBox._timer);
    alertBox._timer = setTimeout(hideAlert, 4000);
}

function hideAlert() {
    alertBox.className = 'alert hidden';
    alertText.textContent = '';
}

alertCloseBtn.addEventListener('click', hideAlert);

// ─── Form Validation Helpers ──────────────────────────────
function showFieldError(inputEl, errEl, message) {
    inputEl.classList.add('invalid');
    errEl.textContent = message;
}

function clearFieldErrors() {
    [nameInput, emailInput, courseInput].forEach(el => el.classList.remove('invalid'));
    ['err-name', 'err-email', 'err-course'].forEach(id => {
        document.getElementById(id).textContent = '';
    });
}

// ─── Utility: Helpers ─────────────────────────────────────

// Escape HTML to prevent XSS
function escHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

// Format SQLite timestamp to readable date
function formatDate(dateStr) {
    if (!dateStr) return '–';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Init ─────────────────────────────────────────────────
(async function init() {
    // Dynamically update URLs in the UI based on config.js API URL
    const baseUrl = API.replace('/students', '');
    const sidebarApiUrl = document.getElementById('sidebar-api-url');
    if (sidebarApiUrl) sidebarApiUrl.textContent = baseUrl;

    const jsonCardSub = document.getElementById('json-card-sub');
    if (jsonCardSub) jsonCardSub.textContent = `GET ${API}`;

    const testerBaseUrl = document.getElementById('tester-base-url');
    if (testerBaseUrl) testerBaseUrl.textContent = `${API}/`;

    showSection('dashboard-section');
    await loadStudents();
})();
