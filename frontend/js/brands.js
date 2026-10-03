// Note: token is handled in auth.js
let editingBrand = null;
let allBrands = [];

async function loadBrands() {
    try {
        const response = await fetch(window.API_BASE_URL + "/brands", {
            headers: { Authorization: "Bearer " + token }
        });

        const result = await response.json();
        allBrands = result.data || [];
        renderTable(allBrands);
    } catch (err) {
        console.error(err);
        if(window.showToast) window.showToast('Failed to load brands', 'error');
    }
}

function renderTable(data) {
    const table = document.getElementById("brandTable");
    table.innerHTML = "";

    if (data.length === 0) {
        table.innerHTML = `
            <tr class="empty-row">
                <td colspan="3">
                    <div class="empty-state-content">
                        <i class="bi bi-tags"></i>
                        <p>No brands found.</p>
                    </div>
                </td>
            </tr>`;
        return;
    }

    data.forEach(brand => {
        table.innerHTML += `
        <tr>
            <td class="id-column">#${brand.id}</td>
            <td style="font-weight: 500;">${brand.brand_name}</td>
            <td class="actions">
                <button class="btn-icon edit" onclick="editBrand(${brand.id}, '${brand.brand_name}')" title="Edit">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn-icon delete" onclick="deleteBrand(${brand.id})" title="Delete">
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
    const filtered = allBrands.filter(b => b.brand_name.toLowerCase().includes(term));
    renderTable(filtered);
});

loadBrands();

function showForm() {
    document.getElementById("modalTitle").innerHTML = '<i class="bi bi-plus-circle"></i> Add New Brand';
    document.getElementById("brandModal").style.display = "flex";
}

function closeModal() {
    document.getElementById("brandModal").style.display = "none";
    document.getElementById("brand_name").value = "";
    editingBrand = null;
}

async function saveBrand() {
    if (editingBrand) {
        return updateBrand();
    }

    const name = document.getElementById("brand_name").value;
    if (!name) {
        if(window.showToast) window.showToast('Brand name is required', 'warning');
        return;
    }

    const brand = { brand_name: name };

    const response = await fetch(window.API_BASE_URL + "/brands", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token
        },
        body: JSON.stringify(brand)
    });

    const result = await response.json();

    if (result.success) {
        if(window.showToast) window.showToast('Brand added successfully');
        closeModal();
        loadBrands();
    } else {
        if(window.showToast) window.showToast(result.message, 'error');
    }
}

function editBrand(id, name) {
    editingBrand = id;
    document.getElementById("modalTitle").innerHTML = '<i class="bi bi-pencil-square"></i> Edit Brand';
    document.getElementById("brand_name").value = name;
    document.getElementById("brandModal").style.display = "flex";
}

async function updateBrand() {
    const name = document.getElementById("brand_name").value;
    if (!name) {
        if(window.showToast) window.showToast('Brand name is required', 'warning');
        return;
    }

    const response = await fetch(`${window.API_BASE_URL}/brands/${editingBrand}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token
        },
        body: JSON.stringify({ brand_name: name })
    });

    const result = await response.json();

    if (result.success) {
        if(window.showToast) window.showToast('Brand updated successfully');
        closeModal();
        loadBrands();
    } else {
        if(window.showToast) window.showToast(result.message, 'error');
    }
}

async function deleteBrand(id) {
    if (!confirm("Delete this brand? This action cannot be undone.")) return;

    const response = await fetch(`${window.API_BASE_URL}/brands/${id}`, {
        method: "DELETE",
        headers: { Authorization: "Bearer " + token }
    });

    const result = await response.json();

    if (result.success) {
        if(window.showToast) window.showToast('Brand deleted successfully');
        loadBrands();
    } else {
        if(window.showToast) window.showToast(result.message, 'error');
    }
}