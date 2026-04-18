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

function switchTab(tabId) {
    ['catalog', 'providers', 'movements'].forEach(t => {
        const el = document.getElementById(`tab-${t}`);
        if (el) el.style.display = 'none';
        document.querySelector(`.tab-link[onclick*="${t}"]`)?.classList.remove('active');
    });
    document.getElementById(`tab-${tabId}`).style.display = 'block';
    document.querySelector(`.tab-link[onclick*="${tabId}"]`)?.classList.add('active');
    if (tabId === 'providers') loadProviders();
    if (tabId === 'catalog') loadInventory();
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

    renderMasterList('cfg-cat-list', categories, 'categories');
    renderMasterList('cfg-brand-list', brands, 'brands');
    renderMasterList('cfg-attr-list', attributes, 'attributes');

    // Cargar solo activos en los selectores
    const resActive = await fetch('/api/inventory/master?active=true');
    const activeData = await resActive.json();
    fillSelect('prod-category', activeData.categories);
    fillSelect('prod-brand', activeData.brands);
    renderAttrSelector('prod-attributes-container', activeData.attributes);
}

function renderMasterList(id, items, type) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = items.map(i => `
        <li style="display: flex; justify-content: space-between; align-items: center; padding: 5px 0; border-bottom: 1px solid var(--glass); opacity: ${i.activo ? 1 : 0.4};">
            <span>${i.nombre}</span>
            <div style="display: flex; gap: 8px;">
                <button onclick="editMaster('${type}', '${i.id}', '${i.nombre}')" class="btn-micro" title="Editar"><i class="fas fa-edit"></i></button>
                <button onclick="toggleMaster('${type}', '${i.id}', ${i.activo})" class="btn-micro" title="${i.activo ? 'Desactivar' : 'Activar'}">
                    <i class="fas ${i.activo ? 'fa-eye' : 'fa-eye-slash'}"></i>
                </button>
            </div>
        </li>
    `).join('');
}

async function editMaster(type, id, currentName) {
    const newName = prompt('Ingrese el nuevo nombre:', currentName);
    if (!newName || newName === currentName) return;
    await fetch(`/api/inventory/${type}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: newName })
    });
    refreshMasterLists();
}

async function toggleMaster(type, id, currentStatus) {
    await fetch(`/api/inventory/${type}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !currentStatus })
    });
    refreshMasterLists();
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

// DROPDOWNS & ATTRS
function fillSelect(id, items) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '<option value="">Seleccione...</option>' +
        items.map(i => `<option value="${i.id}">${i.nombre}</option>`).join('');
}

function renderAttrSelector(id, items) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = items.map(i => `
        <div style="display: flex; align-items: center; gap: 5px;">
            <input type="checkbox" name="attr-check" value="${i.id}" id="chk-${i.id}">
            <label for="chk-${i.id}" style="margin:0; cursor:pointer;">${i.nombre}</label>
            <input type="text" id="val-${i.id}" placeholder="Valor" style="width: 60px; height: 20px; font-size: 0.7rem;">
        </div>
    `).join('');
}

/**
 * PROVIDERS
 */
async function loadProviders() {
    const res = await fetch('/api/inventory/providers');
    const providers = await res.json();
    const tbody = document.getElementById('provider-list-body');
    if (tbody) tbody.innerHTML = providers.map(p => `
        <tr style="opacity: ${p.activo ? 1 : 0.4};">
            <td>${p.ruc}</td>
            <td>${p.nombre}</td>
            <td>${p.contacto || '-'}</td>
            <td>
                <button onclick="toggleProvider('${p.id}', ${p.activo})" class="btn-micro"><i class="fas ${p.activo ? 'fa-eye' : 'fa-eye-slash'}"></i></button>
            </td>
        </tr>
    `).join('');
}

async function toggleProvider(id, current) {
    await fetch(`/api/inventory/providers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !current })
    });
    loadProviders();
}

/**
 * INVENTORY & STOCK
 */
async function loadInventory() {
    const res = await fetch('/api/inventory/products');
    const products = await res.json();
    const tbody = document.getElementById('inventory-list-body');
    if (tbody) tbody.innerHTML = products.map(p => `
        <tr>
            <td>${p.sku}</td>
            <td>${p.nombre}</td>
            <td>${p.marca.nombre} / ${p.categoria.nombre}</td>
            <td style="color: var(--danger);">S/ ${Number(p.precio_compra).toFixed(2)}</td>
            <td style="color: var(--success);">S/ ${Number(p.precios.retail).toFixed(2)}</td>
            <td>-</td>
        </tr>
    `).join('');
}

function initFormListeners() {
    // ... same as before
    document.getElementById('form-new-product')?.addEventListener('submit', async (e) => {
        e.preventDefault();
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
            stock_minimo: 5, requiere_imei: true, attributes
        };
        const res = await fetch('/api/inventory/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) { alert('Producto guardado'); document.getElementById('modal-product').style.display = 'none'; loadInventory(); }
    });

    document.getElementById('form-new-provider')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            ruc: document.getElementById('prov-ruc').value,
            nombre: document.getElementById('prov-name').value,
            contacto: document.getElementById('prov-contact').value,
            telefono: document.getElementById('prov-phone').value
        };
        const res = await fetch('/api/inventory/providers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.json(payload)
        });
        if (res.ok) { alert('Proveedor registrado'); document.getElementById('modal-provider').style.display = 'none'; loadProviders(); }
    });
}
