// Phase 10 — maintenance.js migrated to Firestore
import { fetchAll, createDoc, updateDocById, deleteDocById, db } from "./firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

let editingMaintenance = null;
let allMaintenance = [];
let customersData = [];
let productsData = [];

async function loadMaintenance() {
    try {
        allMaintenance = await fetchAll("maintenance");
        renderTable(allMaintenance);
    } catch (err) {
        console.error(err);
        if (window.showToast) window.showToast('Failed to load maintenance records', 'error');
    }
}

function renderTable(data) {
    const table = document.getElementById("maintenanceTable");
    if (!table) return;
    table.innerHTML = "";
    if (data.length === 0) {
        table.innerHTML = `<tr class="empty-row"><td colspan="8"><div class="empty-state-content"><i class="bi bi-wrench-adjustable"></i><p>No maintenance records found.</p></div></td></tr>`;
        return;
    }
    data.forEach(m => {
        const statusBadge = m.status === "Completed" ? "badge-success" : m.status === "Cancelled" ? "badge-danger" : "badge-warning";
        const mDate = m.maintenance_date?.toDate ? m.maintenance_date.toDate().toLocaleDateString('en-IN')
                    : (m.maintenance_date ? String(m.maintenance_date).split('T')[0] : '-');
        table.innerHTML += `
        <tr>
            <td style="font-weight:500;">${m.customer_name || '-'}</td>
            <td>${m.product_name || '-'}</td>
            <td>${m.maintenance_type || '-'}</td>
            <td>${mDate}</td>
            <td>${m.technician_name || 'Unassigned'}</td>
            <td><span class="badge-status ${statusBadge}">${m.status || 'Pending'}</span></td>
            <td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${m.remarks || '-'}</td>
            <td class="actions">
                <button class="btn-icon edit" onclick="editMaintenance('${m.id}')" title="Edit"><i class="bi bi-pencil"></i></button>
                <button class="btn-icon delete" onclick="deleteMaintenance('${m.id}')" title="Delete"><i class="bi bi-trash"></i></button>
            </td>
        </tr>`;
    });
}

document.getElementById('searchInput')?.addEventListener('input', function(e) {
    const term = e.target.value.toLowerCase();
    renderTable(allMaintenance.filter(m =>
        (m.customer_name && m.customer_name.toLowerCase().includes(term)) ||
        (m.technician_name && m.technician_name.toLowerCase().includes(term)) ||
        (m.status && m.status.toLowerCase().includes(term))
    ));
});

async function _loadDropdowns() {
    customersData = (await getDocs(collection(db, "customers"))).docs.map(d => ({ id: d.id, ...d.data() }));
    const custSel = document.getElementById("customer_id");
    if (custSel) {
        custSel.innerHTML = '<option value="">Select Customer</option>';
        customersData.forEach(c => { custSel.innerHTML += `<option value="${c.id}">${c.full_name}</option>`; });
    }
    productsData = (await getDocs(collection(db, "products"))).docs.map(d => ({ id: d.id, ...d.data() }));
    const prodSel = document.getElementById("product_id");
    if (prodSel) {
        prodSel.innerHTML = '<option value="">Select Product</option>';
        productsData.forEach(p => { prodSel.innerHTML += `<option value="${p.id}">${p.product_name}</option>`; });
    }
}

loadMaintenance();

async function showForm() {
    editingMaintenance = null;
    document.getElementById("modalTitle").innerHTML = '<i class="bi bi-plus-circle"></i> Add Maintenance Record';
    await _loadDropdowns();
    document.getElementById("maintenanceModal").style.display = "flex";
    document.body.style.overflow = "hidden";
}

function closeModal() {
    document.getElementById("maintenanceModal").style.display = "none";
    document.body.style.overflow = "auto";
    editingMaintenance = null;
}

async function saveMaintenance() {
    if (editingMaintenance) return updateMaintenance();
    const customerId = document.getElementById("customer_id")?.value;
    if (!customerId) { if (window.showToast) window.showToast('Please select a customer', 'warning'); return; }
    const customer = customersData.find(c => c.id === customerId);
    const productId = document.getElementById("product_id")?.value;
    const product = productsData.find(p => p.id === productId);
    try {
        await createDoc("maintenance", {
            customer_id:      customerId,
            customer_name:    customer?.full_name || "",
            product_id:       productId || null,
            product_name:     product?.product_name || null,
            maintenance_date: document.getElementById("maintenance_date")?.value || null,
            maintenance_type: document.getElementById("maintenance_type")?.value?.trim() || "",
            technician_name:  document.getElementById("technician_name")?.value?.trim() || null,
            status:           document.getElementById("status")?.value || "Pending",
            remarks:          document.getElementById("remarks")?.value?.trim() || null
        });
        if (window.showToast) window.showToast('Maintenance record added');
        closeModal();
        loadMaintenance();
    } catch (err) {
        console.error(err);
        if (window.showToast) window.showToast('Error saving maintenance record', 'error');
    }
}

async function editMaintenance(id) {
    editingMaintenance = id;
    document.getElementById("modalTitle").innerHTML = '<i class="bi bi-pencil-square"></i> Edit Maintenance';
    await _loadDropdowns();
    const m = allMaintenance.find(x => x.id === id);
    if (!m) return;
    if (document.getElementById("customer_id")) document.getElementById("customer_id").value = m.customer_id || "";
    if (document.getElementById("product_id")) document.getElementById("product_id").value = m.product_id || "";
    const mDateEl = document.getElementById("maintenance_date");
    if (mDateEl) {
        const d = m.maintenance_date?.toDate ? m.maintenance_date.toDate().toISOString().split('T')[0] : (m.maintenance_date || "");
        mDateEl.value = d;
    }
    if (document.getElementById("maintenance_type")) document.getElementById("maintenance_type").value = m.maintenance_type || "";
    if (document.getElementById("technician_name")) document.getElementById("technician_name").value = m.technician_name || "";
    if (document.getElementById("status")) document.getElementById("status").value = m.status || "Pending";
    if (document.getElementById("remarks")) document.getElementById("remarks").value = m.remarks || "";
    document.getElementById("maintenanceModal").style.display = "flex";
    document.body.style.overflow = "hidden";
}

async function updateMaintenance() {
    const customerId = document.getElementById("customer_id")?.value;
    const productId  = document.getElementById("product_id")?.value;
    const customer   = customersData.find(c => c.id === customerId);
    const product    = productsData.find(p => p.id === productId);
    try {
        await updateDocById("maintenance", editingMaintenance, {
            customer_id:      customerId,
            customer_name:    customer?.full_name || "",
            product_id:       productId || null,
            product_name:     product?.product_name || null,
            maintenance_date: document.getElementById("maintenance_date")?.value || null,
            maintenance_type: document.getElementById("maintenance_type")?.value?.trim() || "",
            technician_name:  document.getElementById("technician_name")?.value?.trim() || null,
            status:           document.getElementById("status")?.value || "Pending",
            remarks:          document.getElementById("remarks")?.value?.trim() || null
        });
        if (window.showToast) window.showToast('Maintenance record updated');
        closeModal();
        loadMaintenance();
    } catch (err) {
        console.error(err);
        if (window.showToast) window.showToast('Error updating maintenance record', 'error');
    }
}

async function deleteMaintenance(id) {
    if (!confirm("Delete this maintenance record?")) return;
    try {
        await deleteDocById("maintenance", id);
        if (window.showToast) window.showToast('Maintenance record deleted');
        loadMaintenance();
    } catch (err) {
        console.error(err);
        if (window.showToast) window.showToast('Error deleting record', 'error');
    }
}

window.showForm = showForm;
window.closeModal = closeModal;
window.saveMaintenance = saveMaintenance;
window.editMaintenance = editMaintenance;
window.deleteMaintenance = deleteMaintenance;