// Base URL for API requests
const hostname = window.location.hostname;
const API_BASE_URL = (hostname === "localhost" || hostname === "127.0.0.1") 
    ? "http://localhost:5000/api" 
    : "https://chipelec-power-system-production.up.railway.app/api";

if (!API_BASE_URL || API_BASE_URL === "undefined") {
    console.error("CRITICAL ERROR: API_BASE_URL is missing or undefined.");
}

// ======================
// AUTH HELPERS
// ======================

function getCustomerToken() {
  return localStorage.getItem('customerToken');
}

function getCustomerData() {
  const data = localStorage.getItem('customerData');
  return data ? JSON.parse(data) : null;
}

function isCustomerLoggedIn() {
  return !!getCustomerToken();
}

function getAuthHeaders() {
  const token = getCustomerToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = 'Bearer ' + token;
  }
  return headers;
}

function customerLogout() {
  localStorage.removeItem('customerToken');
  localStorage.removeItem('customerData');
  window.location.href = 'login.html';
}

function requireCustomerLogin() {
  if (!isCustomerLoggedIn()) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

// Utility to handle fetch errors
async function handleResponse(response) {
  if (response.status === 401 || response.status === 403) {
    throw new Error("This service requires authentication. Please login to continue.");
  }
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
  }
  return response.json();
}

// ======================
// CUSTOMER AUTH API
// ======================

const CustomerAuthAPI = {
  register: async (data) => {
    try {
      const res = await fetch(`${API_BASE_URL}/customer/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return await handleResponse(res);
    } catch (error) {
      console.error("Error registering:", error);
      throw error;
    }
  },
  login: async (email, password) => {
    try {
      const res = await fetch(`${API_BASE_URL}/customer/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      return await handleResponse(res);
    } catch (error) {
      console.error("Error logging in:", error);
      throw error;
    }
  },
  getProfile: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/customer/profile`, {
        headers: getAuthHeaders()
      });
      return await handleResponse(res);
    } catch (error) {
      console.error("Error fetching profile:", error);
      throw error;
    }
  },
  updateProfile: async (data) => {
    try {
      const res = await fetch(`${API_BASE_URL}/customer/profile`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      });
      return await handleResponse(res);
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  },
  changePassword: async (data) => {
    try {
      const res = await fetch(`${API_BASE_URL}/customer/change-password`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      });
      return await handleResponse(res);
    } catch (error) {
      console.error("Error changing password:", error);
      throw error;
    }
  },
  getDashboardStats: async () => {
    try {
      const customerStr = localStorage.getItem('customer');
      if (!customerStr) throw new Error("Not logged in");
      const customer = JSON.parse(customerStr);
      const headers = getAuthHeaders();
      
      const [ordersRes, instRes, srvRes] = await Promise.all([
          fetch(`${API_BASE_URL}/orders`, { headers }).then(r => r.json()).catch(() => ({data: []})),
          fetch(`${API_BASE_URL}/installations`, { headers }).then(r => r.json()).catch(() => ({data: []})),
          fetch(`${API_BASE_URL}/service-requests`, { headers }).then(r => r.json()).catch(() => ({data: []}))
      ]);
      
      const orders = (ordersRes.data || []).filter(o => o.customer_name === customer.full_name);
      const installations = (instRes.data || []).filter(i => i.customer_id === customer.id);
      const services = (srvRes.data || []).filter(s => s.customer_id === customer.id);
      
      const myProducts = orders.length;
      const activeInstallations = installations.filter(i => !['Completed', 'Cancelled'].includes(i.installation_status)).length;
      const openComplaints = services.filter(s => !['Resolved', 'Cancelled'].includes(s.service_status)).length;
      
      const recentActivity = [
          ...installations.map(i => ({ id: i.id, type: 'Installation', date: i.installation_date, status: i.installation_status })),
          ...services.map(s => ({ id: s.id, type: 'Service Request', date: s.request_date, status: s.service_status }))
      ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 5);
      
      return {
          success: true,
          data: { myProducts, activeInstallations, openComplaints, recentActivity }
      };
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      throw error;
    }
  },
  getQuotations: async () => {
    // Railway backend frozen: simulate empty quotations since endpoint doesn't exist in production yet
    return { success: true, data: [] };
  }
};

// Product APIs
const ProductAPI = {
  getAllProducts: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/products`);
      return await handleResponse(res);
    } catch (error) {
      console.error("Error fetching products:", error);
      throw error;
    }
  },
  getProductById: async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/products/${id}`);
      return await handleResponse(res);
    } catch (error) {
      console.error("Error fetching product details:", error);
      throw error;
    }
  }
};

// Installation API
const InstallationAPI = {
  bookInstallation: async (data) => {
    try {
      const customerStr = localStorage.getItem('customer');
      if(customerStr) {
          const customer = JSON.parse(customerStr);
          data.customer_id = customer.id;
      }
      const res = await fetch(`${API_BASE_URL}/installations`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      });
      return await handleResponse(res);
    } catch (error) {
      console.error("Error booking installation:", error);
      throw error;
    }
  },
  getInstallations: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/installations`, {
        headers: getAuthHeaders()
      });
      const data = await handleResponse(res);
      const customerStr = localStorage.getItem('customer');
      if (data.success && data.data && customerStr) {
          const customer = JSON.parse(customerStr);
          data.data = data.data.filter(i => i.customer_id === customer.id);
      }
      return data;
    } catch (error) {
      console.error("Error fetching installations:", error);
      throw error;
    }
  }
};

// Service Request API
const ServiceAPI = {
  raiseRequest: async (data) => {
    try {
      const customerStr = localStorage.getItem('customer');
      if(customerStr) {
          const customer = JSON.parse(customerStr);
          data.customer_id = customer.id;
      }
      const res = await fetch(`${API_BASE_URL}/service-requests`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data)
      });
      return await handleResponse(res);
    } catch (error) {
      console.error("Error raising service request:", error);
      throw error;
    }
  },
  getServiceRequests: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/service-requests`, {
        headers: getAuthHeaders()
      });
      const data = await handleResponse(res);
      const customerStr = localStorage.getItem('customer');
      if (data.success && data.data && customerStr) {
          const customer = JSON.parse(customerStr);
          data.data = data.data.filter(s => s.customer_id === customer.id);
      }
      return data;
    } catch (error) {
      console.error("Error fetching service requests:", error);
      throw error;
    }
  }
};

window.api = {
  customerAuth: CustomerAuthAPI,
  products: ProductAPI,
  installations: InstallationAPI,
  services: ServiceAPI
};
