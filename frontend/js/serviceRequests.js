// Phase 10 — serviceRequests.js migrated to Firestore
import { fetchAll, createDoc, updateDocById, deleteDocById, db } from "./firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

let editingService = null;
let allServices = [];
let customersData = [];

async function loadServices() {
    try {
        allServices = await fetchAll("service_requests");
        renderTable(allServices);
    } catch (err) {
        console.error(err);
        if (window.showToast) window.showToast('Failed to load service requests', 'error');
    }
}

function renderTable(data) {
    const table = document.getElementById("serviceTable");
    if (!table) return;
    table.innerHTML = "";
    if (data.length === 0) {
        table.innerHTML = `<tr class="empty-row"><td colspan="8"><div class="empty-state-content"><i class="bi bi-headset"></i><p>No service requests found.</p></div></td></tr>`;
        return;
    }
    data.forEach(s => {
        const statusBadge = s.service_status === "Resolved" ? "badge-success" :
                            s.service_status === "Cancelled" ? "badge-danger" :
                            s.service_status === "In Progress" ? "badge-primary" : "badge-warning";
        const reqDate = s.request_date?.toDate ? s.request_date.toDate().toLocaleDateString('en-IN')
                      : (s.request_date ? String(s.request_date).split('T')[0] : '-');
        table.innerHTML += `
        <tr>
            <td style="font-weight:500;">${s.customer_name || '-'}</td>
            <td>${s.request_type || '-'}</td>
            <td>${reqDate}</td>
            <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${s.issue_description}">${s.issue_description?.substring(0,40) || '-'}</td>
            <td>${s.technician_name || 'Unassigned'}</td>
            <td>${s.service_charge != null ? '₹' + Number(s.service_charge).toLocaleString() : '-'}</td>
            <td><span class="badge-status ${statusBadge}">${s.service_status || 'Pending'}</span></td>
            <td class="actions">
                <button class="btn-icon edit" onclick="editService('${s.id}')" title="Edit"><i class="bi bi-pencil"></i></button>
                <button class="btn-icon delete" onclick="deleteService('${s.id}')" title="Delete"><i class="bi bi-trash"></i></button>
            </td>
        </tr>`;
    });
}

document.getElementById('searchInput')?.addEventListener('input', function(e) {
    const term = e.target.value.toLowerCase();
    renderTable(allServices.filter(s =>
        (s.customer_name && s.customer_name.toLowerCase().includes(term)) ||
        (s.request_type && s.request_type.toLowerCase().includes(term)) ||
        (s.service_status && s.service_status.toLowerCase().includes(term)) ||
        (s.technician_name && s.technician_name.toLowerCase().includes(term))
    ));
});

async function _loadDropdowns() {
    customersData = (await getDocs(collection(db, "customers"))).docs.map(d => ({ id: d.id, ...d.data() }));
    const custSel = document.getElementById("customer_id");
    if (custSel) {
        custSel.innerHTML = '<option value="">Select Customer</option>';
        customersData.forEach(c => { custSel.innerHTML += `<option value="${c.id}">${c.full_name}</option>`; });
    }
}

loadServices();

async function showForm() {
    editingService = null;
    document.getElementById("modalTitle").innerHTML = '<i class="bi bi-plus-circle"></i> Add Service Request';
    await _loadDropdowns();
    document.getElementById("serviceModal").style.display = "flex";
    document.body.style.overflow = "hidden";
}

function closeModal() {
    document.getElementById("serviceModal").style.display = "none";
    document.body.style.overflow = "auto";
    editingService = null;
}

async function saveService() {
    if (editingService) return updateService();
    const customerId = document.getElementById("customer_id")?.value;
    if (!customerId) { if (window.showToast) window.showToast('Please select a customer', 'warning'); return; }
    const customer = customersData.find(c => c.id === customerId);
    try {
        await createDoc("service_requests", {
            customer_id:       customerId,
            customer_name:     customer?.full_name || "",
            request_type:      document.getElementById("request_type")?.value?.trim() || "",
            request_date:      document.getElementById("request_date")?.value || null,
            issue_description: document.getElementById("issue_description")?.value?.trim() || "",
            service_status:    document.getElementById("service_status")?.value || "Pending",
            technician_name:   document.getElementById("technician_name")?.value?.trim() || null,
            service_charge:    document.getElementById("service_charge")?.value ? parseFloat(document.getElementById("service_charge").value) : null,
            completed_date:    document.getElementById("completed_date")?.value || null
        });
        if (window.showToast) window.showToast('Service request added');
        closeModal();
        loadServices();
    } catch (err) {
        console.error(err);
        if (window.showToast) window.showToast('Error adding service request', 'error');
    }
}

async function editService(id) {
    editingService = id;
    document.getElementById("modalTitle").innerHTML = '<i class="bi bi-pencil-square"></i> Edit Service Request';
    await _loadDropdowns();
    const s = allServices.find(x => x.id === id);
    if (!s) return;
    if (document.getElementById("customer_id")) document.getElementById("customer_id").value = s.customer_id || "";
    if (document.getElementById("request_type")) document.getElementById("request_type").value = s.request_type || "";
    const rdEl = document.getElementById("request_date");
    if (rdEl) rdEl.value = s.request_date?.toDate ? s.request_date.toDate().toISOString().split('T')[0] : (s.request_date || "");
    if (document.getElementById("issue_description")) document.getElementById("issue_description").value = s.issue_description || "";
    if (document.getElementById("service_status")) document.getElementById("service_status").value = s.service_status || "Pending";
    if (document.getElementById("technician_name")) document.getElementById("technician_name").value = s.technician_name || "";
    if (document.getElementById("service_charge")) document.getElementById("service_charge").value = s.service_charge ?? "";
    const cdEl = document.getElementById("completed_date");
    if (cdEl) cdEl.value = s.completed_date?.toDate ? s.completed_date.toDate().toISOString().split('T')[0] : (s.completed_date || "");
    document.getElementById("serviceModal").style.display = "flex";
    document.body.style.overflow = "hidden";
}

async function updateService() {
    const customerId = document.getElementById("customer_id")?.value;
    const customer = customersData.find(c => c.id === customerId);
    try {
        await updateDocById("service_requests", editingService, {
            customer_id:       customerId,
            customer_name:     customer?.full_name || "",
            request_type:      document.getElementById("request_type")?.value?.trim() || "",
            request_date:      document.getElementById("request_date")?.value || null,
            issue_description: document.getElementById("issue_description")?.value?.trim() || "",
            service_status:    document.getElementById("service_status")?.value || "Pending",
            technician_name:   document.getElementById("technician_name")?.value?.trim() || null,
            service_charge:    document.getElementById("service_charge")?.value ? parseFloat(document.getElementById("service_charge").value) : null,
            completed_date:    document.getElementById("completed_date")?.value || null
        });
        if (window.showToast) window.showToast('Service request updated');
        closeModal();
        loadServices();
    } catch (err) {
        console.error(err);
        if (window.showToast) window.showToast('Error updating service request', 'error');
    }
}

async function deleteService(id) {
    if (!confirm("Delete this service request?")) return;
    try {
        await deleteDocById("service_requests", id);
        if (window.showToast) window.showToast('Service request deleted');
        loadServices();
    } catch (err) {
        console.error(err);
        if (window.showToast) window.showToast('Error deleting service request', 'error');
    }
}

window.showForm = showForm;
window.closeModal = closeModal;
window.saveService = saveService;
window.editService = editService;
window.deleteService = deleteService;