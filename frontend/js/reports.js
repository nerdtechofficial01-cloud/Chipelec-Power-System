// Phase 15 — reports.js migrated to Firestore
import { fetchAll } from "./firebase-config.js";

let salesData = [];
let customerData = [];
let maintenanceData = [];
let inventoryData = [];

document.addEventListener("DOMContentLoaded", () => {
    showSalesReport();
});

function downloadPDF(title, columns, dataRows, filename) {
    if (!window.jspdf) {
        if(window.showToast) window.showToast("jsPDF library not loaded", "error");
        return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59);
    doc.text(`CHIPELEC POWER SYSTEM - ${title}`, 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

    doc.autoTable({
        startY: 36,
        head: [columns],
        body: dataRows,
        theme: 'grid',
        headStyles: { fillColor: [99, 102, 241], textColor: 255, fontSize: 10 },
        bodyStyles: { fontSize: 10, textColor: 50 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { top: 36 }
    });
    
    doc.save(filename);
}

// ----------------------
// SALES REPORT
// ----------------------
async function showSalesReport() {
    switchTab('sales-tab');
    document.getElementById("reportContent").innerHTML = '<div style="text-align:center;padding:40px;"><div class="spinner"></div><p>Loading Sales Data...</p></div>';
    
    try {
        salesData = await fetchAll("sales");
        
        let html = `
        <div class="report-header">
            <h3>Sales Overview</h3>
            <button class="btn btn-primary" onclick="exportSalesPDF()"><i class="bi bi-file-earmark-pdf"></i> Export PDF</button>
        </div>
        <table class="data-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Total (₹)</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
        `;
        
        if (salesData.length === 0) {
            html += `<tr><td colspan="6" style="text-align:center;">No sales data available.</td></tr>`;
        } else {
            salesData.forEach(s => {
                const sDate = s.sale_date?.toDate ? s.sale_date.toDate().toLocaleDateString('en-IN') : (s.sale_date ? String(s.sale_date).split('T')[0] : '-');
                html += `
                <tr>
                    <td>${sDate}</td>
                    <td>${s.customer_name || '-'}</td>
                    <td>${s.product_name || '-'}</td>
                    <td>${s.quantity}</td>
                    <td>₹${Number(s.total_amount||0).toLocaleString()}</td>
                    <td>${s.payment_status}</td>
                </tr>`;
            });
        }
        
        html += `</tbody></table>`;
        document.getElementById("reportContent").innerHTML = html;
        
    } catch(err) {
        console.error(err);
        document.getElementById("reportContent").innerHTML = '<div style="color:red;padding:20px;">Failed to load sales report.</div>';
    }
}

function exportSalesPDF() {
    const columns = ["Date", "Customer", "Product", "Qty", "Total (Rs)", "Status"];
    const rows = salesData.map(s => {
        const sDate = s.sale_date?.toDate ? s.sale_date.toDate().toLocaleDateString('en-IN') : (s.sale_date ? String(s.sale_date).split('T')[0] : '-');
        return [
            sDate,
            s.customer_name || '-',
            s.product_name || '-',
            s.quantity,
            s.total_amount,
            s.payment_status
        ];
    });
    downloadPDF("Sales Report", columns, rows, "sales_report.pdf");
}

// ----------------------
// CUSTOMER REPORT
// ----------------------
async function showCustomerReport() {
    switchTab('customers-tab');
    document.getElementById("reportContent").innerHTML = '<div style="text-align:center;padding:40px;"><div class="spinner"></div><p>Loading Customer Data...</p></div>';
    
    try {
        customerData = await fetchAll("customers");
        
        let html = `
        <div class="report-header">
            <h3>Customer Directory</h3>
            <button class="btn btn-primary" onclick="exportCustomerPDF()"><i class="bi bi-file-earmark-pdf"></i> Export PDF</button>
        </div>
        <table class="data-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>City</th>
                    <th>State</th>
                </tr>
            </thead>
            <tbody>
        `;
        
        if (customerData.length === 0) {
            html += `<tr><td colspan="5" style="text-align:center;">No customer data available.</td></tr>`;
        } else {
            customerData.forEach(c => {
                html += `
                <tr>
                    <td>${c.full_name || '-'}</td>
                    <td>${c.phone || '-'}</td>
                    <td>${c.email || '-'}</td>
                    <td>${c.city || '-'}</td>
                    <td>${c.state || '-'}</td>
                </tr>`;
            });
        }
        
        html += `</tbody></table>`;
        document.getElementById("reportContent").innerHTML = html;
        
    } catch(err) {
        console.error(err);
        document.getElementById("reportContent").innerHTML = '<div style="color:red;padding:20px;">Failed to load customer report.</div>';
    }
}

function exportCustomerPDF() {
    const columns = ["Name", "Phone", "Email", "City", "State"];
    const rows = customerData.map(c => [
        c.full_name || '-',
        c.phone || '-',
        c.email || '-',
        c.city || '-',
        c.state || '-'
    ]);
    downloadPDF("Customer Directory", columns, rows, "customer_report.pdf");
}

// ----------------------
// INVENTORY REPORT
// ----------------------
async function showInventoryReport() {
    switchTab('inventory-tab');
    document.getElementById("reportContent").innerHTML = '<div style="text-align:center;padding:40px;"><div class="spinner"></div><p>Loading Inventory Data...</p></div>';
    
    try {
        inventoryData = await fetchAll("products");
        
        let html = `
        <div class="report-header">
            <h3>Inventory Stock Level</h3>
            <button class="btn btn-primary" onclick="exportInventoryPDF()"><i class="bi bi-file-earmark-pdf"></i> Export PDF</button>
        </div>
        <table class="data-table">
            <thead>
                <tr>
                    <th>Product</th>
                    <th>Brand</th>
                    <th>Category</th>
                    <th>Price (₹)</th>
                    <th>Stock Qty</th>
                </tr>
            </thead>
            <tbody>
        `;
        
        if (inventoryData.length === 0) {
            html += `<tr><td colspan="5" style="text-align:center;">No inventory data available.</td></tr>`;
        } else {
            inventoryData.forEach(p => {
                const stockColor = p.stock_quantity < 10 ? 'color:red;font-weight:bold;' : 'color:green;font-weight:bold;';
                html += `
                <tr>
                    <td>${p.product_name}</td>
                    <td>${p.brand_name || '-'}</td>
                    <td>${p.category_name || '-'}</td>
                    <td>₹${Number(p.price).toLocaleString()}</td>
                    <td style="${stockColor}">${p.stock_quantity}</td>
                </tr>`;
            });
        }
        
        html += `</tbody></table>`;
        document.getElementById("reportContent").innerHTML = html;
        
    } catch(err) {
        console.error(err);
        document.getElementById("reportContent").innerHTML = '<div style="color:red;padding:20px;">Failed to load inventory report.</div>';
    }
}

function exportInventoryPDF() {
    const columns = ["Product", "Brand", "Category", "Price (Rs)", "Stock"];
    const rows = inventoryData.map(p => [
        p.product_name,
        p.brand_name || '-',
        p.category_name || '-',
        p.price,
        p.stock_quantity
    ]);
    downloadPDF("Inventory Stock Report", columns, rows, "inventory_report.pdf");
}

// ----------------------
// MAINTENANCE REPORT
// ----------------------
async function showMaintenanceReport() {
    switchTab('maintenance-tab');
    document.getElementById("reportContent").innerHTML = '<div style="text-align:center;padding:40px;"><div class="spinner"></div><p>Loading Maintenance Data...</p></div>';
    
    try {
        maintenanceData = await fetchAll("maintenance");
        
        let html = `
        <div class="report-header">
            <h3>Maintenance Records</h3>
            <button class="btn btn-primary" onclick="exportMaintenancePDF()"><i class="bi bi-file-earmark-pdf"></i> Export PDF</button>
        </div>
        <table class="data-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Product</th>
                    <th>Type</th>
                    <th>Technician</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
        `;
        
        if (maintenanceData.length === 0) {
            html += `<tr><td colspan="6" style="text-align:center;">No maintenance records available.</td></tr>`;
        } else {
            maintenanceData.forEach(m => {
                const mDate = m.maintenance_date?.toDate ? m.maintenance_date.toDate().toLocaleDateString('en-IN') : (m.maintenance_date ? String(m.maintenance_date).split('T')[0] : '-');
                html += `
                <tr>
                    <td>${mDate}</td>
                    <td>${m.customer_name || '-'}</td>
                    <td>${m.product_name || '-'}</td>
                    <td>${m.maintenance_type || '-'}</td>
                    <td>${m.technician_name || '-'}</td>
                    <td>${m.status || 'Pending'}</td>
                </tr>`;
            });
        }
        
        html += `</tbody></table>`;
        document.getElementById("reportContent").innerHTML = html;
        
    } catch(err) {
        console.error(err);
        document.getElementById("reportContent").innerHTML = '<div style="color:red;padding:20px;">Failed to load maintenance report.</div>';
    }
}

function exportMaintenancePDF() {
    const columns = ["Date", "Customer", "Product", "Type", "Technician", "Status"];
    const rows = maintenanceData.map(m => {
        const mDate = m.maintenance_date?.toDate ? m.maintenance_date.toDate().toLocaleDateString('en-IN') : (m.maintenance_date ? String(m.maintenance_date).split('T')[0] : '-');
        return [
            mDate,
            m.customer_name || '-',
            m.product_name || '-',
            m.maintenance_type || '-',
            m.technician_name || '-',
            m.status || 'Pending'
        ];
    });
    downloadPDF("Maintenance Report", columns, rows, "maintenance_report.pdf");
}

function switchTab(activeId) {
    document.querySelectorAll('.report-tab').forEach(t => t.classList.remove('active'));
    document.getElementById(activeId).classList.add('active');
}

window.showSalesReport = showSalesReport;
window.showCustomerReport = showCustomerReport;
window.showInventoryReport = showInventoryReport;
window.showMaintenanceReport = showMaintenanceReport;
window.exportSalesPDF = exportSalesPDF;
window.exportCustomerPDF = exportCustomerPDF;
window.exportInventoryPDF = exportInventoryPDF;
window.exportMaintenancePDF = exportMaintenancePDF;
