import React from 'react';
import { Menu, Plus, RefreshCw, ExternalLink, Calendar, ShieldCheck } from 'lucide-react';
import { Campaign, GoogleSheetsConfig } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  onToggleMobileMenu: () => void;
  activeCampaign: Campaign | null;
  sheetsConfig: GoogleSheetsConfig | null;
  onOpenNewOrder: () => void;
  onSyncNow: () => void;
  isSyncing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
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

  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-pastoral-cafe/10 shadow-sm px-4 lg:px-8 py-3 flex items-center justify-between">
      {/* Left: Mobile hamburger & Campaign badge */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 rounded-xl text-pastoral-cafe hover:bg-pastoral-creme transition-colors"
          aria-label="Abrir menu"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-2">
          <span className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-pastoral-creme border border-pastoral-dourado/30 text-pastoral-cafe">
            <Calendar className="w-3.5 h-3.5 text-pastoral-dourado" />
            {activeCampaign?.name || 'Camisetas Pastoral Missionária — 2026'}
          </span>
          <span className="sm:hidden text-xs font-bold text-pastoral-cafe truncate max-w-[180px]">
            {activeCampaign?.name || 'Pastoral 2026'}
          </span>
        </div>
      </div>

      {/* Right: Quick actions, Sheets status pill, User */}
      <div className="flex items-center gap-2 sm:gap-3">
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
              {isSyncing ? 'Sincronizando...' : isConnected ? 'Google Planilhas Conectada' : 'Planilha Pendente'}
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

        {/* Quick New Order Button */}
        {canEdit && (
          <button
            onClick={onOpenNewOrder}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-gradient-to-r from-pastoral-dourado to-pastoral-dourado-claro text-pastoral-profundo hover:brightness-105 shadow-gold transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Novo Pedido</span>
            <span className="sm:hidden">Novo</span>
          </button>
        )}

        {/* User avatar pill */}
        <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-zinc-200 text-xs">
          <div className="w-7 h-7 rounded-full bg-pastoral-cafe text-white font-bold flex items-center justify-center text-xs">
            {user?.name?.charAt(0) || 'P'}
          </div>
          <span className="font-semibold text-pastoral-grafite truncate max-w-[120px]">
            {user?.name || 'Coordenação'}
          </span>
        </div>
      </div>
    </header>
  );
};

