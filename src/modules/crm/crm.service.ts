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
        return await (prisma as any).cliente.upsert({
            where: { numero_documento: data.numero_documento },
            update: data,
            create: data,
        });
    }

    /**
     * Consultar documento en Decolecta API (RENIEC/SUNAT)
     */
    async lookupExternalDocument(tipo: string, numero: string) {
        // 1. Intentar buscar localmente primero para ahorrar costos de API
        const localClient = await (prisma as any).cliente.findUnique({
            where: { numero_documento: numero }
        });

        if (localClient) {
            return {
                success: true,
                source: 'local',
                tipo: localClient.tipo_documento,
                nombre_completo: localClient.nombre,
                razon_social: localClient.nombre,
                direccion: localClient.direccion || '',
                telefono: localClient.telefono || '',
                email: localClient.email || ''
            };
        }

        const token = 'sk_12199.6AOBIMls8TquShJ45J3rnmPfCR0BtWcK';
        const baseUrl = 'https://api.decolecta.com/v1';
        const endpoint = tipo.toUpperCase() === 'DNI' ? `reniec/dni?numero=${numero}` : `sunat/ruc?numero=${numero}`;

        try {
            const response = await fetch(`${baseUrl}/${endpoint}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data: any = await response.json();

            if (!response.ok) throw new Error(data.message || 'Error en consulta externa');

            if (tipo.toUpperCase() === 'DNI') {
                return {
                    success: true,
                    source: 'external',
                    tipo: 'DNI',
                    nombres: data.first_name || data.nombres,
                    apellido_paterno: data.first_last_name || data.apellido_paterno,
                    apellido_materno: data.second_last_name || data.apellido_materno,
                    nombre_completo: `${data.first_name || data.nombres} ${data.first_last_name || data.apellido_paterno} ${data.second_last_name || data.apellido_materno}`.trim(),
                    direccion: data.direccion || ''
                };
            } else {
                return {
                    success: true,
                    source: 'external',
                    tipo: 'RUC',
                    razon_social: data.razon_social,
                    direccion: data.direccion || data.direccion_fiscal || '',
                    condicion: data.condicion
                };
            }
        } catch (error: any) {
            console.error('External Lookup Error:', error);
            throw new Error(`No se pudo consultar el documento: ${error.message}`);
        }
    }

    /**
     * Búsqueda por nombre o documento
     */
    async searchClients(query: string) {
        return await (prisma as any).cliente.findMany({
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
        const customer = await (prisma as any).cliente.findUnique({
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
