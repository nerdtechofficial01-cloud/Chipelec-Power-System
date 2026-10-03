// Note: token is handled in auth.js
let editingCategory = null;
let allCategories = [];

async function loadCategories() {
    try {
        const response = await fetch(window.API_BASE_URL + "/categories", {
            headers: { Authorization: "Bearer " + token }
        });

        const result = await response.json();
        allCategories = result.data || [];
        renderTable(allCategories);
    } catch (err) {
        console.error(err);
        if(window.showToast) window.showToast('Failed to load categories', 'error');
    }
}

function renderTable(data) {
    const table = document.getElementById("categoryTable");
    table.innerHTML = "";

    if (data.length === 0) {
        table.innerHTML = `
            <tr class="empty-row">
                <td colspan="3">
                    <div class="empty-state-content">
                        <i class="bi bi-collection"></i>
                        <p>No categories found.</p>
                    </div>
                </td>
            </tr>`;
        return;
    }

    data.forEach(category => {
        table.innerHTML += `
        <tr>
            <td class="id-column">#${category.id}</td>
            <td style="font-weight: 500;">${category.category_name}</td>
            <td class="actions">
                <button class="btn-icon edit" onclick="editCategory(${category.id}, '${category.category_name}')" title="Edit">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn-icon delete" onclick="deleteCategory(${category.id})" title="Delete">
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
    const filtered = allCategories.filter(c => c.category_name.toLowerCase().includes(term));
    renderTable(filtered);
});

loadCategories();

function showForm() {
    document.getElementById("modalTitle").innerHTML = '<i class="bi bi-plus-circle"></i> Add New Category';
    document.getElementById("categoryModal").style.display = "flex";
}

function closeModal() {
    document.getElementById("categoryModal").style.display = "none";
    document.getElementById("category_name").value = "";
    editingCategory = null;
}

async function saveCategory() {
    if (editingCategory) {
        return updateCategory();
    }

    const name = document.getElementById("category_name").value;
    if (!name) {
        if(window.showToast) window.showToast('Category name is required', 'warning');
        return;
    }

    const category = { category_name: name };

    const response = await fetch(window.API_BASE_URL + "/categories", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token
        },
        body: JSON.stringify(category)
    });

    const result = await response.json();

    if (result.success) {
        if(window.showToast) window.showToast('Category added successfully');
        closeModal();
        loadCategories();
    } else {
        if(window.showToast) window.showToast(result.message, 'error');
    }
}

function editCategory(id, name) {
    editingCategory = id;
    document.getElementById("modalTitle").innerHTML = '<i class="bi bi-pencil-square"></i> Edit Category';
    document.getElementById("category_name").value = name;
    document.getElementById("categoryModal").style.display = "flex";
}

async function updateCategory() {
    const name = document.getElementById("category_name").value;
    if (!name) {
        if(window.showToast) window.showToast('Category name is required', 'warning');
        return;
    }

    const response = await fetch(`${window.API_BASE_URL}/categories/${editingCategory}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token
        },
        body: JSON.stringify({ category_name: name })
    });

    const result = await response.json();

    if (result.success) {
        if(window.showToast) window.showToast('Category updated successfully');
        closeModal();
        loadCategories();
    } else {
        if(window.showToast) window.showToast(result.message, 'error');
    }
}

async function deleteCategory(id) {
    if (!confirm("Delete this category? This action cannot be undone.")) return;

    const response = await fetch(`${window.API_BASE_URL}/categories/${id}`, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + token }
    });

    const result = await response.json();

    if (result.success) {
        if(window.showToast) window.showToast('Category deleted successfully');
        loadCategories();
    } else {
        if(window.showToast) window.showToast(result.message, 'error');
    }
}