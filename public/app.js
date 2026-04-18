// public/app.js

document.addEventListener('DOMContentLoaded', () => {
    updateDashboardStats();
    updateClock();
    setInterval(updateClock, 1000);
    initFormListeners();
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

    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.innerText.toLowerCase().includes(moduleId)) {
            link.classList.add('active');
        }
    });

    if (moduleId === 'dashboard') updateDashboardStats();
    if (moduleId === 'inventory') loadInventory();
    if (moduleId === 'pos') loadPosProducts();
}

/**
 * DASHBOARD STATS
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
    } catch (error) { console.error(error); }
}

/**
 * INVENTORY LOGIC
 */
async function loadInventory() {
    try {
        const res = await fetch('/api/inventory/products');
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
                    <td><button onclick="alert('SKU: ${p.sku}')">Detalles</button></td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (e) { console.error(e); }
}

function openNewProductModal() {
    document.getElementById('modal-product').style.display = 'flex';
}

function closeProductModal() {
    document.getElementById('modal-product').style.display = 'none';
}

function toggleCategoryFields() {
    const category = document.getElementById('prod-category').value;
    const container = document.getElementById('dynamic-specs');
    const autoImei = document.getElementById('prod-requires-imei');

    container.innerHTML = '';
    if (category === 'Celulares') {
        autoImei.value = 'true';
        container.innerHTML = `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <input type="text" id="spec-ram" placeholder="RAM"><input type="text" id="spec-storage" placeholder="Storage">
            <input type="text" id="spec-cpu" placeholder="CPU"><input type="text" id="spec-screen" placeholder="Pantalla">
        </div>`;
    } else {
        autoImei.value = 'false';
        container.innerHTML = `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <input type="text" id="spec-brand" placeholder="Marca"><input type="text" id="spec-material" placeholder="Material">
        </div>`;
    }
}

/**
 * STOCK ENTRY LOGIC
 */
async function openStockEntryModal() {
    document.getElementById('modal-stock-entry').style.display = 'flex';
    const res = await fetch('/api/inventory/products');
    const products = await res.json();
    const select = document.getElementById('stock-product-id');
    select.innerHTML = '<option value="">Seleccione producto...</option>';
    products.forEach(p => {
        select.innerHTML += `<option value="${p.id}">${p.nombre} (${p.sku})</option>`;
    });
}

function closeStockEntryModal() {
    document.getElementById('modal-stock-entry').style.display = 'none';
}

/**
 * POS LOGIC
 */
async function loadPosProducts() {
    const res = await fetch('/api/inventory/products');
    const products = await res.json();
    const select = document.getElementById('pos-product-list');
    if (select) {
        select.innerHTML = '<option value="">Buscar equipo...</option>';
        products.forEach(p => {
            select.innerHTML += `<option value="${p.id}">${p.nombre}</option>`;
        });
    }
}

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

    try {
        const res = await fetch('/api/sales/pos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (result.error) alert(result.error);
        else {
            alert(`Venta OK: ${result.comprobante}`);
            showModule('dashboard');
        }
    } catch (e) { alert('Error'); }
}

/**
 * LISTENERS
 */
function initFormListeners() {
    document.getElementById('form-new-product')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            sku: document.getElementById('prod-sku').value,
            nombre: document.getElementById('prod-name').value,
            categoria: document.getElementById('prod-category').value,
            precios: { retail: parseFloat(document.getElementById('prod-price-retail').value) },
            stock_minimo: parseInt(document.getElementById('prod-stock-min').value),
            requiere_imei: document.getElementById('prod-requires-imei').value === 'true'
        };
        const res = await fetch('/api/inventory/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) { closeProductModal(); loadInventory(); }
    });

    document.getElementById('form-stock-entry')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const imeiText = document.getElementById('stock-imei-list').value;
        const imeis = imeiText.split('\n').filter(i => i.trim() !== '');
        const payload = {
            productId: document.getElementById('stock-product-id').value,
            items: imeis.map(i => ({
                imei: i.trim(),
                estado_dispositivo: document.getElementById('stock-item-state').value,
                ubicacion: document.getElementById('stock-location').value
            }))
        };
        const res = await fetch('/api/inventory/stock', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) { alert('Carga exitosa'); closeStockEntryModal(); loadInventory(); }
        else { const err = await res.json(); alert(err.error); }
    });
}
