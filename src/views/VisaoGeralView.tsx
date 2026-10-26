import React from 'react';
import { DashboardKPIs, Order, Payment, GoogleSheetsConfig } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  Users,
  ShoppingBag,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  Truck,
  Plus,
  FileSpreadsheet,
  FileText,
  AlertCircle,
  ExternalLink,
  MessageCircle,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { PaymentBadge } from '../components/common/Badge';

interface VisaoGeralViewProps {
  kpis: DashboardKPIs | null;
  charts: any;
  recentPayments: Payment[];
  pendingOrders: any[];
  sheetsConfig: GoogleSheetsConfig | null;
  onOpenNewOrder: () => void;
  onOpenPaymentForOrder: (orderId: string) => void;
  onOpenWhatsAppForOrder: (orderId: string) => void;
  onNavigateToView: (view: any) => void;
}

const COLORS = ['#B68B4B', '#3C2D29', '#8E303B', '#D89BA2', '#281F1C'];

export const VisaoGeralView: React.FC<VisaoGeralViewProps> = ({
  kpis,
  charts,
  recentPayments,
  pendingOrders,
  sheetsConfig,
  onOpenNewOrder,
  onOpenPaymentForOrder,
  onOpenWhatsAppForOrder,
  onNavigateToView,
}) => {
  const isSheetsConnected = sheetsConfig?.status === 'conectado';
  const sheetUrl = sheetsConfig?.spreadsheet_id
    ? `https://docs.google.com/spreadsheets/d/${sheetsConfig.spreadsheet_id}/edit`
    : '';

  return (
    <div className="space-y-6">
      {/* 1. Catholic Pastoral Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-pastoral-profundo via-pastoral-cafe to-pastoral-profundo text-white shadow-pastoral border border-pastoral-dourado/30 p-6 md:p-8">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1 space-y-3 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pastoral-dourado/20 border border-pastoral-dourado/40 text-pastoral-dourado-claro text-xs font-semibold tracking-wider uppercase">
              Ágape Apostolado de Jovens • Paróquia São Vicente de Paulo
            </div>
            <h2 className="font-serif text-2xl md:text-3xl font-bold tracking-tight text-white">
              Bem-vindo à Pastoral Missionária
            </h2>
            <p className="text-pastoral-rosa-antigo text-sm md:text-base font-serif italic">
              "Uma só coisa é necessária: Estar perto de Jesus." — São Padre Pio
            </p>
            <p className="text-zinc-300 text-xs md:text-sm max-w-xl leading-relaxed">
              Acompanhe os pedidos das camisetas oficiais, organize os pagamentos em centavos reais, gerencie as entregas e mantenha tudo sincronizado com o Google Planilhas.
            </p>

            {/* Quick Actions in Banner */}
            <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-2.5">
              <button
                onClick={onOpenNewOrder}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-pastoral-dourado to-pastoral-dourado-claro text-pastoral-profundo hover:brightness-105 shadow-gold transition-all flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Novo Pedido
              </button>

              <button
                onClick={() => onNavigateToView('relatorios')}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all flex items-center gap-1.5"
              >
                <FileText className="w-4 h-4 text-pastoral-dourado" /> Relatório Fornecedor
              </button>

              {sheetUrl && (
                <a
                  href={sheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-700/50 transition-all flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Abrir Google Planilhas
                </a>
              )}
            </div>
          </div>

          {/* Visual images of Padre Pio and Official T-Shirt */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="relative group">
              <img
                src="/assets/padre-pio.png"
                alt="São Padre Pio"
                className="w-24 h-24 md:w-32 md:h-32 object-cover rounded-2xl border-2 border-pastoral-dourado/60 shadow-pastoral bg-white/10"
              />
              <span className="absolute -bottom-2 inset-x-0 text-center text-[10px] bg-pastoral-cafe/90 text-pastoral-dourado font-bold py-0.5 rounded-full border border-pastoral-dourado/40">
                Padroeiro
              </span>
            </div>

            <div className="relative group">
              <img
                src="/assets/camiseta-oficial.jpg"
                alt="Camiseta Oficial"
                className="w-24 h-24 md:w-32 md:h-32 object-cover rounded-2xl border-2 border-pastoral-dourado/60 shadow-pastoral bg-white/10"
              />
              <span className="absolute -bottom-2 inset-x-0 text-center text-[10px] bg-pastoral-cafe/90 text-pastoral-dourado font-bold py-0.5 rounded-full border border-pastoral-dourado/40">
                Camiseta Oficial
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Key KPI Metric Cards (Calculated from Real Database) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Membros */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-200/80 hover:border-pastoral-dourado/40 transition-all">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Membros</span>
            <Users className="w-4 h-4 text-pastoral-dourado" />
          </div>
          <p className="text-2xl font-bold font-serif text-pastoral-cafe">{kpis?.total_members || 0}</p>
          <p className="text-[11px] text-zinc-400 mt-0.5">Cadastrados no sistema</p>
        </div>

        {/* Total Camisetas */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-200/80 hover:border-pastoral-dourado/40 transition-all">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Camisetas</span>
            <ShoppingBag className="w-4 h-4 text-pastoral-vinho" />
          </div>
          <p className="text-2xl font-bold font-serif text-pastoral-cafe">{kpis?.total_tshirts || 0}</p>
          <p className="text-[11px] text-zinc-400 mt-0.5">{kpis?.total_orders || 0} pedidos ativos</p>
        </div>

        {/* Total Previsto */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-200/80 hover:border-pastoral-dourado/40 transition-all">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Previsto</span>
            <DollarSign className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-xl font-bold font-serif text-pastoral-cafe">
            {formatCurrency(kpis?.total_amount_cents)}
          </p>
          <p className="text-[11px] text-zinc-400 mt-0.5">Valor total previsto</p>
        </div>

        {/* Total Arrecadado */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-emerald-200 bg-emerald-50/20 hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between text-emerald-700 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Arrecadado</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-bold font-serif text-emerald-700">
            {formatCurrency(kpis?.paid_amount_cents)}
          </p>
          <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
            {kpis?.percent_collected || 0}% quitado
          </p>
        </div>

        {/* Saldo Pendente */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-rose-200 bg-rose-50/20 hover:border-rose-300 transition-all">
          <div className="flex items-center justify-between text-rose-700 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pendente</span>
            <Clock className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-xl font-bold font-serif text-rose-700">
            {formatCurrency(kpis?.balance_cents)}
          </p>
          <p className="text-[11px] text-rose-600 mt-0.5">{kpis?.orders_unpaid || 0} sem pagamento</p>
        </div>

        {/* Entregues */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-200/80 hover:border-pastoral-dourado/40 transition-all">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Entregas</span>
            <Truck className="w-4 h-4 text-pastoral-dourado" />
          </div>
          <p className="text-2xl font-bold font-serif text-pastoral-cafe">
            {kpis?.tshirts_delivered || 0} / {kpis?.total_tshirts || 0}
          </p>
          <p className="text-[11px] text-zinc-400 mt-0.5">{kpis?.tshirts_pending_delivery || 0} a entregar</p>
        </div>
      </div>

      {/* 3. Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Modelos e Tamanhos */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-zinc-200/80">
          <h3 className="font-serif font-bold text-sm text-pastoral-cafe flex items-center justify-between border-b border-zinc-100 pb-3 mb-4">
            <span>Distribuição por Tamanho e Modelo</span>
            <span className="text-xs text-zinc-400 font-sans font-normal">Grade de Produção</span>
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts?.sizes || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: any) => [`${value} camisetas`, 'Quantidade']}
                  contentStyle={{ backgroundColor: '#281F1C', color: '#fff', borderRadius: '8px' }}
                />
                <Bar dataKey="value" fill="#B68B4B" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-6 pt-3 text-xs text-zinc-600">
            {charts?.models?.map((m: any, idx: number) => (
              <span key={idx} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-pastoral-dourado inline-block" />
                <b>{m.name}:</b> {m.value} unidades
              </span>
            ))}
          </div>
        </div>

        {/* Situação Financeira */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-zinc-200/80">
          <h3 className="font-serif font-bold text-sm text-pastoral-cafe flex items-center justify-between border-b border-zinc-100 pb-3 mb-4">
            <span>Status dos Pagamentos dos Pedidos</span>
            <span className="text-xs text-zinc-400 font-sans font-normal">Quitação</span>
          </h3>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts?.paymentStatus || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {charts?.paymentStatus?.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [`${val} pedidos`, 'Total']}
                  contentStyle={{ backgroundColor: '#281F1C', color: '#fff', borderRadius: '8px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 4. Priority Pending Balances & Recent Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Orders (Cobrança rápida via WhatsApp) */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-zinc-200/80">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-4">
            <div>
              <h3 className="font-serif font-bold text-sm text-pastoral-cafe">
                Pedidos Aguardando Pagamento
              </h3>
              <p className="text-xs text-zinc-400">Notifique os membros diretamente pelo WhatsApp</p>
            </div>
            <button
              onClick={() => onNavigateToView('pedidos')}
              className="text-xs font-semibold text-pastoral-dourado hover:underline"
            >
              Ver todos
            </button>
          </div>

          <div className="space-y-2.5">
            {pendingOrders?.length === 0 ? (
              <p className="text-xs text-zinc-400 text-center py-6">Nenhum pagamento pendente!</p>
            ) : (
              pendingOrders?.slice(0, 5).map((o) => (
                <div
                  key={o.id}
                  className="p-3 rounded-xl border border-zinc-200 hover:border-pastoral-dourado/40 transition-colors flex items-center justify-between bg-zinc-50/50"
                >
                  <div>
                    <p className="text-xs font-bold text-pastoral-cafe">{o.member_name}</p>
                    <p className="text-[11px] text-zinc-500">
                      {o.model} {o.size} • Pendente: <b className="text-rose-600">{formatCurrency(o.balance_cents)}</b>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onOpenPaymentForOrder(o.id)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                      title="Registrar pagamento deste membro"
                    >
                      Pagar
                    </button>
                    <button
                      onClick={() => onOpenWhatsAppForOrder(o.id)}
                      className="p-1 rounded-lg text-emerald-700 hover:bg-emerald-50 border border-emerald-300 transition-colors"
                      title="Enviar lembrete WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Payments Log */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-zinc-200/80">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-4">
            <div>
              <h3 className="font-serif font-bold text-sm text-pastoral-cafe">
                Últimos Pagamentos Recebidos
              </h3>
              <p className="text-xs text-zinc-400">Lançamentos mais recentes no caixa</p>
            </div>
            <button
              onClick={() => onNavigateToView('financeiro')}
              className="text-xs font-semibold text-pastoral-dourado hover:underline"
            >
              Ver extrato
            </button>
          </div>

          <div className="space-y-2.5">
            {recentPayments?.length === 0 ? (
              <p className="text-xs text-zinc-400 text-center py-6">
                Ainda não há pagamentos registrados. Os 19 pedidos iniciais aguardam pagamento.
              </p>
            ) : (
              recentPayments?.map((p) => (
                <div
                  key={p.id}
                  className="p-3 rounded-xl border border-zinc-200 flex items-center justify-between bg-zinc-50/50"
                >
                  <div>
                    <p className="text-xs font-bold text-pastoral-cafe">{p.member_name}</p>
                    <p className="text-[11px] text-zinc-500">
                      {p.payment_method.toUpperCase()} • em {formatDate(p.payment_date)}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                    +{formatCurrency(p.amount_cents)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

