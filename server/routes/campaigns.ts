import { Router, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/database.js';
import { authenticateToken, requireRole, AuthenticatedRequest } from './auth.js';
import { googleSheetsService } from '../services/googleSheetsService.js';

export const campaignsRouter = Router();

// GET /api/campaigns
campaignsRouter.get('/', authenticateToken, (_req: AuthenticatedRequest, res: Response) => {
  const campaigns = db.prepare(`
    SELECT
      c.*,
      COUNT(DISTINCT o.id) as orders_count,
      COALESCE(SUM(oi.quantity), 0) as tshirts_count,
      COALESCE(SUM(o.total_amount_cents), 0) as total_amount_cents,
      COALESCE(SUM(o.paid_amount_cents), 0) as paid_amount_cents,
      COALESCE(SUM(o.balance_cents), 0) as balance_cents
    FROM campaigns c
    LEFT JOIN orders o ON o.campaign_id = c.id AND o.status != 'cancelado'
    LEFT JOIN order_items oi ON oi.order_id = o.id
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `).all();
  return res.json(campaigns);
});

// GET /api/campaigns/active
campaignsRouter.get('/active', authenticateToken, (_req: AuthenticatedRequest, res: Response) => {
  const active = db.prepare('SELECT * FROM campaigns WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1').get();
  return res.json(active || null);
});

// POST /api/campaigns
campaignsRouter.post('/', authenticateToken, requireRole(['admin', 'coordenador']), (req: AuthenticatedRequest, res: Response) => {
  const { name, description, start_date, end_date, default_price_cents } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'O nome da campanha é obrigatório.' });
  }

  const campaignId = 'camp_' + crypto.randomBytes(6).toString('hex');
  const now = new Date().toISOString();
  const parsedPrice = default_price_cents !== undefined ? Math.round(Number(default_price_cents)) : 4500;
  if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
    return res.status(400).json({ error: 'O preço padrão da campanha deve ser um valor positivo válido.' });
  }
  const price = parsedPrice;

  db.prepare(`
    INSERT INTO campaigns (id, name, description, start_date, end_date, default_price_cents, status, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'aberta', 0, ?, ?)
  `).run(campaignId, name.trim(), description || '', start_date || null, end_date || null, price, now, now);

  db.prepare(`
    INSERT INTO audit_logs (id, user_id, user_name, action, entity_type, entity_id, details_json, created_at)
    VALUES (?, ?, ?, 'CREATE_CAMPAIGN', 'campaign', ?, ?, ?)
  `).run(
    crypto.randomUUID(),
    req.user?.id,
    req.user?.name || 'Coordenação',
    campaignId,
    JSON.stringify({ name: name.trim(), default_price_cents: price }),
    now
  );

  googleSheetsService.enqueueJob('campaign', campaignId, 'create', { name });

  return res.status(201).json({ id: campaignId, name: name.trim(), default_price_cents: price });
});

// PUT /api/campaigns/:id
campaignsRouter.put('/:id', authenticateToken, requireRole(['admin', 'coordenador']), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name, description, start_date, end_date, default_price_cents, status } = req.body;

  const existing = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id) as any;
  if (!existing) {
    return res.status(404).json({ error: 'Campanha não encontrada.' });
  }

  let nextPriceCents = existing.default_price_cents;
  if (default_price_cents !== undefined && default_price_cents !== null) {
    const parsed = Math.round(Number(default_price_cents));
    if (!Number.isFinite(parsed) || parsed >= 1000000 || parsed <= 0) {
      return res.status(400).json({ error: 'O preço padrão da campanha deve ser maior que zero.' });
    }
    nextPriceCents = parsed;
  }

  const now = new Date().toISOString();
  const nextName = name?.trim() || existing.name;
  const nextStatus = status || existing.status;

  db.prepare(`
    UPDATE campaigns
    SET name = ?, description = ?, start_date = ?, end_date = ?, default_price_cents = ?, status = ?, updated_at = ?
    WHERE id = ?
  `).run(
    nextName,
    description !== undefined ? description : existing.description,
    start_date !== undefined ? start_date : existing.start_date,
    end_date !== undefined ? end_date : existing.end_date,
    nextPriceCents,
    nextStatus,
    now,
    id
  );

  db.prepare(`
    INSERT INTO audit_logs (id, user_id, user_name, action, entity_type, entity_id, details_json, created_at)
    VALUES (?, ?, ?, 'UPDATE_CAMPAIGN', 'campaign', ?, ?, ?)
  `).run(
    crypto.randomUUID(),
    req.user?.id,
    req.user?.name || 'Coordenação',
    id,
    JSON.stringify({
      name: nextName,
      previous_price_cents: existing.default_price_cents,
      new_price_cents: nextPriceCents,
      status: nextStatus,
    }),
    now
  );

  googleSheetsService.enqueueJob('campaign', id, 'update', { name: nextName });

  const updated = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id);
  return res.json({ message: 'Campanha atualizada com sucesso.', campaign: updated });
});

// POST /api/campaigns/:id/activate
campaignsRouter.post('/:id/activate', authenticateToken, requireRole(['admin', 'coordenador']), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  db.transaction(() => {
    db.prepare('UPDATE campaigns SET is_active = 0').run();
    db.prepare('UPDATE campaigns SET is_active = 1 WHERE id = ?').run(id);
  })();

  return res.json({ message: 'Campanha definida como ativa com sucesso.' });
});

