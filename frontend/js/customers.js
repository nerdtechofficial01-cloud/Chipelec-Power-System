// Phase 8 — customers.js migrated to Firestore
import { fetchAll, updateDocById, deleteDocById, db } from "./firebase-config.js";
import { collection, getDocs, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

let editingCustomer = null;
let allCustomers = [];

async function loadCustomers() {
    try {
        allCustomers = await fetchAll("customers");
        renderTable(allCustomers);
    } catch (err) {
        console.error(err);
        if (window.showToast) window.showToast('Failed to load customers', 'error');
    }
}

function renderTable(data) {
    const table = document.getElementById("customerTable");
    table.innerHTML = "";
    if (data.length === 0) {
        table.innerHTML = `<tr class="empty-row"><td colspan="7"><div class="empty-state-content"><i class="bi bi-people"></i><p>No customers found.</p></div></td></tr>`;
        return;
    }
    data.forEach(customer => {
        table.innerHTML += `
        <tr>
            <td class="id-column">#${customer.id.substring(0, 6)}</td>
            <td style="font-weight:500;">
                <div style="display:flex;align-items:center;gap:10px;">
                    <div style="width:32px;height:32px;background:rgba(99,102,241,0.1);color:var(--primary);border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;">
                        ${(customer.full_name || '?').charAt(0).toUpperCase()}
                    </div>
                    ${customer.full_name || '-'}
                </div>
            </td>
            <td>${customer.phone || '-'}</td>
            <td>${customer.email || '-'}</td>
            <td>${customer.city || '-'}</td>
            <td>${customer.state || '-'}</td>
            <td class="actions">
                <button class="btn-icon edit" onclick="editCustomer('${customer.id}')" title="Edit"><i class="bi bi-pencil"></i></button>
                <button class="btn-icon delete" onclick="deleteCustomer('${customer.id}')" title="Delete"><i class="bi bi-trash"></i></button>
            </td>
        </tr>`;
    });
}

document.getElementById('searchInput')?.addEventListener('input', function(e) {
    const term = e.target.value.toLowerCase();
    renderTable(allCustomers.filter(c =>
        (c.full_name && c.full_name.toLowerCase().includes(term)) ||
        (c.phone && c.phone.toLowerCase().includes(term)) ||
        (c.email && c.email.toLowerCase().includes(term)) ||
        (c.city && c.city.toLowerCase().includes(term))
    ));
});

loadCustomers();

function showForm() {
    editingCustomer = null;
    document.getElementById("modalTitle").innerHTML = '<i class="bi bi-person-plus"></i> Add New Customer';
    document.getElementById("customerModal").style.display = "flex";
    document.body.style.overflow = "hidden";
}

function closeModal() {
    document.getElementById("customerModal").style.display = "none";
    document.body.style.overflow = "auto";
    ["full_name","email","phone","address","city","state","pincode"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
    editingCustomer = null;
}

async function saveCustomer() {
    if (editingCustomer) return updateCustomer();

    const name = document.getElementById("full_name").value.trim();
    const phone = document.getElementById("phone").value.trim();
    if (!name || !phone) {
        if (window.showToast) window.showToast('Name and Phone are required', 'warning');
        return;
    }

    const customer = {
        full_name: name,
        email:     document.getElementById("email").value.trim() || null,
        phone:     phone,
        address:   document.getElementById("address").value.trim() || null,
        city:      document.getElementById("city").value.trim() || null,
        state:     document.getElementById("state").value.trim() || null,
        pincode:   document.getElementById("pincode").value.trim() || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };

    try {
        // NOTE: Adding a customer here creates a Firestore profile only.
        // They will NOT be able to log in to the website until a Firebase Auth account is created.
        // To create a customer with login access, use the website's register page.
        await addDoc(collection(db, "customers"), customer);
        if (window.showToast) window.showToast('Customer added successfully');
        closeModal();
        loadCustomers();
    } catch (err) {
        console.error(err);
        if (window.showToast) window.showToast('Error adding customer: ' + err.message, 'error');
    }
}

function editCustomer(id) {
    editingCustomer = id;
    document.getElementById("modalTitle").innerHTML = '<i class="bi bi-pencil-square"></i> Edit Customer';
    const customer = allCustomers.find(c => c.id === id);
    if (!customer) return;
    document.getElementById("full_name").value = customer.full_name || "";
    document.getElementById("email").value = customer.email || "";
    document.getElementById("phone").value = customer.phone || "";
    document.getElementById("address").value = customer.address || "";
    document.getElementById("city").value = customer.city || "";
    document.getElementById("state").value = customer.state || "";
    document.getElementById("pincode").value = customer.pincode || "";
    document.getElementById("customerModal").style.display = "flex";
    document.body.style.overflow = "hidden";
}

async function updateCustomer() {
    const name = document.getElementById("full_name").value.trim();
    const phone = document.getElementById("phone").value.trim();
    if (!name || !phone) {
        if (window.showToast) window.showToast('Name and Phone are required', 'warning');
        return;
    }
    try {
        await updateDocById("customers", editingCustomer, {
            full_name: name,
            email:     document.getElementById("email").value.trim() || null,
            phone:     phone,
            address:   document.getElementById("address").value.trim() || null,
            city:      document.getElementById("city").value.trim() || null,
            state:     document.getElementById("state").value.trim() || null,
            pincode:   document.getElementById("pincode").value.trim() || null
        });
        if (window.showToast) window.showToast('Customer updated successfully');
        closeModal();
        loadCustomers();
    } catch (err) {
        console.error(err);
        if (window.showToast) window.showToast('Error updating customer', 'error');
    }
}

async function deleteCustomer(id) {
    if (!confirm("Are you sure you want to delete this customer?")) return;
    try {
        await deleteDocById("customers", id);
        if (window.showToast) window.showToast('Customer deleted successfully');
        loadCustomers();
    } catch (err) {
        console.error(err);
        if (window.showToast) window.showToast('Error deleting customer', 'error');
    }
}

window.showForm = showForm;
window.closeModal = closeModal;
window.saveCustomer = saveCustomer;
window.editCustomer = editCustomer;
window.deleteCustomer = deleteCustomer;