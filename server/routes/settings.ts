import { Router, Response } from 'express';
import { db } from '../db/database.js';
import { authenticateToken, requireRole, AuthenticatedRequest } from './auth.js';

export const settingsRouter = Router();

// GET /api/settings/institutional
settingsRouter.get('/institutional', authenticateToken, (_req: AuthenticatedRequest, res: Response) => {
  const row = db.prepare('SELECT value_json FROM integration_settings WHERE key = ?').get('institutional') as any;
  if (!row) {
    return res.json({});
  }
  return res.json(JSON.parse(row.value_json));
});

// PUT /api/settings/institutional
settingsRouter.put('/institutional', authenticateToken, requireRole(['admin']), (req: AuthenticatedRequest, res: Response) => {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO integration_settings (key, value_json, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at
  `).run('institutional', JSON.stringify(req.body), now);

  return res.json({ message: 'Configurações institucionais salvas com sucesso.' });
});

// GET /api/settings/backup/export
settingsRouter.get('/backup/export', authenticateToken, requireRole(['admin']), (_req: AuthenticatedRequest, res: Response) => {
  const users = db.prepare('SELECT id, name, email, role, created_at FROM users').all();
  const campaigns = db.prepare('SELECT * FROM campaigns').all();
  const members = db.prepare('SELECT * FROM members').all();
  const orders = db.prepare('SELECT * FROM orders').all();
  const orderItems = db.prepare('SELECT * FROM order_items').all();
  const payments = db.prepare('SELECT * FROM payments').all();
  const integrationSettings = db.prepare('SELECT * FROM integration_settings').all();
  const auditLogs = db.prepare('SELECT * FROM audit_logs').all();

  const backupData = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    system: 'Pastoral Missionária - Gestão de Pedidos',
    data: {
      users,
      campaigns,
      members,
      orders,
      orderItems,
      payments,
      integrationSettings,
      auditLogs,
    },
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="backup_pastoral_missionaria_${new Date().toISOString().split('T')[0]}.json"`);
  return res.send(JSON.stringify(backupData, null, 2));
});

// GET /api/settings/audit
settingsRouter.get('/audit', authenticateToken, requireRole(['admin', 'coordenador']), (_req: AuthenticatedRequest, res: Response) => {
  const logs = db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100').all();
  return res.json(logs);
});

