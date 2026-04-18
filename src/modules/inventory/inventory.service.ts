// src/modules/inventory/inventory.service.ts
import prisma from '../../shared/prisma.js';

export class InventoryService {
    /**
     * MAESTROS: CATEGORÍAS, MARCAS, CARACTERÍSTICAS
     */
    async createCategory(nombre: string, descripcion?: string) {
        return await prisma.categoria.create({ data: { nombre, descripcion } });
    }

    async updateCategory(id: string, data: { nombre?: string; activo?: boolean }) {
        return await prisma.categoria.update({ where: { id }, data });
    }

    async createBrand(nombre: string) {
        return await prisma.marca.create({ data: { nombre } });
    }

    async updateBrand(id: string, data: { nombre?: string; activo?: boolean }) {
        return await prisma.marca.update({ where: { id }, data });
    }

    async createAttribute(nombre: string) {
        return await prisma.caracteristica.create({ data: { nombre } });
    }

    async updateAttribute(id: string, data: { nombre?: string; activo?: boolean }) {
        return await prisma.caracteristica.update({ where: { id }, data });
    }

    async getAllCategories(onlyActive = false) {
        return await prisma.categoria.findMany({
            where: onlyActive ? { activo: true } : {},
            orderBy: { nombre: 'asc' }
        });
    }

    async getAllBrands(onlyActive = false) {
        return await prisma.marca.findMany({
            where: onlyActive ? { activo: true } : {},
            orderBy: { nombre: 'asc' }
        });
    }

    async getAllAttributes(onlyActive = false) {
        return await prisma.caracteristica.findMany({
            where: onlyActive ? { activo: true } : {},
            orderBy: { nombre: 'asc' }
        });
    }

    /**
     * CATÁLOGO Y STOCK
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

    /**
     * PROVEEDORES
     */
    async createProveedor(data: { ruc: string; nombre: string; contacto?: string; telefono?: string }) {
        return await prisma.proveedor.create({ data });
    }

    async updateProveedor(id: string, data: { nombre?: string; activo?: boolean; contacto?: string; telefono?: string }) {
        return await prisma.proveedor.update({ where: { id }, data });
    }

    async getAllProveedores(onlyActive = false) {
        return await prisma.proveedor.findMany({
            where: onlyActive ? { activo: true } : {},
            orderBy: { nombre: 'asc' }
        });
    }
}
