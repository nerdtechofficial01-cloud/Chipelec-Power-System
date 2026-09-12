// Phase 9 — sales.js migrated to Firestore
import { fetchAll, createDoc, updateDocById, deleteDocById, db } from "./firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

let editingSale = null;
let allSales = [];
let customersData = [];
let productsData = [];

async function loadSales() {
    try {
        allSales = await fetchAll("sales");
        renderTable(allSales);
    } catch (err) {
        console.error(err);
        if (window.showToast) window.showToast('Failed to load sales', 'error');
    }
}

function renderTable(data) {
    const table = document.getElementById("salesTable");
    if (!table) return;
    table.innerHTML = "";
    if (data.length === 0) {
        table.innerHTML = `<tr class="empty-row"><td colspan="8"><div class="empty-state-content"><i class="bi bi-cart"></i><p>No sales found.</p></div></td></tr>`;
        return;
    }
    data.forEach(sale => {
        const saleDate = sale.sale_date?.toDate ? sale.sale_date.toDate().toLocaleDateString('en-IN') :
                         (typeof sale.sale_date === 'string' ? sale.sale_date.split('T')[0] : '-');
        const statusClass = sale.payment_status === 'Paid' ? 'badge-success' : sale.payment_status === 'Pending' ? 'badge-warning' : 'badge-danger';
        table.innerHTML += `
        <tr>
            <td class="id-column">#${sale.id.substring(0,6)}</td>
            <td style="font-weight:500;">${sale.customer_name || '-'}</td>
            <td>${sale.product_name || '-'}</td>
            <td>${sale.quantity}</td>
            <td class="price-column">₹${Number(sale.unit_price || 0).toLocaleString()}</td>
            <td class="price-column">₹${Number(sale.total_amount || 0).toLocaleString()}</td>
            <td>${saleDate}</td>
            <td><span class="badge-status ${statusClass}">${sale.payment_status || '-'}</span></td>
            <td class="actions">
                <button class="btn-icon edit" onclick="editSale('${sale.id}')" title="Edit"><i class="bi bi-pencil"></i></button>
                <button class="btn-icon delete" onclick="deleteSale('${sale.id}')" title="Delete"><i class="bi bi-trash"></i></button>
            </td>
        </tr>`;
    });
}

document.getElementById('searchInput')?.addEventListener('input', function(e) {
    const term = e.target.value.toLowerCase();
    renderTable(allSales.filter(s =>
        (s.customer_name && s.customer_name.toLowerCase().includes(term)) ||
        (s.product_name && s.product_name.toLowerCase().includes(term)) ||
        (s.payment_status && s.payment_status.toLowerCase().includes(term))
    ));
});

async function loadDropdowns() {
    customersData = (await getDocs(collection(db, "customers"))).docs.map(d => ({ id: d.id, ...d.data() }));
    const custSel = document.getElementById("customer_id");
    custSel.innerHTML = '<option value="">Select Customer</option>';
    customersData.forEach(c => { custSel.innerHTML += `<option value="${c.id}">${c.full_name}</option>`; });

    productsData = (await getDocs(collection(db, "products"))).docs.map(d => ({ id: d.id, ...d.data() }));
    const prodSel = document.getElementById("product_id");
    prodSel.innerHTML = '<option value="">Select Product</option>';
    productsData.forEach(p => { prodSel.innerHTML += `<option value="${p.id}">${p.product_name} (₹${p.price})</option>`; });
}

document.getElementById("product_id")?.addEventListener("change", updateCalculation);
document.getElementById("quantity")?.addEventListener("input", updateCalculation);
document.getElementById("unit_price")?.addEventListener("input", updateCalculationManual);

function updateCalculation() {
    const prodId = document.getElementById("product_id").value;
    const qty = document.getElementById("quantity").value;
    if (prodId && qty) {
        const product = productsData.find(p => p.id === prodId);
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
    editingSale = null;
    document.getElementById("modalTitle").innerHTML = '<i class="bi bi-cart-plus"></i> Record New Sale';
    await loadDropdowns();
    document.getElementById("salesModal").style.display = "flex";
    document.body.style.overflow = "hidden";
    document.getElementById("sale_date").valueAsDate = new Date();
}

function closeModal() {
    document.getElementById("salesModal").style.display = "none";
    document.body.style.overflow = "auto";
    ["customer_id","product_id","unit_price","total_amount","sale_date"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
    const qEl = document.getElementById("quantity");
    if (qEl) qEl.value = "1";
    const psEl = document.getElementById("payment_status");
    if (psEl) psEl.value = "Paid";
    editingSale = null;
}

async function saveSale() {
    if (editingSale) return updateSale();
    const customer_id = document.getElementById("customer_id").value;
    const product_id  = document.getElementById("product_id").value;
    const quantity    = document.getElementById("quantity").value;
    const sale_date   = document.getElementById("sale_date").value;
    if (!customer_id || !product_id || !quantity || !sale_date) {
        if (window.showToast) window.showToast('Please fill all required fields', 'warning');
        return;
    }
    const customer = customersData.find(c => c.id === customer_id);
    const product  = productsData.find(p => p.id === product_id);
    try {
        await createDoc("sales", {
            customer_id:    customer_id,
            customer_name:  customer?.full_name || "",
            product_id:     product_id,
            product_name:   product?.product_name || "",
            quantity:       parseInt(quantity),
            unit_price:     parseFloat(document.getElementById("unit_price").value) || 0,
            total_amount:   parseFloat(document.getElementById("total_amount").value) || 0,
            sale_date:      sale_date,
            payment_status: document.getElementById("payment_status").value
        });
        if (window.showToast) window.showToast('Sale recorded successfully!');
        closeModal();
        loadSales();
    } catch (err) {
        console.error(err);
        if (window.showToast) window.showToast('Error recording sale', 'error');
    }
}

async function editSale(id) {
    editingSale = id;
    document.getElementById("modalTitle").innerHTML = '<i class="bi bi-pencil-square"></i> Edit Sale';
    await loadDropdowns();
    const sale = allSales.find(s => s.id === id);
    if (!sale) return;
    document.getElementById("customer_id").value = sale.customer_id || "";
    document.getElementById("product_id").value  = sale.product_id  || "";
    document.getElementById("quantity").value     = sale.quantity;
    document.getElementById("unit_price").value   = sale.unit_price;
    document.getElementById("total_amount").value = sale.total_amount;
    let sDate = sale.sale_date?.toDate ? sale.sale_date.toDate().toISOString().split('T')[0]
                                       : (sale.sale_date || "");
    document.getElementById("sale_date").value    = sDate;
    document.getElementById("payment_status").value = sale.payment_status || "Paid";
    document.getElementById("salesModal").style.display = "flex";
    document.body.style.overflow = "hidden";
}

async function updateSale() {
    const customer_id = document.getElementById("customer_id").value;
    const product_id  = document.getElementById("product_id").value;
    const quantity    = document.getElementById("quantity").value;
    const sale_date   = document.getElementById("sale_date").value;
    if (!customer_id || !product_id || !quantity || !sale_date) {
        if (window.showToast) window.showToast('Please fill all required fields', 'warning');
        return;
    }
    const customer = customersData.find(c => c.id === customer_id);
    const product  = productsData.find(p => p.id === product_id);
    try {
        await updateDocById("sales", editingSale, {
            customer_id,
            customer_name:  customer?.full_name || "",
            product_id,
            product_name:   product?.product_name || "",
            quantity:       parseInt(quantity),
            unit_price:     parseFloat(document.getElementById("unit_price").value) || 0,
            total_amount:   parseFloat(document.getElementById("total_amount").value) || 0,
            sale_date,
            payment_status: document.getElementById("payment_status").value
        });
        if (window.showToast) window.showToast('Sale updated successfully!');
        closeModal();
        loadSales();
    } catch (err) {
        console.error(err);
        if (window.showToast) window.showToast('Error updating sale', 'error');
    }
}

async function deleteSale(id) {
    if (!confirm("Delete this sale record?")) return;
    try {
        await deleteDocById("sales", id);
        if (window.showToast) window.showToast('Sale deleted successfully!');
        loadSales();
    } catch (err) {
        console.error(err);
        if (window.showToast) window.showToast('Error deleting sale', 'error');
    }
}

window.showForm = showForm;
window.closeModal = closeModal;
window.saveSale = saveSale;
window.editSale = editSale;
window.deleteSale = deleteSale;