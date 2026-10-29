import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import {
  Cross,
  Calendar,
  BookOpen,
  Heart,
  Sparkles,
  ArrowLeft,
  LogIn,
  Shield,
  Users,
  MapPin,
  Shirt,
} from 'lucide-react';

interface PublicPortalViewProps {
  onBackToLogin?: () => void;
  isAuthenticated?: boolean;
}

export const PublicPortalView: React.FC<PublicPortalViewProps> = ({
  onBackToLogin,
  isAuthenticated = false,
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getPublicInfo()
      .then((res) => setData(res))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-pastoral-profundo flex items-center justify-center text-white p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-pastoral-dourado border-t-transparent rounded-full animate-spin" />
          <p className="font-serif text-sm text-pastoral-dourado-claro">
            Carregando Portal Institucional da Pastoral Missionária...
          </p>
        </div>
      </div>
    );
  }

  const inst = data?.institutional || {};
  const publicEvents = data?.publicEvents || [];
  const templates = data?.templates || [];
  const coordinators = data?.coordinators || [];

  return (
    <div className="min-h-screen bg-pastoral-creme text-pastoral-grafite">
      {/* Top Hero Banner */}
      <header className="bg-gradient-to-b from-pastoral-profundo via-pastoral-cafe to-pastoral-profundo text-white border-b-2 border-pastoral-dourado/40 relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pastoral-dourado to-pastoral-dourado-claro p-0.5 shadow-gold">
                <div className="w-full h-full bg-pastoral-profundo rounded-[14px] flex items-center justify-center">
                  <Cross className="w-6 h-6 text-pastoral-dourado" />
                </div>
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-widest text-pastoral-dourado-claro font-bold block">
                  {inst.movement_name || 'Ágape Apostolado de Jovens'}
                </span>
                <h1 className="font-serif font-bold text-xl sm:text-2xl text-white">
                  {inst.pastoral_name || 'Pastoral Missionária'}
                </h1>
              </div>
            </div>

            {onBackToLogin && (
              <button
                onClick={onBackToLogin}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-pastoral-dourado to-pastoral-dourado-claro text-pastoral-profundo font-bold text-xs shadow-gold flex items-center gap-2 hover:brightness-105 transition-all"
              >
                {isAuthenticated ? (
                  <>
                    <ArrowLeft className="w-4 h-4" />
                    <span>Voltar ao Sistema</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Acesso dos Missionários / Coordenação</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
            <div className="lg:col-span-2 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pastoral-dourado/20 border border-pastoral-dourado/40 text-pastoral-dourado-claro text-xs font-semibold">
                <MapPin className="w-3.5 h-3.5" />
                <span>
                  {inst.parish_name || 'Paróquia São Vicente de Paulo'} • {inst.location || 'Planaltina - DF'}
                </span>
              </div>
              <h2 className="font-serif text-2xl sm:text-4xl font-bold leading-tight text-white">
                “Ide por todo o mundo e pregai o Evangelho a toda criatura.”
              </h2>
              <p className="text-sm sm:text-base text-zinc-200 leading-relaxed max-w-2xl">
                Como Agapistas, fomos discípulos caminhando e aprendendo com Cristo. Depois de conhecer o Seu grande Amor de doação e de Cruz, somos enviados como Apóstolos e pescadores de homens para anunciar o Querigma através da Palavra, do Ensino, da Intercessão e da Caridade.
              </p>
              <div className="pt-2 flex flex-wrap gap-3 text-xs">
                <div className="px-3.5 py-2 rounded-xl bg-white/10 border border-white/15">
                  <span className="text-pastoral-dourado-claro font-bold block">Padroeiro e Intercessor</span>
                  <span>São Padre Pio de Pietrelcina</span>
                </div>
                <div className="px-3.5 py-2 rounded-xl bg-white/10 border border-white/15">
                  <span className="text-pastoral-dourado-claro font-bold block">Coordenação em Exercício</span>
                  <span>
                    {coordinators.length > 0
                      ? coordinators.map((c: any) => c.coordinator_name).join(' & ')
                      : 'Pedro & Fernanda'}
                  </span>
                </div>
              </div>
            </div>

            {/* Patron Saint Card */}
            <div className="bg-pastoral-profundo/90 border border-pastoral-dourado/40 rounded-2xl p-5 shadow-pastoral-lg text-center space-y-3">
              <img
                src="/assets/padre-pio.png"
                alt="São Padre Pio de Pietrelcina"
                className="w-28 h-28 object-cover rounded-full mx-auto border-2 border-pastoral-dourado shadow-gold bg-pastoral-cafe"
              />
              <div>
                <span className="text-[10px] uppercase tracking-widest text-pastoral-dourado font-bold">
                  Padroeiro Oficial • Festa em {inst.patron_feast || '23 de Setembro'}
                </span>
                <h3 className="font-serif font-bold text-lg text-white mt-0.5">
                  São Padre Pio de Pietrelcina
                </h3>
              </div>
              <p className="text-xs italic text-pastoral-rosa-antigo font-serif">
                “{inst.quote_1 || 'Tenha Jesus Cristo em seu coração, e todas as cruzes do mundo parecerão rosas.'}”
              </p>
              <p className="text-[11px] text-zinc-300 leading-relaxed text-left">
                {inst.patron_bio}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Institutional Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
        {/* Section 1: Missão, Espiritualidade e as 6 Metas */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-pastoral-dourado/20 shadow-pastoral space-y-4">
            <div className="flex items-center gap-2 text-pastoral-cafe">
              <Heart className="w-5 h-5 text-pastoral-vinho" />
              <h3 className="font-serif font-bold text-lg">Nossa Missão e as 6 Metas Pastorais</h3>
            </div>
            <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
              Nosso principal objetivo é anunciar Cristo e o Evangelho a todos, sem distinção, ajudando os cristãos a perseverarem no caminho da santidade e sendo uma verdadeira <strong>Igreja em saída</strong>.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {(inst.goals || []).map((goal: string, i: number) => (
                <div
                  key={i}
                  className="p-3.5 rounded-xl bg-pastoral-creme/70 border border-pastoral-dourado/20 text-xs text-pastoral-grafite leading-relaxed"
                >
                  {goal}
                </div>
              ))}
            </div>
          </div>

          {/* Prayer of St Padre Pio & T-Shirt Preview */}
          <div className="space-y-6">
            <div className="bg-gradient-to-b from-pastoral-cafe to-pastoral-profundo text-white rounded-2xl p-5 border border-pastoral-dourado/30 shadow-pastoral space-y-3">
              <div className="flex items-center gap-2 text-pastoral-dourado-claro">
                <Sparkles className="w-4 h-4" />
                <h4 className="font-serif font-bold text-sm">{inst.prayer_title || 'Oração de São Padre Pio'}</h4>
              </div>
              <p className="text-xs text-zinc-200 italic leading-relaxed">
                “{inst.prayer_excerpt}”
              </p>
              <p className="text-[11px] text-pastoral-dourado-claro font-serif text-right">
                — São Pio de Pietrelcina
              </p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-pastoral-dourado/20 shadow-pastoral flex items-center gap-4">
              <img
                src="/assets/camiseta-oficial.jpg"
                alt="Camiseta Oficial Pastoral Missionária"
                className="w-20 h-20 rounded-xl object-cover border border-pastoral-dourado/30 flex-shrink-0"
              />
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-pastoral-cafe font-serif font-bold text-sm">
                  <Shirt className="w-4 h-4 text-pastoral-dourado" />
                  <span>Camiseta Oficial 2026</span>
                </div>
                <p className="text-xs text-zinc-600">
                  Identidade oficial da Pastoral Missionária com arte de São Padre Pio. Membros podem acompanhar seu pedido e chave Pix na área interna.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Projetos, Encontros e Estágios Oficiais */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif font-bold text-xl text-pastoral-cafe flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-pastoral-dourado" />
                Encontros, Projetos e Estágios da Pastoral
              </h3>
              <p className="text-xs text-zinc-500">
                Estrutura oficial documentada na Pasta da Pastoral Missionária (sujeita ao planejamento e aprovação da coordenação)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((tpl: any) => (
              <div
                key={tpl.id}
                className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-xs flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-pastoral-creme text-pastoral-cafe border border-pastoral-dourado/30">
                    {tpl.target_audience}
                  </span>
                  <h4 className="font-serif font-bold text-base text-pastoral-cafe">{tpl.title}</h4>
                  <p className="text-xs text-zinc-600 leading-relaxed">{tpl.objective}</p>
                </div>
                {tpl.suggested_theme && (
                  <div className="p-2.5 rounded-xl bg-pastoral-creme/50 border border-pastoral-dourado/20 text-[11px] text-pastoral-cafe">
                    <strong>Tema de referência:</strong> {tpl.suggested_theme}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Section 3: Calendário Anual 2027 (Atividades Planejadas) */}
        <section className="bg-white rounded-2xl p-6 border border-zinc-200/80 shadow-pastoral space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-serif font-bold text-lg text-pastoral-cafe flex items-center gap-2">
                <Calendar className="w-5 h-5 text-pastoral-dourado" />
                Calendário Oficial da Pastoral Missionária — 2027
              </h3>
              <p className="text-xs text-zinc-500">
                26 atividades previstas no calendário oficial (horários e locais informados pela coordenação a cada convocação)
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              {publicEvents.length} Datas Oficiais 2027
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-h-96 overflow-y-auto pr-1">
            {publicEvents.map((ev: any) => (
              <div
                key={ev.id}
                className="p-3 rounded-xl border border-zinc-200 hover:border-pastoral-dourado/50 transition-colors bg-zinc-50/50 space-y-1"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-pastoral-vinho">
                    {ev.event_date.split('-').reverse().join('/')}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-pastoral-creme text-pastoral-cafe font-medium">
                    {ev.category}
                  </span>
                </div>
                <p className="text-xs font-bold text-pastoral-grafite">{ev.title}</p>
                {ev.status === 'A confirmar' && (
                  <span className="inline-block text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                    A confirmar
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
