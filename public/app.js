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
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    }
}

function showModule(moduleId) {
    const modules = ['dashboard', 'pos', 'inventory', 'support', 'crm'];
    modules.forEach(m => {
        const el = document.getElementById(`module-${m}`);
        if (el) el.style.display = 'none';
        document.querySelector(`.nav-link[onclick*="${m}"]`)?.classList.remove('active');
    });

    document.getElementById(`module-${moduleId}`).style.display = 'block';
    document.querySelector(`.nav-link[onclick*="${moduleId}"]`)?.classList.add('active');

    if (moduleId === 'dashboard') updateDashboardStats();
    if (moduleId === 'inventory') loadInventory();
}

/**
 * MASTER DATA MANAGEMENT
 */
async function openConfigModal() {
    document.getElementById('modal-config').style.display = 'flex';
    refreshMasterLists();
}

async function refreshMasterLists() {
    const res = await fetch('/api/inventory/master');
    const { categories, brands, attributes } = await res.json();

    renderList('cfg-cat-list', categories);
    renderList('cfg-brand-list', brands);
    renderChips('cfg-attr-list', attributes);

    // Actualizar dropdowns del form producto
    fillSelect('prod-category', categories);
    fillSelect('prod-brand', brands);
    renderAttrSelector('prod-attributes-container', attributes);
}

function renderList(id, items) {
    const el = document.getElementById(id);
    el.innerHTML = items.map(i => `<li>${i.nombre}</li>`).join('');
}

function renderChips(id, items) {
    const el = document.getElementById(id);
    el.innerHTML = items.map(i => `<span class="status-badge" style="background: var(--glass);">${i.nombre}</span>`).join('');
}

function fillSelect(id, items) {
    const el = document.getElementById(id);
    el.innerHTML = '<option value="">Seleccione...</option>' +
        items.map(i => `<option value="${i.id}">${i.nombre}</option>`).join('');
}

function renderAttrSelector(id, items) {
    const el = document.getElementById(id);
    el.innerHTML = items.map(i => `
        <div style="display: flex; align-items: center; gap: 5px;">
            <input type="checkbox" name="attr-check" value="${i.id}" id="chk-${i.id}">
            <label for="chk-${i.id}" style="margin:0; cursor:pointer;">${i.nombre}</label>
            <input type="text" id="val-${i.id}" placeholder="Valor" style="width: 60px; height: 20px; font-size: 0.7rem;">
        </div>
    `).join('');
}

async function saveMaster(type, inputId) {
    const name = document.getElementById(inputId).value;
    if (!name) return;
    await fetch(`/api/inventory/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: name })
    });
    document.getElementById(inputId).value = '';
    refreshMasterLists();
}

/**
 * PRODUCT MANAGEMENT
 */
async function openNewProductModal() {
    document.getElementById('modal-product').style.display = 'flex';
    refreshMasterLists();
}

function closeProductModal() {
    document.getElementById('modal-product').style.display = 'none';
}

async function loadInventory() {
    const res = await fetch('/api/inventory/products');
    const products = await res.json();
    const tbody = document.getElementById('inventory-list-body');
    tbody.innerHTML = products.map(p => `
        <tr>
            <td>${p.sku}</td>
            <td>${p.nombre}</td>
            <td>${p.brand.nombre} / ${p.category.nombre}</td>
            <td style="color: var(--danger);">S/ ${Number(p.precio_compra).toFixed(2)}</td>
            <td style="color: var(--success);">S/ ${Number(p.precios.retail).toFixed(2)}</td>
            <td>-</td>
        </tr>
    `).join('');
}

/**
 * STATS & POS
 */
async function updateDashboardStats() {
    const salesRes = await fetch('/api/reports/daily-sales');
    const salesData = await salesRes.json();
    document.getElementById('stat-daily-sales').innerText = `S/ ${(salesData.total_ingresos || 0).toFixed(2)}`;
}

function initFormListeners() {
    document.getElementById('form-new-product')?.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Recolectar atributos seleccionados
        const attributes = [];
        document.querySelectorAll('input[name="attr-check"]:checked').forEach(chk => {
            const val = document.getElementById(`val-${chk.value}`).value;
            if (val) attributes.push({ id: chk.value, valor: val });
        });

        const payload = {
            sku: document.getElementById('prod-sku').value,
            nombre: document.getElementById('prod-name').value,
            brandId: document.getElementById('prod-brand').value,
            categoryId: document.getElementById('prod-category').value,
            precio_compra: parseFloat(document.getElementById('prod-price-buy').value),
            precios: { retail: parseFloat(document.getElementById('prod-price-retail').value) },
            stock_minimo: 5,
            requiere_imei: true,
            attributes: attributes
        };

        const res = await fetch('/api/inventory/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert('Producto guardado');
            closeProductModal();
            loadInventory();
        } else {
            const err = await res.json();
            alert(err.error);
        }
    });

}
