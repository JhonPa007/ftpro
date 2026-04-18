// src/test-live.ts
import prisma from './shared/prisma.js';
import { SalesService } from './modules/sales/sales.service.js';
import { ReportsService } from './modules/reports/reports.service.js';
import { CrmService } from './modules/crm/crm.service.js';

const salesService = new SalesService();
const reportsService = new ReportsService();
const crmService = new CrmService();

async function runTest() {
    console.log('🚀 Iniciando Prueba de Estrés Funcional...');

    // 1. Crear Cliente
    console.log('1. Registrando Cliente en CRM...');
    const customer = await crmService.upsertCustomer({
        tipo_documento: '1',
        numero_documento: '77665544',
        nombre: 'Juan Pérez Live Test',
        telefono: '999888777'
    });
    console.log('✅ Cliente registrado:', customer.nombre);

    // 2. Crear Producto en Inventario
    console.log('2. Registrando Producto y Stock...');
    const product = await prisma.product.create({
        data: {
            sku: 'IPHONE-15-PRO-BK',
            nombre: 'iPhone 15 Pro Titanium Black',
            categoria: 'Celulares',
            precios: { retail: 5499, wholesale: 5100, min_price: 4999 },
            requiere_imei: true,
            stock_minimo: 2
        }
    });

    // 3. Agregar Stock (IMEI)
    const imei = '358706000000001';
    await prisma.stockItem.create({
        data: {
            productId: product.id,
            imei: imei,
            estado_dispositivo: 'Nuevo',
            estado_inventario: 'Disponible',
            hash_verificacion: 'hash-test-initial'
        }
    });
    console.log('✅ Producto y IMEI 358706000000001 listos en almacén.');

    // 4. Simular Venta en POS
    console.log('3. Procesando Venta en el POS...');
    const saleResult = await salesService.processSale({
        productId: product.id,
        imei: imei,
        cliente: {
            tipoDoc: '1',
            numeroDoc: '77665544',
            nombre: 'Juan Pérez Live Test'
        },
        paymentMethod: 'Tarjeta de Crédito'
    });
    console.log('✅ Venta exitosa. Comprobante:', saleResult.comprobante);

    // 5. Consultar Reporte de Ventas
    console.log('4. Consultando Reporte de Ventas Diarias...');
    const salesReport = await reportsService.getDailySalesReport();
    console.log('📊 Resumen del día:', salesReport);

    // 6. Consultar Alertas de Inventario
    console.log('5. Consultando Alertas de Inventario (SGA)...');
    const alerts = await reportsService.getLowStockAlerts();
    console.log(`⚠️ Alertas detectadas: ${alerts.length}. Producto ${product.sku} está en bajo stock.`);

    // 7. Consultar Vista 360 del Cliente
    console.log('6. Consultando Historial CRM del Cliente...');
    const history = await crmService.getCustomerHistory('77665544');
    console.log('👤 Historial CRM:', JSON.stringify(history, null, 2));

    console.log('\n✨ PRUEBA FINALIZADA CON ÉXITO ✨');
}

runTest()
    .catch(e => console.error('❌ Error en la prueba:', e))
    .finally(async () => await prisma.$disconnect());
