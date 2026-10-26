import React from 'react';
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  DollarSign,
  Truck,
  FileSpreadsheet,
  FileText,
  Calendar,
  History,
  Settings,
  MessageCircle,
  Cross,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export type NavItemKey =
  | 'visao_geral'
  | 'pedidos'
  | 'membros'
  | 'financeiro'
  | 'producao'
  | 'relatorios'
  | 'planilhas'
  | 'campanhas'
  | 'historico'
  | 'comunicacao'
  | 'configuracoes';

interface SidebarProps {
  currentView: NavItemKey;
  onSelectView: (view: NavItemKey) => void;
  syncStatus?: string;
  pendingSyncCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  syncStatus = 'desconectado',
  pendingSyncCount = 0,
}) => {
  const { user, logout } = useAuth();

  const menuItems = [
    { key: 'visao_geral', label: 'Visão Geral', icon: LayoutDashboard },
    { key: 'pedidos', label: 'Pedidos', icon: ShoppingBag },
    { key: 'membros', label: 'Membros', icon: Users },
    { key: 'financeiro', label: 'Financeiro', icon: DollarSign },
    { key: 'producao', label: 'Produção e Entregas', icon: Truck },
    { key: 'relatorios', label: 'Relatórios', icon: FileText },
    {
      key: 'planilhas',
      label: 'Google Planilhas',
      icon: FileSpreadsheet,
      badge: pendingSyncCount > 0 ? `${pendingSyncCount} pendente(s)` : undefined,
    },
    { key: 'comunicacao', label: 'WhatsApp', icon: MessageCircle },
    { key: 'campanhas', label: 'Campanhas', icon: Calendar },
    { key: 'historico', label: 'Histórico', icon: History },
    { key: 'configuracoes', label: 'Configurações', icon: Settings },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-72 bg-pastoral-profundo text-white border-r border-pastoral-dourado/20 select-none shadow-pastoral-lg z-30 flex-shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="p-6 border-b border-pastoral-dourado/20 bg-gradient-to-b from-pastoral-cafe to-pastoral-profundo">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-pastoral-dourado to-pastoral-dourado-claro flex items-center justify-center shadow-gold p-0.5">
            <div className="w-full h-full bg-pastoral-profundo rounded-[10px] flex items-center justify-center">
              <Cross className="w-6 h-6 text-pastoral-dourado" />
            </div>
          </div>
          <div>
            <h1 className="font-serif font-bold text-lg text-white leading-tight">
              Pastoral Missionária
            </h1>
            <p className="text-xs text-pastoral-dourado font-medium tracking-wide">
              Ágape • São Vicente de Paulo
            </p>
          </div>
        </div>

        {/* Small Patron Quote pill */}
        <div className="mt-4 px-3 py-2 bg-pastoral-profundo/80 rounded-lg border border-pastoral-dourado/20 text-xs italic text-pastoral-rosa-antigo/90 text-center">
          "Estar perto de Jesus."
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onSelectView(item.key as NavItemKey)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-pastoral-dourado to-pastoral-dourado/80 text-pastoral-profundo font-semibold shadow-gold'
                  : 'text-zinc-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-pastoral-profundo' : 'text-pastoral-dourado/80'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Google Sheets Sync Pill in Sidebar */}
      <div className="p-4 mx-4 mb-3 rounded-xl bg-pastoral-cafe/80 border border-pastoral-dourado/20 text-xs">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-zinc-400 font-medium">Google Planilhas:</span>
          <span
            className={`inline-flex items-center gap-1 font-semibold ${
              syncStatus === 'conectado'
                ? 'text-emerald-400'
                : syncStatus === 'erro'
                ? 'text-rose-400'
                : 'text-amber-400'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                syncStatus === 'conectado' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            {syncStatus === 'conectado' ? 'Sincronizado' : 'Aguardando'}
          </span>
        </div>
        <p className="text-[11px] text-zinc-400">
          {pendingSyncCount > 0
            ? `${pendingSyncCount} alteração(ões) na fila`
            : 'Planilha atualizada automaticamente'}
        </p>
      </div>

      {/* User Profile Footer */}
      <div className="p-4 border-t border-pastoral-dourado/20 bg-pastoral-cafe/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-full bg-pastoral-dourado text-pastoral-profundo font-bold flex items-center justify-center text-xs flex-shrink-0">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-semibold text-white truncate">{user?.name || 'Coordenação'}</p>
            <p className="text-[10px] text-pastoral-dourado uppercase tracking-wider font-medium">
              {user?.role || 'Acesso'}
            </p>
          </div>
        </div>
        <button
          onClick={logout}
          title="Sair do sistema"
          className="text-zinc-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-white/5 transition-colors text-xs"
        >
          Sair
        </button>
      </div>
    </aside>
  );
};

