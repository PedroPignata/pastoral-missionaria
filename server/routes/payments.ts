import { Router, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/database.js';
import { authenticateToken, requireRole, AuthenticatedRequest } from './auth.js';
import { googleSheetsService } from '../services/googleSheetsService.js';

export const paymentsRouter = Router();

// GET /api/payments
paymentsRouter.get('/', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { order_id, member_id, method, start_date, end_date } = req.query;

  let query = `
    SELECT
      p.*,
      m.name as member_name,
      m.phone as member_phone,
      o.total_amount_cents,
      o.balance_cents
    FROM payments p
    JOIN members m ON m.id = p.member_id
    JOIN orders o ON o.id = p.order_id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (order_id) {
    query += ' AND p.order_id = ?';
    params.push(order_id);
  }

  if (member_id) {
    query += ' AND p.member_id = ?';
    params.push(member_id);
  }

  if (method) {
    query += ' AND p.payment_method = ?';
    params.push(method);
  }

  if (start_date) {
    query += ' AND p.payment_date >= ?';
    params.push(start_date);
  }

  if (end_date) {
    query += ' AND p.payment_date <= ?';
    params.push(end_date);
  }

  query += ' ORDER BY p.payment_date DESC, p.created_at DESC';

  const payments = db.prepare(query).all(...params);
  return res.json(payments);
});

// POST /api/payments
paymentsRouter.post('/', authenticateToken, requireRole(['admin', 'coordenador']), (req: AuthenticatedRequest, res: Response) => {
  const { order_id, amount_cents, payment_date, payment_method, notes } = req.body;

  if (!order_id) {
    return res.status(400).json({ error: 'O pedido é obrigatório.' });
  }

  const cents = parseInt(amount_cents);
  if (isNaN(cents) || cents <= 0) {
    return res.status(400).json({ error: 'O valor do pagamento deve ser maior que zero.' });
  }

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(order_id) as any;
  if (!order) {
    return res.status(404).json({ error: 'Pedido não encontrado.' });
  }

  if (order.status === 'cancelado') {
    return res.status(400).json({ error: 'Não é permitido registrar pagamentos para pedidos cancelados.' });
  }

  if (cents > order.balance_cents) {
    return res.status(400).json({
      error: `O valor informado (R$ ${(cents / 100).toFixed(2)}) é maior que o saldo pendente do pedido (R$ ${(order.balance_cents / 100).toFixed(2)}).`
    });
  }

  const paymentId = 'pay_' + crypto.randomBytes(6).toString('hex');
  const now = new Date().toISOString();
  const paymentDate = payment_date || now.split('T')[0];
  const validMethod = ['pix', 'dinheiro', 'transferencia', 'outro'].includes(payment_method) ? payment_method : 'pix';
  const recordedBy = req.user?.name || 'Coordenação';

  const transaction = db.transaction(() => {
    // 1. Insert payment record
    db.prepare(`
      INSERT INTO payments (
        id, order_id, member_id, amount_cents, payment_date, payment_method, recorded_by, notes, is_reversed, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `).run(
      paymentId,
      order_id,
      order.member_id,
      cents,
      paymentDate,
      validMethod,
      recordedBy,
      notes?.trim() || '',
      now,
      now
    );

    // 2. Recalculate order's total paid and balance
    const newPaidAmountCents = order.paid_amount_cents + cents;
    const newBalanceCents = order.total_amount_cents - newPaidAmountCents;
    const newPaymentStatus = newBalanceCents <= 0 ? 'pago' : 'parcial';

    db.prepare(`
      UPDATE orders
      SET paid_amount_cents = ?,
          balance_cents = ?,
          payment_status = ?,
          updated_at = ?
      WHERE id = ?
    `).run(newPaidAmountCents, newBalanceCents, newPaymentStatus, now, order_id);

    // 3. Audit Log
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, user_name, action, entity_type, entity_id, details_json, created_at)
      VALUES (?, ?, ?, 'RECORD_PAYMENT', 'payment', ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      req.user?.id,
      req.user?.name,
      paymentId,
      JSON.stringify({
        order_id,
        amount_cents: cents,
        payment_method: validMethod,
        new_balance_cents: newBalanceCents,
        new_payment_status: newPaymentStatus,
      }),
      now
    );
  });

  transaction();

  // Enqueue sync jobs
  googleSheetsService.enqueueJob('payment', paymentId, 'create');
  googleSheetsService.enqueueJob('order', order_id, 'update');

  return res.status(201).json({
    id: paymentId,
    amount_cents: cents,
    payment_status: order.balance_cents - cents <= 0 ? 'pago' : 'parcial',
    message: 'Pagamento registrado com sucesso!',
  });
});

// POST /api/payments/:id/reverse (Estorno/Correção)
paymentsRouter.post('/:id/reverse', authenticateToken, requireRole(['admin']), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { reason } = req.body;

  if (!reason || !reason.trim()) {
    return res.status(400).json({ error: 'A justificativa do estorno é obrigatória.' });
  }

  const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(id) as any;
  if (!payment) {
    return res.status(404).json({ error: 'Pagamento não encontrado.' });
  }

  if (payment.is_reversed) {
    return res.status(400).json({ error: 'Este pagamento já foi estornado anteriormente.' });
  }

  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(payment.order_id) as any;
  const now = new Date().toISOString();

  const transaction = db.transaction(() => {
    // 1. Mark payment as reversed
    db.prepare(`
      UPDATE payments
      SET is_reversed = 1,
          reversal_reason = ?,
          reversed_at = ?,
          reversed_by = ?,
          updated_at = ?
      WHERE id = ?
    `).run(reason.trim(), now, req.user?.name || 'Admin', now, id);

    // 2. Recalculate order balance
    const newPaidAmountCents = Math.max(0, order.paid_amount_cents - payment.amount_cents);
    const newBalanceCents = order.total_amount_cents - newPaidAmountCents;
    let newPaymentStatus = 'pendente';
    if (newPaidAmountCents > 0) {
      newPaymentStatus = newBalanceCents <= 0 ? 'pago' : 'parcial';
    }

    db.prepare(`
      UPDATE orders
      SET paid_amount_cents = ?,
          balance_cents = ?,
          payment_status = ?,
          updated_at = ?
      WHERE id = ?
    `).run(newPaidAmountCents, newBalanceCents, newPaymentStatus, now, order.id);

    // 3. Audit
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, user_name, action, entity_type, entity_id, details_json, created_at)
      VALUES (?, ?, ?, 'REVERSE_PAYMENT', 'payment', ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      req.user?.id,
      req.user?.name,
      id,
      JSON.stringify({
        amount_cents: payment.amount_cents,
        reason: reason.trim(),
        order_id: order.id,
      }),
      now
    );
  });

  transaction();

  googleSheetsService.enqueueJob('payment', id, 'update');
  googleSheetsService.enqueueJob('order', order.id, 'update');

  return res.json({ message: 'Pagamento estornado com sucesso e saldo recalculado.' });
});

