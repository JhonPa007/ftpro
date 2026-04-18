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
     * Búsqueda por nombre o documento
     */
    async searchClients(query: string) {
        return await prisma.cliente.findMany({
            where: {
                OR: [
                    { nombre: { contains: query, mode: 'insensitive' } },
                    { numero_documento: { contains: query } }
                ]
            },
            take: 5
        });
    }

    /**
     * Obtener Vista 360 del Cliente (Historial Completo)
     */
    async getCustomerHistory(numeroDoc: string) {
        const customer = await prisma.cliente.findUnique({
            where: { numero_documento: numeroDoc },
            include: {
                ventas: {
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
            ventas: customer.ventas.map((v: any) => ({
                id: v.id,
                numero: v.numero_venta,
                monto: Number(v.total),
                fecha: v.created_at
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
