/**
 * CHIPELEC POWER SYSTEM — MySQL → Firebase Customer Migration Script
 * ==================================================================
 * Phase 6b: Migrate existing MySQL customers to Firebase Auth + Firestore
 *
 * PREREQUISITES:
 *   1. Firebase Admin SDK installed: npm install firebase-admin
 *   2. serviceAccountKey.json present in backend/
 *   3. Railway MySQL must be accessible (or use local dump).
 *
 * HOW IT WORKS:
 *   - Reads all customers from MySQL
 *   - Creates a Firebase Authentication user for each customer
 *   - Sets a default password (change this logic as needed)
 *   - Creates a Firestore document in /customers/{uid}
 *   - Maps the old MySQL customer ID to the new Firebase UID
 *     so you can update foreign keys in orders/installations later.
 */

"use strict";

const path             = require("path");
const mysql            = require("mysql2/promise");
const admin            = require("firebase-admin");
const serviceAccount   = require("./serviceAccountKey.json"); // DO NOT COMMIT THIS FILE

require("dotenv").config({ path: path.join(__dirname, "../.env") });

const MYSQL_CONFIG = {
    host:     process.env.DB_HOST,
    port:     parseInt(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
};

// INITIALISE FIREBASE ADMIN
if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();
const auth = admin.auth();
const FieldValue = admin.firestore.FieldValue;

const DEFAULT_PASSWORD = "Password@123!"; // Customers will need to reset this!

async function migrateCustomers() {
    console.log("=".repeat(60));
    console.log("CHIPELEC — Customer Data Migration to Firebase");
    console.log("=".repeat(60));

    let conn;
    try {
        console.log("🔌 Connecting to MySQL...");
        conn = await mysql.createConnection(MYSQL_CONFIG);
    } catch (err) {
        console.error("❌ MySQL connection failed:", err.message);
        process.exit(1);
    }

    const [rows] = await conn.query("SELECT * FROM customers ORDER BY id");
    console.log(`📦 Found ${rows.length} customers in MySQL.\n`);

    let successCount = 0;
    let failCount = 0;
    
    // Write map of old IDs to new UIDs for foreign key updating
    const idMap = {}; 

    for (const row of rows) {
        try {
            // 1. Check if user already exists in Firebase Auth by Email
            let userRecord;
            try {
                userRecord = await auth.getUserByEmail(row.email);
                console.log(`  [SKIP] User already in Auth: ${row.email}`);
            } catch (err) {
                if (err.code === 'auth/user-not-found') {
                    // Create new Auth User
                    userRecord = await auth.createUser({
                        email: row.email,
                        password: DEFAULT_PASSWORD,
                        displayName: row.full_name || null,
                        phoneNumber: row.phone && row.phone.startsWith('+') ? row.phone : undefined // Firebase requires E.164 format for phone
                    });
                    console.log(`  [CREATE] Auth User: ${row.email} (UID: ${userRecord.uid})`);
                } else {
                    throw err;
                }
            }

            // Map old ID to new UID
            idMap[row.id] = userRecord.uid;

            // 2. Create Firestore Profile
            const ref = db.collection("customers").doc(userRecord.uid);
            await ref.set({
                full_name: row.full_name || "",
                email:     row.email,
                phone:     row.phone     || "",
                address:   row.address   || null,
                city:      row.city      || null,
                state:     row.state     || null,
                pincode:   row.pincode   || null,
                mysqlId:   row.id,
                createdAt: row.created_at ? admin.firestore.Timestamp.fromDate(new Date(row.created_at)) : FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp()
            }, { merge: true }); // Use merge so we don't overwrite if re-running

            successCount++;
        } catch (err) {
            console.error(`  [ERROR] Failed to migrate ${row.email}:`, err.message);
            failCount++;
        }
    }

    console.log("\n" + "=".repeat(60));
    console.log(`✅ Migration complete: ${successCount} succeeded, ${failCount} failed.`);
    console.log("⚠️  NOTE: Customers must be notified to reset their passwords.");
    console.log("=".repeat(60));
    
    // Save the ID map so you can run a script later to update orders/installations
    require("fs").writeFileSync(
        path.join(__dirname, "customer_id_map.json"), 
        JSON.stringify(idMap, null, 2)
    );
    console.log("💾 Saved customer_id_map.json (Use this to update foreign keys in Firestore)");

    await conn.end();
}

migrateCustomers();
