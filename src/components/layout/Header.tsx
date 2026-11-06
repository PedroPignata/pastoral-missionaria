import React from 'react';
import { Menu, RefreshCw, ExternalLink, Cross } from 'lucide-react';
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
  diretorio_membros: { title: 'Membros da Pastoral', subtitle: 'Diretório Institucional de Missionários' },
  calendario_2027: { title: 'Calendário', subtitle: 'Datas e atividades da Pastoral' },
  missoes_envios: { title: 'Missões & Envios', subtitle: 'Solicitações e Escalas' },
  formacao_laboratorios: { title: 'Laboratórios de Pregação', subtitle: 'Formação e Sorteios' },
  minha_camiseta: { title: 'Minha Camiseta & Pix', subtitle: 'Consulta e Pagamento' },
  portal_publico: { title: 'Portal Institucional Público', subtitle: 'Informações Oficiais' },
  visao_geral: { title: 'Visão Geral das Camisetas', subtitle: 'Métricas da Campanha' },
  pedidos: { title: 'Pedidos & Compradores', subtitle: 'Controle de encomendas, pagamentos, produção e entregas' },
  membros: { title: 'Pedidos & Compradores', subtitle: 'Controle de encomendas, pagamentos, produção e entregas' },
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
  sheetsConfig,
  onSyncNow,
  isSyncing,
}) => {
  const { user } = useAuth();

  const isConnected = sheetsConfig?.status === 'conectado';
  const hasSheetsError = sheetsConfig?.status === 'erro';
  const sheetUrl = sheetsConfig?.spreadsheet_id
    ? `https://docs.google.com/spreadsheets/d/${sheetsConfig.spreadsheet_id}/edit`
    : '';

  const viewInfo = VIEW_TITLES[currentView] || { title: 'Pastoral Missionária' };
  const showSheetsStatus = currentView === 'planilhas' || hasSheetsError;

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

      {/* Right: Contextual actions & User profile badge */}
      <div className="flex items-center gap-2 sm:gap-3">
        {showSheetsStatus && (
          <div className="flex items-center gap-1">
            <button
              onClick={onSyncNow}
              disabled={isSyncing}
              title="Sincronizar com Google Planilhas agora"
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                isConnected
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                  : hasSheetsError
                  ? 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100'
                  : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-pastoral-dourado' : ''}`} />
              <span className="hidden md:inline">
                {isSyncing
                  ? 'Sincronizando...'
                  : isConnected
                  ? 'Planilha Conectada'
                  : hasSheetsError
                  ? 'Erro na Planilha'
                  : 'Sincronizar Planilha'}
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
              {user?.role === 'coordenador' || user?.role === 'admin' ? 'Administrador / Coordenador' : user?.role}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
