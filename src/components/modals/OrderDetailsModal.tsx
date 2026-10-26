import React from 'react';
import { Modal } from '../common/Modal';
import { Order, Payment } from '../../types';
import { formatCurrency, formatDate, formatDateTime, PAYMENT_METHODS_MAP } from '../../utils/formatters';
import { PaymentBadge, ProductionBadge, DeliveryBadge } from '../common/Badge';
import { DollarSign, Truck, MessageCircle, Edit3, XCircle, RotateCcw, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: (Order & { payments?: Payment[] }) | null;
  onOpenPayment: (order: Order) => void;
  onOpenDelivery: (order: Order) => void;
  onOpenWhatsApp: (order: Order) => void;
  onOpenEdit: (order: Order) => void;
  onCancelOrder: (order: Order) => void;
  onReversePayment?: (paymentId: string) => void;
}

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  isOpen,
  onClose,
  order,
  onOpenPayment,
  onOpenDelivery,
  onOpenWhatsApp,
  onOpenEdit,
  onCancelOrder,
  onReversePayment,
}) => {
  const { canEdit, isAdmin } = useAuth();

  if (!order) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Detalhes do Pedido #${order.id.slice(-6)}`}
      subtitle={`${order.member_name} • ${order.campaign_name || 'Campanha 2026'}`}
      maxWidth="2xl"
    >
      <div className="space-y-5">
        {/* Top Status & Info Bar */}
        <div className="p-4 bg-pastoral-creme/60 rounded-xl border border-pastoral-dourado/20 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs text-zinc-500">Membro:</p>
            <p className="text-sm font-bold text-pastoral-cafe">{order.member_name}</p>
            {order.member_phone && (
              <p className="text-xs text-zinc-600 font-medium">{order.member_phone}</p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <PaymentBadge status={order.payment_status} />
            <ProductionBadge status={order.production_status} />
            <DeliveryBadge status={order.delivery_status} />
          </div>
        </div>

        {/* Items Table */}
        <div>
          <h4 className="text-xs font-bold text-pastoral-cafe uppercase tracking-wider mb-2">
            Camisetas Solicitadas ({order.items.reduce((acc, it) => acc + it.quantity, 0)} un)
          </h4>
          <div className="overflow-x-auto border border-zinc-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 text-zinc-600 border-b border-zinc-200 font-semibold">
                <tr>
                  <th className="px-3 py-2">Modelo</th>
                  <th className="px-3 py-2 text-center">Tamanho</th>
                  <th className="px-3 py-2 text-center">Qtd</th>
                  <th className="px-3 py-2 text-right">Unitário</th>
                  <th className="px-3 py-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {order.items.map((it, idx) => (
                  <tr key={idx} className="hover:bg-zinc-50/50">
                    <td className="px-3 py-2.5 font-medium text-pastoral-cafe">{it.model}</td>
                    <td className="px-3 py-2.5 text-center font-bold text-pastoral-dourado">{it.size}</td>
                    <td className="px-3 py-2.5 text-center">{it.quantity}</td>
                    <td className="px-3 py-2.5 text-right text-zinc-500">{formatCurrency(it.unit_price_cents)}</td>
                    <td className="px-3 py-2.5 text-right font-bold text-pastoral-cafe">
                      {formatCurrency(it.total_price_cents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="p-3.5 bg-pastoral-cafe text-white rounded-xl grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-[10px] text-pastoral-rosa-antigo uppercase">Valor Total</p>
            <p className="text-sm font-bold">{formatCurrency(order.total_amount_cents)}</p>
          </div>
          <div>
            <p className="text-[10px] text-emerald-300 uppercase">Total Pago</p>
            <p className="text-sm font-bold text-emerald-400">{formatCurrency(order.paid_amount_cents)}</p>
          </div>
          <div>
            <p className="text-[10px] text-amber-300 uppercase">Saldo Pendente</p>
            <p className={`text-sm font-bold ${order.balance_cents > 0 ? 'text-amber-400' : 'text-zinc-300'}`}>
              {formatCurrency(order.balance_cents)}
            </p>
          </div>
        </div>

        {/* Delivery Status Card */}
        {order.delivery_status === 'entregue' && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-emerald-600" />
              Camiseta Entregue
            </p>
            <p>
              Data: <b>{formatDate(order.delivery_date)}</b> • Entregue para: <b>{order.delivered_to || order.member_name}</b>
            </p>
            {order.delivery_notes && <p className="italic text-zinc-600">"{order.delivery_notes}"</p>}
          </div>
        )}

        {/* Notes if any */}
        {order.notes && (
          <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-700">
            <span className="font-semibold text-pastoral-cafe">Observações: </span>
            {order.notes}
          </div>
        )}

        {/* Payment History */}
        {order.payments && order.payments.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-pastoral-cafe uppercase tracking-wider mb-2">
              Histórico de Pagamentos Lançados
            </h4>
            <div className="space-y-2">
              {order.payments.map((p) => (
                <div
                  key={p.id}
                  className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                    p.is_reversed ? 'bg-zinc-100 border-zinc-300 text-zinc-400 line-through' : 'bg-white border-zinc-200'
                  }`}
                >
                  <div>
                    <span className="font-bold text-emerald-700 mr-2">{formatCurrency(p.amount_cents)}</span>
                    <span className="font-medium text-zinc-700">{PAYMENT_METHODS_MAP[p.payment_method] || p.payment_method}</span>
                    <span className="text-zinc-400 text-[11px] ml-2">em {formatDate(p.payment_date)}</span>
                    <p className="text-[10px] text-zinc-400 mt-0.5">
                      Registrado por: {p.recorded_by} {p.notes ? `• "${p.notes}"` : ''}
                    </p>
                  </div>
                  {isAdmin && !p.is_reversed && onReversePayment && (
                    <button
                      type="button"
                      onClick={() => onReversePayment(p.id)}
                      className="text-[11px] text-rose-600 hover:text-rose-800 p-1 rounded hover:bg-rose-50 flex items-center gap-1 font-semibold"
                      title="Estornar pagamento"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Estornar
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons Toolbar */}
        <div className="pt-3 border-t border-zinc-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {canEdit && order.balance_cents > 0 && order.status !== 'cancelado' && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPayment(order);
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1 shadow-sm"
              >
                <DollarSign className="w-3.5 h-3.5" /> Registrar Pagamento
              </button>
            )}

            {canEdit && order.delivery_status !== 'entregue' && order.status !== 'cancelado' && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenDelivery(order);
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-pastoral-dourado text-pastoral-profundo hover:brightness-105 flex items-center gap-1 shadow-sm"
              >
                <Truck className="w-3.5 h-3.5" /> Marcar Entrega
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenWhatsApp(order);
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 flex items-center gap-1"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" /> WhatsApp
            </button>

            {canEdit && order.status !== 'cancelado' && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenEdit(order);
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 flex items-center gap-1"
              >
                <Edit3 className="w-3.5 h-3.5" /> Editar
              </button>
            )}
          </div>

          {isAdmin && order.status !== 'cancelado' && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onCancelOrder(order);
              }}
              className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-1"
            >
              <XCircle className="w-3.5 h-3.5" /> Cancelar Pedido
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};

