// src/modules/config/config.controller.ts
import { Request, Response, Router } from 'express';
import { ConfigService } from './config.service.js';

const router = Router();
const configService = new ConfigService();

router.get('/', async (req: Request, res: Response) => {
    try {
        const config = await configService.getConfig();
        res.json(config);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/', async (req: Request, res: Response) => {
    try {
        const config = await configService.updateConfig(req.body);
        res.json(config);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/sucursales', async (req, res) => {
    try { res.json(await configService.getSucursales()); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.post('/sucursales', async (req, res) => {
    try { res.json(await configService.createSucursal(req.body)); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.put('/sucursales/:id', async (req, res) => {
    try { res.json(await configService.updateSucursal(req.params.id, req.body)); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default router;
