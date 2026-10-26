import { Router, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/database.js';
import { authenticateToken, requireRole, AuthenticatedRequest } from './auth.js';
import { googleSheetsService } from '../services/googleSheetsService.js';

export const membersRouter = Router();

// GET /api/members
membersRouter.get('/', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { search, active } = req.query;

  let query = `
    SELECT
      m.*,
      COUNT(DISTINCT o.id) as orders_count,
      COALESCE(SUM(CASE WHEN o.status != 'cancelado' THEN o.total_amount_cents ELSE 0 END), 0) as total_spent_cents,
      COALESCE(SUM(CASE WHEN o.status != 'cancelado' THEN o.balance_cents ELSE 0 END), 0) as total_pending_cents
    FROM members m
    LEFT JOIN orders o ON o.member_id = m.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (active !== undefined && active !== '') {
    query += ' AND m.active = ?';
    params.push(active === 'true' || active === '1' ? 1 : 0);
  }

  if (search && typeof search === 'string' && search.trim().length > 0) {
    query += ' AND (m.name LIKE ? OR m.phone LIKE ? OR m.display_name LIKE ?)';
    const term = `%${search.trim()}%`;
    params.push(term, term, term);
  }

  query += ' GROUP BY m.id ORDER BY m.name ASC';

  const members = db.prepare(query).all(...params);
  return res.json(members);
});

// GET /api/members/:id
membersRouter.get('/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(id) as any;

  if (!member) {
    return res.status(404).json({ error: 'Membro não encontrado.' });
  }

  const orders = db.prepare(`
    SELECT o.*, c.name as campaign_name,
           json_group_array(json_object(
             'id', oi.id,
             'model', oi.model,
             'size', oi.size,
             'quantity', oi.quantity,
             'unit_price_cents', oi.unit_price_cents,
             'total_price_cents', oi.total_price_cents
           )) as items_json
    FROM orders o
    JOIN campaigns c ON c.id = o.campaign_id
    LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE o.member_id = ?
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `).all(id) as any[];

  const parsedOrders = orders.map(o => ({
    ...o,
    items: JSON.parse(o.items_json || '[]'),
  }));

  const payments = db.prepare(`
    SELECT p.*, o.id as order_id
    FROM payments p
    JOIN orders o ON o.id = p.order_id
    WHERE p.member_id = ?
    ORDER BY p.payment_date DESC
  `).all(id);

  return res.json({
    ...member,
    orders: parsedOrders,
    payments,
  });
});

// POST /api/members
membersRouter.post('/', authenticateToken, requireRole(['admin', 'coordenador']), (req: AuthenticatedRequest, res: Response) => {
  const { name, display_name, phone, notes } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'O nome do membro é obrigatório.' });
  }

  // Check for potential duplicate names to inform coordinator
  const similar = db.prepare('SELECT id, name FROM members WHERE name LIKE ?').all(`%${name.trim()}%`) as any[];

  const memberId = 'mem_' + crypto.randomBytes(6).toString('hex');
  const displayName = display_name?.trim() || name.trim().split(' ')[0];
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO members (id, name, display_name, phone, notes, active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?)
  `).run(memberId, name.trim(), displayName, phone?.trim() || '', notes?.trim() || '', now, now);

  // Audit log
  db.prepare(`
    INSERT INTO audit_logs (id, user_id, user_name, action, entity_type, entity_id, details_json, created_at)
    VALUES (?, ?, ?, 'CREATE_MEMBER', 'member', ?, ?, ?)
  `).run(
    crypto.randomUUID(),
    req.user?.id,
    req.user?.name,
    memberId,
    JSON.stringify({ name: name.trim(), phone }),
    now
  );

  googleSheetsService.enqueueJob('member', memberId, 'create', { name: name.trim() });

  return res.status(201).json({
    id: memberId,
    name: name.trim(),
    display_name: displayName,
    phone: phone?.trim() || '',
    notes: notes?.trim() || '',
    active: 1,
    created_at: now,
    warnings: similar.length > 0 ? `Atenção: Já existem membros com nome similar: ${similar.map(s => s.name).join(', ')}` : undefined,
  });
});

// PUT /api/members/:id
membersRouter.put('/:id', authenticateToken, requireRole(['admin', 'coordenador']), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name, display_name, phone, notes, active } = req.body;

  const existing = db.prepare('SELECT * FROM members WHERE id = ?').get(id) as any;
  if (!existing) {
    return res.status(404).json({ error: 'Membro não encontrado.' });
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE members
    SET name = ?, display_name = ?, phone = ?, notes = ?, active = ?, updated_at = ?
    WHERE id = ?
  `).run(
    name?.trim() || existing.name,
    display_name?.trim() || existing.display_name,
    phone !== undefined ? phone.trim() : existing.phone,
    notes !== undefined ? notes.trim() : existing.notes,
    active !== undefined ? (active ? 1 : 0) : existing.active,
    now,
    id
  );

  googleSheetsService.enqueueJob('member', id, 'update', { name });

  return res.json({ message: 'Membro atualizado com sucesso.' });
});

// DELETE /api/members/:id (Soft-deactivate)
membersRouter.delete('/:id', authenticateToken, requireRole(['admin']), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const existing = db.prepare('SELECT * FROM members WHERE id = ?').get(id) as any;
  if (!existing) {
    return res.status(404).json({ error: 'Membro não encontrado.' });
  }

  // Soft-deactivate to preserve historical records
  const now = new Date().toISOString();
  db.prepare('UPDATE members SET active = 0, updated_at = ? WHERE id = ?').run(now, id);

  googleSheetsService.enqueueJob('member', id, 'update', { active: 0 });

  return res.json({ message: 'Membro desativado com sucesso (histórico preservado).' });
});

