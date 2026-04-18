// src/modules/inventory/inventory.service.ts
import prisma from '../../shared/prisma.js';

export class InventoryService {
    /**
     * MAESTROS: CATEGORÍAS, MARCAS, CARACTERÍSTICAS
     */
    async createCategory(nombre: string, descripcion?: string) {
        return await prisma.categoria.create({ data: { nombre, descripcion } });
    }

    async createBrand(nombre: string) {
        return await prisma.marca.create({ data: { nombre } });
    }

    async createAttribute(nombre: string) {
        return await prisma.caracteristica.create({ data: { nombre } });
    }

    async getAllCategories() {
        return await prisma.categoria.findMany({ orderBy: { nombre: 'asc' } });
    }

    async getAllBrands() {
        return await prisma.marca.findMany({ orderBy: { nombre: 'asc' } });
    }

    async getAllAttributes() {
        return await prisma.caracteristica.findMany({ orderBy: { nombre: 'asc' } });
    }

    /**
     * CATÁLOGO: PRODUCTO ESTRUCTURADO
     */
    async createProduct(data: {
        sku: string;
        nombre: string;
        categoriaId: string;
        marcaId: string;
        precios: any;
        precio_compra: number;
        stock_minimo: number;
        requiere_imei: boolean;
        attributes?: Array<{ id: string; valor: string }>;
    }) {
        return await prisma.producto.create({
            data: {
                sku: data.sku,
                nombre: data.nombre,
                categoriaId: data.categoriaId,
                marcaId: data.marcaId,
                precios: data.precios,
                precio_compra: data.precio_compra,
                stock_minimo: data.stock_minimo,
                requiere_imei: data.requiere_imei,
                caracteristicas: data.attributes ? {
                    create: data.attributes.map(attr => ({
                        caracteristicaId: attr.id,
                        valor: attr.valor
                    }))
                } : undefined
            }
        });
    }

    async getProductCatalog() {
        return await prisma.producto.findMany({
            include: {
                categoria: true,
                marca: true,
                caracteristicas: { include: { caracteristica: true } }
            },
            orderBy: { created_at: 'desc' }
        });
    }

    async registerStockMovement(productoId: string, items: Array<{
        imei?: string;
        iccid?: string;
        estado_dispositivo: string;
        ubicacion: string;
    }>) {
        return await prisma.itemInventario.createMany({
            data: items.map(item => ({
                productoId,
                imei: item.imei,
                iccid: item.iccid,
                estado_inventario: 'Disponible'
            }))
        });
    }

    async searchByImei(imei: string) {
        return await prisma.itemInventario.findUnique({
            where: { imei },
            include: { producto: { include: { marca: true, categoria: true } } }
        });
    }
}
