// Note: token and admin logic are handled in auth.js

document.addEventListener("DOMContentLoaded", () => {
    // Basic Admin Display
    const admin = JSON.parse(localStorage.getItem("admin"));
    if (admin) {
        // We use full_name if available, fallback to username
        const displayName = admin.full_name || admin.username || "Admin";
        const role = admin.role || "Administrator";
        
        document.getElementById("adminUsername").textContent = displayName;
        document.getElementById("viewUsername").value = displayName;
        document.getElementById("editUsername").value = displayName;
        
        document.getElementById("adminEmail").textContent = admin.email || "admin@chipelec.com";
        document.getElementById("viewEmail").value = admin.email || "admin@chipelec.com";
        document.getElementById("editEmail").value = admin.email || "admin@chipelec.com";
        
        document.getElementById("viewRole").value = role;
    }
});

function showEditForm() {
    document.getElementById("viewProfileSection").style.display = "none";
    document.getElementById("editProfileSection").style.display = "block";
}

function cancelEdit() {
    document.getElementById("editProfileSection").style.display = "none";
    document.getElementById("viewProfileSection").style.display = "block";
}

async function saveProfile() {
    const newName = document.getElementById("editUsername").value;
    const newEmail = document.getElementById("editEmail").value;
    
    if (!newName || !newEmail) {
        if(window.showToast) window.showToast("Name and email are required", "warning");
        return;
    }

    // In a real application, we would call an API endpoint like:
    // await fetch(window.API_BASE_URL + "/admin/profile", { method: "PUT", body: ... })
    // Since we don't have that endpoint guaranteed in the existing backend, we'll simulate success
    // and update local storage directly as per the previous basic implementation.

    try {
        const admin = JSON.parse(localStorage.getItem("admin")) || {};
        admin.full_name = newName;
        admin.username = newName; // Ensure backwards compatibility
        admin.email = newEmail;
        
        localStorage.setItem("admin", JSON.stringify(admin));
        
        // Update DOM
        document.getElementById("adminUsername").textContent = newName;
        document.getElementById("viewUsername").value = newName;
        document.getElementById("adminEmail").textContent = newEmail;
        document.getElementById("viewEmail").value = newEmail;
        
        // Update Topbar
        const topbarName = document.getElementById("topbarAdminName");
        const adminNameDisplay = document.getElementById("adminName");
        if(topbarName) topbarName.textContent = newName;
        if(adminNameDisplay) adminNameDisplay.textContent = newName;
        
        cancelEdit();
        if(window.showToast) window.showToast("Profile updated successfully!");
        
    } catch(err) {
        console.error(err);
        if(window.showToast) window.showToast("An error occurred", "error");
    }
}

async function changePassword() {
    const current = document.getElementById("currentPassword").value;
    const newPass = document.getElementById("newPassword").value;
    const confirm = document.getElementById("confirmPassword").value;
    
    if(!current || !newPass || !confirm) {
        if(window.showToast) window.showToast("Please fill all password fields", "warning");
        return;
    }
    
    if(newPass !== confirm) {
        if(window.showToast) window.showToast("New passwords do not match", "error");
        return;
    }
    
    // Simulate API call
    if(window.showToast) window.showToast("Password update endpoint not implemented in demo", "info");
    
    // Reset fields
    document.getElementById("currentPassword").value = "";
    document.getElementById("newPassword").value = "";
    document.getElementById("confirmPassword").value = "";
}
