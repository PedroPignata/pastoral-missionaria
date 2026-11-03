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
settingsRouter.put('/institutional', authenticateToken, requireRole(['admin', 'coordenador']), (req: AuthenticatedRequest, res: Response) => {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO integration_settings (key, value_json, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at
  `).run('institutional', JSON.stringify(req.body), now);

  if (req.body.pix_key) {
    const existingPix = db.prepare('SELECT value_json FROM integration_settings WHERE key = ?').get('pix_payment') as any;
    const currentPix = existingPix ? JSON.parse(existingPix.value_json) : {};
    currentPix.pix_key = req.body.pix_key.trim();
    currentPix.updated_at = now;
    db.prepare(`
      INSERT INTO integration_settings (key, value_json, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at
    `).run('pix_payment', JSON.stringify(currentPix), now);
  }

  return res.json({ message: 'Configurações institucionais salvas com sucesso.' });
});

// GET /api/settings/pix (Consulta pública de Pix para membros e pedidos)
settingsRouter.get('/pix', authenticateToken, (_req: AuthenticatedRequest, res: Response) => {
  const row = db.prepare('SELECT value_json FROM integration_settings WHERE key = ?').get('pix_payment') as any;
  if (!row) {
    return res.json({
      pix_key: 'pastoralmissionaria@agape.org.br',
      key_type: 'email',
      receiver_name: 'Pastoral Missionária — Paróquia São Vicente de Paulo',
      instructions: 'Após realizar o Pix, envie o comprovante para a coordenação para registrar a baixa do seu pedido.',
    });
  }
  return res.json(JSON.parse(row.value_json));
});

// PUT /api/settings/pix (Apenas coordenadores e admins autorizados)
settingsRouter.put('/pix', authenticateToken, requireRole(['admin', 'coordenador']), (req: AuthenticatedRequest, res: Response) => {
  const { pix_key, key_type, receiver_name, instructions } = req.body;
  if (!pix_key || !pix_key.trim()) {
    return res.status(400).json({ error: 'A chave Pix é obrigatória.' });
  }

  const now = new Date().toISOString();
  const pixData = {
    pix_key: pix_key.trim(),
    key_type: key_type || 'outro',
    receiver_name: receiver_name?.trim() || 'Pastoral Missionária — Paróquia São Vicente de Paulo',
    instructions: instructions?.trim() || 'Após realizar o Pix, envie o comprovante para a coordenação para registrar a baixa do seu pedido.',
    updated_by: req.user?.name,
    updated_at: now,
  };

  db.prepare(`
    INSERT INTO integration_settings (key, value_json, updated_at)
    VALUES ('pix_payment', ?, ?)
    ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at
  `).run(JSON.stringify(pixData), now);

  // Também sincroniza com institutional para consistência geral
  try {
    const instRow = db.prepare('SELECT value_json FROM integration_settings WHERE key = ?').get('institutional') as any;
    if (instRow) {
      const inst = JSON.parse(instRow.value_json);
      inst.pix_key = pix_key.trim();
      db.prepare('UPDATE integration_settings SET value_json = ?, updated_at = ? WHERE key = ?')
        .run(JSON.stringify(inst), now, 'institutional');
    }
  } catch {}

  return res.json({ message: 'Configurações de Pix salvas com sucesso!', pix: pixData });
});

// GET /api/settings/backup/export
settingsRouter.get('/backup/export', authenticateToken, requireRole(['admin', 'coordenador']), (_req: AuthenticatedRequest, res: Response) => {
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

