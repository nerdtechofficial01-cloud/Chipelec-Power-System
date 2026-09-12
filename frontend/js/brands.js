// Phase 7 — brands.js migrated to Firestore
import { fetchAll, createDoc, updateDocById, deleteDocById } from "./firebase-config.js";

let editingBrand = null;
let allBrands = [];

async function loadBrands() {
    try {
        allBrands = await fetchAll("brands");
        renderTable(allBrands);
    } catch (err) {
        console.error(err);
        if (window.showToast) window.showToast('Failed to load brands', 'error');
    }
}

function renderTable(data) {
    const table = document.getElementById("brandTable");
    table.innerHTML = "";
    if (data.length === 0) {
        table.innerHTML = `<tr class="empty-row"><td colspan="3"><div class="empty-state-content"><i class="bi bi-tag"></i><p>No brands found.</p></div></td></tr>`;
        return;
    }
    data.forEach(brand => {
        table.innerHTML += `
        <tr>
            <td style="font-weight:500;">${brand.brand_name}</td>
            <td class="actions">
                <button class="btn-icon edit" onclick="editBrand('${brand.id}')" title="Edit"><i class="bi bi-pencil"></i></button>
                <button class="btn-icon delete" onclick="deleteBrand('${brand.id}')" title="Delete"><i class="bi bi-trash"></i></button>
            </td>
        </tr>`;
    });
}

document.getElementById('searchInput')?.addEventListener('input', function(e) {
    const term = e.target.value.toLowerCase();
    renderTable(allBrands.filter(b => b.brand_name.toLowerCase().includes(term)));
});

loadBrands();

function showForm() {
    document.getElementById("modalTitle").innerHTML = '<i class="bi bi-plus-circle"></i> Add New Brand';
    document.getElementById("brandModal").style.display = "flex";
    document.body.style.overflow = "hidden";
}

function closeModal() {
    document.getElementById("brandModal").style.display = "none";
    document.body.style.overflow = "auto";
    document.getElementById("brand_name").value = "";
    editingBrand = null;
}

async function saveBrand() {
    const name = document.getElementById("brand_name").value.trim();
    if (!name) { if (window.showToast) window.showToast('Brand name is required', 'warning'); return; }

    try {
        if (editingBrand) {
            await updateDocById("brands", editingBrand, { brand_name: name });
            if (window.showToast) window.showToast('Brand updated successfully');
        } else {
            await createDoc("brands", { brand_name: name });
            if (window.showToast) window.showToast('Brand added successfully');
        }
        closeModal();
        loadBrands();
    } catch (err) {
        console.error(err);
        if (window.showToast) window.showToast('Error saving brand', 'error');
    }
}

function editBrand(id) {
    editingBrand = id;
    document.getElementById("modalTitle").innerHTML = '<i class="bi bi-pencil-square"></i> Edit Brand';
    const brand = allBrands.find(b => b.id === id);
    if (!brand) return;
    document.getElementById("brand_name").value = brand.brand_name;
    document.getElementById("brandModal").style.display = "flex";
    document.body.style.overflow = "hidden";
}

async function deleteBrand(id) {
    const brand = allBrands.find(b => b.id === id);
    if (!confirm(`Delete brand "${brand?.brand_name || id}"?`)) return;
    try {
        await deleteDocById("brands", id);
        if (window.showToast) window.showToast('Brand deleted successfully');
        loadBrands();
    } catch (err) {
        console.error(err);
        if (window.showToast) window.showToast('Error deleting brand', 'error');
    }
}

window.saveBrand = saveBrand;
window.editBrand = editBrand;
window.deleteBrand = deleteBrand;
window.showForm = showForm;
window.closeModal = closeModal;