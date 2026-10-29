import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { NavItemKey } from '../components/layout/Sidebar';
import { DashboardKPIs } from '../types';
import { formatCurrency } from '../utils/formatters';
import {
  Calendar,
  Send,
  GraduationCap,
  Shirt,
  ShieldCheck,
  Bell,
  Sparkles,
  ArrowRight,
  Users,
  BookOpen,
  Globe,
  Plus,
} from 'lucide-react';

interface PainelMissionarioViewProps {
  kpis: DashboardKPIs | null;
  onNavigate: (view: NavItemKey) => void;
  onOpenPublicPortal: () => void;
}

export const PainelMissionarioView: React.FC<PainelMissionarioViewProps> = ({
  kpis,
  onNavigate,
  onOpenPublicPortal,
}) => {
  const { user } = useAuth();
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isNewAnnouncementOpen, setIsNewAnnouncementOpen] = useState(false);
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annCategory, setAnnCategory] = useState('Aviso Importante');

  const loadOverview = async () => {
    setLoading(true);
    try {
      const data = await api.getPlatformOverview();
      setOverview(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim()) return;
    await api.createAnnouncement({
      title: annTitle,
      content: annContent,
      category: annCategory,
      pinned: true,
    });
    setAnnTitle('');
    setAnnContent('');
    setIsNewAnnouncementOpen(false);
    loadOverview();
  };

  const canManage = user?.role === 'admin' || user?.role === 'coordenador';
  const upcomingEvents = overview?.upcomingEvents || [];
  const announcements = overview?.announcements || [];
  const coordinators = overview?.coordinators || [];
  const counts = overview?.counts || {};

  return (
    <div className="space-y-6">
      {/* Hero Banner do Ecossistema */}
      <div className="bg-gradient-to-r from-pastoral-profundo via-pastoral-cafe to-pastoral-profundo rounded-3xl p-6 sm:p-8 text-white shadow-pastoral-lg border border-pastoral-dourado/30 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pastoral-dourado/20 border border-pastoral-dourado/40 text-pastoral-dourado-claro text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ecossistema Digital da Pastoral Missionária • Paróquia São Vicente de Paulo</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white">
              Paz e Bem, {user?.name?.split(' ')[0] || 'Missionário(a)'}!
            </h2>
            <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed">
              Acompanhe o Calendário 2027, solicite envios missionários, prepare seus Laboratórios de Pregação e consulte os pedidos da Camiseta Oficial 2026 sob a intercessão de <strong>São Padre Pio de Pietrelcina</strong>.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
              <span className="px-3 py-1 rounded-lg bg-white/10 border border-white/15 text-pastoral-dourado-claro font-medium">
                Coordenação Ativa:{' '}
                <strong className="text-white">
                  {coordinators.length > 0
                    ? coordinators.map((c: any) => c.coordinator_name).join(' & ')
                    : 'Pedro & Fernanda'}
                </strong>
              </span>
              <button
                onClick={onOpenPublicPortal}
                className="px-3 py-1 rounded-lg bg-pastoral-dourado text-pastoral-profundo font-bold hover:brightness-105 flex items-center gap-1.5 transition-all"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Ver Página Institucional Pública</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-black/25 p-4 rounded-2xl border border-pastoral-dourado/30">
            <img
              src="/assets/padre-pio.png"
              alt="São Padre Pio"
              className="w-16 h-16 rounded-full object-cover border-2 border-pastoral-dourado"
            />
            <div className="text-xs space-y-1 max-w-xs">
              <span className="text-[10px] uppercase tracking-wider text-pastoral-dourado font-bold block">
                Padroeiro da Pastoral Missionária
              </span>
              <p className="font-serif italic text-pastoral-rosa-antigo">
                “Tenha Jesus Cristo em seu coração, e todas as cruzes do mundo parecerão rosas.”
              </p>
              <span className="text-[11px] text-zinc-300 block">— São Padre Pio de Pietrelcina</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Navigation Pillars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <button
          onClick={() => onNavigate('calendario_2027')}
          className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-xs hover:border-pastoral-dourado hover:shadow-md transition-all text-left group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-pastoral-dourado flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-pastoral-cafe bg-pastoral-creme px-2.5 py-0.5 rounded-full">
              {counts.calendarEvents2027 ?? 26} datas
            </span>
          </div>
          <h3 className="font-serif font-bold text-sm text-pastoral-cafe group-hover:text-pastoral-vinho">
            Calendário 2027
          </h3>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Reuniões, vigílias, estágios e missões oficiais
          </p>
        </button>

        <button
          onClick={() => onNavigate('missoes_envios')}
          className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-xs hover:border-pastoral-dourado hover:shadow-md transition-all text-left group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-pastoral-vinho flex items-center justify-center">
              <Send className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-rose-800 bg-rose-50 px-2.5 py-0.5 rounded-full">
              {counts.pendingDispatches || 0} pendente(s)
            </span>
          </div>
          <h3 className="font-serif font-bold text-sm text-pastoral-cafe group-hover:text-pastoral-vinho">
            Missões & Envios
          </h3>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Solicitar envio e consultar modelos de encontros
          </p>
        </button>

        <button
          onClick={() => onNavigate('formacao_laboratorios')}
          className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-xs hover:border-pastoral-dourado hover:shadow-md transition-all text-left group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded-full">
              {counts.labThemes ?? 19} temas
            </span>
          </div>
          <h3 className="font-serif font-bold text-sm text-pastoral-cafe group-hover:text-pastoral-vinho">
            Laboratórios & Formação
          </h3>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Sorteio de 15 min e Ficha de 8 critérios
          </p>
        </button>

        <button
          onClick={() => onNavigate('minha_camiseta')}
          className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-xs hover:border-pastoral-dourado hover:shadow-md transition-all text-left group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Shirt className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full">
              {kpis?.total_tshirts ?? 19} blusas
            </span>
          </div>
          <h3 className="font-serif font-bold text-sm text-pastoral-cafe group-hover:text-pastoral-vinho">
            Minha Camiseta & Pix
          </h3>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Fotos do modelo, status do pedido e chave Pix
          </p>
        </button>

        <button
          onClick={() => onNavigate('governanca')}
          className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-xs hover:border-pastoral-dourado hover:shadow-md transition-all text-left group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-purple-800 bg-purple-50 px-2.5 py-0.5 rounded-full">
              {counts.pastoralMembers ?? 21} membros
            </span>
          </div>
          <h3 className="font-serif font-bold text-sm text-pastoral-cafe group-hover:text-pastoral-vinho">
            Pessoas & Sucessão
          </h3>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Habilitações, delegações e coordenação
          </p>
        </button>
      </div>

      {/* Main Two-Column Section: Announcements + Next Calendar Events */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mural de Comunicados */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-zinc-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif font-bold text-base text-pastoral-cafe flex items-center gap-2">
                <Bell className="w-4 h-4 text-pastoral-dourado" />
                Mural de Comunicados e Avisos da Pastoral
              </h3>
              <p className="text-xs text-zinc-500">
                Orientações oficiais da coordenação para os missionários
              </p>
            </div>
            {canManage && (
              <button
                onClick={() => setIsNewAnnouncementOpen(!isNewAnnouncementOpen)}
                className="px-3 py-1.5 rounded-xl bg-pastoral-cafe text-white text-xs font-bold flex items-center gap-1.5 hover:bg-pastoral-profundo transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Novo Aviso</span>
              </button>
            )}
          </div>

          {isNewAnnouncementOpen && canManage && (
            <form
              onSubmit={handleCreateAnnouncement}
              className="p-4 rounded-xl bg-pastoral-creme/60 border border-pastoral-dourado/30 space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  placeholder="Título do comunicado..."
                  className="sm:col-span-2 px-3 py-2 text-xs rounded-xl border border-zinc-300 bg-white"
                  required
                />
                <select
                  value={annCategory}
                  onChange={(e) => setAnnCategory(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-zinc-300 bg-white"
                >
                  <option value="Aviso Importante">Aviso Importante</option>
                  <option value="Reunião">Reunião</option>
                  <option value="Missão">Missão</option>
                  <option value="Laboratório">Laboratório</option>
                  <option value="Camisetas">Camisetas</option>
                </select>
              </div>
              <textarea
                value={annContent}
                onChange={(e) => setAnnContent(e.target.value)}
                placeholder="Escreva a mensagem fraterna para os missionários..."
                rows={3}
                className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 bg-white"
                required
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewAnnouncementOpen(false)}
                  className="px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-pastoral-dourado text-pastoral-profundo rounded-lg shadow-xs"
                >
                  Publicar Comunicado
                </button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {announcements.map((ann: any) => (
              <div
                key={ann.id}
                className="p-4 rounded-xl bg-pastoral-creme/40 border border-pastoral-dourado/25 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-pastoral-dourado/20 text-pastoral-cafe">
                    {ann.category}
                  </span>
                  <span className="text-[11px] text-zinc-400">{ann.author_name}</span>
                </div>
                <h4 className="font-serif font-bold text-sm text-pastoral-cafe">{ann.title}</h4>
                <p className="text-xs text-zinc-700 leading-relaxed whitespace-pre-line">{ann.content}</p>
              </div>
            ))}
          </div>

          {/* Resumo Rápido do Módulo de Camisetas Preservado */}
          {kpis && (
            <div className="pt-3 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-zinc-600">
                <strong>Módulo de Camisetas 2026:</strong> {kpis.total_orders} pedidos ({kpis.total_tshirts} camisetas) • Total: {formatCurrency(kpis.total_amount_cents)} • Pago: {formatCurrency(kpis.paid_amount_cents)} • Pendente: {formatCurrency(kpis.balance_cents)}
              </div>
              <button
                onClick={() => onNavigate('visao_geral')}
                className="text-xs font-bold text-pastoral-vinho hover:underline flex items-center gap-1"
              >
                <span>Abrir Painel Administrativo de Camisetas</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Próximos Eventos do Calendário 2027 */}
        <div className="bg-white rounded-2xl p-6 border border-zinc-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-bold text-base text-pastoral-cafe flex items-center gap-2">
              <Calendar className="w-4 h-4 text-pastoral-dourado" />
              Agenda 2027
            </h3>
            <button
              onClick={() => onNavigate('calendario_2027')}
              className="text-xs font-semibold text-pastoral-dourado hover:underline"
            >
              Ver todos (26)
            </button>
          </div>

          <div className="space-y-2.5">
            {upcomingEvents.map((ev: any) => (
              <div
                key={ev.id}
                className="p-3 rounded-xl border border-zinc-200/80 bg-zinc-50/60 flex items-center justify-between gap-3"
              >
                <div>
                  <span className="text-[11px] font-bold text-pastoral-vinho block">
                    {ev.event_date.split('-').reverse().join('/')}
                  </span>
                  <p className="text-xs font-bold text-pastoral-grafite">{ev.title}</p>
                  <span className="text-[10px] text-zinc-500">{ev.category}</span>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-pastoral-creme text-pastoral-cafe border border-pastoral-dourado/30">
                  {ev.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
