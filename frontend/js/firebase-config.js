/**
 * CHIPELEC POWER SYSTEM — Firebase Configuration (Admin Portal)
 * =============================================================
 * Phase 3: Firebase Integration Layer
 *
 * SETUP INSTRUCTIONS — fill in YOUR values before using:
 * 1. Open: https://console.firebase.google.com/project/chipelec-power-system/settings/general
 * 2. Scroll down to "Your apps" → click your Web App (the </> icon)
 * 3. Under "SDK setup and configuration", select "Config"
 * 4. Copy apiKey, messagingSenderId, and appId into the object below.
 *
 * Load this script FIRST on every admin page, before any other JS:
 *   <script type="module" src="js/firebase-config.js"></script>
 *
 * DO NOT commit real credentials to a public repository.
 * These client-side keys are safe to expose (they are scoped by
 * Firestore Security Rules and Firebase Auth — not secret keys).
 */

import { initializeApp }       from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, updatePassword, EmailAuthProvider, reauthenticateWithCredential }
                                from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy, limit, getCountFromServer, writeBatch, serverTimestamp, Timestamp }
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
    console.log("[Firebase] Admin portal initialised ✅  project: chipelec-power-system");
} catch (err) {
    console.error("[Firebase] Initialisation failed:", err.message);
    console.error("[Firebase] Have you filled in apiKey, messagingSenderId, and appId in firebase-config.js?");
}

export const auth = _auth;
export const db   = _db;

// ─────────────────────────────────────────────────────────────
//  WINDOW BRIDGE
//  Expose auth, db, and helper utilities to non-module scripts
//  so existing JS files can access Firebase during the migration.
//  Usage from non-module script: window.__fb.auth, window.__fb.db
// ─────────────────────────────────────────────────────────────
window.__fb = {
    auth,
    db,
    // Firestore helpers
    collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
    query, where, orderBy, limit, getCountFromServer, writeBatch, serverTimestamp, Timestamp,
    // Auth helpers
    signInWithEmailAndPassword, signOut, updatePassword,
    EmailAuthProvider, reauthenticateWithCredential, onAuthStateChanged
};

// ─────────────────────────────────────────────────────────────
//  ADMIN AUTH HELPERS
// ─────────────────────────────────────────────────────────────

/**
 * Sign in as admin with email and password.
 * @returns {Promise<{uid, email, displayName}>}
 */
export async function adminSignIn(email, password) {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const user = credential.user;

    // Load the admin Firestore document to get role and full_name
    const adminDoc = await getDoc(doc(db, "admins", user.uid));
    if (!adminDoc.exists()) {
        await signOut(auth);
        throw new Error("Account not authorised as admin. Contact system administrator.");
    }

    const adminData = adminDoc.data();
    return {
        uid:       user.uid,
        email:     user.email,
        full_name: adminData.full_name || user.displayName || "Admin",
        role:      adminData.role || "admin"
    };
}

/**
 * Sign out admin and clear local storage.
 */
export async function adminSignOut() {
    try { await signOut(auth); } catch (_) { /* ignore */ }
    localStorage.removeItem("token");
    localStorage.removeItem("admin");
    localStorage.removeItem("firebaseAdmin");
    window.location.href = "login.html";
}

/**
 * Get the currently signed-in admin user (Firebase Auth object).
 * Returns null if not signed in.
 */
export function getCurrentAdmin() {
    return auth.currentUser;
}

/**
 * Listen for admin auth state changes.
 * @param {Function} callback  Called with Firebase User or null
 * @returns unsubscribe function
 */
export function onAdminAuthStateChanged(callback) {
    return onAuthStateChanged(auth, callback);
}

// ─────────────────────────────────────────────────────────────
//  FIRESTORE COLLECTION REFS  (convenient named exports)
// ─────────────────────────────────────────────────────────────
export const Collections = {
    admins:           () => collection(db, "admins"),
    customers:        () => collection(db, "customers"),
    brands:           () => collection(db, "brands"),
    categories:       () => collection(db, "categories"),
    products:         () => collection(db, "products"),
    enquiries:        () => collection(db, "enquiries"),
    orders:           () => collection(db, "orders"),
    sales:            () => collection(db, "sales"),
    installations:    () => collection(db, "installations"),
    maintenance:      () => collection(db, "maintenance"),
    service_requests: () => collection(db, "service_requests"),
    services:         () => collection(db, "services"),
    quotations:       () => collection(db, "quotations")
};

// ─────────────────────────────────────────────────────────────
//  GENERIC CRUD HELPERS  (admin — all guarded by Security Rules)
// ─────────────────────────────────────────────────────────────

/** Fetch all documents from a collection, ordered by createdAt desc. */
export async function fetchAll(collectionName) {
    const q = query(
        collection(db, collectionName),
        orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** Fetch a single document by Firestore document ID. */
export async function fetchById(collectionName, id) {
    const snap = await getDoc(doc(db, collectionName, id));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
}

/** Add a new document; createdAt and updatedAt are set automatically. */
export async function createDoc(collectionName, data) {
    const payload = {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };
    const ref = await addDoc(collection(db, collectionName), payload);
    return ref.id;
}

/** Update fields on an existing document; updatedAt is refreshed. */
export async function updateDocById(collectionName, id, data) {
    await updateDoc(doc(db, collectionName, id), {
        ...data,
        updatedAt: serverTimestamp()
    });
}

/** Delete a document by ID. */
export async function deleteDocById(collectionName, id) {
    await deleteDoc(doc(db, collectionName, id));
}

/** Get count of documents in a collection (free — uses aggregation API). */
export async function countDocs(collectionName) {
    const snap = await getCountFromServer(collection(db, collectionName));
    return snap.data().count;
}

/** Get count with a where filter. */
export async function countDocsWhere(collectionName, field, op, value) {
    const q = query(collection(db, collectionName), where(field, op, value));
    const snap = await getCountFromServer(q);
    return snap.data().count;
}
