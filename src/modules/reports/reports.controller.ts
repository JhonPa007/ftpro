// src/modules/reports/reports.controller.ts
import type { Request, Response } from 'express';
import { ReportsService } from './reports.service.js';

const reportsService = new ReportsService();

export const getDailySales = async (req: Request, res: Response) => {
    try {
        const data = await reportsService.getDailySalesReport();
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getInventoryAlerts = async (req: Request, res: Response) => {
    try {
        const data = await reportsService.getLowStockAlerts();
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

export const getSupportStats = async (req: Request, res: Response) => {
    try {
        const data = await reportsService.getSupportStats();
        res.json(data);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};
