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
  const [bulkMoveConfirm, setBulkMoveConfirm] = useState<{
    fromStage: ProductionStatus;
    toStage: ProductionStatus;
    toTitle: string;
    ordersToMove: Order[];
  } | null>(null);
  const [isMovingBulk, setIsMovingBulk] = useState(false);

  useEffect(() => {
    api.getSupplierReport()
      .then(setSupplierReport)
      .catch(console.error);
  }, [orders]);

  const handleAdvanceStage = async (order: Order, nextStage: ProductionStatus, isRevert = false) => {
    if (isRevert) {
      const ok = window.confirm(
        `Deseja realmente retornar o pedido de ${order.member_name} para a etapa anterior?`
      );
      if (!ok) return;
    }
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

  const handleConfirmColumnBulkMove = async () => {
    if (!bulkMoveConfirm || bulkMoveConfirm.ordersToMove.length === 0) return;
    setIsMovingBulk(true);
    try {
      await api.bulkUpdateOrderStatus({
        order_ids: bulkMoveConfirm.ordersToMove.map((o) => o.id),
        production_status: bulkMoveConfirm.toStage,
        delivery_status: bulkMoveConfirm.toStage === 'entregue' ? 'entregue' : undefined,
      });
      setBulkMoveConfirm(null);
      onRefresh();
    } catch (err: any) {
      alert('Erro na movimentação em lote: ' + err.message);
    } finally {
      setIsMovingBulk(false);
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
              const prevStage = STAGES[idx - 1]?.key;
              const nextStage = STAGES[idx + 1]?.key;
              const nextStageTitle = STAGES[idx + 1]?.title;

              return (
                <div
                  key={st.key}
                  className={`flex-1 bg-zinc-50 rounded-2xl border-t-4 ${st.color} border border-zinc-200/80 p-3 flex flex-col justify-between min-h-[500px]`}
                >
                  {/* Column Header */}
                  <div>
                    <div className="mb-3 pb-2 border-b border-zinc-200 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-xs text-pastoral-cafe">{st.title}</h3>
                        <span className="w-5 h-5 rounded-full bg-pastoral-creme text-pastoral-cafe font-bold text-[10px] flex items-center justify-center border border-pastoral-dourado/30">
                          {stageOrders.length}
                        </span>
                      </div>
                      {canEdit && stageOrders.length > 0 && nextStage && (
                        <button
                          type="button"
                          onClick={() =>
                            setBulkMoveConfirm({
                              fromStage: st.key,
                              toStage: nextStage,
                              toTitle: nextStageTitle || nextStage,
                              ordersToMove: stageOrders,
                            })
                          }
                          className="w-full py-1 px-2 rounded-lg text-[10px] font-bold bg-pastoral-dourado/15 hover:bg-pastoral-dourado/25 text-pastoral-cafe border border-pastoral-dourado/30 flex items-center justify-center gap-1 transition-colors"
                        >
                          Avançar todos ({stageOrders.length}) <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
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
                              <div>
                                <p className="font-bold text-xs text-pastoral-cafe leading-tight">
                                  {o.member_name}
                                </p>
                                {o.member_phone && (
                                  <p className="text-[10px] text-zinc-400 mt-0.5">{o.member_phone}</p>
                                )}
                              </div>
                              {o.balance_cents > 0 ? (
                                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded shrink-0">
                                  {formatCurrency(o.balance_cents)}
                                </span>
                              ) : (
                                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded shrink-0">
                                  Pago
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

                            {/* Stage navigation buttons */}
                            {canEdit && (
                              <div className="flex items-center gap-1 pt-0.5">
                                {prevStage && (
                                  <button
                                    type="button"
                                    onClick={() => handleAdvanceStage(o, prevStage, true)}
                                    title="Retornar para etapa anterior"
                                    className="py-1 px-2 rounded-lg text-[10px] font-medium bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition-colors"
                                  >
                                    Voltar
                                  </button>
                                )}
                                {nextStage && (
                                  <button
                                    type="button"
                                    onClick={() => handleAdvanceStage(o, nextStage, false)}
                                    className="flex-1 py-1 px-2 rounded-lg text-[10px] font-semibold bg-pastoral-creme hover:bg-pastoral-creme-escuro text-pastoral-cafe border border-pastoral-dourado/30 flex items-center justify-center gap-1 transition-colors"
                                  >
                                    Avançar <ChevronRight className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
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

      {/* Modal de Confirmação de Movimentação em Lote na Produção */}
      {bulkMoveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-pastoral-profundo/75 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-pastoral-dourado/30 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-base text-pastoral-cafe">
                  Confirmar Avanço em Lote
                </h3>
                <p className="text-xs text-zinc-500">
                  Mover {bulkMoveConfirm.ordersToMove.length}{' '}
                  {bulkMoveConfirm.ordersToMove.length === 1 ? 'pedido' : 'pedidos'} para{' '}
                  <b>{bulkMoveConfirm.toTitle}</b>.
                </p>
              </div>
            </div>

            <div className="max-h-40 overflow-y-auto border border-zinc-200 rounded-xl divide-y divide-zinc-100 text-xs">
              {bulkMoveConfirm.ordersToMove.map((ord) => (
                <div key={ord.id} className="px-3 py-2 flex items-center justify-between">
                  <span className="font-semibold text-pastoral-cafe">{ord.member_name}</span>
                  <span className="text-[10px] text-zinc-500">
                    {ord.items.map((i) => `${i.quantity}x ${i.model} ${i.size}`).join(', ')}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBulkMoveConfirm(null)}
                disabled={isMovingBulk}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmColumnBulkMove}
                disabled={isMovingBulk}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-pastoral-dourado text-pastoral-profundo hover:brightness-105 shadow-gold"
              >
                {isMovingBulk ? 'Movendo...' : 'Confirmar Avanço'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

