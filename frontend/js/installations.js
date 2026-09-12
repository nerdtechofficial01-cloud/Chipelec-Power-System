// Phase 10 — installations.js migrated to Firestore
import { fetchAll, createDoc, updateDocById, deleteDocById, db } from "./firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

let editingInstallation = null;
let allInstallations = [];
let customersData = [];
let productsData = [];

async function loadInstallations() {
    try {
        allInstallations = await fetchAll("installations");
        renderTable(allInstallations);
    } catch (err) {
        console.error(err);
        if (window.showToast) window.showToast('Failed to load installations', 'error');
    }
}

function renderTable(data) {
    const table = document.getElementById("installationTable");
    if (!table) return;
    table.innerHTML = "";
    if (data.length === 0) {
        table.innerHTML = `<tr class="empty-row"><td colspan="7"><div class="empty-state-content"><i class="bi bi-tools"></i><p>No installations found.</p></div></td></tr>`;
        return;
    }
    data.forEach(inst => {
        const statusBadge = inst.installation_status === "Completed" ? "badge-success" :
                            inst.installation_status === "Scheduled"  ? "badge-primary" :
                            inst.installation_status === "Cancelled"  ? "badge-danger"  : "badge-info";
        const instDate = inst.installation_date?.toDate
            ? inst.installation_date.toDate().toLocaleDateString('en-IN')
            : (inst.installation_date ? String(inst.installation_date).split('T')[0] : '-');
        const customerDisplay = inst.customer_name || '-';

        table.innerHTML += `
        <tr>
            <td style="font-weight:500;">${customerDisplay}</td>
            <td>${inst.product_name || '-'}</td>
            <td>${instDate}</td>
            <td>${inst.technician_name || 'Unassigned'}</td>
            <td>${inst.installation_address || '-'}</td>
            <td><span class="badge-status ${statusBadge}">${inst.installation_status || 'Pending'}</span></td>
            <td class="actions">
                <button class="btn-icon edit" onclick="editInstallation('${inst.id}')" title="Edit"><i class="bi bi-pencil"></i></button>
                <button class="btn-icon delete" onclick="deleteInstallation('${inst.id}')" title="Delete"><i class="bi bi-trash"></i></button>
            </td>
        </tr>`;
    });
}

document.getElementById('searchInput')?.addEventListener('input', function(e) {
    const term = e.target.value.toLowerCase();
    renderTable(allInstallations.filter(i =>
        (i.customer_name && i.customer_name.toLowerCase().includes(term)) ||
        (i.product_name && i.product_name.toLowerCase().includes(term)) ||
        (i.technician_name && i.technician_name.toLowerCase().includes(term)) ||
        (i.installation_status && i.installation_status.toLowerCase().includes(term))
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

loadInstallations();

async function showForm() {
    editingInstallation = null;
    document.getElementById("modalTitle").innerHTML = '<i class="bi bi-plus-circle"></i> Add Installation';
    await _loadDropdowns();
    document.getElementById("installationModal").style.display = "flex";
    document.body.style.overflow = "hidden";
}

function closeModal() {
    document.getElementById("installationModal").style.display = "none";
    document.body.style.overflow = "auto";
    editingInstallation = null;
}

async function saveInstallation() {
    if (editingInstallation) return updateInstallation();
    const customerId  = document.getElementById("customer_id")?.value;
    const productId   = document.getElementById("product_id")?.value;
    const instDate    = document.getElementById("installation_date")?.value;
    const techName    = document.getElementById("technician_name")?.value?.trim() || null;
    const address     = document.getElementById("installation_address")?.value?.trim() || "";
    const status      = document.getElementById("installation_status")?.value || "Pending";
    const remarks     = document.getElementById("remarks")?.value?.trim() || null;

    if (!customerId) { if (window.showToast) window.showToast('Please select a customer', 'warning'); return; }

    const customer = customersData.find(c => c.id === customerId);
    const product  = productsData.find(p => p.id === productId);

    try {
        await createDoc("installations", {
            customer_id:          customerId,
            customer_name:        customer?.full_name || "",
            product_id:           productId || null,
            product_name:         product?.product_name || null,
            installation_date:    instDate || null,
            technician_name:      techName,
            installation_address: address,
            installation_status:  status,
            remarks:              remarks
        });
        if (window.showToast) window.showToast('Installation added successfully');
        closeModal();
        loadInstallations();
    } catch (err) {
        console.error(err);
        if (window.showToast) window.showToast('Error adding installation', 'error');
    }
}

async function editInstallation(id) {
    editingInstallation = id;
    document.getElementById("modalTitle").innerHTML = '<i class="bi bi-pencil-square"></i> Edit Installation';
    await _loadDropdowns();
    const inst = allInstallations.find(i => i.id === id);
    if (!inst) return;

    if (document.getElementById("customer_id")) document.getElementById("customer_id").value = inst.customer_id || "";
    if (document.getElementById("product_id")) document.getElementById("product_id").value = inst.product_id || "";

    const instDateEl = document.getElementById("installation_date");
    if (instDateEl) {
        const d = inst.installation_date?.toDate ? inst.installation_date.toDate().toISOString().split('T')[0]
                                                  : (inst.installation_date || "");
        instDateEl.value = d;
    }
    if (document.getElementById("technician_name")) document.getElementById("technician_name").value = inst.technician_name || "";
    if (document.getElementById("installation_address")) document.getElementById("installation_address").value = inst.installation_address || "";
    if (document.getElementById("installation_status")) document.getElementById("installation_status").value = inst.installation_status || "Pending";
    if (document.getElementById("remarks")) document.getElementById("remarks").value = inst.remarks || "";

    document.getElementById("installationModal").style.display = "flex";
    document.body.style.overflow = "hidden";
}

async function updateInstallation() {
    const customerId = document.getElementById("customer_id")?.value;
    const productId  = document.getElementById("product_id")?.value;
    const instDate   = document.getElementById("installation_date")?.value;
    const customer   = customersData.find(c => c.id === customerId);
    const product    = productsData.find(p => p.id === productId);

    try {
        await updateDocById("installations", editingInstallation, {
            customer_id:          customerId,
            customer_name:        customer?.full_name || "",
            product_id:           productId || null,
            product_name:         product?.product_name || null,
            installation_date:    instDate || null,
            technician_name:      document.getElementById("technician_name")?.value?.trim() || null,
            installation_address: document.getElementById("installation_address")?.value?.trim() || "",
            installation_status:  document.getElementById("installation_status")?.value || "Pending",
            remarks:              document.getElementById("remarks")?.value?.trim() || null
        });
        if (window.showToast) window.showToast('Installation updated successfully');
        closeModal();
        loadInstallations();
    } catch (err) {
        console.error(err);
        if (window.showToast) window.showToast('Error updating installation', 'error');
    }
}

async function deleteInstallation(id) {
    if (!confirm("Delete this installation record?")) return;
    try {
        await deleteDocById("installations", id);
        if (window.showToast) window.showToast('Installation deleted');
        loadInstallations();
    } catch (err) {
        console.error(err);
        if (window.showToast) window.showToast('Error deleting installation', 'error');
    }
}

window.showForm = showForm;
window.closeModal = closeModal;
window.saveInstallation = saveInstallation;
window.editInstallation = editInstallation;
window.deleteInstallation = deleteInstallation;