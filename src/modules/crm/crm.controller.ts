// src/modules/crm/crm.controller.ts
import type { Request, Response } from 'express';
import { CrmService } from './crm.service.js';

const crmService = new CrmService();

export const upsertCustomer = async (req: Request, res: Response) => {
    try {
        const customer = await crmService.upsertCustomer(req.body);
        res.json(customer);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

export const getHistory = async (req: Request, res: Response) => {
    try {
        const numeroDoc = req.params.numeroDoc as string;
        const history = await crmService.getCustomerHistory(numeroDoc);
        res.json(history);
    } catch (error: any) {
        res.status(404).json({ error: error.message });
    }
};
export const searchClients = async (query: string) => {
    return await crmService.searchClients(query);
};

export const lookupDocument = async (req: Request, res: Response) => {
    try {
        const type = req.params.type as string;
        const number = req.params.number as string;
        const data = await crmService.lookupExternalDocument(type, number);
        res.json(data);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};
