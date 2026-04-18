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
                    modulos: ["dashboard", "pos", "inventory", "support", "crm"]
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
}
