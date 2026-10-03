// Note: token is handled in auth.js
let editingSale = null;
let allSales = [];
let productsData = [];

async function loadSales() {
    try {
        const response = await fetch(window.API_BASE_URL + "/sales", {
            headers: { Authorization: "Bearer " + token }
        });

        const result = await response.json();
        allSales = result.data || [];
        renderTable(allSales);
    } catch (err) {
        console.error(err);
        if(window.showToast) window.showToast('Failed to load sales', 'error');
    }
}

function renderTable(data) {
    const table = document.getElementById("salesTable");
    table.innerHTML = "";

    if (data.length === 0) {
        table.innerHTML = `
            <tr class="empty-row">
                <td colspan="9">
                    <div class="empty-state-content">
                        <i class="bi bi-cart"></i>
                        <p>No sales records found.</p>
                    </div>
                </td>
            </tr>`;
        return;
    }

    data.forEach(sale => {
        let statusBadge = "badge-success";
        if (sale.payment_status === "Pending") statusBadge = "badge-warning";
        else if (sale.payment_status === "Partial") statusBadge = "badge-info";

        // Handle date formatting safely
        let saleDate = sale.sale_date;
        if(saleDate && saleDate.includes('T')) {
            saleDate = saleDate.split('T')[0];
        }

        table.innerHTML += `
        <tr>
            <td class="id-column">#${sale.id}</td>
            <td style="font-weight: 500;">${sale.customer_name || '-'}</td>
            <td>${sale.product_name || '-'}</td>
            <td>${sale.quantity}</td>
            <td>₹${(sale.unit_price || 0).toLocaleString()}</td>
            <td style="font-weight: 600;">₹${(sale.total_amount || 0).toLocaleString()}</td>
            <td>${saleDate || '-'}</td>
            <td><span class="badge-status ${statusBadge}">${sale.payment_status || 'Unknown'}</span></td>
            <td class="actions">
                <button class="btn-icon edit" onclick="editSale(${sale.id})" title="Edit">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn-icon delete" onclick="deleteSale(${sale.id})" title="Delete">
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
    const filtered = allSales.filter(s => 
        (s.customer_name && s.customer_name.toLowerCase().includes(term)) ||
        (s.product_name && s.product_name.toLowerCase().includes(term)) ||
        (s.payment_status && s.payment_status.toLowerCase().includes(term))
    );
    renderTable(filtered);
});

async function loadDropdowns() {
    // Load Customers
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
    } catch(e) { console.error("Error loading customers", e); }

    // Load Products
    try {
        const prodResponse = await fetch(window.API_BASE_URL + "/products", {
            headers: { Authorization: "Bearer " + token }
        });
        const prodResult = await prodResponse.json();
        productsData = prodResult.data || [];
        const productSelect = document.getElementById("product_id");
        productSelect.innerHTML = '<option value="">Select Product</option>';
        productsData.forEach(p => {
            productSelect.innerHTML += `<option value="${p.id}">${p.product_name} (₹${p.price})</option>`;
        });
    } catch(e) { console.error("Error loading products", e); }
}

// Auto calculate total amount
document.getElementById("product_id")?.addEventListener("change", updateCalculation);
document.getElementById("quantity")?.addEventListener("input", updateCalculation);
document.getElementById("unit_price")?.addEventListener("input", updateCalculationManual);

function updateCalculation() {
    const prodId = document.getElementById("product_id").value;
    const qty = document.getElementById("quantity").value;
    
    if (prodId && qty) {
        const product = productsData.find(p => p.id == prodId);
        if (product) {
            document.getElementById("unit_price").value = product.price;
            document.getElementById("total_amount").value = product.price * qty;
        }
    }
}

function updateCalculationManual() {
    const qty = document.getElementById("quantity").value || 0;
    const price = document.getElementById("unit_price").value || 0;
    document.getElementById("total_amount").value = price * qty;
}

loadSales();

async function showForm() {
    document.getElementById("modalTitle").innerHTML = '<i class="bi bi-cart-plus"></i> Record New Sale';
    await loadDropdowns();
    document.getElementById("salesModal").style.display = "flex";
    document.body.style.overflow = "hidden";
    
    // Set today's date by default
    document.getElementById("sale_date").valueAsDate = new Date();
}

function closeModal() {
    document.getElementById("salesModal").style.display = "none";
    document.body.style.overflow = "auto";
    
    document.getElementById("customer_id").value = "";
    document.getElementById("product_id").value = "";
    document.getElementById("quantity").value = "1";
    document.getElementById("unit_price").value = "";
    document.getElementById("total_amount").value = "";
    document.getElementById("sale_date").value = "";
    document.getElementById("payment_status").value = "Paid";
    editingSale = null;
}

async function saveSale() {
    if(editingSale) {
        return updateSale();
    }

    const customer_id = document.getElementById("customer_id").value;
    const product_id = document.getElementById("product_id").value;
    const quantity = document.getElementById("quantity").value;
    const sale_date = document.getElementById("sale_date").value;

    if (!customer_id || !product_id || !quantity || !sale_date) {
        if(window.showToast) window.showToast('Please fill all required fields', 'warning');
        return;
    }

    const sale = {
        customer_id: customer_id,
        product_id: product_id,
        quantity: quantity,
        unit_price: document.getElementById("unit_price").value,
        total_amount: document.getElementById("total_amount").value,
        sale_date: sale_date,
        payment_status: document.getElementById("payment_status").value
    };

    try {
        const response = await fetch(window.API_BASE_URL + "/sales", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + token
            },
            body: JSON.stringify(sale)
        });

        const result = await response.json();

        if (result.success) {
            if(window.showToast) window.showToast('Sale recorded successfully!');
            closeModal();
            loadSales();
        } else {
            if(window.showToast) window.showToast(result.message, 'error');
        }
    } catch(err) {
        console.error(err);
        if(window.showToast) window.showToast('Connection error', 'error');
    }
}

// Added Edit and Delete functionality for Sales
async function editSale(id) {
    editingSale = id;
    document.getElementById("modalTitle").innerHTML = '<i class="bi bi-pencil-square"></i> Edit Sale';
    
    await loadDropdowns();
    
    const sale = allSales.find(s => s.id === id);
    if(!sale) return;

    document.getElementById("customer_id").value = sale.customer_id;
    document.getElementById("product_id").value = sale.product_id;
    document.getElementById("quantity").value = sale.quantity;
    document.getElementById("unit_price").value = sale.unit_price;
    document.getElementById("total_amount").value = sale.total_amount;
    
    let sDate = sale.sale_date;
    if(sDate && sDate.includes('T')) sDate = sDate.split('T')[0];
    document.getElementById("sale_date").value = sDate;
    
    document.getElementById("payment_status").value = sale.payment_status;

    document.getElementById("salesModal").style.display = "flex";
    document.body.style.overflow = "hidden";
}

async function updateSale() {
    const customer_id = document.getElementById("customer_id").value;
    const product_id = document.getElementById("product_id").value;
    const quantity = document.getElementById("quantity").value;
    const sale_date = document.getElementById("sale_date").value;

    if (!customer_id || !product_id || !quantity || !sale_date) {
        if(window.showToast) window.showToast('Please fill all required fields', 'warning');
        return;
    }

    const sale = {
        customer_id: customer_id,
        product_id: product_id,
        quantity: quantity,
        unit_price: document.getElementById("unit_price").value,
        total_amount: document.getElementById("total_amount").value,
        sale_date: sale_date,
        payment_status: document.getElementById("payment_status").value
    };

    try {
        const response = await fetch(`${window.API_BASE_URL}/sales/${editingSale}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + token
            },
            body: JSON.stringify(sale)
        });

        const result = await response.json();

        if (result.success) {
            if(window.showToast) window.showToast('Sale updated successfully!');
            closeModal();
            loadSales();
        } else {
            if(window.showToast) window.showToast(result.message || 'Error updating sale (API may not support PUT)', 'error');
        }
    } catch(err) {
        console.error(err);
        if(window.showToast) window.showToast('Connection error', 'error');
    }
}

async function deleteSale(id) {
    if (!confirm("Are you sure you want to delete this sale record?")) return;

    try {
        const response = await fetch(`${window.API_BASE_URL}/sales/${id}`, {
            method: "DELETE",
            headers: { Authorization: "Bearer " + token }
        });

        const result = await response.json();

        if (result.success) {
            if(window.showToast) window.showToast('Sale deleted successfully!');
            loadSales();
        } else {
            if(window.showToast) window.showToast(result.message || 'Error deleting sale (API may not support DELETE)', 'error');
        }
    } catch(err) {
        console.error(err);
        if(window.showToast) window.showToast('Connection error', 'error');
    }
}