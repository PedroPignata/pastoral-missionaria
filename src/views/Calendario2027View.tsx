import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Calendar as CalendarIcon,
  Plus,
  Filter,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  List,
  Grid,
  CalendarDays,
  X,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Trash2,
  Landmark,
  Cake,
  Info,
  CalendarCheck2,
  Share2,
} from 'lucide-react';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const WEEKDAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const CATEGORIES = [
  'Todas',
  'Reuniões',
  'Missões',
  'Estágios',
  'Laboratórios',
  'Formações',
  'Vigílias',
  'Retiros',
  'Eventos',
  'Arrecadações',
  'Confraternizações',
  'Outros',
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  Reuniões: { bg: 'bg-amber-50', text: 'text-amber-800', dot: 'bg-amber-500' },
  Missões: { bg: 'bg-rose-50', text: 'text-rose-800', dot: 'bg-rose-500' },
  Estágios: { bg: 'bg-blue-50', text: 'text-blue-800', dot: 'bg-blue-500' },
  Laboratórios: { bg: 'bg-indigo-50', text: 'text-indigo-800', dot: 'bg-indigo-500' },
  Formações: { bg: 'bg-cyan-50', text: 'text-cyan-800', dot: 'bg-cyan-500' },
  Vigílias: { bg: 'bg-purple-50', text: 'text-purple-800', dot: 'bg-purple-500' },
  Retiros: { bg: 'bg-emerald-50', text: 'text-emerald-800', dot: 'bg-emerald-500' },
  Eventos: { bg: 'bg-orange-50', text: 'text-orange-800', dot: 'bg-orange-500' },
  Arrecadações: { bg: 'bg-lime-50', text: 'text-lime-800', dot: 'bg-lime-600' },
  Confraternizações: { bg: 'bg-pink-50', text: 'text-pink-800', dot: 'bg-pink-500' },
  Feriados: { bg: 'bg-slate-100', text: 'text-slate-800', dot: 'bg-slate-500' },
  Outros: { bg: 'bg-zinc-100', text: 'text-zinc-700', dot: 'bg-zinc-500' },
};

export const Calendario2027View: React.FC = () => {
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'coordenador';

  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');

  // View state: 'mes' (default grid), 'lista' (agenda), 'ano' (12 mini-grids)
  const [viewMode, setViewMode] = useState<'mes' | 'lista' | 'ano'>('mes');

  // Activity filter tab
  const [activityTab, setActivityTab] = useState<'todas' | 'pastoral' | 'feriados' | 'aniversarios'>('todas');

  // Real date in America/Sao_Paulo
  const todaySP = useMemo(() => {
    try {
      const parts = new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
      }).formatToParts(new Date());
      const y = Number(parts.find((p) => p.type === 'year')?.value || 2026);
      const m = Number(parts.find((p) => p.type === 'month')?.value || 11) - 1;
      const d = Number(parts.find((p) => p.type === 'day')?.value || 3);
      return {
        year: y,
        month: m,
        day: d,
        isoDate: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
      };
    } catch {
      const d = new Date();
      return {
        year: d.getFullYear(),
        month: d.getMonth(),
        day: d.getDate(),
        isoDate: d.toISOString().split('T')[0],
      };
    }
  }, []);

  const [currentYear, setCurrentYear] = useState<number>(todaySP.year);
  const [currentMonth, setCurrentMonth] = useState<number>(todaySP.month);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');

  // Modals state
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [isNewOpen, setIsNewOpen] = useState(false);

  // New Event Form fields
  const [newTitle, setNewTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState(todaySP.isoDate);
  const [newEndDate, setNewEndDate] = useState('');
  const [newEventTime, setNewEventTime] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newCategory, setNewCategory] = useState('Reuniões');
  const [newStatus, setNewStatus] = useState('Planejado');
  const [newDescription, setNewDescription] = useState('');

  // Edit Event Form fields
  const [editTitle, setEditTitle] = useState('');
  const [editEventDate, setEditEventDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [editEventTime, setEditEventTime] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Fixed clean year numbers (2025, 2026, 2027, 2028)
  const yearOptions = useMemo(() => {
    const defaultYears = [2025, 2026, 2027, 2028];
    const setYears = new Set<number>(defaultYears);
    for (const ev of events) {
      const y = parseInt(ev.event_date?.slice(0, 4), 10);
      if (!isNaN(y) && y >= 2024 && y <= 2030) setYears.add(y);
    }
    return Array.from(setYears).sort((a, b) => a - b);
  }, [events]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const list = await api.getCalendarEvents({
        include_birthdays: true,
        include_holidays: true,
      });
      setEvents(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  // Filtered events by year, category and activity tab
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const evYear = parseInt(ev.event_date.slice(0, 4), 10);
      const endYear = ev.end_date ? parseInt(ev.end_date.slice(0, 4), 10) : evYear;
      if (evYear !== currentYear && endYear !== currentYear) return false;

      // Filter by Activity Tab
      if (activityTab === 'pastoral' && (ev.is_holiday || ev.is_birthday)) return false;
      if (activityTab === 'feriados' && !ev.is_holiday) return false;
      if (activityTab === 'aniversarios' && !ev.is_birthday) return false;

      // Filter by Category
      if (selectedCategory !== 'Todas') {
        if (ev.category !== selectedCategory) return false;
      }

      return true;
    });
  }, [events, currentYear, selectedCategory, activityTab]);

  // Fast map of events by date string with multi-day support
  const eventsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const ev of filteredEvents) {
      const startDate = ev.event_date;
      const endDate = ev.end_date || ev.event_date;

      if (!endDate || endDate <= startDate) {
        if (!map[startDate]) map[startDate] = [];
        map[startDate].push(ev);
      } else {
        // Multi-day event spanning from startDate to endDate
        const [sy, sm, sd] = startDate.split('-').map(Number);
        const [ey, em, ed] = endDate.split('-').map(Number);
        const cur = new Date(sy, sm - 1, sd);
        const end = new Date(ey, em - 1, ed);

        let count = 0;
        while (cur <= end && count < 60) {
          const y = cur.getFullYear();
          const m = String(cur.getMonth() + 1).padStart(2, '0');
          const d = String(cur.getDate()).padStart(2, '0');
          const dStr = `${y}-${m}-${d}`;
          if (!map[dStr]) map[dStr] = [];
          if (!map[dStr].some((x) => x.id === ev.id)) {
            map[dStr].push({
              ...ev,
              is_multi_day: true,
              is_first_day: dStr === startDate,
              is_last_day: dStr === endDate,
            });
          }
          cur.setDate(cur.getDate() + 1);
          count++;
        }
      }
    }
    return map;
  }, [filteredEvents]);

  // Calendar Grid calculation for currentMonth and currentYear
  const gridDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Domingo
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const days: { day: number; dateStr: string; isCurrentMonth: boolean }[] = [];

    // Prefix empty slots from previous month
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ day: 0, dateStr: '', isCurrentMonth: false });
    }

    // Days in current month
    for (let d = 1; d <= daysInMonth; d++) {
      const mStr = String(currentMonth + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      const dateStr = `${currentYear}-${mStr}-${dStr}`;
      days.push({ day: d, dateStr, isCurrentMonth: true });
    }

    return days;
  }, [currentYear, currentMonth]);

  // Navigation handlers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleToday = () => {
    setCurrentYear(todaySP.year);
    setCurrentMonth(todaySP.month);
    setSelectedDateStr(null);
    setSelectedEvent(null);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createCalendarEvent({
        title: newTitle,
        event_date: newEventDate,
        end_date: newEndDate || null,
        event_time: newEventTime || null,
        location: newLocation || null,
        category: newCategory,
        status: newStatus,
        description: newDescription || null,
      });
      setFeedback('Evento adicionado ao calendário com sucesso!');
      setIsNewOpen(false);
      setNewTitle('');
      setNewEventDate(todaySP.isoDate);
      setNewEndDate('');
      setNewEventTime('');
      setNewLocation('');
      setNewDescription('');
      loadEvents();
      setTimeout(() => setFeedback(''), 4000);
    } catch (err: any) {
      setFeedback('Erro ao criar evento: ' + (err.message || 'Tente novamente'));
    }
  };

  const openEditModal = (ev: any) => {
    setEditingEvent(ev);
    setEditTitle(ev.title);
    setEditEventDate(ev.event_date);
    setEditEndDate(ev.end_date || '');
    setEditEventTime(ev.event_time || '');
    setEditLocation(ev.location || '');
    setEditCategory(ev.category || 'Reuniões');
    setEditStatus(ev.status || 'Confirmado');
    setEditDescription(ev.description || '');
    setSelectedEvent(null);
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;

    try {
      await api.updateCalendarEvent(editingEvent.id, {
        title: editTitle,
        event_date: editEventDate,
        end_date: editEndDate || null,
        event_time: editEventTime || null,
        location: editLocation || null,
        category: editCategory,
        status: editStatus,
        description: editDescription,
      });

      setFeedback('Evento atualizado com sucesso!');
      setEditingEvent(null);
      loadEvents();
      setTimeout(() => setFeedback(''), 4000);
    } catch (err: any) {
      setFeedback('Erro ao atualizar evento: ' + (err.message || 'Tente novamente'));
    }
  };

  const handleCancelEvent = async (ev: any) => {
    if (!confirm(`Deseja marcar o evento "${ev.title}" como Cancelado?`)) return;
    try {
      await api.updateCalendarEvent(ev.id, { status: 'Cancelado' });
      setFeedback('Evento marcado como Cancelado.');
      if (selectedEvent?.id === ev.id) setSelectedEvent(null);
      if (editingEvent?.id === ev.id) setEditingEvent(null);
      loadEvents();
      setTimeout(() => setFeedback(''), 4000);
    } catch (err: any) {
      setFeedback('Erro ao cancelar: ' + err.message);
    }
  };

  const handleDeleteEvent = async (ev: any) => {
    if (!confirm(`Tem certeza que deseja EXCLUIR PERMANENTEMENTE o evento "${ev.title}"? Esta ação é irreversível.`)) return;
    try {
      await api.deleteCalendarEvent(ev.id, true);
      setFeedback('Evento excluído do calendário.');
      if (selectedEvent?.id === ev.id) setSelectedEvent(null);
      if (editingEvent?.id === ev.id) setEditingEvent(null);
      loadEvents();
      setTimeout(() => setFeedback(''), 4000);
    } catch (err: any) {
      setFeedback('Erro ao excluir: ' + err.message);
    }
  };

  const openNewEventForDate = (dateStr: string) => {
    setNewEventDate(dateStr);
    setNewEndDate('');
    setIsNewOpen(true);
    setSelectedDateStr(null);
  };

  const selectedDayEvents = selectedDateStr ? (eventsByDate[selectedDateStr] || []) : [];

  return (
    <div className="space-y-5">
      {/* 1. Header Limpo Conforme Seção 3 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-3xl border border-zinc-200/80 shadow-xs">
        <div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-pastoral-cafe">
            Calendário
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Datas e atividades da Pastoral
          </p>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setNewEventDate(`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`);
                setNewEndDate('');
                setIsNewOpen(true);
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold text-pastoral-profundo bg-pastoral-dourado hover:brightness-105 flex items-center gap-1.5 shadow-gold transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Evento</span>
            </button>
          </div>
        )}
      </div>

      {feedback && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* 2. Barra de Navegação, Filtros e Modos */}
      <div className="bg-white p-4 rounded-3xl border border-zinc-200/80 shadow-xs space-y-3">
        {/* Linha 1: Seletores de Mês, Ano Limpo e Modos de Visualização */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-700 transition-colors"
              title="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={handleNextMonth}
              className="p-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-700 transition-colors"
              title="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={handleToday}
              className="px-3 py-1.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-xs font-semibold text-zinc-700 transition-colors"
            >
              Hoje
            </button>

            <div className="flex items-center gap-1.5 pl-2">
              <select
                value={currentMonth}
                onChange={(e) => setCurrentMonth(parseInt(e.target.value, 10))}
                className="px-3 py-1.5 rounded-xl border border-zinc-200 text-xs font-bold text-pastoral-cafe bg-white focus:ring-1 focus:ring-pastoral-dourado"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={idx}>
                    {name}
                  </option>
                ))}
              </select>

              {/* Seletor de Ano com números limpos (2025, 2026, 2027, 2028) */}
              <select
                value={currentYear}
                onChange={(e) => setCurrentYear(parseInt(e.target.value, 10))}
                className="px-3 py-1.5 rounded-xl border border-zinc-200 text-xs font-bold text-pastoral-cafe bg-white focus:ring-1 focus:ring-pastoral-dourado"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center gap-2">
            <div className="flex items-center p-1 rounded-xl bg-zinc-100 border border-zinc-200 text-xs font-semibold">
              <button
                onClick={() => setViewMode('mes')}
                className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
                  viewMode === 'mes'
                    ? 'bg-white text-pastoral-cafe font-bold shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Mês</span>
              </button>

              <button
                onClick={() => setViewMode('lista')}
                className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
                  viewMode === 'lista'
                    ? 'bg-white text-pastoral-cafe font-bold shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Lista</span>
              </button>

              <button
                onClick={() => setViewMode('ano')}
                className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
                  viewMode === 'ano'
                    ? 'bg-white text-pastoral-cafe font-bold shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Ano</span>
              </button>
            </div>

            {/* Filtro por Categoria */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-700 bg-white"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'Todas' ? 'Todas as Categorias' : cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Linha 2: Abas de Escopo (Todas / Pastoral / Feriados / Aniversários) */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-zinc-100">
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mr-1">
            Exibir:
          </span>
          <button
            onClick={() => setActivityTab('todas')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
              activityTab === 'todas'
                ? 'bg-pastoral-cafe text-white shadow-xs'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            Todas as Atividades
          </button>
          <button
            onClick={() => setActivityTab('pastoral')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
              activityTab === 'pastoral'
                ? 'bg-pastoral-dourado text-pastoral-profundo font-bold shadow-xs'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            ✝️ Atividades da Pastoral
          </button>
          <button
            onClick={() => setActivityTab('feriados')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
              activityTab === 'feriados'
                ? 'bg-slate-700 text-white shadow-xs'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            🏛️ Feriados & Comemorações
          </button>
          <button
            onClick={() => setActivityTab('aniversarios')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
              activityTab === 'aniversarios'
                ? 'bg-amber-400 text-amber-950 font-bold shadow-xs'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            🎂 Aniversários
          </button>
        </div>
      </div>

      {/* 3. MODO MÊS (Grade Principal) */}
      {viewMode === 'mes' && (
        <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-xs overflow-hidden">
          {/* Header dos dias da semana */}
          <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-50 text-center py-2 text-xs font-bold text-zinc-600">
            {WEEKDAY_NAMES.map((name) => (
              <div key={name}>{name}</div>
            ))}
          </div>

          {/* Grade de 7 colunas */}
          <div className="grid grid-cols-7 divide-x divide-y divide-zinc-200/60">
            {gridDays.map((item, index) => {
              if (!item.isCurrentMonth) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="min-h-[105px] sm:min-h-[120px] bg-zinc-50/50 p-2"
                  />
                );
              }

              const dayEvents = eventsByDate[item.dateStr] || [];
              const isToday = item.dateStr === todaySP.isoDate;

              return (
                <div
                  key={item.dateStr}
                  onClick={() => setSelectedDateStr(item.dateStr)}
                  className={`min-h-[105px] sm:min-h-[120px] p-2 flex flex-col justify-between cursor-pointer hover:bg-pastoral-creme/25 transition-colors group relative ${
                    isToday ? 'bg-amber-50/50 ring-2 ring-pastoral-dourado/60' : 'bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                        isToday
                          ? 'bg-pastoral-dourado text-pastoral-profundo shadow-2xs font-extrabold'
                          : 'text-zinc-700 group-hover:text-pastoral-cafe'
                      }`}
                    >
                      {item.day}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] font-bold text-pastoral-vinho px-1.5 py-0.2 rounded-full bg-pastoral-creme border border-pastoral-dourado/30 sm:hidden">
                        {dayEvents.length}
                      </span>
                    )}
                  </div>

                  {/* Badges de Eventos em Desktop */}
                  <div className="mt-1 space-y-1 flex-1 overflow-hidden hidden sm:block">
                    {dayEvents.slice(0, 3).map((ev) => {
                      if (ev.is_birthday) {
                        return (
                          <div
                            key={ev.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEvent(ev);
                            }}
                            className="px-1.5 py-0.5 rounded-md text-[10px] font-bold truncate flex items-center gap-1 bg-amber-100/90 text-amber-900 border border-amber-300/80 hover:brightness-95"
                            title={ev.title}
                          >
                            <span>🎂</span>
                            <span className="truncate">{ev.title.replace('🎂 Aniversário: ', '')}</span>
                          </div>
                        );
                      }

                      if (ev.is_holiday) {
                        return (
                          <div
                            key={ev.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEvent(ev);
                            }}
                            className="px-1.5 py-0.5 rounded-md text-[10px] font-medium truncate flex items-center gap-1 bg-slate-100 text-slate-800 border border-slate-300 hover:brightness-95"
                            title={`${ev.title} — ${ev.description}`}
                          >
                            <span className="flex-shrink-0">🏛️</span>
                            <span className="truncate">{ev.title.replace('🏛️ ', '')}</span>
                          </div>
                        );
                      }

                      const color = CATEGORY_COLORS[ev.category] || CATEGORY_COLORS.Outros;
                      return (
                        <div
                          key={ev.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEvent(ev);
                          }}
                          className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold truncate flex items-center gap-1 ${color.bg} ${color.text} border border-black/5 hover:brightness-95 ${
                            ev.status === 'Cancelado' ? 'line-through opacity-60' : ''
                          }`}
                          title={`${ev.title} (${ev.category})`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${color.dot}`} />
                          <span className="truncate">{ev.title}</span>
                          {ev.is_multi_day && (
                            <span className="text-[9px] opacity-70 ml-auto font-normal">multidia</span>
                          )}
                        </div>
                      );
                    })}

                    {dayEvents.length > 3 && (
                      <span className="text-[10px] text-zinc-400 font-semibold block px-1">
                        +{dayEvents.length - 3} mais...
                      </span>
                    )}
                  </div>

                  {/* Marcadores de Pontos no Mobile */}
                  <div className="mt-1 flex flex-wrap gap-1 sm:hidden">
                    {dayEvents.map((ev) => {
                      const color = CATEGORY_COLORS[ev.category] || CATEGORY_COLORS.Outros;
                      return (
                        <span
                          key={ev.id}
                          className={`w-2 h-2 rounded-full ${
                            ev.is_birthday
                              ? 'bg-amber-400'
                              : ev.is_holiday
                              ? 'bg-slate-500'
                              : color.dot
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. MODO LISTA (Agenda Compacta) */}
      {viewMode === 'lista' && (
        <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-xs p-6 space-y-4">
          <h3 className="font-serif font-bold text-base text-pastoral-cafe">
            Agenda do Ano {currentYear} ({filteredEvents.length} atividades encontradas)
          </h3>

          {filteredEvents.length === 0 ? (
            <p className="text-xs text-zinc-400 py-8 text-center">
              Nenhuma atividade encontrada para os filtros selecionados.
            </p>
          ) : (
            <div className="space-y-3">
              {filteredEvents.map((ev) => {
                const color = CATEGORY_COLORS[ev.category] || CATEGORY_COLORS.Outros;
                return (
                  <div
                    key={ev.id}
                    onClick={() => setSelectedEvent(ev)}
                    className="p-4 rounded-2xl border border-zinc-200/80 hover:border-pastoral-dourado/60 bg-zinc-50/50 hover:bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-all cursor-pointer shadow-2xs"
                  >
                    <div className="space-y-1 max-w-2xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            ev.is_holiday
                              ? 'bg-slate-200 text-slate-800'
                              : ev.is_birthday
                              ? 'bg-amber-100 text-amber-900'
                              : `${color.bg} ${color.text}`
                          }`}
                        >
                          {ev.is_holiday ? 'Feriado / Comemoração' : ev.is_birthday ? 'Aniversário' : ev.category}
                        </span>

                        <span className="text-xs font-bold text-pastoral-vinho">
                          {ev.end_date && ev.end_date !== ev.event_date
                            ? `${ev.event_date.split('-').reverse().join('/')} a ${ev.end_date.split('-').reverse().join('/')}`
                            : ev.event_date.split('-').reverse().join('/')}
                          {ev.event_time && ev.event_time !== '00:00' ? ` às ${ev.event_time}` : ''}
                        </span>
                      </div>

                      <h4 className="font-serif font-bold text-sm text-pastoral-cafe">
                        {ev.title}
                      </h4>

                      {ev.description && (
                        <p className="text-xs text-zinc-600 leading-relaxed line-clamp-2">
                          {ev.description}
                        </p>
                      )}

                      {ev.location && (
                        <div className="flex items-center gap-1 text-[11px] text-zinc-500">
                          <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                          <span>{ev.location}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <span
                        className={`text-xs font-semibold px-3 py-1 rounded-full border ${
                          ev.status === 'Cancelado'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-pastoral-creme text-pastoral-cafe border-pastoral-dourado/30'
                        }`}
                      >
                        {ev.status}
                      </span>
                      {canEdit && !ev.is_holiday && !ev.is_birthday && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(ev);
                          }}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-pastoral-cafe hover:bg-zinc-100"
                          title="Editar evento"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. MODO ANO (12 Miniaturas de Grade) */}
      {viewMode === 'ano' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {MONTH_NAMES.map((mName, mIdx) => {
            const firstDay = new Date(currentYear, mIdx, 1).getDay();
            const daysInM = new Date(currentYear, mIdx + 1, 0).getDate();
            const mStr = String(mIdx + 1).padStart(2, '0');

            return (
              <div
                key={mName}
                onClick={() => {
                  setCurrentMonth(mIdx);
                  setViewMode('mes');
                }}
                className="bg-white p-3.5 rounded-2xl border border-zinc-200/80 shadow-xs hover:border-pastoral-dourado cursor-pointer transition-all hover:shadow-md"
              >
                <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                  <h4 className="font-serif font-bold text-xs text-pastoral-cafe">
                    {mName}
                  </h4>
                  <span className="text-[10px] text-pastoral-dourado font-bold">
                    {filteredEvents.filter((e) => e.event_date.slice(5, 7) === mStr).length} datas
                  </span>
                </div>

                <div className="grid grid-cols-7 text-[9px] text-center text-zinc-400 font-bold py-1">
                  {WEEKDAY_NAMES.map((w) => (
                    <span key={w}>{w[0]}</span>
                  ))}
                </div>

                <div className="grid grid-cols-7 text-[10px] text-center gap-y-1">
                  {Array.from({ length: firstDay }).map((_, i) => (
                    <span key={`p-${i}`} />
                  ))}
                  {Array.from({ length: daysInM }).map((_, d) => {
                    const dayNum = d + 1;
                    const dStr = String(dayNum).padStart(2, '0');
                    const fullDate = `${currentYear}-${mStr}-${dStr}`;
                    const hasEvent = !!eventsByDate[fullDate];

                    return (
                      <span
                        key={fullDate}
                        className={`py-0.5 rounded-full flex items-center justify-center font-medium ${
                          hasEvent
                            ? 'bg-pastoral-dourado text-pastoral-profundo font-bold shadow-2xs'
                            : 'text-zinc-600'
                        }`}
                      >
                        {dayNum}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Detalhes do Dia Selecionado */}
      {selectedDateStr && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-pastoral-dourado/40 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-pastoral-dourado">
                  Atividades do Dia
                </span>
                <h3 className="font-serif font-bold text-lg text-pastoral-cafe">
                  {selectedDateStr.split('-').reverse().join('/')}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDateStr(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedDayEvents.length === 0 ? (
              <div className="py-6 text-center text-zinc-500 text-xs space-y-2">
                <p>Nenhuma atividade registrada nesta data.</p>
                {canEdit && (
                  <button
                    onClick={() => openNewEventForDate(selectedDateStr)}
                    className="px-3 py-1.5 rounded-xl bg-pastoral-cafe text-white font-semibold text-xs hover:bg-pastoral-profundo inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adicionar Evento Neste Dia</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                {selectedDayEvents.map((ev) => {
                  const color = CATEGORY_COLORS[ev.category] || CATEGORY_COLORS.Outros;

                  if (ev.is_birthday) {
                    return (
                      <div
                        key={ev.id}
                        className="p-4 rounded-2xl border border-amber-200 bg-amber-50/70 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                            🎂 Aniversário Missionário
                          </span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white text-amber-800 border border-amber-200">
                            Comemoração
                          </span>
                        </div>

                        <h4 className="font-serif font-bold text-sm text-pastoral-cafe">
                          {ev.title}
                        </h4>

                        <p className="text-xs text-amber-900/80 leading-relaxed">
                          {ev.description || 'Comemoração fraterna da vocação e vida missionária.'}
                        </p>

                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              const nameResp = ev.responsibles?.[0] || 'irmão(ã)';
                              const msg = `Parabéns, ${nameResp}! Que Deus abençoe sua vida, fortaleça sua caminhada na Pastoral Missionária e derrame muitas graças sobre você. Feliz aniversário! 🎂🎉`;
                              navigator.clipboard.writeText(msg);
                              setFeedback('Mensagem de felicitações copiada para a área de transferência!');
                              setTimeout(() => setFeedback(''), 4000);
                            }}
                            className="text-xs px-3 py-1.5 rounded-xl bg-amber-200/80 hover:bg-amber-300 text-amber-950 font-semibold transition-colors flex items-center gap-1.5"
                          >
                            <span>Copiar Felicitação para WhatsApp</span>
                          </button>
                        </div>
                      </div>
                    );
                  }

                  if (ev.is_holiday) {
                    return (
                      <div
                        key={ev.id}
                        className="p-4 rounded-2xl border border-slate-300 bg-slate-50 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-800 border border-slate-300">
                            🏛️ {ev.notes || 'Feriado Oficial'}
                          </span>
                        </div>
                        <h4 className="font-serif font-bold text-sm text-slate-900">
                          {ev.title}
                        </h4>
                        <p className="text-xs text-slate-700 leading-relaxed">
                          {ev.description}
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={ev.id}
                      className="p-4 rounded-2xl border border-zinc-200/80 bg-zinc-50/70 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${color.bg} ${color.text}`}>
                          {ev.category}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-pastoral-creme text-pastoral-cafe border border-pastoral-dourado/30">
                            {ev.status}
                          </span>
                          {canEdit && (
                            <button
                              onClick={() => openEditModal(ev)}
                              className="p-1 rounded-lg text-zinc-500 hover:text-pastoral-cafe hover:bg-zinc-200"
                              title="Editar evento"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <h4 className="font-serif font-bold text-sm text-pastoral-cafe">
                        {ev.title}
                      </h4>

                      {ev.end_date && ev.end_date !== ev.event_date && (
                        <p className="text-xs font-semibold text-pastoral-vinho">
                          Período: {ev.event_date.split('-').reverse().join('/')} até {ev.end_date.split('-').reverse().join('/')}
                        </p>
                      )}

                      {ev.description && (
                        <p className="text-xs text-zinc-600 leading-relaxed whitespace-pre-line">
                          {ev.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-500 pt-1">
                        {ev.event_time && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-zinc-400" />
                            {ev.event_time}
                          </span>
                        )}
                        {ev.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                            {ev.location}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
              {canEdit && selectedDayEvents.length > 0 && (
                <button
                  onClick={() => openNewEventForDate(selectedDateStr)}
                  className="px-3 py-2 rounded-xl bg-pastoral-cafe text-white font-semibold text-xs hover:bg-pastoral-profundo flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Mais Um Evento</span>
                </button>
              )}
              <button
                onClick={() => setSelectedDateStr(null)}
                className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold text-xs"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Visualização de Detalhes de um Evento */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-pastoral-dourado/40 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    selectedEvent.is_holiday
                      ? 'bg-slate-200 text-slate-800'
                      : selectedEvent.is_birthday
                      ? 'bg-amber-100 text-amber-900'
                      : 'bg-pastoral-creme text-pastoral-cafe border border-pastoral-dourado/30'
                  }`}
                >
                  {selectedEvent.is_holiday
                    ? 'Feriado Oficial'
                    : selectedEvent.is_birthday
                    ? 'Aniversário'
                    : selectedEvent.category}
                </span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700">
                  {selectedEvent.status}
                </span>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <h3 className="font-serif font-bold text-lg text-pastoral-cafe">
                {selectedEvent.title}
              </h3>

              <div className="grid grid-cols-2 gap-2 text-xs bg-zinc-50 p-3 rounded-2xl border border-zinc-200">
                <div>
                  <span className="block text-[10px] font-bold text-zinc-400 uppercase">
                    {selectedEvent.end_date && selectedEvent.end_date !== selectedEvent.event_date ? 'Período' : 'Data'}
                  </span>
                  <span className="font-semibold text-zinc-800">
                    {selectedEvent.end_date && selectedEvent.end_date !== selectedEvent.event_date
                      ? `${selectedEvent.event_date.split('-').reverse().join('/')} a ${selectedEvent.end_date.split('-').reverse().join('/')}`
                      : selectedEvent.event_date.split('-').reverse().join('/')}
                  </span>
                </div>
                {selectedEvent.event_time && selectedEvent.event_time !== '00:00' && (
                  <div>
                    <span className="block text-[10px] font-bold text-zinc-400 uppercase">Horário</span>
                    <span className="font-semibold text-zinc-800">{selectedEvent.event_time}</span>
                  </div>
                )}
                {selectedEvent.location && (
                  <div className="col-span-2">
                    <span className="block text-[10px] font-bold text-zinc-400 uppercase">Local</span>
                    <span className="font-semibold text-zinc-800">{selectedEvent.location}</span>
                  </div>
                )}
              </div>

              {selectedEvent.description && (
                <div>
                  <span className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">
                    Descrição Completa / Pauta
                  </span>
                  <div className="text-xs text-zinc-700 leading-relaxed bg-pastoral-creme/20 p-3.5 rounded-2xl border border-pastoral-dourado/20 max-h-60 overflow-y-auto whitespace-pre-wrap">
                    {selectedEvent.description}
                  </div>
                </div>
              )}

              {selectedEvent.responsibles && selectedEvent.responsibles.length > 0 && (
                <div className="text-[11px] text-zinc-500">
                  <span className="font-bold">Responsáveis: </span>
                  <span>{selectedEvent.responsibles.join(', ')}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
              {canEdit && !selectedEvent.is_holiday && !selectedEvent.is_birthday ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(selectedEvent)}
                    className="px-3.5 py-2 rounded-xl bg-pastoral-dourado text-pastoral-profundo font-bold text-xs hover:brightness-105 flex items-center gap-1.5 shadow-xs"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Editar Evento</span>
                  </button>
                  {selectedEvent.status !== 'Cancelado' && (
                    <button
                      onClick={() => handleCancelEvent(selectedEvent)}
                      className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs border border-rose-200 transition-colors"
                    >
                      Cancelar Evento
                    </button>
                  )}
                </div>
              ) : (
                <div />
              )}

              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-semibold text-xs"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Edição Completa de Evento */}
      {editingEvent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-pastoral-dourado/40 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <h3 className="font-serif font-bold text-base text-pastoral-cafe flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-pastoral-dourado" />
                <span>Editar Evento</span>
              </h3>
              <button
                onClick={() => setEditingEvent(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateEvent} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                  Título do Evento *
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 focus:ring-1 focus:ring-pastoral-dourado"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                    Data de Início *
                  </label>
                  <input
                    type="date"
                    value={editEventDate}
                    onChange={(e) => setEditEventDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                    Data de Término (Multidias)
                  </label>
                  <input
                    type="date"
                    value={editEndDate}
                    onChange={(e) => setEditEndDate(e.target.value)}
                    placeholder="Opcional"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                    Horário
                  </label>
                  <input
                    type="text"
                    value={editEventTime}
                    onChange={(e) => setEditEventTime(e.target.value)}
                    placeholder="Ex: 19h30"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                    Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 bg-white"
                  >
                    <option value="Confirmado">Confirmado</option>
                    <option value="Planejado">Planejado</option>
                    <option value="A confirmar">A confirmar</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                    Categoria
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 bg-white"
                  >
                    {CATEGORIES.filter((c) => c !== 'Todas').map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                    Local
                  </label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    placeholder="Ex: Paróquia São Vicente"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                  Descrição Completa
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 font-mono text-xs"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => handleDeleteEvent(editingEvent)}
                  className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Excluir permanentemente"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingEvent(null)}
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

      {/* MODAL 4: Criação de Novo Evento */}
      {isNewOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-pastoral-dourado/40 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <h3 className="font-serif font-bold text-base text-pastoral-cafe">
                Novo Evento no Calendário
              </h3>
              <button
                onClick={() => setIsNewOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                  Título do Evento *
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ex: Reunião Geral de Oração"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 focus:ring-1 focus:ring-pastoral-dourado"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                    Data de Início *
                  </label>
                  <input
                    type="date"
                    value={newEventDate}
                    onChange={(e) => setNewEventDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                    Data de Término (Multidias)
                  </label>
                  <input
                    type="date"
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    placeholder="Opcional"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                    Horário (Opcional)
                  </label>
                  <input
                    type="text"
                    value={newEventTime}
                    onChange={(e) => setNewEventTime(e.target.value)}
                    placeholder="Ex: 19h30"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                    Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 bg-white"
                  >
                    <option value="Planejado">Planejado</option>
                    <option value="Confirmado">Confirmado</option>
                    <option value="A confirmar">A confirmar</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                    Categoria
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 bg-white"
                  >
                    {CATEGORIES.filter((c) => c !== 'Todas').map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                    Local (Opcional)
                  </label>
                  <input
                    type="text"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="Ex: Salão Paroquial São Vicente de Paulo"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                  Descrição / Orientações
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Informações sobre pauta, materiais, vestimenta ou objetivo..."
                  rows={3}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsNewOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-zinc-600 hover:bg-zinc-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-pastoral-profundo bg-pastoral-dourado hover:brightness-105 shadow-xs"
                >
                  Salvar Evento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};