import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../common/Modal';
import { Campaign, Order, TShirtModel, TShirtSize, ProductionStatus } from '../../types';
import { api } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';
import {
  Plus,
  Trash2,
  UserPlus,
  Search,
  ShieldCheck,
  Phone,
  AlertTriangle,
  DollarSign,
  ExternalLink,
  Check,
} from 'lucide-react';

interface NewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCampaign: Campaign | null;
  orders?: Order[];
  onOrderCreated: () => void;
  onOpenExistingOrder?: (order: Order) => void;
  onNavigateToGovernance?: () => void;
}

interface ItemRow {
  model: TShirtModel;
  size: TShirtSize;
  quantity: number;
  unit_price_cents: number;
  unit_price_str?: string;
}

interface PastoralMemberOption {
  id: string;
  buyer_member_id?: string | null;
  name: string;
  display_name: string;
  phone?: string | null;
  pastoral_role: string;
  status: string;
}

export function cleanMissionarySelectorName(rawName: string): string {
  return String(rawName || '')
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export const NewOrderModal: React.FC<NewOrderModalProps> = ({
  isOpen,
  onClose,
  activeCampaign,
  orders = [],
  onOrderCreated,
  onOpenExistingOrder,
  onNavigateToGovernance,
}) => {
  const [pastoralMembers, setPastoralMembers] = useState<PastoralMemberOption[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedPastoralMemberId, setSelectedPastoralMemberId] = useState('');
  const [isNewMemberMode, setIsNewMemberMode] = useState(false);

  // Novo missionário na Governança
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberDisplayName, setNewMemberDisplayName] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [isCreatingMember, setIsCreatingMember] = useState(false);

  // Dados do pedido
  const [productionStatus, setProductionStatus] = useState<ProductionStatus>('em_producao');
  const [notes, setNotes] = useState('');
  const [hasInitialPayment, setHasInitialPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'dinheiro' | 'transferencia' | 'outro'>('pix');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentAmountReais, setPaymentAmountReais] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const defaultPrice = activeCampaign?.default_price_cents || 4500;
  const defaultPriceFormatted = (defaultPrice / 100).toFixed(2).replace('.', ',');

  const [items, setItems] = useState<ItemRow[]>([
    {
      model: 'Tradicional',
      size: 'M',
      quantity: 1,
      unit_price_cents: defaultPrice,
      unit_price_str: defaultPriceFormatted,
    },
  ]);

  const loadInstitutionalMembers = async () => {
    try {
      const list = await api.getPastoralMembers({ status: 'ativo' });
      const sorted = (Array.isArray(list) ? list : []).sort((a, b) =>
        cleanMissionarySelectorName(a.name).localeCompare(
          cleanMissionarySelectorName(b.name),
          'pt-BR'
        )
      );
      setPastoralMembers(sorted);
    } catch (err) {
      console.error('Erro ao carregar missionários da Governança:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadInstitutionalMembers();
      setError('');
      setMemberSearch('');
      setSelectedPastoralMemberId('');
      setIsNewMemberMode(false);
      setNewMemberName('');
      setNewMemberDisplayName('');
      setNewMemberPhone('');
      setProductionStatus('em_producao');
      setNotes('');
      setHasInitialPayment(false);
      setPaymentMethod('pix');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setPaymentAmountReais('');
      setPaymentNotes('');
      setItems([
        {
          model: 'Tradicional',
          size: 'M',
          quantity: 1,
          unit_price_cents: defaultPrice,
          unit_price_str: (defaultPrice / 100).toFixed(2).replace('.', ','),
        },
      ]);
    }
  }, [isOpen, defaultPrice]);

  const filteredPastoralMembers = useMemo(() => {
    if (!memberSearch.trim()) return pastoralMembers;
    const term = memberSearch.toLowerCase().trim();
    return pastoralMembers.filter(
      (m) =>
        cleanMissionarySelectorName(m.name).toLowerCase().includes(term) ||
        m.name.toLowerCase().includes(term) ||
        (m.display_name || '').toLowerCase().includes(term)
    );
  }, [pastoralMembers, memberSearch]);

  const selectedMember = useMemo(
    () => pastoralMembers.find((m) => m.id === selectedPastoralMemberId) || null,
    [pastoralMembers, selectedPastoralMemberId]
  );

  // Detecta eventual homônimo para diferenciação discreta pós-seleção (Seção 8.3)
  const hasHomonym = useMemo(() => {
    if (!selectedMember) return false;
    const targetClean = cleanMissionarySelectorName(selectedMember.name).toLowerCase();
    return (
      pastoralMembers.filter(
        (m) => cleanMissionarySelectorName(m.name).toLowerCase() === targetClean
      ).length > 1
    );
  }, [pastoralMembers, selectedMember]);

  // Verifica se o missionário selecionado já possui pedido na campanha ativa
  const existingOrdersForMember = useMemo(() => {
    if (!selectedMember || !activeCampaign) return [];
    return orders.filter(
      (o) =>
        o.campaign_id === activeCampaign.id &&
        o.status !== 'cancelado' &&
        (o.pastoral_member_id === selectedMember.id ||
          (selectedMember.buyer_member_id && o.member_id === selectedMember.buyer_member_id))
    );
  }, [orders, selectedMember, activeCampaign]);

  const totalAmountCents = items.reduce((acc, it) => acc + it.quantity * it.unit_price_cents, 0);

  useEffect(() => {
    if (hasInitialPayment && !paymentAmountReais) {
      setPaymentAmountReais((totalAmountCents / 100).toFixed(2));
    }
  }, [hasInitialPayment, totalAmountCents]);

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        model: 'Baby look',
        size: 'M',
        quantity: 1,
        unit_price_cents: defaultPrice,
        unit_price_str: (defaultPrice / 100).toFixed(2).replace('.', ','),
      },
    ]);
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

  const handleUnitPriceInputChange = (index: number, rawStr: string) => {
    const updated = [...items];
    updated[index].unit_price_str = rawStr;
    const normalized = parseFloat(rawStr.replace(/\./g, '').replace(',', '.'));
    if (!isNaN(normalized) && normalized > 0) {
      updated[index].unit_price_cents = Math.round(normalized * 100);
    }
    setItems(updated);
  };

  const handleCreateGovernanceMemberInline = async () => {
    if (!newMemberName.trim()) {
      setError('Informe o nome completo do novo missionário.');
      return;
    }
    setIsCreatingMember(true);
    setError('');
    try {
      const created = await api.createPastoralMember({
        name: newMemberName.trim(),
        display_name: newMemberDisplayName.trim() || newMemberName.trim().split(' ')[0],
        phone: newMemberPhone.trim() || null,
        pastoral_role: 'membro',
        status: 'ativo',
        qualifications: [],
      });
      await loadInstitutionalMembers();
      if (created?.id) {
        setSelectedPastoralMemberId(created.id);
      }
      setIsNewMemberMode(false);
      setNewMemberName('');
      setNewMemberDisplayName('');
      setNewMemberPhone('');
    } catch (err: any) {
      setError(err.message || 'Erro ao cadastrar missionário na Governança.');
    } finally {
      setIsCreatingMember(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!activeCampaign) {
      setError('Nenhuma campanha ativa selecionada.');
      return;
    }

    if (!selectedPastoralMemberId) {
      setError('Selecione um missionário para vincular ao pedido.');
      return;
    }

    let initialPaymentPayload = null;
    if (hasInitialPayment) {
      const parsedReais = parseFloat(paymentAmountReais.replace(',', '.'));
      if (isNaN(parsedReais) || parsedReais <= 0) {
        setError('Informe um valor válido para o pagamento inicial.');
        return;
      }
      initialPaymentPayload = {
        amount_cents: Math.round(parsedReais * 100),
        payment_date: paymentDate,
        payment_method: paymentMethod,
        notes: paymentNotes.trim() || 'Pagamento registrado no ato da encomenda',
      };
    }

    setIsSubmitting(true);
    try {
      await api.createOrder({
        campaign_id: activeCampaign.id,
        pastoral_member_id: selectedPastoralMemberId,
        items: items.map(({ model, size, quantity, unit_price_cents }) => ({
          model,
          size,
          quantity,
          unit_price_cents,
        })),
        notes,
        production_status: productionStatus,
        initial_payment: initialPaymentPayload,
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

        {/* Etapa 1: Seleção do Missionário (Simplificada — Seção 8) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider">
              Selecionar Missionário *
            </label>
            <button
              type="button"
              onClick={() => setIsNewMemberMode(!isNewMemberMode)}
              className="text-xs text-pastoral-dourado font-semibold hover:underline flex items-center gap-1"
            >
              <UserPlus className="w-3.5 h-3.5" />
              {isNewMemberMode
                ? 'Selecionar missionário existente'
                : '+ Cadastrar novo missionário na Governança'}
            </button>
          </div>

          {!isNewMemberMode ? (
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Buscar missionário pelo nome..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-zinc-200 rounded-xl bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-pastoral-dourado"
                />
              </div>

              {memberSearch.trim() && filteredPastoralMembers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 rounded-xl bg-pastoral-creme/40 border border-pastoral-dourado/20">
                  {filteredPastoralMembers.map((m) => {
                    const cleanName = cleanMissionarySelectorName(m.name);
                    const isSelected = selectedPastoralMemberId === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setSelectedPastoralMemberId(m.id);
                          setMemberSearch('');
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                          isSelected
                            ? 'bg-pastoral-cafe text-white'
                            : 'bg-white text-pastoral-cafe border border-zinc-200 hover:border-pastoral-dourado'
                        }`}
                      >
                        {cleanName}
                      </button>
                    );
                  })}
                </div>
              )}

              <select
                value={selectedPastoralMemberId}
                onChange={(e) => setSelectedPastoralMemberId(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-zinc-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-pastoral-dourado font-medium text-pastoral-cafe"
                required
              >
                <option value="">Selecione um missionário</option>
                {filteredPastoralMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {cleanMissionarySelectorName(m.name)}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-2.5 p-3.5 bg-pastoral-creme/60 rounded-xl border border-pastoral-dourado/30">
              <p className="text-[11px] font-semibold text-pastoral-cafe">
                Novo Cadastro Institucional (Governança)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Nome completo do missionário *"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-xl bg-white"
                />
                <input
                  type="text"
                  placeholder="Nome de exibição / Apelido"
                  value={newMemberDisplayName}
                  onChange={(e) => setNewMemberDisplayName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-xl bg-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="tel"
                  placeholder="Telefone / WhatsApp — ex: (61) 99999-9999"
                  value={newMemberPhone}
                  onChange={(e) => setNewMemberPhone(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs border border-zinc-300 rounded-xl bg-white"
                />
                <button
                  type="button"
                  disabled={isCreatingMember}
                  onClick={handleCreateGovernanceMemberInline}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-pastoral-cafe text-white hover:bg-pastoral-profundo flex items-center gap-1 shrink-0"
                >
                  <Check className="w-3.5 h-3.5 text-pastoral-dourado" />
                  {isCreatingMember ? 'Salvando...' : 'Salvar e Selecionar'}
                </button>
              </div>
            </div>
          )}

          {/* Resumo Discreto do Missionário Selecionado */}
          {selectedMember && (
            <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 font-bold text-pastoral-cafe">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>{cleanMissionarySelectorName(selectedMember.name)}</span>
                  {hasHomonym && selectedMember.display_name && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-semibold">
                      {selectedMember.display_name}
                    </span>
                  )}
                </div>
                {selectedMember.phone && (
                  <div className="flex items-center gap-2 text-[11px] text-zinc-600 pl-5">
                    <span className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-emerald-700" />
                      {selectedMember.phone}
                    </span>
                  </div>
                )}
              </div>

              {onNavigateToGovernance && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateToGovernance();
                  }}
                  className="text-[11px] font-semibold text-emerald-800 hover:underline flex items-center gap-1 self-start sm:self-center"
                >
                  <ExternalLink className="w-3 h-3" />
                  Editar na Governança
                </button>
              )}
            </div>
          )}

          {/* Alerta se o missionário já possui pedido nesta campanha */}
          {existingOrdersForMember.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">
                    Este missionário já possui {existingOrdersForMember.length}{' '}
                    {existingOrdersForMember.length === 1 ? 'pedido' : 'pedidos'} nesta campanha.
                  </p>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Deseja adicionar outro pedido para{' '}
                    {cleanMissionarySelectorName(selectedMember?.name || '')} ou visualizar/editar o
                    pedido existente?
                  </p>
                </div>
              </div>
              {onOpenExistingOrder && (
                <div className="flex items-center gap-2 pl-6">
                  <button
                    type="button"
                    onClick={() => {
                      const target = existingOrdersForMember[0];
                      onClose();
                      onOpenExistingOrder(target);
                    }}
                    className="px-3 py-1 rounded-lg bg-amber-700 text-white font-semibold text-[11px] hover:bg-amber-800"
                  >
                    Abrir Pedido Existente (
                    {existingOrdersForMember[0].items
                      .map((i) => `${i.quantity}x ${i.model} ${i.size}`)
                      .join(', ')}
                    )
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Etapa 2: Camisetas do Pedido */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider">
              Camisetas do Pedido
            </label>
            <span className="text-[11px] text-zinc-500">
              Preço padrão da campanha: <b className="text-pastoral-cafe">{formatCurrency(defaultPrice)}</b>
            </span>
          </div>
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="flex flex-wrap items-center gap-2 p-3 bg-zinc-50 border border-zinc-200 rounded-xl"
              >
                <div className="flex-1 min-w-[125px]">
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

                <div className="w-16">
                  <label className="block text-[10px] text-zinc-500 font-semibold mb-1">Qtd</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value) || 1)}
                    className="w-full text-xs font-semibold px-2 py-1.5 border border-zinc-300 rounded-lg text-center bg-white"
                  />
                </div>

                <div className="w-24">
                  <label className="block text-[10px] text-zinc-500 font-semibold mb-1">
                    Valor Unit. (R$)
                  </label>
                  <input
                    type="text"
                    value={
                      item.unit_price_str !== undefined
                        ? item.unit_price_str
                        : (item.unit_price_cents / 100).toFixed(2).replace('.', ',')
                    }
                    onChange={(e) => handleUnitPriceInputChange(idx, e.target.value)}
                    className="w-full text-xs font-semibold px-2 py-1.5 border border-zinc-300 rounded-lg text-right bg-white"
                  />
                </div>

                <div className="w-24 text-right">
                  <label className="block text-[10px] text-zinc-500 font-semibold mb-1">Subtotal</label>
                  <span className="text-xs font-bold text-pastoral-cafe">
                    {formatCurrency(item.quantity * item.unit_price_cents)}
                  </span>
                </div>

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

        {/* Etapa 3: Estágio de Produção e Pagamento Inicial Opcional */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider mb-1">
              Etapa de Produção
            </label>
            <select
              value={productionStatus}
              onChange={(e) => setProductionStatus(e.target.value as ProductionStatus)}
              className="w-full px-3 py-2 text-xs font-medium border border-zinc-300 rounded-xl bg-white"
            >
              <option value="aguardando_confirmacao">Aguardando confirmação</option>
              <option value="confirmado">Confirmado</option>
              <option value="encomendado">Encomendado ao fornecedor</option>
              <option value="em_producao">Em produção (Confecção)</option>
              <option value="recebido">Recebido pela equipe</option>
              <option value="entregue">Entregue ao membro</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider mb-1">
              Pagamento no Ato / Histórico
            </label>
            <button
              type="button"
              onClick={() => setHasInitialPayment(!hasInitialPayment)}
              className={`w-full px-3 py-2 rounded-xl text-xs font-semibold border flex items-center justify-between transition-all ${
                hasInitialPayment
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-zinc-50 border-zinc-300 text-zinc-600'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5" />
                {hasInitialPayment ? 'Registrar pagamento agora' : 'Pendente (Pagar depois)'}
              </span>
              <span className="text-[10px] underline">
                {hasInitialPayment ? 'Remover' : 'Já pagou?'}
              </span>
            </button>
          </div>
        </div>

        {hasInitialPayment && (
          <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-2.5">
            <p className="text-[11px] font-bold text-emerald-900">
              Dados do Lançamento Financeiro (Vinculado ao Pedido)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-zinc-600 mb-0.5">
                  Valor Pago (R$)
                </label>
                <input
                  type="text"
                  value={paymentAmountReais}
                  onChange={(e) => setPaymentAmountReais(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-zinc-300 rounded-lg bg-white font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-zinc-600 mb-0.5">
                  Forma de Pagamento
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 text-xs border border-zinc-300 rounded-lg bg-white"
                >
                  <option value="pix">Pix</option>
                  <option value="dinheiro">Dinheiro</option>
                  <option value="transferencia">Transferência</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-zinc-600 mb-0.5">
                  Data do Pagamento
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs border border-zinc-300 rounded-lg bg-white"
                />
              </div>
            </div>
            <input
              type="text"
              placeholder="Observação do pagamento (ex: Comprovante Pix verificado)"
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-zinc-300 rounded-lg bg-white"
            />
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider mb-1">
            Observações do Pedido (opcional)
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
            <p className="text-xs text-pastoral-rosa-antigo">Total do Pedido</p>
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
            className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-100"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-pastoral-dourado hover:brightness-105 text-pastoral-profundo shadow-gold transition-all"
          >
            {isSubmitting ? 'Salvando...' : 'Confirmar Pedido'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
