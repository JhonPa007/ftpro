// src/modules/config/config.service.ts
import prisma from '../../shared/prisma.js';

export class ConfigService {
    async getConfig() {
        let config = await prisma.configuracion.findFirst();
        if (!config) {
            config = await prisma.configuracion.create({
                data: {
                    id: 'default',
                    empresa_nombre: 'FTPRO',
                    modulos: ["dashboard", "pos", "inventory", "support", "crm", "config"]
                }
            });
        }
        return config;
    }

    async updateConfig(data: any) {
        return await prisma.configuracion.upsert({
            where: { id: 'default' },
            create: { ...data, id: 'default' },
            update: data
        });
    }

    async getSucursales() {
        return await (prisma as any).sucursal.findMany({
            orderBy: { nombre: 'asc' }
        });
    }

    async updateSucursal(id: string, data: any) {
        return await (prisma as any).sucursal.update({
            where: { id },
            data
        });
    }

    async createSucursal(data: any) {
        return await (prisma as any).sucursal.create({
            data
        });
    }
}
