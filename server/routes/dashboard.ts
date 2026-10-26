import { Router, Response } from 'express';
import { db } from '../db/database.js';
import { authenticateToken, AuthenticatedRequest } from './auth.js';

export const dashboardRouter = Router();

// GET /api/dashboard
dashboardRouter.get('/', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { campaign_id } = req.query;

  let baseWhere = "WHERE o.status != 'cancelado'";
  const params: any[] = [];

  if (campaign_id) {
    baseWhere += " AND o.campaign_id = ?";
    params.push(campaign_id);
  }

  // 1. General & Financial KPI aggregates
  const metrics = db.prepare(`
    SELECT
      COUNT(DISTINCT m.id) as total_members_registered,
      COUNT(DISTINCT o.id) as total_orders,
      COALESCE(SUM(oi.quantity), 0) as total_tshirts,
      SUM(CASE WHEN o.production_status = 'aguardando_confirmacao' THEN 1 ELSE 0 END) as orders_waiting_confirmation,
      SUM(CASE WHEN o.production_status = 'confirmado' THEN 1 ELSE 0 END) as orders_confirmed,
      SUM(CASE WHEN o.production_status = 'encomendado' THEN 1 ELSE 0 END) as orders_ordered_supplier,
      SUM(CASE WHEN o.production_status = 'em_producao' THEN 1 ELSE 0 END) as orders_in_production,
      SUM(CASE WHEN o.production_status = 'recebido' THEN 1 ELSE 0 END) as orders_received,
      SUM(CASE WHEN o.delivery_status = 'entregue' THEN 1 ELSE 0 END) as tshirts_delivered,
      SUM(CASE WHEN o.delivery_status = 'nao_entregue' THEN 1 ELSE 0 END) as tshirts_pending_delivery,
      COALESCE(SUM(o.total_amount_cents), 0) as total_amount_cents,
      COALESCE(SUM(o.paid_amount_cents), 0) as paid_amount_cents,
      COALESCE(SUM(o.balance_cents), 0) as balance_cents,
      SUM(CASE WHEN o.payment_status = 'pago' THEN 1 ELSE 0 END) as orders_paid,
      SUM(CASE WHEN o.payment_status = 'parcial' THEN 1 ELSE 0 END) as orders_partially_paid,
      SUM(CASE WHEN o.payment_status = 'pendente' THEN 1 ELSE 0 END) as orders_unpaid
    FROM orders o
    JOIN members m ON m.id = o.member_id
    LEFT JOIN order_items oi ON oi.order_id = o.id
    ${baseWhere}
  `).get(...params) as any;

  // Total members in system (regardless of campaign)
  const totalAllMembers = db.prepare('SELECT COUNT(*) as count FROM members WHERE active = 1').get() as any;

  // Cancelled orders count
  const cancelledOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'cancelado'").get() as any;

  // 2. Chart: Models Distribution
  const modelsChart = db.prepare(`
    SELECT oi.model as name, SUM(oi.quantity) as value
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    ${baseWhere}
    GROUP BY oi.model
    ORDER BY value DESC
  `).all(...params);

  // 3. Chart: Sizes Distribution (Sorted PP, P, M, G, GG, XG)
  const sizesChart = db.prepare(`
    SELECT oi.size as name, SUM(oi.quantity) as value
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    ${baseWhere}
    GROUP BY oi.size
    ORDER BY
      CASE oi.size
        WHEN 'PP' THEN 1
        WHEN 'P' THEN 2
        WHEN 'M' THEN 3
        WHEN 'G' THEN 4
        WHEN 'GG' THEN 5
        WHEN 'XG' THEN 6
        ELSE 7
      END
  `).all(...params);

  // 4. Chart: Payment Status Breakdown
  const paymentStatusChart = [
    { name: 'Pago Integral', value: metrics.orders_paid || 0, color: '#15803D' },
    { name: 'Parcial', value: metrics.orders_partially_paid || 0, color: '#D97706' },
    { name: 'Pendente', value: metrics.orders_unpaid || 0, color: '#B91C1C' },
  ];

  // 5. Chart: Production Pipeline Breakdown
  const pipelineChart = [
    { stage: 'Aguardando', count: metrics.orders_waiting_confirmation || 0 },
    { stage: 'Confirmado', count: metrics.orders_confirmed || 0 },
    { stage: 'Encomendado', count: metrics.orders_ordered_supplier || 0 },
    { stage: 'Produção', count: metrics.orders_in_production || 0 },
    { stage: 'Recebido', count: metrics.orders_received || 0 },
    { stage: 'Entregue', count: metrics.tshirts_delivered || 0 },
  ];

  // 6. Recent Payments
  const recentPayments = db.prepare(`
    SELECT p.*, m.name as member_name, o.id as order_id
    FROM payments p
    JOIN members m ON m.id = p.member_id
    JOIN orders o ON o.id = p.order_id
    WHERE p.is_reversed = 0
    ORDER BY p.payment_date DESC, p.created_at DESC
    LIMIT 6
  `).all();

  // 7. Recent Pending Orders (High Priority)
  const pendingOrders = db.prepare(`
    SELECT o.id, m.name as member_name, m.phone, oi.model, oi.size, o.balance_cents, o.total_amount_cents
    FROM orders o
    JOIN members m ON m.id = o.member_id
    LEFT JOIN order_items oi ON oi.order_id = o.id
    ${baseWhere} AND o.balance_cents > 0
    ORDER BY o.balance_cents DESC, m.name ASC
    LIMIT 8
  `).all(...params);

  const percentCollected = metrics.total_amount_cents > 0
    ? Math.round((metrics.paid_amount_cents * 100) / metrics.total_amount_cents)
    : 0;

  return res.json({
    kpis: {
      total_members: totalAllMembers.count,
      total_orders: metrics.total_orders || 0,
      total_tshirts: metrics.total_tshirts || 0,
      orders_waiting_confirmation: metrics.orders_waiting_confirmation || 0,
      orders_confirmed: metrics.orders_confirmed || 0,
      orders_cancelled: cancelledOrders.count || 0,
      tshirts_ordered_supplier: metrics.orders_ordered_supplier || 0,
      tshirts_delivered: metrics.tshirts_delivered || 0,
      tshirts_pending_delivery: metrics.tshirts_pending_delivery || 0,
      total_amount_cents: metrics.total_amount_cents || 0,
      paid_amount_cents: metrics.paid_amount_cents || 0,
      balance_cents: metrics.balance_cents || 0,
      orders_paid: metrics.orders_paid || 0,
      orders_partially_paid: metrics.orders_partially_paid || 0,
      orders_unpaid: metrics.orders_unpaid || 0,
      percent_collected: percentCollected,
    },
    charts: {
      models: modelsChart,
      sizes: sizesChart,
      paymentStatus: paymentStatusChart,
      pipeline: pipelineChart,
    },
    recentPayments,
    pendingOrders,
  });
});
