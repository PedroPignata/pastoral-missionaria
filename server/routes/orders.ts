import { Router, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/database.js';
import { authenticateToken, requireRole, AuthenticatedRequest } from './auth.js';
import { googleSheetsService } from '../services/googleSheetsService.js';

export const ordersRouter = Router();

// GET /api/orders
ordersRouter.get('/', authenticateToken, requireRole(['admin', 'coordenador']), (req: AuthenticatedRequest, res: Response) => {
  const { campaign_id, payment_status, production_status, delivery_status, model, size, search } = req.query;

  let query = `
    SELECT
      o.*,
      m.name as member_name,
      m.display_name as member_display_name,
      m.phone as member_phone,
      c.name as campaign_name,
      json_group_array(json_object(
        'id', oi.id,
        'model', oi.model,
        'size', oi.size,
        'quantity', oi.quantity,
        'unit_price_cents', oi.unit_price_cents,
        'total_price_cents', oi.total_price_cents
      )) as items_json
    FROM orders o
    JOIN members m ON m.id = o.member_id
    JOIN campaigns c ON c.id = o.campaign_id
    LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (campaign_id) {
    query += ' AND o.campaign_id = ?';
    params.push(campaign_id);
  }

  if (payment_status) {
    query += ' AND o.payment_status = ?';
    params.push(payment_status);
  }

  if (production_status) {
    query += ' AND o.production_status = ?';
    params.push(production_status);
  }

  if (delivery_status) {
    query += ' AND o.delivery_status = ?';
    params.push(delivery_status);
  }

  if (model) {
    query += ' AND oi.model = ?';
    params.push(model);
  }

  if (size) {
    query += ' AND oi.size = ?';
    params.push(size);
  }

  if (search && typeof search === 'string' && search.trim().length > 0) {
    query += ' AND (m.name LIKE ? OR m.phone LIKE ? OR o.notes LIKE ?)';
    const term = `%${search.trim()}%`;
    params.push(term, term, term);
  }

  query += ' GROUP BY o.id ORDER BY m.name ASC';

  const rows = db.prepare(query).all(...params) as any[];

  const orders = rows.map(r => ({
    ...r,
    items: JSON.parse(r.items_json || '[]'),
  }));

  return res.json(orders);
});

// GET /api/orders/my-orders (Retorna exclusivamente o(s) pedido(s) do usuário autenticado)
ordersRouter.get('/my-orders', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const userName = req.user!.name;

  let memberId: string | null = null;
  const pm = db.prepare('SELECT buyer_member_id FROM pastoral_members WHERE user_id = ?').get(userId) as any;
  if (pm?.buyer_member_id) {
    memberId = pm.buyer_member_id;
  } else {
    const mem = db.prepare('SELECT id FROM members WHERE name = ? COLLATE NOCASE OR display_name = ? COLLATE NOCASE').get(userName, userName) as any;
    if (mem) {
      memberId = mem.id;
    }
  }

  if (!memberId) {
    return res.json([]);
  }

  const rawOrders = db.prepare(`
    SELECT
      o.*,
      m.name as member_name,
      m.display_name as member_display_name,
      m.phone as member_phone,
      c.name as campaign_name,
      json_group_array(json_object(
        'id', oi.id,
        'model', oi.model,
        'size', oi.size,
        'quantity', oi.quantity,
        'unit_price_cents', oi.unit_price_cents,
        'total_price_cents', oi.total_price_cents
      )) as items_json
    FROM orders o
    JOIN members m ON m.id = o.member_id
    JOIN campaigns c ON c.id = o.campaign_id
    LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE o.member_id = ?
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `).all(memberId) as any[];

  const orders = rawOrders.map((o) => ({
    ...o,
    items: JSON.parse(o.items_json || '[]').filter((i: any) => i.id !== null),
  }));

  return res.json(orders);
});

// GET /api/orders/:id
ordersRouter.get('/:id', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const isCoord = req.user?.role === 'admin' || req.user?.role === 'coordenador';

  const order = db.prepare(`
    SELECT o.*, m.name as member_name, m.phone as member_phone, c.name as campaign_name
    FROM orders o
    JOIN members m ON m.id = o.member_id
    JOIN campaigns c ON c.id = o.campaign_id
    WHERE o.id = ?
  `).get(id) as any;

  if (!order) {
    return res.status(404).json({ error: 'Pedido não encontrado.' });
  }

  // Security check: if not coordinator, user can only access their own linked order
  if (!isCoord) {
    const linkedMember = db.prepare(`
      SELECT buyer_member_id FROM pastoral_members WHERE user_id = ?
    `).get(req.user?.id) as any;

    if (!linkedMember || linkedMember.buyer_member_id !== order.member_id) {
      return res.status(403).json({ error: 'Você não tem permissão para visualizar o pedido de outro membro.' });
    }
  }

  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id);
  const payments = db.prepare('SELECT * FROM payments WHERE order_id = ? ORDER BY payment_date DESC').all(id);

  return res.json({
    ...order,
    items,
    payments,
  });
});

// POST /api/orders
ordersRouter.post('/', authenticateToken, requireRole(['admin', 'coordenador']), (req: AuthenticatedRequest, res: Response) => {
  const { campaign_id, member_id, items, notes } = req.body;

  if (!campaign_id || !member_id) {
    return res.status(400).json({ error: 'Campanha e Membro são obrigatórios.' });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'O pedido precisa ter ao menos uma camiseta informada.' });
  }

  const orderId = 'ord_' + crypto.randomBytes(6).toString('hex');
  const now = new Date().toISOString();

  let totalAmountCents = 0;

  const transaction = db.transaction(() => {
    // 1. Calculate items total
    for (const it of items) {
      const qty = parseInt(it.quantity) || 1;
      const unit = parseInt(it.unit_price_cents) || 4500;
      totalAmountCents += (qty * unit);
    }

    // 2. Insert order
    db.prepare(`
      INSERT INTO orders (
        id, campaign_id, member_id, status, total_amount_cents, paid_amount_cents,
        balance_cents, payment_status, production_status, delivery_status, notes, created_at, updated_at
      ) VALUES (?, ?, ?, 'aguardando_confirmacao', ?, 0, ?, 'pendente', 'aguardando_confirmacao', 'nao_entregue', ?, ?, ?)
    `).run(
      orderId,
      campaign_id,
      member_id,
      totalAmountCents,
      totalAmountCents,
      notes?.trim() || '',
      now,
      now
    );

    // 3. Insert items
    const insertItem = db.prepare(`
      INSERT INTO order_items (id, order_id, product_name, model, size, quantity, unit_price_cents, total_price_cents, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const it of items) {
      const itemId = 'itm_' + crypto.randomBytes(6).toString('hex');
      const qty = parseInt(it.quantity) || 1;
      const unit = parseInt(it.unit_price_cents) || 4500;
      insertItem.run(
        itemId,
        orderId,
        'Camiseta Oficial Pastoral Missionária',
        it.model || 'Tradicional',
        it.size || 'M',
        qty,
        unit,
        qty * unit,
        now
      );
    }

    // 4. Audit
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, user_name, action, entity_type, entity_id, details_json, created_at)
      VALUES (?, ?, ?, 'CREATE_ORDER', 'order', ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      req.user?.id,
      req.user?.name,
      orderId,
      JSON.stringify({ campaign_id, member_id, totalAmountCents, itemsCount: items.length }),
      now
    );
  });

  transaction();

  googleSheetsService.enqueueJob('order', orderId, 'create');

  return res.status(201).json({ id: orderId, message: 'Pedido criado com sucesso!' });
});

// PUT /api/orders/:id
ordersRouter.put('/:id', authenticateToken, requireRole(['admin', 'coordenador']), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { items, notes, production_status, delivery_status, delivery_date, delivered_to, delivery_notes } = req.body;

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as any;
  if (!order) {
    return res.status(404).json({ error: 'Pedido não encontrado.' });
  }

  const now = new Date().toISOString();

  const transaction = db.transaction(() => {
    let totalAmountCents = order.total_amount_cents;

    // If items provided, replace items and recalculate
    if (items && Array.isArray(items) && items.length > 0) {
      db.prepare('DELETE FROM order_items WHERE order_id = ?').run(id);

      totalAmountCents = 0;
      const insertItem = db.prepare(`
        INSERT INTO order_items (id, order_id, product_name, model, size, quantity, unit_price_cents, total_price_cents, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const it of items) {
        const itemId = 'itm_' + crypto.randomBytes(6).toString('hex');
        const qty = parseInt(it.quantity) || 1;
        const unit = parseInt(it.unit_price_cents) || 4500;
        totalAmountCents += (qty * unit);

        insertItem.run(
          itemId,
          id,
          'Camiseta Oficial Pastoral Missionária',
          it.model || 'Tradicional',
          it.size || 'M',
          qty,
          unit,
          qty * unit,
          now
        );
      }
    }

    // Recalculate balance and payment status
    const balanceCents = totalAmountCents - order.paid_amount_cents;
    let paymentStatus = 'pendente';
    if (order.paid_amount_cents > 0) {
      paymentStatus = balanceCents <= 0 ? 'pago' : 'parcial';
    }

    db.prepare(`
      UPDATE orders
      SET total_amount_cents = ?,
          balance_cents = ?,
          payment_status = ?,
          notes = COALESCE(?, notes),
          production_status = COALESCE(?, production_status),
          delivery_status = COALESCE(?, delivery_status),
          delivery_date = COALESCE(?, delivery_date),
          delivered_to = COALESCE(?, delivered_to),
          delivery_notes = COALESCE(?, delivery_notes),
          updated_at = ?
      WHERE id = ?
    `).run(
      totalAmountCents,
      balanceCents,
      paymentStatus,
      notes,
      production_status,
      delivery_status,
      delivery_date,
      delivered_to,
      delivery_notes,
      now,
      id
    );

    // Audit
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, user_name, action, entity_type, entity_id, details_json, created_at)
      VALUES (?, ?, ?, 'UPDATE_ORDER', 'order', ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      req.user?.id,
      req.user?.name,
      id,
      JSON.stringify({ totalAmountCents, paymentStatus, production_status, delivery_status }),
      now
    );
  });

  transaction();

  googleSheetsService.enqueueJob('order', id, 'update');

  return res.json({ message: 'Pedido atualizado com sucesso.' });
});

// POST /api/orders/bulk-status (Bulk update status)
ordersRouter.post('/bulk-status', authenticateToken, requireRole(['admin', 'coordenador']), (req: AuthenticatedRequest, res: Response) => {
  const { order_ids, production_status, delivery_status } = req.body;

  if (!order_ids || !Array.isArray(order_ids) || order_ids.length === 0) {
    return res.status(400).json({ error: 'Nenhum pedido selecionado.' });
  }

  const now = new Date().toISOString();

  const transaction = db.transaction(() => {
    for (const orderId of order_ids) {
      if (production_status) {
        db.prepare('UPDATE orders SET production_status = ?, updated_at = ? WHERE id = ?')
          .run(production_status, now, orderId);
      }
      if (delivery_status) {
        db.prepare('UPDATE orders SET delivery_status = ?, delivery_date = ?, updated_at = ? WHERE id = ?')
          .run(delivery_status, delivery_status === 'entregue' ? now.split('T')[0] : null, now, orderId);
      }
      googleSheetsService.enqueueJob('order', orderId, 'update');
    }
  });

  transaction();

  return res.json({ message: `${order_ids.length} pedidos atualizados com sucesso.` });
});

// POST /api/orders/:id/cancel
ordersRouter.post('/:id/cancel', authenticateToken, requireRole(['admin']), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as any;
  if (!order) {
    return res.status(404).json({ error: 'Pedido não encontrado.' });
  }

  if (order.paid_amount_cents > 0) {
    return res.status(400).json({
      error: `Não é possível cancelar diretamente um pedido com pagamentos realizados (R$ ${(order.paid_amount_cents / 100).toFixed(2)} recebido). Realize o estorno do pagamento no módulo Financeiro antes de cancelar.`
    });
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE orders
    SET status = 'cancelado', production_status = 'cancelado', notes = notes || ' [Cancelado: ' || ? || ']', updated_at = ?
    WHERE id = ?
  `).run(reason?.trim() || 'Cancelamento solicitado', now, id);

  googleSheetsService.enqueueJob('order', id, 'update');

  return res.json({ message: 'Pedido cancelado com sucesso.' });
});

