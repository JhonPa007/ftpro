// src/modules/crm/crm.service.ts
import prisma from '../../shared/prisma.js';

export class CrmService {
    /**
     * Crear o actualizar cliente (Upsert por número de documento)
     */
    async upsertCustomer(data: {
        tipo_documento: string;
        numero_documento: string;
        nombre: string;
        telefono?: string;
        email?: string;
        direccion?: string;
    }) {
        return await prisma.cliente.upsert({
            where: { numero_documento: data.numero_documento },
            update: data,
            create: data,
        });
    }

    /**
     * Obtener Vista 360 del Cliente (Historial Completo)
     */
    async getCustomerHistory(numeroDoc: string) {
        const customer = await prisma.cliente.findUnique({
            where: { numero_documento: numeroDoc },
            include: {
                facturas: {
                    orderBy: { created_at: 'desc' },
                    take: 10
                },
                ordenesServicio: {
                    orderBy: { created_at: 'desc' },
                    take: 5
                }
            }
        });

        if (!customer) throw new Error('Cliente no registrado');

        return {
            perfil: {
                nombre: customer.nombre,
                documento: `${customer.tipo_documento}-${customer.numero_documento}`,
                contacto: customer.telefono || 'Sin teléfono'
            },
            ventas: customer.facturas.map((inv: any) => ({
                compra: inv.serie_correlativo,
                monto: inv.total_venta,
                fecha: inv.created_at
            })),
            reparaciones: customer.ordenesServicio.map((so: any) => ({
                orden: so.numero_orden,
                equipo: so.marca_modelo,
                estado: so.estado_servicio,
                fecha: so.created_at
            }))
        };
    }
}
