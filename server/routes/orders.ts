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
      COALESCE(pm.id, o.pastoral_member_id) as pastoral_member_id,
      COALESCE(pm.name, m.name) as member_name,
      COALESCE(pm.display_name, m.display_name) as member_display_name,
      COALESCE(NULLIF(pm.phone, ''), m.phone) as member_phone,
      COALESCE(o.historical_buyer_name, m.name) as historical_buyer_name,
      pm.pastoral_role as member_pastoral_role,
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
    LEFT JOIN pastoral_members pm ON pm.id = o.pastoral_member_id OR pm.buyer_member_id = o.member_id
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
    query += ' AND (COALESCE(pm.name, m.name) LIKE ? OR COALESCE(pm.display_name, m.display_name) LIKE ? OR COALESCE(pm.phone, m.phone) LIKE ? OR m.name LIKE ? OR o.notes LIKE ?)';
    const term = `%${search.trim()}%`;
    params.push(term, term, term, term, term);
  }

  query += ' GROUP BY o.id ORDER BY COALESCE(pm.name, m.name) ASC';

  const rows = db.prepare(query).all(...params) as any[];

  const orders = rows.map(r => ({
    ...r,
    items: JSON.parse(r.items_json || '[]').filter((i: any) => i.id !== null),
  }));

  return res.json(orders);
});

// GET /api/orders/my-orders (Retorna exclusivamente o(s) pedido(s) do usuário autenticado via vínculo confirmado)
ordersRouter.get('/my-orders', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;

  const pm = db.prepare('SELECT id, buyer_member_id FROM pastoral_members WHERE user_id = ?').get(userId) as any;
  if (!pm) {
    return res.json([]);
  }

  const rawOrders = db.prepare(`
    SELECT
      o.*,
      COALESCE(pm.id, o.pastoral_member_id) as pastoral_member_id,
      COALESCE(pm.name, m.name) as member_name,
      COALESCE(pm.display_name, m.display_name) as member_display_name,
      COALESCE(NULLIF(pm.phone, ''), m.phone) as member_phone,
      COALESCE(o.historical_buyer_name, m.name) as historical_buyer_name,
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
    LEFT JOIN pastoral_members pm ON pm.id = o.pastoral_member_id OR pm.buyer_member_id = o.member_id
    JOIN campaigns c ON c.id = o.campaign_id
    LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE o.pastoral_member_id = ?
       OR (? IS NOT NULL AND o.member_id = ?)
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `).all(pm.id, pm.buyer_member_id || null, pm.buyer_member_id || null) as any[];

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
    SELECT
      o.*,
      COALESCE(pm.id, o.pastoral_member_id) as pastoral_member_id,
      COALESCE(pm.name, m.name) as member_name,
      COALESCE(pm.display_name, m.display_name) as member_display_name,
      COALESCE(NULLIF(pm.phone, ''), m.phone) as member_phone,
      COALESCE(o.historical_buyer_name, m.name) as historical_buyer_name,
      pm.pastoral_role as member_pastoral_role,
      c.name as campaign_name
    FROM orders o
    JOIN members m ON m.id = o.member_id
    LEFT JOIN pastoral_members pm ON pm.id = o.pastoral_member_id OR pm.buyer_member_id = o.member_id
    JOIN campaigns c ON c.id = o.campaign_id
    WHERE o.id = ?
  `).get(id) as any;

  if (!order) {
    return res.status(404).json({ error: 'Pedido não encontrado.' });
  }

  // Security check: if not coordinator, user can only access their own linked order
  if (!isCoord) {
    const linkedMember = db.prepare(`
      SELECT id, buyer_member_id FROM pastoral_members WHERE user_id = ?
    `).get(req.user?.id) as any;

    const isOwner =
      linkedMember &&
      ((order.pastoral_member_id && linkedMember.id === order.pastoral_member_id) ||
        (linkedMember.buyer_member_id && linkedMember.buyer_member_id === order.member_id));

    if (!isOwner) {
      return res.status(403).json({ error: 'Você não tem permissão para visualizar o pedido de outro membro.' });
    }
  }

  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id);
  const payments = db.prepare('SELECT * FROM payments WHERE order_id = ? ORDER BY payment_date DESC').all(id);
  const rawAudit = db.prepare(`
    SELECT id, user_id, user_name, action, details_json, created_at
    FROM audit_logs
    WHERE entity_type = 'order' AND entity_id = ?
    ORDER BY created_at DESC
  `).all(id) as any[];

  const audit_history = rawAudit.map(a => {
    let details = {};
    try {
      details = JSON.parse(a.details_json || '{}');
    } catch {
      details = {};
    }
    return {
      id: a.id,
      user_id: a.user_id,
      user_name: a.user_name,
      action: a.action,
      details,
      created_at: a.created_at,
    };
  });

  return res.json({
    ...order,
    items,
    payments,
    audit_history,
  });
});

const VALID_PRODUCTION_STATUSES = [
  'aguardando_confirmacao',
  'confirmado',
  'encomendado',
  'em_producao',
  'recebido',
  'entregue',
  'cancelado',
];

// POST /api/orders
ordersRouter.post('/', authenticateToken, requireRole(['admin', 'coordenador']), (req: AuthenticatedRequest, res: Response) => {
  const {
    campaign_id,
    pastoral_member_id,
    member_id,
    items,
    notes,
    production_status,
    initial_payment,
  } = req.body;

  const targetIdentifier = pastoral_member_id || member_id;
  if (!campaign_id || !targetIdentifier) {
    return res.status(400).json({ error: 'Campanha e Missionário são obrigatórios.' });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'O pedido precisa ter ao menos uma camiseta informada.' });
  }

  const campaignRow = db.prepare('SELECT id, name, default_price_cents FROM campaigns WHERE id = ?').get(campaign_id) as any;
  const campaignDefaultPriceCents = campaignRow?.default_price_cents ? Number(campaignRow.default_price_cents) : 4500;

  for (const it of items) {
    if (it.unit_price_cents !== undefined && it.unit_price_cents !== null && it.unit_price_cents !== '') {
      const parsedUnit = Math.round(Number(it.unit_price_cents));
      if (!Number.isFinite(parsedUnit) || parsedUnit <= 0) {
        return res.status(400).json({ error: 'O preço unitário da camiseta deve ser maior que zero.' });
      }
    }
    if (it.quantity !== undefined && (Number(it.quantity) <= 0 || !Number.isFinite(Number(it.quantity)))) {
      return res.status(400).json({ error: 'A quantidade de camisetas deve ser maior que zero.' });
    }
  }

  const orderId = 'ord_' + crypto.randomBytes(6).toString('hex');
  const now = new Date().toISOString();
  const initialProdStatus = VALID_PRODUCTION_STATUSES.includes(production_status)
    ? production_status
    : 'aguardando_confirmacao';

  let totalAmountCents = 0;
  let resolvedMemberId = '';
  let resolvedPastoralMemberId: string | null = null;
  let resolvedBuyerName = '';

  const transaction = db.transaction(() => {
    // 1. Resolve institutional missionary (pastoral_members) and linked buyer (members)
    let pm = db.prepare('SELECT * FROM pastoral_members WHERE id = ?').get(targetIdentifier) as any;
    if (!pm && member_id) {
      pm = db.prepare('SELECT * FROM pastoral_members WHERE buyer_member_id = ?').get(member_id) as any;
    }

    if (pm) {
      resolvedPastoralMemberId = pm.id;
      resolvedBuyerName = pm.name;

      if (pm.buyer_member_id) {
        const existingBuyer = db.prepare('SELECT * FROM members WHERE id = ?').get(pm.buyer_member_id) as any;
        if (existingBuyer) {
          resolvedMemberId = existingBuyer.id;
          // Sync buyer details from institutional missionary
          db.prepare(`
            UPDATE members
            SET name = ?, display_name = ?, phone = COALESCE(NULLIF(?, ''), phone), active = 1, updated_at = ?
            WHERE id = ?
          `).run(pm.name, pm.display_name || pm.name.split(' ')[0], pm.phone || '', now, resolvedMemberId);
        }
      }

      if (!resolvedMemberId) {
        resolvedMemberId = 'mem_' + crypto.randomBytes(6).toString('hex');
        db.prepare(`
          INSERT INTO members (id, name, display_name, phone, notes, active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, 1, ?, ?)
        `).run(
          resolvedMemberId,
          pm.name,
          pm.display_name || pm.name.split(' ')[0],
          pm.phone || '',
          'Vinculado automaticamente ao cadastro institucional da Governança',
          now,
          now
        );
        db.prepare('UPDATE pastoral_members SET buyer_member_id = ?, updated_at = ? WHERE id = ?')
          .run(resolvedMemberId, now, pm.id);
      }
    } else {
      const legacyBuyer = db.prepare('SELECT * FROM members WHERE id = ?').get(targetIdentifier) as any;
      if (!legacyBuyer) {
        throw new Error('MISSIONARY_NOT_FOUND');
      }
      resolvedMemberId = legacyBuyer.id;
      resolvedBuyerName = legacyBuyer.name;
    }

    // 2. Calculate items total using campaign default_price_cents or authorized custom unit_price_cents
    const customPriceDiffs: Array<{ model: string; size: string; default_price_cents: number; custom_unit_price_cents: number }> = [];
    for (const it of items) {
      const qty = Math.max(1, parseInt(it.quantity) || 1);
      const hasCustomPrice = it.unit_price_cents !== undefined && it.unit_price_cents !== null && it.unit_price_cents !== '';
      const unit = hasCustomPrice ? Math.round(Number(it.unit_price_cents)) : campaignDefaultPriceCents;
      if (unit !== campaignDefaultPriceCents) {
        customPriceDiffs.push({
          model: it.model || 'Tradicional',
          size: it.size || 'M',
          default_price_cents: campaignDefaultPriceCents,
          custom_unit_price_cents: unit,
        });
      }
      totalAmountCents += (qty * unit);
    }

    // 3. Handle optional initial payment
    let paidAmountCents = 0;
    let balanceCents = totalAmountCents;
    let paymentStatus = 'pendente';

    if (initial_payment && Number(initial_payment.amount_cents) > 0) {
      const initCents = Math.min(totalAmountCents, Math.round(Number(initial_payment.amount_cents)));
      if (initCents > 0) {
        paidAmountCents = initCents;
        balanceCents = totalAmountCents - paidAmountCents;
        paymentStatus = balanceCents <= 0 ? 'pago' : 'parcial';
      }
    }

    // 4. Insert order
    db.prepare(`
      INSERT INTO orders (
        id, campaign_id, member_id, pastoral_member_id, historical_buyer_name,
        status, total_amount_cents, paid_amount_cents,
        balance_cents, payment_status, production_status, delivery_status, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'nao_entregue', ?, ?, ?)
    `).run(
      orderId,
      campaign_id,
      resolvedMemberId,
      resolvedPastoralMemberId,
      resolvedBuyerName,
      initialProdStatus,
      totalAmountCents,
      paidAmountCents,
      balanceCents,
      paymentStatus,
      initialProdStatus,
      notes?.trim() || '',
      now,
      now
    );

    // 5. Insert items
    const insertItem = db.prepare(`
      INSERT INTO order_items (id, order_id, product_name, model, size, quantity, unit_price_cents, total_price_cents, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const it of items) {
      const itemId = 'itm_' + crypto.randomBytes(6).toString('hex');
      const qty = Math.max(1, parseInt(it.quantity) || 1);
      const hasCustomPrice = it.unit_price_cents !== undefined && it.unit_price_cents !== null && it.unit_price_cents !== '';
      const unit = hasCustomPrice ? Math.round(Number(it.unit_price_cents)) : campaignDefaultPriceCents;
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

    if (customPriceDiffs.length > 0) {
      db.prepare(`
        INSERT INTO audit_logs (id, user_id, user_name, action, entity_type, entity_id, details_json, created_at)
        VALUES (?, ?, ?, 'ORDER_CUSTOM_PRICE_APPLIED', 'order', ?, ?, ?)
      `).run(
        'aud_price_' + crypto.randomBytes(6).toString('hex'),
        req.user?.id || null,
        req.user?.name || 'Coordenação',
        orderId,
        JSON.stringify({
          campaign_id,
          campaign_default_price_cents: campaignDefaultPriceCents,
          custom_items: customPriceDiffs,
        }),
        now
      );
    }

    // 6. Insert initial payment record if applicable
    if (paidAmountCents > 0 && initial_payment) {
      const paymentId = 'pay_' + crypto.randomBytes(6).toString('hex');
      const paymentDate = initial_payment.payment_date || now.split('T')[0];
      const validMethod = ['pix', 'dinheiro', 'transferencia', 'outro'].includes(initial_payment.payment_method)
        ? initial_payment.payment_method
        : 'pix';
      const recordedBy = req.user?.name || 'Coordenação';

      db.prepare(`
        INSERT INTO payments (
          id, order_id, member_id, amount_cents, payment_date, payment_method, recorded_by, notes, is_reversed, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
      `).run(
        paymentId,
        orderId,
        resolvedMemberId,
        paidAmountCents,
        paymentDate,
        validMethod,
        recordedBy,
        initial_payment.notes?.trim() || 'Pagamento registrado no ato da encomenda',
        now,
        now
      );
    }

    // 7. Audit
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, user_name, action, entity_type, entity_id, details_json, created_at)
      VALUES (?, ?, ?, 'CREATE_ORDER', 'order', ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      req.user?.id,
      req.user?.name,
      orderId,
      JSON.stringify({
        campaign_id,
        pastoral_member_id: resolvedPastoralMemberId,
        member_id: resolvedMemberId,
        member_name: resolvedBuyerName,
        totalAmountCents,
        paidAmountCents,
        paymentStatus,
        production_status: initialProdStatus,
        itemsCount: items.length,
      }),
      now
    );
  });

  try {
    transaction();
  } catch (err: any) {
    if (err?.message === 'MISSIONARY_NOT_FOUND') {
      return res.status(404).json({ error: 'Missionário selecionado não encontrado na Governança.' });
    }
    throw err;
  }

  googleSheetsService.enqueueJob('order', orderId, 'create');

  return res.status(201).json({
    id: orderId,
    pastoral_member_id: resolvedPastoralMemberId,
    member_id: resolvedMemberId,
    message: 'Pedido criado com sucesso!',
  });
});

// PUT /api/orders/:id
ordersRouter.put('/:id', authenticateToken, requireRole(['admin', 'coordenador']), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { items, notes, production_status, delivery_status, delivery_date, delivered_to, delivery_notes } = req.body;

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as any;
  if (!order) {
    return res.status(404).json({ error: 'Pedido não encontrado.' });
  }

  if (production_status && !VALID_PRODUCTION_STATUSES.includes(production_status)) {
    return res.status(400).json({ error: 'Etapa de produção inválida.' });
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

    const nextProdStatus = production_status || order.production_status;
    const nextDelivStatus = delivery_status || order.delivery_status;

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

    // Audit with explicit stage transition tracking
    const actionLabel =
      production_status && production_status !== order.production_status
        ? 'UPDATE_PRODUCTION_STATUS'
        : delivery_status && delivery_status !== order.delivery_status
        ? 'UPDATE_DELIVERY_STATUS'
        : 'UPDATE_ORDER';

    db.prepare(`
      INSERT INTO audit_logs (id, user_id, user_name, action, entity_type, entity_id, details_json, created_at)
      VALUES (?, ?, ?, ?, 'order', ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      req.user?.id,
      req.user?.name,
      actionLabel,
      id,
      JSON.stringify({
        totalAmountCents,
        paymentStatus,
        previous_stage: order.production_status,
        new_stage: nextProdStatus,
        production_status: nextProdStatus,
        previous_delivery_status: order.delivery_status,
        new_delivery_status: nextDelivStatus,
        delivery_status: nextDelivStatus,
        delivered_to: delivered_to || order.delivered_to,
      }),
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

  if (production_status && !VALID_PRODUCTION_STATUSES.includes(production_status)) {
    return res.status(400).json({ error: 'Etapa de produção inválida.' });
  }

  const now = new Date().toISOString();

  const transaction = db.transaction(() => {
    const insertAudit = db.prepare(`
      INSERT INTO audit_logs (id, user_id, user_name, action, entity_type, entity_id, details_json, created_at)
      VALUES (?, ?, ?, ?, 'order', ?, ?, ?)
    `);

    for (const orderId of order_ids) {
      const existing = db.prepare('SELECT production_status, delivery_status FROM orders WHERE id = ?').get(orderId) as any;
      if (!existing) continue;

      if (production_status) {
        db.prepare('UPDATE orders SET production_status = ?, updated_at = ? WHERE id = ?')
          .run(production_status, now, orderId);

        insertAudit.run(
          crypto.randomUUID(),
          req.user?.id,
          req.user?.name,
          'UPDATE_PRODUCTION_STATUS',
          orderId,
          JSON.stringify({
            previous_stage: existing.production_status,
            new_stage: production_status,
            production_status,
            bulk: true,
          }),
          now
        );
      }
      if (delivery_status) {
        db.prepare('UPDATE orders SET delivery_status = ?, delivery_date = ?, updated_at = ? WHERE id = ?')
          .run(delivery_status, delivery_status === 'entregue' ? now.split('T')[0] : null, now, orderId);

        insertAudit.run(
          crypto.randomUUID(),
          req.user?.id,
          req.user?.name,
          'UPDATE_DELIVERY_STATUS',
          orderId,
          JSON.stringify({
            previous_delivery_status: existing.delivery_status,
            new_delivery_status: delivery_status,
            delivery_status,
            bulk: true,
          }),
          now
        );
      }
      googleSheetsService.enqueueJob('order', orderId, 'update');
    }
  });

  transaction();

  return res.json({ message: `${order_ids.length} pedidos atualizados com sucesso.` });
});

// POST /api/orders/:id/cancel
ordersRouter.post('/:id/cancel', authenticateToken, requireRole(['admin', 'coordenador']), (req: AuthenticatedRequest, res: Response) => {
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

