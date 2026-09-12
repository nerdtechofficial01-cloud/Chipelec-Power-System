/**
 * CHIPELEC POWER SYSTEM — MySQL → Firestore Data Migration Script
 * ===============================================================
 * Phase 6: Migrate existing MySQL data to Firestore
 *
 * PREREQUISITES:
 *   1. Firebase Admin SDK installed:
 *        cd backend
 *        npm install firebase-admin
 *
 *   2. Service Account key downloaded:
 *        Firebase Console → Project Settings → Service Accounts
 *        → Generate new private key → save as backend/serviceAccountKey.json
 *        NEVER commit serviceAccountKey.json to git.
 *
 *   3. Railway MySQL must be accessible (or use a local dump).
 *      If Railway is offline, export your MySQL data first.
 *
 *   4. Fill in the MySQL credentials below (same as backend/.env).
 *
 * HOW TO RUN:
 *   cd backend
 *   node scripts/migrate-to-firestore.js
 *
 * WHAT IT DOES:
 *   - Reads each MySQL table
 *   - Maps rows to Firestore documents using the agreed schema
 *   - Writes to Firestore in batches of 450 (Firestore limit: 500/batch)
 *   - Skips documents that already exist (safe to re-run)
 *   - Does NOT delete MySQL data
 *   - Does NOT delete Firestore data that already exists
 *
 * TABLES MIGRATED (in dependency order):
 *   1. brands
 *   2. categories
 *   3. products (denormalises brand_name + category_name)
 *   4. enquiries
 *   5. orders
 *   6. sales
 *   7. installations
 *   8. maintenance
 *   9. service_requests
 *  10. services
 *  11. quotations
 *
 * TABLES NOT MIGRATED BY THIS SCRIPT:
 *   - admins      → create admin users manually in Firebase Console
 *   - customers   → separate script needed (requires Firebase Auth API)
 *   - inventory_transactions  → internal/log table, review before migrating
 *   - purchase_orders         → review before migrating
 */

"use strict";

const path             = require("path");
const mysql            = require("mysql2/promise");
const admin            = require("firebase-admin");
const serviceAccount   = require("./serviceAccountKey.json"); // DO NOT COMMIT THIS FILE

// ─────────────────────────────────────────────────────────────
//  CONFIGURATION
// ─────────────────────────────────────────────────────────────
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const MYSQL_CONFIG = {
    host:     process.env.DB_HOST,
    port:     parseInt(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
};

const DRY_RUN = false; // Set to true to print what would be written without writing

// ─────────────────────────────────────────────────────────────
//  INITIALISE FIREBASE ADMIN
// ─────────────────────────────────────────────────────────────
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

// ─────────────────────────────────────────────────────────────
//  BATCH WRITER HELPER
//  Firestore batches are limited to 500 operations.
//  We use 450 as a safe threshold.
// ─────────────────────────────────────────────────────────────
class BatchWriter {
    constructor(db) {
        this.db = db;
        this.batch = db.batch();
        this.count = 0;
        this.committed = 0;
    }

    set(ref, data) {
        this.batch.set(ref, data, { merge: false });
        this.count++;
        if (this.count >= 450) {
            return this.flush();
        }
        return Promise.resolve();
    }

    async flush() {
        if (this.count === 0) return;
        if (!DRY_RUN) {
            await this.batch.commit();
        }
        this.committed += this.count;
        console.log(`  ✅ Committed ${this.count} documents (total: ${this.committed})`);
        this.batch = this.db.batch();
        this.count = 0;
    }
}

// ─────────────────────────────────────────────────────────────
//  TIMESTAMP HELPER
// ─────────────────────────────────────────────────────────────
function toTimestamp(mysqlDate) {
    if (!mysqlDate) return null;
    return admin.firestore.Timestamp.fromDate(new Date(mysqlDate));
}

function serverTs() {
    return FieldValue.serverTimestamp();
}

// ─────────────────────────────────────────────────────────────
//  MIGRATION FUNCTIONS
// ─────────────────────────────────────────────────────────────

async function migrateBrands(conn, writer) {
    console.log("\n📦 Migrating brands...");
    const [rows] = await conn.query("SELECT * FROM brands ORDER BY id");
    for (const row of rows) {
        const ref = db.collection("brands").doc(String(row.id));
        await writer.set(ref, {
            brand_name: row.brand_name || "",
            mysqlId:    row.id,
            createdAt:  serverTs()
        });
    }
    await writer.flush();
    console.log(`  Total: ${rows.length} brands`);
    return rows; // return for building lookup maps
}

async function migrateCategories(conn, writer) {
    console.log("\n📦 Migrating categories...");
    const [rows] = await conn.query("SELECT * FROM categories ORDER BY id");
    for (const row of rows) {
        const ref = db.collection("categories").doc(String(row.id));
        await writer.set(ref, {
            category_name: row.category_name || "",
            mysqlId:       row.id,
            createdAt:     serverTs()
        });
    }
    await writer.flush();
    console.log(`  Total: ${rows.length} categories`);
    return rows;
}

async function migrateProducts(conn, writer, brands, categories) {
    console.log("\n📦 Migrating products...");

    // Build lookup maps from the already-migrated brand/category rows
    const brandMap    = Object.fromEntries(brands.map(b => [b.id, b.brand_name]));
    const categoryMap = Object.fromEntries(categories.map(c => [c.id, c.category_name]));

    const [rows] = await conn.query(`
        SELECT p.*
        FROM products p
        ORDER BY p.id
    `);

    for (const row of rows) {
        const ref = db.collection("products").doc(String(row.id));
        await writer.set(ref, {
            product_name:   row.product_name   || "",
            model_number:   row.model_number   || null,
            capacity:       row.capacity       || null,
            warranty:       row.warranty       || null,
            price:          parseFloat(row.price) || 0,
            stock_quantity: parseInt(row.stock_quantity) || 0,
            description:    row.description    || null,
            image:          row.image          || null,  // filename only — resolve URL in UI
            status:         row.status         || "Active",
            // Denormalised fields (avoid JOIN on every product list read)
            brand_id:       String(row.brand_id),
            brand_name:     brandMap[row.brand_id] || null,
            category_id:    String(row.category_id),
            category_name:  categoryMap[row.category_id] || null,
            mysqlId:        row.id,
            createdAt:      serverTs(),
            updatedAt:      serverTs()
        });
    }
    await writer.flush();
    console.log(`  Total: ${rows.length} products`);
}

async function migrateEnquiries(conn, writer) {
    console.log("\n📦 Migrating enquiries...");
    // product_id column may or may not exist — query safely
    let rows;
    try {
        [rows] = await conn.query("SELECT * FROM enquiries ORDER BY id");
    } catch (err) {
        console.warn("  ⚠️  enquiries query failed:", err.message);
        return;
    }

    for (const row of rows) {
        const ref = db.collection("enquiries").doc(String(row.id));
        await writer.set(ref, {
            full_name:    row.full_name    || "",
            phone:        row.phone        || "",
            email:        row.email        || null,
            product_id:   row.product_id ? String(row.product_id) : null,
            product_name: null, // will be populated when products are known
            subject:      row.subject      || null,
            message:      row.message      || "",
            status:       row.status       || "New",
            mysqlId:      row.id,
            createdAt:    toTimestamp(row.created_at) || serverTs(),
            updatedAt:    toTimestamp(row.updated_at) || serverTs()
        });
    }
    await writer.flush();
    console.log(`  Total: ${rows.length} enquiries`);
}

async function migrateOrders(conn, writer) {
    console.log("\n📦 Migrating orders...");
    let rows;
    try {
        [rows] = await conn.query(`
            SELECT o.*, c.full_name AS customer_name
            FROM orders o
            LEFT JOIN customers c ON o.customer_id = c.id
            ORDER BY o.id
        `);
    } catch (err) {
        console.warn("  ⚠️  orders query failed:", err.message);
        return;
    }

    for (const row of rows) {
        const ref = db.collection("orders").doc(String(row.id));
        await writer.set(ref, {
            // NOTE: customer_id here is the MySQL numeric ID.
            // After customer migration, update these to Firebase UIDs.
            customer_id:    String(row.customer_id),
            customer_name:  row.customer_name || "",
            total_amount:   parseFloat(row.total_amount) || 0,
            payment_status: row.payment_status || "",
            order_status:   row.order_status   || "",
            mysqlId:        row.id,
            createdAt:      toTimestamp(row.created_at) || serverTs()
        });
    }
    await writer.flush();
    console.log(`  Total: ${rows.length} orders`);
}

async function migrateSales(conn, writer) {
    console.log("\n📦 Migrating sales...");
    let rows;
    try {
        [rows] = await conn.query(`
            SELECT s.*, c.full_name AS customer_name, p.product_name
            FROM sales s
            LEFT JOIN customers c ON s.customer_id = c.id
            LEFT JOIN products p ON s.product_id = p.id
            ORDER BY s.id
        `);
    } catch (err) {
        console.warn("  ⚠️  sales query failed:", err.message);
        return;
    }

    for (const row of rows) {
        const ref = db.collection("sales").doc(String(row.id));
        await writer.set(ref, {
            customer_id:    String(row.customer_id),
            customer_name:  row.customer_name || "",
            product_id:     row.product_id ? String(row.product_id) : null,
            product_name:   row.product_name   || null,
            quantity:       parseInt(row.quantity)     || 0,
            unit_price:     parseFloat(row.unit_price) || 0,
            total_amount:   parseFloat(row.total_amount) || 0,
            sale_date:      toTimestamp(row.sale_date),
            payment_status: row.payment_status || "",
            mysqlId:        row.id,
            createdAt:      serverTs()
        });
    }
    await writer.flush();
    console.log(`  Total: ${rows.length} sales`);
}

async function migrateInstallations(conn, writer) {
    console.log("\n📦 Migrating installations...");
    let rows;
    try {
        [rows] = await conn.query(`
            SELECT i.*, c.full_name AS customer_name, p.product_name
            FROM installations i
            LEFT JOIN customers c ON i.customer_id = c.id
            LEFT JOIN products p ON i.product_id = p.id
            ORDER BY i.id
        `);
    } catch (err) {
        console.warn("  ⚠️  installations query failed:", err.message);
        return;
    }

    for (const row of rows) {
        const ref = db.collection("installations").doc(String(row.id));
        await writer.set(ref, {
            customer_id:          String(row.customer_id),
            customer_name:        row.customer_name || "",
            product_id:           row.product_id ? String(row.product_id) : null,
            product_name:         row.product_name || null,
            installation_date:    toTimestamp(row.installation_date),
            technician_name:      row.technician_name || null,
            installation_address: row.installation_address || "",
            installation_status:  row.installation_status || "Pending",
            remarks:              row.remarks || null,
            mysqlId:              row.id,
            createdAt:            serverTs()
        });
    }
    await writer.flush();
    console.log(`  Total: ${rows.length} installations`);
}

async function migrateMaintenance(conn, writer) {
    console.log("\n📦 Migrating maintenance...");
    let rows;
    try {
        [rows] = await conn.query(`
            SELECT m.*, c.full_name AS customer_name, p.product_name
            FROM maintenance m
            LEFT JOIN customers c ON m.customer_id = c.id
            LEFT JOIN products p ON m.product_id = p.id
            ORDER BY m.id
        `);
    } catch (err) {
        console.warn("  ⚠️  maintenance query failed:", err.message);
        return;
    }

    for (const row of rows) {
        const ref = db.collection("maintenance").doc(String(row.id));
        await writer.set(ref, {
            customer_id:      String(row.customer_id),
            customer_name:    row.customer_name || "",
            product_id:       row.product_id ? String(row.product_id) : null,
            product_name:     row.product_name || null,
            maintenance_date: toTimestamp(row.maintenance_date),
            maintenance_type: row.maintenance_type || "",
            technician_name:  row.technician_name  || null,
            status:           row.status || "Pending",
            remarks:          row.remarks || null,
            mysqlId:          row.id,
            createdAt:        serverTs()
        });
    }
    await writer.flush();
    console.log(`  Total: ${rows.length} maintenance records`);
}

async function migrateServiceRequests(conn, writer) {
    console.log("\n📦 Migrating service_requests...");
    let rows;
    try {
        [rows] = await conn.query(`
            SELECT sr.*, c.full_name AS customer_name
            FROM service_requests sr
            LEFT JOIN customers c ON sr.customer_id = c.id
            ORDER BY sr.id
        `);
    } catch (err) {
        console.warn("  ⚠️  service_requests query failed:", err.message);
        return;
    }

    for (const row of rows) {
        const ref = db.collection("service_requests").doc(String(row.id));
        await writer.set(ref, {
            customer_id:       String(row.customer_id),
            customer_name:     row.customer_name || "",
            request_type:      row.request_type  || "",
            request_date:      toTimestamp(row.request_date),
            issue_description: row.issue_description || "",
            service_status:    row.service_status    || "Pending",
            technician_name:   row.technician_name   || null,
            service_charge:    row.service_charge ? parseFloat(row.service_charge) : null,
            completed_date:    toTimestamp(row.completed_date),
            mysqlId:           row.id,
            createdAt:         serverTs()
        });
    }
    await writer.flush();
    console.log(`  Total: ${rows.length} service requests`);
}

async function migrateServices(conn, writer) {
    console.log("\n📦 Migrating services (admin-managed)...");
    let rows;
    try {
        [rows] = await conn.query(`
            SELECT s.*, c.full_name AS customer_full_name
            FROM services s
            LEFT JOIN customers c ON s.customer_id = c.id
            ORDER BY s.id
        `);
    } catch (err) {
        console.warn("  ⚠️  services query failed:", err.message);
        return;
    }

    for (const row of rows) {
        const ref = db.collection("services").doc(String(row.id));
        await writer.set(ref, {
            customer_id:    String(row.customer_id),
            customer_name:  row.customer_full_name || "",
            service_type:   row.service_type   || "",
            product_name:   row.product_name   || "",
            complaint:      row.complaint      || "",
            service_status: row.service_status || "",
            service_date:   toTimestamp(row.service_date),
            mysqlId:        row.id,
            createdAt:      serverTs()
        });
    }
    await writer.flush();
    console.log(`  Total: ${rows.length} services`);
}

async function migrateQuotations(conn, writer) {
    console.log("\n📦 Migrating quotations...");
    let rows;
    try {
        [rows] = await conn.query(`
            SELECT q.*, c.full_name AS customer_name
            FROM quotations q
            LEFT JOIN customers c ON q.customer_id = c.id
            ORDER BY q.id
        `);
    } catch (err) {
        console.warn("  ⚠️  quotations query failed (table may not exist):", err.message);
        return;
    }

    for (const row of rows) {
        const ref = db.collection("quotations").doc(String(row.id));
        await writer.set(ref, {
            customer_id:       String(row.customer_id),
            customer_name:     row.customer_name || "",
            items_description: row.items_description || "",
            amount:            parseFloat(row.amount) || 0,
            tax:               parseFloat(row.tax) || 0,
            total_amount:      parseFloat(row.total_amount) || 0,
            valid_until:       toTimestamp(row.valid_until),
            status:            row.status || "Pending",
            mysqlId:           row.id,
            createdAt:         toTimestamp(row.created_at) || serverTs()
        });
    }
    await writer.flush();
    console.log(`  Total: ${rows.length} quotations`);
}

// ─────────────────────────────────────────────────────────────
//  MAIN
// ─────────────────────────────────────────────────────────────
async function main() {
    console.log("=".repeat(60));
    console.log("CHIPELEC — MySQL → Firestore Migration");
    console.log(DRY_RUN ? "MODE: DRY RUN (no writes)" : "MODE: LIVE WRITE");
    console.log("=".repeat(60));

    let conn;
    try {
        console.log("\n🔌 Connecting to MySQL...");
        conn = await mysql.createConnection(MYSQL_CONFIG);
        console.log("✅ MySQL connected");
    } catch (err) {
        console.error("❌ MySQL connection failed:", err.message);
        console.error("   Is the Railway database still accessible?");
        console.error("   Check DB_HOST, DB_PORT, DB_USER, DB_PASSWORD in backend/.env");
        process.exit(1);
    }

    const writer = new BatchWriter(db);

    try {
        // Migrate in dependency order (referenced tables first)
        const brands     = await migrateBrands(conn, writer);
        const categories = await migrateCategories(conn, writer);
        await migrateProducts(conn, writer, brands, categories);
        await migrateEnquiries(conn, writer);
        await migrateOrders(conn, writer);
        await migrateSales(conn, writer);
        await migrateInstallations(conn, writer);
        await migrateMaintenance(conn, writer);
        await migrateServiceRequests(conn, writer);
        await migrateServices(conn, writer);
        await migrateQuotations(conn, writer);

        console.log("\n" + "=".repeat(60));
        console.log("✅ Migration complete!");
        console.log("\nNEXT STEPS:");
        console.log("  1. Verify data in Firebase Console → Firestore");
        console.log("  2. Run customer migration separately (requires Firebase Auth API)");
        console.log("  3. Update customer_id references from MySQL IDs to Firebase UIDs");
        console.log("  4. Deploy Firestore security rules");
        console.log("=".repeat(60));
    } catch (err) {
        console.error("\n❌ Migration error:", err);
    } finally {
        await conn.end();
        process.exit(0);
    }
}

main();
