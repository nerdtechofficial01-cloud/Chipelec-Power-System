// Note: token is handled in auth.js
let editingCustomer = null;
let allCustomers = [];

async function loadCustomers() {
    try {
        const response = await fetch(window.API_BASE_URL + "/customers", {
            headers: { Authorization: "Bearer " + token }
        });

        const result = await response.json();
        allCustomers = result.data || [];
        renderTable(allCustomers);
    } catch (err) {
        console.error(err);
        if(window.showToast) window.showToast('Failed to load customers', 'error');
    }
}

function renderTable(data) {
    const table = document.getElementById("customerTable");
    table.innerHTML = "";

    if (data.length === 0) {
        table.innerHTML = `
            <tr class="empty-row">
                <td colspan="7">
                    <div class="empty-state-content">
                        <i class="bi bi-people"></i>
                        <p>No customers found.</p>
                    </div>
                </td>
            </tr>`;
        return;
    }

    data.forEach(customer => {
        table.innerHTML += `
        <tr>
            <td class="id-column">#${customer.id}</td>
            <td style="font-weight: 500;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 32px; height: 32px; background: rgba(99,102,241,0.1); color: var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold;">
                        ${customer.full_name.charAt(0).toUpperCase()}
                    </div>
                    ${customer.full_name}
                </div>
            </td>
            <td>${customer.phone || '-'}</td>
            <td>${customer.email || '-'}</td>
            <td>${customer.city || '-'}</td>
            <td>${customer.state || '-'}</td>
            <td class="actions">
                <button class="btn-icon edit" onclick="editCustomer(${customer.id})" title="Edit">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn-icon delete" onclick="deleteCustomer(${customer.id})" title="Delete">
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
    const filtered = allCustomers.filter(c => 
        c.full_name.toLowerCase().includes(term) ||
        (c.phone && c.phone.toLowerCase().includes(term)) ||
        (c.email && c.email.toLowerCase().includes(term)) ||
        (c.city && c.city.toLowerCase().includes(term))
    );
    renderTable(filtered);
});

loadCustomers();

function showForm() {
    document.getElementById("modalTitle").innerHTML = '<i class="bi bi-person-plus"></i> Add New Customer';
    document.getElementById("customerModal").style.display = "flex";
    document.body.style.overflow = "hidden";
}

function closeModal() {
    document.getElementById("customerModal").style.display = "none";
    document.body.style.overflow = "auto";
    
    // Clear form
    document.getElementById("full_name").value = "";
    document.getElementById("email").value = "";
    document.getElementById("phone").value = "";
    document.getElementById("address").value = "";
    document.getElementById("city").value = "";
    document.getElementById("state").value = "";
    document.getElementById("pincode").value = "";
    editingCustomer = null;
}

async function saveCustomer() {
    if (editingCustomer) {
        return updateCustomer();
    }

    const name = document.getElementById("full_name").value;
    const phone = document.getElementById("phone").value;

    if (!name || !phone) {
        if(window.showToast) window.showToast('Name and Phone are required', 'warning');
        return;
    }

    const customer = {
        full_name: name,
        email: document.getElementById("email").value,
        phone: phone,
        address: document.getElementById("address").value,
        city: document.getElementById("city").value,
        state: document.getElementById("state").value,
        pincode: document.getElementById("pincode").value
    };

    const response = await fetch(window.API_BASE_URL + "/customers", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token
        },
        body: JSON.stringify(customer)
    });

    const result = await response.json();

    if (result.success) {
        if(window.showToast) window.showToast('Customer added successfully');
        closeModal();
        loadCustomers();
    } else {
        if(window.showToast) window.showToast(result.message, 'error');
    }
}

async function editCustomer(id) {
    editingCustomer = id;
    document.getElementById("modalTitle").innerHTML = '<i class="bi bi-pencil-square"></i> Edit Customer';
    
    // Find customer from loaded data
    const customer = allCustomers.find(c => c.id === id);
    if(!customer) return;

    document.getElementById("full_name").value = customer.full_name;
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
    const name = document.getElementById("full_name").value;
    const phone = document.getElementById("phone").value;

    if (!name || !phone) {
        if(window.showToast) window.showToast('Name and Phone are required', 'warning');
        return;
    }

    const customer = {
        full_name: name,
        email: document.getElementById("email").value,
        phone: phone,
        address: document.getElementById("address").value,
        city: document.getElementById("city").value,
        state: document.getElementById("state").value,
        pincode: document.getElementById("pincode").value
    };

    const response = await fetch(`${window.API_BASE_URL}/customers/${editingCustomer}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token
        },
        body: JSON.stringify(customer)
    });

    const result = await response.json();

    if (result.success) {
        if(window.showToast) window.showToast('Customer updated successfully');
        closeModal();
        loadCustomers();
    } else {
        if(window.showToast) window.showToast(result.message, 'error');
    }
}

async function deleteCustomer(id) {
    if (!confirm("Are you sure you want to delete this customer?")) return;

    const response = await fetch(`${window.API_BASE_URL}/customers/${id}`, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + token }
    });

    const result = await response.json();

    if (result.success) {
        if(window.showToast) window.showToast('Customer deleted successfully');
        loadCustomers();
    } else {
        if(window.showToast) window.showToast(result.message, 'error');
    }
}