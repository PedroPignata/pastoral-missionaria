import { Router, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/database.js';
import { authenticateToken, requireRole, AuthenticatedRequest } from './auth.js';
import { googleSheetsService } from '../services/googleSheetsService.js';

export const deliveriesRouter = Router();

// POST /api/deliveries/:order_id
deliveriesRouter.post('/:order_id', authenticateToken, requireRole(['admin', 'coordenador']), (req: AuthenticatedRequest, res: Response) => {
  const { order_id } = req.params;
  const { delivered_to, delivery_date, delivery_notes, production_status } = req.body;

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(order_id) as any;
  if (!order) {
    return res.status(404).json({ error: 'Pedido não encontrado.' });
  }

  const now = new Date().toISOString();
  const delivDate = delivery_date || now.split('T')[0];

  db.prepare(`
    UPDATE orders
    SET delivery_status = 'entregue',
        delivery_date = ?,
        delivered_to = ?,
        delivery_notes = ?,
        production_status = COALESCE(?, 'entregue'),
        updated_at = ?
    WHERE id = ?
  `).run(
    delivDate,
    delivered_to?.trim() || null,
    delivery_notes?.trim() || null,
    production_status || 'entregue',
    now,
    order_id
  );

  // Audit
  db.prepare(`
    INSERT INTO audit_logs (id, user_id, user_name, action, entity_type, entity_id, details_json, created_at)
    VALUES (?, ?, ?, 'RECORD_DELIVERY', 'order', ?, ?, ?)
  `).run(
    crypto.randomUUID(),
    req.user?.id,
    req.user?.name,
    order_id,
    JSON.stringify({ delivered_to, delivDate, delivery_notes }),
    now
  );

  googleSheetsService.enqueueJob('order', order_id, 'update');

  return res.json({ message: 'Entrega registrada com sucesso!' });
});

// GET /api/deliveries/alerts
deliveriesRouter.get('/alerts', authenticateToken, (_req: AuthenticatedRequest, res: Response) => {
  // Alert 1: Paid and not delivered
  const paidNotDelivered = db.prepare(`
    SELECT o.id, m.name as member_name, m.phone, o.total_amount_cents
    FROM orders o
    JOIN members m ON m.id = o.member_id
    WHERE o.status != 'cancelado' AND o.payment_status = 'pago' AND o.delivery_status = 'nao_entregue'
    ORDER BY m.name ASC
  `).all();

  // Alert 2: Received by pastoral but not yet delivered to member
  const receivedNotDelivered = db.prepare(`
    SELECT o.id, m.name as member_name, m.phone, oi.model, oi.size
    FROM orders o
    JOIN members m ON m.id = o.member_id
    LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE o.status != 'cancelado' AND o.production_status = 'recebido' AND o.delivery_status = 'nao_entregue'
    ORDER BY m.name ASC
  `).all();

  // Alert 3: Delivered with pending payment
  const deliveredPendingPayment = db.prepare(`
    SELECT o.id, m.name as member_name, m.phone, o.balance_cents
    FROM orders o
    JOIN members m ON m.id = o.member_id
    WHERE o.status != 'cancelado' AND o.delivery_status = 'entregue' AND o.balance_cents > 0
    ORDER BY m.name ASC
  `).all();

  return res.json({
    paidNotDelivered,
    receivedNotDelivered,
    deliveredPendingPayment,
  });
});

