import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Order } from '../../types';
import { api } from '../../services/api';
import { Truck, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

interface RecordDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onDeliveryRecorded: () => void;
}

export const RecordDeliveryModal: React.FC<RecordDeliveryModalProps> = ({
  isOpen,
  onClose,
  order,
  onDeliveryRecorded,
}) => {
  const [deliveredTo, setDeliveredTo] = useState('');
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (order && isOpen) {
      setDeliveredTo(order.delivered_to || order.member_name);
      setDeliveryDate(order.delivery_date || new Date().toISOString().split('T')[0]);
      setDeliveryNotes(order.delivery_notes || '');
      setError('');
    }
  }, [order, isOpen]);

  if (!order) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      await api.recordDelivery(order.id, {
        delivered_to: deliveredTo.trim(),
        delivery_date: deliveryDate,
        delivery_notes: deliveryNotes.trim(),
      });
      onDeliveryRecorded();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao registrar entrega.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Entrega de Camiseta"
      subtitle={`Pedido de ${order.member_name}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
            {error}
          </div>
        )}

        {/* Financial alert if delivered with pending balance */}
        {order.balance_cents > 0 && (
          <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-2.5 text-amber-900 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Atenção: Saldo Pendente</p>
              <p className="mt-0.5">
                Este pedido possui saldo pendente de <b>{formatCurrency(order.balance_cents)}</b>. A entrega pode ser realizada se autorizada pela coordenação.
              </p>
            </div>
          </div>
        )}

        {/* Items summary */}
        <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs space-y-1">
          <p className="font-semibold text-pastoral-cafe">Itens a entregar:</p>
          {order.items.map((it, idx) => (
            <p key={idx} className="text-zinc-600">
              • {it.quantity}x {it.model} (Tam. {it.size})
            </p>
          ))}
        </div>

        {/* Recipient */}
        <div>
          <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider mb-1">
            Entregue Para (Nome de quem recebeu) *
          </label>
          <input
            type="text"
            value={deliveredTo}
            onChange={(e) => setDeliveredTo(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-xl bg-white"
            required
          />
        </div>

        {/* Date */}
        <div>
          <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider mb-1">
            Data da Entrega *
          </label>
          <input
            type="date"
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-xl bg-white"
            required
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider mb-1">
            Observações da Entrega
          </label>
          <input
            type="text"
            value={deliveryNotes}
            onChange={(e) => setDeliveryNotes(e.target.value)}
            placeholder="Ex.: Entregue após o terço dos jovens; deixado na secretaria paroquial"
            className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-xl bg-white"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 hover:bg-zinc-100"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-pastoral-dourado hover:brightness-105 text-pastoral-profundo shadow-gold flex items-center gap-1.5"
          >
            <Truck className="w-4 h-4" />
            {isSubmitting ? 'Salvando...' : 'Confirmar Entrega'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

