/* ============================================
   CHIPELEC POWER SYSTEM — API Configuration
   Centralized environment-aware API base URL.
   Load this as the FIRST script on every page.
   ============================================ */

(function () {
    const hostname = window.location.hostname;

    // Local development
    if (hostname === "localhost" || hostname === "127.0.0.1") {
        window.API_BASE_URL = "http://localhost:5000/api";
    } else {
        // Production — Railway backend
        window.API_BASE_URL = "https://chipelec-power-system-production.up.railway.app/api";
    }

    console.log("[Config] API_BASE_URL:", window.API_BASE_URL);
})();
