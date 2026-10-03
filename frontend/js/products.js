// Note: token is handled in auth.js
let editingProductId = null;
let allProducts = []; // For search filtering

async function loadProducts() {
    try {
        const response = await fetch(window.API_BASE_URL + "/products", {
            headers: { Authorization: "Bearer " + token }
        });

        const result = await response.json();
        allProducts = result.data || [];
        renderTable(allProducts);

    } catch (err) {
        console.error(err);
        if(window.showToast) window.showToast('Failed to load products', 'error');
        document.getElementById("productTable").innerHTML = `
            <tr><td colspan="7" style="text-align: center; padding: 30px; color: #e11d48;">
                <i class="bi bi-exclamation-triangle" style="font-size: 24px;"></i><br>
                Failed to load data
            </td></tr>`;
    }
}

function renderTable(data) {
    const table = document.getElementById("productTable");
    table.innerHTML = "";

    if (data.length === 0) {
        table.innerHTML = `
            <tr class="empty-row">
                <td colspan="7">
                    <div class="empty-state-content">
                        <i class="bi bi-box-seam"></i>
                        <p>No products found.</p>
                    </div>
                </td>
            </tr>`;
        return;
    }

    data.forEach(product => {
        let imgUrl = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22400%22%20height%3D%22400%22%20style%3D%22background%3A%23f3f4f6%22%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20text-anchor%3D%22middle%22%20dy%3D%22.3em%22%20fill%3D%22%239ca3af%22%20font-family%3D%22sans-serif%22%20font-size%3D%2224%22%3ENo%20Image%3C%2Ftext%3E%3C%2Fsvg%3E';
        if (product.image) {
            const imgStr = String(product.image).trim();
            if (imgStr.startsWith('http://') || imgStr.startsWith('https://')) {
                imgUrl = imgStr;
            } else if (imgStr.includes('/')) {
                imgUrl = imgStr.startsWith('/') ? imgStr : '/' + imgStr;
            } else {
                imgUrl = window.API_BASE_URL.replace('/api', '') + '/uploads/' + imgStr;
            }
        }
        table.innerHTML += `
        <tr>
            <td>
                <img src="${imgUrl}" alt="${product.product_name}" onerror="this.onerror=null; this.src='data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22400%22%20height%3D%22400%22%20style%3D%22background%3A%23f3f4f6%22%3E%3Ctext%20x%3D%2250%25%22%20y%3D%2250%25%22%20text-anchor%3D%22middle%22%20dy%3D%22.3em%22%20fill%3D%22%239ca3af%22%20font-family%3D%22sans-serif%22%20font-size%3D%2224%22%3ENo%20Image%3C%2Ftext%3E%3C%2Fsvg%3E';">
            </td>
            <td style="font-weight: 500;">${product.product_name}</td>
            <td><span class="badge-status badge-info">${product.brand_name || '-'}</span></td>
            <td><span class="badge-status badge-primary">${product.category_name || '-'}</span></td>
            <td class="price-column">₹${product.price.toLocaleString()}</td>
            <td>
                <span style="font-weight: 600; color: ${product.stock_quantity < 10 ? '#e11d48' : '#059669'}">
                    ${product.stock_quantity}
                </span>
            </td>
            <td class="actions">
                <button class="btn-icon edit" onclick="editProduct(${product.id})" title="Edit">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn-icon delete" onclick="deleteProduct(${product.id})" title="Delete">
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
    const filtered = allProducts.filter(p => 
        p.product_name.toLowerCase().includes(term) || 
        (p.brand_name && p.brand_name.toLowerCase().includes(term)) ||
        (p.category_name && p.category_name.toLowerCase().includes(term))
    );
    renderTable(filtered);
});

async function loadBrands() {
    const response = await fetch(window.API_BASE_URL + "/brands", {
        headers: { Authorization: "Bearer " + token }
    });
    const result = await response.json();
    const brand = document.getElementById("brand_id");
    brand.innerHTML = '<option value="">Select Brand</option>';
    result.data.forEach(item => {
        brand.innerHTML += `<option value="${item.id}">${item.brand_name}</option>`;
    });
}

async function loadCategories() {
    const response = await fetch(window.API_BASE_URL + "/categories", {
        headers: { Authorization: "Bearer " + token }
    });
    const result = await response.json();
    const category = document.getElementById("category_id");
    category.innerHTML = '<option value="">Select Category</option>';
    result.data.forEach(item => {
        category.innerHTML += `<option value="${item.id}">${item.category_name}</option>`;
    });
}

loadProducts();

async function addProduct() {
    // Form validation
    const name = document.getElementById("product_name").value;
    const brandId = document.getElementById("brand_id").value;
    const categoryId = document.getElementById("category_id").value;
    const price = document.getElementById("price").value;
    const stock = document.getElementById("stock_quantity").value;

    if (!name || !brandId || !categoryId || !price || !stock) {
        if(window.showToast) window.showToast('Please fill all required fields (*)', 'warning');
        else alert('Please fill all required fields');
        return;
    }

    const product = {
        product_name: name,
        model_number: document.getElementById("model_number").value,
        capacity: document.getElementById("capacity").value,
        warranty: document.getElementById("warranty").value,
        price: price,
        stock_quantity: stock,
        description: document.getElementById("description").value,
        brand_id: brandId,
        category_id: categoryId
    };

    const response = await fetch(window.API_BASE_URL + "/products", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token
        },
        body: JSON.stringify(product)
    });

    const result = await response.json();

    if (result.success) {
        if(window.showToast) window.showToast('Product added successfully!');
        
        // Upload image if selected
        const fileInput = document.getElementById("product_image");
        if (fileInput.files.length > 0) {
            await uploadProductImage(result.productId, fileInput.files[0]);
        }
        
        loadProducts();
        closeModal();
    } else {
        if(window.showToast) window.showToast(result.message, 'error');
    }
}

async function showForm() {
    document.getElementById("modalTitle").innerHTML = '<i class="bi bi-plus-circle"></i> Add New Product';
    
    // Bug Fix: Need to load dropdowns for Add form too
    await loadBrands();
    await loadCategories();
    
    document.getElementById("productModal").style.display = "flex";
    document.body.style.overflow = "hidden"; // Prevent background scrolling
}

function closeModal() {
    document.getElementById("productModal").style.display = "none";
    document.body.style.overflow = "auto";
    clearForm();
}

function clearForm() {
    document.getElementById("product_name").value = "";
    document.getElementById("model_number").value = "";
    document.getElementById("capacity").value = "";
    document.getElementById("warranty").value = "";
    document.getElementById("price").value = "";
    document.getElementById("stock_quantity").value = "";
    document.getElementById("description").value = "";
    document.getElementById("brand_id").selectedIndex = 0;
    document.getElementById("category_id").selectedIndex = 0;
    
    // Clear image
    const imageInput = document.getElementById("product_image");
    if (imageInput) imageInput.value = "";
    const previewContainer = document.getElementById("imagePreviewContainer");
    if (previewContainer) previewContainer.style.display = "none";
    const previewImage = document.getElementById("imagePreview");
    if (previewImage) previewImage.src = "";
    
    editingProductId = null;
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById("productModal");
    if (event.target === modal) {
        closeModal();
    }
};

async function deleteProduct(id) {
    const product = allProducts.find(p => p.id === id);

    const productName = product ? product.product_name : "this product";
    const modelNumber = product && product.model_number
        ? ` (Model: ${product.model_number})`
        : "";

    if (!confirm(`Are you sure you want to delete ${productName}${modelNumber}?`)) {
        return;
    }

    try {
        const url = `${window.API_BASE_URL}/products/${id}`;

        console.log("Deleting product:", {
            id: id,
            url: url,
            tokenExists: !!token
        });

        const response = await fetch(url, {
            method: "DELETE",
            headers: {
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            }
        });

        console.log("Delete response status:", response.status);

        const responseText = await response.text();

        console.log("Delete raw response:", responseText);

        let result;

        try {
            result = JSON.parse(responseText);
        } catch (parseError) {
            console.error("Invalid JSON response:", parseError);

            throw new Error(
                `Server returned HTTP ${response.status}: ${responseText}`
            );
        }

        console.log("Delete parsed response:", result);

        if (response.ok && result.success) {

            if (window.showToast) {
                window.showToast(
                    result.message || "Product deleted successfully",
                    "success"
                );
            }

            await loadProducts();

        } else {

            const message =
                result.message ||
                `Failed to delete product. Server returned ${response.status}`;

            console.error("Delete failed:", {
                status: response.status,
                response: result
            });

            if (window.showToast) {
                window.showToast(message, "error");
            } else {
                alert(message);
            }
        }

    } catch (error) {

        console.error("========== DELETE PRODUCT ERROR ==========");
        console.error("Product ID:", id);
        console.error("Error:", error);
        console.error("==========================================");

        if (window.showToast) {
            window.showToast(
                error.message || "Unable to delete product",
                "error"
            );
        } else {
            alert(error.message || "Unable to delete product");
        }
    }
}

async function editProduct(id) {
    editingProductId = id;
    document.getElementById("modalTitle").innerHTML = '<i class="bi bi-pencil-square"></i> Edit Product';

    const response = await fetch(`${window.API_BASE_URL}/products/${id}`, {
        headers: { Authorization: "Bearer " + token }
    });

    const result = await response.json();

    if (!result.success) {
        if(window.showToast) window.showToast(result.message, 'error');
        return;
    }

    const product = result.data;

    // Load dropdowns before selecting values
    await loadBrands();
    await loadCategories();

    document.getElementById("product_name").value = product.product_name;
    document.getElementById("model_number").value = product.model_number || "";
    document.getElementById("capacity").value = product.capacity || "";
    document.getElementById("warranty").value = product.warranty || "";
    document.getElementById("price").value = product.price;
    document.getElementById("stock_quantity").value = product.stock_quantity;
    document.getElementById("description").value = product.description || "";
    document.getElementById("brand_id").value = product.brand_id;
    document.getElementById("category_id").value = product.category_id;

    document.getElementById("productModal").style.display = "flex";
    document.body.style.overflow = "hidden";
}

async function saveProduct() {
    if (editingProductId) {
        await updateProduct();
    } else {
        await addProduct();
    }
}

async function updateProduct() {
    // Form validation
    const name = document.getElementById("product_name").value;
    const brandId = document.getElementById("brand_id").value;
    const categoryId = document.getElementById("category_id").value;
    const price = document.getElementById("price").value;
    const stock = document.getElementById("stock_quantity").value;

    if (!name || !brandId || !categoryId || !price || !stock) {
        if(window.showToast) window.showToast('Please fill all required fields (*)', 'warning');
        return;
    }

    const product = {
        product_name: name,
        model_number: document.getElementById("model_number").value,
        capacity: document.getElementById("capacity").value,
        warranty: document.getElementById("warranty").value,
        price: price,
        stock_quantity: stock,
        description: document.getElementById("description").value,
        brand_id: brandId,
        category_id: categoryId,
        status: "Available"
    };

    const response = await fetch(`${window.API_BASE_URL}/products/${editingProductId}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token
        },
        body: JSON.stringify(product)
    });

    const result = await response.json();

    if (result.success) {
        if(window.showToast) window.showToast('Product updated successfully!');
        
        // Upload image if selected
        const fileInput = document.getElementById("product_image");
        if (fileInput.files.length > 0) {
            await uploadProductImage(editingProductId, fileInput.files[0]);
        }
        
        editingProductId = null;
        closeModal();
        loadProducts();
    } else {
        if(window.showToast) window.showToast(result.message, 'error');
    }
}

// ======================
// IMAGE UPLOAD HELPER
// ======================
async function uploadProductImage(productId, file) {
    const formData = new FormData();
    formData.append("image", file);

    try {
        const response = await fetch(`${window.API_BASE_URL}/products/upload/${productId}`, {
            method: "POST",
            headers: {
                Authorization: "Bearer " + token
            },
            body: formData
        });
        const result = await response.json();
        if (!result.success) {
            if(window.showToast) window.showToast('Failed to upload image: ' + result.message, 'error');
            console.error("Image upload failed:", result);
        }
    } catch (err) {
        console.error("Error uploading image:", err);
        if(window.showToast) window.showToast('Error uploading image', 'error');
    }
}

// ======================
// IMAGE PREVIEW LISTENER
// ======================
document.addEventListener("DOMContentLoaded", () => {
    const fileInput = document.getElementById("product_image");
    if (fileInput) {
        fileInput.addEventListener("change", function() {
            const previewContainer = document.getElementById("imagePreviewContainer");
            const previewImage = document.getElementById("imagePreview");
            
            if (this.files && this.files[0]) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    previewImage.src = e.target.result;
                    previewContainer.style.display = "block";
                }
                reader.readAsDataURL(this.files[0]);
            } else {
                previewContainer.style.display = "none";
                previewImage.src = "";
            }
        });
    }
});
