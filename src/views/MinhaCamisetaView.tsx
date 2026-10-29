import React, { useState, useEffect } from 'react';
import { Order } from '../types';
import { api } from '../services/api';
import { formatCurrency } from '../utils/formatters';
import {
  Shirt,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  Truck,
  Sparkles,
  QrCode,
  ShieldCheck,
} from 'lucide-react';

interface MinhaCamisetaViewProps {
  orders: Order[];
}

const STAGES = [
  { key: 'aguardando_confirmacao', label: '1. Aguardando confirmação' },
  { key: 'confirmado', label: '2. Confirmado' },
  { key: 'encomendado', label: '3. Encomendado ao fornecedor' },
  { key: 'em_producao', label: '4. Em produção' },
  { key: 'recebido', label: '5. Recebido pela Pastoral' },
  { key: 'entregue', label: '6. Entregue' },
];

export const MinhaCamisetaView: React.FC<MinhaCamisetaViewProps> = ({ orders }) => {
  const [selectedOrderId, setSelectedOrderId] = useState<string>(orders[0]?.id || '');
  const [pixKey, setPixKey] = useState('pastoralmissionaria@agape.org.br');
  const [copiedPix, setCopiedPix] = useState(false);

  useEffect(() => {
    if (orders.length > 0 && !selectedOrderId) {
      setSelectedOrderId(orders[0].id);
    }
    api
      .getInstitutionalSettings()
      .then((s) => {
        if (s?.pix_key) setPixKey(s.pix_key);
      })
      .catch(() => {});
  }, [orders, selectedOrderId]);

  const selectedOrder = orders.find((o) => o.id === selectedOrderId) || orders[0];

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixKey);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  };

  const currentStageIndex = selectedOrder
    ? STAGES.findIndex((s) => s.key === selectedOrder.production_status)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-xl font-bold text-pastoral-cafe flex items-center gap-2">
          <Shirt className="w-5 h-5 text-pastoral-dourado" />
          Minha Camiseta Oficial & Pagamento via Pix
        </h2>
        <p className="text-xs text-zinc-500">
          Visualize o modelo oficial da Pastoral Missionária, acompanhe a etapa de produção do seu pedido e realize o pagamento via Pix
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Fotografia Oficial da Camiseta */}
        <div className="bg-white rounded-2xl p-6 border border-pastoral-dourado/30 shadow-pastoral space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-pastoral-creme text-pastoral-cafe border border-pastoral-dourado/30">
              Campanha Oficial 2026
            </span>
            <span className="text-xs font-extrabold text-pastoral-vinho">R$ 45,00 / un.</span>
          </div>

          <div className="rounded-2xl overflow-hidden border border-zinc-200 bg-pastoral-profundo">
            <img
              src="/assets/camiseta-oficial.jpg"
              alt="Camiseta Oficial Pastoral Missionária — São Padre Pio"
              className="w-full h-64 object-cover"
            />
          </div>

          <div className="space-y-1.5">
            <h3 className="font-serif font-bold text-base text-pastoral-cafe">
              Camiseta Oficial — São Padre Pio
            </h3>
            <p className="text-xs text-zinc-600 leading-relaxed">
              Camiseta marrom-escura com acabamento dourado, cruz frontal e estampa artística de <strong>São Padre Pio de Pietrelcina</strong> nas costas com a frase: <em>“Tenha Jesus Cristo em seu coração, e todas as cruzes do mundo parecerão rosas.”</em>
            </p>
            <div className="pt-2 flex flex-wrap gap-2 text-[11px]">
              <span className="px-2.5 py-1 rounded-lg bg-zinc-100 font-semibold text-zinc-700">
                Modelos: Baby look & Tradicional
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-zinc-100 font-semibold text-zinc-700">
                Tamanhos: PP ao XG
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Acompanhamento Individual do Pedido e 6 Etapas */}
        <div className="bg-white rounded-2xl p-6 border border-zinc-200/80 shadow-xs space-y-4">
          {orders.length > 1 && (
            <div>
              <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider mb-1.5">
                Consulte o Pedido do Missionário:
              </label>
              <select
                value={selectedOrderId}
                onChange={(e) => setSelectedOrderId(e.target.value)}
                className="w-full p-2.5 text-xs font-bold rounded-xl border border-zinc-300 bg-white text-pastoral-cafe"
              >
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.member_name} — {o.items.map((i) => `${i.quantity}x ${i.model} (${i.size})`).join(', ')}
                  </option>
                ))}
              </select>
            </div>
          )}

          {orders.length === 0 && (
            <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-200 text-center space-y-3">
              <Shirt className="w-8 h-8 text-zinc-400 mx-auto" />
              <div className="space-y-1">
                <h4 className="font-serif font-bold text-sm text-pastoral-cafe">
                  Nenhum pedido vinculado à sua conta
                </h4>
                <p className="text-xs text-zinc-500">
                  Se você já encomendou sua camiseta na lista dos 19 compradores, solicite o vínculo na tela inicial de acolhimento para acompanhar seu status aqui.
                </p>
              </div>
            </div>
          )}

          {selectedOrder && (
            <>
              <div className="p-4 rounded-xl bg-pastoral-creme/60 border border-pastoral-dourado/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-pastoral-cafe">
                    {selectedOrder.member_name}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                      selectedOrder.payment_status === 'pago'
                        ? 'bg-emerald-100 text-emerald-800'
                        : selectedOrder.payment_status === 'parcial'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    Pagamento: {selectedOrder.payment_status.toUpperCase()}
                  </span>
                </div>

                <div className="text-xs text-zinc-700 space-y-1">
                  {selectedOrder.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between font-medium">
                      <span>
                        {it.quantity}x Modelo <strong>{it.model}</strong> • Tamanho{' '}
                        <strong>{it.size}</strong>
                      </span>
                      <span>{formatCurrency(it.total_price_cents)}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-pastoral-dourado/20 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <span className="text-[10px] text-zinc-500 block">Valor Total</span>
                    <span className="text-xs font-bold text-pastoral-cafe">
                      {formatCurrency(selectedOrder.total_amount_cents)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 block">Já Pago</span>
                    <span className="text-xs font-bold text-emerald-700">
                      {formatCurrency(selectedOrder.paid_amount_cents)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-500 block">Saldo Pendente</span>
                    <span className="text-xs font-bold text-rose-700">
                      {formatCurrency(selectedOrder.balance_cents)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Linha do Tempo das 6 Etapas de Produção */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-pastoral-cafe uppercase tracking-wider">
                  Etapas de Produção e Entrega:
                </h4>
                <div className="space-y-2">
                  {STAGES.map((stage, idx) => {
                    const completed = idx <= currentStageIndex;
                    const isCurrent = idx === currentStageIndex;
                    return (
                      <div
                        key={stage.key}
                        className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                          isCurrent
                            ? 'bg-pastoral-cafe text-white border-pastoral-cafe font-bold'
                            : completed
                            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900 font-medium'
                            : 'bg-zinc-50 border-zinc-200 text-zinc-400'
                        }`}
                      >
                        <span>{stage.label}</span>
                        {completed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Clock className="w-4 h-4 opacity-50" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Card 3: Área de Pagamento via Pix */}
        <div className="bg-white rounded-2xl p-6 border border-zinc-200/80 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-pastoral-cafe">
              <QrCode className="w-5 h-5 text-emerald-600" />
              <h3 className="font-serif font-bold text-base">Pagamento via Pix</h3>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                  Recebedor / Coordenação
                </span>
                <p className="text-xs font-bold text-emerald-950">
                  Pastoral Missionária — Ágape Apostolado (Pedro / Fernanda)
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                  Valor Pendente deste Pedido
                </span>
                <p className="text-lg font-extrabold text-emerald-900">
                  {selectedOrder ? formatCurrency(selectedOrder.balance_cents) : 'R$ 45,00'}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block mb-1">
                  Chave Pix Configurada
                </span>
                <div className="p-2.5 rounded-xl bg-white border border-emerald-300 font-mono text-xs font-bold text-pastoral-cafe break-all">
                  {pixKey}
                </div>
              </div>

              <button
                onClick={handleCopyPix}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center justify-center gap-2 transition-all"
              >
                {copiedPix ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedPix ? 'Chave Pix Copiada!' : 'Copiar Chave Pix'}</span>
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 space-y-1 leading-relaxed">
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                <span>Importante sobre a Confirmação:</span>
              </div>
              <p>
                A cópia da chave Pix ou envio do comprovante não marca o pagamento como confirmado automaticamente. Após realizar o Pix, envie o comprovante para <strong>Pedro ou Fernanda</strong> para que a baixa seja registrada no módulo financeiro.
              </p>
            </div>
          </div>

          <div className="text-[11px] text-zinc-400 text-center pt-2 border-t border-zinc-100">
            Todos os valores são auditados e sincronizados com a planilha oficial da Pastoral.
          </div>
        </div>
      </div>
    </div>
  );
};
