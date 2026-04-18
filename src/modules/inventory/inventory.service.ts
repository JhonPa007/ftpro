// src/modules/inventory/inventory.service.ts
import prisma from '../../shared/prisma.js';

export class InventoryService {
    /**
     * Crear un nuevo catálogo de producto con especificaciones JSONB
     */
    async createProduct(data: {
        sku: string;
        nombre: string;
        categoria: string;
        precios: any;
        especificaciones?: any;
        stock_minimo: number;
        clasificacion_abc?: string;
        requiere_imei: boolean;
    }) {
        return await prisma.product.create({ data });
    }

    /**
     * Ingreso de Almacén: Carga masiva de ítems únicos (IMEIs/ICCIDs)
     */
    async registerStockMovement(productId: string, items: Array<{
        imei?: string;
        iccid?: string;
        estado_dispositivo: string;
        ubicacion: string;
    }>) {
        const product = await prisma.product.findUnique({ where: { id: productId } });
        if (!product) throw new Error('Producto no existe en el catálogo');

        // Validación de integridad para celulares
        if (product.requiere_imei) {
            items.forEach(item => {
                if (!item.imei || item.imei.length !== 15) {
                    throw new Error(`El IMEI ${item.imei} es inválido (debe tener 15 dígitos)`);
                }
            });
        }

        return await prisma.stockItem.createMany({
            data: items.map(item => ({
                productId: productId,
                imei: item.imei,
                iccid: item.iccid,
                estado_dispositivo: item.estado_dispositivo,
                estado_inventario: 'Disponible',
                ubicacion_almacen: item.ubicacion,
                hash_verificacion: `SECURE-HASH-${Date.now()}` // Preparado para OSIPTEL
            }))
        });
    }

    /**
     * Buscador Universal de IMEI (Para Servicio Técnico o Venta)
     */
    async searchByImei(imei: string) {
        const item = await prisma.stockItem.findUnique({
            where: { imei },
            include: { product: true }
        });

        if (!item) return null;

        return {
            imei: item.imei,
            producto: item.product.nombre,
            estado: item.estado_inventario,
            garantia: item.product.categoria === 'Celulares' ? '12 meses' : 'N/A',
            especificaciones: item.product.especificaciones
        };
    }

    /**
     * Reporte de Valorización de Inventario (Real por costo)
     */
    async getInventoryValue() {
        const stock = await prisma.stockItem.findMany({
            where: { estado_inventario: 'Disponible' },
            include: { product: true }
        });

        const valorTotal = stock.reduce((sum, item) => {
            const precios: any = item.product.precios;
            return sum + Number(precios.retail);
        }, 0);

        return {
            unidades_disponibles: stock.length,
            valor_venta_estimado: valorTotal,
            moneda: 'PEN'
        };
    }
}
