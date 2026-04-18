// src/modules/reports/reports.service.ts
import prisma from '../../shared/prisma.js';

export class ReportsService {
    async getDailySalesReport() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const stats = await (prisma as any).venta.aggregate({
            where: {
                created_at: { gte: today }
            },
            _sum: {
                total: true
            },
            _count: {
                id: true
            }
        });

        const total = Number(stats._sum.total || 0);

        return {
            fecha: today.toISOString().split('T')[0],
            total_ingresos: total,
            total_igv: total - (total / 1.18),
            transacciones: stats._count.id
        };
    }

    async getLowStockAlerts() {
        const products = await (prisma as any).producto.findMany({
            include: {
                _count: {
                    select: { unidades: { where: { estado_inventario: 'Disponible' } } }
                }
            }
        });

        return products
            .filter((p: any) => (p as any)._count.unidades <= p.stock_minimo)
            .map((p: any) => ({
                id: p.id,
                nombre: p.nombre,
                sku: p.sku,
                stock_actual: (p as any)._count.unidades,
                stock_minimo: p.stock_minimo
            }));
    }

    async getSupportStats() {
        return await (prisma as any).ordenServicio.groupBy({
            by: ['estado_servicio'],
            _count: {
                id: true
            }
        });
    }
}
