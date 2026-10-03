// Note: token is handled in auth.js

let salesData = [];
let customerData = [];
let maintenanceData = [];
let inventoryData = [];

// Load data initially
document.addEventListener("DOMContentLoaded", () => {
    // Initial tab load
    showSalesReport();
});

// PDF Export helper using jsPDF autoTable
function downloadPDF(title, columns, dataRows, filename) {
    if (!window.jspdf) {
        if(window.showToast) window.showToast("jsPDF library not loaded", "error");
        return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59); // var(--text-primary)
    doc.text(`CHIPELEC POWER SYSTEM - ${title}`, 14, 22);
    
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139); // var(--text-secondary)
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
    
    // Table
    doc.autoTable({
        startY: 40,
        head: [columns],
        body: dataRows,
        theme: 'grid',
        headStyles: { fillColor: [99, 102, 241] }, // var(--primary)
        styles: { fontSize: 9, cellPadding: 3 }
    });
    
    doc.save(`${filename}.pdf`);
    if(window.showToast) window.showToast(`Exported ${filename}.pdf successfully`);
}

// Excel Export helper using SheetJS
function downloadExcel(dataArray, filename) {
    if (!window.XLSX) {
        if(window.showToast) window.showToast("SheetJS library not loaded", "error");
        return;
    }
    
    const ws = XLSX.utils.json_to_sheet(dataArray);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${filename}.xlsx`);
    
    if(window.showToast) window.showToast(`Exported ${filename}.xlsx successfully`);
}

// --- Sales Report ---
async function showSalesReport() {
    try {
        const res = await fetch(window.API_BASE_URL + "/sales", {
            headers: { Authorization: "Bearer " + token }
        });
        const result = await res.json();
        salesData = result.data || [];
        
        let totalRev = 0;
        let html = "";
        
        if (salesData.length === 0) {
            html = `<tr><td colspan="6" style="text-align: center; padding: 30px;">No sales data available.</td></tr>`;
        } else {
            salesData.forEach(s => {
                totalRev += Number(s.total_amount) || 0;
                let d = s.sale_date;
                if(d && d.includes('T')) d = d.split('T')[0];
                
                let badge = "badge-success";
                if(s.payment_status === "Pending") badge = "badge-warning";
                else if (s.payment_status === "Partial") badge = "badge-info";
                
                html += `
                <tr>
                    <td>${d || '-'}</td>
                    <td style="font-weight:500">${s.customer_name || '-'}</td>
                    <td>${s.product_name || '-'}</td>
                    <td>${s.quantity}</td>
                    <td style="font-weight:600">₹${(s.total_amount || 0).toLocaleString()}</td>
                    <td><span class="badge-status ${badge}">${s.payment_status || 'Unknown'}</span></td>
                </tr>`;
            });
        }
        
        document.getElementById("salesTableBody").innerHTML = html;
        document.getElementById("totalSales").textContent = salesData.length;
        document.getElementById("totalRevenue").textContent = `₹${totalRev.toLocaleString()}`;
        document.getElementById("avgTransaction").textContent = salesData.length ? `₹${Math.round(totalRev / salesData.length).toLocaleString()}` : "₹0";
        
    } catch(e) {
        console.error(e);
        document.getElementById("salesTableBody").innerHTML = `<tr><td colspan="6" style="text-align:center;color:red">Failed to load data.</td></tr>`;
    }
}

window.exportSalesPDF = function() {
    const columns = ["Date", "Customer Name", "Product", "Qty", "Amount", "Status"];
    const rows = salesData.map(s => {
        let d = s.sale_date;
        if(d && d.includes('T')) d = d.split('T')[0];
        return [d || '-', s.customer_name || '-', s.product_name || '-', s.quantity, `Rs ${s.total_amount}`, s.payment_status];
    });
    downloadPDF("Sales Report", columns, rows, "sales_report");
};

window.exportSalesExcel = function() {
    const formatted = salesData.map(s => {
        let d = s.sale_date;
        if(d && d.includes('T')) d = d.split('T')[0];
        return {
            "Date": d,
            "Customer Name": s.customer_name,
            "Product": s.product_name,
            "Quantity": s.quantity,
            "Total Amount": s.total_amount,
            "Payment Status": s.payment_status
        };
    });
    downloadExcel(formatted, "sales_report");
};

// --- Customer Report ---
async function showCustomerReport() {
    try {
        const res = await fetch(window.API_BASE_URL + "/customers", {
            headers: { Authorization: "Bearer " + token }
        });
        const result = await res.json();
        customerData = result.data || [];
        
        let html = "";
        if (customerData.length === 0) {
            html = `<tr><td colspan="5" style="text-align: center; padding: 30px;">No customer data available.</td></tr>`;
        } else {
            customerData.forEach(c => {
                html += `
                <tr>
                    <td style="font-weight:500">${c.full_name}</td>
                    <td>${c.phone || '-'}</td>
                    <td>${c.email || '-'}</td>
                    <td>${c.city || '-'}</td>
                    <td><span class="badge-status badge-primary">Active</span></td>
                </tr>`;
            });
        }
        
        document.getElementById("customerTableBody").innerHTML = html;
        document.getElementById("totalCustomers").textContent = customerData.length;
        document.getElementById("activeCustomers").textContent = customerData.length;
    } catch(e) {
        console.error(e);
        document.getElementById("customerTableBody").innerHTML = `<tr><td colspan="5" style="text-align:center;color:red">Failed to load data.</td></tr>`;
    }
}

window.exportCustomerPDF = function() {
    const columns = ["Customer Name", "Phone", "Email", "City", "State"];
    const rows = customerData.map(c => [c.full_name, c.phone || '-', c.email || '-', c.city || '-', c.state || '-']);
    downloadPDF("Customer Report", columns, rows, "customer_report");
};

window.exportCustomerExcel = function() {
    downloadExcel(customerData, "customer_report");
};

// --- Maintenance Report ---
async function showMaintenanceReport() {
    try {
        const res = await fetch(window.API_BASE_URL + "/maintenance", {
            headers: { Authorization: "Bearer " + token }
        });
        const result = await res.json();
        maintenanceData = result.data || [];
        
        let completed = 0;
        let pending = 0;
        let html = "";
        
        if (maintenanceData.length === 0) {
            html = `<tr><td colspan="6" style="text-align: center; padding: 30px;">No maintenance data available.</td></tr>`;
        } else {
            maintenanceData.forEach(m => {
                if(m.status === "Completed") completed++;
                else pending++;
                
                let md = m.maintenance_date;
                if(md && md.includes('T')) md = md.split('T')[0];
                
                let badge = "badge-warning";
                if (m.status === "Completed") badge = "badge-success";
                else if (m.status === "Pending") badge = "badge-info";
                
                const cName = m.customer_name || m.full_name || 'Unknown';
                
                html += `
                <tr>
                    <td>${md || '-'}</td>
                    <td style="font-weight:500">${cName}</td>
                    <td>${m.product_name || '-'}</td>
                    <td>${m.maintenance_type || '-'}</td>
                    <td><span class="badge-status ${badge}">${m.status || 'Pending'}</span></td>
                    <td>${m.technician_name || 'Unassigned'}</td>
                </tr>`;
            });
        }
        
        document.getElementById("maintenanceTableBody").innerHTML = html;
        document.getElementById("totalMaintenance").textContent = maintenanceData.length;
        document.getElementById("completedMaintenance").textContent = completed;
        document.getElementById("pendingMaintenance").textContent = pending;
    } catch(e) {
        console.error(e);
        document.getElementById("maintenanceTableBody").innerHTML = `<tr><td colspan="6" style="text-align:center;color:red">Failed to load data.</td></tr>`;
    }
}

window.exportMaintenancePDF = function() {
    const columns = ["Date", "Customer", "Product", "Type", "Status", "Technician"];
    const rows = maintenanceData.map(m => {
        let md = m.maintenance_date;
        if(md && md.includes('T')) md = md.split('T')[0];
        const cName = m.customer_name || m.full_name || '-';
        return [md || '-', cName, m.product_name || '-', m.maintenance_type || '-', m.status || 'Pending', m.technician_name || '-'];
    });
    downloadPDF("Maintenance Report", columns, rows, "maintenance_report");
};

window.exportMaintenanceExcel = function() {
    const formatted = maintenanceData.map(m => {
        let md = m.maintenance_date;
        if(md && md.includes('T')) md = md.split('T')[0];
        return {
            "Date": md,
            "Customer": m.customer_name || m.full_name,
            "Product": m.product_name,
            "Maintenance Type": m.maintenance_type,
            "Status": m.status,
            "Technician": m.technician_name
        };
    });
    downloadExcel(formatted, "maintenance_report");
};

// --- Inventory Report ---
async function showInventoryReport() {
    try {
        const res = await fetch(window.API_BASE_URL + "/products", {
            headers: { Authorization: "Bearer " + token }
        });
        const result = await res.json();
        inventoryData = result.data || [];
        
        let lowStock = 0;
        let totalVal = 0;
        let html = "";
        
        if (inventoryData.length === 0) {
            html = `<tr><td colspan="7" style="text-align: center; padding: 30px;">No inventory data available.</td></tr>`;
        } else {
            inventoryData.forEach(p => {
                if (p.stock_quantity < 10) lowStock++;
                const val = (p.price * p.stock_quantity) || 0;
                totalVal += val;
                
                let stockStatus = p.stock_quantity < 10 ? '<span class="badge-status badge-error">Low Stock</span>' : '<span class="badge-status badge-success">In Stock</span>';
                
                html += `
                <tr>
                    <td style="font-weight:500">${p.product_name}</td>
                    <td>${p.brand_name || '-'}</td>
                    <td>${p.category_name || '-'}</td>
                    <td style="font-weight:600; color:${p.stock_quantity < 10 ? 'var(--accent-rose)' : 'inherit'}">${p.stock_quantity}</td>
                    <td>₹${(p.price || 0).toLocaleString()}</td>
                    <td>₹${val.toLocaleString()}</td>
                    <td>${stockStatus}</td>
                </tr>`;
            });
        }
        
        document.getElementById("inventoryTableBody").innerHTML = html;
        document.getElementById("reportTotalProducts").textContent = inventoryData.length;
        document.getElementById("lowStockItems").textContent = lowStock;
        document.getElementById("totalInventoryValue").textContent = `₹${totalVal.toLocaleString()}`;
    } catch(e) {
        console.error(e);
        document.getElementById("inventoryTableBody").innerHTML = `<tr><td colspan="7" style="text-align:center;color:red">Failed to load data.</td></tr>`;
    }
}

window.exportInventoryPDF = function() {
    const columns = ["Product Name", "Brand", "Category", "Stock", "Unit Price", "Total Value"];
    const rows = inventoryData.map(p => {
        const val = p.price * p.stock_quantity;
        return [p.product_name, p.brand_name || '-', p.category_name || '-', p.stock_quantity, `Rs ${p.price}`, `Rs ${val}`];
    });
    downloadPDF("Inventory Report", columns, rows, "inventory_report");
};

window.exportInventoryExcel = function() {
    const formatted = inventoryData.map(p => {
        return {
            "Product Name": p.product_name,
            "Brand": p.brand_name,
            "Category": p.category_name,
            "Stock Quantity": p.stock_quantity,
            "Unit Price": p.price,
            "Total Value": p.price * p.stock_quantity
        };
    });
    downloadExcel(formatted, "inventory_report");
};
