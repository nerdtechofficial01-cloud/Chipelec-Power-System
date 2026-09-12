import {
  customerRegister,
  customerLogin,
  customerLogout,
  getCustomerProfile,
  updateCustomerProfile,
  changeCustomerPassword,
  getCustomerDashboardStats,
  getMyQuotations,
  getAllProducts,
  getProductById,
  bookInstallation,
  getMyInstallations,
  raiseServiceRequest,
  getMyServiceRequests,
  isCustomerSignedIn
} from "./firebase-config.js";

// ======================
// AUTH HELPERS (Legacy compatible wrappers)
// ======================
window.getCustomerToken = function() {
  return localStorage.getItem('customerToken') || localStorage.getItem('firebase-token-placeholder');
};

window.getCustomerData = function() {
  const data = localStorage.getItem('customerData') || localStorage.getItem('customer');
  return data ? JSON.parse(data) : null;
};

window.isCustomerLoggedIn = function() {
  return isCustomerSignedIn() || !!window.getCustomerToken();
};

window.customerLogout = async function() {
  await customerLogout();
};

window.requireCustomerLogin = function() {
  if (!window.isCustomerLoggedIn()) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
};

// ======================
// CUSTOMER AUTH API
// ======================
const CustomerAuthAPI = {
  register: async (data) => {
    try {
      const res = await customerRegister(data);
      return { success: true, user: res };
    } catch (error) {
      console.error("Error registering:", error);
      throw error;
    }
  },
  login: async (email, password) => {
    try {
      const res = await customerLogin(email, password);
      // Ensure local storage is updated so old UI code still works
      localStorage.setItem('customerToken', 'firebase-token-placeholder');
      localStorage.setItem('customerData', JSON.stringify(res));
      localStorage.setItem('customer', JSON.stringify(res));
      return { success: true, user: res };
    } catch (error) {
      console.error("Error logging in:", error);
      let errorMsg = error.message;
      if (errorMsg.includes('auth/invalid-credential')) errorMsg = "Invalid email or password.";
      if (errorMsg.includes('auth/user-not-found')) errorMsg = "User not found.";
      throw new Error(errorMsg);
    }
  },
  getProfile: async () => {
    try {
      const profile = await getCustomerProfile();
      return { success: true, data: profile };
    } catch (error) {
      console.error("Error fetching profile:", error);
      throw error;
    }
  },
  updateProfile: async (data) => {
    try {
      await updateCustomerProfile(data);
      // Update local storage so UI reflects immediately
      let cur = window.getCustomerData() || {};
      const updated = { ...cur, ...data };
      localStorage.setItem('customerData', JSON.stringify(updated));
      localStorage.setItem('customer', JSON.stringify(updated));
      return { success: true, message: "Profile updated successfully" };
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  },
  changePassword: async (data) => {
    try {
      await changeCustomerPassword(data.current_password, data.new_password);
      return { success: true, message: "Password updated successfully" };
    } catch (error) {
      console.error("Error changing password:", error);
      let msg = error.message;
      if (msg.includes('auth/invalid-credential')) msg = "Current password is incorrect. Please sign out and sign in again if this persists.";
      throw new Error(msg);
    }
  },
  getDashboardStats: async () => {
    try {
      const stats = await getCustomerDashboardStats();
      return { success: true, data: stats };
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      throw error;
    }
  },
  getQuotations: async () => {
    try {
      const quotes = await getMyQuotations();
      return { success: true, data: quotes };
    } catch (error) {
      console.error("Error fetching quotations:", error);
      throw error;
    }
  }
};

// ======================
// PRODUCT API
// ======================
const ProductAPI = {
  getAllProducts: async () => {
    try {
      const products = await getAllProducts();
      return { success: true, data: products };
    } catch (error) {
      console.error("Error fetching products:", error);
      throw error;
    }
  },
  getProductById: async (id) => {
    try {
      const product = await getProductById(id);
      return { success: true, data: product };
    } catch (error) {
      console.error("Error fetching product details:", error);
      throw error;
    }
  }
};

// ======================
// INSTALLATION API
// ======================
const InstallationAPI = {
  bookInstallation: async (data) => {
    try {
      const id = await bookInstallation(data);
      return { success: true, message: "Installation booked successfully", id };
    } catch (error) {
      console.error("Error booking installation:", error);
      throw error;
    }
  },
  getInstallations: async () => {
    try {
      const installations = await getMyInstallations();
      return { success: true, data: installations };
    } catch (error) {
      console.error("Error fetching installations:", error);
      throw error;
    }
  }
};

// ======================
// SERVICE REQUEST API
// ======================
const ServiceAPI = {
  raiseRequest: async (data) => {
    try {
      const id = await raiseServiceRequest(data);
      return { success: true, message: "Service request raised successfully", id };
    } catch (error) {
      console.error("Error raising service request:", error);
      throw error;
    }
  },
  getServiceRequests: async () => {
    try {
      const requests = await getMyServiceRequests();
      return { success: true, data: requests };
    } catch (error) {
      console.error("Error fetching service requests:", error);
      throw error;
    }
  }
};

// Expose legacy API to window
window.api = {
  customerAuth: CustomerAuthAPI,
  products: ProductAPI,
  installations: InstallationAPI,
  services: ServiceAPI
};
