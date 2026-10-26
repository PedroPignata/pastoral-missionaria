import React, { useState, useMemo } from 'react';
import { Payment, Order, PaymentMethod } from '../types';
import { formatCurrency, formatDate, formatDateTime, PAYMENT_METHODS_MAP } from '../utils/formatters';
import { DollarSign, CheckCircle2, Clock, RotateCcw, Search, MessageCircle, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

interface FinanceiroViewProps {
  payments: Payment[];
  orders: Order[];
  onOpenPaymentForOrder: (order: Order) => void;
  onOpenWhatsApp: (order: Order) => void;
  onRefresh: () => void;
}

export const FinanceiroView: React.FC<FinanceiroViewProps> = ({
  payments,
  orders,
  onOpenPaymentForOrder,
  onOpenWhatsApp,
  onRefresh,
}) => {
  const { canEdit, isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<'pagamentos' | 'pendencias'>('pagamentos');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMethod, setFilterMethod] = useState<string>('all');

  // Reverse payment modal
  const [reversingPayment, setReversingPayment] = useState<Payment | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [isSubmittingReversal, setIsSubmittingReversal] = useState(false);

  // Financial metrics calculated from orders & payments
  const totalPrevistoCents = orders.filter(o => o.status !== 'cancelado').reduce((acc, o) => acc + o.total_amount_cents, 0);
  const totalArrecadadoCents = orders.filter(o => o.status !== 'cancelado').reduce((acc, o) => acc + o.paid_amount_cents, 0);
  const totalPendenteCents = orders.filter(o => o.status !== 'cancelado').reduce((acc, o) => acc + o.balance_cents, 0);
  const percentCollected = totalPrevistoCents > 0 ? Math.round((totalArrecadadoCents * 100) / totalPrevistoCents) : 0;

  // Filtered payments
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (filterMethod !== 'all' && p.payment_method !== filterMethod) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        return (
          (p.member_name || '').toLowerCase().includes(term) ||
          (p.notes || '').toLowerCase().includes(term) ||
          (p.recorded_by || '').toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [payments, filterMethod, searchTerm]);

  // Pending orders
  const pendingOrders = useMemo(() => {
    return orders
      .filter((o) => o.status !== 'cancelado' && o.balance_cents > 0)
      .sort((a, b) => b.balance_cents - a.balance_cents);
  }, [orders]);

  const handleExecuteReversal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversingPayment || !reversalReason.trim()) return;

    setIsSubmittingReversal(true);
    try {
      await api.reversePayment(reversingPayment.id, reversalReason.trim());
      setReversingPayment(null);
      setReversalReason('');
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Erro ao estornar pagamento.');
    } finally {
      setIsSubmittingReversal(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="font-serif text-xl font-bold text-pastoral-cafe flex items-center gap-2">
          Controle Financeiro da Pastoral
        </h2>
        <p className="text-xs text-zinc-500">
          Controle de caixa, conciliação de pagamentos parciais e integrais em centavos exatos
        </p>
      </div>

      {/* KPI Financial Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Previsto */}
        <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-sm">
          <div className="flex items-center justify-between text-zinc-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Previsto</span>
            <DollarSign className="w-4 h-4 text-pastoral-dourado" />
          </div>
          <p className="font-serif font-bold text-2xl text-pastoral-cafe">
            {formatCurrency(totalPrevistoCents)}
          </p>
          <p className="text-[11px] text-zinc-400 mt-0.5">Meta da campanha ativa</p>
        </div>

        {/* Total Arrecadado */}
        <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-sm">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Efetivamente Arrecadado</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="font-serif font-bold text-2xl text-emerald-700">
            {formatCurrency(totalArrecadadoCents)}
          </p>
          <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
            {percentCollected}% da arrecadação
          </p>
        </div>

        {/* Saldo Pendente */}
        <div className="bg-white p-4 rounded-2xl border border-rose-200 bg-rose-50/20 shadow-sm">
          <div className="flex items-center justify-between text-rose-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Ainda Pendente</span>
            <Clock className="w-4 h-4 text-rose-600" />
          </div>
          <p className="font-serif font-bold text-2xl text-rose-700">
            {formatCurrency(totalPendenteCents)}
          </p>
          <p className="text-[11px] text-rose-600 mt-0.5">
            {pendingOrders.length} pedido(s) a quitar
          </p>
        </div>

        {/* Pedidos Quitados */}
        <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-sm">
          <div className="flex items-center justify-between text-zinc-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pedidos Quitados</span>
            <CheckCircle2 className="w-4 h-4 text-pastoral-dourado" />
          </div>
          <p className="font-serif font-bold text-2xl text-pastoral-cafe">
            {orders.filter((o) => o.payment_status === 'pago').length} / {orders.length}
          </p>
          <p className="text-[11px] text-zinc-400 mt-0.5">100% quitados</p>
        </div>
      </div>

      {/* Tabs: Extrato de Pagamentos vs Lista de Pendências */}
      <div className="flex items-center gap-3 border-b border-zinc-200 pb-2">
        <button
          onClick={() => setActiveTab('pagamentos')}
          className={`pb-2 px-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'pagamentos'
              ? 'border-pastoral-dourado text-pastoral-cafe'
              : 'border-transparent text-zinc-400 hover:text-zinc-600'
          }`}
        >
          Extrato de Pagamentos ({payments.length})
        </button>
        <button
          onClick={() => setActiveTab('pendencias')}
          className={`pb-2 px-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'pendencias'
              ? 'border-pastoral-dourado text-pastoral-cafe'
              : 'border-transparent text-zinc-400 hover:text-zinc-600'
          }`}
        >
          Lista de Pendências ({pendingOrders.length})
        </button>
      </div>

      {/* TAB 1: Extrato de Pagamentos */}
      {activeTab === 'pagamentos' && (
        <div className="space-y-4">
          <div className="p-4 bg-white rounded-2xl border border-zinc-200/80 shadow-sm flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
              <input
                type="text"
                placeholder="Buscar por membro ou responsável pelo lançamento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-zinc-300 rounded-xl bg-zinc-50/50"
              />
            </div>
            <select
              value={filterMethod}
              onChange={(e) => setFilterMethod(e.target.value)}
              className="px-3 py-2 text-xs border border-zinc-300 rounded-xl bg-white font-medium"
            >
              <option value="all">Todas as Formas de Pagamento</option>
              <option value="pix">Pix</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="transferencia">Transferência</option>
              <option value="outro">Outro</option>
            </select>
          </div>

          <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-pastoral-profundo text-white font-semibold">
                  <tr>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Membro</th>
                    <th className="px-3 py-3 text-right">Valor Pago</th>
                    <th className="px-3 py-3 text-center">Forma</th>
                    <th className="px-3 py-3">Lançado Por</th>
                    <th className="px-3 py-3">Observações</th>
                    <th className="px-3 py-3 text-center">Status</th>
                    {isAdmin && <th className="px-4 py-3 text-right">Ação</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-zinc-400">
                        Nenhum pagamento encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((p) => (
                      <tr
                        key={p.id}
                        className={`hover:bg-zinc-50/50 ${
                          p.is_reversed ? 'bg-zinc-100/70 text-zinc-400 line-through' : ''
                        }`}
                      >
                        <td className="px-4 py-3 font-medium">{formatDate(p.payment_date)}</td>
                        <td className="px-4 py-3 font-bold text-pastoral-cafe">{p.member_name}</td>
                        <td className="px-3 py-3 text-right font-bold text-emerald-700">
                          {formatCurrency(p.amount_cents)}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 font-semibold text-[11px]">
                            {PAYMENT_METHODS_MAP[p.payment_method] || p.payment_method}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-zinc-600">{p.recorded_by}</td>
                        <td className="px-3 py-3 text-zinc-500 italic">{p.notes || '-'}</td>
                        <td className="px-3 py-3 text-center">
                          {p.is_reversed ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-100 text-rose-800 font-bold">
                              Estornado
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold">
                              Válido
                            </span>
                          )}
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-3 text-right">
                            {!p.is_reversed && (
                              <button
                                onClick={() => setReversingPayment(p)}
                                className="text-[11px] text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 ml-auto"
                                title="Estornar pagamento com auditoria"
                              >
                                <RotateCcw className="w-3.5 h-3.5" /> Estornar
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Lista de Pendências */}
      {activeTab === 'pendencias' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {pendingOrders.map((o) => (
              <div
                key={o.id}
                className="p-4 bg-white rounded-2xl border border-rose-200/70 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-sm text-pastoral-cafe">{o.member_name}</h3>
                    <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                      Pendente: {formatCurrency(o.balance_cents)}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-500 mb-2">
                    {o.items.map((it) => `${it.quantity}x ${it.model} (${it.size})`).join(', ')}
                  </p>

                  <div className="p-2.5 bg-zinc-50 rounded-xl text-[11px] space-y-0.5">
                    <p className="text-zinc-600">
                      Total do Pedido: <b>{formatCurrency(o.total_amount_cents)}</b>
                    </p>
                    <p className="text-emerald-700">
                      Já Recebido: <b>{formatCurrency(o.paid_amount_cents)}</b>
                    </p>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-zinc-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onOpenWhatsApp(o)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100 flex items-center gap-1"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" /> Cobrança
                  </button>

                  {canEdit && (
                    <button
                      onClick={() => onOpenPaymentForOrder(o)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm flex items-center gap-1"
                    >
                      <DollarSign className="w-3.5 h-3.5" /> Registrar Pagamento
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reversal Confirmation Modal */}
      {reversingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-pastoral-profundo/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-serif font-bold text-base text-pastoral-cafe flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-rose-600" />
              Confirmar Estorno de Pagamento
            </h3>

            <p className="text-xs text-zinc-600">
              Você está prestes a estornar o pagamento de{' '}
              <b>{formatCurrency(reversingPayment.amount_cents)}</b> de{' '}
              <b>{reversingPayment.member_name}</b>. O saldo do pedido será recalculado imediatamente e uma trilha de auditoria será gravada.
            </p>

            <form onSubmit={handleExecuteReversal} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider mb-1">
                  Justificativa do Estorno *
                </label>
                <textarea
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  placeholder="Ex.: Lançamento feito em duplicidade; membro solicitou devolução autorizada pela coordenação"
                  rows={3}
                  className="w-full p-2.5 text-xs border border-zinc-300 rounded-xl"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReversingPayment(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 hover:bg-zinc-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReversal}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md"
                >
                  {isSubmittingReversal ? 'Estornando...' : 'Confirmar Estorno'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

