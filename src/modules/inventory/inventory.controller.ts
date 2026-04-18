// src/modules/inventory/inventory.controller.ts
import type { Request, Response } from 'express';
import { InventoryService } from './inventory.service.js';

const inventoryService = new InventoryService();

// MAESTROS (READ)
export const getMasterData = async (req: Request, res: Response) => {
    try {
        const onlyActive = req.query.active === 'true';
        const [categories, brands, attributes, providers] = await Promise.all([
            inventoryService.getAllCategories(onlyActive),
            inventoryService.getAllBrands(onlyActive),
            inventoryService.getAllAttributes(onlyActive),
            inventoryService.getAllProveedores(onlyActive)
        ]);
        res.json({ categories, brands, attributes, providers });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

// MAESTROS (CREATE/UPDATE)
export const createCategory = async (req: Request, res: Response) => {
    try { res.json(await inventoryService.createCategory(req.body.nombre, req.body.descripcion)); }
    catch (error: any) { res.status(400).json({ error: error.message }); }
};
export const updateCategory = async (req: Request, res: Response) => {
    try { res.json(await inventoryService.updateCategory(req.params.id as string, req.body)); }
    catch (error: any) { res.status(400).json({ error: error.message }); }
};

export const createBrand = async (req: Request, res: Response) => {
    try { res.json(await inventoryService.createBrand(req.body.nombre)); }
    catch (error: any) { res.status(400).json({ error: error.message }); }
};
export const updateBrand = async (req: Request, res: Response) => {
    try { res.json(await inventoryService.updateBrand(req.params.id as string, req.body)); }
    catch (error: any) { res.status(400).json({ error: error.message }); }
};

export const createAttribute = async (req: Request, res: Response) => {
    try { res.json(await inventoryService.createAttribute(req.body.nombre)); }
    catch (error: any) { res.status(400).json({ error: error.message }); }
};
export const updateAttribute = async (req: Request, res: Response) => {
    try { res.json(await inventoryService.updateAttribute(req.params.id as string, req.body)); }
    catch (error: any) { res.status(400).json({ error: error.message }); }
};

// PROVEEDORES
export const createProvider = async (req: Request, res: Response) => {
    try { res.json(await inventoryService.createProveedor(req.body)); }
    catch (error: any) { res.status(400).json({ error: error.message }); }
};
export const updateProvider = async (req: Request, res: Response) => {
    try { res.json(await inventoryService.updateProveedor(req.params.id as string, req.body)); }
    catch (error: any) { res.status(400).json({ error: error.message }); }
};
export const listProviders = async (req: Request, res: Response) => {
    try { res.json(await inventoryService.getAllProveedores()); }
    catch (error: any) { res.status(500).json({ error: error.message }); }
};

// PRODUCTOS
export const createProduct = async (req: Request, res: Response) => {
    try { res.json(await inventoryService.createProduct(req.body)); }
    catch (error: any) { res.status(400).json({ error: error.message }); }
};
export const listProducts = async (req: Request, res: Response) => {
    try { res.json(await inventoryService.getProductCatalog()); }
    catch (error: any) { res.status(500).json({ error: error.message }); }
};

// COMPRAS (STOCK IN)
export const registerPurchase = async (req: Request, res: Response) => {
    try { res.json(await inventoryService.registerPurchase(req.body)); }
    catch (error: any) { res.status(400).json({ error: error.message }); }
};

// STOCK / IMEI
export const addStock = async (req: Request, res: Response) => {
    try { res.json(await inventoryService.registerStockMovement(req.body.productId as string, req.body.items)); }
    catch (error: any) { res.status(400).json({ error: error.message }); }
};
export const lookupImei = async (req: Request, res: Response) => {
    try {
        const info = await inventoryService.searchByImei(req.params.imei as string);
        if (!info) return res.status(404).json({ message: 'IMEI no encontrado' });
        res.json(info);
    } catch (error: any) { res.status(400).json({ error: error.message }); }
};
