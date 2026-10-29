import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { NavItemKey } from '../components/layout/Sidebar';
import { DashboardKPIs } from '../types';
import {
  Calendar,
  Send,
  GraduationCap,
  Shirt,
  ShieldCheck,
  Bell,
  Sparkles,
  ArrowRight,
  Globe,
  Plus,
  Clock,
  MapPin,
  CheckCircle2,
  Bookmark,
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

  const canManage = user?.role === 'admin' || user?.role === 'coordenador';

  const loadOverview = async () => {
    setLoading(true);
    try {
      const data = await api.getPlatformOverview();
      setOverview(data);
    } catch (e) {
      console.error('Erro ao carregar visão geral:', e);
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
    try {
      await api.createAnnouncement({
        title: annTitle.trim(),
        content: annContent.trim(),
        category: annCategory,
        pinned: true,
      });
      setAnnTitle('');
      setAnnContent('');
      setIsNewAnnouncementOpen(false);
      loadOverview();
    } catch (err: any) {
      alert('Erro ao publicar aviso: ' + (err.message || 'Tente novamente'));
    }
  };

  const upcomingEvents = overview?.upcomingEvents || [];
  const announcements = overview?.announcements || [];
  const coordinators = overview?.coordinators || [];
  const counts = overview?.counts || {};

  // Dynamic next upcoming event calculation (Section 22)
  const nextEvent = useMemo(() => {
    if (!upcomingEvents || upcomingEvents.length === 0) return null;
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Find earliest future event with date >= today and status != 'Cancelado'
    const futureEvents = upcomingEvents
      .filter((ev: any) => ev.status !== 'Cancelado' && ev.event_date >= todayStr)
      .sort((a: any, b: any) => a.event_date.localeCompare(b.event_date));

    if (futureEvents.length > 0) return futureEvents[0];

    // If no events match todayStr (e.g., viewing in 2026 for 2027 calendar), pick earliest scheduled event
    const activeEvents = upcomingEvents
      .filter((ev: any) => ev.status !== 'Cancelado')
      .sort((a: any, b: any) => a.event_date.localeCompare(b.event_date));

    return activeEvents[0] || null;
  }, [upcomingEvents]);

  // Separate pinned vs recent announcements (Section 23)
  const pinnedAnnouncement = useMemo(() => {
    return announcements.find((a: any) => a.pinned) || announcements[0] || null;
  }, [announcements]);

  const otherAnnouncements = useMemo(() => {
    if (!pinnedAnnouncement) return [];
    return announcements.filter((a: any) => a.id !== pinnedAnnouncement.id);
  }, [announcements, pinnedAnnouncement]);

  const formatEventDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    const months = [
      'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
      'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
    ];
    const mIdx = parseInt(month, 10) - 1;
    return `${parseInt(day, 10)} de ${months[mIdx] || month} de ${year}`;
  };

  return (
    <div className="space-y-6">
      {/* 20. Cabeçalho Pastoral Limpo & Espiritual */}
      <div className="bg-gradient-to-r from-pastoral-profundo via-pastoral-cafe to-pastoral-profundo rounded-3xl p-6 sm:p-7 text-white shadow-pastoral-lg border border-pastoral-dourado/30 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 relative z-10">
          <div className="space-y-1.5 max-w-xl">
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Paz e Bem, {user?.name?.split(' ')[0] || 'Missionário(a)'}!
            </h2>
            <p className="text-sm text-pastoral-dourado-claro italic font-serif">
              "Que Deus abençoe nossa missão!"
            </p>
            <p className="text-xs text-zinc-300 pt-1">
              Coordenação:{' '}
              <strong className="text-white font-medium">
                {coordinators.length > 0
                  ? coordinators.map((c: any) => c.coordinator_name).join(' e ')
                  : 'Pedro e Fernanda'}
              </strong>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onOpenPublicPortal}
              className="px-4 py-2 rounded-xl bg-pastoral-dourado/90 hover:bg-pastoral-dourado text-pastoral-profundo font-bold text-xs flex items-center gap-2 shadow-gold transition-all active:scale-95"
            >
              <Globe className="w-4 h-4" />
              <span>Conhecer a Pastoral</span>
            </button>
          </div>
        </div>
      </div>

      {/* 21. Atalhos Rápidos e Úteis */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <button
          onClick={() => onNavigate('calendario_2027')}
          className="bg-white p-3.5 rounded-2xl border border-zinc-200/80 shadow-xs hover:border-pastoral-dourado hover:shadow-md transition-all text-left group"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-pastoral-dourado flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
            <Calendar className="w-4.5 h-4.5" />
          </div>
          <h4 className="font-serif font-bold text-xs text-pastoral-cafe group-hover:text-pastoral-vinho">
            Calendário Oficial
          </h4>
          <p className="text-[11px] text-zinc-400 mt-0.5">Grade e datas 2027</p>
        </button>

        <button
          onClick={() => onNavigate('missoes_envios')}
          className="bg-white p-3.5 rounded-2xl border border-zinc-200/80 shadow-xs hover:border-pastoral-dourado hover:shadow-md transition-all text-left group"
        >
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-pastoral-vinho flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
            <Send className="w-4.5 h-4.5" />
          </div>
          <h4 className="font-serif font-bold text-xs text-pastoral-cafe group-hover:text-pastoral-vinho">
            Missões & Envios
          </h4>
          <p className="text-[11px] text-zinc-400 mt-0.5">Solicitar e consultar</p>
        </button>

        <button
          onClick={() => onNavigate('formacao_laboratorios')}
          className="bg-white p-3.5 rounded-2xl border border-zinc-200/80 shadow-xs hover:border-pastoral-dourado hover:shadow-md transition-all text-left group"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
            <GraduationCap className="w-4.5 h-4.5" />
          </div>
          <h4 className="font-serif font-bold text-xs text-pastoral-cafe group-hover:text-pastoral-vinho">
            Laboratórios
          </h4>
          <p className="text-[11px] text-zinc-400 mt-0.5">Pregação e avaliação</p>
        </button>

        <button
          onClick={() => onNavigate('minha_camiseta')}
          className="bg-white p-3.5 rounded-2xl border border-zinc-200/80 shadow-xs hover:border-pastoral-dourado hover:shadow-md transition-all text-left group"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
            <Shirt className="w-4.5 h-4.5" />
          </div>
          <h4 className="font-serif font-bold text-xs text-pastoral-cafe group-hover:text-pastoral-vinho">
            Minha Camiseta
          </h4>
          <p className="text-[11px] text-zinc-400 mt-0.5">Status e chave Pix</p>
        </button>

        {canManage && (
          <button
            onClick={() => onNavigate('governanca')}
            className="bg-white p-3.5 rounded-2xl border border-zinc-200/80 shadow-xs hover:border-pastoral-dourado hover:shadow-md transition-all text-left group"
          >
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-4.5 h-4.5" />
            </div>
            <h4 className="font-serif font-bold text-xs text-pastoral-cafe group-hover:text-pastoral-vinho">
              Governança
            </h4>
            <p className="text-[11px] text-zinc-400 mt-0.5">Membros e acessos</p>
          </button>
        )}
      </div>

      {/* Grid: 22. Próximo Compromisso + 23. Mural de Comunicação */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 22. Próximo Compromisso em Destaque Dinâmico */}
        <div className="lg:col-span-1 bg-white rounded-3xl p-6 border border-pastoral-dourado/30 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <span className="text-[11px] font-bold uppercase tracking-wider text-pastoral-dourado flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Próximo Compromisso
              </span>
              <button
                onClick={() => onNavigate('calendario_2027')}
                className="text-xs font-semibold text-pastoral-vinho hover:underline"
              >
                Ver calendário
              </button>
            </div>

            {nextEvent ? (
              <div className="pt-4 space-y-3">
                <span className="inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-pastoral-creme text-pastoral-cafe border border-pastoral-dourado/30">
                  {nextEvent.category || 'Atividade'}
                </span>
                <div>
                  <h3 className="font-serif text-lg font-bold text-pastoral-cafe leading-snug">
                    {nextEvent.title}
                  </h3>
                  <p className="text-xs text-pastoral-dourado font-semibold mt-1">
                    {formatEventDate(nextEvent.event_date)}
                    {nextEvent.event_time ? ` às ${nextEvent.event_time}` : ''}
                  </p>
                </div>
                {nextEvent.description && (
                  <p className="text-xs text-zinc-500 leading-relaxed line-clamp-3">
                    {nextEvent.description}
                  </p>
                )}
                {nextEvent.location && (
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{nextEvent.location}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-zinc-400 text-xs">
                <p>Nenhum compromisso futuro agendado no momento.</p>
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-zinc-100">
            <button
              onClick={() => onNavigate('calendario_2027')}
              className="w-full py-2 px-3 rounded-xl bg-pastoral-cafe/5 hover:bg-pastoral-cafe/10 text-pastoral-cafe text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Acessar grade completa de datas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 23. Mural de Comunicação e Avisos */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-zinc-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-pastoral-dourado" />
              <h3 className="font-serif font-bold text-base text-pastoral-cafe">
                Mural de Avisos da Pastoral
              </h3>
            </div>
            {canManage && (
              <button
                onClick={() => setIsNewAnnouncementOpen(!isNewAnnouncementOpen)}
                className="px-3 py-1.5 rounded-xl bg-pastoral-cafe hover:bg-pastoral-profundo text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Novo Aviso</span>
              </button>
            )}
          </div>

          {/* Form to create new announcement */}
          {isNewAnnouncementOpen && canManage && (
            <form
              onSubmit={handleCreateAnnouncement}
              className="p-4 rounded-2xl bg-pastoral-creme/60 border border-pastoral-dourado/30 space-y-3"
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
                  Publicar Aviso
                </button>
              </div>
            </form>
          )}

          {/* Pinned / Priority announcement */}
          {pinnedAnnouncement ? (
            <div className="p-4 rounded-2xl bg-pastoral-creme/50 border border-pastoral-dourado/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-pastoral-dourado/25 text-pastoral-cafe flex items-center gap-1">
                  <Bookmark className="w-3 h-3 text-pastoral-dourado" />
                  {pinnedAnnouncement.category || 'Destaque'}
                </span>
                <span className="text-[11px] text-zinc-400">
                  {pinnedAnnouncement.author_name || 'Coordenação'}
                </span>
              </div>
              <h4 className="font-serif font-bold text-sm text-pastoral-cafe">
                {pinnedAnnouncement.title}
              </h4>
              <p className="text-xs text-zinc-700 leading-relaxed whitespace-pre-line">
                {pinnedAnnouncement.content}
              </p>
            </div>
          ) : (
            <div className="py-6 text-center text-zinc-400 text-xs">
              Nenhum aviso publicado no momento.
            </div>
          )}

          {/* Recent list if more announcements exist */}
          {otherAnnouncements.length > 0 && (
            <div className="pt-2 space-y-2">
              <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                Outros Comunicados Recentes
              </span>
              <div className="space-y-2">
                {otherAnnouncements.slice(0, 2).map((ann: any) => (
                  <div
                    key={ann.id}
                    className="p-3 rounded-xl border border-zinc-100 bg-zinc-50/70 hover:bg-zinc-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <h5 className="font-serif font-semibold text-xs text-pastoral-cafe">
                        {ann.title}
                      </h5>
                      <span className="text-[10px] text-zinc-400">{ann.category}</span>
                    </div>
                    <p className="text-[11px] text-zinc-600 mt-1 line-clamp-2">
                      {ann.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
