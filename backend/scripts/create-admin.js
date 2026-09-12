/**
 * CHIPELEC POWER SYSTEM - Admin Bootstrap Script
 * Run ONCE to create the first admin user in Firebase Auth
 * and their corresponding Firestore /admins/{uid} document.
 *
 * HOW TO RUN:
 *   cd backend
 *   node scripts/create-admin.js
 *
 * PREREQUISITES:
 *   - serviceAccountKey.json must be in backend/scripts/
 *   - firebase-admin must be installed (already done)
 */

"use strict";

const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

// CONFIGURE YOUR FIRST ADMIN HERE
const ADMIN_EMAIL    = "admin@chipelec.com";
const ADMIN_PASSWORD = "Admin@1234";
const ADMIN_NAME     = "System Administrator";
const ADMIN_ROLE     = "superadmin";

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();
const db   = admin.firestore();

async function main() {
    console.log("=".repeat(50));
    console.log("CHIPELEC - Admin Bootstrap");
    console.log("=".repeat(50));

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
        createdAt:  admin.firestore.FieldValue.serverTimestamp(),
        updatedAt:  admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    console.log("Firestore /admins/" + uid + " document created/updated.");
    console.log("");
    console.log("Admin bootstrap complete!");
    console.log("  Email:    " + ADMIN_EMAIL);
    console.log("  Password: " + ADMIN_PASSWORD);
    console.log("  Role:     " + ADMIN_ROLE);
    console.log("");
    console.log("IMPORTANT: Log into the admin portal and change your password!");

    process.exit(0);
}

main().catch(err => {
    console.error("Error:", err.message);
    process.exit(1);
});
