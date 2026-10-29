import React, { useState, useEffect } from 'react';
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
  Sparkles,
  Send,
  GraduationCap,
  Shirt,
  ShieldCheck,
  Globe,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export type NavItemKey =
  | 'painel_missionario'
  | 'calendario_2027'
  | 'missoes_envios'
  | 'formacao_laboratorios'
  | 'minha_camiseta'
  | 'portal_publico'
  | 'visao_geral'
  | 'pedidos'
  | 'membros'
  | 'financeiro'
  | 'producao'
  | 'relatorios'
  | 'planilhas'
  | 'campanhas'
  | 'comunicacao'
  | 'governanca'
  | 'historico'
  | 'configuracoes';

interface SidebarProps {
  currentView: NavItemKey;
  onSelectView: (view: NavItemKey) => void;
  syncStatus?: string;
  pendingSyncCount?: number;
}

type NavGroupKey = 'missionaria' | 'camisetas' | 'coordenacao';

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  syncStatus = 'desconectado',
  pendingSyncCount = 0,
}) => {
  const { user, logout } = useAuth();
  const isCoord = user?.role === 'admin' || user?.role === 'coordenador';
  const [activeGroup, setActiveGroup] = useState<NavGroupKey>('missionaria');

  // Automatically switch group tab when currentView changes programmatically
  useEffect(() => {
    if (!isCoord) {
      setActiveGroup('missionaria');
      return;
    }
    const camisetasViews: NavItemKey[] = [
      'visao_geral',
      'pedidos',
      'membros',
      'financeiro',
      'producao',
      'relatorios',
      'planilhas',
      'comunicacao',
      'campanhas',
    ];
    const coordViews: NavItemKey[] = ['governanca', 'historico', 'configuracoes'];

    if (camisetasViews.includes(currentView)) {
      setActiveGroup('camisetas');
    } else if (coordViews.includes(currentView)) {
      setActiveGroup('coordenacao');
    } else {
      setActiveGroup('missionaria');
    }
  }, [currentView, isCoord]);

  const groups: Record<
    NavGroupKey,
    { label: string; items: { key: NavItemKey; label: string; icon: any; badge?: string }[] }
  > = {
    missionaria: {
      label: 'Vida Missionária',
      items: [
        { key: 'painel_missionario', label: 'Painel Missionário', icon: Sparkles },
        { key: 'calendario_2027', label: 'Calendário 2027', icon: Calendar, badge: '26 datas' },
        { key: 'missoes_envios', label: 'Missões & Envios', icon: Send },
        { key: 'formacao_laboratorios', label: 'Laboratórios & Formação', icon: GraduationCap },
        { key: 'minha_camiseta', label: 'Minha Camiseta & Pix', icon: Shirt },
        { key: 'portal_publico', label: 'Portal Institucional', icon: Globe },
      ],
    },
    camisetas: {
      label: 'Gestão Camisetas',
      items: [
        { key: 'visao_geral', label: 'Visão Geral (Camisetas)', icon: LayoutDashboard },
        { key: 'pedidos', label: 'Pedidos', icon: ShoppingBag },
        { key: 'membros', label: 'Compradores / Membros', icon: Users },
        { key: 'financeiro', label: 'Financeiro (Camisetas)', icon: DollarSign },
        { key: 'producao', label: 'Produção e Entregas', icon: Truck },
        { key: 'relatorios', label: 'Relatórios & Exportação', icon: FileText },
        {
          key: 'planilhas',
          label: 'Google Planilhas',
          icon: FileSpreadsheet,
          badge: pendingSyncCount > 0 ? `${pendingSyncCount}` : undefined,
        },
        { key: 'comunicacao', label: 'WhatsApp (Camisetas)', icon: MessageCircle },
        { key: 'campanhas', label: 'Campanhas / Lotes', icon: Calendar },
      ],
    },
    coordenacao: {
      label: 'Governança',
      items: [
        { key: 'governanca', label: 'Pessoas, Papéis & Sucessão', icon: ShieldCheck },
        { key: 'historico', label: 'Histórico & Auditoria', icon: History },
        { key: 'configuracoes', label: 'Configurações & Backup', icon: Settings },
      ],
    },
  };

  const currentItems = groups[activeGroup].items;

  return (
    <aside className="hidden lg:flex flex-col w-72 bg-pastoral-profundo text-white border-r border-pastoral-dourado/20 select-none shadow-pastoral-lg z-30 flex-shrink-0 min-h-screen">
      {/* Brand Header */}
      <div className="p-5 border-b border-pastoral-dourado/20 bg-gradient-to-b from-pastoral-cafe to-pastoral-profundo">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-pastoral-dourado to-pastoral-dourado-claro flex items-center justify-center shadow-gold p-0.5">
            <div className="w-full h-full bg-pastoral-profundo rounded-[10px] flex items-center justify-center">
              <Cross className="w-5 h-5 text-pastoral-dourado" />
            </div>
          </div>
          <div>
            <h1 className="font-serif font-bold text-base text-white leading-tight">
              Pastoral Missionária
            </h1>
            <p className="text-[11px] text-pastoral-dourado font-medium tracking-wide">
              Ágape • São Vicente de Paulo
            </p>
          </div>
        </div>

        <div className="mt-3 px-3 py-1.5 bg-pastoral-profundo/80 rounded-lg border border-pastoral-dourado/20 text-[11px] italic text-pastoral-rosa-antigo/90 text-center">
          "São Padre Pio, rogai por nós!"
        </div>
      </div>

      {/* Contextual Domain Switcher (Visible to Coordinators & Admin) */}
      {isCoord && (
        <div className="px-3 pt-3">
          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-black/30 border border-pastoral-dourado/20 text-[10px] font-bold">
            <button
              onClick={() => {
                setActiveGroup('missionaria');
                onSelectView('painel_missionario');
              }}
              className={`py-1.5 px-1 rounded-lg transition-all ${
                activeGroup === 'missionaria'
                  ? 'bg-pastoral-dourado text-pastoral-profundo shadow-2xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Missionária
            </button>
            <button
              onClick={() => {
                setActiveGroup('camisetas');
                onSelectView('visao_geral');
              }}
              className={`py-1.5 px-1 rounded-lg transition-all ${
                activeGroup === 'camisetas'
                  ? 'bg-pastoral-dourado text-pastoral-profundo shadow-2xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Camisetas
            </button>
            <button
              onClick={() => {
                setActiveGroup('coordenacao');
                onSelectView('governanca');
              }}
              className={`py-1.5 px-1 rounded-lg transition-all ${
                activeGroup === 'coordenacao'
                  ? 'bg-pastoral-dourado text-pastoral-profundo shadow-2xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Governança
            </button>
          </div>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-3 space-y-1 overflow-y-auto">
        <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-pastoral-dourado/70">
          {groups[activeGroup].label}
        </div>
        {currentItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onSelectView(item.key)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-pastoral-dourado to-pastoral-dourado/80 text-pastoral-profundo font-bold shadow-gold'
                  : 'text-zinc-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-pastoral-profundo' : 'text-pastoral-dourado/80'
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-pastoral-profundo/20 text-pastoral-profundo font-bold'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Google Sheets Sync Pill in Sidebar */}
      <div className="p-3.5 mx-4 mb-3 rounded-xl bg-pastoral-cafe/80 border border-pastoral-dourado/20 text-xs">
        <div className="flex items-center justify-between mb-1">
          <span className="text-zinc-400 font-medium text-[11px]">Google Planilhas:</span>
          <span
            className={`inline-flex items-center gap-1 font-semibold text-[11px] ${
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
            {syncStatus === 'conectado' ? 'Sincronizado' : 'Pronto'}
          </span>
        </div>
        <p className="text-[10px] text-zinc-400">
          {pendingSyncCount > 0
            ? `${pendingSyncCount} alteração(ões) na fila`
            : '19 pedidos iniciais preservados'}
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
