import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

import { createSale } from './modules/sales/sales.controller.js';
import * as reportsController from './modules/reports/reports.controller.js';
import * as crmController from './modules/crm/crm.controller.js';
import inventoryController from './modules/inventory/inventory.controller.js';
import configController from './modules/config/config.controller.js';
import userController from './modules/users/user.controller.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.use('/api/inventory', inventoryController);
app.use('/api/config', configController);
app.use('/api/users', userController);

// Endpoint de Punto de Venta (POS)
app.post('/api/sales/pos', createSale);

// Endpoints de Reportes
app.get('/api/reports/daily-sales', reportsController.getDailySales);
app.get('/api/reports/inventory-alerts', reportsController.getInventoryAlerts);
app.get('/api/reports/support-stats', reportsController.getSupportStats);

// Endpoints de CRM
app.post('/api/crm/customers', crmController.upsertCustomer);
app.get('/api/crm/customers/:numeroDoc/history', crmController.getHistory);

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Sistema de Gestión de Celulares Operativo' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Sistema de Gestión de Celulares Operativo' });
});

// Futuras rutas de módulos
// app.use('/api/inventory', inventoryRoutes);
// app.use('/api/sales', salesRoutes);
// app.use('/api/support', supportRoutes);

app.listen(PORT, () => {
  console.log(`[Server]: Servidor corriendo en http://localhost:${PORT}`);
});
