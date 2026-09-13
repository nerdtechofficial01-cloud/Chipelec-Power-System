"use strict";

const { initializeApp, cert } = require("firebase-admin/app");
const { getAuth }             = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const serviceAccount = require("./serviceAccountKey.json");

const ADMIN_EMAIL    = "admin@chipelec.com";
const ADMIN_PASSWORD = "Admin@1234";
const ADMIN_NAME     = "System Administrator";
const ADMIN_ROLE     = "superadmin";

initializeApp({ credential: cert(serviceAccount) });

const auth = getAuth();
const db   = getFirestore();

async function main() {
    console.log("==================================================");
    console.log("CHIPELEC - Admin Bootstrap");
    console.log("==================================================");

    let uid;

    try {
        const existing = await auth.getUserByEmail(ADMIN_EMAIL);
        uid = existing.uid;
        console.log("Firebase Auth user already exists: " + ADMIN_EMAIL + " (uid: " + uid + ")");
    } catch (err) {
        if (err.code === "auth/user-not-found") {
            const userRecord = await auth.createUser({
                email:         ADMIN_EMAIL,
                password:      ADMIN_PASSWORD,
                displayName:   ADMIN_NAME,
                emailVerified: true
            });
            uid = userRecord.uid;
            console.log("Firebase Auth user created: " + ADMIN_EMAIL + " (uid: " + uid + ")");
        } else {
            throw err;
        }
    }

    await db.collection("admins").doc(uid).set({
        full_name:  ADMIN_NAME,
        email:      ADMIN_EMAIL,
        role:       ADMIN_ROLE,
        createdAt:  FieldValue.serverTimestamp(),
        updatedAt:  FieldValue.serverTimestamp()
    }, { merge: true });

    console.log("Firestore /admins/" + uid + " document created.");
    console.log("==================================================");
    console.log("Admin bootstrap complete!");
    console.log("  Email:    " + ADMIN_EMAIL);
    console.log("  Password: " + ADMIN_PASSWORD);
    console.log("==================================================");
    console.log("IMPORTANT: Change your password after first login!");

    process.exit(0);
}

main().catch(err => {
    console.error("Error:", err.message);
    process.exit(1);
});