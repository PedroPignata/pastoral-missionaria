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
  Lock,
  X,
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
  const canAccessTemplates = user?.role === 'admin' || user?.role === 'coordenador' || user?.role === 'delegado';

  const [activeTab, setActiveTab] = useState<'envios' | 'modelos'>('envios');
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [availableMembers, setAvailableMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Dispatch Request Form
  const [requesterName, setRequesterName] = useState(user?.name || '');
  const [selectedCompanions, setSelectedCompanions] = useState<string[]>([]);
  const [customCompanionInput, setCustomCompanionInput] = useState('');
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
      const [dispData, tplData, membersData] = await Promise.all([
        api.getDispatches(),
        canAccessTemplates ? api.getTemplates().catch(() => []) : Promise.resolve([]),
        api.getMembers({ active: true }).catch(() => []),
      ]);
      setDispatches(dispData);
      setTemplates(tplData);
      if (Array.isArray(membersData)) {
        const names = membersData
          .map((m: any) => m.name || m.display_name)
          .filter(Boolean);
        setAvailableMembers(names);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [canAccessTemplates]);

  const handleAddCompanion = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || selectedCompanions.includes(trimmed)) return;
    setSelectedCompanions((prev) => [...prev, trimmed]);
    setCustomCompanionInput('');
  };

  const handleRemoveCompanion = (name: string) => {
    setSelectedCompanions((prev) => prev.filter((c) => c !== name));
  };

  const handleSubmitDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createDispatch({
        requester_name: requesterName,
        companions: selectedCompanions,
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
      setSelectedCompanions([]);
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
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'modelos'
                ? 'bg-pastoral-cafe text-white shadow-xs'
                : 'text-zinc-600 hover:text-pastoral-cafe'
            }`}
          >
            {!canAccessTemplates && <Lock className="w-3 h-3 text-zinc-400" />}
            <span>Modelos de Encontros e Estágios {canAccessTemplates ? `(${templates.length})` : ''}</span>
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

              {/* 8. Campo Acompanhantes (dois a dois - Lc 10,1) */}
              <div className="p-3 rounded-xl bg-pastoral-creme/50 border border-pastoral-dourado/30 space-y-2">
                <div>
                  <label className="text-[11px] font-bold text-pastoral-cafe uppercase flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-pastoral-dourado" />
                    <span>Quem irá acompanhar você nessa missão?</span>
                  </label>
                  <p className="text-[10px] text-zinc-500 mt-0.5">
                    <em>"O Senhor designou outros setenta e dois e os enviou dois a dois"</em> (Lc 10,1). Na pastoral católica, os missionários nunca vão sós.
                  </p>
                </div>

                {/* Badges dos acompanhantes selecionados */}
                {selectedCompanions.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selectedCompanions.map((comp) => (
                      <span
                        key={comp}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-pastoral-cafe text-white shadow-2xs"
                      >
                        <span>{comp}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCompanion(comp)}
                          className="hover:text-rose-300 ml-0.5"
                          title="Remover acompanhante"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-amber-800 font-medium italic">
                    Nenhum acompanhante selecionado ainda. Adicione ao menos um irmão abaixo:
                  </p>
                )}

                {/* Seletor rápido de membros + Digitação manual para externos */}
                <div className="flex flex-col sm:flex-row gap-1.5 pt-1">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddCompanion(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    defaultValue=""
                    className="sm:w-1/2 px-2.5 py-1.5 text-xs rounded-xl border border-zinc-300 bg-white"
                  >
                    <option value="" disabled>Selecione um missionário...</option>
                    {availableMembers
                      .filter((m) => !selectedCompanions.includes(m) && m !== requesterName)
                      .map((name) => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                  </select>

                  <div className="flex-1 flex gap-1">
                    <input
                      type="text"
                      value={customCompanionInput}
                      onChange={(e) => setCustomCompanionInput(e.target.value)}
                      placeholder="Ou digite o nome..."
                      className="flex-1 px-2.5 py-1.5 text-xs rounded-xl border border-zinc-300"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCompanion(customCompanionInput);
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleAddCompanion(customCompanionInput)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-pastoral-dourado text-pastoral-profundo hover:brightness-105"
                    >
                      +
                    </button>
                  </div>
                </div>
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
                        {d.companions && d.companions.length > 0 && (
                          <p className="text-[11px] text-zinc-700 flex items-center gap-1.5 pt-0.5">
                            <Users className="w-3.5 h-3.5 text-pastoral-dourado flex-shrink-0" />
                            <span><strong>Acompanhantes:</strong> {d.companions.join(', ')}</span>
                          </p>
                        )}
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
      ) : !canAccessTemplates ? (
        <div className="bg-white p-10 rounded-3xl border border-zinc-200 text-center max-w-lg mx-auto space-y-4 my-8 shadow-xs">
          <div className="w-14 h-14 rounded-full bg-amber-50 text-pastoral-dourado flex items-center justify-center mx-auto border border-amber-200">
            <Lock className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-lg text-pastoral-cafe">
              Acesso Restrito à Coordenação e Formação
            </h3>
            <p className="text-xs text-zinc-600 leading-relaxed mt-2">
              Os modelos oficiais de encontros, retiros e estágios da Pastoral Missionária são protegidos e geridos pela coordenação geral e equipe de formação.
            </p>
          </div>
          <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200 text-[11px] text-zinc-600">
            Caso você tenha sido convidado para coordenar ou ministrar uma missão e precise de um roteiro de referência, solicite acesso diretamente à coordenação (Pedro e Fernanda).
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
