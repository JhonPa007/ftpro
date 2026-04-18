// public/app.js

let purchaseItems = [];
let currentImeiContext = null;
let posCart = [];
let selectedClient = null;

document.addEventListener('DOMContentLoaded', async () => {
    await loadConfig();
    updateDashboardStats();
    updateClock();
    setInterval(updateClock, 1000);
    initFormListeners();

    // SIDEBAR TOGGLE
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('sidebar-toggle');

    // Recovery state
    if (localStorage.getItem('sidebar-collapsed') === 'true') {
        sidebar.classList.add('collapsed');
    }

    toggleBtn?.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
        localStorage.setItem('sidebar-collapsed', sidebar.classList.contains('collapsed'));
    });

    loadUsers();

    // ESC to close all modals
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
        }
    });
});

/**
 * CONFIGURATION ENGINE
 */
async function loadConfig() {
    try {
        const res = await fetch('/api/config');
        const cfg = await res.json();

        // Apply Company Info
        if (cfg.empresa_nombre) {
            document.getElementById('company-name-text') && (document.getElementById('company-name-text').innerText = cfg.empresa_nombre);
            document.getElementById('cfg-app-name') && (document.getElementById('cfg-app-name').value = cfg.empresa_nombre);
        }
        if (cfg.empresa_ruc) document.getElementById('cfg-app-ruc') && (document.getElementById('cfg-app-ruc').value = cfg.empresa_ruc);
        if (cfg.empresa_logo) document.getElementById('cfg-app-logo') && (document.getElementById('cfg-app-logo').value = cfg.empresa_logo);

        // Apply Visuals
        applyVisualTheme(cfg.tema || 'Oscuro', false);
        applyAccentColor(cfg.color_acento || '#00fff2', false);

        // Apply Modularity
        if (cfg.modulos) {
            const activeModules = typeof cfg.modulos === 'string' ? JSON.parse(cfg.modulos) : cfg.modulos;
            document.querySelectorAll('.nav-link').forEach(link => {
                const mod = link.dataset.module;
                if (mod === 'dashboard' || mod === 'config' || activeModules.includes(mod)) {
                    link.style.display = 'flex';
                } else {
                    link.style.display = 'none';
                }
            });
            // Update checkboxes
            document.querySelectorAll('#cfg-modules-list input').forEach(chk => {
                chk.checked = activeModules.includes(chk.value);
            });
        }
    } catch (e) { console.error('Error loading config:', e); }
}

/**
 * POS SEARCH ENGINE
 */
async function handlePosSearch(query) {
    if (query.length < 3) {
        document.getElementById('pos-search-results').style.display = 'none';
        return;
    }

    try {
        const res = await fetch(`/api/inventory/pos-search?q=${query}`);
        const results = await res.json();
        const dropdown = document.getElementById('pos-search-results');

        if (results.length === 0) {
            dropdown.style.display = 'none';
            return;
        }

        dropdown.style.display = 'block';
        dropdown.innerHTML = results.map(r => `
            <div class="search-item" onclick="addToCart(${JSON.stringify(r).replace(/"/g, '&quot;')})">
                <div style="display: flex; justify-content: space-between;">
                    <strong>${r.nombre}</strong>
                    <span class="text-neon">S/ ${r.precio.toFixed(2)}</span>
                </div>
                <small>${r.type === 'IMEI' ? 'IMEI: ' + r.imei : 'SKU: ' + r.sku}</small>
            </div>
        `).join('');
    } catch (e) { console.error('Error in POS search:', e); }
}

function addToCart(item) {
    document.getElementById('pos-search-results').style.display = 'none';
    document.getElementById('pos-search').value = '';

    if (item.type === 'IMEI') {
        const exists = posCart.find(i => i.unitId === item.unitId);
        if (exists) return alert('Este equipo ya está en el carrito');
        posCart.push({ ...item, cantidad: 1 });
    } else {
        const exists = posCart.find(i => i.id === item.id && i.type === 'PRODUCTO');
        if (exists) {
            exists.cantidad++;
        } else {
            posCart.push({ ...item, cantidad: 1 });
        }
    }
    renderCart();
}

function renderCart() {
    const tbody = document.getElementById('pos-cart-body');
    if (!tbody) return;

    tbody.innerHTML = posCart.map((item, index) => `
        <tr>
            <td>
                <strong>${item.nombre}</strong> <br>
                <small class="text-muted">${item.sku}</small>
            </td>
            <td>${item.imei || '<span class="text-muted">N/A</span>'}</td>
            <td>
                <div style="display:flex; align-items:center; gap:10px;">
                    <button class="btn-micro" onclick="updateCartQty(${index}, -1)">-</button>
                    <span>${item.cantidad}</span>
                    <button class="btn-micro" onclick="updateCartQty(${index}, 1)">+</button>
                </div>
            </td>
            <td>S/ ${item.precio.toFixed(2)}</td>
            <td>S/ ${(item.precio * item.cantidad).toFixed(2)}</td>
            <td>
                <button class="btn-icon" onclick="removeFromCart(${index})"><i class="fas fa-times"></i></button>
            </td>
        </tr>
    `).join('');

    calculatePosTotals();
}

function updateCartQty(index, delta) {
    if (posCart[index].type === 'IMEI') return alert('No se puede cambiar la cantidad de un equipo con IMEI');
    posCart[index].cantidad += delta;
    if (posCart[index].cantidad <= 0) posCart.splice(index, 1);
    renderCart();
}

function removeFromCart(index) {
    posCart.splice(index, 1);
    renderCart();
}

function calculatePosTotals() {
    const total = posCart.reduce((acc, i) => acc + (i.precio * i.cantidad), 0);
    const subtotal = total / 1.18;
    const igv = total - subtotal;

    document.getElementById('pos-subtotal').innerText = `S/ ${subtotal.toFixed(2)}`;
    document.getElementById('pos-igv').innerText = `S/ ${igv.toFixed(2)}`;
    document.getElementById('pos-total').innerText = `S/ ${total.toFixed(2)}`;
}

/**
 * POS OPERATIONS
 */

async function finalizeSale() {
    if (posCart.length === 0) return alert('El carrito está vacío');
    if (!selectedClient) return alert('Por favor selecciona un cliente');

    const payload = {
        clienteId: selectedClient.id,
        tipo_documento: document.getElementById('pos-doc-type').value,
        items: posCart.map(i => ({
            productoId: i.id,
            unitId: i.unitId,
            cantidad: i.cantidad,
            precio_unit: i.precio,
            imei: i.imei
        }))
    };

    try {
        const res = await fetch('/api/sales/pos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert('✅ Venta realizada exitosamente');
            posCart = [];
            selectedClient = null;
            document.getElementById('selected-client-info').style.display = 'none';
            renderCart();
            showModule('dashboard');
        } else {
            const err = await res.json();
            alert(`❌ Error: ${err.error}`);
        }
    } catch (e) { alert('Error al procesar la venta'); }
}

function applyVisualTheme(theme, save = true) {
    const root = document.documentElement;
    if (theme === 'Claro') {
        root.style.setProperty('--bg-dark', '#f0f2f5');
        root.style.setProperty('--sidebar-bg', '#ffffff');
        root.style.setProperty('--text', '#333333');
        root.style.setProperty('--text-muted', '#666666');
        root.style.setProperty('--glass', 'rgba(0,0,0,0.05)');
        root.style.setProperty('--glass-border', 'rgba(0,0,0,0.1)');
    } else {
        root.style.setProperty('--bg-dark', '#0a0b1e');
        root.style.setProperty('--sidebar-bg', '#11122a');
        root.style.setProperty('--text', '#e0e0e0');
        root.style.setProperty('--text-muted', '#a0a0a0');
        root.style.setProperty('--glass', 'rgba(255,255,255,0.05)');
        root.style.setProperty('--glass-border', 'rgba(255,255,255,0.1)');
    }
    if (save) saveConfig({ tema: theme });
}

function applyAccentColor(color, save = true) {
    document.documentElement.style.setProperty('--neon', color);
    if (save) saveConfig({ color_acento: color });
}

/**
 * USER MANAGEMENT
 */
async function loadUsers() {
    try {
        const res = await fetch('/api/users');
        const users = await res.json();
        const tbody = document.getElementById('users-table-body');
        if (!tbody) return;
        tbody.innerHTML = users.map(u => `
            <tr>
                <td>${u.nombre}</td>
                <td>${u.username}</td>
                <td><span class="badge ${u.rol === 'Administrador' ? 'badge-primary' : 'badge-secondary'}">${u.rol}</span></td>
                <td>${u.activo ? '✅ Activo' : '❌ Inactivo'}</td>
                <td>
                    <button class="btn-icon" onclick="deleteUser('${u.id}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    } catch (e) { console.error('Error loading users:', e); }
}

async function deleteUser(id) {
    if (!confirm('¿Seguro que deseas eliminar este usuario?')) return;
    await fetch(`/api/users/${id}`, { method: 'DELETE' });
    loadUsers();
}

async function saveConfig(data) {
    await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
}

async function saveModulesConfig() {
    const active = Array.from(document.querySelectorAll('#cfg-modules-list input:checked')).map(i => i.value);
    await saveConfig({ modulos: active });
    alert('✅ Licencia de módulos actualizada. Reiniciando vista...');
    loadConfig();
}

function updateClock() {
    const clock = document.getElementById('real-time-clock');
    const posClock = document.getElementById('pos-clock');
    const nowStr = new Date().toLocaleString('es-PE', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });

    if (clock) clock.innerText = nowStr;
    if (posClock) posClock.innerText = nowStr;
}

function showModule(moduleId) {
    const modules = ['dashboard', 'pos', 'inventory', 'support', 'crm', 'config'];
    modules.forEach(m => {
        const el = document.getElementById(`module-${m}`);
        if (el) {
            el.style.display = 'none';
            // Soft reset for modules that are sections vs divs
            if (el.tagName === 'SECTION' || el.classList.contains('module')) {
                el.classList.remove('active-module');
            }
        }
        document.querySelector(`.nav-link[onclick*="${m}"]`)?.classList.remove('active');
    });

    const target = document.getElementById(`module-${moduleId}`);
    if (target) {
        target.style.display = 'block';
        target.classList.add('active-module');
    }

    document.querySelector(`.nav-link[onclick*="${moduleId}"]`)?.classList.add('active');

    if (moduleId === 'dashboard') updateDashboardStats();
    if (moduleId === 'inventory') loadInventory();
    if (moduleId === 'pos') renderCart(); // Asegurar que el carrito se pinte si se cambió de pestaña
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
    try {
        const res = await fetch('/api/inventory/masters');
        const { categories, brands, attributes, providers } = await res.json();

        renderMasterList('cfg-cat-list', categories, 'categories');
        renderMasterList('cfg-brand-list', brands, 'brands');
        renderMasterList('cfg-attr-list', attributes, 'attributes');

        const resActive = await fetch('/api/inventory/masters?active=true');
        const activeData = await resActive.json();
        fillSelect('prod-category', activeData.categories);
        fillSelect('prod-brand', activeData.brands);
        fillSelect('pur-provider', activeData.providers); // Cargar proveedores aquí también
        renderAttrSelector('prod-attributes-container', activeData.attributes);
    } catch (e) {
        console.error('Error refreshing master lists:', e);
    }
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

async function quickAddMaster(type, targetSelectId) {
    const name = prompt(`Ingrese el nombre de la nueva ${type.slice(0, -1)}:`);
    if (!name) return;

    const res = await fetch(`/api/inventory/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: name })
    });

    if (res.ok) {
        const newItem = await res.json();
        await refreshMasterLists();

        // Auto-seleccionar si el target es un select
        const el = document.getElementById(targetSelectId);
        if (el && el.tagName === 'SELECT') {
            el.value = newItem.id;
        }
    }
}

/**
 * PROVIDERS
 */
function openNewProviderModal() {
    document.getElementById('modal-provider').style.display = 'flex';
}

async function loadProviders() {
    const res = await fetch('/api/inventory/providers');
    const providers = await res.json();
    const tbody = document.getElementById('provider-list-body');
    if (tbody) tbody.innerHTML = providers.map(p => `
        <tr style="opacity: ${p.activo ? 1 : 0.4};">
            <td>${p.ruc}</td>
            <td>${p.nombre}</td>
            <td>${p.email || '-'}</td>
            <td>${p.direccion || '-'}</td>
            <td>
                <div style="display: flex; gap: 5px;">
                  <button onclick="toggleProvider('${p.id}', ${p.activo})" class="btn-micro" title="Habilitar/Deshabilitar">
                    <i class="fas ${p.activo ? 'fa-eye' : 'fa-eye-slash'}"></i>
                  </button>
                  <button onclick="editProvider('${p.id}', '${p.nombre}')" class="btn-micro" title="Editar"><i class="fas fa-edit"></i></button>
                </div>
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

async function editProvider(id, currentName) {
    const newName = prompt('Ingrese el nuevo nombre/razón social:', currentName);
    if (!newName || newName === currentName) return;
    await fetch(`/api/inventory/providers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: newName })
    });
    loadProviders();
}

/**
 * COMPRAS (STOCK IN)
 */
async function openPurchaseModal() {
    document.getElementById('modal-purchase').style.display = 'flex';
    purchaseItems = [];
    document.getElementById('purchase-items-body').innerHTML = '';
    document.getElementById('pur-total-display').innerText = 'Total Compra: S/ 0.00';

    // Cargar proveedores y productos
    await refreshMasterLists();
    addPurchaseLine(); // Empieza con una fila
}

async function addPurchaseLine() {
    const id = Date.now();
    const res = await fetch('/api/inventory/products');
    const products = await res.json();

    const tr = document.createElement('tr');
    tr.id = `pur-row-${id}`;
    tr.innerHTML = `
        <td>
            <select onchange="updatePurchaseLine(${id}, this.value)" id="prod-sel-${id}" required style="width: 100%;">
                <option value="">Seleccione...</option>
                ${products.map(p => `
                    <option value="${p.id}" data-imei="${p.requiere_imei}" data-name="${p.nombre}">
                        [${p.categoria?.nombre}] ${p.marca?.nombre} - ${p.nombre}
                    </option>
                `).join('')}
            </select>
        </td>
        <td><input type="number" value="1" min="1" onchange="updatePurchaseTotal()" id="cant-${id}"></td>
        <td><input type="number" step="0.01" value="0.00" onchange="updatePurchaseTotal()" id="price-${id}"></td>
        <td id="total-${id}">S/ 0.00</td>
        <td>
            <div style="display: flex; gap: 5px;">
                <button type="button" class="btn-micro" id="btn-imei-${id}" onclick="openImeiInput(${id})" style="display: none;" title="Ingresar IMEIs"><i class="fas fa-barcode"></i></button>
                <button type="button" class="btn-micro" onclick="removePurchaseLine(${id})" style="color: var(--danger);"><i class="fas fa-trash"></i></button>
            </div>
        </td>
    `;
    document.getElementById('purchase-items-body').appendChild(tr);
    purchaseItems.push({ id, productoId: null, imeis: [] });
}

function updatePurchaseLine(id, productoId) {
    const item = purchaseItems.find(i => i.id === id);
    item.productoId = productoId;

    const sel = document.getElementById(`prod-sel-${id}`);
    const requiresImei = sel.options[sel.selectedIndex].dataset.imei === 'true';
    document.getElementById(`btn-imei-${id}`).style.display = requiresImei ? 'block' : 'none';

    updatePurchaseTotal();
}

function removePurchaseLine(id) {
    document.getElementById(`pur-row-${id}`).remove();
    purchaseItems = purchaseItems.filter(i => i.id !== id);
    updatePurchaseTotal();
}

function updatePurchaseTotal() {
    let total = 0;
    purchaseItems.forEach(item => {
        const cant = parseFloat(document.getElementById(`cant-${item.id}`).value) || 0;
        const price = parseFloat(document.getElementById(`price-${item.id}`).value) || 0;
        const lineTotal = cant * price;
        document.getElementById(`total-${item.id}`).innerText = `S/ ${lineTotal.toFixed(2)}`;
        total += lineTotal;
    });
    document.getElementById('pur-total-display').innerText = `Total Compra: S/ ${total.toFixed(2)}`;
}

function openImeiInput(id) {
    currentImeiContext = id;
    const item = purchaseItems.find(i => i.id === id);
    const cant = parseInt(document.getElementById(`cant-${id}`).value);
    const sel = document.getElementById(`prod-sel-${id}`);
    const name = sel.options[sel.selectedIndex].dataset.name;

    document.getElementById('imei-product-name').innerText = `${name} (${cant} unidades)`;
    const container = document.getElementById('imeis-container');
    container.innerHTML = '';

    for (let i = 0; i < cant; i++) {
        const val = item.imeis[i] || '';
        container.innerHTML += `<input type="text" placeholder="IMEI ${i + 1}" class="imei-input" value="${val}" required maxlength="15">`;
    }

    document.getElementById('modal-imeis').style.display = 'flex';
}

function saveImeisTemp() {
    const inputs = document.querySelectorAll('.imei-input');
    const imeis = Array.from(inputs).map(inp => inp.value).filter(v => v);

    const item = purchaseItems.find(i => i.id === currentImeiContext);
    const cantRequired = parseInt(document.getElementById(`cant-${currentImeiContext}`).value);

    if (imeis.length < cantRequired) {
        alert(`Debes ingresar los ${cantRequired} IMEIs correctamente.`);
        return;
    }

    item.imeis = imeis;
    document.getElementById('modal-imeis').style.display = 'none';
    document.getElementById(`btn-imei-${currentImeiContext}`).style.background = 'var(--success)';
}

/**
 * INVENTORY LOGIC
 */
async function loadInventory() {
    const res = await fetch('/api/inventory/products');
    const products = await res.json();
    const tbody = document.getElementById('inventory-list-body');
    if (tbody) tbody.innerHTML = products.map(p => {
        const stockActual = p.unidades?.filter(u => u.estado_inventario === 'Disponible').length || 0;
        return `
            <tr>
                <td>${p.sku}</td>
                <td>${p.nombre}</td>
                <td>${p.marca.nombre} / ${p.categoria.nombre}</td>
                <td style="color: var(--danger);">S/ ${Number(p.precio_compra).toFixed(2)}</td>
                <td style="color: var(--success);">S/ ${Number(p.precios.retail).toFixed(2)}</td>
                <td>
                    <span class="status-badge ${stockActual <= p.stock_minimo ? 'warning' : 'success'}">
                        ${stockActual}
                    </span>
                </td>
            </tr>
        `;
    }).join('');
}

function openNewProductModal() {
    document.getElementById('modal-product').style.display = 'flex';
    refreshMasterLists();
}

function closeProductModal() {
    document.getElementById('modal-product').style.display = 'none';
}

async function updateDashboardStats() {
    const res = await fetch('/api/reports/daily-sales');
    const data = await res.json();
    const el = document.getElementById('stat-daily-sales');
    if (el) el.innerText = `S/ ${(data.total_ingresos || 0).toFixed(2)}`;
}

// DROPDOWNS & ATTRS
function fillSelect(id, items) {
    const el = document.getElementById(id);
    if (el && Array.isArray(items)) {
        el.innerHTML = '<option value="">Seleccione...</option>' +
            items.map(i => `<option value="${i.id}">${i.nombre}</option>`).join('');
    }
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

function initFormListeners() {
    // AUTO-SKU GENERATION
    const updateSku = () => {
        const catSel = document.getElementById('prod-category');
        const brandSel = document.getElementById('prod-brand');
        const nameInput = document.getElementById('prod-name');

        const cat = catSel.options[catSel.selectedIndex]?.text.substring(0, 3).toUpperCase() || 'XXX';
        const brand = brandSel.options[brandSel.selectedIndex]?.text.substring(0, 3).toUpperCase() || 'XXX';
        const name = nameInput.value.substring(0, 3).toUpperCase() || 'XXX';

        document.getElementById('prod-sku').value = `${cat}-${brand}-${name}`.replace(/Sele/gi, 'XXX');
    };

    document.getElementById('prod-category')?.addEventListener('change', updateSku);
    document.getElementById('prod-brand')?.addEventListener('change', updateSku);
    document.getElementById('prod-name')?.addEventListener('input', updateSku);

    // FORM PRODUCTO
    document.getElementById('form-new-product')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        const originalText = btn.innerText;
        btn.innerText = 'Registrando...';
        btn.disabled = true;

        try {
            const attributes = [];
            document.querySelectorAll('input[name="attr-check"]:checked').forEach(chk => {
                const val = document.getElementById(`val-${chk.value}`).value;
                if (val) attributes.push({ id: chk.value, valor: val });
            });

            const payload = {
                sku: document.getElementById('prod-sku').value,
                nombre: document.getElementById('prod-name').value,
                marcaId: document.getElementById('prod-brand').value,
                categoriaId: document.getElementById('prod-category').value,
                precio_compra: parseFloat(document.getElementById('prod-price-buy').value) || 0,
                precios: { retail: parseFloat(document.getElementById('prod-price-retail').value) || 0 },
                stock_minimo: 5,
                requiere_imei: true, // Por defecto por ahora
                attributes
            };

            const res = await fetch('/api/inventory/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert('✅ Producto guardado correctamente');
                document.getElementById('modal-product').style.display = 'none';
                e.target.reset();
                loadInventory();
            } else {
                const err = await res.json();
                alert(`❌ Error: ${err.error || 'No se pudo guardar el producto'}`);
            }
        } catch (error) {
            console.error('Error en registro:', error);
            alert('❌ Error de conexión con el servidor');
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    });

    // FORM PROVEEDOR
    document.getElementById('form-new-provider')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        const originalText = btn.innerText;
        btn.innerText = 'Guardando...';
        btn.disabled = true;

        try {
            const payload = {
                ruc: document.getElementById('prov-ruc').value,
                nombre: document.getElementById('prov-name').value,
                contacto: document.getElementById('prov-contact').value,
                telefono: document.getElementById('prov-phone').value,
                email: document.getElementById('prov-email').value,
                direccion: document.getElementById('prov-address').value
            };
            const res = await fetch('/api/inventory/providers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                alert('✅ Proveedor registrado');
                document.getElementById('modal-provider').style.display = 'none';
                e.target.reset();
                loadProviders();
            } else {
                const err = await res.json();
                alert(`❌ Error: ${err.error || 'No se pudo guardar'}`);
            }
        } catch (err) {
            alert('❌ Error de conexión');
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    });

    // FORM COMPRA
    document.getElementById('form-purchase')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        const originalText = btn.innerText;
        btn.innerText = 'Procesando Compra...';
        btn.disabled = true;

        try {
            const payload = {
                proveedorId: document.getElementById('pur-provider').value,
                numero_factura: document.getElementById('pur-invoice').value,
                items: purchaseItems.map(item => ({
                    productoId: item.productoId,
                    cantidad: parseInt(document.getElementById(`cant-${item.id}`).value) || 0,
                    precio_unit: parseFloat(document.getElementById(`price-${item.id}`).value) || 0,
                    imeis: item.imeis
                }))
            };

            const res = await fetch('/api/inventory/purchases', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert('✅ Compra registrada y Stock actualizado');
                document.getElementById('modal-purchase').style.display = 'none';
                e.target.reset();
                purchaseItems = [];
                loadInventory();
            } else {
                const err = await res.json();
                alert(`❌ Error: ${err.error || 'No se pudo procesar la compra'}`);
            }
        } catch (err) {
            alert('❌ Error de red al procesar la compra');
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    });

    // FORM CONFIG PROFILE
    document.getElementById('form-config-profile')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            empresa_nombre: document.getElementById('cfg-app-name').value,
            empresa_ruc: document.getElementById('cfg-app-ruc').value,
            empresa_logo: document.getElementById('cfg-app-logo').value,
            sunat_api_key: document.getElementById('cfg-app-sunat').value
        };
        await saveConfig(payload);
        alert('✅ Perfil de empresa actualizado');
        loadConfig();
    });

    // FORM NEW USER
    document.getElementById('form-new-user')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const perms = Array.from(document.querySelectorAll('#user-perms-list input:checked')).map(i => i.value);
        const payload = {
            nombre: document.getElementById('user-fullname').value,
            username: document.getElementById('user-username').value,
            password: document.getElementById('user-password').value,
            rol: document.getElementById('user-role').value,
            permisos: perms
        };

        const res = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert('✅ Usuario registrado exitosamente');
            e.target.reset();
            loadUsers();
        } else {
            const err = await res.json();
            alert(`❌ Error: ${err.error}`);
        }
    });

    // ROLE PRESETS
    document.getElementById('user-role')?.addEventListener('change', (e) => {
        const role = e.target.value;
        const perms = document.querySelectorAll('#user-perms-list input');
        perms.forEach(p => {
            if (p.value === 'dashboard') return;
            if (role === 'Administrador') p.checked = true;
            if (role === 'Vendedor') p.checked = (p.value === 'pos' || p.value === 'inventory');
            if (role === 'Tecnico') p.checked = (p.value === 'support');
        });
    });
    // FORM NEW PROVIDER
    document.getElementById('form-new-provider')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            ruc: document.getElementById('prov-ruc').value,
            nombre: document.getElementById('prov-name').value,
            email: document.getElementById('prov-email').value,
            telefono: document.getElementById('prov-phone').value,
            direccion: document.getElementById('prov-address').value,
            contacto: document.getElementById('prov-contact').value
        };
        const res = await fetch('/api/inventory/providers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            alert('✅ Proveedor guardado');
            document.getElementById('modal-provider').style.display = 'none';
            refreshMasterLists();
        }
    });

    // FORM NEW CLIENT
    document.getElementById('form-new-client')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            tipo_documento: document.getElementById('cli-type').value,
            numero_documento: document.getElementById('cli-number').value,
            nombre: document.getElementById('cli-name').value,
            telefono: document.getElementById('cli-phone').value,
            email: document.getElementById('cli-email').value,
            direccion: document.getElementById('cli-address').value
        };
        const res = await fetch('/api/crm/customers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            const client = await res.json();
            alert('✅ Cliente guardado');
            document.getElementById('modal-client').style.display = 'none';
            if (typeof selectClientPOS === 'function') selectClientPOS(client);
        }
    });
}

// CLIENTES & EXTERNAL LOOKUP
function openAddClientModal() {
    const modal = document.getElementById('modal-client');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('form-new-client')?.reset();
        adjustClientFields();
    }
}

function adjustClientFields() {
    const type = document.getElementById('cli-type')?.value;
    const lbl = document.getElementById('lbl-cli-name');
    if (lbl) lbl.innerText = type === 'DNI' ? 'Nombres y Apellidos' : 'Razón Social';
}

async function lookupClientExternal() {
    const type = document.getElementById('cli-type').value;
    const number = document.getElementById('cli-number').value;

    if (!number || number.length < 8) return alert('⚠️ Ingrese un número válido');

    const btn = event.currentTarget;
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    btn.disabled = true;

    try {
        const res = await fetch(`/api/crm/lookup/${type}/${number}`);
        const data = await res.json();

        if (data.success) {
            document.getElementById('cli-name').value = data.tipo === 'DNI' ? data.nombre_completo : data.razon_social;
            document.getElementById('cli-address').value = data.direccion || '';
        } else {
            alert('❌ No se encontraron datos para este documento');
        }
    } catch (e) {
        alert('❌ Error en la consulta: ' + e.message);
    } finally {
        btn.innerHTML = originalHtml;
        btn.disabled = false;
    }
}

async function handleClientSearchPOS(val) {
    const results = document.getElementById('pos-client-results');
    if (val.length < 2) {
        if (results) results.style.display = 'none';
        return;
    }

    const res = await fetch(`/api/crm/clients/search?q=${val}`);
    const clients = await res.json();

    if (results && clients.length > 0) {
        results.innerHTML = '';
        clients.forEach(c => {
            const item = document.createElement('div');
            item.className = 'search-item';
            item.innerHTML = `
                <strong>${c.nombre}</strong><br>
                <small>${c.tipo_documento}: ${c.numero_documento}</small>
            `;
            item.onclick = () => selectClientPOS(c);
            results.appendChild(item);
        });
        results.style.display = 'block';
    } else if (results) {
        results.style.display = 'none';
    }
}

function selectClientPOS(client) {
    selectedClient = client;
    const searchInput = document.getElementById('pos-client-search');
    if (searchInput) searchInput.value = client.numero_documento;

    const results = document.getElementById('pos-client-results');
    if (results) results.style.display = 'none';

    const nameEl = document.getElementById('pos-client-name');
    const docEl = document.getElementById('pos-client-doc');
    const infoEl = document.getElementById('selected-client-info');

    if (nameEl) nameEl.innerText = client.nombre;
    if (docEl) docEl.innerText = `${client.tipo_documento}: ${client.numero_documento}`;
    if (infoEl) infoEl.style.display = 'block';
}

// Cerrar dropdowns al hacer clic fuera
document.addEventListener('click', (e) => {
    if (!e.target.closest('.form-group')) {
        const dropdowns = document.querySelectorAll('.search-dropdown');
        dropdowns.forEach(d => d.style.display = 'none');
    }
});
