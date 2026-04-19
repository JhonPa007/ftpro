// src/modules/sales/sale.service.ts
import prisma from '../../shared/prisma.js';

export class SaleService {
    async createSale(data: {
        clienteId: string;
        tipo_documento: string;
        items: Array<{
            productoId: string;
            unitId?: string; // ID del ItemInventario especifico (IMEI)
            cantidad: number;
            precio_unit: number;
        }>;
    }) {
        const total = data.items.reduce((acc, item) => acc + (item.cantidad * item.precio_unit), 0);

        return await prisma.$transaction(async (tx) => {
            // 1. Crear Venta
            const venta = await (tx as any).venta.create({
                data: {
                    clienteId: data.clienteId,
                    tipo_documento: data.tipo_documento,
                    total: total,
                    detalles: {
                        create: data.items.map(item => ({
                            productoId: item.productoId,
                            unitId: item.unitId,
                            cantidad: item.cantidad,
                            precio_unit: item.precio_unit
                        }))
                    }
                }
            });

            // 2. Actualizar Inventario para cada item
            for (const item of data.items) {
                if (item.unitId) {
                    // Si se especificó una unidad (IMEI), marcarla como vendida
                    await (tx as any).itemInventario.update({
                        where: { id: item.unitId },
                        data: { estado_inventario: 'Vendido' }
                    });
                } else {
                    // Si es genérico (sin IMEI), buscar las primeras N unidades disponibles y marcarlas
                    const availableUnits = await (tx as any).itemInventario.findMany({
                        where: {
                            productoId: item.productoId,
                            estado_inventario: 'Disponible',
                            imei: null // Solo genéricos
                        },
                        take: item.cantidad
                    });

                    if (availableUnits.length < item.cantidad) {
                        throw new Error(`Stock insuficiente para el producto ID: ${item.productoId}`);
                    }

                    await (tx as any).itemInventario.updateMany({
                        where: { id: { in: availableUnits.map((u: any) => u.id) } },
                        data: { estado_inventario: 'Vendido' }
                    });
                }
            }

            return venta;
        });
    }

    async getSales() {
        return await (prisma as any).venta.findMany({
            include: { cliente: true, detalles: { include: { producto: true } } },
            orderBy: { created_at: 'desc' }
        });
    }

    async getSaleById(id: string) {
        return await (prisma as any).venta.findUnique({
            where: { id },
            include: { cliente: true, detalles: { include: { producto: true } } }
        });
    }

    async deleteSale(id: string) {
        return await prisma.$transaction(async (tx: any) => {
            const venta = await tx.venta.findUnique({
                where: { id },
                include: { detalles: true }
            });
            if (!venta) throw new Error('Venta no encontrada');

            // 1. Restaurar inventario
            for (const det of venta.detalles) {
                if (det.unitId) {
                    await tx.itemInventario.update({
                        where: { id: det.unitId },
                        data: { estado_inventario: 'Disponible' }
                    });
                } else {
                    // Para genéricos es más complejo saber cuáles fueron, 
                    // pero podemos marcar las últimas 'n' vendidas de ese producto
                    const lastSold = await tx.itemInventario.findMany({
                        where: { productoId: det.productoId, estado_inventario: 'Vendido', imei: null },
                        orderBy: { created_at: 'desc' },
                        take: det.cantidad
                    });
                    await tx.itemInventario.updateMany({
                        where: { id: { in: lastSold.map((u: any) => u.id) } },
                        data: { estado_inventario: 'Disponible' }
                    });
                }
            }

            // 2. Eliminar detalles y venta
            await tx.detalleVenta.deleteMany({ where: { ventaId: id } });
            await tx.venta.delete({ where: { id } });

            return { success: true };
        });
    }

    async updateSaleType(id: string, newType: string) {
        return await (prisma as any).venta.update({
            where: { id },
            data: { tipo_documento: newType }
        });
    }
}
