import React from 'react';
import { Menu, Plus, RefreshCw, ExternalLink, Calendar, Cross, ShieldCheck } from 'lucide-react';
import { Campaign, GoogleSheetsConfig } from '../../types';
import { useAuth } from '../../context/AuthContext';
import type { NavItemKey } from './Sidebar';

interface HeaderProps {
  currentView: NavItemKey;
  onToggleMobileMenu: () => void;
  activeCampaign: Campaign | null;
  sheetsConfig: GoogleSheetsConfig | null;
  onOpenNewOrder: () => void;
  onSyncNow: () => void;
  isSyncing: boolean;
}

const VIEW_TITLES: Record<NavItemKey, { title: string; subtitle?: string }> = {
  painel_missionario: { title: 'Painel Missionário', subtitle: 'Visão Geral da Pastoral' },
  comunidade: { title: 'Comunidade Missionária', subtitle: 'Partilhas e Vivências' },
  calendario_2027: { title: 'Calendário da Pastoral Missionária', subtitle: 'Atividades e Encontros' },
  missoes_envios: { title: 'Missões & Envios', subtitle: 'Solicitações e Escalas' },
  formacao_laboratorios: { title: 'Laboratórios de Pregação', subtitle: 'Formação e Sorteios' },
  minha_camiseta: { title: 'Minha Camiseta & Pix', subtitle: 'Consulta e Pagamento' },
  portal_publico: { title: 'Portal Institucional Público', subtitle: 'Informações Oficiais' },
  visao_geral: { title: 'Visão Geral das Camisetas', subtitle: 'Métricas da Campanha' },
  pedidos: { title: 'Pedidos de Camisetas', subtitle: 'Gestão da Campanha 2026' },
  membros: { title: 'Compradores & Missionários', subtitle: 'Cadastro' },
  financeiro: { title: 'Caixa & Pagamentos', subtitle: 'Gestão Financeira' },
  producao: { title: 'Etapas de Produção', subtitle: 'Controle de Confecção' },
  relatorios: { title: 'Relatórios e Exportação', subtitle: 'PDF e Excel' },
  planilhas: { title: 'Google Planilhas', subtitle: 'Status de Integração' },
  campanhas: { title: 'Campanhas', subtitle: 'Histórico de Campanhas' },
  comunicacao: { title: 'Comunicação', subtitle: 'Mensagens WhatsApp' },
  governanca: { title: 'Governança & Sucessão', subtitle: 'Transição e Permissões' },
  historico: { title: 'Histórico de Atividades', subtitle: 'Auditoria' },
  configuracoes: { title: 'Configurações', subtitle: 'Parâmetros Gerais' },
};

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onToggleMobileMenu,
  activeCampaign,
  sheetsConfig,
  onOpenNewOrder,
  onSyncNow,
  isSyncing,
}) => {
  const { user, canEdit } = useAuth();

  const isConnected = sheetsConfig?.status === 'conectado';
  const sheetUrl = sheetsConfig?.spreadsheet_id
    ? `https://docs.google.com/spreadsheets/d/${sheetsConfig.spreadsheet_id}/edit`
    : '';

  const viewInfo = VIEW_TITLES[currentView] || { title: 'Pastoral Missionária' };
  const isTshirtModule = currentView === 'pedidos' || currentView === 'planilhas' || currentView === 'visao_geral';

  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-pastoral-cafe/10 shadow-xs px-4 lg:px-8 py-3 flex items-center justify-between">
      {/* Left: Mobile hamburger & Contextual Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 rounded-xl text-pastoral-cafe hover:bg-pastoral-creme transition-colors"
          aria-label="Abrir menu"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-pastoral-creme border border-pastoral-dourado/30 flex items-center justify-center text-pastoral-cafe shadow-xs">
            <Cross className="w-4 h-4 text-pastoral-dourado" />
          </div>
          <div>
            <h1 className="font-serif font-bold text-sm sm:text-base text-pastoral-cafe leading-tight">
              {viewInfo.title}
            </h1>
            <p className="text-[11px] text-zinc-400 hidden sm:block leading-none mt-0.5">
              {viewInfo.subtitle || 'Pastoral Missionária — Paróquia São Vicente de Paulo'}
            </p>
          </div>
        </div>
      </div>

      {/* Right: Contextual actions strictly for T-shirt module, User profile badge */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Only show Sheets & New Order on T-shirt management views */}
        {isTshirtModule && (
          <>
            {/* Google Sheets Sync Pill */}
            <div className="flex items-center gap-1">
              <button
                onClick={onSyncNow}
                disabled={isSyncing}
                title="Sincronizar com Google Planilhas agora"
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  isConnected
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                    : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-pastoral-dourado' : ''}`} />
                <span className="hidden md:inline">
                  {isSyncing ? 'Sincronizando...' : isConnected ? 'Planilha Conectada' : 'Planilha Pendente'}
                </span>
              </button>

              {sheetUrl && (
                <a
                  href={sheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Abrir Google Planilhas no navegador"
                  className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 border border-emerald-200 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            {/* Quick New Order Button (only on Orders view and for users with edit permission) */}
            {canEdit && currentView === 'pedidos' && (
              <button
                onClick={onOpenNewOrder}
                className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-xl text-xs sm:text-sm font-semibold bg-gradient-to-r from-pastoral-dourado to-pastoral-dourado-claro text-pastoral-profundo hover:brightness-105 shadow-gold transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Novo Pedido</span>
                <span className="sm:hidden">Novo</span>
              </button>
            )}
          </>
        )}

        {/* User avatar & role pill */}
        <div className="flex items-center gap-2 pl-2 border-l border-zinc-200 text-xs">
          {user?.picture_url ? (
            <img
              src={user.picture_url}
              alt={user.name}
              className="w-7 h-7 rounded-full object-cover border border-pastoral-dourado/40"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-pastoral-cafe text-white font-bold flex items-center justify-center text-xs">
              {user?.name?.charAt(0) || 'P'}
            </div>
          )}
          <div className="hidden sm:block text-left">
            <span className="font-semibold text-pastoral-grafite block truncate max-w-[120px] text-xs leading-tight">
              {user?.name || 'Coordenação'}
            </span>
            <span className="text-[10px] text-pastoral-dourado uppercase font-bold block leading-none">
              {user?.role || 'coordenador'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

