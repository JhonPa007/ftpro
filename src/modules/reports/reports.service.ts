// src/modules/reports/reports.service.ts
import prisma from '../../shared/prisma.js';

export class ReportsService {
    /**
     * Reporte de Ventas Diarias (Resumen financiero)
     */
    async getDailySalesReport() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const stats = await prisma.invoice.aggregate({
            where: {
                created_at: { gte: today }
            },
            _sum: {
                total_venta: true,
                igv_total: true
            },
            _count: {
                id: true
            }
        });

        return {
            fecha: today.toISOString().split('T')[0],
            total_ingresos: stats._sum.total_venta || 0,
            total_igv: stats._sum.igv_total || 0,
            transacciones: stats._count.id
        };
    }

    /**
     * Alerta de Inventario Crítico (Para compras B2B)
     */
    async getLowStockAlerts() {
        const products = await prisma.product.findMany({
            include: {
                _count: {
                    select: { items: { where: { estado_inventario: 'Disponible' } } }
                }
            }
        });

        // Filtrar los que están por debajo del mínimo configurado
        return products
            .filter(p => (p as any)._count.items <= p.stock_minimo)
            .map(p => ({
                id: p.id,
                nombre: p.nombre,
                sku: p.sku,
                stock_actual: (p as any)._count.items,
                stock_minimo: p.stock_minimo,
                clasificacion: p.clasificacion_abc
            }));
    }

    /**
     * Estado de Servicio Técnico
     */
    async getSupportStats() {
        return await prisma.serviceOrder.groupBy({
            by: ['estado_servicio'],
            _count: {
                id: true
            }
        });
    }
}
