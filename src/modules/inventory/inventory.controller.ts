// src/modules/inventory/inventory.controller.ts
import { Router } from 'express';
import { InventoryService } from './inventory.service.js';

const router = Router();
const inventoryService = new InventoryService();

router.get('/products', async (req, res) => {
    try { res.json(await inventoryService.getProductCatalog()); }
    catch (error: any) { res.status(500).json({ error: error.message }); }
});

router.post('/products', async (req, res) => {
    try { res.json(await inventoryService.createProduct(req.body)); }
    catch (error: any) { res.status(400).json({ error: error.message }); }
});

router.get('/masters', async (req, res) => {
    try {
        const onlyActive = req.query.active === 'true';
        res.json(await inventoryService.getMasters(onlyActive));
    }
    catch (error: any) { res.status(500).json({ error: error.message }); }
});

router.post('/masters', async (req, res) => {
    try {
        const { type, name } = req.body;
        res.json(await inventoryService.saveMaster(type, name));
    }
    catch (error: any) { res.status(400).json({ error: error.message }); }
});

router.get('/providers', async (req, res) => {
    try { res.json(await inventoryService.getAllProveedores()); }
    catch (error: any) { res.status(500).json({ error: error.message }); }
});

router.post('/providers', async (req, res) => {
    try { res.json(await inventoryService.createProveedor(req.body)); }
    catch (error: any) { res.status(400).json({ error: error.message }); }
});

router.post('/purchases', async (req, res) => {
    try { res.json(await inventoryService.registerPurchase(req.body)); }
    catch (error: any) { res.status(400).json({ error: error.message }); }
});

router.get('/imei/:imei', async (req, res) => {
    try {
        const info = await inventoryService.searchByImei(req.params.imei);
        if (!info) return res.status(404).json({ message: 'IMEI no encontrado' });
        res.json(info);
    } catch (error: any) { res.status(400).json({ error: error.message }); }
});

router.get('/pos-search', async (req, res) => {
    try {
        const query = req.query.q as string;
        res.json(await inventoryService.searchForPOS(query));
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

export default router;
