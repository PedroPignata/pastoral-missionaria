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
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

const MONTHS = [
  { code: 'Todas', label: 'Ano Inteiro (2027)' },
  { code: '01', label: 'Janeiro' },
  { code: '02', label: 'Fevereiro' },
  { code: '03', label: 'Março' },
  { code: '04', label: 'Abril' },
  { code: '05', label: 'Maio' },
  { code: '06', label: 'Junho' },
  { code: '07', label: 'Julho' },
  { code: '08', label: 'Agosto' },
  { code: '09', label: 'Setembro' },
  { code: '10', label: 'Outubro' },
  { code: '11', label: 'Novembro (Sem eventos no PDF)' },
  { code: '12', label: 'Dezembro' },
];

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

export const Calendario2027View: React.FC = () => {
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.role === 'coordenador';

  const [events, setEvents] = useState<any[]>([]);
  const [selectedMonth, setSelectedMonth] = useState('Todas');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');

  // Modal state for new event
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState('2027-01-24');
  const [eventTime, setEventTime] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('Reuniões');
  const [status, setStatus] = useState('Planejado');
  const [notes, setNotes] = useState('');

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

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (selectedMonth !== 'Todas' && ev.event_date.slice(5, 7) !== selectedMonth) {
        return false;
      }
      if (selectedCategory !== 'Todas' && ev.category !== selectedCategory) {
        return false;
      }
      return true;
    });
  }, [events, selectedMonth, selectedCategory]);

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
        notes,
      });
      setTitle('');
      setEventTime('');
      setLocation('');
      setNotes('');
      setIsNewOpen(false);
      setFeedback('Novo compromisso registrado no calendário!');
      loadEvents();
      setTimeout(() => setFeedback(''), 3500);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleReverify2027 = async () => {
    const res = await api.reimportCalendar2027();
    setFeedback(res.message);
    loadEvents();
    setTimeout(() => setFeedback(''), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-xl font-bold text-pastoral-cafe flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-pastoral-dourado" />
            Calendário Centralizado da Pastoral Missionária — 2027
          </h2>
          <p className="text-xs text-zinc-500">
            Importado do documento oficial (26 datas de Janeiro a Dezembro de 2027, sem horários fictícios)
          </p>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleReverify2027}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-zinc-300 text-zinc-700 hover:bg-zinc-50 flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5 text-pastoral-dourado" />
              <span>Verificar Seed Oficial 2027</span>
            </button>
            <button
              onClick={() => setIsNewOpen(!isNewOpen)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-pastoral-dourado to-pastoral-dourado-claro text-pastoral-profundo shadow-gold flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Evento</span>
            </button>
          </div>
        )}
      </div>

      {feedback && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{feedback}</span>
        </div>
      )}

      {/* New Event Form */}
      {isNewOpen && canEdit && (
        <form
          onSubmit={handleCreateEvent}
          className="bg-white p-5 rounded-2xl border border-pastoral-dourado/40 shadow-pastoral space-y-4"
        >
          <h3 className="font-serif font-bold text-sm text-pastoral-cafe">
            Adicionar Compromisso ao Calendário
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                Título da Atividade *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Reunião Extraordinária ou Missão"
                className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300"
                required
              />
            </div>
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
                Categoria *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 bg-white"
              >
                {CATEGORIES.filter((c) => c !== 'Todas').map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                Horário (Opcional)
              </label>
              <input
                type="text"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                placeholder="Ex: 14h00 (ou deixe em branco)"
                className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                Local (Opcional)
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ex: Paróquia São Vicente de Paulo"
                className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                Estado
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 bg-white"
              >
                <option value="Planejado">Planejado</option>
                <option value="A confirmar">A confirmar</option>
                <option value="Confirmado">Confirmado</option>
                <option value="Adiado">Adiado</option>
                <option value="Cancelado">Cancelado</option>
                <option value="Concluído">Concluído</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                Observações
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Detalhes adicionais..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsNewOpen(false)}
              className="px-4 py-2 text-xs text-zinc-600 hover:bg-zinc-100 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold bg-pastoral-cafe text-white rounded-xl"
            >
              Salvar Evento
            </button>
          </div>
        </form>
      )}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-zinc-200/80 shadow-xs flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-xs font-bold text-pastoral-cafe">
          <Filter className="w-4 h-4 text-pastoral-dourado" />
          <span>Filtros:</span>
        </div>

        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="px-3 py-2 text-xs font-medium rounded-xl border border-zinc-300 bg-white"
        >
          {MONTHS.map((m) => (
            <option key={m.code} value={m.code}>
              {m.label}
            </option>
          ))}
        </select>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 text-xs font-medium rounded-xl border border-zinc-300 bg-white"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              Categoria: {c}
            </option>
          ))}
        </select>

        <span className="ml-auto text-xs text-zinc-500 font-medium">
          Exibindo <strong>{filteredEvents.length}</strong> de {events.length} atividades
        </span>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-zinc-500">Carregando calendário...</div>
      ) : filteredEvents.length === 0 ? (
        <div className="bg-white p-10 rounded-2xl border border-zinc-200 text-center space-y-2">
          <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
          <p className="font-serif font-bold text-sm text-pastoral-cafe">
            Nenhum evento registrado para este filtro
          </p>
          <p className="text-xs text-zinc-500">
            {selectedMonth === '11'
              ? 'Conforme o PDF oficial "Calendário da Pastoral Missionária 2027", o mês de Novembro não possui eventos pré-cadastrados.'
              : 'Altere o mês ou a categoria selecionada.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvents.map((ev) => (
            <div
              key={ev.id}
              className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs hover:border-pastoral-dourado/50 transition-all flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold text-pastoral-vinho bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                    {ev.event_date.split('-').reverse().join('/')}
                  </span>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-pastoral-creme text-pastoral-cafe border border-pastoral-dourado/30">
                    {ev.category}
                  </span>
                </div>

                <h3 className="font-serif font-bold text-base text-pastoral-cafe">{ev.title}</h3>
                {ev.notes && <p className="text-xs text-zinc-600 leading-relaxed">{ev.notes}</p>}
              </div>

              <div className="pt-3 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-500">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-pastoral-dourado" />
                    {ev.event_time || 'Horário a confirmar'}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-pastoral-dourado" />
                    {ev.location || 'A definir'}
                  </span>
                </div>
                <span
                  className={`font-bold px-2 py-0.5 rounded-full text-[10px] ${
                    ev.status === 'Confirmado'
                      ? 'bg-emerald-50 text-emerald-700'
                      : ev.status === 'A confirmar'
                      ? 'bg-amber-50 text-amber-800'
                      : 'bg-blue-50 text-blue-800'
                  }`}
                >
                  {ev.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
