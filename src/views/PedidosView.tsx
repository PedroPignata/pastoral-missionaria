import React, { useState, useMemo } from 'react';
import { Order, PaymentStatus, ProductionStatus, DeliveryStatus, TShirtModel, TShirtSize } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { PaymentBadge, ProductionBadge, DeliveryBadge } from '../components/common/Badge';
import {
  Search,
  Filter,
  Plus,
  DollarSign,
  Truck,
  MessageCircle,
  MoreVertical,
  CheckSquare,
  Square,
  Eye,
  RefreshCw,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface PedidosViewProps {
  orders: Order[];
  onOpenNewOrder: () => void;
  onOpenOrderDetails: (order: Order) => void;
  onOpenPayment: (order: Order) => void;
  onOpenDelivery: (order: Order) => void;
  onOpenWhatsApp: (order: Order) => void;
  onBulkUpdateStatus: (orderIds: string[], productionStatus?: string, deliveryStatus?: string) => Promise<void>;
  isLoading: boolean;
}

export const PedidosView: React.FC<PedidosViewProps> = ({
  orders,
  onOpenNewOrder,
  onOpenOrderDetails,
  onOpenPayment,
  onOpenDelivery,
  onOpenWhatsApp,
  onBulkUpdateStatus,
  isLoading,
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

  // Multi-select state
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  // Filtered & Sorted orders
  const filteredOrders = useMemo(() => {
    return orders
      .filter((o) => {
        // Search
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const matchName = o.member_name.toLowerCase().includes(term);
          const matchPhone = (o.member_phone || '').includes(term);
          const matchNotes = (o.notes || '').toLowerCase().includes(term);
          if (!matchName && !matchPhone && !matchNotes) return false;
        }

        // Payment status
        if (filterPayment !== 'all' && o.payment_status !== filterPayment) return false;

        // Production status
        if (filterProduction !== 'all' && o.production_status !== filterProduction) return false;

        // Delivery status
        if (filterDelivery !== 'all' && o.delivery_status !== filterDelivery) return false;

        // Model & Size (checks order items)
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

  // Handle Select All
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

  const handleExecuteBulkStatus = async (productionStatus?: string, deliveryStatus?: string) => {
    if (selectedOrderIds.length === 0) return;
    setIsBulkUpdating(true);
    try {
      await onBulkUpdateStatus(selectedOrderIds, productionStatus, deliveryStatus);
      setSelectedOrderIds([]);
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const totalFilteredCents = filteredOrders.reduce((acc, o) => acc + o.total_amount_cents, 0);
  const totalPaidFilteredCents = filteredOrders.reduce((acc, o) => acc + o.paid_amount_cents, 0);
  const totalBalanceFilteredCents = filteredOrders.reduce((acc, o) => acc + o.balance_cents, 0);

  return (
    <div className="space-y-4">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl font-bold text-pastoral-cafe flex items-center gap-2">
            Gestão de Pedidos
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-pastoral-creme border border-pastoral-dourado/40 font-sans font-semibold text-pastoral-dourado">
              {filteredOrders.length} {filteredOrders.length === 1 ? 'pedido' : 'pedidos'}
            </span>
          </h2>
          <p className="text-xs text-zinc-500">
            Filtre por tamanho, modelo, pagamento e gerencie confirmações e entregas
          </p>
        </div>

        {canEdit && (
          <button
            onClick={onOpenNewOrder}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-pastoral-dourado hover:brightness-105 text-pastoral-profundo shadow-gold flex items-center justify-center gap-1.5 transition-all active:scale-95 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" /> Novo Pedido
          </button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 bg-white rounded-2xl border border-zinc-200/80 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search input */}
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar por nome do membro, telefone ou observações..."
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {/* Payment filter */}
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

            {/* Model filter */}
            <select
              value={filterModel}
              onChange={(e) => setFilterModel(e.target.value)}
              className="px-2.5 py-2 border border-zinc-300 rounded-xl bg-white font-medium"
            >
              <option value="all">Todos Modelos</option>
              <option value="Tradicional">Tradicional</option>
              <option value="Baby look">Baby look</option>
            </select>

            {/* Size filter */}
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

            {/* Sort by */}
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

          {(searchTerm || filterPayment !== 'all' || filterModel !== 'all' || filterSize !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterPayment('all');
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
            {selectedOrderIds.length} pedidos selecionados
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-zinc-400">Marcar em lote:</span>
            <button
              onClick={() => handleExecuteBulkStatus('confirmado')}
              disabled={isBulkUpdating}
              className="px-2.5 py-1 rounded-lg bg-blue-900/60 hover:bg-blue-800 text-blue-200 border border-blue-700 font-medium"
            >
              Confirmado
            </button>
            <button
              onClick={() => handleExecuteBulkStatus('encomendado')}
              disabled={isBulkUpdating}
              className="px-2.5 py-1 rounded-lg bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 border border-indigo-700 font-medium"
            >
              Encomendado
            </button>
            <button
              onClick={() => handleExecuteBulkStatus('entregue', 'entregue')}
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
                    <p className="text-[11px] text-zinc-400">{o.member_phone || 'Sem telefone'}</p>
                  </div>
                </div>
                <PaymentBadge status={o.payment_status} />
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
                <th className="px-4 py-3">Membro</th>
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
                        <div
                          className="font-bold text-pastoral-cafe hover:underline cursor-pointer"
                          onClick={() => onOpenOrderDetails(o)}
                        >
                          {o.member_name}
                        </div>
                        <div className="text-[10px] text-zinc-400">{o.member_phone || '-'}</div>
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
                            title="Ver Detalhes"
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
    </div>
  );
};

