// src/modules/reports/reports.service.ts
import prisma from '../../shared/prisma.js';

export class ReportsService {
    async getDailySalesReport() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const stats = await prisma.factura.aggregate({
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
            total_ingresos: Number(stats._sum.total_venta || 0),
            total_igv: Number(stats._sum.igv_total || 0),
            transacciones: stats._count.id
        };
    }

    async getLowStockAlerts() {
        const products = await prisma.producto.findMany({
            include: {
                _count: {
                    select: { unidades: { where: { estado_inventario: 'Disponible' } } }
                }
            }
        });

        return products
            .filter(p => (p as any)._count.unidades <= p.stock_minimo)
            .map(p => ({
                id: p.id,
                nombre: p.nombre,
                sku: p.sku,
                stock_actual: (p as any)._count.unidades,
                stock_minimo: p.stock_minimo
            }));
    }

    async getSupportStats() {
        return await prisma.ordenServicio.groupBy({
            by: ['estado_servicio'],
            _count: {
                id: true
            }
        });
    }
}
