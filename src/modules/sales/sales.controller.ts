// src/modules/sales/sales.controller.ts
import type { Request, Response } from 'express';
import { SalesService } from './sales.service.js';

const salesService = new SalesService();

export const createSale = async (req: Request, res: Response) => {
    try {
        const result = await salesService.processSale(req.body);
        res.status(201).json(result);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};
