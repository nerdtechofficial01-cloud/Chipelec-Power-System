/* ==========================================
   CHIPELEC POWER SYSTEM — Admin Enquiries
   ========================================== */

const API_BASE = window.API_BASE_URL + "";

// State
let allEnquiries = [];
let filteredEnquiries = [];

// Status badge colours
function getStatusBadge(status) {
    const map = {
        'New':         'badge-info',
        'Contacted':   'badge-warning',
        'In Progress': 'badge-primary',
        'Converted':   'badge-success',
        'Closed':      'badge-danger'
    };
    const dot = {
        'New':         '#06b6d4',
        'Contacted':   '#f59e0b',
        'In Progress': '#6366f1',
        'Converted':   '#10b981',
        'Closed':      '#f43f5e'
    };
    const cls = map[status] || 'badge-info';
    const color = dot[status] || '#94a3b8';
    return `<span class="badge-status ${cls}">
                <span style="width:7px;height:7px;background:${color};border-radius:50%;display:inline-block;"></span>
                ${status || 'New'}
            </span>`;
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric'
    });
}

function formatDateTime(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

function truncate(str, len = 60) {
    if (!str) return '—';
    return str.length > len ? str.slice(0, len) + '…' : str;
}

// ---- Load Enquiries ----
async function loadEnquiries() {
    const tbody = document.getElementById('enquiryTable');
    tbody.innerHTML = `<tr><td colspan="9"><div class="loading-spinner"><div class="spinner"></div><p>Loading enquiries...</p></div></td></tr>`;

    try {
        const res = await fetch(`${API_BASE}/enquiries`, {
            headers: { Authorization: 'Bearer ' + token }
        });
        const result = await res.json();

        if (!result.success) throw new Error(result.message);

        allEnquiries = result.data || [];
        applyFilters();

    } catch (err) {
        console.error(err);
        tbody.innerHTML = `<tr class="empty-row"><td colspan="9"><div class="empty-state-content"><i class="bi bi-exclamation-triangle"></i><p>Failed to load enquiries. Please refresh.</p></div></td></tr>`;
        if (window.showToast) window.showToast('Failed to load enquiries', 'error');
    }
}

// ---- Apply Search / Filter / Sort ----
function applyFilters() {
    const search = (document.getElementById('searchInput').value || '').toLowerCase().trim();
    const statusFilter = document.getElementById('statusFilter').value;
    const sortOrder = document.getElementById('sortOrder').value;

    filteredEnquiries = allEnquiries.filter(e => {
        const matchSearch = !search || [
            e.full_name, e.email, e.phone, e.product_name, e.subject
        ].some(f => f && f.toLowerCase().includes(search));

        const matchStatus = !statusFilter || e.status === statusFilter;

        return matchSearch && matchStatus;
    });

    // Sort
    filteredEnquiries.sort((a, b) => {
        const da = new Date(a.created_at);
        const db = new Date(b.created_at);
        return sortOrder === 'asc' ? da - db : db - da;
    });

    renderTable(filteredEnquiries);
}

// ---- Render Table ----
function renderTable(data) {
    const tbody = document.getElementById('enquiryTable');
    const countEl = document.getElementById('enquiryCount');

    if (countEl) countEl.textContent = `${data.length} enquir${data.length !== 1 ? 'ies' : 'y'}`;

    if (data.length === 0) {
        tbody.innerHTML = `<tr class="empty-row"><td colspan="9"><div class="empty-state-content"><i class="bi bi-envelope-slash"></i><p>No enquiries found.</p></div></td></tr>`;
        return;
    }

    tbody.innerHTML = data.map(e => `
        <tr>
            <td class="id-column">#${e.id}</td>
            <td style="font-weight:500;">
                <div style="display:flex;align-items:center;gap:10px;">
                    <div style="width:32px;height:32px;background:rgba(99,102,241,0.1);color:var(--primary);border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;flex-shrink:0;">
                        ${e.full_name ? e.full_name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div>
                        <div>${e.full_name || '—'}</div>
                        <small style="color:var(--text-muted);">${e.email || ''}</small>
                    </div>
                </div>
            </td>
            <td><a href="tel:${e.phone}" style="color:var(--primary);text-decoration:none;">${e.phone || '—'}</a></td>
            <td>
                ${e.product_name
                    ? `<span style="font-weight:500;">${e.product_name}</span><br><small style="color:var(--text-muted);">${e.model_number || ''}</small>`
                    : `<span style="color:var(--text-muted);">${e.subject ? truncate(e.subject, 30) : '—'}</span>`
                }
            </td>
            <td style="color:var(--text-secondary);font-size:13px;">${truncate(e.message, 50)}</td>
            <td>${getStatusBadge(e.status)}</td>
            <td style="font-size:13px;color:var(--text-muted);">${formatDate(e.created_at)}</td>
            <td class="actions">
                <button class="btn-icon edit" onclick="viewEnquiry(${e.id})" title="View Details">
                    <i class="bi bi-eye"></i>
                </button>
                <button class="btn-icon delete" onclick="confirmDelete(${e.id})" title="Delete">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// ---- View Enquiry Detail Modal ----
function viewEnquiry(id) {
    const e = allEnquiries.find(x => x.id === id);
    if (!e) return;

    let imgHtml = '';

    if (e.product_image) {
    const imgSrc = e.product_image.startsWith('http')
        ? e.product_image
        : e.product_image.startsWith('/')
            ? e.product_image
            : `/${e.product_image}`;

    imgHtml = `<img src="${imgSrc}" alt="${e.product_name}"
        style="width:100%;max-width:200px;height:140px;object-fit:contain;border-radius:8px;border:1px solid #e2e8f0;padding:8px;background:#f8fafc;">`;
    }

    const whatsapp = e.phone ? `https://wa.me/${e.phone.replace(/\D/g, '')}` : '#';

    document.getElementById('modalEnquiryId').textContent = '#' + e.id;
    document.getElementById('modalEnquiryStatus').innerHTML = getStatusBadge(e.status);
    document.getElementById('modalCustomerName').textContent = e.full_name || '—';
    document.getElementById('modalCustomerEmail').innerHTML = e.email
        ? `<a href="mailto:${e.email}" style="color:var(--primary);">${e.email}</a>` : '—';
    document.getElementById('modalCustomerPhone').innerHTML = e.phone
        ? `<a href="tel:${e.phone}" style="color:var(--primary);">${e.phone}</a>` : '—';
    document.getElementById('modalProductInfo').innerHTML = e.product_name
        ? `<strong>${e.product_name}</strong>${e.model_number ? ' <small style="color:var(--text-muted);">(' + e.model_number + ')</small>' : ''}`
        : `<span style="color:var(--text-muted);">${e.subject || '—'}</span>`;
    document.getElementById('modalProductImage').innerHTML = imgHtml;
    document.getElementById('modalSubject').textContent = e.subject || '—';
    document.getElementById('modalMessage').textContent = e.message || '—';
    document.getElementById('modalCreatedAt').textContent = formatDateTime(e.created_at);
    document.getElementById('modalUpdatedAt').textContent = formatDateTime(e.updated_at);

    // Contact buttons
    document.getElementById('btnCall').href = e.phone ? `tel:${e.phone}` : '#';
    document.getElementById('btnEmail').href = e.email ? `mailto:${e.email}` : '#';
    document.getElementById('btnWhatsapp').href = whatsapp;

    // Status dropdown
    const statusSelect = document.getElementById('statusSelect');
    statusSelect.value = e.status || 'New';
    document.getElementById('currentEnquiryId').value = e.id;

    // Show modal
    document.getElementById('enquiryModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('enquiryModal').style.display = 'none';
}

// ---- Update Status ----
async function updateStatus() {
    const id = document.getElementById('currentEnquiryId').value;
    const status = document.getElementById('statusSelect').value;
    const btn = document.getElementById('updateStatusBtn');

    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Updating...';

    try {
        const res = await fetch(`${API_BASE}/enquiries/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: 'Bearer ' + token
            },
            body: JSON.stringify({ status })
        });
        const result = await res.json();

        if (result.success) {
            // Update local data
            const idx = allEnquiries.findIndex(e => e.id == id);
            if (idx !== -1) allEnquiries[idx].status = status;

            document.getElementById('modalEnquiryStatus').innerHTML = getStatusBadge(status);
            applyFilters();

            if (window.showToast) window.showToast('Status updated successfully', 'success');
        } else {
            throw new Error(result.message);
        }
    } catch (err) {
        console.error(err);
        if (window.showToast) window.showToast('Failed to update status', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-check-lg"></i> Update Status';
    }
}

// ---- Delete Enquiry ----
function confirmDelete(id) {
    if (!confirm(`Are you sure you want to delete Enquiry #${id}? This cannot be undone.`)) return;
    deleteEnquiry(id);
}

async function deleteEnquiry(id) {
    try {
        const res = await fetch(`${API_BASE}/enquiries/${id}`, {
            method: 'DELETE',
            headers: { Authorization: 'Bearer ' + token }
        });
        const result = await res.json();

        if (result.success) {
            allEnquiries = allEnquiries.filter(e => e.id !== id);
            applyFilters();
            closeModal();
            if (window.showToast) window.showToast('Enquiry deleted', 'success');
        } else {
            throw new Error(result.message);
        }
    } catch (err) {
        console.error(err);
        if (window.showToast) window.showToast('Failed to delete enquiry', 'error');
    }
}

// ---- Event Listeners ----
document.addEventListener('DOMContentLoaded', () => {
    loadEnquiries();

    document.getElementById('searchInput').addEventListener('input', applyFilters);
    document.getElementById('statusFilter').addEventListener('change', applyFilters);
    document.getElementById('sortOrder').addEventListener('change', applyFilters);

    // Close modal on backdrop click
    document.getElementById('enquiryModal').addEventListener('click', (e) => {
        if (e.target === document.getElementById('enquiryModal')) closeModal();
    });

    // Sidebar toggle for mobile
    window.toggleSidebar = function () {
        document.getElementById('sidebar').classList.toggle('active');
    };
});
