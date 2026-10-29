import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import { initDatabase } from './db/database.js';
import { seedDatabase } from './db/seed.js';
import { runMigrations } from './db/migrations.js';

import { authRouter } from './routes/auth.js';
import { membersRouter } from './routes/members.js';
import { campaignsRouter } from './routes/campaigns.js';
import { ordersRouter } from './routes/orders.js';
import { paymentsRouter } from './routes/payments.js';
import { deliveriesRouter } from './routes/deliveries.js';
import { dashboardRouter } from './routes/dashboard.js';
import { reportsRouter } from './routes/reports.js';
import { sheetsRouter } from './routes/sheets.js';
import { whatsappRouter } from './routes/whatsapp.js';
import { settingsRouter } from './routes/settings.js';
import { platformRouter } from './routes/platform.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Database, Idempotent Seed & Versioned Ecosystem Migrations
initDatabase();
seedDatabase();
runMigrations();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/members', membersRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/deliveries', deliveriesRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/sheets', sheetsRouter);
app.use('/api/whatsapp', whatsappRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/platform', platformRouter);

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'online',
    time: new Date().toISOString(),
    pastoral: 'Pastoral Missionária - Ágape Apostolado de Jovens',
    parish: 'Paróquia São Vicente de Paulo - Planaltina/DF',
  });
});

// Serve frontend in production
const distPath = path.resolve(__dirname, '../dist');
app.use(express.static(distPath));
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('API da Pastoral Missionária online. Execute "npm run dev" para o frontend Vite.');
    }
  });
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🕊️  SISTEMA DE GESTÃO DA PASTORAL MISSIONÁRIA`);
  console.log(`✝️  Ágape Apostolado de Jovens - Paróquia São Vicente de Paulo`);
  console.log(`📡 Servidor Backend executando em: http://localhost:${PORT}`);
  console.log(`======================================================\n`);
});
