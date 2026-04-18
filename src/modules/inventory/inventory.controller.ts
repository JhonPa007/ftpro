// src/modules/inventory/inventory.controller.ts
import type { Request, Response } from 'express';
import { InventoryService } from './inventory.service.js';

const inventoryService = new InventoryService();

// MAESTROS
export const getMasterData = async (req: Request, res: Response) => {
    try {
        const [categories, brands, attributes, providers] = await Promise.all([
            inventoryService.getAllCategories(),
            inventoryService.getAllBrands(),
            inventoryService.getAllAttributes(),
            inventoryService.getAllProveedores()
        ]);
        res.json({ categories, brands, attributes, providers });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const createCategory = async (req: Request, res: Response) => {
    try {
        const { nombre, descripcion } = req.body;
        const cat = await inventoryService.createCategory(nombre, descripcion);
        res.json(cat);
    } catch (error: any) { res.status(400).json({ error: error.message }); }
};

export const createBrand = async (req: Request, res: Response) => {
    try {
        const { nombre } = req.body;
        const brand = await inventoryService.createBrand(nombre);
        res.json(brand);
    } catch (error: any) { res.status(400).json({ error: error.message }); }
};

export const createAttribute = async (req: Request, res: Response) => {
    try {
        const { nombre } = req.body;
        const attr = await inventoryService.createAttribute(nombre);
        res.json(attr);
    } catch (error: any) { res.status(400).json({ error: error.message }); }
};

// PROVEEDORES
export const createProvider = async (req: Request, res: Response) => {
    try {
        const provider = await inventoryService.createProveedor(req.body);
        res.json(provider);
    } catch (error: any) { res.status(400).json({ error: error.message }); }
};

export const listProviders = async (req: Request, res: Response) => {
    try {
        const providers = await inventoryService.getAllProveedores();
        res.json(providers);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
};

// PRODUCTOS
export const createProduct = async (req: Request, res: Response) => {
    try {
        const product = await inventoryService.createProduct(req.body);
        res.json(product);
    } catch (error: any) { res.status(400).json({ error: error.message }); }
};

export const listProducts = async (req: Request, res: Response) => {
    try {
        const products = await inventoryService.getProductCatalog();
        res.json(products);
    } catch (error: any) { res.status(500).json({ error: error.message }); }
};

// STOCK
export const addStock = async (req: Request, res: Response) => {
    try {
        const { productId, items } = req.body;
        const result = await inventoryService.registerStockMovement(productId, items);
        res.json({ message: 'Stock registrado exitosamente', result });
    } catch (error: any) { res.status(400).json({ error: error.message }); }
};

export const lookupImei = async (req: Request, res: Response) => {
    const { imei } = req.params;
    try {
        const info = await inventoryService.searchByImei(imei as string);
        if (!info) return res.status(404).json({ message: 'IMEI no encontrado' });
        res.json(info);
    } catch (error: any) { res.status(400).json({ error: error.message }); }
};
