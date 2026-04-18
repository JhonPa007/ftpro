// src/modules/sales/sales.service.ts
import prisma from '../../shared/prisma.js';
import type { Prisma } from '@prisma/client';

export class SalesService {
    async processSale(dto: {
        productId: string;
        imei?: string;
        cliente: { tipoDoc: string; numeroDoc: string; nombre: string };
        paymentMethod: string;
    }) {
        return await prisma.$transaction(async (tx: any) => {
            // 1. Validar producto
            const product = await tx.producto.findUnique({ where: { id: dto.productId } });
            if (!product) throw new Error('Producto no encontrado');

            // 2. Asegurar existencia del cliente en CRM
            const customer = await tx.cliente.upsert({
                where: { numero_documento: dto.cliente.numeroDoc },
                update: { nombre: dto.cliente.nombre, tipo_documento: dto.cliente.tipoDoc },
                create: {
                    numero_documento: dto.cliente.numeroDoc,
                    tipo_documento: dto.cliente.tipoDoc,
                    nombre: dto.cliente.nombre
                },
            });

            // 3. Validar y Reservar IMEI si es necesario
            if (product.requiere_imei) {
                if (!dto.imei) throw new Error('IMEI requerido para este producto');

                const stockItem = await tx.itemInventario.findFirst({
                    where: {
                        productoId: dto.productId,
                        imei: dto.imei,
                        estado_inventario: 'Disponible'
                    }
                });

                if (!stockItem) throw new Error('IMEI no disponible o no pertenece al producto');

                await tx.itemInventario.update({
                    where: { id: stockItem.id },
                    data: { estado_inventario: 'Vendido' }
                });
            }

            // 4. Calcular montos
            const totalVenta = Number(product.precios.retail);
            const valorVenta = totalVenta / 1.18;
            const igvTotal = totalVenta - valorVenta;

            // 5. Crear factura técnica vinculada al CRM
            const invoice = await tx.factura.create({
                data: {
                    tipo_documento: dto.cliente.tipoDoc === '6' ? '01' : '03',
                    serie_correlativo: `F001-${Math.floor(Math.random() * 1000000)}`,
                    clienteId: customer.id,
                    igv_total: igvTotal,
                    total_venta: totalVenta
                }
            });

            return {
                message: 'Venta procesada exitosamente',
                invoice_id: invoice.id,
                comprobante: invoice.serie_correlativo,
                total: totalVenta
            };
        });
    }
}
