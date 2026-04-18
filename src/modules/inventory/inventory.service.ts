// src/modules/inventory/inventory.service.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class InventoryService {
    async fetchProducts() {
        return await prisma.product.findMany();
    }

    async validateImei(imei: string) {
        // Lógica simplificada de cumplimiento OSIPTEL
        const luhnValid = this.checkLuhn(imei);
        if (!luhnValid) return { status: 'INVALID', reason: 'Error de estructura (Luhn)' };

        return { status: 'VALID', imei, timestamp: new Date() };
    }

    private checkLuhn(imei: string): boolean {
        if (imei.length !== 15) return false;
        let sum = 0;
        for (let i = 0; i < 15; i++) {
            let n = parseInt(imei[i]);
            if (i % 2 !== 0) {
                n *= 2;
                if (n > 9) n -= 9;
            }
            sum += n;
        }
        return sum % 10 === 0;
    }
}
