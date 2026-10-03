// Note: token is handled in auth.js
let editingInstallation = null;
let allInstallations = [];

async function loadInstallations() {
    try {
        const response = await fetch(window.API_BASE_URL + "/installations", {
            headers: { Authorization: "Bearer " + token }
        });

        const result = await response.json();
        allInstallations = result.data || [];
        renderTable(allInstallations);
    } catch (err) {
        console.error(err);
        if(window.showToast) window.showToast('Failed to load installations', 'error');
    }
}

function renderTable(data) {
    const table = document.getElementById("installationTable");
    table.innerHTML = "";

    if (data.length === 0) {
        table.innerHTML = `
            <tr class="empty-row">
                <td colspan="6">
                    <div class="empty-state-content">
                        <i class="bi bi-tools"></i>
                        <p>No installations found.</p>
                    </div>
                </td>
            </tr>`;
        return;
    }

    data.forEach(inst => {
        let statusBadge = "badge-info";
        if (inst.status === "Completed") statusBadge = "badge-success";
        else if (inst.status === "Scheduled") statusBadge = "badge-primary";
        else if (inst.status === "Cancelled") statusBadge = "badge-error";

        // Handle date formatting
        let instDate = inst.installation_date;
        if(instDate && instDate.includes('T')) {
            instDate = instDate.split('T')[0];
        }

        // Bug Fix: Customer Name not showing. API might return customer_name or full_name
        const customerDisplay = inst.customer_name || inst.full_name || 'Unknown Customer';

        table.innerHTML += `
        <tr>
            <td style="font-weight: 500;">${customerDisplay}</td>
            <td>${inst.product_name || '-'}</td>
            <td>${instDate || '-'}</td>
            <td>${inst.technician_name || 'Unassigned'}</td>
            <td><span class="badge-status ${statusBadge}">${inst.status || 'Scheduled'}</span></td>
            <td class="actions">
                <button class="btn-icon edit" onclick="editInstallation(${inst.id})" title="Edit">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn-icon delete" onclick="deleteInstallation(${inst.id})" title="Delete">
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
    const filtered = allInstallations.filter(i => 
        (i.customer_name && i.customer_name.toLowerCase().includes(term)) ||
        (i.full_name && i.full_name.toLowerCase().includes(term)) ||
        (i.product_name && i.product_name.toLowerCase().includes(term)) ||
        (i.technician_name && i.technician_name.toLowerCase().includes(term)) ||
        (i.status && i.status.toLowerCase().includes(term))
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

loadInstallations();

async function showForm() {
    document.getElementById("modalTitle").innerHTML = '<i class="bi bi-plus-circle"></i> Schedule Installation';
    await loadDropdowns();
    document.getElementById("installationModal").style.display = "flex";
    document.body.style.overflow = "hidden";
    
    // Set today's date by default
    document.getElementById("installation_date").valueAsDate = new Date();
}

function closeModal() {
    document.getElementById("installationModal").style.display = "none";
    document.body.style.overflow = "auto";
    
    document.getElementById("customer_id").value = "";
    document.getElementById("product_id").value = "";
    document.getElementById("installation_date").value = "";
    document.getElementById("technician_name").value = "";
    document.getElementById("installation_status").value = "Scheduled";
    document.getElementById("installation_address").value = "";
    document.getElementById("remarks").value = "";
    
    editingInstallation = null;
}

async function saveInstallation() {
    if (editingInstallation) {
        return updateInstallation();
    }

    const customer_id = document.getElementById("customer_id").value;
    const product_id = document.getElementById("product_id").value;
    const inst_date = document.getElementById("installation_date").value;
    const tech_name = document.getElementById("technician_name").value;
    const address = document.getElementById("installation_address").value;

    if (!customer_id || !product_id || !inst_date || !tech_name || !address) {
        if(window.showToast) window.showToast('Please fill all required fields', 'warning');
        return;
    }

    const installation = {
        customer_id: customer_id,
        product_id: product_id,
        installation_date: inst_date,
        technician_name: tech_name,
        status: document.getElementById("installation_status").value,
        installation_address: address,
        remarks: document.getElementById("remarks").value
    };

    try {
        const response = await fetch(window.API_BASE_URL + "/installations", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + token
            },
            body: JSON.stringify(installation)
        });

        const result = await response.json();

        if (result.success) {
            if(window.showToast) window.showToast('Installation scheduled successfully');
            closeModal();
            loadInstallations();
        } else {
            if(window.showToast) window.showToast(result.message, 'error');
        }
    } catch(err) {
        console.error(err);
        if(window.showToast) window.showToast('Connection error', 'error');
    }
}

async function editInstallation(id) {
    editingInstallation = id;
    document.getElementById("modalTitle").innerHTML = '<i class="bi bi-pencil-square"></i> Edit Installation';
    
    await loadDropdowns();
    
    const inst = allInstallations.find(i => i.id === id);
    if(!inst) return;

    document.getElementById("customer_id").value = inst.customer_id;
    document.getElementById("product_id").value = inst.product_id;
    
    let d = inst.installation_date;
    if(d && d.includes('T')) d = d.split('T')[0];
    document.getElementById("installation_date").value = d;
    
    document.getElementById("technician_name").value = inst.technician_name || "";
    document.getElementById("installation_status").value = inst.status || "Scheduled";
    document.getElementById("installation_address").value = inst.installation_address || "";
    document.getElementById("remarks").value = inst.remarks || "";

    document.getElementById("installationModal").style.display = "flex";
    document.body.style.overflow = "hidden";
}

async function updateInstallation() {
    const customer_id = document.getElementById("customer_id").value;
    const product_id = document.getElementById("product_id").value;
    const inst_date = document.getElementById("installation_date").value;
    const tech_name = document.getElementById("technician_name").value;
    const address = document.getElementById("installation_address").value;

    if (!customer_id || !product_id || !inst_date || !tech_name || !address) {
        if(window.showToast) window.showToast('Please fill all required fields', 'warning');
        return;
    }

    const installation = {
        customer_id: customer_id,
        product_id: product_id,
        installation_date: inst_date,
        technician_name: tech_name,
        status: document.getElementById("installation_status").value,
        installation_address: address,
        remarks: document.getElementById("remarks").value
    };

    try {
        const response = await fetch(`${window.API_BASE_URL}/installations/${editingInstallation}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + token
            },
            body: JSON.stringify(installation)
        });

        const result = await response.json();

        if (result.success) {
            if(window.showToast) window.showToast('Installation updated successfully');
            closeModal();
            loadInstallations();
        } else {
            if(window.showToast) window.showToast(result.message, 'error');
        }
    } catch(err) {
        console.error(err);
        if(window.showToast) window.showToast('Connection error', 'error');
    }
}

async function deleteInstallation(id) {
    if (!confirm("Are you sure you want to delete this installation record?")) return;

    try {
        const response = await fetch(`${window.API_BASE_URL}/installations/${id}`, {
            method: "DELETE",
            headers: { Authorization: "Bearer " + token }
        });

        const result = await response.json();

        if (result.success) {
            if(window.showToast) window.showToast('Installation deleted successfully');
            loadInstallations();
        } else {
            if(window.showToast) window.showToast(result.message, 'error');
        }
    } catch(err) {
        console.error(err);
        if(window.showToast) window.showToast('Connection error', 'error');
    }
}