import { adminSignIn } from "./firebase-config.js";

window.login = async function() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const btn = document.getElementById("loginBtn");
    const msg = document.getElementById("msg");

    if (!email || !password) {
        msg.innerHTML = '<div class="error-msg">Please enter both email and password</div>';
        return;
    }

    // UI Loading State
    const originalText = btn.innerHTML;
    btn.classList.add('btn-loading');
    msg.innerHTML = '';

    try {
        const adminData = await adminSignIn(email, password);

        // Store legacy values for compatibility during migration
        localStorage.setItem("token", "firebase-token-placeholder");
        localStorage.setItem("admin", JSON.stringify(adminData));
        localStorage.setItem("firebaseAdmin", JSON.stringify(adminData));

        // Small delay for smooth transition
        setTimeout(() => {
            window.location.href = "dashboard.html";
        }, 300);

    } catch (err) {
        console.error(err);
        btn.classList.remove('btn-loading');
        // Clean up Firebase error messages for the user
        let errorMsg = err.message || 'Invalid credentials';
        if (errorMsg.includes('auth/invalid-credential')) {
            errorMsg = "Invalid email or password.";
        }
        msg.innerHTML = `<div class="error-msg">${errorMsg}</div>`;
    }
};

// Add enter key support
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        const emailFocused = document.activeElement.id === 'email';
        const passwordFocused = document.activeElement.id === 'password';
        
        if (emailFocused || passwordFocused) {
            window.login();
        }
    }
});
