// Phase 7 — products.js migrated to Firestore
import {
    fetchAll, fetchById, createDoc, updateDocById, deleteDocById, db
} from "./firebase-config.js";
import {
    collection, getDocs
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

let editingProductId = null;
let allProducts = [];
let allBrands = [];
let allCategories = [];

async function loadProducts() {
    try {
        allProducts = await fetchAll("products");
        renderTable(allProducts);
    } catch (err) {
        console.error(err);
        if (window.showToast) window.showToast('Failed to load products', 'error');
        document.getElementById("productTable").innerHTML = `
            <tr><td colspan="7" style="text-align:center;padding:30px;color:#e11d48;">
                <i class="bi bi-exclamation-triangle" style="font-size:24px;"></i><br>Failed to load data
            </td></tr>`;
    }
}

function renderTable(data) {
    const table = document.getElementById("productTable");
    table.innerHTML = "";
    if (data.length === 0) {
        table.innerHTML = `<tr class="empty-row"><td colspan="7"><div class="empty-state-content"><i class="bi bi-box-seam"></i><p>No products found.</p></div></td></tr>`;
        return;
    }
    data.forEach(product => {
        // Image: if it's a URL use it directly, else show placeholder
        let imgUrl = `data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22400%22%20height%3D%22400%22%20style%3D%22background%3A%23f3f4f6%22%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20text-anchor%3D%22middle%22%20dy%3D%22.3em%22%20fill%3D%22%239ca3af%22%20font-family%3D%22sans-serif%22%20font-size%3D%2224%22%3ENo%20Image%3C%2Ftext%3E%3C%2Fsvg%3E`;
        if (product.image) {
            const imgStr = String(product.image).trim();
            if (imgStr.startsWith('http://') || imgStr.startsWith('https://')) imgUrl = imgStr;
        }
        table.innerHTML += `
        <tr>
            <td><img src="${imgUrl}" alt="${product.product_name}" onerror="this.src='${imgUrl}';" style="width:50px;height:50px;object-fit:contain;border-radius:4px;"></td>
            <td style="font-weight:500;">${product.product_name}</td>
            <td><span class="badge-status badge-info">${product.brand_name || '-'}</span></td>
            <td><span class="badge-status badge-primary">${product.category_name || '-'}</span></td>
            <td class="price-column">₹${Number(product.price).toLocaleString()}</td>
            <td><span style="font-weight:600;color:${product.stock_quantity < 10 ? '#e11d48' : '#059669'}">${product.stock_quantity}</span></td>
            <td class="actions">
                <button class="btn-icon edit" onclick="editProduct('${product.id}')" title="Edit"><i class="bi bi-pencil"></i></button>
                <button class="btn-icon delete" onclick="deleteProduct('${product.id}')" title="Delete"><i class="bi bi-trash"></i></button>
            </td>
        </tr>`;
    });
}

document.getElementById('searchInput')?.addEventListener('input', function(e) {
    const term = e.target.value.toLowerCase();
    renderTable(allProducts.filter(p =>
        p.product_name.toLowerCase().includes(term) ||
        (p.brand_name && p.brand_name.toLowerCase().includes(term)) ||
        (p.category_name && p.category_name.toLowerCase().includes(term))
    ));
});

async function _loadDropdowns() {
    // Load brands into select
    allBrands = (await getDocs(collection(db, "brands"))).docs.map(d => ({ id: d.id, ...d.data() }));
    const brandSel = document.getElementById("brand_id");
    brandSel.innerHTML = '<option value="">Select Brand</option>';
    allBrands.forEach(b => { brandSel.innerHTML += `<option value="${b.id}">${b.brand_name}</option>`; });

    // Load categories into select
    allCategories = (await getDocs(collection(db, "categories"))).docs.map(d => ({ id: d.id, ...d.data() }));
    const catSel = document.getElementById("category_id");
    catSel.innerHTML = '<option value="">Select Category</option>';
    allCategories.forEach(c => { catSel.innerHTML += `<option value="${c.id}">${c.category_name}</option>`; });
}

loadProducts();

async function showForm() {
    editingProductId = null;
    document.getElementById("modalTitle").innerHTML = '<i class="bi bi-plus-circle"></i> Add New Product';
    await _loadDropdowns();
    clearForm();
    document.getElementById("productModal").style.display = "flex";
    document.body.style.overflow = "hidden";
}

function closeModal() {
    document.getElementById("productModal").style.display = "none";
    document.body.style.overflow = "auto";
    clearForm();
}

function clearForm() {
    ["product_name","model_number","capacity","warranty","price","stock_quantity","description"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
    const brandSel = document.getElementById("brand_id");
    const catSel = document.getElementById("category_id");
    if (brandSel) brandSel.selectedIndex = 0;
    if (catSel) catSel.selectedIndex = 0;
    const imageInput = document.getElementById("product_image");
    if (imageInput) imageInput.value = "";
    const previewContainer = document.getElementById("imagePreviewContainer");
    if (previewContainer) previewContainer.style.display = "none";
    editingProductId = null;
}

window.onclick = function(event) {
    const modal = document.getElementById("productModal");
    if (event.target === modal) closeModal();
};

async function saveProduct() {
    if (editingProductId) { await updateProduct(); } else { await addProduct(); }
}

async function addProduct() {
    const name = document.getElementById("product_name").value;
    const brandId = document.getElementById("brand_id").value;
    const categoryId = document.getElementById("category_id").value;
    const price = document.getElementById("price").value;
    const stock = document.getElementById("stock_quantity").value;
    if (!name || !brandId || !categoryId || !price || !stock) {
        if (window.showToast) window.showToast('Please fill all required fields (*)', 'warning');
        return;
    }

    // Resolve denormalised names
    const brand = allBrands.find(b => b.id === brandId);
    const cat = allCategories.find(c => c.id === categoryId);

    const imageInput = document.getElementById("product_image");
    let imageUrl = null;
    if (imageInput?.files?.length > 0) {
        imageUrl = await _uploadImageToDataURL(imageInput.files[0]);
    }

    try {
        await createDoc("products", {
            product_name:   name,
            model_number:   document.getElementById("model_number").value || null,
            capacity:       document.getElementById("capacity").value || null,
            warranty:       document.getElementById("warranty").value || null,
            price:          parseFloat(price),
            stock_quantity: parseInt(stock),
            description:    document.getElementById("description").value || null,
            brand_id:       brandId,
            brand_name:     brand?.brand_name || null,
            category_id:    categoryId,
            category_name:  cat?.category_name || null,
            status:         "Available",
            image:          imageUrl
        });
        if (window.showToast) window.showToast('Product added successfully!');
        closeModal();
        loadProducts();
    } catch (err) {
        console.error(err);
        if (window.showToast) window.showToast('Error adding product', 'error');
    }
}

async function editProduct(id) {
    editingProductId = id;
    document.getElementById("modalTitle").innerHTML = '<i class="bi bi-pencil-square"></i> Edit Product';
    await _loadDropdowns();

    const product = allProducts.find(p => p.id === id) || await fetchById("products", id);
    if (!product) return;

    document.getElementById("product_name").value = product.product_name;
    document.getElementById("model_number").value = product.model_number || "";
    document.getElementById("capacity").value = product.capacity || "";
    document.getElementById("warranty").value = product.warranty || "";
    document.getElementById("price").value = product.price;
    document.getElementById("stock_quantity").value = product.stock_quantity;
    document.getElementById("description").value = product.description || "";
    document.getElementById("brand_id").value = product.brand_id || "";
    document.getElementById("category_id").value = product.category_id || "";

    document.getElementById("productModal").style.display = "flex";
    document.body.style.overflow = "hidden";
}

async function updateProduct() {
    const name = document.getElementById("product_name").value;
    const brandId = document.getElementById("brand_id").value;
    const categoryId = document.getElementById("category_id").value;
    const price = document.getElementById("price").value;
    const stock = document.getElementById("stock_quantity").value;
    if (!name || !brandId || !categoryId || !price || !stock) {
        if (window.showToast) window.showToast('Please fill all required fields (*)', 'warning');
        return;
    }

    const brand = allBrands.find(b => b.id === brandId);
    const cat = allCategories.find(c => c.id === categoryId);

    const imageInput = document.getElementById("product_image");
    let imageUrl = undefined; // undefined = don't change existing image
    if (imageInput?.files?.length > 0) {
        imageUrl = await _uploadImageToDataURL(imageInput.files[0]);
    }

    const updates = {
        product_name:  name,
        model_number:  document.getElementById("model_number").value || null,
        capacity:      document.getElementById("capacity").value || null,
        warranty:      document.getElementById("warranty").value || null,
        price:         parseFloat(price),
        stock_quantity: parseInt(stock),
        description:   document.getElementById("description").value || null,
        brand_id:      brandId,
        brand_name:    brand?.brand_name || null,
        category_id:   categoryId,
        category_name: cat?.category_name || null,
        status:        "Available"
    };
    if (imageUrl !== undefined) updates.image = imageUrl;

    try {
        await updateDocById("products", editingProductId, updates);
        if (window.showToast) window.showToast('Product updated successfully!');
        editingProductId = null;
        closeModal();
        loadProducts();
    } catch (err) {
        console.error(err);
        if (window.showToast) window.showToast('Error updating product', 'error');
    }
}

async function deleteProduct(id) {
    const product = allProducts.find(p => p.id === id);
    if (!confirm(`Delete "${product?.product_name || id}"?`)) return;
    try {
        await deleteDocById("products", id);
        if (window.showToast) window.showToast('Product deleted successfully');
        loadProducts();
    } catch (err) {
        console.error(err);
        if (window.showToast) window.showToast('Error deleting product', 'error');
    }
}

// Image handling: store as data URL inside Firestore (Spark plan — no Firebase Storage)
// For large images use Cloudinary instead and store the URL.
async function _uploadImageToDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Image preview listener
document.addEventListener("DOMContentLoaded", () => {
    const fileInput = document.getElementById("product_image");
    if (fileInput) {
        fileInput.addEventListener("change", function() {
            const previewContainer = document.getElementById("imagePreviewContainer");
            const previewImage = document.getElementById("imagePreview");
            if (this.files && this.files[0]) {
                const reader = new FileReader();
                reader.onload = e => { previewImage.src = e.target.result; previewContainer.style.display = "block"; };
                reader.readAsDataURL(this.files[0]);
            } else {
                previewContainer.style.display = "none";
                previewImage.src = "";
            }
        });
    }
});

window.loadProducts = loadProducts;
window.showForm = showForm;
window.closeModal = closeModal;
window.saveProduct = saveProduct;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
