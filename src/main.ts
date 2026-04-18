import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

import * as reportsController from './modules/reports/reports.controller.js';
import * as crmController from './modules/crm/crm.controller.js';
import inventoryController from './modules/inventory/inventory.controller.js';
import configController from './modules/config/config.controller.js';
import userController from './modules/users/user.controller.js';
import saleController from './modules/sales/sale.controller.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.use('/api/inventory', inventoryController);
app.use('/api/config', configController);
app.use('/api/users', userController);
app.use('/api/sales', saleController);

// Endpoints de Reportes
app.get('/api/reports/daily-sales', reportsController.getDailySales);
app.get('/api/reports/inventory-alerts', reportsController.getInventoryAlerts);
app.get('/api/reports/support-stats', reportsController.getSupportStats);

// Endpoints de CRM
app.post('/api/crm/customers', crmController.upsertCustomer);
app.get('/api/crm/customers/:numeroDoc/history', crmController.getHistory);
// Búsqueda de clientes para POS
app.get('/api/crm/clients/search', async (req, res) => {
  try {
    const query = req.query.q as string;
    // Simple search mock or real query
    const clients = await crmController.searchClients(query);
    res.json(clients);
  } catch (e) { res.status(500).json({ error: 'Error searching clients' }); }
});

app.get('/api/crm/lookup/:type/:number', crmController.lookupDocument);

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Sistema de Gestión de Celulares Operativo' });
});

app.listen(PORT, () => {
  console.log(`[Server]: Servidor corriendo en http://localhost:${PORT}`);
});
