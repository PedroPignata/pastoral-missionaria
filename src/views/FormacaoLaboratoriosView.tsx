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

  const [activeTab, setActiveTab] = useState<'sorteio' | 'historico_sorteios' | 'avaliacao' | 'historico_avaliacoes' | 'temas'>('sorteio');
  const [themes, setThemes] = useState<any[]>([]);
  const [labs, setLabs] = useState<any[]>([]);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [savedDraws, setSavedDraws] = useState<any[]>([]);
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

  // 29. Sorteador State (Duração padrão oficial: 20 minutos)
  const [drawTitle, setDrawTitle] = useState('Laboratório de Pregação — Pastoral Missionária');
  const [drawDuration, setDrawDuration] = useState(20);
  const [drawMode, setDrawMode] = useState<'order_and_theme' | 'order_only'>('order_and_theme');
  const [participantSearch, setParticipantSearch] = useState('');
  const [institutionalMembers, setInstitutionalMembers] = useState<
    { id: string; name: string; display_name?: string; pastoral_role?: string; isCustom?: boolean }[]
  >([]);
  const [selectedSpeakerIds, setSelectedSpeakerIds] = useState<string[]>([]);
  const [customSpeakers, setCustomSpeakers] = useState<{ id: string; name: string; isCustom: true }[]>([]);
  const [customSpeakerInput, setCustomSpeakerInput] = useState('');
  const [latestDraw, setLatestDraw] = useState<any[]>([]);
  const [latestGroups, setLatestGroups] = useState<any[]>([]);
  const [repeatConfirmationModal, setRepeatConfirmationModal] = useState<{
    open: boolean;
    speakersCount: number;
    themesCount: number;
  }>({ open: false, speakersCount: 0, themesCount: 0 });

  // 20-min Stopwatch
  const [secondsLeft, setSecondsLeft] = useState(20 * 60);
  const [timerRunning, setTimerRunning] = useState(false);

  // 28. Themes Management Modal & State
  const [themeSearch, setThemeSearch] = useState('');
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [editingThemeId, setEditingThemeId] = useState<string | null>(null);
  const [themeModalTitle, setThemeModalTitle] = useState('');
  const [themeModalCategory, setThemeModalCategory] = useState('Formação Pastoral');
  const [themeModalDescription, setThemeModalDescription] = useState('');

  // 30. Evaluations History Filter
  const [historySpeakerFilter, setHistorySpeakerFilter] = useState('');

  const loadLabsData = async () => {
    try {
      const [data, draws, dirMembers] = await Promise.all([
        api.getLabsData(),
        api.getLabDraws(),
        api.getMembersDirectory().catch(() => api.getPastoralMembers({ status: 'ativo' }).catch(() => [])),
      ]);
      setThemes(data.themes || []);
      setLabs(data.labs || []);
      setEvaluations(data.evaluations || []);
      setSavedDraws(draws || []);
      if (Array.isArray(dirMembers) && dirMembers.length > 0) {
        setInstitutionalMembers(
          dirMembers.map((pm: any) => ({
            id: pm.id,
            name: pm.name,
            display_name: pm.display_name,
            pastoral_role: pm.pastoral_role,
          }))
        );
      }

      if (draws && draws.length > 0) {
        if (latestDraw.length === 0) {
          setLatestDraw(draws[0].participants || []);
        }
        if (latestGroups.length === 0 && Array.isArray(draws[0].groups) && draws[0].groups.length > 0) {
          setLatestGroups(draws[0].groups);
        }
      } else if (data.labs?.length > 0 && latestDraw.length === 0) {
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

  // Sorteador participants handlers (usando todos os missionários ativos da Governança com IDs estáveis)
  const allAvailableMembers = useMemo<
    Array<{
      id: string;
      name: string;
      display_name?: string;
      pastoral_role?: string;
      isCustom?: boolean;
    }>
  >(() => {
    const baseList =
      institutionalMembers.length > 0
        ? institutionalMembers
        : members.map((m) => ({
            id: m.id,
            name: m.name,
            display_name: m.display_name,
            pastoral_role: 'membro',
            isCustom: false,
          }));

    const combined = [...baseList, ...customSpeakers];
    return combined.sort((a, b) => a.name.localeCompare(b.name));
  }, [institutionalMembers, members, customSpeakers]);

  const filteredMembers = useMemo(() => {
    if (!participantSearch.trim()) return allAvailableMembers;
    const term = participantSearch.trim().toLowerCase();
    return allAvailableMembers.filter(
      (m) =>
        m.name.toLowerCase().includes(term) ||
        (m.display_name || '').toLowerCase().includes(term)
    );
  }, [allAvailableMembers, participantSearch]);

  const toggleSpeaker = (id: string) => {
    setSelectedSpeakerIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    const newSelected = new Set([...selectedSpeakerIds, ...filteredMembers.map((m) => m.id)]);
    setSelectedSpeakerIds(Array.from(newSelected));
  };

  const handleClearSelected = () => {
    setSelectedSpeakerIds([]);
  };

  const handleAddCustomSpeaker = () => {
    const clean = customSpeakerInput.trim();
    if (!clean) return;
    const customId = `custom_${clean.toLowerCase().replace(/\s+/g, '_')}`;
    if (!customSpeakers.some((c) => c.id === customId)) {
      setCustomSpeakers([...customSpeakers, { id: customId, name: clean, isCustom: true }]);
    }
    if (!selectedSpeakerIds.includes(customId)) {
      setSelectedSpeakerIds([...selectedSpeakerIds, customId]);
    }
    setCustomSpeakerInput('');
  };

  const handleRemoveCustomSpeaker = (id: string) => {
    setCustomSpeakers(customSpeakers.filter((c) => c.id !== id));
    setSelectedSpeakerIds(selectedSpeakerIds.filter((s) => s !== id));
  };

  const selectedSpeakerNames = useMemo(() => {
    return selectedSpeakerIds
      .map((id) => allAvailableMembers.find((m) => m.id === id)?.name)
      .filter((n): n is string => Boolean(n));
  }, [selectedSpeakerIds, allAvailableMembers]);

  // Run Draw (Suporte oficial a todos os missionários selecionados e duração padrão de 20 min)
  const handleRunDraw = async (allowRepeat = false) => {
    if (selectedSpeakerNames.length === 0) {
      alert('Selecione ao menos um participante na lista para o sorteio.');
      return;
    }

    const activeThemesCount = themes.filter((t) => t.active === 1).length;
    if (drawMode === 'order_and_theme' && selectedSpeakerNames.length > activeThemesCount && !allowRepeat) {
      setRepeatConfirmationModal({
        open: true,
        speakersCount: selectedSpeakerNames.length,
        themesCount: activeThemesCount,
      });
      return;
    }

    try {
      const res = await api.drawLabThemes({
        title: drawTitle,
        lab_date: labDate,
        duration_minutes: drawDuration,
        speakers: selectedSpeakerNames,
        draw_mode: drawMode,
        allow_repeat: allowRepeat,
      });
      setLatestDraw(res.draw_results || []);
      setLatestGroups(res.groups || []);
      setSecondsLeft(drawDuration * 60);
      setFeedback(res.message);
      setRepeatConfirmationModal({ open: false, speakersCount: 0, themesCount: 0 });
      loadLabsData();
      setTimeout(() => setFeedback(''), 4000);
    } catch (err: any) {
      alert('Erro no sorteio: ' + (err.message || 'Verifique os dados e tente novamente.'));
    }
  };

  const handleArchiveDraw = async (id: string) => {
    try {
      await api.archiveLabDraw(id);
      setFeedback('Sorteio arquivado com sucesso!');
      loadLabsData();
      setTimeout(() => setFeedback(''), 4000);
    } catch (err: any) {
      alert('Erro ao arquivar sorteio: ' + err.message);
    }
  };

  const handleDeleteDraw = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja remover este sorteio do histórico? As avaliações registradas permanecerão salvas.')) {
      return;
    }
    try {
      await api.deleteLabDraw(id);
      setFeedback('Sorteio excluído do histórico com sucesso!');
      loadLabsData();
      setTimeout(() => setFeedback(''), 4000);
    } catch (err: any) {
      alert('Erro ao excluir sorteio: ' + err.message);
    }
  };

  const formatWhatsAppText = (titleStr: string, dateStr: string, durationMin: number, groupsList: any[], partsList: any[]) => {
    let text = `🕊️ *ORDEM DO LABORATÓRIO DE PREGAÇÃO — PASTORAL MISSIONÁRIA*\n`;
    text += `*Atividade:* ${titleStr}\n`;
    if (dateStr && dateStr !== 'A definir') {
      text += `*Data:* ${dateStr.includes('-') ? dateStr.split('-').reverse().join('/') : dateStr}\n`;
    }
    text += `⏱ *Tempo por participante:* ${durationMin} minutos\n`;
    text += `👥 *Total:* ${partsList.length} pregadores em ${groupsList?.length || 1} grupos\n\n`;

    if (groupsList && groupsList.length > 0) {
      groupsList.forEach((g: any) => {
        const list = g.speakers || g.members || [];
        const dur = g.total_duration_minutes || g.duration_minutes || (list.length * durationMin);
        text += `*${g.group_name || `GRUPO ${g.group_number}`}* (${dur} min):\n`;
        list.forEach((m: any, idx: number) => {
          const ord = m.order || m.presentation_order || m.order_in_group || (idx + 1);
          text += `• ${ord}º: *${m.speaker_name}* — ${m.theme_title || 'Tema Livre'}\n`;
        });
        text += `\n`;
      });
    } else {
      partsList.forEach((m: any) => {
        text += `• ${m.order}º: *${m.speaker_name}* — ${m.theme_title || 'Tema Livre'}\n`;
      });
      text += `\n`;
    }

    text += `_"Tenha Jesus Cristo em seu coração, e todas as cruzes do mundo parecerão rosas."_ — São Padre Pio\n`;
    text += `_Paróquia São Vicente de Paulo — Planaltina-DF_`;
    return text;
  };

  const handleCopyScheduleFromDraw = (draw: any) => {
    const parts = draw.participants || draw.draw_results || [];
    const grps = draw.groups || [];
    const text = formatWhatsAppText(draw.laboratory_name || drawTitle, draw.laboratory_date || labDate, draw.duration_minutes || 20, grps, parts);
    navigator.clipboard.writeText(text);
    setFeedback('Programação em grupos copiada para WhatsApp!');
    setTimeout(() => setFeedback(''), 4000);
  };

  const handleCopyDrawSchedule = () => {
    if (latestDraw.length === 0) return;
    const text = formatWhatsAppText(drawTitle, labDate, drawDuration, latestGroups, latestDraw);
    navigator.clipboard.writeText(text);
    setFeedback('Programação do sorteio copiada para WhatsApp!');
    setTimeout(() => setFeedback(''), 4000);
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
      setThemeModalCategory(theme.category || 'Formação Pastoral');
      setThemeModalDescription(theme.description || '');
    } else {
      setEditingThemeId(null);
      setThemeModalTitle('');
      setThemeModalCategory('Formação Pastoral');
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
          category: themeModalCategory.trim() || 'Formação Pastoral',
          description: themeModalDescription.trim(),
        });
        setFeedback('Tema formativo atualizado com sucesso!');
      } else {
        await api.createLabTheme({
          title: themeModalTitle.trim(),
          category: themeModalCategory.trim() || 'Formação Pastoral',
          description: themeModalDescription.trim(),
        });
        setFeedback('Novo tema cadastrado com sucesso!');
      }
      setIsThemeModalOpen(false);
      loadLabsData();
      setTimeout(() => setFeedback(''), 4000);
    } catch (err: any) {
      alert('Não foi possível salvar o tema. Nenhum registro foi alterado. ' + (err.message || 'Tente novamente ou informe a coordenação.'));
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
        <div className="flex flex-wrap p-1 rounded-2xl bg-zinc-100 border border-zinc-200 text-xs font-semibold gap-1">
          <button
            onClick={() => setActiveTab('sorteio')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeTab === 'sorteio'
                ? 'bg-white text-pastoral-cafe font-bold shadow-xs'
                : 'text-zinc-600 hover:text-pastoral-cafe'
            }`}
          >
            Sorteador de Pregação
          </button>
          <button
            onClick={() => setActiveTab('historico_sorteios')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeTab === 'historico_sorteios'
                ? 'bg-white text-pastoral-cafe font-bold shadow-xs'
                : 'text-zinc-600 hover:text-pastoral-cafe'
            }`}
          >
            Histórico de Sorteios ({savedDraws.length})
          </button>
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
            onClick={() => setActiveTab('historico_avaliacoes')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeTab === 'historico_avaliacoes'
                ? 'bg-white text-pastoral-cafe font-bold shadow-xs'
                : 'text-zinc-600 hover:text-pastoral-cafe'
            }`}
          >
            Histórico de Avaliações ({evaluations.length})
          </button>
          <button
            onClick={() => setActiveTab('temas')}
            className={`px-3 py-1.5 rounded-xl transition-all ${
              activeTab === 'temas'
                ? 'bg-white text-pastoral-cafe font-bold shadow-xs'
                : 'text-zinc-600 hover:text-pastoral-cafe'
            }`}
          >
            Temas Disponíveis ({themes.filter((t) => t.active === 1).length})
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
                  {allAvailableMembers.map((m) => (
                    <option key={m.id} value={m.name} />
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
                  {selectedSpeakerIds.length} de {allAvailableMembers.length} missionários selecionados
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
                placeholder="Buscar missionário por nome ou apelido..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-zinc-200"
              />
            </div>

            {/* Custom Participant Input */}
            <div className="flex gap-1.5">
              <input
                type="text"
                value={customSpeakerInput}
                onChange={(e) => setCustomSpeakerInput(e.target.value)}
                placeholder="Adicionar convidado / nome avulso..."
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
              {filteredMembers.map((memberItem) => {
                const isSelected = selectedSpeakerIds.includes(memberItem.id);
                const isCustom = Boolean(memberItem.isCustom);

                return (
                  <div
                    key={memberItem.id}
                    className={`flex items-center justify-between p-2 rounded-xl text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-pastoral-dourado/15 border border-pastoral-dourado/30 font-semibold text-pastoral-profundo'
                        : 'bg-zinc-50 border border-zinc-100 text-zinc-700 hover:bg-zinc-100'
                    }`}
                    onClick={() => toggleSpeaker(memberItem.id)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-4 h-4 rounded-md flex items-center justify-center border text-white transition-all shrink-0 ${
                          isSelected
                            ? 'bg-pastoral-dourado border-pastoral-dourado'
                            : 'border-zinc-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="truncate">{memberItem.name}</span>
                      {memberItem.display_name &&
                        memberItem.display_name !== memberItem.name &&
                        !memberItem.name.includes(memberItem.display_name) && (
                          <span className="text-[10px] text-zinc-400 shrink-0">
                            ({memberItem.display_name})
                          </span>
                        )}
                    </div>

                    {isCustom && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveCustomSpeaker(memberItem.id);
                        }}
                        className="text-zinc-400 hover:text-rose-600 p-0.5 shrink-0"
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
                  <span>Sortear ordem e temas (Temas disponíveis)</span>
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
                onClick={() => handleRunDraw()}
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
              ) : latestGroups.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-zinc-600 bg-pastoral-creme/60 p-2.5 rounded-xl border border-pastoral-dourado/20">
                    <span>Divisão inteligente: <strong>{latestGroups.length} grupos</strong> balanceados (máx. 4 pregadores/grupo)</span>
                    <span className="font-bold text-pastoral-cafe">{latestDraw.length} pregadores</span>
                  </div>
                  {latestGroups.map((grp: any) => {
                    const speakersList = grp.speakers || grp.members || [];
                    const spCount = grp.speakers_count ?? speakersList.length;
                    const totMinutes = grp.total_duration_minutes ?? (grp.duration_minutes || spCount * (grp.duration_per_speaker_minutes || 20));
                    return (
                      <div key={grp.group_number || Math.random()} className="p-3.5 rounded-2xl border border-pastoral-dourado/30 bg-white shadow-2xs space-y-2">
                        <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-pastoral-cafe text-white font-bold text-[11px]">
                              {grp.group_name || `Grupo ${grp.group_number}`}
                            </span>
                            <span className="text-xs text-zinc-500">
                              {spCount} {spCount === 1 ? 'pregador' : 'pregadores'}
                            </span>
                          </div>
                          <span className="text-[11px] font-semibold text-pastoral-vinho bg-pastoral-vinho/10 px-2 py-0.5 rounded-lg">
                            ⏱ {totMinutes} min total ({grp.duration_per_speaker_minutes || 20} min/fala)
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {speakersList.map((item: any, idx: number) => {
                            const orderNum = item.order || item.presentation_order || item.order_in_group || (idx + 1);
                            return (
                              <div key={orderNum} className="p-2.5 rounded-xl bg-pastoral-creme/30 border border-zinc-100 flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <span className="w-5 h-5 rounded-full bg-pastoral-dourado text-pastoral-profundo font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                                    {orderNum}º
                                  </span>
                                  <div className="min-w-0">
                                    <span className="font-bold text-pastoral-cafe block truncate">{item.speaker_name}</span>
                                    <span className="text-[11px] text-zinc-600 block truncate">{item.theme_title || 'Tema Livre'}</span>
                                  </div>
                                </div>
                                <span className="text-[10px] text-zinc-400 font-medium ml-2 flex-shrink-0">
                                  {item.duration_minutes || 20} min
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
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

      {/* ABA: HISTÓRICO DE SORTEIOS DEDICADO */}
      {activeTab === 'historico_sorteios' && (
        <div className="bg-white p-6 rounded-3xl border border-zinc-200/80 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-zinc-100">
            <div>
              <h3 className="font-serif font-bold text-base text-pastoral-cafe flex items-center gap-2">
                <Shuffle className="w-4 h-4 text-pastoral-dourado" />
                Histórico de Sorteios Realizados
              </h3>
              <p className="text-xs text-zinc-500">
                Registros permanentes de sorteios, ordem de apresentação, temas e tempo oficial por fala (20 min)
              </p>
            </div>
            <button
              onClick={() => setActiveTab('sorteio')}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-pastoral-dourado text-pastoral-profundo flex items-center gap-1.5 hover:brightness-105"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Sorteio</span>
            </button>
          </div>

          {savedDraws.length === 0 ? (
            <div className="py-12 text-center text-zinc-400 text-xs space-y-2">
              <p>Nenhum sorteio registrado no histórico ainda.</p>
              <p className="text-[11px] text-zinc-400">
                Realize um sorteio na aba <strong>"Sorteador de Pregação"</strong> para que ele fique registrado permanentemente aqui.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {savedDraws.map((draw) => {
                const participants = draw.participants || draw.draw_results || [];
                const isArchived = draw.status === 'arquivado';

                return (
                  <div
                    key={draw.id}
                    className={`p-5 rounded-2xl border transition-all ${
                      isArchived
                        ? 'bg-zinc-50 border-zinc-200 opacity-75'
                        : 'bg-white border-pastoral-dourado/30 shadow-xs'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-serif font-bold text-sm text-pastoral-cafe">
                            {draw.laboratory_name || 'Laboratório de Pregação'}
                          </h4>
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              isArchived
                                ? 'bg-zinc-200 text-zinc-600'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isArchived ? 'Arquivado' : 'Ativo'}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-0.5">
                          Data do Lab: <strong>{(draw.laboratory_date || draw.draw_date || '').split('-').reverse().join('/')}</strong> • Duração:{' '}
                          <strong>{draw.duration_minutes || 20} min</strong> por fala • Coordenação:{' '}
                          <strong>{draw.coordinator_name || 'Pedro e Fernanda'}</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopyScheduleFromDraw(draw)}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-pastoral-creme hover:bg-pastoral-dourado/20 text-pastoral-cafe border border-pastoral-dourado/30 flex items-center gap-1.5 transition-colors"
                          title="Copiar programação para WhatsApp"
                        >
                          <Share2 className="w-3.5 h-3.5 text-pastoral-dourado" />
                          <span>Copiar WhatsApp</span>
                        </button>

                        {canManage && (
                          <>
                            {!isArchived && (
                              <button
                                type="button"
                                onClick={() => handleArchiveDraw(draw.id)}
                                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 transition-colors"
                                title="Arquivar sorteio"
                              >
                                <Archive className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleDeleteDraw(draw.id)}
                              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Remover sorteio"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Sorteio Participants Grid or Groups */}
                    {draw.groups && draw.groups.length > 0 ? (
                      <div className="pt-3 space-y-3">
                        <div className="text-[11px] font-semibold text-zinc-500">
                          {draw.groups.length} grupos balanceados ({participants.length} pregadores)
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {draw.groups.map((grp: any) => {
                            const speakersList = grp.speakers || grp.members || [];
                            const spCount = grp.speakers_count ?? speakersList.length;
                            const totMinutes = grp.total_duration_minutes || (grp.duration_minutes || (spCount * (draw.duration_minutes || 20)));
                            return (
                              <div key={grp.group_number || Math.random()} className="p-3 rounded-xl bg-pastoral-creme/30 border border-pastoral-dourado/20 space-y-2">
                                <div className="flex items-center justify-between text-xs font-bold text-pastoral-cafe border-b border-pastoral-dourado/10 pb-1.5">
                                  <span>{grp.group_name || `Grupo ${grp.group_number}`}</span>
                                  <span className="text-[10px] text-pastoral-vinho font-semibold">
                                    ⏱ {totMinutes} min
                                  </span>
                                </div>
                                <div className="space-y-1">
                                  {speakersList.map((sp: any, idx: number) => {
                                    const ord = sp.order || sp.presentation_order || sp.order_in_group || (idx + 1);
                                    return (
                                      <div key={ord} className="text-xs flex items-center justify-between gap-2 p-1.5 rounded-lg bg-white/70">
                                        <div className="min-w-0 flex items-center gap-1.5">
                                          <span className="w-4 h-4 rounded-full bg-pastoral-cafe text-white font-bold text-[9px] flex items-center justify-center flex-shrink-0">
                                            {ord}
                                          </span>
                                          <span className="font-semibold text-pastoral-cafe truncate">{sp.speaker_name}</span>
                                          <span className="text-[11px] text-zinc-500 truncate">- {sp.theme_title || 'Tema Livre'}</span>
                                        </div>
                                        <span className="text-[10px] text-zinc-400 flex-shrink-0">{sp.duration_minutes || 20}m</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                        {participants.map((item: any, pIdx: number) => (
                          <div
                            key={pIdx}
                            className="p-3 rounded-xl bg-pastoral-creme/40 border border-pastoral-dourado/20 text-xs flex items-center gap-2.5"
                          >
                            <span className="w-6 h-6 rounded-full bg-pastoral-cafe text-white font-bold flex items-center justify-center text-[10px] flex-shrink-0">
                              {item.order || pIdx + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <span className="font-bold text-pastoral-cafe block truncate">
                                {item.speaker_name}
                              </span>
                              <span className="text-[11px] text-zinc-600 block truncate" title={item.theme_title}>
                                {item.theme_title || 'Tema Livre / A Definir'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 30. ABA 4: HISTÓRICO DE AVALIAÇÕES */}
      {activeTab === 'historico_avaliacoes' && (
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

      {/* Modal: Confirmação de Participantes x Temas Disponíveis (ex: 20 pessoas) */}
      {repeatConfirmationModal.open && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-pastoral-dourado/40 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <h3 className="font-serif font-bold text-base text-pastoral-cafe flex items-center gap-2">
                <Shuffle className="w-5 h-5 text-pastoral-dourado" />
                Participantes x Temas Disponíveis
              </h3>
              <button
                type="button"
                onClick={() => setRepeatConfirmationModal({ open: false, speakersCount: 0, themesCount: 0 })}
                className="p-1 rounded text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-zinc-600 leading-relaxed">
              <p>
                Você selecionou <strong>{repeatConfirmationModal.speakersCount} participantes</strong>, mas existem atualmente{' '}
                <strong>{repeatConfirmationModal.themesCount} temas ativos</strong> cadastrados.
              </p>
              <p className="text-[11px] text-zinc-500">
                Conforme as regras institucionais, temas não são repetidos sem a sua autorização explícita. Escolha como prefere prosseguir:
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => handleRunDraw(true)}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-pastoral-dourado hover:brightness-105 shadow-xs flex items-center justify-center gap-2 transition-all"
              >
                <Check className="w-4 h-4" />
                <span>Autorizar Sorteio com Repetição de Temas</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setRepeatConfirmationModal({ open: false, speakersCount: 0, themesCount: 0 });
                  handleOpenThemeModal();
                }}
                className="w-full py-2 px-4 rounded-xl text-xs font-semibold text-pastoral-cafe bg-pastoral-creme hover:bg-pastoral-dourado/20 border border-pastoral-dourado/30 transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Mais um Tema Formativo</span>
              </button>

              <button
                type="button"
                onClick={() => setRepeatConfirmationModal({ open: false, speakersCount: 0, themesCount: 0 })}
                className="w-full py-1.5 px-4 rounded-xl text-xs text-zinc-500 hover:text-zinc-700 text-center"
              >
                Voltar e Ajustar Participantes
              </button>
            </div>
          </div>
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
                  Categoria *
                </label>
                <select
                  value={themeModalCategory}
                  onChange={(e) => setThemeModalCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 bg-white"
                >
                  <option value="Pregação">Pregação</option>
                  <option value="Espiritualidade">Espiritualidade</option>
                  <option value="Doutrina e Catecismo">Doutrina e Catecismo</option>
                  <option value="Oração e Intercessão">Oração e Intercessão</option>
                  <option value="Vida Missionária">Vida Missionária</option>
                  <option value="Bíblia">Bíblia</option>
                  <option value="Testemunho">Testemunho</option>
                  <option value="Outros">Outros</option>
                </select>
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
