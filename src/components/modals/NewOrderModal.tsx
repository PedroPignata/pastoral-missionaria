import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { Member, Campaign, TShirtModel, TShirtSize } from '../../types';
import { api } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';
import { Plus, Trash2, UserPlus } from 'lucide-react';

interface NewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCampaign: Campaign | null;
  onOrderCreated: () => void;
}

interface ItemRow {
  model: TShirtModel;
  size: TShirtSize;
  quantity: number;
  unit_price_cents: number;
}

export const NewOrderModal: React.FC<NewOrderModalProps> = ({
  isOpen,
  onClose,
  activeCampaign,
  onOrderCreated,
}) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [isNewMemberMode, setIsNewMemberMode] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const defaultPrice = activeCampaign?.default_price_cents || 4500;

  const [items, setItems] = useState<ItemRow[]>([
    { model: 'Tradicional', size: 'M', quantity: 1, unit_price_cents: defaultPrice },
  ]);

  useEffect(() => {
    if (isOpen) {
      api.getMembers({ active: true }).then(setMembers).catch(console.error);
      setError('');
      setIsNewMemberMode(false);
      setNewMemberName('');
      setNewMemberPhone('');
      setSelectedMemberId('');
      setItems([{ model: 'Tradicional', size: 'M', quantity: 1, unit_price_cents: defaultPrice }]);
    }
  }, [isOpen, defaultPrice]);

  const handleAddItem = () => {
    setItems([...items, { model: 'Baby look', size: 'M', quantity: 1, unit_price_cents: defaultPrice }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof ItemRow, value: any) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    setItems(updated);
  };

  const totalAmountCents = items.reduce((acc, it) => acc + (it.quantity * it.unit_price_cents), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!activeCampaign) {
      setError('Nenhuma campanha ativa selecionada.');
      return;
    }

    let memberId = selectedMemberId;

    setIsSubmitting(true);
    try {
      if (isNewMemberMode) {
        if (!newMemberName.trim()) {
          setError('Informe o nome do novo membro.');
          setIsSubmitting(false);
          return;
        }
        const newMember = await api.createMember({
          name: newMemberName.trim(),
          phone: newMemberPhone.trim(),
        });
        memberId = newMember.id;
      }

      if (!memberId) {
        setError('Selecione ou cadastre um membro para o pedido.');
        setIsSubmitting(false);
        return;
      }

      await api.createOrder({
        campaign_id: activeCampaign.id,
        member_id: memberId,
        items,
        notes,
      });

      onOrderCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao criar pedido.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Novo Pedido de Camiseta"
      subtitle={activeCampaign?.name || 'Pastoral Missionária'}
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
            {error}
          </div>
        )}

        {/* Member Selector or Creator */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider">
              Membro Responsável *
            </label>
            <button
              type="button"
              onClick={() => setIsNewMemberMode(!isNewMemberMode)}
              className="text-xs text-pastoral-dourado font-semibold hover:underline flex items-center gap-1"
            >
              <UserPlus className="w-3.5 h-3.5" />
              {isNewMemberMode ? 'Selecionar membro existente' : 'Novo membro'}
            </button>
          </div>

          {!isNewMemberMode ? (
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-pastoral-dourado focus:border-pastoral-dourado"
              required
            >
              <option value="">Selecione um membro cadastrado...</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} {m.phone ? `(${m.phone})` : ''}
                </option>
              ))}
            </select>
          ) : (
            <div className="space-y-2 p-3 bg-pastoral-creme/50 rounded-xl border border-pastoral-dourado/20">
              <input
                type="text"
                placeholder="Nome completo do membro"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-xl bg-white focus:ring-2 focus:ring-pastoral-dourado focus:border-pastoral-dourado"
                required
              />
              <input
                type="tel"
                placeholder="Telefone / WhatsApp (opcional)"
                value={newMemberPhone}
                onChange={(e) => setNewMemberPhone(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-xl bg-white focus:ring-2 focus:ring-pastoral-dourado focus:border-pastoral-dourado"
              />
            </div>
          )}
        </div>

        {/* Items List */}
        <div>
          <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider mb-2">
            Camisetas do Pedido
          </label>
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="flex flex-wrap items-center gap-2 p-3 bg-zinc-50 border border-zinc-200 rounded-xl"
              >
                {/* Model */}
                <div className="flex-1 min-w-[130px]">
                  <label className="block text-[10px] text-zinc-500 font-semibold mb-1">Modelo</label>
                  <select
                    value={item.model}
                    onChange={(e) => handleItemChange(idx, 'model', e.target.value)}
                    className="w-full text-xs font-medium px-2 py-1.5 border border-zinc-300 rounded-lg bg-white"
                  >
                    <option value="Tradicional">Tradicional</option>
                    <option value="Baby look">Baby look</option>
                  </select>
                </div>

                {/* Size */}
                <div className="w-20">
                  <label className="block text-[10px] text-zinc-500 font-semibold mb-1">Tamanho</label>
                  <select
                    value={item.size}
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

                {/* Quantity */}
                <div className="w-16">
                  <label className="block text-[10px] text-zinc-500 font-semibold mb-1">Qtd</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value) || 1)}
                    className="w-full text-xs font-semibold px-2 py-1.5 border border-zinc-300 rounded-lg text-center"
                  />
                </div>

                {/* Subtotal */}
                <div className="w-24 text-right">
                  <label className="block text-[10px] text-zinc-500 font-semibold mb-1">Subtotal</label>
                  <span className="text-xs font-bold text-pastoral-cafe">
                    {formatCurrency(item.quantity * item.unit_price_cents)}
                  </span>
                </div>

                {/* Remove item button */}
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="p-1.5 text-zinc-400 hover:text-rose-600 rounded-lg"
                    title="Remover camiseta"
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
            <Plus className="w-3.5 h-3.5" /> Adicionar outra camiseta neste pedido
          </button>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider mb-1">
            Observações (opcional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Ex.: Vai pagar na próxima reunião; preferência por entrega na paróquia"
            className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-xl bg-white"
          />
        </div>

        {/* Total Summary Footer */}
        <div className="p-3 bg-pastoral-cafe text-white rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs text-pastoral-rosa-antigo">Total Previsto</p>
            <p className="font-serif font-bold text-lg text-pastoral-dourado">
              {formatCurrency(totalAmountCents)}
            </p>
          </div>
          <div className="text-right text-xs text-zinc-300">
            {items.reduce((acc, it) => acc + it.quantity, 0)} camiseta(s)
          </div>
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
            className="px-5 py-2 rounded-xl text-xs font-bold bg-pastoral-dourado hover:brightness-105 text-pastoral-profundo transition-all shadow-gold disabled:opacity-50"
          >
            {isSubmitting ? 'Salvando...' : 'Confirmar Pedido'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

