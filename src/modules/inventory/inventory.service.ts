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

    async getMasters() {
        return {
            categories: await this.getAllCategories(),
            brands: await this.getAllBrands(),
            attributes: await this.getAllAttributes()
        };
    }

    async saveMaster(type: string, name: string) {
        switch (type) {
            case 'categories': return await this.createCategory(name);
            case 'brands': return await this.createBrand(name);
            case 'attributes': return await this.createAttribute(name);
            default: throw new Error('Tipo de maestro inválido');
        }
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
    async createProveedor(data: { ruc: string; nombre: string; contacto?: string; telefono?: string; email?: string; direccion?: string }) {
        return await prisma.proveedor.create({ data });
    }

    async updateProveedor(id: string, data: { nombre?: string; activo?: boolean; contacto?: string; telefono?: string; email?: string; direccion?: string }) {
        return await prisma.proveedor.update({ where: { id }, data });
    }

    async getAllProveedores(onlyActive = false) {
        return await prisma.proveedor.findMany({
            where: onlyActive ? { activo: true } : {},
            orderBy: { nombre: 'asc' }
        });
    }

    /**
     * COMPRAS (STOCK IN)
     */
    async registerPurchase(data: {
        proveedorId: string;
        numero_factura: string;
        items: Array<{
            productoId: string;
            cantidad: number;
            precio_unit: number;
            imeis?: string[];
        }>;
    }) {
        // Calcular total
        const total_compra = data.items.reduce((acc, item) => acc + (item.cantidad * item.precio_unit), 0);

        return await prisma.$transaction(async (tx) => {
            // 1. Crear Cabecera
            const compra = await tx.compra.create({
                data: {
                    proveedorId: data.proveedorId,
                    numero_factura: data.numero_factura,
                    total_compra: total_compra
                }
            });

            // 2. Procesar cada item
            for (const item of data.items) {
                // A. Crear Detalle de Compra
                const detalle = await tx.detalleCompra.create({
                    data: {
                        compraId: compra.id,
                        productoId: item.productoId,
                        cantidad: item.cantidad,
                        precio_unit: item.precio_unit
                    }
                });

                // B. Crear Unidades de Inventario
                if (item.imeis && item.imeis.length > 0) {
                    // Si tiene IMEIs, crear uno por uno
                    await tx.itemInventario.createMany({
                        data: item.imeis.map(imei => ({
                            productoId: item.productoId,
                            detalleCompraId: detalle.id,
                            imei: imei,
                            estado_inventario: 'Disponible'
                        }))
                    });
                } else {
                    // Si no tiene IMEIs (ej: accesorios), crear N registros genéricos
                    const itemsData = Array.from({ length: item.cantidad }).map(() => ({
                        productoId: item.productoId,
                        detalleCompraId: detalle.id,
                        estado_inventario: 'Disponible'
                    }));
                    await tx.itemInventario.createMany({ data: itemsData });
                }

                // C. Opcional: Actualizar el precio de compra histórico del producto
                await tx.producto.update({
                    where: { id: item.productoId },
                    data: { precio_compra: item.precio_unit }
                });
            }

            return compra;
        });
    }
    // BUSQUEDA PARA POS
    async searchForPOS(query: string) {
        // 1. Buscar por IMEI exacto
        const itemByImei = await prisma.itemInventario.findFirst({
            where: {
                imei: query,
                estado_inventario: 'Disponible'
            },
            include: { producto: true }
        });

        if (itemByImei) {
            return [{
                type: 'IMEI',
                id: itemByImei.producto.id,
                sku: itemByImei.producto.sku,
                nombre: itemByImei.producto.nombre,
                precio: Number(itemByImei.producto.precios['retail'] || 0),
                imei: itemByImei.imei,
                unitId: itemByImei.id
            }];
        }

        // 2. Buscar por SKU o Nombre
        const products = await prisma.producto.findMany({
            where: {
                OR: [
                    { sku: { contains: query, mode: 'insensitive' } },
                    { nombre: { contains: query, mode: 'insensitive' } }
                ]
            },
            take: 5
        });

        return products.map(p => ({
            type: 'PRODUCTO',
            id: p.id,
            sku: p.sku,
            nombre: p.nombre,
            precio: Number(p.precios['retail'] || 0),
            requiere_imei: p.requiere_imei
        }));
    }
}
