import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import { initDatabase } from './db/database.js';
import { seedDatabase } from './db/seed.js';
import { runMigrations } from './db/migrations.js';
import { autoRestoreOnStartup, saveLocalSnapshot, getLastMutationTimestamp } from './db/snapshotSync.js';

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
import { communityRouter } from './routes/community.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Database, Idempotent Seed & Versioned Ecosystem Migrations
initDatabase();
seedDatabase();
runMigrations();
autoRestoreOnStartup();

export const app = express();
const PORT = process.env.PORT || 3001;

// Disable ETag on API responses so Windows/Edge/Mobile browsers never serve stale 304 cached states
app.set('etag', false);

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Anti-cache & Auto-Snapshot Middleware for /api/*
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');

  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && !req.path.startsWith('/auth/login')) {
    res.on('finish', () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        setImmediate(() => {
          saveLocalSnapshot();
        });
      }
    });
  }
  next();
});

// Static uploads directory for media persistence
const uploadsDir = path.join(__dirname, '../data/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

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
app.use('/api/community', communityRouter);

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'online',
    time: new Date().toISOString(),
    last_mutation_at: getLastMutationTimestamp(),
    pastoral: 'Pastoral Missionária - Ágape Apostolado de Jovens',
    parish: 'Paróquia São Vicente de Paulo - Planaltina/DF',
  });
});

// Serve frontend in production
const distPath = path.resolve(__dirname, '../dist');
app.use(
  express.static(distPath, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    },
  })
);
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('API da Pastoral Missionária online. Execute "npm run dev" para o frontend Vite.');
    }
  });
});

// Start Express Server
if (process.env.TEST_MODE !== 'true') {
  app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🕊️  SISTEMA DE GESTÃO DA PASTORAL MISSIONÁRIA`);
    console.log(`✝️  Ágape Apostolado de Jovens - Paróquia São Vicente de Paulo`);
    console.log(`📡 Servidor Backend executando em: http://localhost:${PORT}`);
    console.log(`======================================================\n`);

    // Keep-Alive Heartbeat for Render Free Tier (every 8 minutes)
    if (process.env.NODE_ENV === 'production') {
      const targetUrl = process.env.RENDER_EXTERNAL_URL || 'https://pastoral-missionaria.onrender.com';
      setInterval(() => {
        fetch(`${targetUrl}/api/health`).catch(() => {});
      }, 8 * 60 * 1000);
    }
  });
}
