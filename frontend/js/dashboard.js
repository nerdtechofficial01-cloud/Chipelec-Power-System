// Note: token and admin are now handled in auth.js

async function loadDashboard() {

    try {

        const response = await fetch(
            window.API_BASE_URL + "/dashboard",
            {
                headers: {
                    Authorization: "Bearer " + token
                }
            }
        );

        const result = await response.json();

        if (!result.success) {
            if(window.showToast) window.showToast(result.message, 'error');
            else alert(result.message);
            return;
        }

        // Animate counter logic
        animateValue("totalProducts", 0, result.data.products, 1000);
        animateValue("totalBrands", 0, result.data.brands, 1000);
        animateValue("totalCustomers", 0, result.data.customers, 1000);
        animateValue("totalInstallations", 0, result.data.installations, 1000);

        // Load Activity Feed & Chart (Simulated for dashboard layout since API doesn't provide it yet)
        // In a real scenario, this would come from a `/api/dashboard/activity` endpoint
        loadSimulatedActivity();
        renderChart();

    } catch (err) {

        console.error(err);
        if(window.showToast) window.showToast('Failed to load dashboard data', 'error');

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
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            obj.innerHTML = end;
        }
    };
    window.requestAnimationFrame(step);
}

function loadSimulatedActivity() {
    const list = document.getElementById("activityList");
    if (!list) return;
    
    list.innerHTML = `
        <div class="activity-item">
            <div class="activity-icon sale"><i class="bi bi-cart-check-fill"></i></div>
            <div class="activity-content">
                <h4>New Sale Recorded</h4>
                <p>150Ah Tubular Battery sold to ABC Corp</p>
            </div>
            <div class="activity-time">2 hours ago</div>
        </div>
        <div class="activity-item">
            <div class="activity-icon installation"><i class="bi bi-tools"></i></div>
            <div class="activity-content">
                <h4>Installation Completed</h4>
                <p>Solar Inverter setup at XYZ Industries</p>
            </div>
            <div class="activity-time">4 hours ago</div>
        </div>
        <div class="activity-item">
            <div class="activity-icon maintenance"><i class="bi bi-wrench"></i></div>
            <div class="activity-content">
                <h4>Maintenance Scheduled</h4>
                <p>Routine checkup for John Doe</p>
            </div>
            <div class="activity-time">Yesterday</div>
        </div>
    `;
}

function renderChart() {
    const ctx = document.getElementById('salesChart');
    if (!ctx) return;

    // Use Chart.js to render a beautiful line chart
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Revenue (₹)',
                data: [65000, 59000, 80000, 81000, 56000, 95000],
                borderColor: '#6366f1',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#6366f1',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#1e293b',
                    padding: 12,
                    titleFont: { family: 'Poppins', size: 13 },
                    bodyFont: { family: 'Poppins', size: 14, weight: 'bold' },
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return '₹ ' + context.parsed.y.toLocaleString();
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: '#e2e8f0',
                        drawBorder: false,
                        borderDash: [5, 5]
                    },
                    ticks: {
                        font: { family: 'Poppins' },
                        color: '#64748b',
                        callback: function(value) {
                            if (value >= 1000) return '₹' + (value/1000) + 'k';
                            return '₹' + value;
                        }
                    }
                },
                x: {
                    grid: {
                        display: false,
                        drawBorder: false
                    },
                    ticks: {
                        font: { family: 'Poppins' },
                        color: '#64748b'
                    }
                }
            }
        }
    });
}

loadDashboard();