// src/modules/sales/sale.controller.ts
import { Router } from 'express';
import { SaleService } from './sale.service.js';

const router = Router();
const saleService = new SaleService();

router.get('/', async (req, res) => {
    try { res.json(await saleService.getSales()); }
    catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/pos', async (req, res) => {
    try { res.json(await saleService.createSale(req.body)); }
    catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.get('/:id', async (req, res) => {
    try { res.json(await saleService.getSaleById(req.params.id)); }
    catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
    try { res.json(await saleService.deleteSale(req.params.id)); }
    catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.patch('/:id/type', async (req, res) => {
    try { res.json(await saleService.updateSaleType(req.params.id, req.body.tipo)); }
    catch (err: any) { res.status(400).json({ error: err.message }); }
});

export default router;
