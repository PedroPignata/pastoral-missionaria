import React, { useEffect, useState } from 'react';
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

  const [activeTab, setActiveTab] = useState<'avaliacao' | 'sorteio' | 'temas'>('avaliacao');
  const [themes, setThemes] = useState<any[]>([]);
  const [labs, setLabs] = useState<any[]>([]);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [feedback, setFeedback] = useState('');

  // Evaluation Form State (Matches Official Google Form + Optional Question 3 from PDF)
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

  // Random Drawer & Timer State (Default 15 minutes as in PDF)
  const [drawTitle, setDrawTitle] = useState('Laboratório de Pregação — Pastoral Missionária');
  const [drawDuration, setDrawDuration] = useState(15);
  const [selectedSpeakers, setSelectedSpeakers] = useState<string[]>([]);
  const [customSpeakerInput, setCustomSpeakerInput] = useState('');
  const [latestDraw, setLatestDraw] = useState<any[]>([]);

  // 15-min Stopwatch
  const [secondsLeft, setSecondsLeft] = useState(15 * 60);
  const [timerRunning, setTimerRunning] = useState(false);

  const loadLabsData = async () => {
    try {
      const data = await api.getLabsData();
      setThemes(data.themes || []);
      setLabs(data.labs || []);
      setEvaluations(data.evaluations || []);
      if (data.themes?.length > 0 && !themeTitle) {
        setThemeTitle(data.themes[0].title);
      }
      if (data.labs?.length > 0 && latestDraw.length === 0) {
        setLatestDraw(data.labs[0].draw_results || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadLabsData();
  }, []);

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

  const handleSubmitEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.submitLabEvaluation({
        lab_date: labDate,
        speaker_name: speakerName,
        theme_title: themeTitle,
        ...criteriaValues,
        comments,
        suggested_future_themes: suggestedFutureThemes,
      });
      setFeedback(res.message);
      setSpeakerName('');
      setComments('');
      setSuggestedFutureThemes('');
      loadLabsData();
      setTimeout(() => setFeedback(''), 4000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const toggleSpeakerForDraw = (name: string) => {
    setSelectedSpeakers((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    );
  };

  const handleAddCustomSpeaker = () => {
    if (!customSpeakerInput.trim()) return;
    if (!selectedSpeakers.includes(customSpeakerInput.trim())) {
      setSelectedSpeakers([...selectedSpeakers, customSpeakerInput.trim()]);
    }
    setCustomSpeakerInput('');
  };

  const handleRunDraw = async () => {
    if (selectedSpeakers.length === 0) {
      alert('Selecione ao menos um missionário para sortear os temas e a ordem.');
      return;
    }
    try {
      const res = await api.drawLabThemes({
        title: drawTitle,
        lab_date: labDate,
        duration_minutes: drawDuration,
        speakers: selectedSpeakers,
      });
      setLatestDraw(res.draw_results);
      setSecondsLeft(drawDuration * 60);
      setFeedback(res.message);
      loadLabsData();
      setTimeout(() => setFeedback(''), 4000);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-xl font-bold text-pastoral-cafe flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-pastoral-dourado" />
            Capacitação, Trilhas e Laboratórios de Pregação
          </h2>
          <p className="text-xs text-zinc-500">
            Treinamento missionário com sorteio de temas (15 min), ficha oficial de 8 critérios e os 19 temas da pasta
          </p>
        </div>

        <div className="flex rounded-xl bg-white p-1 border border-zinc-200 shadow-2xs">
          <button
            onClick={() => setActiveTab('avaliacao')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'avaliacao'
                ? 'bg-pastoral-cafe text-white'
                : 'text-zinc-600 hover:text-pastoral-cafe'
            }`}
          >
            Ficha de Avaliação ({evaluations.length})
          </button>
          <button
            onClick={() => setActiveTab('sorteio')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'sorteio'
                ? 'bg-pastoral-cafe text-white'
                : 'text-zinc-600 hover:text-pastoral-cafe'
            }`}
          >
            Sorteador & Cronômetro 15m
          </button>
          <button
            onClick={() => setActiveTab('temas')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'temas'
                ? 'bg-pastoral-cafe text-white'
                : 'text-zinc-600 hover:text-pastoral-cafe'
            }`}
          >
            19 Temas & Trilhas Formativas
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{feedback}</span>
        </div>
      )}

      {/* ABA 1: FICHA DE AVALIAÇÃO DOS LABORATÓRIOS */}
      {activeTab === 'avaliacao' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <form
            onSubmit={handleSubmitEvaluation}
            className="lg:col-span-3 bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-xs space-y-5"
          >
            <div className="border-b border-zinc-100 pb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-pastoral-vinho">
                Formulário Oficial Integrado
              </span>
              <h3 className="font-serif font-bold text-base text-pastoral-cafe">
                Ficha de Avaliação dos Laboratórios — Pastoral Missionária
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Preencha uma avaliação para cada pregador. Avalie com atenção e respeito, indicando pontos positivos e aspectos a melhorar.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                  Palestrante *
                </label>
                <input
                  type="text"
                  list="pastoral-speakers-list"
                  value={speakerName}
                  onChange={(e) => setSpeakerName(e.target.value)}
                  placeholder="Nome do pregador(a)"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300"
                  required
                />
                <datalist id="pastoral-speakers-list">
                  {members.map((m) => (
                    <option key={m.id} value={m.name} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                  Tema *
                </label>
                <select
                  value={themeTitle}
                  onChange={(e) => setThemeTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 bg-white"
                >
                  {themes.map((th) => (
                    <option key={th.id} value={th.title}>
                      {th.theme_number}. {th.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 8 Critérios Avaliativos */}
            <div className="space-y-2.5">
              <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider">
                1. Critérios Avaliativos (Sim / Razoavelmente / Não)
              </label>
              <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-xl overflow-hidden">
                {CRITERIA_LIST.map((crit) => (
                  <div
                    key={crit.key}
                    className="p-3 bg-zinc-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <span className="text-xs font-medium text-pastoral-grafite">{crit.label}</span>
                    <div className="flex items-center gap-2">
                      {(['Sim', 'Razoavelmente', 'Não'] as const).map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() =>
                            setCriteriaValues((prev) => ({ ...prev, [crit.key]: opt }))
                          }
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                            criteriaValues[crit.key] === opt
                              ? opt === 'Sim'
                                ? 'bg-emerald-600 text-white shadow-2xs'
                                : opt === 'Razoavelmente'
                                ? 'bg-amber-500 text-white shadow-2xs'
                                : 'bg-rose-600 text-white shadow-2xs'
                              : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Campo 2: Comentários */}
            <div>
              <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider mb-1">
                2. Comentários (sugestões, pontos positivos e aspectos a melhorar)
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
                placeholder="Registre com caridade e atenção o retorno construtivo para o pregador..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300"
              />
            </div>

            {/* Campo 3: Pergunta Opcional do Documento Institucional */}
            <div>
              <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider mb-1">
                3. Que tema(s) sugere a esse palestrante, caso o evento seja realizado novamente? (Opcional)
              </label>
              <input
                type="text"
                value={suggestedFutureThemes}
                onChange={(e) => setSuggestedFutureThemes(e.target.value)}
                placeholder="Sugestão de temas futuros para o missionário..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-pastoral-dourado to-pastoral-dourado-claro text-pastoral-profundo shadow-gold flex items-center justify-center gap-2"
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>Salvar Avaliação do Laboratório</span>
            </button>
          </form>

          {/* Avaliações Registradas */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-xs space-y-4">
            <h3 className="font-serif font-bold text-base text-pastoral-cafe">
              Avaliações Registradas ({evaluations.length})
            </h3>
            <p className="text-[11px] text-zinc-500">
              A habilitação para pregação é uma decisão de discernimento humano da coordenação, apoiada pelo histórico dos laboratórios.
            </p>

            {evaluations.length === 0 ? (
              <p className="text-xs text-zinc-400 py-8 text-center">
                Nenhuma ficha de avaliação registrada ainda.
              </p>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {evaluations.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-4 rounded-xl border border-zinc-200 bg-pastoral-creme/30 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-pastoral-cafe">{ev.speaker_name}</span>
                      <span className="text-[11px] text-zinc-500">
                        {ev.lab_date.split('-').reverse().join('/')}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-pastoral-vinho">{ev.theme_title}</p>
                    <div className="grid grid-cols-2 gap-1 text-[10px] text-zinc-600 pt-1">
                      <span>Domínio: <strong>{ev.crit_dominio_assunto}</strong></span>
                      <span>Abordagem: <strong>{ev.crit_abordagem_tema}</strong></span>
                      <span>Objetividade: <strong>{ev.crit_objetividade}</strong></span>
                      <span>Tempo: <strong>{ev.crit_cumprimento_tempo}</strong></span>
                      <span>Bíblia: <strong>{ev.crit_embasamento_biblico}</strong></span>
                      <span>Interação: <strong>{ev.crit_interacao}</strong></span>
                      <span>Testemunho: <strong>{ev.crit_testemunho}</strong></span>
                      <span>Oração: <strong>{ev.crit_oracao}</strong></span>
                    </div>
                    {ev.comments && (
                      <p className="text-xs text-zinc-700 bg-white p-2 rounded-lg border border-zinc-200">
                        <strong>Comentários:</strong> {ev.comments}
                      </p>
                    )}
                    {ev.suggested_future_themes && (
                      <p className="text-[11px] text-pastoral-cafe italic">
                        <strong>Temas futuros sugeridos:</strong> {ev.suggested_future_themes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 2: SORTEADOR DE TEMA/ORDEM & CRONÔMETRO 15 MIN */}
      {activeTab === 'sorteio' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cronômetro de Apresentação */}
          <div className="bg-gradient-to-b from-pastoral-cafe to-pastoral-profundo text-white p-6 rounded-2xl border border-pastoral-dourado/30 shadow-pastoral space-y-4 text-center flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-widest text-pastoral-dourado-claro font-bold">
                Controle de Tempo da Pregação
              </span>
              <h3 className="font-serif font-bold text-lg">Cronômetro do Laboratório</h3>
              <p className="text-xs text-zinc-300">
                Referência institucional: aproximadamente {drawDuration} minutos por apresentação
              </p>
            </div>

            <div className="py-6">
              <div className="font-mono text-5xl font-extrabold text-pastoral-dourado-claro tracking-wider">
                {formatTimer(secondsLeft)}
              </div>
            </div>

            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setTimerRunning(!timerRunning)}
                className="px-4 py-2.5 rounded-xl bg-pastoral-dourado text-pastoral-profundo font-bold text-xs flex items-center gap-1.5"
              >
                {timerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{timerRunning ? 'Pausar' : 'Iniciar'}</span>
              </button>
              <button
                onClick={() => {
                  setTimerRunning(false);
                  setSecondsLeft(drawDuration * 60);
                }}
                className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reiniciar ({drawDuration}m)</span>
              </button>
            </div>
          </div>

          {/* Sorteador de Ordem e Temas */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif font-bold text-base text-pastoral-cafe">
                  Sorteio de Temas e Ordem de Apresentação
                </h3>
                <p className="text-xs text-zinc-500">
                  Selecione os missionários participantes para sortear automaticamente um dos 19 temas e a sequência
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-zinc-600 font-medium">Duração (min):</label>
                <input
                  type="number"
                  min={5}
                  max={60}
                  value={drawDuration}
                  onChange={(e) => {
                    const v = Number(e.target.value) || 15;
                    setDrawDuration(v);
                    setSecondsLeft(v * 60);
                  }}
                  className="w-16 px-2 py-1 text-xs rounded-lg border border-zinc-300 text-center font-bold"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {members.map((m) => {
                const selected = selectedSpeakers.includes(m.name);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleSpeakerForDraw(m.name)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      selected
                        ? 'bg-pastoral-cafe text-white shadow-2xs'
                        : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                    }`}
                  >
                    {m.name}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={customSpeakerInput}
                onChange={(e) => setCustomSpeakerInput(e.target.value)}
                placeholder="Adicionar outro missionário ao sorteio..."
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-zinc-300"
              />
              <button
                type="button"
                onClick={handleAddCustomSpeaker}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-zinc-100 hover:bg-zinc-200 text-pastoral-cafe"
              >
                Adicionar
              </button>
              {canManage && (
                <button
                  type="button"
                  onClick={handleRunDraw}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-pastoral-dourado to-pastoral-dourado-claro text-pastoral-profundo shadow-gold flex items-center gap-1.5"
                >
                  <Shuffle className="w-4 h-4" />
                  <span>Sortear Tema e Ordem ({selectedSpeakers.length})</span>
                </button>
              )}
            </div>

            {latestDraw.length > 0 && (
              <div className="pt-3 border-t border-zinc-100 space-y-2">
                <h4 className="font-serif font-bold text-sm text-pastoral-cafe">
                  Programação Sorteada do Laboratório:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {latestDraw.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-pastoral-creme/50 border border-pastoral-dourado/30 flex items-center justify-between gap-2"
                    >
                      <div>
                        <span className="text-[10px] font-bold uppercase text-pastoral-vinho">
                          {item.order}º Apresentador ({item.duration_minutes} min)
                        </span>
                        <p className="text-xs font-bold text-pastoral-cafe">{item.speaker_name}</p>
                        <p className="text-[11px] text-zinc-700">
                          Tema #{item.theme_number}: <strong>{item.theme_title}</strong>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA 3: 19 TEMAS OFICIAIS E TRILHAS FORMATIVAS */}
      {activeTab === 'temas' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-pastoral-dourado">
                Trilha Formativa 1 • Documento Institucional (p. 18)
              </span>
              <h3 className="font-serif font-bold text-base text-pastoral-cafe">
                Curso de Capacitação para Novos Membros
              </h3>
              <p className="text-xs text-zinc-600">
                Realizado após o Discernimento de Pastorais, com simulações práticas em grupo de situações reais vivenciadas na Pastoral e três formações base:
              </p>
              <ul className="text-xs text-pastoral-grafite font-medium space-y-1 pt-1">
                <li>1. Como ser um bom evangelizador?</li>
                <li>2. Como ser um bom intercessor / Como interceder?</li>
                <li>3. Como ser um bom palestrante?</li>
              </ul>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-zinc-200/80 shadow-xs space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-pastoral-dourado">
                Trilha Formativa 2 • Documento Institucional (p. 19)
              </span>
              <h3 className="font-serif font-bold text-base text-pastoral-cafe">
                Projeto Querigma (Estudo Integral do Ágape)
              </h3>
              <p className="text-xs text-zinc-600">
                Quatro encontros para aprofundar o Plano de Evangelização do Ágape e seus quatro retiros:
              </p>
              <ul className="text-xs text-pastoral-grafite font-medium space-y-1 pt-1">
                <li>Encontro 1: Pilares do Projeto Ágape e seu funcionamento</li>
                <li>Encontro 2: Retiro Querigmático e a estrutura do Querigma</li>
                <li>Encontro 3: Período formativo e Retiro Espiritual</li>
                <li>Encontro 4: Retiros do Ágape Apostolado (Éfeta e Discernimento)</li>
              </ul>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-xs space-y-4">
            <h3 className="font-serif font-bold text-base text-pastoral-cafe flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-pastoral-dourado" />
              Os 19 Temas Oficiais para Laboratórios de Pregação (p. 20)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {themes.map((th) => (
                <div
                  key={th.id}
                  className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50/50 flex items-start gap-3"
                >
                  <span className="w-7 h-7 rounded-lg bg-pastoral-cafe text-pastoral-dourado-claro font-bold text-xs flex items-center justify-center flex-shrink-0">
                    {th.theme_number}
                  </span>
                  <div>
                    <p className="text-xs font-bold text-pastoral-cafe leading-snug">{th.title}</p>
                    <span className="text-[10px] text-zinc-500">{th.category}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
