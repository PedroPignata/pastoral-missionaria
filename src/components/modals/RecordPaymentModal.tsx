import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Order, PaymentMethod } from '../../types';
import { api } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';
import { triggerPastoralConfetti } from '../common/Confetti';
import { DollarSign, CheckCircle2 } from 'lucide-react';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onPaymentRecorded: () => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  order,
  onPaymentRecorded,
}) => {
  const [amountStr, setAmountStr] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (order && isOpen) {
      setError('');
      setNotes('');
      setPaymentMethod('pix');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      // Pre-fill with remaining balance in reais (e.g. "45,00")
      setAmountStr((order.balance_cents / 100).toFixed(2).replace('.', ','));
    }
  }, [order, isOpen]);

  if (!order) return null;

  const parseAmountCents = (str: string): number => {
    const clean = str.replace(/[^\d,]/g, '').replace(',', '.');
    const floatVal = parseFloat(clean);
    return isNaN(floatVal) ? 0 : Math.round(floatVal * 100);
  };

  const amountCents = parseAmountCents(amountStr);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (amountCents <= 0) {
      setError('O valor do pagamento deve ser maior que zero.');
      return;
    }

    if (amountCents > order.balance_cents) {
      setError(`O valor não pode ser maior que o saldo restante (${formatCurrency(order.balance_cents)}).`);
      return;
    }

    setIsSubmitting(true);
    try {
      await api.recordPayment({
        order_id: order.id,
        amount_cents: amountCents,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        notes,
      });

      // If fully paid, trigger celebration confetti!
      if (order.balance_cents - amountCents <= 0) {
        triggerPastoralConfetti();
      }

      onPaymentRecorded();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao registrar pagamento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Pagamento"
      subtitle={`Pedido de ${order.member_name}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
            {error}
          </div>
        )}

        {/* Order Balances Card */}
        <div className="p-3 bg-pastoral-creme rounded-xl border border-pastoral-dourado/20 grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-[10px] text-zinc-500 font-semibold uppercase">Total</p>
            <p className="text-xs font-bold text-pastoral-cafe">{formatCurrency(order.total_amount_cents)}</p>
          </div>
          <div>
            <p className="text-[10px] text-zinc-500 font-semibold uppercase">Já Pago</p>
            <p className="text-xs font-bold text-emerald-600">{formatCurrency(order.paid_amount_cents)}</p>
          </div>
          <div>
            <p className="text-[10px] text-zinc-500 font-semibold uppercase">Saldo Restante</p>
            <p className="text-xs font-bold text-rose-600">{formatCurrency(order.balance_cents)}</p>
          </div>
        </div>

        {/* Quick Amount Shortcuts */}
        <div>
          <label className="block text-[10px] text-zinc-500 font-bold uppercase mb-1">
            Atalhos de Pagamento
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAmountStr((order.balance_cents / 100).toFixed(2).replace('.', ','))}
              className="flex-1 py-1 px-2 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 transition-colors"
            >
              Quitar Total ({formatCurrency(order.balance_cents)})
            </button>
            {order.balance_cents > 2000 && (
              <button
                type="button"
                onClick={() => setAmountStr((Math.round(order.balance_cents / 2) / 100).toFixed(2).replace('.', ','))}
                className="py-1 px-2 text-xs font-semibold rounded-lg bg-zinc-100 text-zinc-700 border border-zinc-200 hover:bg-zinc-200 transition-colors"
              >
                50% ({formatCurrency(Math.round(order.balance_cents / 2))})
              </button>
            )}
          </div>
        </div>

        {/* Amount Input */}
        <div>
          <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider mb-1">
            Valor Recebido (R$) *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-zinc-500 font-semibold text-sm">R$</span>
            <input
              type="text"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              placeholder="0,00"
              className="w-full pl-10 pr-3 py-2 text-base font-bold text-pastoral-cafe border border-zinc-300 rounded-xl focus:ring-2 focus:ring-pastoral-dourado focus:border-pastoral-dourado"
              required
            />
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">
            {order.balance_cents - amountCents <= 0 ? (
              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Este pagamento quitará integralmente o pedido!
              </span>
            ) : (
              <span>Saldo restante após pagamento: <b>{formatCurrency(order.balance_cents - amountCents)}</b></span>
            )}
          </p>
        </div>

        {/* Method & Date */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider mb-1">
              Forma de Pagamento *
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full px-3 py-2 text-xs font-medium border border-zinc-300 rounded-xl bg-white"
            >
              <option value="pix">Pix</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="transferencia">Transferência</option>
              <option value="outro">Outro</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider mb-1">
              Data do Pagamento *
            </label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full px-3 py-2 text-xs font-medium border border-zinc-300 rounded-xl bg-white"
              required
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider mb-1">
            Observações do Lançamento
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex.: Comprovante enviado no WhatsApp; pago em mãos na igreja"
            className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-xl bg-white"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 hover:bg-zinc-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-md disabled:opacity-50 flex items-center gap-1.5"
          >
            <DollarSign className="w-4 h-4" />
            {isSubmitting ? 'Registrando...' : 'Confirmar Pagamento'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

