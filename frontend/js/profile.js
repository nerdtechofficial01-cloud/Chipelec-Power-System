// Phase 15 — profile.js migrated to Firestore
import { 
    auth, updateDocById 
} from "./firebase-config.js";
import { 
    updatePassword, EmailAuthProvider, reauthenticateWithCredential, updateProfile
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
    // Basic Admin Display
    const admin = JSON.parse(localStorage.getItem("admin"));
    if (admin) {
        const displayName = admin.full_name || admin.username || "Admin";
        const role = admin.role || "Administrator";
        
        document.getElementById("adminUsername").textContent = displayName;
        document.getElementById("viewUsername").value = displayName;
        document.getElementById("editUsername").value = displayName;
        
        document.getElementById("adminEmail").textContent = admin.email || "admin@chipelec.com";
        document.getElementById("viewEmail").value = admin.email || "admin@chipelec.com";
        // editEmail disabled to prevent out-of-sync Firebase Auth email
        const ee = document.getElementById("editEmail");
        if(ee) {
            ee.value = admin.email || "admin@chipelec.com";
            ee.readOnly = true;
        }
        
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
    if (!newName) {
        if(window.showToast) window.showToast("Name is required", "warning");
        return;
    }

    try {
        const user = auth.currentUser;
        if (!user) throw new Error("Not logged in");

        const adminData = JSON.parse(localStorage.getItem("admin")) || {};
        
        // Update Firestore Document
        await updateDocById("admins", user.uid, {
            full_name: newName,
            username: newName
        });

        // Update Auth Profile
        await updateProfile(user, { displayName: newName });

        // Update Local Storage
        adminData.full_name = newName;
        adminData.username = newName;
        localStorage.setItem("admin", JSON.stringify(adminData));
        
        // Update DOM
        document.getElementById("adminUsername").textContent = newName;
        document.getElementById("viewUsername").value = newName;
        
        // Update Topbar
        const topbarName = document.getElementById("topbarAdminName");
        const adminNameDisplay = document.getElementById("adminName");
        if(topbarName) topbarName.textContent = newName;
        if(adminNameDisplay) adminNameDisplay.textContent = newName;
        
        cancelEdit();
        if(window.showToast) window.showToast("Profile updated successfully!");
        
    } catch(err) {
        console.error(err);
        if(window.showToast) window.showToast("An error occurred: " + err.message, "error");
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
    
    try {
        const user = auth.currentUser;
        if (!user) throw new Error("Not logged in");

        // Reauthenticate
        const credential = EmailAuthProvider.credential(user.email, current);
        await reauthenticateWithCredential(user, credential);

        // Update password
        await updatePassword(user, newPass);

        if(window.showToast) window.showToast("Password updated successfully!", "success");
        
        // Reset fields
        document.getElementById("currentPassword").value = "";
        document.getElementById("newPassword").value = "";
        document.getElementById("confirmPassword").value = "";

    } catch (err) {
        console.error("Password update error:", err);
        let msg = "Failed to update password.";
        if (err.code === 'auth/wrong-password') msg = "Incorrect current password.";
        if (err.code === 'auth/weak-password') msg = "New password is too weak.";
        if (window.showToast) window.showToast(msg, "error");
    }
}

window.showEditForm = showEditForm;
window.cancelEdit = cancelEdit;
window.saveProfile = saveProfile;
window.changePassword = changePassword;
