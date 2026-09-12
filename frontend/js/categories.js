// Phase 7 — categories.js migrated to Firestore
import { fetchAll, createDoc, updateDocById, deleteDocById } from "./firebase-config.js";

let editingCategory = null;
let allCategories = [];

async function loadCategories() {
    try {
        allCategories = await fetchAll("categories");
        renderTable(allCategories);
    } catch (err) {
        console.error(err);
        if (window.showToast) window.showToast('Failed to load categories', 'error');
    }
}

function renderTable(data) {
    const table = document.getElementById("categoryTable");
    table.innerHTML = "";
    if (data.length === 0) {
        table.innerHTML = `<tr class="empty-row"><td colspan="3"><div class="empty-state-content"><i class="bi bi-grid"></i><p>No categories found.</p></div></td></tr>`;
        return;
    }
    data.forEach(cat => {
        table.innerHTML += `
        <tr>
            <td style="font-weight:500;">${cat.category_name}</td>
            <td class="actions">
                <button class="btn-icon edit" onclick="editCategory('${cat.id}')" title="Edit"><i class="bi bi-pencil"></i></button>
                <button class="btn-icon delete" onclick="deleteCategory('${cat.id}')" title="Delete"><i class="bi bi-trash"></i></button>
            </td>
        </tr>`;
    });
}

document.getElementById('searchInput')?.addEventListener('input', function(e) {
    const term = e.target.value.toLowerCase();
    renderTable(allCategories.filter(c => c.category_name.toLowerCase().includes(term)));
});

loadCategories();

function showForm() {
    document.getElementById("modalTitle").innerHTML = '<i class="bi bi-plus-circle"></i> Add New Category';
    document.getElementById("categoryModal").style.display = "flex";
    document.body.style.overflow = "hidden";
}

function closeModal() {
    document.getElementById("categoryModal").style.display = "none";
    document.body.style.overflow = "auto";
    document.getElementById("category_name").value = "";
    editingCategory = null;
}

async function saveCategory() {
    const name = document.getElementById("category_name").value.trim();
    if (!name) { if (window.showToast) window.showToast('Category name is required', 'warning'); return; }

    try {
        if (editingCategory) {
            await updateDocById("categories", editingCategory, { category_name: name });
            if (window.showToast) window.showToast('Category updated successfully');
        } else {
            await createDoc("categories", { category_name: name });
            if (window.showToast) window.showToast('Category added successfully');
        }
        closeModal();
        loadCategories();
    } catch (err) {
        console.error(err);
        if (window.showToast) window.showToast('Error saving category', 'error');
    }
}

function editCategory(id) {
    editingCategory = id;
    document.getElementById("modalTitle").innerHTML = '<i class="bi bi-pencil-square"></i> Edit Category';
    const cat = allCategories.find(c => c.id === id);
    if (!cat) return;
    document.getElementById("category_name").value = cat.category_name;
    document.getElementById("categoryModal").style.display = "flex";
    document.body.style.overflow = "hidden";
}

async function deleteCategory(id) {
    const cat = allCategories.find(c => c.id === id);
    if (!confirm(`Delete category "${cat?.category_name || id}"?`)) return;
    try {
        await deleteDocById("categories", id);
        if (window.showToast) window.showToast('Category deleted successfully');
        loadCategories();
    } catch (err) {
        console.error(err);
        if (window.showToast) window.showToast('Error deleting category', 'error');
    }
}

window.saveCategory = saveCategory;
window.editCategory = editCategory;
window.deleteCategory = deleteCategory;
window.showForm = showForm;
window.closeModal = closeModal;