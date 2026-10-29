import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Send,
  BookOpen,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  Users,
} from 'lucide-react';

const ROLES_FUNCTIONS = [
  'Intercessão',
  'Pregação',
  'Formação',
  'Testemunho',
  'Música',
  'Condução de oração',
  'Animação',
  'Apoio',
  'Participação em retiro',
  'Outro',
];

export const MissoesEnviosView: React.FC = () => {
  const { user } = useAuth();
  const canApprove = user?.role === 'admin' || user?.role === 'coordenador';

  const [activeTab, setActiveTab] = useState<'envios' | 'modelos'>('envios');
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Dispatch Request Form
  const [requesterName, setRequesterName] = useState(user?.name || '');
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('2027-03-14');
  const [eventTime, setEventTime] = useState('');
  const [location, setLocation] = useState('Paróquia São Vicente de Paulo');
  const [organization, setOrganization] = useState('Ágape Apostolado de Jovens');
  const [roleFunction, setRoleFunction] = useState('Intercessão');
  const [theme, setTheme] = useState('');
  const [recipient, setRecipient] = useState('Coordenação (Pedro e Fernanda)');
  const [notes, setNotes] = useState('');

  // Generated WhatsApp Preview
  const [generatedWa, setGeneratedWa] = useState<{ text: string; link: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dispData, tplData] = await Promise.all([api.getDispatches(), api.getTemplates()]);
      setDispatches(dispData);
      setTemplates(tplData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmitDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createDispatch({
        requester_name: requesterName,
        event_name: eventName,
        event_date: eventDate,
        event_time: eventTime,
        location,
        organization,
        participation_type: 'Missão / Encontro',
        role_function: roleFunction,
        theme,
        recipient,
        notes,
      });
      setGeneratedWa({ text: res.whatsappText, link: res.waLink });
      setEventName('');
      setTheme('');
      setNotes('');
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    await api.updateDispatchStatus(id, status);
    loadData();
  };

  const handleCopy = () => {
    if (!generatedWa) return;
    navigator.clipboard.writeText(generatedWa.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-xl font-bold text-pastoral-cafe flex items-center gap-2">
            <Send className="w-5 h-5 text-pastoral-dourado" />
            Central de Missões, Solicitações de Envio e Modelos de Encontros
          </h2>
          <p className="text-xs text-zinc-500">
            Solicite autorização de envio à coordenação (Pedro e Fernanda) e consulte os roteiros oficiais da pasta da Pastoral
          </p>
        </div>

        <div className="flex rounded-xl bg-white p-1 border border-zinc-200 shadow-2xs">
          <button
            onClick={() => setActiveTab('envios')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'envios'
                ? 'bg-pastoral-cafe text-white shadow-xs'
                : 'text-zinc-600 hover:text-pastoral-cafe'
            }`}
          >
            Solicitações de Envio ({dispatches.length})
          </button>
          <button
            onClick={() => setActiveTab('modelos')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'modelos'
                ? 'bg-pastoral-cafe text-white shadow-xs'
                : 'text-zinc-600 hover:text-pastoral-cafe'
            }`}
          >
            Modelos de Encontros e Estágios ({templates.length})
          </button>
        </div>
      </div>

      {activeTab === 'envios' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulário de Solicitação de Envio */}
          <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-xs space-y-4">
            <h3 className="font-serif font-bold text-base text-pastoral-cafe">
              Nova Solicitação de Envio Missionário
            </h3>
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
              <strong>Regra Pastoral:</strong> Novos membros são inicialmente autorizados para <em>Intercessão</em> e <em>Apoio</em>. Funções como <em>Pregação</em>, <em>Formação</em> e <em>Testemunho</em> passam pelo discernimento e habilitação da coordenação.
            </div>

            <form onSubmit={handleSubmitDispatch} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                  Missionário(a) Solicitante *
                </label>
                <input
                  type="text"
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                  Evento / Missão *
                </label>
                <input
                  type="text"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder="Ex: Pré Abra-te, Vigília, Revolução Jesus..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
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
                    Horário
                  </label>
                  <input
                    type="text"
                    value={eventTime}
                    onChange={(e) => setEventTime(e.target.value)}
                    placeholder="Ex: 14h00"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                    Função Solicitada *
                  </label>
                  <select
                    value={roleFunction}
                    onChange={(e) => setRoleFunction(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 bg-white"
                  >
                    {ROLES_FUNCTIONS.map((rf) => (
                      <option key={rf} value={rf}>
                        {rf}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                    Destinatário *
                  </label>
                  <select
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 bg-white"
                  >
                    <option value="Coordenação (Pedro e Fernanda)">Pedro e Fernanda</option>
                    <option value="Pedro (Coordenador)">Pedro (Coordenador)</option>
                    <option value="Fernanda (Coordenadora)">Fernanda (Coordenadora)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                  Tema (Se Pregação / Formação)
                </label>
                <input
                  type="text"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  placeholder="Informe o tema caso aplicável"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                  Local / Organização
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                  Observações
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-pastoral-dourado to-pastoral-dourado-claro text-pastoral-profundo shadow-gold flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>Registrar Pedido de Envio e Gerar Mensagem</span>
              </button>
            </form>
          </div>

          {/* Lista de Solicitações + Preview WhatsApp */}
          <div className="lg:col-span-2 space-y-6">
            {generatedWa && (
              <div className="bg-emerald-50/70 p-5 rounded-2xl border border-emerald-300 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-serif font-bold text-sm text-emerald-950">
                    Mensagem de Solicitação Pronta para Revisão
                  </h4>
                  <span className="text-[11px] text-emerald-800">
                    Revise antes de abrir no WhatsApp
                  </span>
                </div>
                <pre className="p-3.5 rounded-xl bg-white border border-emerald-200 text-xs font-mono whitespace-pre-wrap text-pastoral-grafite">
                  {generatedWa.text}
                </pre>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-zinc-300 text-zinc-700 flex items-center gap-1.5"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
                  </button>
                  <a
                    href={generatedWa.link}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white flex items-center gap-1.5 hover:bg-emerald-700"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Abrir no WhatsApp para Enviar</span>
                  </a>
                </div>
              </div>
            )}

            <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-xs space-y-4">
              <h3 className="font-serif font-bold text-base text-pastoral-cafe">
                Histórico e Acompanhamento de Solicitações de Envio
              </h3>

              {dispatches.length === 0 ? (
                <p className="text-xs text-zinc-500 py-8 text-center">
                  Nenhuma solicitação de envio registrada até o momento. Utilize o formulário ao lado para criar a primeira.
                </p>
              ) : (
                <div className="space-y-3">
                  {dispatches.map((d) => (
                    <div
                      key={d.id}
                      className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-pastoral-cafe">{d.requester_name}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pastoral-creme text-pastoral-cafe border border-pastoral-dourado/30">
                            {d.role_function}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              d.status === 'Aprovado'
                                ? 'bg-emerald-100 text-emerald-800'
                                : d.status === 'Negado'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {d.status}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-zinc-800">
                          {d.event_name} — {d.event_date.split('-').reverse().join('/')}
                          {d.event_time ? ` às ${d.event_time}` : ''}
                        </p>
                        {d.theme && <p className="text-[11px] text-zinc-600">Tema: {d.theme}</p>}
                        <p className="text-[11px] text-zinc-400">Destinatário: {d.recipient}</p>
                      </div>

                      {canApprove && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            onClick={() => handleUpdateStatus(d.id, 'Aprovado')}
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Aprovar</span>
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(d.id, 'Concluído')}
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-blue-600 text-white hover:bg-blue-700"
                          >
                            Concluir Missão
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(d.id, 'Negado')}
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 flex items-center gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Negar</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ABA 2: MODELOS PRONTOS EXTRAÍDOS DO PDF INSTITUCIONAL */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              className="bg-white rounded-2xl p-6 border border-zinc-200/80 shadow-xs space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-pastoral-creme text-pastoral-cafe border border-pastoral-dourado/30">
                    {tpl.target_audience}
                  </span>
                  <span className="text-[10px] text-zinc-400">{tpl.source_reference}</span>
                </div>

                <h3 className="font-serif font-bold text-lg text-pastoral-cafe">{tpl.title}</h3>
                <p className="text-xs text-zinc-600 leading-relaxed">{tpl.objective}</p>

                {tpl.suggested_theme && (
                  <div className="p-3 rounded-xl bg-pastoral-creme/50 border border-pastoral-dourado/25 text-xs text-pastoral-cafe">
                    <strong>Tema Sugerido na Pasta:</strong> {tpl.suggested_theme}
                  </div>
                )}

                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-pastoral-cafe flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-pastoral-dourado" />
                    <span>Cronograma de Referência:</span>
                  </h4>
                  <ul className="space-y-1 pl-2 border-l-2 border-pastoral-dourado/40">
                    {(tpl.schedule || []).map((item: string, idx: number) => (
                      <li key={idx} className="text-xs text-zinc-700">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold text-pastoral-cafe flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-pastoral-dourado" />
                    <span>Equipes Previstas:</span>
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(tpl.teams || []).map((team: string, idx: number) => (
                      <span
                        key={idx}
                        className="text-[11px] px-2.5 py-0.5 rounded-lg bg-zinc-100 text-zinc-700 font-medium"
                      >
                        {team}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {tpl.guidelines && (
                <div className="pt-3 border-t border-zinc-100 text-[11px] text-zinc-500 italic">
                  {tpl.guidelines}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
