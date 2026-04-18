// public/app.js

document.addEventListener('DOMContentLoaded', () => {
    updateDashboardStats();
    updateClock();
    setInterval(updateClock, 1000);
});

function updateClock() {
    const clock = document.getElementById('real-time-clock');
    if (clock) {
        clock.innerText = new Date().toLocaleString('es-PE', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
}

/**
 * Navegación entre módulos
 */
function showModule(moduleId) {
    const modules = ['dashboard', 'pos', 'inventory', 'support', 'crm'];
    modules.forEach(m => {
        const el = document.getElementById(`module-${m}`);
        if (el) el.style.display = 'none';
    });

    const activeModule = document.getElementById(`module-${moduleId}`);
    if (activeModule) {
        activeModule.style.display = 'block';
    }

    // Actualizar estado de los links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.innerText.toLowerCase().includes(moduleId)) {
            link.classList.add('active');
        }
    });

    if (moduleId === 'dashboard') updateDashboardStats();
    if (moduleId === 'inventory') loadInventory();
}

/**
 * Llamadas a la API Backend
 */
async function updateDashboardStats() {
    try {
        const salesRes = await fetch('/api/reports/daily-sales');
        const salesData = await salesRes.json();
        const salesEl = document.getElementById('stat-daily-sales');
        if (salesEl) salesEl.innerText = `S/ ${(salesData.total_ingresos || 0).toFixed(2)}`;

        const inventoryRes = await fetch('/api/reports/inventory-alerts');
        const alerts = await inventoryRes.json();
        const tbody = document.querySelector('#table-inventory-alerts tbody');
        if (tbody) {
            tbody.innerHTML = '';
            alerts.forEach(item => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${item.nombre}</td>
                    <td>${item.sku}</td>
                    <td>${item.stock_actual}</td>
                    <td>${item.stock_minimo}</td>
                    <td><span class="status-badge status-low">STOCK BAJO</span></td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
    }
}

/**
 * Carga visual del inventario
 */
async function loadInventory() {
    try {
        const res = await fetch('/api/reports/inventory-alerts');
        const products = await res.json();
        const tbody = document.getElementById('inventory-list-body');
        if (tbody) {
            tbody.innerHTML = '';
            products.forEach(p => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${p.sku}</td>
                    <td>${p.nombre}</td>
                    <td>${p.stock_minimo}</td>
                    <td><button onclick="alert('Funcionalidad de edición en desarrollo para SKU: ${p.sku}')">Editar</button></td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (e) {
        console.error('Error cargando inventario:', e);
    }
}

/**
 * Lógica del Punto de Venta (POS)
 */
async function executeSale() {
    const data = {
        productId: document.getElementById('pos-product-list')?.value,
        imei: document.getElementById('pos-imei')?.value,
        cliente: {
            tipoDoc: document.getElementById('pos-client-type')?.value,
            numeroDoc: document.getElementById('pos-client-doc')?.value,
            nombre: document.getElementById('pos-client-name')?.value
        },
        paymentMethod: 'Efectivo'
    };

    if (!data.productId || !data.imei || !data.cliente.numeroDoc) {
        alert('Por favor complete los campos obligatorios.');
        return;
    }

    try {
        const response = await fetch('/api/sales/pos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.error) {
            alert(`Error: ${result.error}`);
        } else {
            alert(`¡VENTA EXITOSA!\nComprobante: ${result.comprobante}\nMonto: S/ ${result.total}`);
            updateDashboardStats();
            showModule('dashboard');
        }
    } catch (error) {
        alert('Error conectando con el servidor.');
    }
}
