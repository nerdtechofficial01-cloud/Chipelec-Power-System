// Phase 9 — enquiries.js migrated to Firestore
import { fetchAll, updateDocById, deleteDocById } from "./firebase-config.js";

let allEnquiries = [];

async function loadEnquiries() {
    try {
        allEnquiries = await fetchAll("enquiries");
        renderTable(allEnquiries);
    } catch (err) {
        console.error(err);
        if (window.showToast) window.showToast('Failed to load enquiries', 'error');
    }
}

function renderTable(data) {
    const table = document.getElementById("enquiryTable");
    if (!table) return;
    table.innerHTML = "";
    if (data.length === 0) {
        table.innerHTML = `<tr class="empty-row"><td colspan="7"><div class="empty-state-content"><i class="bi bi-chat-dots"></i><p>No enquiries found.</p></div></td></tr>`;
        return;
    }
    data.forEach(enq => {
        const statusClass = enq.status === 'Resolved' ? 'badge-success' : enq.status === 'New' ? 'badge-warning' : 'badge-primary';
        const date = enq.createdAt?.toDate ? enq.createdAt.toDate().toLocaleDateString('en-IN') : '-';
        table.innerHTML += `
        <tr>
            <td class="id-column">#${enq.id.substring(0,6)}</td>
            <td style="font-weight:500;">${enq.full_name}</td>
            <td>${enq.phone}</td>
            <td>${enq.email || '-'}</td>
            <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${enq.message}">${enq.subject || enq.message?.substring(0,50) || '-'}</td>
            <td>${date}</td>
            <td>
                <span class="badge-status ${statusClass}">${enq.status || 'New'}</span>
            </td>
            <td class="actions">
                <button class="btn-icon edit" onclick="updateEnquiryStatus('${enq.id}','Resolved')" title="Mark Resolved"><i class="bi bi-check-circle"></i></button>
                <button class="btn-icon edit" onclick="viewEnquiry('${enq.id}')" title="View"><i class="bi bi-eye"></i></button>
                <button class="btn-icon delete" onclick="deleteEnquiry('${enq.id}')" title="Delete"><i class="bi bi-trash"></i></button>
            </td>
        </tr>`;
    });
}

document.getElementById('searchInput')?.addEventListener('input', function(e) {
    const term = e.target.value.toLowerCase();
    renderTable(allEnquiries.filter(e =>
        (e.full_name && e.full_name.toLowerCase().includes(term)) ||
        (e.phone && e.phone.includes(term)) ||
        (e.email && e.email.toLowerCase().includes(term)) ||
        (e.message && e.message.toLowerCase().includes(term))
    ));
});

async function updateEnquiryStatus(id, status) {
    try {
        await updateDocById("enquiries", id, { status });
        if (window.showToast) window.showToast(`Enquiry marked as ${status}`);
        loadEnquiries();
    } catch (err) {
        console.error(err);
        if (window.showToast) window.showToast('Error updating enquiry', 'error');
    }
}

function viewEnquiry(id) {
    const enq = allEnquiries.find(e => e.id === id);
    if (!enq) return;
    alert(`From: ${enq.full_name}\nPhone: ${enq.phone}\nEmail: ${enq.email || '-'}\nSubject: ${enq.subject || '-'}\n\nMessage:\n${enq.message}`);
}

async function deleteEnquiry(id) {
    if (!confirm("Delete this enquiry?")) return;
    try {
        await deleteDocById("enquiries", id);
        if (window.showToast) window.showToast('Enquiry deleted');
        loadEnquiries();
    } catch (err) {
        console.error(err);
        if (window.showToast) window.showToast('Error deleting enquiry', 'error');
    }
}

loadEnquiries();

window.updateEnquiryStatus = updateEnquiryStatus;
window.viewEnquiry = viewEnquiry;
window.deleteEnquiry = deleteEnquiry;
