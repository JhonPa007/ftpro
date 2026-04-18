// src/modules/inventory/inventory.controller.ts
import type { Request, Response } from 'express';
import { InventoryService } from './inventory.service.js';

const inventoryService = new InventoryService();

export const createProduct = async (req: Request, res: Response) => {
    try {
        const product = await inventoryService.createProduct(req.body);
        res.json(product);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

export const addStock = async (req: Request, res: Response) => {
    try {
        const { productId, items } = req.body;
        const result = await inventoryService.registerStockMovement(productId, items);
        res.json({ message: 'Stock registrado exitosamente', result });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

export const lookupImei = async (req: Request, res: Response) => {
    const { imei } = req.params;
    try {
        const info = await inventoryService.searchByImei(imei as string);
        if (!info) return res.status(404).json({ message: 'IMEI no encontrado' });
        res.json(info);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};
