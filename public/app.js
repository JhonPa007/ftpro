// public/app.js

let purchaseItems = [];
let currentImeiContext = null;

document.addEventListener('DOMContentLoaded', () => {
    updateDashboardStats();
    updateClock();
    setInterval(updateClock, 1000);
    initFormListeners();

    // ESC to close all modals
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
        }
    });
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

    // Cargar proveedores activos
    const res = await fetch('/api/inventory/master?active=true');
    const data = await res.json();
    fillSelect('pur-provider', data.providers);

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
}
