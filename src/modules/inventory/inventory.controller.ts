import { Request, Response, Router } from 'express';
import { InventoryService } from './inventory.service.js';

const router = Router();
const inventoryService = new InventoryService();

// ROUTES
router.get('/masters', async (req, res) => {
    try {
        const onlyActive = req.query.active === 'true';
        const [categories, brands, attributes, providers] = await Promise.all([
            inventoryService.getAllCategories(onlyActive),
            inventoryService.getAllBrands(onlyActive),
            inventoryService.getAllAttributes(onlyActive),
            inventoryService.getAllProveedores(onlyActive)
        ]);
        res.json({ categories, brands, attributes, providers });
    } catch (error: any) { res.status(500).json({ error: error.message }); }
});

router.post('/categories', async (req, res) => {
    try { res.json(await inventoryService.createCategory(req.body.nombre, req.body.descripcion)); }
    catch (error: any) { res.status(400).json({ error: error.message }); }
});

router.post('/brands', async (req, res) => {
    try { res.json(await inventoryService.createBrand(req.body.nombre)); }
    catch (error: any) { res.status(400).json({ error: error.message }); }
});

router.post('/attributes', async (req, res) => {
    try { res.json(await inventoryService.createAttribute(req.body.nombre)); }
    catch (error: any) { res.status(400).json({ error: error.message }); }
});

router.post('/providers', async (req, res) => {
    try { res.json(await inventoryService.createProveedor(req.body)); }
    catch (error: any) { res.status(400).json({ error: error.message }); }
});

router.get('/providers', async (req, res) => {
    try { res.json(await inventoryService.getAllProveedores()); }
    catch (error: any) { res.status(500).json({ error: error.message }); }
});

router.post('/products', async (req, res) => {
    try { res.json(await inventoryService.createProduct(req.body)); }
    catch (error: any) { res.status(400).json({ error: error.message }); }
});

router.get('/products', async (req, res) => {
    try { res.json(await inventoryService.getProductCatalog()); }
    catch (error: any) { res.status(500).json({ error: error.message }); }
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

export default router;
