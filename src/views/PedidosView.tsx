import React, { useState, useMemo } from 'react';
import { Order, DashboardKPIs } from '../types';
import { formatCurrency } from '../utils/formatters';
import { PaymentBadge, ProductionBadge, DeliveryBadge } from '../components/common/Badge';
import {
  Search,
  Plus,
  DollarSign,
  MessageCircle,
  CheckSquare,
  Square,
  Eye,
  X,
  Download,
  Users,
  ShoppingBag,
  Shirt,
  Truck,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface PedidosViewProps {
  orders: Order[];
  kpis?: DashboardKPIs | null;
  onOpenNewOrder: () => void;
  onOpenOrderDetails: (order: Order) => void;
  onOpenPayment: (order: Order) => void;
  onOpenDelivery: (order: Order) => void;
  onOpenWhatsApp: (order: Order) => void;
  onBulkUpdateStatus: (orderIds: string[], productionStatus?: string, deliveryStatus?: string) => Promise<void>;
  isLoading: boolean;
}

const PRODUCTION_LABELS: Record<string, string> = {
  aguardando_confirmacao: 'Aguardando confirmação',
  confirmado: 'Confirmado',
  encomendado: 'Encomendado ao fornecedor',
  em_producao: 'Em produção',
  recebido: 'Recebido pela equipe',
  entregue: 'Entregue ao membro',
  cancelado: 'Cancelado',
};

export const PedidosView: React.FC<PedidosViewProps> = ({
  orders,
  kpis,
  onOpenNewOrder,
  onOpenOrderDetails,
  onOpenPayment,
  onOpenDelivery,
  onOpenWhatsApp,
  onBulkUpdateStatus,
}) => {
  const { canEdit } = useAuth();

  // Search & Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPayment, setFilterPayment] = useState<string>('all');
  const [filterProduction, setFilterProduction] = useState<string>('all');
  const [filterDelivery, setFilterDelivery] = useState<string>('all');
  const [filterModel, setFilterModel] = useState<string>('all');
  const [filterSize, setFilterSize] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'balance' | 'total' | 'date'>('name');

  // Multi-select & Confirmation Modal state
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);
  const [pendingBulkAction, setPendingBulkAction] = useState<{
    productionStatus?: string;
    deliveryStatus?: string;
    label: string;
  } | null>(null);

  // Distinct institutional & order counters (Section 6.2)
  const counters = useMemo(() => {
    const activeOrders = orders.filter((o) => o.status !== 'cancelado');
    const uniqueBuyers = new Set(activeOrders.map((o) => o.pastoral_member_id || o.member_id)).size;
    const totalTshirts = activeOrders.reduce(
      (sum, o) => sum + o.items.reduce((s, it) => s + it.quantity, 0),
      0
    );
    const paidCount = activeOrders.filter((o) => o.payment_status === 'pago').length;
    const pendingPayCount = activeOrders.filter((o) => o.payment_status !== 'pago').length;
    const inProdCount = activeOrders.filter((o) => o.production_status === 'em_producao').length;
    const deliveredCount = activeOrders.filter((o) => o.delivery_status === 'entregue').length;

    return {
      pastoralMembers: kpis?.total_pastoral_members || 39,
      uniqueBuyers,
      totalOrders: activeOrders.length,
      totalTshirts,
      paidCount,
      pendingPayCount,
      inProdCount,
      deliveredCount,
    };
  }, [orders, kpis]);

  // Filtered & Sorted orders
  const filteredOrders = useMemo(() => {
    return orders
      .filter((o) => {
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const matchName = o.member_name.toLowerCase().includes(term);
          const matchDisplay = (o.member_display_name || '').toLowerCase().includes(term);
          const matchHist = (o.historical_buyer_name || '').toLowerCase().includes(term);
          const matchPhone = (o.member_phone || '').includes(term);
          const matchNotes = (o.notes || '').toLowerCase().includes(term);
          if (!matchName && !matchDisplay && !matchHist && !matchPhone && !matchNotes) return false;
        }

        if (filterPayment !== 'all' && o.payment_status !== filterPayment) return false;
        if (filterProduction !== 'all' && o.production_status !== filterProduction) return false;
        if (filterDelivery !== 'all' && o.delivery_status !== filterDelivery) return false;

        if (filterModel !== 'all') {
          const hasModel = o.items.some((it) => it.model === filterModel);
          if (!hasModel) return false;
        }
        if (filterSize !== 'all') {
          const hasSize = o.items.some((it) => it.size === filterSize);
          if (!hasSize) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return a.member_name.localeCompare(b.member_name);
        if (sortBy === 'balance') return b.balance_cents - a.balance_cents;
        if (sortBy === 'total') return b.total_amount_cents - a.total_amount_cents;
        if (sortBy === 'date') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        return 0;
      });
  }, [orders, searchTerm, filterPayment, filterProduction, filterDelivery, filterModel, filterSize, sortBy]);

  const handleSelectAll = () => {
    if (selectedOrderIds.length === filteredOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredOrders.map((o) => o.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleConfirmBulkStatus = async () => {
    if (!pendingBulkAction || selectedOrderIds.length === 0) return;
    setIsBulkUpdating(true);
    try {
      await onBulkUpdateStatus(
        selectedOrderIds,
        pendingBulkAction.productionStatus,
        pendingBulkAction.deliveryStatus
      );
      setSelectedOrderIds([]);
      setPendingBulkAction(null);
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Missionario',
      'Apelido',
      'Telefone',
      'Vinculo Institucional',
      'Modelos e Tamanhos',
      'Quantidade Total',
      'Valor Total (R$)',
      'Valor Pago (R$)',
      'Saldo Pendente (R$)',
      'Status Pagamento',
      'Etapa Producao',
      'Status Entrega',
    ];
    const rows = filteredOrders.map((o) => [
      `"${o.member_name.replace(/"/g, '""')}"`,
      `"${(o.member_display_name || '').replace(/"/g, '""')}"`,
      `"${o.member_phone || ''}"`,
      `"${o.pastoral_member_id || 'Legado'}"`,
      `"${o.items.map((i) => `${i.quantity}x ${i.model} (${i.size})`).join('; ')}"`,
      o.items.reduce((s, i) => s + i.quantity, 0),
      (o.total_amount_cents / 100).toFixed(2),
      (o.paid_amount_cents / 100).toFixed(2),
      (o.balance_cents / 100).toFixed(2),
      o.payment_status,
      PRODUCTION_LABELS[o.production_status] || o.production_status,
      o.delivery_status === 'entregue' ? 'Entregue' : 'Pendente',
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pedidos_compradores_pastoral_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const totalFilteredCents = filteredOrders.reduce((acc, o) => acc + o.total_amount_cents, 0);
  const totalPaidFilteredCents = filteredOrders.reduce((acc, o) => acc + o.paid_amount_cents, 0);
  const totalBalanceFilteredCents = filteredOrders.reduce((acc, o) => acc + o.balance_cents, 0);

  const selectedOrdersList = useMemo(
    () => orders.filter((o) => selectedOrderIds.includes(o.id)),
    [orders, selectedOrderIds]
  );

  return (
    <div className="space-y-4">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl font-bold text-pastoral-cafe flex items-center gap-2">
            Pedidos & Compradores
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-pastoral-creme border border-pastoral-dourado/40 font-sans font-semibold text-pastoral-dourado">
              {filteredOrders.length} {filteredOrders.length === 1 ? 'pedido' : 'pedidos'}
            </span>
          </h2>
          <p className="text-xs text-zinc-500">
            Controle de encomendas, pagamentos, produção e entregas integrado aos missionários da Governança.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-zinc-300 text-pastoral-cafe hover:bg-pastoral-creme flex items-center gap-1.5 transition-all"
          >
            <Download className="w-3.5 h-3.5 text-pastoral-dourado" />
            Exportar CSV
          </button>

          {canEdit && (
            <button
              onClick={onOpenNewOrder}
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-pastoral-dourado hover:brightness-105 text-pastoral-profundo shadow-gold flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" /> Novo Pedido
            </button>
          )}
        </div>
      </div>

      {/* Distinct Institutional & Campaign Counters Bar (Section 6.2) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div className="bg-white p-3 rounded-xl border border-zinc-200/80 shadow-xs">
          <div className="flex items-center justify-between text-[11px] text-zinc-500 font-medium">
            <span>Missionários (Gov.)</span>
            <Users className="w-3.5 h-3.5 text-pastoral-dourado" />
          </div>
          <p className="text-lg font-bold text-pastoral-cafe mt-0.5">{counters.pastoralMembers}</p>
          <p className="text-[10px] text-zinc-400">Cadastro institucional</p>
        </div>

        <div className="bg-white p-3 rounded-xl border border-zinc-200/80 shadow-xs">
          <div className="flex items-center justify-between text-[11px] text-zinc-500 font-medium">
            <span>Compradores Únicos</span>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <p className="text-lg font-bold text-pastoral-cafe mt-0.5">{counters.uniqueBuyers}</p>
          <p className="text-[10px] text-zinc-400">Vinculados à campanha</p>
        </div>

        <div className="bg-white p-3 rounded-xl border border-zinc-200/80 shadow-xs">
          <div className="flex items-center justify-between text-[11px] text-zinc-500 font-medium">
            <span>Pedidos Ativos</span>
            <ShoppingBag className="w-3.5 h-3.5 text-pastoral-dourado" />
          </div>
          <p className="text-lg font-bold text-pastoral-cafe mt-0.5">{counters.totalOrders}</p>
          <p className="text-[10px] text-zinc-400">Encomendas registradas</p>
        </div>

        <div className="bg-white p-3 rounded-xl border border-zinc-200/80 shadow-xs">
          <div className="flex items-center justify-between text-[11px] text-zinc-500 font-medium">
            <span>Total de Camisetas</span>
            <Shirt className="w-3.5 h-3.5 text-pastoral-dourado" />
          </div>
          <p className="text-lg font-bold text-pastoral-cafe mt-0.5">{counters.totalTshirts}</p>
          <p className="text-[10px] text-zinc-400">Unidades encomendadas</p>
        </div>

        <div className="bg-white p-3 rounded-xl border border-zinc-200/80 shadow-xs">
          <div className="flex items-center justify-between text-[11px] text-zinc-500 font-medium">
            <span>Pagamentos</span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <p className="text-lg font-bold text-emerald-700 mt-0.5">
            {counters.paidCount} <span className="text-xs font-normal text-zinc-400">/ {counters.totalOrders}</span>
          </p>
          <p className="text-[10px] text-rose-600">{counters.pendingPayCount} pendentes</p>
        </div>

        <div className="bg-white p-3 rounded-xl border border-zinc-200/80 shadow-xs">
          <div className="flex items-center justify-between text-[11px] text-zinc-500 font-medium">
            <span>Produção / Entrega</span>
            <Truck className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <p className="text-lg font-bold text-amber-700 mt-0.5">
            {counters.inProdCount} <span className="text-xs font-normal text-zinc-400">em prod.</span>
          </p>
          <p className="text-[10px] text-emerald-700">{counters.deliveredCount} entregues</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 bg-white rounded-2xl border border-zinc-200/80 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          {/* Search input */}
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar comprador por nome, apelido, telefone ou observações..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-zinc-300 rounded-xl focus:ring-2 focus:ring-pastoral-dourado focus:border-pastoral-dourado bg-zinc-50/50"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
            <select
              value={filterPayment}
              onChange={(e) => setFilterPayment(e.target.value)}
              className="px-2.5 py-2 border border-zinc-300 rounded-xl bg-white font-medium"
            >
              <option value="all">Todos Pagamentos</option>
              <option value="pendente">Pendente</option>
              <option value="parcial">Parcial</option>
              <option value="pago">Quitado</option>
            </select>

            <select
              value={filterProduction}
              onChange={(e) => setFilterProduction(e.target.value)}
              className="px-2.5 py-2 border border-zinc-300 rounded-xl bg-white font-medium"
            >
              <option value="all">Todas Etapas Prod.</option>
              <option value="aguardando_confirmacao">Aguardando Conf.</option>
              <option value="confirmado">Confirmado</option>
              <option value="encomendado">Encomendado</option>
              <option value="em_producao">Em produção</option>
              <option value="recebido">Recebido pela equipe</option>
              <option value="entregue">Entregue</option>
            </select>

            <select
              value={filterDelivery}
              onChange={(e) => setFilterDelivery(e.target.value)}
              className="px-2.5 py-2 border border-zinc-300 rounded-xl bg-white font-medium"
            >
              <option value="all">Todas Entregas</option>
              <option value="nao_entregue">Não entregue</option>
              <option value="entregue">Entregue</option>
            </select>

            <select
              value={filterModel}
              onChange={(e) => setFilterModel(e.target.value)}
              className="px-2.5 py-2 border border-zinc-300 rounded-xl bg-white font-medium"
            >
              <option value="all">Todos Modelos</option>
              <option value="Tradicional">Tradicional</option>
              <option value="Baby look">Baby look</option>
            </select>

            <select
              value={filterSize}
              onChange={(e) => setFilterSize(e.target.value)}
              className="px-2.5 py-2 border border-zinc-300 rounded-xl bg-white font-medium"
            >
              <option value="all">Todos Tamanhos</option>
              {['PP', 'P', 'M', 'G', 'GG', 'XG'].map((s) => (
                <option key={s} value={s}>
                  Tam. {s}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2.5 py-2 border border-zinc-300 rounded-xl bg-white font-medium"
            >
              <option value="name">Ordenar: Nome A-Z</option>
              <option value="balance">Ordenar: Maior Pendência</option>
              <option value="total">Ordenar: Maior Valor</option>
              <option value="date">Ordenar: Mais Recentes</option>
            </select>
          </div>
        </div>

        {/* Totals Summary Banner for Current Filter */}
        <div className="pt-2 border-t border-zinc-100 flex flex-wrap items-center justify-between text-xs text-zinc-600 gap-2">
          <div className="flex flex-wrap items-center gap-4">
            <span>
              Total Filtrado: <b className="text-pastoral-cafe">{formatCurrency(totalFilteredCents)}</b>
            </span>
            <span>
              Arrecadado: <b className="text-emerald-700">{formatCurrency(totalPaidFilteredCents)}</b>
            </span>
            <span>
              Pendente: <b className="text-rose-700">{formatCurrency(totalBalanceFilteredCents)}</b>
            </span>
          </div>

          {(searchTerm ||
            filterPayment !== 'all' ||
            filterProduction !== 'all' ||
            filterDelivery !== 'all' ||
            filterModel !== 'all' ||
            filterSize !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterPayment('all');
                setFilterProduction('all');
                setFilterDelivery('all');
                setFilterModel('all');
                setFilterSize('all');
              }}
              className="text-xs text-pastoral-dourado font-semibold hover:underline"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Bulk Action Bar (when orders selected) */}
      {selectedOrderIds.length > 0 && canEdit && (
        <div className="p-3 bg-pastoral-profundo text-white rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-pastoral animate-fade-in">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-pastoral-dourado" />
            {selectedOrderIds.length} {selectedOrderIds.length === 1 ? 'pedido selecionado' : 'pedidos selecionados'}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-zinc-400 mr-1">Alterar etapa em lote:</span>
            <button
              onClick={() =>
                setPendingBulkAction({
                  productionStatus: 'aguardando_confirmacao',
                  label: 'Aguardando confirmação',
                })
              }
              disabled={isBulkUpdating}
              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-600 font-medium"
            >
              Aguardando Conf.
            </button>
            <button
              onClick={() =>
                setPendingBulkAction({
                  productionStatus: 'confirmado',
                  label: 'Confirmado',
                })
              }
              disabled={isBulkUpdating}
              className="px-2.5 py-1 rounded-lg bg-blue-900/60 hover:bg-blue-800 text-blue-200 border border-blue-700 font-medium"
            >
              Confirmado
            </button>
            <button
              onClick={() =>
                setPendingBulkAction({
                  productionStatus: 'em_producao',
                  label: 'Em produção',
                })
              }
              disabled={isBulkUpdating}
              className="px-2.5 py-1 rounded-lg bg-amber-900/60 hover:bg-amber-800 text-amber-200 border border-amber-700 font-medium"
            >
              Em produção
            </button>
            <button
              onClick={() =>
                setPendingBulkAction({
                  productionStatus: 'recebido',
                  label: 'Recebido pela equipe',
                })
              }
              disabled={isBulkUpdating}
              className="px-2.5 py-1 rounded-lg bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-700 font-medium"
            >
              Recebido pela equipe
            </button>
            <button
              onClick={() =>
                setPendingBulkAction({
                  productionStatus: 'entregue',
                  deliveryStatus: 'entregue',
                  label: 'Entregue ao membro',
                })
              }
              disabled={isBulkUpdating}
              className="px-2.5 py-1 rounded-lg bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 border border-emerald-700 font-medium"
            >
              Entregue
            </button>
            <button
              onClick={() => setSelectedOrderIds([])}
              className="px-2 py-1 text-zinc-400 hover:text-white"
            >
              Desmarcar
            </button>
          </div>
        </div>
      )}

      {/* Mobile Compact Cards View (< 768px) */}
      <div className="md:hidden space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-zinc-200 text-xs text-zinc-400">
            Nenhum pedido encontrado para os filtros selecionados.
          </div>
        ) : (
          filteredOrders.map((o) => (
            <div
              key={o.id}
              className="p-4 bg-white rounded-2xl border border-zinc-200/80 shadow-sm space-y-3 active:bg-zinc-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => handleToggleSelect(o.id)}
                      className="p-1 text-zinc-400 hover:text-pastoral-dourado"
                    >
                      {selectedOrderIds.includes(o.id) ? (
                        <CheckSquare className="w-5 h-5 text-pastoral-dourado" />
                      ) : (
                        <Square className="w-5 h-5 text-zinc-300" />
                      )}
                    </button>
                  )}
                  <div>
                    <h3 className="font-bold text-sm text-pastoral-cafe">{o.member_name}</h3>
                    <p className="text-[11px] text-zinc-500">
                      {o.member_phone || 'Sem telefone'}
                      {o.pastoral_member_id && (
                        <span className="ml-1.5 text-[10px] text-emerald-700 font-semibold">
                          • Vinculado à Governança
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <PaymentBadge status={o.payment_status} />
                  <ProductionBadge status={o.production_status} />
                </div>
              </div>

              {/* Items */}
              <div className="p-2.5 bg-pastoral-creme/50 rounded-xl text-xs space-y-1">
                {o.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between font-medium text-pastoral-cafe">
                    <span>
                      {it.quantity}x {it.model} (Tam. <b className="text-pastoral-dourado">{it.size}</b>)
                    </span>
                    <span className="font-bold">{formatCurrency(it.total_price_cents)}</span>
                  </div>
                ))}
              </div>

              {/* Balances and Actions */}
              <div className="flex items-center justify-between pt-1 border-t border-zinc-100">
                <div className="text-xs">
                  <span className="text-zinc-500">Pendente: </span>
                  <b className={o.balance_cents > 0 ? 'text-rose-600' : 'text-emerald-700'}>
                    {formatCurrency(o.balance_cents)}
                  </b>
                </div>

                <div className="flex items-center gap-1.5">
                  {canEdit && o.balance_cents > 0 && (
                    <button
                      onClick={() => onOpenPayment(o)}
                      className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-600 text-white shadow-sm flex items-center gap-1"
                    >
                      <DollarSign className="w-3.5 h-3.5" /> Pagar
                    </button>
                  )}

                  {canEdit && o.delivery_status !== 'entregue' && (
                    <button
                      onClick={() => onOpenDelivery(o)}
                      className="px-2 py-1 text-xs font-semibold rounded-lg bg-amber-50 text-amber-800 border border-amber-300"
                    >
                      Entregar
                    </button>
                  )}

                  <button
                    onClick={() => onOpenWhatsApp(o)}
                    className="p-1.5 rounded-lg text-emerald-700 bg-emerald-50 border border-emerald-300"
                    title="WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onOpenOrderDetails(o)}
                    className="p-1.5 rounded-lg text-zinc-600 bg-zinc-100"
                    title="Ver Detalhes"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop Table View (>= 768px) */}
      <div className="hidden md:block bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-pastoral-profundo text-white font-semibold">
              <tr>
                {canEdit && (
                  <th className="px-4 py-3 w-8">
                    <button onClick={handleSelectAll} className="text-zinc-300 hover:text-white">
                      {selectedOrderIds.length > 0 && selectedOrderIds.length === filteredOrders.length ? (
                        <CheckSquare className="w-4 h-4 text-pastoral-dourado" />
                      ) : (
                        <Square className="w-4 h-4 text-zinc-400" />
                      )}
                    </button>
                  </th>
                )}
                <th className="px-4 py-3">Missionário / Comprador</th>
                <th className="px-3 py-3">Modelo</th>
                <th className="px-3 py-3 text-center">Tam</th>
                <th className="px-3 py-3 text-center">Qtd</th>
                <th className="px-3 py-3 text-right">Valor Total</th>
                <th className="px-3 py-3 text-right">Pago</th>
                <th className="px-3 py-3 text-right">Pendente</th>
                <th className="px-3 py-3 text-center">Pagamento</th>
                <th className="px-3 py-3 text-center">Produção</th>
                <th className="px-3 py-3 text-center">Entrega</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-zinc-400">
                    Nenhum pedido encontrado.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => {
                  const isSelected = selectedOrderIds.includes(o.id);
                  const firstItem = o.items[0] || { model: 'Tradicional', size: 'M', quantity: 1 };
                  return (
                    <tr
                      key={o.id}
                      className={`hover:bg-pastoral-creme/30 transition-colors ${
                        isSelected ? 'bg-pastoral-creme/60' : ''
                      }`}
                    >
                      {canEdit && (
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleToggleSelect(o.id)}
                            className="text-zinc-400 hover:text-pastoral-dourado"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-pastoral-dourado" />
                            ) : (
                              <Square className="w-4 h-4 text-zinc-300" />
                            )}
                          </button>
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="font-bold text-pastoral-cafe hover:underline cursor-pointer"
                            onClick={() => onOpenOrderDetails(o)}
                          >
                            {o.member_name}
                          </span>
                          {o.pastoral_member_id && (
                            <span
                              title="Vinculado ao Cadastro Institucional da Governança"
                              className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"
                            >
                              Gov
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-zinc-500 flex items-center gap-2">
                          <span>{o.member_phone || 'Sem telefone'}</span>
                          {o.historical_buyer_name &&
                            o.historical_buyer_name !== o.member_name && (
                              <span className="text-zinc-400 italic">
                                (Planilha: {o.historical_buyer_name})
                              </span>
                            )}
                        </div>
                      </td>
                      <td className="px-3 py-3 font-medium text-zinc-700">
                        {firstItem.model}
                        {o.items.length > 1 && ` (+${o.items.length - 1})`}
                      </td>
                      <td className="px-3 py-3 text-center font-bold text-pastoral-dourado">
                        {firstItem.size}
                      </td>
                      <td className="px-3 py-3 text-center text-zinc-700 font-semibold">
                        {o.items.reduce((acc, it) => acc + it.quantity, 0)}
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-pastoral-cafe">
                        {formatCurrency(o.total_amount_cents)}
                      </td>
                      <td className="px-3 py-3 text-right text-emerald-700 font-semibold">
                        {formatCurrency(o.paid_amount_cents)}
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-rose-600">
                        {formatCurrency(o.balance_cents)}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <PaymentBadge status={o.payment_status} />
                      </td>
                      <td className="px-3 py-3 text-center">
                        <ProductionBadge status={o.production_status} />
                      </td>
                      <td className="px-3 py-3 text-center">
                        <DeliveryBadge status={o.delivery_status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canEdit && o.balance_cents > 0 && (
                            <button
                              onClick={() => onOpenPayment(o)}
                              className="px-2 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
                              title="Registrar pagamento"
                            >
                              Pagar
                            </button>
                          )}

                          {canEdit && o.delivery_status !== 'entregue' && (
                            <button
                              onClick={() => onOpenDelivery(o)}
                              className="px-2 py-1 rounded-lg text-[11px] font-semibold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 transition-colors"
                              title="Registrar entrega da camiseta"
                            >
                              Entregar
                            </button>
                          )}

                          <button
                            onClick={() => onOpenWhatsApp(o)}
                            className="p-1 rounded-lg text-emerald-700 hover:bg-emerald-50 border border-emerald-300"
                            title="WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onOpenOrderDetails(o)}
                            className="p-1 rounded-lg text-zinc-600 hover:bg-zinc-100 border border-zinc-200"
                            title="Ver Detalhes Completos"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Confirmação de Alteração em Lote (Seção 11.7) */}
      {pendingBulkAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-pastoral-profundo/75 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-pastoral-dourado/30 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-pastoral-cafe">
                    Confirmar Alteração em Lote
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Você está prestes a atualizar {selectedOrdersList.length}{' '}
                    {selectedOrdersList.length === 1 ? 'pedido' : 'pedidos'}.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPendingBulkAction(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-pastoral-creme/60 border border-pastoral-dourado/30 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Etapa de destino:</span>
                <span className="font-bold text-pastoral-cafe px-2 py-0.5 rounded bg-pastoral-dourado/20">
                  {pendingBulkAction.label}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500">
                Os pagamentos e saldos financeiros não serão alterados por esta ação.
              </p>
            </div>

            <div className="max-h-48 overflow-y-auto border border-zinc-200 rounded-xl divide-y divide-zinc-100 text-xs">
              {selectedOrdersList.map((ord) => (
                <div key={ord.id} className="px-3 py-2 flex items-center justify-between">
                  <span className="font-semibold text-pastoral-cafe truncate mr-2">
                    {ord.member_name}
                  </span>
                  <span className="text-[11px] text-zinc-500 shrink-0">
                    Atual: <b>{PRODUCTION_LABELS[ord.production_status] || ord.production_status}</b>
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPendingBulkAction(null)}
                disabled={isBulkUpdating}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkStatus}
                disabled={isBulkUpdating}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-pastoral-dourado text-pastoral-profundo hover:brightness-105 shadow-gold"
              >
                {isBulkUpdating ? 'Atualizando...' : 'Confirmar Atualização'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
