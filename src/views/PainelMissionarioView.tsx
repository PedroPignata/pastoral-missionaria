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
  Users,
  Cake,
  Copy,
  Check,
  Edit2,
  Trash2,
  X,
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
  const [birthdays, setBirthdays] = useState<{ today: any[]; month: any[] }>({ today: [], month: [] });
  const [copiedBirthdayId, setCopiedBirthdayId] = useState<string | null>(null);

  const canManage = user?.role === 'admin' || user?.role === 'coordenador';

  const loadOverview = async () => {
    setLoading(true);
    try {
      const [data, bdays] = await Promise.all([
        api.getPlatformOverview(),
        api.getMemberBirthdays().catch(() => ({ today: [], this_month: [], all_celebrants: [], current_date: { day: 1, month: 1, year: 2026 } })),
      ]);
      setOverview(data);
      setBirthdays({
        today: (bdays as any).today || [],
        month: (bdays as any).this_month || [],
      });
    } catch (e) {
      console.error('Erro ao carregar visão geral:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyGreeting = (celebrant: any) => {
    const name = celebrant.display_name || celebrant.name;
    const text = `🎉 Paz e Bem, ${name}! Em nome da Pastoral Missionária — Ágape Jovens, louvamos a Deus pelo dom da sua vida! Que o Senhor derrame infinitas bênçãos e que nosso padroeiro São Padre Pio guarde sempre seu ministério e sua caminhada de fé. Feliz Aniversário! 🎂🙏✨`;
    navigator.clipboard.writeText(text);
    setCopiedBirthdayId(celebrant.id);
    setTimeout(() => setCopiedBirthdayId(null), 3000);
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

  const [editingAnnouncement, setEditingAnnouncement] = useState<any | null>(null);
  const [editAnnTitle, setEditAnnTitle] = useState('');
  const [editAnnContent, setEditAnnContent] = useState('');
  const [editAnnCategory, setEditAnnCategory] = useState('Geral');
  const [editAnnPinned, setEditAnnPinned] = useState(false);

  const openEditAnnouncement = (ann: any) => {
    setEditingAnnouncement(ann);
    setEditAnnTitle(ann.title);
    setEditAnnContent(ann.content);
    setEditAnnCategory(ann.category || 'Geral');
    setEditAnnPinned(Boolean(ann.pinned));
  };

  const handleUpdateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAnnouncement) return;
    try {
      await api.updateAnnouncement(editingAnnouncement.id, {
        title: editAnnTitle.trim(),
        content: editAnnContent.trim(),
        category: editAnnCategory,
        pinned: editAnnPinned,
      });
      setEditingAnnouncement(null);
      loadOverview();
    } catch (err: any) {
      alert('Erro ao atualizar aviso: ' + (err.message || 'Tente novamente'));
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm('Deseja realmente excluir este comunicado?')) return;
    try {
      await api.deleteAnnouncement(id);
      if (editingAnnouncement?.id === id) setEditingAnnouncement(null);
      loadOverview();
    } catch (err: any) {
      alert('Erro ao excluir aviso: ' + err.message);
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

      {/* Homenagem aos Aniversariantes de Hoje */}
      {birthdays.today.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/15 via-pastoral-dourado/20 to-amber-500/10 border-2 border-pastoral-dourado/50 rounded-3xl p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-pastoral-dourado text-pastoral-profundo flex items-center justify-center shadow-xs">
              <Cake className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-pastoral-cafe flex items-center gap-2">
                <span>🎉 Louvor a Deus! Hoje é Aniversário na Pastoral!</span>
              </h3>
              <p className="text-xs text-pastoral-vinho font-medium">
                "O Senhor te abençoe e te guarde!" — Intercessão especial de São Padre Pio
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
            {birthdays.today.map((cel) => (
              <div
                key={cel.id}
                className="bg-white/95 rounded-2xl p-3.5 border border-pastoral-dourado/40 shadow-xs flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <h4 className="font-serif font-bold text-sm text-pastoral-cafe truncate">
                    {cel.display_name || cel.name}
                  </h4>
                  <span className="text-[11px] text-zinc-500">
                    {cel.pastoral_role === 'coordenador' ? 'Coordenador(a)' : 'Missionário(a)'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopyGreeting(cel)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-pastoral-cafe text-pastoral-dourado-claro hover:bg-pastoral-profundo flex items-center gap-1.5 shadow-2xs transition-colors flex-shrink-0"
                  title="Copiar mensagem fraterna para WhatsApp"
                >
                  {copiedBirthdayId === cel.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Felicitar WhatsApp</span>
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 21. Atalhos Rápidos e Úteis */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <button
          onClick={() => onNavigate('comunidade')}
          className="bg-white p-3.5 rounded-2xl border border-zinc-200/80 shadow-xs hover:border-pastoral-dourado hover:shadow-md transition-all text-left group"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-pastoral-dourado flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
            <Users className="w-4.5 h-4.5" />
          </div>
          <h4 className="font-serif font-bold text-xs text-pastoral-cafe group-hover:text-pastoral-vinho">
            Comunidade
          </h4>
          <p className="text-[11px] text-zinc-400 mt-0.5">Partilha & vivência</p>
        </button>

        <button
          onClick={() => onNavigate('calendario_2027')}
          className="bg-white p-3.5 rounded-2xl border border-zinc-200/80 shadow-xs hover:border-pastoral-dourado hover:shadow-md transition-all text-left group"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-pastoral-dourado flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
            <Calendar className="w-4.5 h-4.5" />
          </div>
          <h4 className="font-serif font-bold text-xs text-pastoral-cafe group-hover:text-pastoral-vinho">
            Calendário
          </h4>
          <p className="text-[11px] text-zinc-400 mt-0.5">Datas e atividades</p>
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
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-zinc-400">
                    {pinnedAnnouncement.author_name || 'Coordenação'}
                  </span>
                  {canManage && (
                    <button
                      onClick={() => openEditAnnouncement(pinnedAnnouncement)}
                      className="p-1 rounded-lg text-zinc-500 hover:text-pastoral-cafe hover:bg-pastoral-dourado/20 transition-colors"
                      title="Editar comunicado"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
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
                {otherAnnouncements.slice(0, 3).map((ann: any) => (
                  <div
                    key={ann.id}
                    className="p-3 rounded-xl border border-zinc-100 bg-zinc-50/70 hover:bg-zinc-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <h5 className="font-serif font-semibold text-xs text-pastoral-cafe">
                        {ann.title}
                      </h5>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-zinc-400">{ann.category}</span>
                        {canManage && (
                          <button
                            onClick={() => openEditAnnouncement(ann)}
                            className="p-1 rounded text-zinc-400 hover:text-pastoral-cafe"
                            title="Editar comunicado"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
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

      {/* Seção Aniversariantes Deste Mês */}
      {birthdays.month.length > 0 && (
        <div className="bg-white rounded-3xl p-6 border border-zinc-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <Cake className="w-4.5 h-4.5 text-pastoral-dourado" />
              <h3 className="font-serif font-bold text-base text-pastoral-cafe">
                Aniversariantes Deste Mês
              </h3>
            </div>
            <span className="text-xs text-zinc-400 font-medium">
              {birthdays.month.length} missionário(s) celebrando a vida
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {birthdays.month.map((cel) => (
              <div
                key={cel.id}
                className="p-3 rounded-2xl bg-pastoral-creme/30 border border-pastoral-dourado/20 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-pastoral-cafe truncate">
                      {cel.display_name || cel.name}
                    </span>
                  </div>
                  <span className="text-[11px] text-pastoral-vinho font-semibold">
                    Dia {String(cel.birth_day).padStart(2, '0')}/{String(cel.birth_month).padStart(2, '0')}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopyGreeting(cel)}
                  className="p-2 rounded-xl text-pastoral-cafe hover:bg-pastoral-dourado/20 transition-colors"
                  title="Copiar mensagem fraterna para WhatsApp"
                >
                  {copiedBirthdayId === cel.id ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-pastoral-dourado" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Modal de Edição de Comunicado */}
      {editingAnnouncement && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-pastoral-dourado/40 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <h3 className="font-serif font-bold text-base text-pastoral-cafe flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-pastoral-dourado" />
                <span>Editar Comunicado do Mural</span>
              </h3>
              <button
                onClick={() => setEditingAnnouncement(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateAnnouncement} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                  Título do Comunicado
                </label>
                <input
                  type="text"
                  value={editAnnTitle}
                  onChange={(e) => setEditAnnTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                    Categoria
                  </label>
                  <select
                    value={editAnnCategory}
                    onChange={(e) => setEditAnnCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 bg-white"
                  >
                    <option value="Institucional">Institucional</option>
                    <option value="Aviso Importante">Aviso Importante</option>
                    <option value="Reunião">Reunião</option>
                    <option value="Missão">Missão</option>
                    <option value="Laboratório">Laboratório</option>
                    <option value="Camisetas">Camisetas</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="editAnnPinned"
                    checked={editAnnPinned}
                    onChange={(e) => setEditAnnPinned(e.target.checked)}
                    className="w-4 h-4 text-pastoral-dourado rounded"
                  />
                  <label htmlFor="editAnnPinned" className="text-xs font-semibold text-zinc-700 cursor-pointer">
                    Fixar no topo do mural
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                  Conteúdo da Mensagem
                </label>
                <textarea
                  value={editAnnContent}
                  onChange={(e) => setEditAnnContent(e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300"
                  required
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => handleDeleteAnnouncement(editingAnnouncement.id)}
                  className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Excluir comunicado"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingAnnouncement(null)}
                    className="px-4 py-2 rounded-xl text-xs text-zinc-600 hover:bg-zinc-100"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-xs font-bold text-pastoral-profundo bg-pastoral-dourado hover:brightness-105 shadow-xs"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
