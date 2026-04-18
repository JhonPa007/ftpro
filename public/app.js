// public/app.js

document.addEventListener('DOMContentLoaded', () => {
    updateDashboardStats();
    updateClock();
    setInterval(updateClock, 1000);
});

function updateClock() {
    const clock = document.getElementById('real-time-clock');
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

/**
 * Navegación entre módulos
 */
function showModule(moduleId) {
    const modules = ['dashboard', 'pos', 'inventory', 'support', 'crm'];
    modules.forEach(m => {
        document.getElementById(`module-${m}`)?.style.setProperty('display', 'none');
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
}

/**
 * Llamadas a la API Backend
 */
async function updateDashboardStats() {
    try {
        // Ventas diarias
        const salesRes = await fetch('/api/reports/daily-sales');
        const salesData = await salesRes.json();
        document.getElementById('stat-daily-sales').innerText = `S/ ${salesData.total_ingresos.toFixed(2)}`;

        // Alertas de Inventario
        const inventoryRes = await fetch('/api/reports/inventory-alerts');
        const alerts = await inventoryRes.json();
        const tbody = document.querySelector('#table-inventory-alerts tbody');
        tbody.innerHTML = '';

        alerts.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${item.nombre}</td>
                <td>${item.sku}</td>
                <td>${item.stock_actual}</td>
                <td>${item.stock_minimo}</td>
                <td><span class="status-badge status-low">STOCK BAJO [${item.clasificacion}]</span></td>
            `;
            tbody.appendChild(tr);
        });

    } catch (error) {
        console.error('Error cargando estadísticas:', error);
    }
}

/**
 * Lógica del Punto de Venta (POS)
 */
async function executeSale() {
    const data = {
        productId: document.getElementById('pos-product-list').value,
        imei: document.getElementById('pos-imei').value,
        cliente: {
            tipoDoc: document.getElementById('pos-client-type').value,
            numeroDoc: document.getElementById('pos-client-doc').value,
            nombre: document.getElementById('pos-client-name').value
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
