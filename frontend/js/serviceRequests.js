// Note: token is handled in auth.js
let editingService = null;
let allServices = [];

async function loadServices() {
    try {
        const response = await fetch(window.API_BASE_URL + "/service-requests", {
            headers: { Authorization: "Bearer " + token }
        });

        const result = await response.json();
        allServices = result.data || [];
        renderTable(allServices);
    } catch (err) {
        console.error(err);
        if(window.showToast) window.showToast('Failed to load service requests', 'error');
    }
}

function renderTable(data) {
    const table = document.getElementById("serviceTable");
    table.innerHTML = "";

    if (data.length === 0) {
        table.innerHTML = `
            <tr class="empty-row">
                <td colspan="8">
                    <div class="empty-state-content">
                        <i class="bi bi-headset"></i>
                        <p>No service requests found.</p>
                    </div>
                </td>
            </tr>`;
        return;
    }

    data.forEach(service => {
        let statusBadge = "badge-info";
        if (service.status === "Completed") statusBadge = "badge-success";
        else if (service.status === "Open") statusBadge = "badge-primary";
        else if (service.status === "Cancelled") statusBadge = "badge-error";
        else if (service.status === "In Progress") statusBadge = "badge-warning";

        let rDate = service.request_date;
        if(rDate && rDate.includes('T')) rDate = rDate.split('T')[0];

        const customerDisplay = service.customer_name || service.full_name || 'Unknown Customer';

        table.innerHTML += `
        <tr>
            <td class="id-column">#${service.id}</td>
            <td style="font-weight: 500;">${customerDisplay}</td>
            <td>${service.request_type || '-'}</td>
            <td>${rDate || '-'}</td>
            <td><span class="badge-status ${statusBadge}">${service.status || 'Open'}</span></td>
            <td>${service.technician_name || 'Unassigned'}</td>
            <td>₹${(service.service_charge || 0).toLocaleString()}</td>
            <td class="actions">
                <button class="btn-icon edit" onclick="editService(${service.id})" title="Edit">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn-icon delete" onclick="deleteService(${service.id})" title="Delete">
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
    const filtered = allServices.filter(s => 
        (s.customer_name && s.customer_name.toLowerCase().includes(term)) ||
        (s.full_name && s.full_name.toLowerCase().includes(term)) ||
        (s.request_type && s.request_type.toLowerCase().includes(term)) ||
        (s.status && s.status.toLowerCase().includes(term))
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
}

loadServices();

async function showForm() {
    document.getElementById("modalTitle").innerHTML = '<i class="bi bi-plus-circle"></i> Create Service Request';
    await loadDropdowns();
    document.getElementById("serviceModal").style.display = "flex";
    document.body.style.overflow = "hidden";
    
    document.getElementById("request_date").valueAsDate = new Date();
}

function closeModal() {
    document.getElementById("serviceModal").style.display = "none";
    document.body.style.overflow = "auto";
    
    document.getElementById("customer_id").value = "";
    document.getElementById("request_type").value = "Repair";
    document.getElementById("request_date").value = "";
    document.getElementById("issue_description").value = "";
    document.getElementById("service_status").value = "Open";
    document.getElementById("technician_name").value = "";
    document.getElementById("service_charge").value = "0";
    document.getElementById("completed_date").value = "";
    
    editingService = null;
}

async function saveService() {
    if (editingService) {
        return updateService();
    }

    const customer_id = document.getElementById("customer_id").value;
    const request_type = document.getElementById("request_type").value;
    const req_date = document.getElementById("request_date").value;
    const desc = document.getElementById("issue_description").value;

    if (!customer_id || !request_type || !req_date || !desc) {
        if(window.showToast) window.showToast('Please fill all required fields', 'warning');
        return;
    }

    const service = {
        customer_id: customer_id,
        request_type: request_type,
        request_date: req_date,
        issue_description: desc,
        status: document.getElementById("service_status").value,
        technician_name: document.getElementById("technician_name").value,
        service_charge: document.getElementById("service_charge").value || 0,
        completed_date: document.getElementById("completed_date").value || null
    };

    try {
        const response = await fetch(window.API_BASE_URL + "/service-requests", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + token
            },
            body: JSON.stringify(service)
        });

        const result = await response.json();

        if (result.success) {
            if(window.showToast) window.showToast('Service Request created successfully');
            closeModal();
            loadServices();
        } else {
            if(window.showToast) window.showToast(result.message, 'error');
        }
    } catch(err) {
        console.error(err);
        if(window.showToast) window.showToast('Connection error', 'error');
    }
}

async function editService(id) {
    editingService = id;
    document.getElementById("modalTitle").innerHTML = '<i class="bi bi-pencil-square"></i> Edit Service Request';
    
    await loadDropdowns();
    
    const svc = allServices.find(s => s.id === id);
    if(!svc) return;

    document.getElementById("customer_id").value = svc.customer_id;
    document.getElementById("request_type").value = svc.request_type || "Repair";
    
    let rd = svc.request_date;
    if(rd && rd.includes('T')) rd = rd.split('T')[0];
    document.getElementById("request_date").value = rd;
    
    document.getElementById("issue_description").value = svc.issue_description || "";
    document.getElementById("service_status").value = svc.status || "Open";
    document.getElementById("technician_name").value = svc.technician_name || "";
    document.getElementById("service_charge").value = svc.service_charge || "0";
    
    let cd = svc.completed_date;
    if(cd && cd.includes('T')) cd = cd.split('T')[0];
    document.getElementById("completed_date").value = cd || "";

    document.getElementById("serviceModal").style.display = "flex";
    document.body.style.overflow = "hidden";
}

async function updateService() {
    const customer_id = document.getElementById("customer_id").value;
    const request_type = document.getElementById("request_type").value;
    const req_date = document.getElementById("request_date").value;
    const desc = document.getElementById("issue_description").value;

    if (!customer_id || !request_type || !req_date || !desc) {
        if(window.showToast) window.showToast('Please fill all required fields', 'warning');
        return;
    }

    const service = {
        customer_id: customer_id,
        request_type: request_type,
        request_date: req_date,
        issue_description: desc,
        status: document.getElementById("service_status").value,
        technician_name: document.getElementById("technician_name").value,
        service_charge: document.getElementById("service_charge").value || 0,
        completed_date: document.getElementById("completed_date").value || null
    };

    try {
        const response = await fetch(`${window.API_BASE_URL}/service-requests/${editingService}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + token
            },
            body: JSON.stringify(service)
        });

        const result = await response.json();

        if (result.success) {
            if(window.showToast) window.showToast('Service Request updated successfully');
            closeModal();
            loadServices();
        } else {
            if(window.showToast) window.showToast(result.message, 'error');
        }
    } catch(err) {
        console.error(err);
        if(window.showToast) window.showToast('Connection error', 'error');
    }
}

async function deleteService(id) {
    if (!confirm("Are you sure you want to delete this service request?")) return;

    try {
        const response = await fetch(`${window.API_BASE_URL}/service-requests/${id}`, {
            method: "DELETE",
            headers: { Authorization: "Bearer " + token }
        });

        const result = await response.json();

        if (result.success) {
            if(window.showToast) window.showToast('Service Request deleted successfully');
            loadServices();
        } else {
            if(window.showToast) window.showToast(result.message, 'error');
        }
    } catch(err) {
        console.error(err);
        if(window.showToast) window.showToast('Connection error', 'error');
    }
}