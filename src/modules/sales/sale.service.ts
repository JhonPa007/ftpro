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
            const venta = await tx.venta.create({
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
                    await tx.itemInventario.update({
                        where: { id: item.unitId },
                        data: { estado_inventario: 'Vendido' }
                    });
                } else {
                    // Si es genérico (sin IMEI), buscar las primeras N unidades disponibles y marcarlas
                    const availableUnits = await tx.itemInventario.findMany({
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

                    await tx.itemInventario.updateMany({
                        where: { id: { in: availableUnits.map(u => u.id) } },
                        data: { estado_inventario: 'Vendido' }
                    });
                }
            }

            return venta;
        });
    }

    async getSales() {
        return await prisma.venta.findMany({
            include: { cliente: true, detalles: { include: { producto: true } } },
            orderBy: { created_at: 'desc' }
        });
    }
}
