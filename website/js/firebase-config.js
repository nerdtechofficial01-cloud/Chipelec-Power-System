/**
 * CHIPELEC POWER SYSTEM — Firebase Configuration (Customer Website)
 * =================================================================
 * Phase 3: Firebase Integration Layer
 *
 * SETUP INSTRUCTIONS — fill in YOUR values before using:
 * 1. Open: https://console.firebase.google.com/project/chipelec-power-system/settings/general
 * 2. Scroll down to "Your apps" → click your Web App (the </> icon)
 * 3. Under "SDK setup and configuration", select "Config"
 * 4. Copy apiKey, messagingSenderId, and appId into the object below.
 *    (These are the same values as in frontend/js/firebase-config.js —
 *     same Firebase project, same Web App.)
 *
 * Load this script FIRST on every website page that needs auth/data:
 *   <script type="module" src="js/firebase-config.js"></script>
 *
 * DO NOT commit real credentials to a public repository.
 */

import { initializeApp }       from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updatePassword, EmailAuthProvider, reauthenticateWithCredential, sendEmailVerification }
                                from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, setDoc, query, where, orderBy, limit, getCountFromServer, writeBatch, serverTimestamp, Timestamp }
                                from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

// ─────────────────────────────────────────────────────────────
//  FIREBASE PROJECT CONFIGURATION
//  Project ID is known: chipelec-power-system
//  Fill in the three values marked PASTE_HERE from Firebase Console
// ─────────────────────────────────────────────────────────────
const firebaseConfig = {
    apiKey:            "AIzaSyDyaPe4vcmrQCOxinnDFVNtriR7YZEz9TA",
    authDomain:        "chipelec-power-system.firebaseapp.com",
    projectId:         "chipelec-power-system",
    storageBucket:     "chipelec-power-system.firebasestorage.app",
    messagingSenderId: "448103674586",
    appId:             "1:448103674586:web:58cb4a0c2fd6677488abe3",
    measurementId:     "G-GZKRBSBW20"
};

// ─────────────────────────────────────────────────────────────
//  INITIALISE FIREBASE
// ─────────────────────────────────────────────────────────────
let _app, _auth, _db;

try {
    _app  = initializeApp(firebaseConfig);
    _auth = getAuth(_app);
    _db   = getFirestore(_app);
    console.log("[Firebase] Customer website initialised ✅  project: chipelec-power-system");
} catch (err) {
    console.error("[Firebase] Initialisation failed:", err.message);
    console.error("[Firebase] Have you filled in apiKey, messagingSenderId, and appId in firebase-config.js?");
}

export const auth = _auth;
export const db   = _db;

// ─────────────────────────────────────────────────────────────
//  WINDOW BRIDGE
//  Expose to window so non-module scripts (including the
//  existing api.js) can access Firebase during the migration.
//  Usage: window.__fb.auth, window.__fb.db, window.__fb.db_helpers
// ─────────────────────────────────────────────────────────────
window.__fb = {
    auth,
    db,
    // Firestore primitives
    collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, setDoc,
    query, where, orderBy, limit, getCountFromServer, writeBatch, serverTimestamp, Timestamp,
    // Auth primitives
    createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
    updatePassword, EmailAuthProvider, reauthenticateWithCredential,
    onAuthStateChanged, sendEmailVerification
};

// ─────────────────────────────────────────────────────────────
//  CUSTOMER AUTH HELPERS
// ─────────────────────────────────────────────────────────────

/**
 * Register a new customer with Firebase Auth + Firestore profile.
 * Replaces: POST /api/customer/register
 *
 * @param {Object} data  { full_name, email, password, phone, address, city, state, pincode }
 * @returns {Promise<{uid, email, full_name}>}
 */
export async function customerRegister(data) {
    const { full_name, email, password, phone, address, city, state, pincode } = data;

    // 1. Create Firebase Auth account
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const user = credential.user;

    // 2. Save profile to Firestore /customers/{uid}
    await setDoc(doc(db, "customers", user.uid), {
        full_name:  full_name || "",
        email:      email,
        phone:      phone || "",
        address:    address || null,
        city:       city || null,
        state:      state || null,
        pincode:    pincode || null,
        createdAt:  serverTimestamp(),
        updatedAt:  serverTimestamp()
    });

    // 3. Firebase Auth automatically sends a sign-in confirmation.
    //    Optionally send email verification:
    // await sendEmailVerification(user);

    return {
        uid:       user.uid,
        email:     user.email,
        full_name: full_name
    };
}

/**
 * Sign in an existing customer.
 * Replaces: POST /api/customer/login
 *
 * @returns {Promise<{uid, email, full_name, phone, ...}>}
 */
export async function customerLogin(email, password) {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const user = credential.user;

    // Load Firestore profile
    const profileSnap = await getDoc(doc(db, "customers", user.uid));
    if (!profileSnap.exists()) {
        // Edge case: Auth account exists but Firestore profile missing
        throw new Error("Customer profile not found. Please contact support.");
    }

    return { uid: user.uid, email: user.email, ...profileSnap.data() };
}

/**
 * Sign out the current customer and clear local storage.
 * Replaces: client-side customerLogout()
 */
export async function customerLogout() {
    try { await signOut(auth); } catch (_) { /* ignore */ }
    localStorage.removeItem("customerToken");
    localStorage.removeItem("customerData");
    localStorage.removeItem("customer");
    window.location.href = "login.html";
}

/**
 * Get the customer Firestore profile for the currently signed-in user.
 * Replaces: GET /api/customer/profile
 *
 * @returns {Promise<Object|null>}
 */
export async function getCustomerProfile() {
    const user = auth.currentUser;
    if (!user) return null;
    const snap = await getDoc(doc(db, "customers", user.uid));
    return snap.exists() ? { uid: user.uid, ...snap.data() } : null;
}

/**
 * Update the current customer's Firestore profile.
 * Replaces: PUT /api/customer/profile
 *
 * @param {Object} data  Fields to update (full_name, phone, address, etc.)
 */
export async function updateCustomerProfile(data) {
    const user = auth.currentUser;
    if (!user) throw new Error("Not signed in");
    await updateDoc(doc(db, "customers", user.uid), {
        ...data,
        updatedAt: serverTimestamp()
    });
}

/**
 * Change the current customer's password (requires recent login).
 * Replaces: PUT /api/customer/change-password
 *
 * @param {string} currentPassword  For re-authentication
 * @param {string} newPassword
 */
export async function changeCustomerPassword(currentPassword, newPassword) {
    const user = auth.currentUser;
    if (!user) throw new Error("Not signed in");

    // Re-authenticate before sensitive operation
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPassword);
}

/**
 * Listen for customer auth state changes.
 * @param {Function} callback  Called with Firebase User or null
 * @returns unsubscribe function
 */
export function onCustomerAuthStateChanged(callback) {
    return onAuthStateChanged(auth, callback);
}

/**
 * Check if a customer is currently signed in.
 */
export function isCustomerSignedIn() {
    return auth.currentUser !== null;
}

// ─────────────────────────────────────────────────────────────
//  CUSTOMER DATA HELPERS (Firestore reads for the website)
// ─────────────────────────────────────────────────────────────

/**
 * Get all installations for the current customer.
 * Replaces: GET /api/customer/installations
 */
export async function getMyInstallations() {
    const user = auth.currentUser;
    if (!user) return [];
    const q = query(
        collection(db, "installations"),
        where("customer_id", "==", user.uid),
        orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Submit a new installation request.
 * Replaces: POST /api/customer/installations
 */
export async function bookInstallation(data) {
    const user = auth.currentUser;
    if (!user) throw new Error("Not signed in");
    const profileSnap = await getDoc(doc(db, "customers", user.uid));
    const customerName = profileSnap.exists() ? profileSnap.data().full_name : "";

    const payload = {
        customer_id:           user.uid,
        customer_name:         customerName,
        product_id:            data.product_id || null,
        product_name:          data.product_name || null,
        installation_date:     data.installation_date
                                 ? Timestamp.fromDate(new Date(data.installation_date))
                                 : null,
        installation_address:  data.installation_address || "",
        installation_status:   "Pending",
        remarks:               data.remarks || "",
        createdAt:             serverTimestamp()
    };
    const ref = await addDoc(collection(db, "installations"), payload);
    return ref.id;
}

/**
 * Get all service requests for the current customer.
 * Replaces: GET /api/customer/service-requests
 */
export async function getMyServiceRequests() {
    const user = auth.currentUser;
    if (!user) return [];
    const q = query(
        collection(db, "service_requests"),
        where("customer_id", "==", user.uid),
        orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Submit a new service request.
 * Replaces: POST /api/customer/service-requests
 */
export async function raiseServiceRequest(data) {
    const user = auth.currentUser;
    if (!user) throw new Error("Not signed in");
    const profileSnap = await getDoc(doc(db, "customers", user.uid));
    const customerName = profileSnap.exists() ? profileSnap.data().full_name : "";

    const payload = {
        customer_id:       user.uid,
        customer_name:     customerName,
        request_type:      data.request_type || "",
        request_date:      data.request_date
                             ? Timestamp.fromDate(new Date(data.request_date))
                             : serverTimestamp(),
        issue_description: data.issue_description || "",
        service_status:    "Pending",
        technician_name:   null,
        service_charge:    null,
        completed_date:    null,
        createdAt:         serverTimestamp()
    };
    const ref = await addDoc(collection(db, "service_requests"), payload);
    return ref.id;
}

/**
 * Get all quotations for the current customer.
 * Replaces: GET /api/customer/quotations
 */
export async function getMyQuotations() {
    const user = auth.currentUser;
    if (!user) return [];
    const q = query(
        collection(db, "quotations"),
        where("customer_id", "==", user.uid),
        orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Get dashboard stats for the current customer.
 * Replaces: GET /api/customer/dashboard-stats
 */
export async function getCustomerDashboardStats() {
    const user = auth.currentUser;
    if (!user) return { myProducts: 0, activeInstallations: 0, openComplaints: 0, recentActivity: [] };

    const uid = user.uid;

    const [orderCount, activeInstCount, openSrvCount, recentInst, recentSrv] = await Promise.all([
        // Total orders
        getCountFromServer(query(collection(db, "orders"), where("customer_id", "==", uid)))
            .then(s => s.data().count).catch(() => 0),
        // Active installations (not Completed or Cancelled)
        // Firestore doesn't support != on multiple values in one query, so we fetch and filter
        getDocs(query(collection(db, "installations"), where("customer_id", "==", uid)))
            .then(s => s.docs.filter(d => !["Completed","Cancelled"].includes(d.data().installation_status)).length)
            .catch(() => 0),
        // Open service requests
        getDocs(query(collection(db, "service_requests"), where("customer_id", "==", uid)))
            .then(s => s.docs.filter(d => !["Resolved","Cancelled"].includes(d.data().service_status)).length)
            .catch(() => 0),
        // Recent installations (limit 5)
        getDocs(query(collection(db, "installations"), where("customer_id", "==", uid), orderBy("createdAt","desc"), limit(5)))
            .then(s => s.docs.map(d => ({ id: d.id, type: "Installation", ...d.data() })))
            .catch(() => []),
        // Recent service requests (limit 5)
        getDocs(query(collection(db, "service_requests"), where("customer_id", "==", uid), orderBy("createdAt","desc"), limit(5)))
            .then(s => s.docs.map(d => ({ id: d.id, type: "Service Request", ...d.data() })))
            .catch(() => [])
    ]);

    const recentActivity = [...recentInst, ...recentSrv]
        .sort((a, b) => {
            const aTime = a.createdAt?.toMillis?.() || 0;
            const bTime = b.createdAt?.toMillis?.() || 0;
            return bTime - aTime;
        })
        .slice(0, 5);

    return {
        myProducts:          orderCount,
        activeInstallations: activeInstCount,
        openComplaints:      openSrvCount,
        recentActivity
    };
}

// ─────────────────────────────────────────────────────────────
//  PUBLIC DATA HELPERS (no auth required — guarded by rules)
// ─────────────────────────────────────────────────────────────

/**
 * Get all products (public — no login needed).
 * Replaces: GET /api/products
 */
export async function getAllProducts() {
    const snap = await getDocs(collection(db, "products"));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Get a single product by Firestore document ID.
 * Replaces: GET /api/products/:id
 */
export async function getProductById(productId) {
    const snap = await getDoc(doc(db, "products", productId));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/**
 * Submit a public enquiry (no login needed).
 * Replaces: POST /api/enquiries
 *
 * @param {Object} data { full_name, phone, email, product_id, product_name, subject, message }
 */
export async function submitEnquiry(data) {
    const payload = {
        full_name:    data.full_name?.trim() || "",
        phone:        data.phone?.trim() || "",
        email:        data.email?.trim() || null,
        product_id:   data.product_id || null,
        product_name: data.product_name || null,
        subject:      data.subject?.trim() || null,
        message:      data.message?.trim() || "",
        status:       "New",
        createdAt:    serverTimestamp(),
        updatedAt:    serverTimestamp()
    };
    const ref = await addDoc(collection(db, "enquiries"), payload);
    return ref.id;
}
