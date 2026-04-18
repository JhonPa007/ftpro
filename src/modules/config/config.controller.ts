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

export default router;
