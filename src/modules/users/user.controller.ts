// src/modules/users/user.controller.ts
import { Request, Response, Router } from 'express';
import { UserService } from './user.service.js';

const router = Router();
const userService = new UserService();

router.get('/', async (req, res) => {
    try { res.json(await userService.listUsers()); }
    catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
    try { res.json(await userService.createUser(req.body)); }
    catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.patch('/:id', async (req, res) => {
    try { res.json(await userService.updateUser(req.params.id, req.body)); }
    catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.delete('/:id', async (req, res) => {
    try { res.json(await userService.deleteUser(req.params.id)); }
    catch (err: any) { res.status(400).json({ error: err.message }); }
});

router.post('/login', async (req, res) => {
    try {
        const user = await userService.authenticate(req.body.username, req.body.password);
        if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });
        res.json(user);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
