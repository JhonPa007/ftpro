// src/modules/inventory/inventory.service.ts
import prisma from '../../shared/prisma.js';

export class InventoryService {
    /**
     * MAESTROS: CATEGORÍAS, MARCAS, CARACTERÍSTICAS
     */
    async createCategory(nombre: string, descripcion?: string) {
        return await prisma.category.create({ data: { nombre, descripcion } });
    }

    async createBrand(nombre: string) {
        return await prisma.brand.create({ data: { nombre } });
    }

    async createAttribute(nombre: string) {
        return await prisma.attribute.create({ data: { nombre } });
    }

    async getAllCategories() {
        return await prisma.category.findMany({ orderBy: { nombre: 'asc' } });
    }

    async getAllBrands() {
        return await prisma.brand.findMany({ orderBy: { nombre: 'asc' } });
    }

    async getAllAttributes() {
        return await prisma.attribute.findMany({ orderBy: { nombre: 'asc' } });
    }

    /**
     * CATÁLOGO: PRODUCTO ESTRUCTURADO
     */
    async createProduct(data: {
        sku: string;
        nombre: string;
        categoryId: string;
        brandId: string;
        precios: any;
        precio_compra: number;
        stock_minimo: number;
        requiere_imei: boolean;
        attributes?: Array<{ id: string; valor: string }>;
    }) {
        return await prisma.product.create({
            data: {
                sku: data.sku,
                nombre: data.nombre,
                categoryId: data.categoryId,
                brandId: data.brandId,
                precios: data.precios,
                precio_compra: data.precio_compra,
                stock_minimo: data.stock_minimo,
                requiere_imei: data.requiere_imei,
                attributes: data.attributes ? {
                    create: data.attributes.map(attr => ({
                        attributeId: attr.id,
                        valor: attr.valor
                    }))
                } : undefined
            }
        });
    }

    async getProductCatalog() {
        return await prisma.product.findMany({
            include: {
                category: true,
                brand: true,
                attributes: { include: { attribute: true } }
            },
            orderBy: { created_at: 'desc' }
        });
    }

    async registerStockMovement(productId: string, items: Array<{
        imei?: string;
        iccid?: string;
        estado_dispositivo: string;
        ubicacion: string;
    }>) {
        return await prisma.stockItem.createMany({
            data: items.map(item => ({
                productId,
                imei: item.imei,
                iccid: item.iccid,
                estado_inventario: 'Disponible'
            }))
        });
    }

    async searchByImei(imei: string) {
        return await prisma.stockItem.findUnique({
            where: { imei },
            include: { product: { include: { brand: true, category: true } } }
        });
    }
}
