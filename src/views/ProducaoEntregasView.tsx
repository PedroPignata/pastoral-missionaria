import React, { useState, useEffect } from 'react';
import { Order, ProductionStatus } from '../types';
import { formatCurrency, formatDate, PRODUCTION_STATUS_CONFIG } from '../utils/formatters';
import { api } from '../services/api';
import { Truck, Copy, Check, Printer, FileText, ChevronRight, AlertTriangle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ProducaoEntregasViewProps {
  orders: Order[];
  onOpenDelivery: (order: Order) => void;
  onRefresh: () => void;
}

const STAGES: { key: ProductionStatus; title: string; color: string }[] = [
  { key: 'aguardando_confirmacao', title: '1. Aguardando Confirmação', color: 'border-slate-300' },
  { key: 'confirmado', title: '2. Confirmado', color: 'border-blue-400' },
  { key: 'encomendado', title: '3. Encomendado Fornecedor', color: 'border-indigo-400' },
  { key: 'em_producao', title: '4. Em Produção', color: 'border-amber-400' },
  { key: 'recebido', title: '5. Recebido na Pastoral', color: 'border-purple-400' },
  { key: 'entregue', title: '6. Entregue ao Membro', color: 'border-emerald-400' },
];

export const ProducaoEntregasView: React.FC<ProducaoEntregasViewProps> = ({
  orders,
  onOpenDelivery,
  onRefresh,
}) => {
  const { canEdit } = useAuth();
  const [viewMode, setViewMode] = useState<'kanban' | 'fornecedor'>('kanban');

  // Supplier report data
  const [supplierReport, setSupplierReport] = useState<{
    grouped: Record<string, { sizes: { size: string; quantity: number }[]; total: number }>;
    grandTotal: number;
    formattedText: string;
  } | null>(null);

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.getSupplierReport()
      .then(setSupplierReport)
      .catch(console.error);
  }, [orders]);

  const handleAdvanceStage = async (order: Order, nextStage: ProductionStatus) => {
    if (nextStage === 'entregue') {
      onOpenDelivery(order);
      return;
    }
    try {
      await api.updateOrder(order.id, { production_status: nextStage });
      onRefresh();
    } catch (err: any) {
      alert('Erro ao atualizar etapa: ' + err.message);
    }
  };

  const handleCopySupplierText = () => {
    if (!supplierReport) return;
    navigator.clipboard.writeText(supplierReport.formattedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrintSupplier = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl font-bold text-pastoral-cafe flex items-center gap-2">
            Produção e Entregas
          </h2>
          <p className="text-xs text-zinc-500">
            Acompanhe o fluxo fabril dos pedidos e gere o relatório consolidado para o fornecedor
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('kanban')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'kanban'
                ? 'bg-pastoral-cafe text-white shadow-sm'
                : 'bg-white text-zinc-600 border border-zinc-200'
            }`}
          >
            Pipeline / Kanban
          </button>
          <button
            onClick={() => setViewMode('fornecedor')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === 'fornecedor'
                ? 'bg-pastoral-cafe text-white shadow-sm'
                : 'bg-white text-zinc-600 border border-zinc-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-pastoral-dourado" /> Relatório Fornecedor
          </button>
        </div>
      </div>

      {/* VIEW 1: KANBAN PIPELINE */}
      {viewMode === 'kanban' && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-[1200px]">
            {STAGES.map((st, idx) => {
              const stageOrders = orders.filter((o) => o.production_status === st.key && o.status !== 'cancelado');
              const nextStage = STAGES[idx + 1]?.key;

              return (
                <div
                  key={st.key}
                  className={`flex-1 bg-zinc-50 rounded-2xl border-t-4 ${st.color} border border-zinc-200/80 p-3 flex flex-col justify-between min-h-[500px]`}
                >
                  {/* Column Header */}
                  <div>
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-200">
                      <h3 className="font-bold text-xs text-pastoral-cafe">{st.title}</h3>
                      <span className="w-5 h-5 rounded-full bg-pastoral-creme text-pastoral-cafe font-bold text-[10px] flex items-center justify-center border border-pastoral-dourado/30">
                        {stageOrders.length}
                      </span>
                    </div>

                    {/* Cards List */}
                    <div className="space-y-2.5">
                      {stageOrders.length === 0 ? (
                        <p className="text-[11px] text-zinc-400 text-center py-8 italic">
                          Nenhum pedido nesta etapa
                        </p>
                      ) : (
                        stageOrders.map((o) => (
                          <div
                            key={o.id}
                            className="p-3 bg-white rounded-xl border border-zinc-200/90 shadow-xs space-y-2 hover:border-pastoral-dourado/50 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-1">
                              <p className="font-bold text-xs text-pastoral-cafe leading-tight">
                                {o.member_name}
                              </p>
                              {o.balance_cents > 0 && (
                                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                                  {formatCurrency(o.balance_cents)}
                                </span>
                              )}
                            </div>

                            {/* Items */}
                            <div className="text-[11px] text-zinc-600 space-y-0.5 bg-zinc-50 p-2 rounded-lg">
                              {o.items.map((it, itemIdx) => (
                                <p key={itemIdx}>
                                  <b>{it.quantity}x</b> {it.model} (Tam. <b className="text-pastoral-dourado">{it.size}</b>)
                                </p>
                              ))}
                            </div>

                            {/* Advance stage button */}
                            {canEdit && nextStage && (
                              <button
                                onClick={() => handleAdvanceStage(o, nextStage)}
                                className="w-full mt-1 py-1 px-2 rounded-lg text-[10px] font-semibold bg-pastoral-creme hover:bg-pastoral-creme-escuro text-pastoral-cafe border border-pastoral-dourado/30 flex items-center justify-center gap-1 transition-colors"
                              >
                                Avançar para etapa seguinte <ChevronRight className="w-3 h-3" />
                              </button>
                            )}

                            {/* If already delivered, show date and recipient */}
                            {o.delivery_status === 'entregue' && (
                              <p className="text-[10px] text-emerald-700 font-semibold pt-1">
                                ✓ Entregue em {formatDate(o.delivery_date)} para {o.delivered_to || o.member_name}
                              </p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: SUPPLIER CONSOLIDATED REPORT */}
      {viewMode === 'fornecedor' && supplierReport && (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 max-w-4xl mx-auto space-y-6">
          {/* Action Toolbar */}
          <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
            <div>
              <h3 className="font-serif font-bold text-lg text-pastoral-cafe">
                Resumo Consolidado para o Fornecedor de Camisetas
              </h3>
              <p className="text-xs text-zinc-500">
                Grade de tamanhos agrupada para corte e confecção têxtil
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopySupplierText}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-pastoral-cafe text-white hover:bg-pastoral-profundo flex items-center gap-1.5 shadow-sm transition-all"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copiado para o Clipboard!' : 'Copiar Texto para WhatsApp'}
              </button>

              <button
                onClick={handlePrintSupplier}
                className="px-3 py-2 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Imprimir
              </button>
            </div>
          </div>

          {/* Formatted Text Box */}
          <div className="p-4 bg-pastoral-profundo text-white font-mono text-xs rounded-xl whitespace-pre-line leading-relaxed shadow-pastoral border border-pastoral-dourado/30">
            {supplierReport.formattedText}
          </div>

          {/* Visual Cards per Model */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(supplierReport.grouped).map(([model, info]) => (
              <div
                key={model}
                className="p-4 rounded-xl border border-pastoral-dourado/30 bg-pastoral-creme/40 space-y-3"
              >
                <div className="flex items-center justify-between border-b border-pastoral-dourado/20 pb-2">
                  <h4 className="font-serif font-bold text-base text-pastoral-cafe">{model}</h4>
                  <span className="font-bold text-xs px-2.5 py-0.5 rounded-full bg-pastoral-cafe text-white">
                    {info.total} camisetas
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {info.sizes.map((s) => (
                    <div
                      key={s.size}
                      className="p-2.5 bg-white rounded-lg border border-zinc-200 text-center shadow-xs"
                    >
                      <p className="text-xs text-zinc-500 font-semibold">Tamanho</p>
                      <p className="font-bold text-lg text-pastoral-dourado">{s.size}</p>
                      <p className="text-xs font-bold text-pastoral-cafe mt-0.5">{s.quantity} un</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Grand Total Footer */}
          <div className="p-4 bg-pastoral-cafe text-white rounded-xl flex items-center justify-between font-serif">
            <div>
              <p className="text-xs text-pastoral-rosa-antigo">Total Geral de Encomenda</p>
              <p className="text-xl font-bold text-pastoral-dourado">
                {supplierReport.grandTotal} Camisetas Oficiais
              </p>
            </div>
            <div className="text-xs text-zinc-300 text-right">
              Pastoral Missionária • Ágape Apostolado
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

