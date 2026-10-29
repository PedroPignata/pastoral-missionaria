import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Calendar as CalendarIcon,
  Plus,
  RefreshCw,
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
  const [currentYear, setCurrentYear] = useState<number>(2027);
  const [currentMonth, setCurrentMonth] = useState<number>(0); // 0 = Janeiro
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');

  // Selected Day Details Modal
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  // Modal state for creating new event
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState('2027-01-24');
  const [eventTime, setEventTime] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('Reuniões');
  const [status, setStatus] = useState('Planejado');
  const [description, setDescription] = useState('');

  const loadEvents = async () => {
    setLoading(true);
    try {
      const list = await api.getCalendarEvents();
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

  // Events filtered by category and active year
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const evYear = parseInt(ev.event_date.slice(0, 4), 10);
      if (evYear !== currentYear) return false;
      if (selectedCategory !== 'Todas' && ev.category !== selectedCategory) {
        return false;
      }
      return true;
    });
  }, [events, currentYear, selectedCategory]);

  // Map of events by ISO date string (YYYY-MM-DD) for fast grid lookup
  const eventsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const ev of filteredEvents) {
      if (!map[ev.event_date]) {
        map[ev.event_date] = [];
      }
      map[ev.event_date].push(ev);
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
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createCalendarEvent({
        title,
        event_date: eventDate,
        event_time: eventTime || null,
        location: location || null,
        category,
        status,
        description: description || null,
      });
      setFeedback('Evento criado com sucesso!');
      setIsNewOpen(false);
      setTitle('');
      setEventTime('');
      setLocation('');
      setDescription('');
      loadEvents();
      setTimeout(() => setFeedback(''), 4000);
    } catch (err: any) {
      setFeedback('Erro ao criar evento: ' + (err.message || 'Tente novamente'));
    }
  };

  const handleReimport = async () => {
    if (!confirm('Deseja verificar e importar as 26 datas oficiais do Calendário 2027? Operação idempotente.')) return;
    try {
      const res = await api.reimport2027Calendar();
      setFeedback(`Verificação concluída: ${res.count} eventos oficiais garantidos!`);
      loadEvents();
      setTimeout(() => setFeedback(''), 5000);
    } catch (e: any) {
      setFeedback('Erro ao reimportar: ' + e.message);
    }
  };

  const openNewEventForDate = (dateStr: string) => {
    setEventDate(dateStr);
    setIsNewOpen(true);
    setSelectedDateStr(null);
  };

  const selectedDayEvents = selectedDateStr ? (eventsByDate[selectedDateStr] || []) : [];

  return (
    <div className="space-y-5">
      {/* Top Header & Context */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-3xl border border-zinc-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-pastoral-dourado font-bold text-xs uppercase tracking-wider">
            <CalendarIcon className="w-4 h-4" />
            <span>Calendário Oficial da Pastoral Missionária</span>
          </div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-pastoral-cafe mt-0.5">
            Agenda e Atividades Missionárias
          </h2>
          <p className="text-xs text-zinc-500">
            Reuniões, vigílias, estágios, retiros e laboratórios planejados
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <>
              <button
                onClick={handleReimport}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-pastoral-cafe bg-pastoral-creme hover:bg-pastoral-creme-escuro border border-pastoral-dourado/40 flex items-center gap-1.5 transition-colors"
                title="Garante as 26 datas do documento oficial sem duplicação"
              >
                <RefreshCw className="w-3.5 h-3.5 text-pastoral-dourado" />
                <span>Revalidar Datas Oficiais</span>
              </button>
              <button
                onClick={() => {
                  setEventDate(`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`);
                  setIsNewOpen(true);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-pastoral-profundo bg-pastoral-dourado hover:brightness-105 flex items-center gap-1.5 shadow-gold transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Evento</span>
              </button>
            </>
          )}
        </div>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Controls Bar: Navigation, Selectors, View Modes & Filters */}
      <div className="bg-white p-4 rounded-3xl border border-zinc-200/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Month/Year Navigation */}
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

              <select
                value={currentYear}
                onChange={(e) => setCurrentYear(parseInt(e.target.value, 10))}
                className="px-3 py-1.5 rounded-xl border border-zinc-200 text-xs font-bold text-pastoral-cafe bg-white focus:ring-1 focus:ring-pastoral-dourado"
              >
                <option value={2026}>2026</option>
                <option value={2027}>2027 (Oficial)</option>
                <option value={2028}>2028</option>
                <option value={2029}>2029</option>
              </select>
            </div>
          </div>

          {/* View Mode Switcher: Mês / Lista / Ano */}
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

            {/* Category Filter */}
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

        {/* November explanation banner if November is active */}
        {currentMonth === 10 && currentYear === 2027 && (
          <div className="p-3 bg-pastoral-creme/60 border border-pastoral-dourado/30 rounded-2xl text-xs text-pastoral-cafe flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-pastoral-dourado flex-shrink-0" />
            <span>
              <strong>Mês de Novembro/2027:</strong> No documento oficial da Pastoral Missionária, não há eventos previstos para este mês (período reservado para intercessão e descanso). Novos eventos podem ser agendados pela coordenação.
            </span>
          </div>
        )}
      </div>

      {/* MAIN VIEW: 1. GRADE MENSAL (Padrão) */}
      {viewMode === 'mes' && (
        <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-xs overflow-hidden">
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-50/70 text-center text-xs font-bold text-zinc-500 py-3">
            {WEEKDAY_NAMES.map((w, idx) => (
              <div key={w} className={idx === 0 ? 'text-rose-700' : ''}>
                {w}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-zinc-200">
            {gridDays.map((item, idx) => {
              if (!item.isCurrentMonth) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className="min-h-[100px] sm:min-h-[120px] bg-zinc-50/40 p-2"
                  />
                );
              }

              const dayEvents = eventsByDate[item.dateStr] || [];
              const isToday =
                new Date().toISOString().split('T')[0] === item.dateStr;

              return (
                <div
                  key={item.dateStr}
                  onClick={() => setSelectedDateStr(item.dateStr)}
                  className={`min-h-[100px] sm:min-h-[120px] p-2 flex flex-col justify-between cursor-pointer hover:bg-pastoral-creme/20 transition-colors group relative ${
                    isToday ? 'bg-amber-50/40' : 'bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                        isToday
                          ? 'bg-pastoral-dourado text-pastoral-profundo shadow-2xs'
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

                  {/* Badges on Desktop */}
                  <div className="mt-1 space-y-1 flex-1 overflow-hidden hidden sm:block">
                    {dayEvents.slice(0, 3).map((ev) => {
                      const color = CATEGORY_COLORS[ev.category] || CATEGORY_COLORS.Outros;
                      return (
                        <div
                          key={ev.id}
                          className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold truncate flex items-center gap-1 ${color.bg} ${color.text} border border-black/5`}
                          title={`${ev.title} (${ev.category})`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${color.dot}`} />
                          <span className="truncate">{ev.title}</span>
                        </div>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <span className="text-[10px] text-zinc-400 font-semibold block px-1">
                        +{dayEvents.length - 3} mais...
                      </span>
                    )}
                  </div>

                  {/* Dot markers on Mobile */}
                  <div className="mt-1 flex flex-wrap gap-1 sm:hidden">
                    {dayEvents.map((ev) => {
                      const color = CATEGORY_COLORS[ev.category] || CATEGORY_COLORS.Outros;
                      return (
                        <span
                          key={ev.id}
                          className={`w-2 h-2 rounded-full ${color.dot}`}
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

      {/* 2. MODO LISTA (Agenda Compacta) */}
      {viewMode === 'lista' && (
        <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-xs p-6 space-y-4">
          <h3 className="font-serif font-bold text-base text-pastoral-cafe">
            Agenda do Ano {currentYear} ({filteredEvents.length} eventos)
          </h3>

          {filteredEvents.length === 0 ? (
            <p className="text-xs text-zinc-400 py-8 text-center">
              Nenhum evento encontrado para os filtros selecionados.
            </p>
          ) : (
            <div className="space-y-3">
              {filteredEvents.map((ev) => {
                const color = CATEGORY_COLORS[ev.category] || CATEGORY_COLORS.Outros;
                return (
                  <div
                    key={ev.id}
                    className="p-4 rounded-2xl border border-zinc-200/80 hover:border-pastoral-dourado/50 bg-zinc-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${color.bg} ${color.text}`}>
                          {ev.category}
                        </span>
                        <span className="text-xs font-bold text-pastoral-vinho">
                          {ev.event_date.split('-').reverse().join('/')}
                          {ev.event_time ? ` às ${ev.event_time}` : ''}
                        </span>
                      </div>
                      <h4 className="font-serif font-bold text-sm text-pastoral-cafe">
                        {ev.title}
                      </h4>
                      {ev.description && (
                        <p className="text-xs text-zinc-600 leading-relaxed max-w-2xl">
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

                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-pastoral-creme text-pastoral-cafe border border-pastoral-dourado/30 self-start sm:self-center">
                      {ev.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. MODO ANO (12 Miniaturas de Grade) */}
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
                    {
                      filteredEvents.filter((e) => e.event_date.slice(5, 7) === mStr).length
                    }{' '}
                    datas
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

      {/* MODAL: Detalhes do Dia Selecionado */}
      {selectedDateStr && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-pastoral-dourado/40 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-pastoral-dourado">
                  Eventos do Dia
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
                <p>Nenhum evento registrado nesta data.</p>
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
                  return (
                    <div
                      key={ev.id}
                      className="p-4 rounded-2xl border border-zinc-200/80 bg-zinc-50/70 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${color.bg} ${color.text}`}>
                          {ev.category}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-pastoral-creme text-pastoral-cafe border border-pastoral-dourado/30">
                          {ev.status}
                        </span>
                      </div>

                      <h4 className="font-serif font-bold text-sm text-pastoral-cafe">
                        {ev.title}
                      </h4>

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

      {/* MODAL: Criação de Novo Evento */}
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
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Reunião Geral de Oração"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                    Data *
                  </label>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                    Horário (Opcional)
                  </label>
                  <input
                    type="text"
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    placeholder="Ex: 19h30"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                    Categoria
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
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
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 bg-white"
                  >
                    <option value="Planejado">Planejado</option>
                    <option value="Confirmado">Confirmado</option>
                    <option value="A confirmar">A confirmar</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                  Local (Opcional)
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ex: Salão Paroquial São Vicente de Paulo"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                  Descrição / Orientações
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Informações sobre pauta, materiais, vestimenta ou objetivo..."
                  rows={2}
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
