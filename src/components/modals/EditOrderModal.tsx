import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Order, OrderItem, TShirtModel, TShirtSize, ProductionStatus } from '../../types';
import { api } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';
import { Plus, Trash2 } from 'lucide-react';

interface EditOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onOrderUpdated: () => void;
}

export const EditOrderModal: React.FC<EditOrderModalProps> = ({
  isOpen,
  onClose,
  order,
  onOrderUpdated,
}) => {
  const [items, setItems] = useState<OrderItem[]>([]);
  const [notes, setNotes] = useState('');
  const [productionStatus, setProductionStatus] = useState<ProductionStatus>('aguardando_confirmacao');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (order && isOpen) {
      setItems(order.items.map(it => ({ ...it })));
      setNotes(order.notes || '');
      setProductionStatus(order.production_status);
      setError('');
    }
  }, [order, isOpen]);

  if (!order) return null;

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        model: 'Baby look',
        size: 'M',
        quantity: 1,
        unit_price_cents: 4500,
        total_price_cents: 4500,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    if (field === 'quantity' || field === 'unit_price_cents') {
      const q = updated[index].quantity || 1;
      const u = updated[index].unit_price_cents || 4500;
      updated[index].total_price_cents = q * u;
    }
    setItems(updated);
  };

  const totalCents = items.reduce((acc, it) => acc + (it.quantity * it.unit_price_cents), 0);
  const balanceCents = totalCents - order.paid_amount_cents;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    setIsSubmitting(true);
    try {
      await api.updateOrder(order.id, {
        items,
        notes,
        production_status: productionStatus,
      });
      onOrderUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar pedido.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Editar Pedido"
      subtitle={`Membro: ${order.member_name}`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
            {error}
          </div>
        )}

        {/* Items List */}
        <div>
          <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider mb-2">
            Camisetas do Pedido
          </label>
          <div className="space-y-2">
            {items.map((it, idx) => (
              <div
                key={idx}
                className="flex flex-wrap items-center gap-2 p-3 bg-zinc-50 border border-zinc-200 rounded-xl"
              >
                <div className="flex-1 min-w-[120px]">
                  <label className="block text-[10px] text-zinc-500 font-semibold mb-1">Modelo</label>
                  <select
                    value={it.model}
                    onChange={(e) => handleItemChange(idx, 'model', e.target.value)}
                    className="w-full text-xs font-medium px-2 py-1.5 border border-zinc-300 rounded-lg bg-white"
                  >
                    <option value="Tradicional">Tradicional</option>
                    <option value="Baby look">Baby look</option>
                  </select>
                </div>

                <div className="w-20">
                  <label className="block text-[10px] text-zinc-500 font-semibold mb-1">Tamanho</label>
                  <select
                    value={it.size}
                    onChange={(e) => handleItemChange(idx, 'size', e.target.value)}
                    className="w-full text-xs font-bold px-2 py-1.5 border border-zinc-300 rounded-lg bg-white text-center"
                  >
                    {['PP', 'P', 'M', 'G', 'GG', 'XG'].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-16">
                  <label className="block text-[10px] text-zinc-500 font-semibold mb-1">Qtd</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={it.quantity}
                    onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value) || 1)}
                    className="w-full text-xs font-semibold px-2 py-1.5 border border-zinc-300 rounded-lg text-center"
                  />
                </div>

                <div className="w-24 text-right">
                  <label className="block text-[10px] text-zinc-500 font-semibold mb-1">Subtotal</label>
                  <span className="text-xs font-bold text-pastoral-cafe">
                    {formatCurrency(it.quantity * it.unit_price_cents)}
                  </span>
                </div>

                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleAddItem}
            className="mt-2 text-xs font-semibold text-pastoral-dourado hover:underline flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar camiseta
          </button>
        </div>

        {/* Status */}
        <div>
          <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider mb-1">
            Etapa de Produção
          </label>
          <select
            value={productionStatus}
            onChange={(e) => setProductionStatus(e.target.value as ProductionStatus)}
            className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-xl bg-white font-medium"
          >
            <option value="aguardando_confirmacao">Aguardando Confirmação</option>
            <option value="confirmado">Confirmado</option>
            <option value="encomendado">Encomendado ao Fornecedor</option>
            <option value="em_producao">Em Produção</option>
            <option value="recebido">Recebido na Pastoral</option>
            <option value="entregue">Entregue ao Membro</option>
          </select>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider mb-1">
            Observações
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-xl"
          />
        </div>

        {/* Financial Recalculation Preview */}
        <div className="p-3 bg-pastoral-creme rounded-xl border border-pastoral-dourado/20 flex items-center justify-between text-xs">
          <div>
            <span className="text-zinc-500">Novo Total: </span>
            <b className="text-pastoral-cafe font-serif font-bold text-sm">{formatCurrency(totalCents)}</b>
          </div>
          <div>
            <span className="text-zinc-500">Saldo Pendente: </span>
            <b className="text-rose-600 font-bold">{formatCurrency(balanceCents)}</b>
          </div>
        </div>

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
            className="px-5 py-2 rounded-xl text-xs font-bold bg-pastoral-dourado hover:brightness-105 text-pastoral-profundo shadow-gold"
          >
            {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

