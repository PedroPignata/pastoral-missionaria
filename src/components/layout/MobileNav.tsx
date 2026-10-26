import React from 'react';
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  DollarSign,
  Menu,
  X,
  Cross,
  FileText,
  FileSpreadsheet,
  Truck,
  MessageCircle,
  Calendar,
  History,
  Settings,
} from 'lucide-react';
import { NavItemKey } from './Sidebar';
import { useAuth } from '../../context/AuthContext';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  currentView: NavItemKey;
  onSelectView: (view: NavItemKey) => void;
  pendingSyncCount?: number;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  isOpen,
  onClose,
  currentView,
  onSelectView,
  pendingSyncCount = 0,
}) => {
  const { user, logout } = useAuth();

  const handleSelect = (view: NavItemKey) => {
    onSelectView(view);
    onClose();
  };

  const allItems = [
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
      badge: pendingSyncCount > 0 ? `${pendingSyncCount}` : undefined,
    },
    { key: 'comunicacao', label: 'WhatsApp', icon: MessageCircle },
    { key: 'campanhas', label: 'Campanhas', icon: Calendar },
    { key: 'historico', label: 'Histórico', icon: History },
    { key: 'configuracoes', label: 'Configurações', icon: Settings },
  ];

  return (
    <>
      {/* Slide-over Drawer for Full Menu */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-pastoral-profundo/70 backdrop-blur-sm transition-opacity"
            onClick={onClose}
          />
          <div className="fixed inset-y-0 left-0 w-4/5 max-w-xs bg-pastoral-profundo text-white p-5 shadow-2xl flex flex-col justify-between overflow-y-auto">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-pastoral-dourado/20">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-pastoral-dourado flex items-center justify-center text-pastoral-profundo">
                    <Cross className="w-5 h-5 text-pastoral-profundo" />
                  </div>
                  <div>
                    <h2 className="font-serif font-bold text-sm text-white">Pastoral Missionária</h2>
                    <p className="text-[10px] text-pastoral-dourado">Ágape Apostolado de Jovens</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Items */}
              <div className="py-4 space-y-1">
                {allItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => handleSelect(item.key as NavItemKey)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-pastoral-dourado text-pastoral-profundo font-bold shadow-gold'
                          : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-pastoral-profundo' : 'text-pastoral-dourado'}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* User Profile & Logout */}
            <div className="pt-4 border-t border-pastoral-dourado/20 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-white">{user?.name || 'Coordenação'}</p>
                <p className="text-[10px] text-pastoral-dourado uppercase">{user?.role || 'Acesso'}</p>
              </div>
              <button
                onClick={() => {
                  logout();
                  onClose();
                }}
                className="text-xs text-rose-300 hover:text-rose-100 px-2 py-1 rounded bg-rose-950/40 border border-rose-800"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Sticky Action Bar for Mobile Devices */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-pastoral-profundo border-t border-pastoral-dourado/30 px-2 py-1.5 flex items-center justify-around shadow-2xl backdrop-blur-md">
        <button
          onClick={() => onSelectView('visao_geral')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-medium transition-all ${
            currentView === 'visao_geral' ? 'text-pastoral-dourado font-bold' : 'text-zinc-400'
          }`}
        >
          <LayoutDashboard className="w-5 h-5 mb-0.5" />
          Início
        </button>

        <button
          onClick={() => onSelectView('pedidos')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-medium transition-all ${
            currentView === 'pedidos' ? 'text-pastoral-dourado font-bold' : 'text-zinc-400'
          }`}
        >
          <ShoppingBag className="w-5 h-5 mb-0.5" />
          Pedidos
        </button>

        <button
          onClick={() => onSelectView('financeiro')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-medium transition-all ${
            currentView === 'financeiro' ? 'text-pastoral-dourado font-bold' : 'text-zinc-400'
          }`}
        >
          <DollarSign className="w-5 h-5 mb-0.5" />
          Financeiro
        </button>

        <button
          onClick={() => onSelectView('producao')}
          className={`flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-medium transition-all ${
            currentView === 'producao' ? 'text-pastoral-dourado font-bold' : 'text-zinc-400'
          }`}
        >
          <Truck className="w-5 h-5 mb-0.5" />
          Entregas
        </button>

        <button
          onClick={onClose}
          className="flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-medium text-zinc-400 hover:text-white"
        >
          <Menu className="w-5 h-5 mb-0.5" />
          Menu
        </button>
      </div>
    </>
  );
};

