import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Member } from '../types';
import {
  GraduationCap,
  Shuffle,
  ClipboardCheck,
  BookOpen,
  Timer,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Search,
  Plus,
  Trash2,
  Archive,
  RefreshCw,
  Copy,
  Share2,
  Users,
  Edit2,
  X,
  Check,
} from 'lucide-react';

interface FormacaoLaboratoriosViewProps {
  members: Member[];
}

const CRITERIA_LIST = [
  { key: 'crit_dominio_assunto', label: '1. Demonstrou completo domínio do assunto?' },
  { key: 'crit_abordagem_tema', label: '2. Abordou adequadamente o tema?' },
  { key: 'crit_objetividade', label: '3. Foi objetivo em suas explicações?' },
  { key: 'crit_cumprimento_tempo', label: '4. Cumpriu o horário estabelecido?' },
  { key: 'crit_embasamento_biblico', label: '5. Teve embasamento bíblico?' },
  { key: 'crit_interacao', label: '6. Teve interação com o evangelizado?' },
  { key: 'crit_testemunho', label: '7. Deu testemunho?' },
  { key: 'crit_oracao', label: '8. Teve oração?' },
] as const;

export const FormacaoLaboratoriosView: React.FC<FormacaoLaboratoriosViewProps> = ({ members }) => {
  const { user } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'coordenador';

  const [activeTab, setActiveTab] = useState<'avaliacao' | 'sorteio' | 'temas' | 'historico'>('avaliacao');
  const [themes, setThemes] = useState<any[]>([]);
  const [labs, setLabs] = useState<any[]>([]);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [feedback, setFeedback] = useState('');

  // 27. Free Text Evaluation Form
  const [labDate, setLabDate] = useState(new Date().toISOString().split('T')[0]);
  const [speakerName, setSpeakerName] = useState('');
  const [themeTitle, setThemeTitle] = useState('');
  const [criteriaValues, setCriteriaValues] = useState<Record<string, 'Sim' | 'Razoavelmente' | 'Não'>>({
    crit_dominio_assunto: 'Sim',
    crit_abordagem_tema: 'Sim',
    crit_objetividade: 'Sim',
    crit_cumprimento_tempo: 'Sim',
    crit_embasamento_biblico: 'Sim',
    crit_interacao: 'Sim',
    crit_testemunho: 'Sim',
    crit_oracao: 'Sim',
  });
  const [comments, setComments] = useState('');
  const [suggestedFutureThemes, setSuggestedFutureThemes] = useState('');

  // 29. Sorteador State
  const [drawTitle, setDrawTitle] = useState('Laboratório de Pregação — Pastoral Missionária');
  const [drawDuration, setDrawDuration] = useState(15);
  const [drawMode, setDrawMode] = useState<'order_and_theme' | 'order_only'>('order_and_theme');
  const [participantSearch, setParticipantSearch] = useState('');
  const [selectedSpeakers, setSelectedSpeakers] = useState<string[]>([]);
  const [customSpeakers, setCustomSpeakers] = useState<string[]>([]);
  const [customSpeakerInput, setCustomSpeakerInput] = useState('');
  const [latestDraw, setLatestDraw] = useState<any[]>([]);

  // 15-min Stopwatch
  const [secondsLeft, setSecondsLeft] = useState(15 * 60);
  const [timerRunning, setTimerRunning] = useState(false);

  // 28. Themes Management Modal & State
  const [themeSearch, setThemeSearch] = useState('');
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [editingThemeId, setEditingThemeId] = useState<string | null>(null);
  const [themeModalTitle, setThemeModalTitle] = useState('');
  const [themeModalDescription, setThemeModalDescription] = useState('');

  // 30. Evaluations History Filter
  const [historySpeakerFilter, setHistorySpeakerFilter] = useState('');

  const loadLabsData = async () => {
    try {
      const data = await api.getLabsData();
      setThemes(data.themes || []);
      setLabs(data.labs || []);
      setEvaluations(data.evaluations || []);
      if (data.labs?.length > 0 && latestDraw.length === 0) {
        const rawResults = data.labs[0].draw_results_json;
        if (typeof rawResults === 'string') {
          try {
            setLatestDraw(JSON.parse(rawResults));
          } catch {
            setLatestDraw(data.labs[0].draw_results || []);
          }
        } else if (Array.isArray(data.labs[0].draw_results)) {
          setLatestDraw(data.labs[0].draw_results);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadLabsData();
  }, []);

  // Timer countdown
  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Submit evaluation (Free theme text)
  const handleSubmitEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!speakerName.trim() || !themeTitle.trim()) {
      alert('Por favor, informe o pregador e o tema da pregação.');
      return;
    }
    try {
      const res = await api.submitLabEvaluation({
        lab_date: labDate,
        speaker_name: speakerName.trim(),
        theme_title: themeTitle.trim(),
        ...criteriaValues,
        comments: comments.trim(),
        suggested_future_themes: suggestedFutureThemes.trim(),
      });
      setFeedback(res.message);
      setSpeakerName('');
      setThemeTitle('');
      setComments('');
      setSuggestedFutureThemes('');
      loadLabsData();
      setTimeout(() => setFeedback(''), 4000);
    } catch (err: any) {
      alert('Erro ao enviar avaliação: ' + err.message);
    }
  };

  // Sorteador participants handlers
  const allAvailableMembers = useMemo(() => {
    const unique = new Map<string, string>();
    for (const m of members) {
      if (m.name) unique.set(m.name.trim().toLowerCase(), m.name.trim());
    }
    for (const c of customSpeakers) {
      if (c) unique.set(c.trim().toLowerCase(), c.trim());
    }
    return Array.from(unique.values()).sort((a, b) => a.localeCompare(b));
  }, [members, customSpeakers]);

  const filteredMembers = useMemo(() => {
    if (!participantSearch.trim()) return allAvailableMembers;
    const term = participantSearch.trim().toLowerCase();
    return allAvailableMembers.filter((m) => m.toLowerCase().includes(term));
  }, [allAvailableMembers, participantSearch]);

  const toggleSpeaker = (name: string) => {
    setSelectedSpeakers((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    );
  };

  const handleSelectAllFiltered = () => {
    const newSelected = new Set([...selectedSpeakers, ...filteredMembers]);
    setSelectedSpeakers(Array.from(newSelected));
  };

  const handleClearSelected = () => {
    setSelectedSpeakers([]);
  };

  const handleAddCustomSpeaker = () => {
    const clean = customSpeakerInput.trim();
    if (!clean) return;
    if (!customSpeakers.includes(clean)) {
      setCustomSpeakers([...customSpeakers, clean]);
    }
    if (!selectedSpeakers.includes(clean)) {
      setSelectedSpeakers([...selectedSpeakers, clean]);
    }
    setCustomSpeakerInput('');
  };

  const handleRemoveCustomSpeaker = (name: string) => {
    setCustomSpeakers(customSpeakers.filter((c) => c !== name));
    setSelectedSpeakers(selectedSpeakers.filter((s) => s !== name));
  };

  // Run Draw
  const handleRunDraw = async () => {
    if (selectedSpeakers.length === 0) {
      alert('Selecione ao menos um participante na lista para o sorteio.');
      return;
    }
    try {
      const res = await api.drawLabThemes({
        title: drawTitle,
        lab_date: labDate,
        duration_minutes: drawDuration,
        speakers: selectedSpeakers,
        draw_mode: drawMode,
      });
      setLatestDraw(res.draw_results);
      setSecondsLeft(drawDuration * 60);
      setFeedback(res.message);
      loadLabsData();
      setTimeout(() => setFeedback(''), 4000);
    } catch (err: any) {
      alert('Erro no sorteio: ' + err.message);
    }
  };

  const handleCopyDrawSchedule = () => {
    if (latestDraw.length === 0) return;
    let text = `🕊️ *PROGRAMAÇÃO — ${drawTitle.toUpperCase()}*\n`;
    text += `Data: ${labDate.split('-').reverse().join('/')} | Tempo: ${drawDuration} min por participante\n\n`;
    latestDraw.forEach((item) => {
      text += `*${item.order}º Apresentador(a):* ${item.speaker_name}\n`;
      text += `   📖 Tema: ${item.theme_title || 'Tema Livre'}\n\n`;
    });
    text += `_Paróquia São Vicente de Paulo — Pastoral Missionária_`;
    navigator.clipboard.writeText(text);
    alert('Programação copiada para a área de transferência!');
  };

  // 28. Themes Management Handlers
  const filteredThemes = useMemo(() => {
    if (!themeSearch.trim()) return themes;
    const term = themeSearch.trim().toLowerCase();
    return themes.filter((t) => t.title?.toLowerCase().includes(term));
  }, [themes, themeSearch]);

  const handleOpenThemeModal = (theme?: any) => {
    if (theme) {
      setEditingThemeId(theme.id);
      setThemeModalTitle(theme.title);
      setThemeModalDescription(theme.description || '');
    } else {
      setEditingThemeId(null);
      setThemeModalTitle('');
      setThemeModalDescription('');
    }
    setIsThemeModalOpen(true);
  };

  const handleSaveTheme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!themeModalTitle.trim()) return;
    try {
      if (editingThemeId) {
        await api.updateLabTheme(editingThemeId, {
          title: themeModalTitle.trim(),
          description: themeModalDescription.trim(),
        });
        setFeedback('Tema atualizado com sucesso!');
      } else {
        await api.createLabTheme({
          title: themeModalTitle.trim(),
          description: themeModalDescription.trim(),
        });
        setFeedback('Novo tema cadastrado com sucesso!');
      }
      setIsThemeModalOpen(false);
      loadLabsData();
      setTimeout(() => setFeedback(''), 4000);
    } catch (err: any) {
      alert('Erro ao salvar tema: ' + err.message);
    }
  };

  const handleToggleArchiveTheme = async (themeId: string) => {
    try {
      const res = await api.toggleArchiveLabTheme(themeId);
      setFeedback(res.message);
      loadLabsData();
      setTimeout(() => setFeedback(''), 4000);
    } catch (err: any) {
      alert('Erro ao alterar status do tema: ' + err.message);
    }
  };

  // 30. Filtered Evaluations History
  const filteredEvaluations = useMemo(() => {
    if (!historySpeakerFilter.trim()) return evaluations;
    const term = historySpeakerFilter.trim().toLowerCase();
    return evaluations.filter(
      (ev) =>
        ev.speaker_name?.toLowerCase().includes(term) ||
        ev.theme_title?.toLowerCase().includes(term)
    );
  }, [evaluations, historySpeakerFilter]);

  return (
    <div className="space-y-6">
      {/* Top Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-3xl border border-zinc-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-pastoral-dourado font-bold text-xs uppercase tracking-wider">
            <GraduationCap className="w-4 h-4" />
            <span>Formação & Capacitação Pastoral</span>
          </div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-pastoral-cafe mt-0.5">
            Laboratórios de Pregação
          </h2>
          <p className="text-xs text-zinc-500">
            Sorteador de ordem e temas, ficha oficial de 8 critérios e gestão de temas
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex flex-wrap p-1 rounded-2xl bg-zinc-100 border border-zinc-200 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('avaliacao')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeTab === 'avaliacao'
                ? 'bg-white text-pastoral-cafe font-bold shadow-xs'
                : 'text-zinc-600 hover:text-pastoral-cafe'
            }`}
          >
            Ficha de Avaliação
          </button>
          <button
            onClick={() => setActiveTab('sorteio')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeTab === 'sorteio'
                ? 'bg-white text-pastoral-cafe font-bold shadow-xs'
                : 'text-zinc-600 hover:text-pastoral-cafe'
            }`}
          >
            Sorteador ({latestDraw.length})
          </button>
          <button
            onClick={() => setActiveTab('temas')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeTab === 'temas'
                ? 'bg-white text-pastoral-cafe font-bold shadow-xs'
                : 'text-zinc-600 hover:text-pastoral-cafe'
            }`}
          >
            Temas ({themes.length})
          </button>
          <button
            onClick={() => setActiveTab('historico')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeTab === 'historico'
                ? 'bg-white text-pastoral-cafe font-bold shadow-xs'
                : 'text-zinc-600 hover:text-pastoral-cafe'
            }`}
          >
            Histórico ({evaluations.length})
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* 27. ABA 1: FICHA DE AVALIAÇÃO COM TEMA LIVRE */}
      {activeTab === 'avaliacao' && (
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-zinc-200/80 shadow-xs space-y-6">
          <div className="border-b border-zinc-100 pb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-pastoral-vinho">
              Formulário Oficial de Avaliação
            </span>
            <h3 className="font-serif font-bold text-lg text-pastoral-cafe">
              Avaliação do Pregador(a)
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Preencha para cada apresentação. O tema agora é livre para qualquer palestra realizada.
            </p>
          </div>

          <form onSubmit={handleSubmitEvaluation} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                  Data do Laboratório *
                </label>
                <input
                  type="date"
                  value={labDate}
                  onChange={(e) => setLabDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                  Nome do Pregador(a) *
                </label>
                <input
                  type="text"
                  list="pastoral-speakers-list"
                  value={speakerName}
                  onChange={(e) => setSpeakerName(e.target.value)}
                  placeholder="Selecione ou digite o nome..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300"
                  required
                />
                <datalist id="pastoral-speakers-list">
                  {allAvailableMembers.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                  Tema da Pregação (Livre) *
                </label>
                <input
                  type="text"
                  list="pastoral-themes-datalist"
                  value={themeTitle}
                  onChange={(e) => setThemeTitle(e.target.value)}
                  placeholder="Digite qualquer tema ou selecione sugestão..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300"
                  required
                />
                <datalist id="pastoral-themes-datalist">
                  {themes
                    .filter((t) => t.active === 1)
                    .map((t) => (
                      <option key={t.id} value={t.title} />
                    ))}
                </datalist>
              </div>
            </div>

            {/* 8 Official Criteria */}
            <div className="space-y-4 pt-2 border-t border-zinc-100">
              <h4 className="font-serif font-bold text-sm text-pastoral-cafe">
                8 Critérios Oficiais de Avaliação
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {CRITERIA_LIST.map((crit) => (
                  <div
                    key={crit.key}
                    className="p-3.5 rounded-2xl border border-zinc-200 bg-zinc-50/50 space-y-2"
                  >
                    <p className="text-xs font-semibold text-pastoral-cafe">
                      {crit.label}
                    </p>
                    <div className="flex items-center gap-4 text-xs font-bold">
                      {(['Sim', 'Razoavelmente', 'Não'] as const).map((opt) => (
                        <label key={opt} className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name={crit.key}
                            value={opt}
                            checked={criteriaValues[crit.key] === opt}
                            onChange={() =>
                              setCriteriaValues({ ...criteriaValues, [crit.key]: opt })
                            }
                            className="text-pastoral-dourado focus:ring-pastoral-dourado"
                          />
                          <span
                            className={
                              opt === 'Sim'
                                ? 'text-emerald-700'
                                : opt === 'Razoavelmente'
                                ? 'text-amber-700'
                                : 'text-rose-700'
                            }
                          >
                            {opt}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Optional Question 3 & Comments */}
            <div className="space-y-4 pt-2 border-t border-zinc-100">
              <div>
                <label className="block text-xs font-bold text-pastoral-cafe mb-1">
                  Sugestão de Temas para Este Palestrante (Opcional):
                </label>
                <input
                  type="text"
                  value={suggestedFutureThemes}
                  onChange={(e) => setSuggestedFutureThemes(e.target.value)}
                  placeholder="Que tema(s) sugere a esse palestrante em apresentações futuras?"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-pastoral-cafe mb-1">
                  Comentários e Dicas Construtivas (Opcional):
                </label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Destaque pontos positivos, clareza, testemunho, dicção ou aspectos a aprimorar..."
                  rows={3}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl text-xs font-bold text-pastoral-profundo bg-pastoral-dourado hover:brightness-105 shadow-gold transition-all active:scale-95"
              >
                Salvar Avaliação no Banco
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 29. ABA 2: SORTEADOR & CRONÔMETRO REESTRUTURADOS */}
      {activeTab === 'sorteio' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Participant Selection & Options */}
          <div className="lg:col-span-1 bg-white p-5 rounded-3xl border border-zinc-200/80 shadow-xs space-y-4">
            <div className="border-b border-zinc-100 pb-2 flex items-center justify-between">
              <div>
                <h3 className="font-serif font-bold text-base text-pastoral-cafe">
                  Participantes do Laboratório
                </h3>
                <p className="text-[11px] text-zinc-500">
                  {selectedSpeakers.length} selecionado(s)
                </p>
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="text-[10px] font-bold text-pastoral-vinho hover:underline"
                >
                  Selecionar Todos
                </button>
                <span className="text-zinc-300">•</span>
                <button
                  type="button"
                  onClick={handleClearSelected}
                  className="text-[10px] text-zinc-400 hover:text-zinc-600"
                >
                  Limpar
                </button>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={participantSearch}
                onChange={(e) => setParticipantSearch(e.target.value)}
                placeholder="Buscar missionário..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-zinc-200"
              />
            </div>

            {/* Custom Participant Input */}
            <div className="flex gap-1.5">
              <input
                type="text"
                value={customSpeakerInput}
                onChange={(e) => setCustomSpeakerInput(e.target.value)}
                placeholder="Adicionar nome avulso..."
                className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-zinc-200"
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomSpeaker())}
              />
              <button
                type="button"
                onClick={handleAddCustomSpeaker}
                className="px-3 py-1.5 bg-pastoral-cafe hover:bg-pastoral-profundo text-white text-xs font-bold rounded-xl transition-colors"
              >
                +
              </button>
            </div>

            {/* Members List with Checkboxes */}
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {filteredMembers.map((name) => {
                const isSelected = selectedSpeakers.includes(name);
                const isCustom = customSpeakers.includes(name);

                return (
                  <div
                    key={name}
                    className={`flex items-center justify-between p-2 rounded-xl text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-pastoral-dourado/15 border border-pastoral-dourado/30 font-semibold text-pastoral-profundo'
                        : 'bg-zinc-50 border border-zinc-100 text-zinc-700 hover:bg-zinc-100'
                    }`}
                    onClick={() => toggleSpeaker(name)}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-4 h-4 rounded-md flex items-center justify-center border text-white transition-all ${
                          isSelected
                            ? 'bg-pastoral-dourado border-pastoral-dourado'
                            : 'border-zinc-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span>{name}</span>
                    </div>

                    {isCustom && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveCustomSpeaker(name);
                        }}
                        className="text-zinc-400 hover:text-rose-600 p-0.5"
                        title="Remover nome avulso"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Draw Mode Options */}
            <div className="pt-3 border-t border-zinc-100 space-y-2">
              <span className="text-[11px] font-bold uppercase text-zinc-500">
                Opções do Sorteio
              </span>

              <div className="space-y-1.5 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="drawMode"
                    value="order_and_theme"
                    checked={drawMode === 'order_and_theme'}
                    onChange={() => setDrawMode('order_and_theme')}
                    className="text-pastoral-dourado"
                  />
                  <span>Sortear Ordem e Temas ({themes.filter((t) => t.active === 1).length} temas ativos)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="drawMode"
                    value="order_only"
                    checked={drawMode === 'order_only'}
                    onChange={() => setDrawMode('order_only')}
                    className="text-pastoral-dourado"
                  />
                  <span>Sortear Apenas Ordem (Tema Livre)</span>
                </label>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="text-xs text-zinc-600 font-semibold">
                  Duração por fala:
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="5"
                    max="60"
                    value={drawDuration}
                    onChange={(e) => setDrawDuration(parseInt(e.target.value, 10) || 15)}
                    className="w-14 px-2 py-1 text-xs border rounded-lg text-center font-bold"
                  />
                  <span className="text-xs text-zinc-500">min</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRunDraw}
                className="w-full mt-2 py-2.5 px-4 rounded-xl text-xs font-bold bg-pastoral-dourado text-pastoral-profundo shadow-gold flex items-center justify-center gap-2 hover:brightness-105 active:scale-95 transition-all"
              >
                <Shuffle className="w-4 h-4" />
                <span>Realizar Sorteio Confiável</span>
              </button>
            </div>
          </div>

          {/* Right Columns: Sorteio Results & Stopwatch */}
          <div className="lg:col-span-2 space-y-5">
            {/* Stopwatch 15 min */}
            <div className="bg-gradient-to-r from-pastoral-profundo to-pastoral-cafe rounded-3xl p-6 text-white border border-pastoral-dourado/30 shadow-pastoral-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-pastoral-dourado tracking-wider flex items-center gap-1.5">
                  <Timer className="w-3.5 h-3.5" />
                  Cronômetro de Pregação Oficial
                </span>
                <div className="font-mono text-4xl sm:text-5xl font-bold tracking-tight text-white mt-1">
                  {formatTimer(secondsLeft)}
                </div>
                <p className="text-[11px] text-zinc-300 mt-1">
                  Tempo oficial do laboratório conforme documento institucional
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTimerRunning(!timerRunning)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all ${
                    timerRunning
                      ? 'bg-amber-500 hover:bg-amber-600 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {timerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span>{timerRunning ? 'Pausar' : 'Iniciar'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTimerRunning(false);
                    setSecondsLeft(drawDuration * 60);
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reiniciar</span>
                </button>
              </div>
            </div>

            {/* Results Table */}
            <div className="bg-white p-5 rounded-3xl border border-zinc-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                <div>
                  <h3 className="font-serif font-bold text-base text-pastoral-cafe">
                    Ordem de Apresentação
                  </h3>
                  <p className="text-xs text-zinc-500">
                    {latestDraw.length} participante(s) programados
                  </p>
                </div>

                {latestDraw.length > 0 && (
                  <button
                    onClick={handleCopyDrawSchedule}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-pastoral-cafe bg-pastoral-creme hover:bg-pastoral-creme-escuro border border-pastoral-dourado/40 flex items-center gap-1.5 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5 text-pastoral-dourado" />
                    <span>Copiar / WhatsApp</span>
                  </button>
                )}
              </div>

              {latestDraw.length === 0 ? (
                <div className="py-12 text-center text-zinc-400 text-xs">
                  <p>Nenhum sorteio registrado ainda.</p>
                  <p className="text-[11px] mt-1">Selecione os missionários ao lado e clique em Realizar Sorteio.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {latestDraw.map((item) => (
                    <div
                      key={item.order}
                      className="p-3.5 rounded-2xl border border-zinc-200 bg-zinc-50/60 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-full bg-pastoral-dourado text-pastoral-profundo font-bold text-xs flex items-center justify-center shadow-2xs">
                          {item.order}º
                        </span>
                        <div>
                          <h4 className="font-serif font-bold text-sm text-pastoral-cafe">
                            {item.speaker_name}
                          </h4>
                          <p className="text-xs text-pastoral-vinho font-medium">
                            {item.theme_title || 'Tema Livre'}
                          </p>
                        </div>
                      </div>

                      <span className="text-[11px] font-semibold text-zinc-500 bg-white px-2.5 py-1 rounded-lg border border-zinc-200">
                        {item.duration_minutes || drawDuration} min
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 28. ABA 3: CADASTRO E GESTÃO DE TEMAS */}
      {activeTab === 'temas' && (
        <div className="bg-white p-6 rounded-3xl border border-zinc-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-zinc-100">
            <div>
              <h3 className="font-serif font-bold text-base text-pastoral-cafe">
                Catálogo de Temas Formativos
              </h3>
              <p className="text-xs text-zinc-500">
                Temas disponíveis para o sorteador e pregações dos laboratórios
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={themeSearch}
                  onChange={(e) => setThemeSearch(e.target.value)}
                  placeholder="Pesquisar tema..."
                  className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-zinc-200"
                />
              </div>

              {canManage && (
                <button
                  type="button"
                  onClick={() => handleOpenThemeModal()}
                  className="px-3.5 py-2 rounded-xl bg-pastoral-dourado hover:brightness-105 text-pastoral-profundo font-bold text-xs flex items-center gap-1.5 shadow-gold transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Novo Tema</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredThemes.map((theme) => {
              const isActive = theme.active === 1;

              return (
                <div
                  key={theme.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                    isActive
                      ? 'border-zinc-200 bg-white hover:border-pastoral-dourado/60 shadow-2xs'
                      : 'border-zinc-200 bg-zinc-50 opacity-60'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between pb-1.5">
                      <span className="text-[10px] font-bold text-pastoral-dourado uppercase tracking-wider">
                        Tema #{theme.theme_number}
                      </span>
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-zinc-200 text-zinc-600'
                        }`}
                      >
                        {isActive ? 'Ativo' : 'Arquivado'}
                      </span>
                    </div>

                    <h4 className="font-serif font-bold text-xs text-pastoral-cafe leading-snug">
                      {theme.title}
                    </h4>

                    {theme.description && (
                      <p className="text-[11px] text-zinc-500 mt-1 line-clamp-2">
                        {theme.description}
                      </p>
                    )}
                  </div>

                  {canManage && (
                    <div className="flex items-center justify-end gap-1.5 pt-3 mt-3 border-t border-zinc-100">
                      <button
                        type="button"
                        onClick={() => handleOpenThemeModal(theme)}
                        className="p-1 rounded text-zinc-400 hover:text-pastoral-cafe hover:bg-zinc-100 text-xs flex items-center gap-1"
                        title="Editar tema"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span className="text-[10px]">Editar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleArchiveTheme(theme.id)}
                        className={`p-1 rounded text-xs flex items-center gap-1 ${
                          isActive
                            ? 'text-zinc-400 hover:text-rose-700 hover:bg-rose-50'
                            : 'text-emerald-700 hover:bg-emerald-50'
                        }`}
                        title={isActive ? 'Arquivar tema' : 'Reativar tema'}
                      >
                        <Archive className="w-3 h-3" />
                        <span className="text-[10px]">
                          {isActive ? 'Arquivar' : 'Reativar'}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 30. ABA 4: HISTÓRICO DE AVALIAÇÕES */}
      {activeTab === 'historico' && (
        <div className="bg-white p-6 rounded-3xl border border-zinc-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-zinc-100">
            <div>
              <h3 className="font-serif font-bold text-base text-pastoral-cafe">
                Histórico de Avaliações Registradas
              </h3>
              <p className="text-xs text-zinc-500">
                Consulta confidencial de avaliações dos laboratórios de pregação
              </p>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={historySpeakerFilter}
                onChange={(e) => setHistorySpeakerFilter(e.target.value)}
                placeholder="Filtrar por pregador ou tema..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-zinc-200"
              />
            </div>
          </div>

          {filteredEvaluations.length === 0 ? (
            <div className="py-12 text-center text-zinc-400 text-xs">
              Nenhuma avaliação encontrada.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEvaluations.map((ev) => (
                <div
                  key={ev.id}
                  className="p-4 rounded-2xl border border-zinc-200 bg-zinc-50/50 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-serif font-bold text-sm text-pastoral-cafe">
                        {ev.speaker_name}
                      </h4>
                      <p className="text-xs text-pastoral-vinho font-medium">
                        📖 {ev.theme_title}
                      </p>
                    </div>
                    <span className="text-xs text-zinc-500 font-semibold">
                      {ev.lab_date.split('-').reverse().join('/')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                    <div className="p-1.5 rounded-lg bg-white border border-zinc-100">
                      <span className="text-zinc-500 block">Domínio:</span>
                      <strong className="text-pastoral-cafe">{ev.crit_dominio_assunto}</strong>
                    </div>
                    <div className="p-1.5 rounded-lg bg-white border border-zinc-100">
                      <span className="text-zinc-500 block">Objetividade:</span>
                      <strong className="text-pastoral-cafe">{ev.crit_objetividade}</strong>
                    </div>
                    <div className="p-1.5 rounded-lg bg-white border border-zinc-100">
                      <span className="text-zinc-500 block">Bíblico:</span>
                      <strong className="text-pastoral-cafe">{ev.crit_embasamento_biblico}</strong>
                    </div>
                    <div className="p-1.5 rounded-lg bg-white border border-zinc-100">
                      <span className="text-zinc-500 block">Tempo:</span>
                      <strong className="text-pastoral-cafe">{ev.crit_cumprimento_tempo}</strong>
                    </div>
                  </div>

                  {ev.suggested_future_themes && (
                    <p className="text-xs text-zinc-600 pt-1">
                      <strong>Sugestão de Temas:</strong> {ev.suggested_future_themes}
                    </p>
                  )}

                  {ev.comments && (
                    <p className="text-xs text-zinc-500 italic pt-0.5">
                      "{ev.comments}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal: Adicionar / Editar Tema */}
      {isThemeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-pastoral-dourado/40 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <h3 className="font-serif font-bold text-base text-pastoral-cafe">
                {editingThemeId ? 'Editar Tema Formativo' : 'Cadastrar Novo Tema'}
              </h3>
              <button
                type="button"
                onClick={() => setIsThemeModalOpen(false)}
                className="p-1 rounded text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTheme} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                  Título do Tema *
                </label>
                <input
                  type="text"
                  value={themeModalTitle}
                  onChange={(e) => setThemeModalTitle(e.target.value)}
                  placeholder="Ex: Chamado à santidade na vida cotidiana"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                  Descrição / Objetivo (Opcional)
                </label>
                <textarea
                  value={themeModalDescription}
                  onChange={(e) => setThemeModalDescription(e.target.value)}
                  placeholder="Orientações e objetivo espiritual para o pregador..."
                  rows={3}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsThemeModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-zinc-600 hover:bg-zinc-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-pastoral-profundo bg-pastoral-dourado hover:brightness-105 shadow-xs"
                >
                  {editingThemeId ? 'Salvar Alterações' : 'Cadastrar Tema'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
