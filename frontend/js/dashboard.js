// Phase 15 — Admin dashboard.js migrated to Firestore
import { countDocs, countDocsWhere, db } from "./firebase-config.js";
import { collection, query, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

async function loadDashboard() {
    try {
        // Fetch all counts in parallel from Firestore (uses Aggregation API — free)
        const [products, customers, brands, installations, newEnquiries] = await Promise.all([
            countDocs("products"),
            countDocs("customers"),
            countDocs("brands"),
            countDocs("installations"),
            countDocsWhere("enquiries", "status", "==", "New")
        ]);

        animateValue("totalProducts",      0, products,      1000);
        animateValue("totalBrands",        0, brands,        1000);
        animateValue("totalCustomers",     0, customers,     1000);
        animateValue("totalInstallations", 0, installations, 1000);
        animateValue("totalNewEnquiries",  0, newEnquiries,  1000);

        // Update sidebar badge for new enquiries
        const badge = document.getElementById("sidebarNewCount");
        if (badge) {
            if (newEnquiries > 0) { badge.textContent = newEnquiries; badge.style.display = "inline"; }
            else { badge.style.display = "none"; }
        }

        // Load recent activity, enquiries table, and low stock
        await Promise.all([loadRecentActivity(), loadRecentEnquiries(), loadLowStock()]);
        renderChart();

    } catch (err) {
        console.error(err);
        if (window.showToast) window.showToast('Failed to load dashboard data', 'error');
    }
}

function animateValue(id, start, end, duration) {
    if (start === end) return;
    const obj = document.getElementById(id);
    if (!obj) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start);
        if (progress < 1) { window.requestAnimationFrame(step); }
        else { obj.innerHTML = end; }
    };
    window.requestAnimationFrame(step);
}

async function loadRecentActivity() {
    const list = document.getElementById("activityList");
    if (!list) return;

    try {
        // Pull recent enquiries and installations
        const [enquirySnap, instSnap] = await Promise.all([
            getDocs(query(collection(db, "enquiries"),    orderBy("createdAt", "desc"), limit(3))),
            getDocs(query(collection(db, "installations"), orderBy("createdAt", "desc"), limit(3)))
        ]);

        const items = [];

        enquirySnap.docs.forEach(d => {
            const data = d.data();
            items.push({
                type: 'enquiry',
                icon: 'bi-chat-dots-fill',
                iconClass: 'sale',
                title: `New Enquiry`,
                desc: `${data.full_name} — ${data.subject || data.message?.substring(0, 40) || ''}`,
                time: data.createdAt?.toDate ? _timeAgo(data.createdAt.toDate()) : ''
            });
        });

        instSnap.docs.forEach(d => {
            const data = d.data();
            items.push({
                type: 'installation',
                icon: 'bi-tools',
                iconClass: 'installation',
                title: `Installation — ${data.installation_status || 'Pending'}`,
                desc: `${data.customer_name || ''} · ${data.installation_address || ''}`,
                time: data.createdAt?.toDate ? _timeAgo(data.createdAt.toDate()) : ''
            });
        });

        // Sort by time descending (most recent first)
        items.sort((a, b) => 0); // already ordered by Firestore

        if (items.length === 0) {
            list.innerHTML = `<div style="text-align:center;padding:20px;color:#64748b;">No recent activity yet.</div>`;
            return;
        }

        list.innerHTML = items.slice(0, 5).map(item => `
            <div class="activity-item">
                <div class="activity-icon ${item.iconClass}"><i class="bi ${item.icon}"></i></div>
                <div class="activity-content">
                    <h4>${item.title}</h4>
                    <p>${item.desc}</p>
                </div>
                <div class="activity-time">${item.time}</div>
            </div>
        `).join('');

    } catch (err) {
        console.warn("Could not load activity:", err);
        // Graceful fallback
        list.innerHTML = `<div style="text-align:center;padding:20px;color:#64748b;">Activity feed unavailable.</div>`;
    }
}

function _timeAgo(date) {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
}

async function loadRecentEnquiries() {
    const tbody = document.getElementById("recentEnquiriesList");
    if (!tbody) return;
    try {
        const snap = await getDocs(query(collection(db, "enquiries"), orderBy("createdAt", "desc"), limit(5)));
        if (snap.empty) {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;padding:15px;color:#64748b;">No enquiries yet.</td></tr>`;
            return;
        }
        tbody.innerHTML = snap.docs.map(d => {
            const e = d.data();
            const date = e.createdAt?.toDate ? e.createdAt.toDate().toLocaleDateString('en-IN') : '-';
            return `<tr>
                <td style="padding:10px;font-weight:500;">${e.full_name || '-'}</td>
                <td style="padding:10px;">${e.subject || e.message?.substring(0,40) || '-'}</td>
                <td style="padding:10px;color:#64748b;font-size:13px;">${date}</td>
            </tr>`;
        }).join('');
    } catch (err) {
        console.warn("Could not load recent enquiries:", err);
        tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;padding:15px;color:#64748b;">Unavailable</td></tr>`;
    }
}

async function loadLowStock() {
    const tbody = document.getElementById("lowStockList");
    if (!tbody) return;
    try {
        const snap = await getDocs(collection(db, "products"));
        const lowStock = snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(p => (p.stock_quantity || 0) < 10)
            .sort((a, b) => (a.stock_quantity || 0) - (b.stock_quantity || 0))
            .slice(0, 5);

        if (lowStock.length === 0) {
            tbody.innerHTML = `<tr><td colspan="2" style="text-align:center;padding:15px;color:#059669;">All products well-stocked ✓</td></tr>`;
            return;
        }
        tbody.innerHTML = lowStock.map(p => `
            <tr>
                <td style="padding:10px;font-weight:500;">${p.product_name}</td>
                <td style="padding:10px;font-weight:700;color:${p.stock_quantity < 5 ? '#e11d48' : '#f59e0b'};">${p.stock_quantity}</td>
            </tr>
        `).join('');
    } catch (err) {
        console.warn("Could not load low stock:", err);
        tbody.innerHTML = `<tr><td colspan="2" style="text-align:center;padding:15px;color:#64748b;">Unavailable</td></tr>`;
    }
}

function renderChart() {
    const ctx = document.getElementById('salesChart');
    if (!ctx) return;
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Revenue (₹)',
                data: [65000, 59000, 80000, 81000, 56000, 95000],
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                borderWidth: 3, tension: 0.4, fill: true,
                pointBackgroundColor: '#fff', pointBorderColor: '#6366f1',
                pointBorderWidth: 2, pointRadius: 4, pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1e293b', padding: 12,
                    titleFont: { family: 'Poppins', size: 13 },
                    bodyFont: { family: 'Poppins', size: 14, weight: 'bold' },
                    displayColors: false,
                    callbacks: { label: ctx => '₹ ' + ctx.parsed.y.toLocaleString() }
                }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: '#e2e8f0', borderDash: [5,5] },
                     ticks: { font: { family: 'Poppins' }, color: '#64748b',
                              callback: v => v >= 1000 ? '₹' + (v/1000) + 'k' : '₹' + v } },
                x: { grid: { display: false },
                     ticks: { font: { family: 'Poppins' }, color: '#64748b' } }
            }
        }
    });
}

loadDashboard();