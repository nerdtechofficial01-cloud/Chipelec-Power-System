// Note: token is handled in auth.js
let editingMaintenance = null;
let allMaintenance = [];

async function loadMaintenance() {
    try {
        const response = await fetch(window.API_BASE_URL + "/maintenance", {
            headers: { Authorization: "Bearer " + token }
        });

        const result = await response.json();
        allMaintenance = result.data || [];
        renderTable(allMaintenance);
    } catch (err) {
        console.error(err);
        if(window.showToast) window.showToast('Failed to load maintenance records', 'error');
    }
}

function renderTable(data) {
    const table = document.getElementById("maintenanceTable");
    table.innerHTML = "";

    if (data.length === 0) {
        table.innerHTML = `
            <tr class="empty-row">
                <td colspan="8">
                    <div class="empty-state-content">
                        <i class="bi bi-wrench-adjustable"></i>
                        <p>No maintenance records found.</p>
                    </div>
                </td>
            </tr>`;
        return;
    }

    data.forEach(m => {
        let statusBadge = "badge-warning";
        if (m.status === "Completed") statusBadge = "badge-success";
        else if (m.status === "Pending") statusBadge = "badge-info";

        let mDate = m.maintenance_date;
        if(mDate && mDate.includes('T')) mDate = mDate.split('T')[0];

        const customerDisplay = m.customer_name || m.full_name || 'Unknown Customer';

        table.innerHTML += `
        <tr>
            <td class="id-column">#${m.id}</td>
            <td style="font-weight: 500;">${customerDisplay}</td>
            <td>${m.product_name || '-'}</td>
            <td>${mDate || '-'}</td>
            <td><span class="badge-status badge-primary">${m.maintenance_type || '-'}</span></td>
            <td>${m.technician_name || 'Unassigned'}</td>
            <td><span class="badge-status ${statusBadge}">${m.status || 'Pending'}</span></td>
            <td class="actions">
                <button class="btn-icon edit" onclick="editMaintenance(${m.id})" title="Edit">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn-icon delete" onclick="deleteMaintenance(${m.id})" title="Delete">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        </tr>
        `;
    });
}

// Search functionality
document.getElementById('searchInput')?.addEventListener('input', function(e) {
    const term = e.target.value.toLowerCase();
    const filtered = allMaintenance.filter(m => 
        (m.customer_name && m.customer_name.toLowerCase().includes(term)) ||
        (m.full_name && m.full_name.toLowerCase().includes(term)) ||
        (m.product_name && m.product_name.toLowerCase().includes(term)) ||
        (m.status && m.status.toLowerCase().includes(term))
    );
    renderTable(filtered);
});

async function loadDropdowns() {
    try {
        const custResponse = await fetch(window.API_BASE_URL + "/customers", {
            headers: { Authorization: "Bearer " + token }
        });
        const custResult = await custResponse.json();
        const customerSelect = document.getElementById("customer_id");
        customerSelect.innerHTML = '<option value="">Select Customer</option>';
        if(custResult.data) {
            custResult.data.forEach(c => {
                customerSelect.innerHTML += `<option value="${c.id}">${c.full_name}</option>`;
            });
        }
    } catch(e) { console.error(e); }

    try {
        const prodResponse = await fetch(window.API_BASE_URL + "/products", {
            headers: { Authorization: "Bearer " + token }
        });
        const prodResult = await prodResponse.json();
        const productSelect = document.getElementById("product_id");
        productSelect.innerHTML = '<option value="">Select Product</option>';
        if(prodResult.data) {
            prodResult.data.forEach(p => {
                productSelect.innerHTML += `<option value="${p.id}">${p.product_name}</option>`;
            });
        }
    } catch(e) { console.error(e); }
}

loadMaintenance();

async function showForm() {
    document.getElementById("modalTitle").innerHTML = '<i class="bi bi-plus-circle"></i> Schedule Maintenance';
    await loadDropdowns();
    document.getElementById("maintenanceModal").style.display = "flex";
    document.body.style.overflow = "hidden";
    
    document.getElementById("maintenance_date").valueAsDate = new Date();
}

function closeModal() {
    document.getElementById("maintenanceModal").style.display = "none";
    document.body.style.overflow = "auto";
    
    document.getElementById("customer_id").value = "";
    document.getElementById("product_id").value = "";
    document.getElementById("maintenance_date").value = "";
    document.getElementById("maintenance_type").value = "Routine";
    document.getElementById("technician_name").value = "";
    document.getElementById("status").value = "Pending";
    document.getElementById("remarks").value = "";
    
    editingMaintenance = null;
}

async function saveMaintenance() {
    if (editingMaintenance) {
        return updateMaintenance();
    }

    const customer_id = document.getElementById("customer_id").value;
    const product_id = document.getElementById("product_id").value;
    const m_date = document.getElementById("maintenance_date").value;
    const m_type = document.getElementById("maintenance_type").value;

    if (!customer_id || !product_id || !m_date || !m_type) {
        if(window.showToast) window.showToast('Please fill all required fields', 'warning');
        return;
    }

    const maintenance = {
        customer_id: customer_id,
        product_id: product_id,
        maintenance_date: m_date,
        maintenance_type: m_type,
        technician_name: document.getElementById("technician_name").value,
        status: document.getElementById("status").value,
        remarks: document.getElementById("remarks").value
    };

    try {
        const response = await fetch(window.API_BASE_URL + "/maintenance", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + token
            },
            body: JSON.stringify(maintenance)
        });

        const result = await response.json();

        if (result.success) {
            if(window.showToast) window.showToast('Maintenance record saved successfully');
            closeModal();
            loadMaintenance();
        } else {
            if(window.showToast) window.showToast(result.message, 'error');
        }
    } catch(err) {
        console.error(err);
        if(window.showToast) window.showToast('Connection error', 'error');
    }
}

async function editMaintenance(id) {
    editingMaintenance = id;
    document.getElementById("modalTitle").innerHTML = '<i class="bi bi-pencil-square"></i> Edit Maintenance';
    
    await loadDropdowns();
    
    const m = allMaintenance.find(x => x.id === id);
    if(!m) return;

    document.getElementById("customer_id").value = m.customer_id;
    document.getElementById("product_id").value = m.product_id;
    
    let md = m.maintenance_date;
    if(md && md.includes('T')) md = md.split('T')[0];
    document.getElementById("maintenance_date").value = md;
    
    document.getElementById("maintenance_type").value = m.maintenance_type || "Routine";
    document.getElementById("technician_name").value = m.technician_name || "";
    document.getElementById("status").value = m.status || "Pending";
    document.getElementById("remarks").value = m.remarks || "";

    document.getElementById("maintenanceModal").style.display = "flex";
    document.body.style.overflow = "hidden";
}

async function updateMaintenance() {
    const customer_id = document.getElementById("customer_id").value;
    const product_id = document.getElementById("product_id").value;
    const m_date = document.getElementById("maintenance_date").value;
    const m_type = document.getElementById("maintenance_type").value;

    if (!customer_id || !product_id || !m_date || !m_type) {
        if(window.showToast) window.showToast('Please fill all required fields', 'warning');
        return;
    }

    const maintenance = {
        customer_id: customer_id,
        product_id: product_id,
        maintenance_date: m_date,
        maintenance_type: m_type,
        technician_name: document.getElementById("technician_name").value,
        status: document.getElementById("status").value,
        remarks: document.getElementById("remarks").value
    };

    try {
        const response = await fetch(`${window.API_BASE_URL}/maintenance/${editingMaintenance}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + token
            },
            body: JSON.stringify(maintenance)
        });

        const result = await response.json();

        if (result.success) {
            if(window.showToast) window.showToast('Maintenance record updated successfully');
            closeModal();
            loadMaintenance();
        } else {
            if(window.showToast) window.showToast(result.message, 'error');
        }
    } catch(err) {
        console.error(err);
        if(window.showToast) window.showToast('Connection error', 'error');
    }
}

async function deleteMaintenance(id) {
    if (!confirm("Are you sure you want to delete this maintenance record?")) return;

    try {
        const response = await fetch(`${window.API_BASE_URL}/maintenance/${id}`, {
            method: "DELETE",
            headers: { Authorization: "Bearer " + token }
        });

        const result = await response.json();

        if (result.success) {
            if(window.showToast) window.showToast('Maintenance record deleted successfully');
            loadMaintenance();
        } else {
            if(window.showToast) window.showToast(result.message, 'error');
        }
    } catch(err) {
        console.error(err);
        if(window.showToast) window.showToast('Connection error', 'error');
    }
}