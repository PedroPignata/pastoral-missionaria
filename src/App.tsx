import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './context/AuthContext';
import { LoginView } from './views/LoginView';
import { Sidebar, NavItemKey } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { MobileNav } from './components/layout/MobileNav';

// Ecosystem 2.0 Views
import { PainelMissionarioView } from './views/PainelMissionarioView';
import { Calendario2027View } from './views/Calendario2027View';
import { MissoesEnviosView } from './views/MissoesEnviosView';
import { FormacaoLaboratoriosView } from './views/FormacaoLaboratoriosView';
import { MinhaCamisetaView } from './views/MinhaCamisetaView';
import { ComunidadeMissionariaView } from './views/ComunidadeMissionariaView';
import { DiretorioMembrosView } from './views/DiretorioMembrosView';
import { GovernancaSucessaoView } from './views/GovernancaSucessaoView';
import { PublicPortalView } from './views/PublicPortalView';

// Original T-Shirt Module Views (100% Preserved)
import { VisaoGeralView } from './views/VisaoGeralView';
import { PedidosView } from './views/PedidosView';
import { MembrosView } from './views/MembrosView';
import { FinanceiroView } from './views/FinanceiroView';
import { ProducaoEntregasView } from './views/ProducaoEntregasView';
import { RelatoriosView } from './views/RelatoriosView';
import { GooglePlanilhasView } from './views/GooglePlanilhasView';
import { CampanhasView } from './views/CampanhasView';
import { HistoricoView } from './views/HistoricoView';
import { ComunicacaoView } from './views/ComunicacaoView';
import { ConfiguracoesView } from './views/ConfiguracoesView';

// Modals
import { NewOrderModal } from './components/modals/NewOrderModal';
import { RecordPaymentModal } from './components/modals/RecordPaymentModal';
import { RecordDeliveryModal } from './components/modals/RecordDeliveryModal';
import { OrderDetailsModal } from './components/modals/OrderDetailsModal';
import { WhatsAppModal } from './components/modals/WhatsAppModal';
import { EditOrderModal } from './components/modals/EditOrderModal';
import { OnboardingModal } from './components/modals/OnboardingModal';

import { api } from './services/api';
import { Order, Member, Campaign, Payment, DashboardKPIs, GoogleSheetsConfig } from './types';

interface ModuleErrorBoundaryProps {
  moduleName: string;
  children: React.ReactNode;
}

class ModuleErrorBoundary extends React.Component<ModuleErrorBoundaryProps, { hasError: boolean; error: any }> {
  constructor(props: ModuleErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, info: any) {
    console.error(`Erro no módulo ${this.props.moduleName}:`, error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-lg mx-auto bg-white rounded-3xl border border-pastoral-dourado/40 shadow-md text-center space-y-4 my-8">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-pastoral-dourado flex items-center justify-center mx-auto border border-amber-200">
            <span className="text-xl font-bold">⚠️</span>
          </div>
          <div>
            <h3 className="font-serif font-bold text-base text-pastoral-cafe">
              Não foi possível carregar {this.props.moduleName}
            </h3>
            <p className="text-xs text-zinc-500 mt-1">
              Ocorreu uma falha temporária. Seus dados e sua sessão permanecem 100% seguros.
            </p>
          </div>
          <button
            onClick={this.handleRetry}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-pastoral-dourado text-pastoral-profundo hover:brightness-105 shadow-xs"
          >
            Tentar Novamente
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const App: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();

  const [currentView, setCurrentView] = useState<NavItemKey>('painel_missionario');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Core Data State
  const [orders, setOrders] = useState<Order[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [dashboardData, setDashboardData] = useState<{
    kpis: DashboardKPIs;
    charts: any;
    recentPayments: Payment[];
    pendingOrders: any[];
  } | null>(null);
  const [sheetsConfig, setSheetsConfig] = useState<GoogleSheetsConfig | null>(null);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Modals state
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<Order | null>(null);
  const [selectedOrderForDelivery, setSelectedOrderForDelivery] = useState<Order | null>(null);
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<Order | null>(null);
  const [selectedOrderForWhatsApp, setSelectedOrderForWhatsApp] = useState<Order | null>(null);
  const [selectedOrderForEdit, setSelectedOrderForEdit] = useState<Order | null>(null);
  const [isOnboardingDismissed, setIsOnboardingDismissed] = useState(false);

  // Synchronize Coordinator Browser Vault with Backend Snapshot Engine
  const syncCoordinatorVault = useCallback(async () => {
    if (!user || (user.role !== 'admin' && user.role !== 'coordenador')) return;
    const VAULT_KEY = 'pastoral_coordinator_snapshot_v1';
    try {
      const serverSync = await api.getSnapshotSync();
      if (!serverSync || !serverSync.snapshot) return;

      const rawLocal = localStorage.getItem(VAULT_KEY);
      if (rawLocal) {
        try {
          const localSnap = JSON.parse(rawLocal);
          const localTime = localSnap?.lastMutationAt ? new Date(localSnap.lastMutationAt).getTime() : 0;
          const serverTime = serverSync.lastMutationAt ? new Date(serverSync.lastMutationAt).getTime() : 0;
          const localValidPays = Array.isArray(localSnap?.data?.payments)
            ? localSnap.data.payments.filter((p: any) => !p.is_reversed).length
            : 0;
          const serverValidPays = Array.isArray(serverSync.snapshot?.data?.payments)
            ? serverSync.snapshot.data.payments.filter((p: any) => !p.is_reversed).length
            : 0;

          if (
            (localTime > serverTime + 2000 && localValidPays >= serverValidPays) ||
            localValidPays > serverValidPays
          ) {
            const rec = await api.reconcileSnapshot(localSnap, 'auto_reconcile_coordinator_vault');
            if (rec?.reconciled && rec?.snapshot) {
              localStorage.setItem(VAULT_KEY, JSON.stringify(rec.snapshot));
              return true; // Indicates server was updated from vault
            }
          }
        } catch {
          // Ignore malformed local snapshot
        }
      }

      localStorage.setItem(VAULT_KEY, JSON.stringify(serverSync.snapshot));
    } catch {
      // Non-blocking background sync
    }
    return false;
  }, [user]);

  // Load system data based on user authorization
  const loadAllData = useCallback(async () => {
    if (!user) return;
    setIsLoadingData(true);
    const isCoord = user.role === 'admin' || user.role === 'coordenador';

    try {
      if (isCoord) {
        await syncCoordinatorVault();

        const [
          ordersData,
          membersData,
          campaignsData,
          activeCamp,
          paymentsData,
          dashData,
          sheetsStatus,
        ] = await Promise.all([
          api.getOrders(),
          api.getMembers(),
          api.getCampaigns(),
          api.getActiveCampaign(),
          api.getPayments(),
          api.getDashboard(),
          api.getSheetsStatus(),
        ]);

        setOrders(ordersData);
        setMembers(membersData);
        setCampaigns(campaignsData);
        setActiveCampaign(activeCamp);
        setPayments(paymentsData);
        setDashboardData(dashData);
        setSheetsConfig(sheetsStatus.config);
        setPendingSyncCount(sheetsStatus.pendingJobsCount);

        // Refresh vault after any state mutation
        api.getSnapshotSync().then((res) => {
          if (res?.snapshot) {
            localStorage.setItem('pastoral_coordinator_snapshot_v1', JSON.stringify(res.snapshot));
          }
        }).catch(() => {});
      } else {
        // Members only load their own orders, active campaigns and basic context
        const [campaignsData, activeCamp, myOrders] = await Promise.all([
          api.getCampaigns(),
          api.getActiveCampaign(),
          api.getMyOrders().catch(() => []),
        ]);
        setCampaigns(campaignsData);
        setActiveCampaign(activeCamp);
        setOrders(myOrders);
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setIsLoadingData(false);
    }
  }, [user, syncCoordinatorVault]);

  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user, loadAllData]);

  // Revalidate when window regains focus or when sub-views mutate data
  useEffect(() => {
    if (!user) return;
    const handleDataMutated = () => {
      loadAllData();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadAllData();
      }
    };
    window.addEventListener('pastoral:data-mutated', handleDataMutated);
    window.addEventListener('focus', handleDataMutated);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('pastoral:data-mutated', handleDataMutated);
      window.removeEventListener('focus', handleDataMutated);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, loadAllData]);

  // Check if hash is #portal on load
  useEffect(() => {
    if (window.location.hash === '#portal' || window.location.search.includes('portal=true')) {
      setCurrentView('portal_publico');
    }
  }, []);

  // Sync now action from Header
  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      await api.syncSheetsNow();
      await loadAllData();
    } catch (err: any) {
      alert('Erro na sincronização: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // Bulk update status handler
  const handleBulkUpdateStatus = async (
    orderIds: string[],
    productionStatus?: string,
    deliveryStatus?: string
  ) => {
    await api.bulkUpdateOrderStatus({
      order_ids: orderIds,
      production_status: productionStatus,
      delivery_status: deliveryStatus,
    });
    await loadAllData();
  };

  // Cancel order handler
  const handleCancelOrder = async (order: Order) => {
    const reason = prompt('Informe a justificativa do cancelamento:');
    if (!reason || !reason.trim()) return;

    try {
      await api.cancelOrder(order.id, reason.trim());
      await loadAllData();
    } catch (err: any) {
      alert(err.message || 'Erro ao cancelar pedido.');
    }
  };

  // Reverse payment handler
  const handleReversePayment = async (paymentId: string) => {
    const reason = prompt('Informe a justificativa do estorno:');
    if (!reason || !reason.trim()) return;

    try {
      await api.reversePayment(paymentId, reason.trim());
      await loadAllData();
      if (selectedOrderForDetails) {
        const refreshed = await api.getOrder(selectedOrderForDetails.id);
        setSelectedOrderForDetails(refreshed);
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao estornar pagamento.');
    }
  };

  // If checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-pastoral-profundo flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-pastoral-dourado border-t-transparent rounded-full animate-spin" />
          <p className="font-serif text-sm tracking-wide text-pastoral-rosa-antigo">
            Carregando Pastoral Missionária...
          </p>
        </div>
      </div>
    );
  }

  // Public Institutional Portal viewable by anyone (logged in or visitor)
  if (currentView === 'portal_publico') {
    return (
      <PublicPortalView
        onBackToLogin={() => setCurrentView('painel_missionario')}
        isAuthenticated={!!user}
      />
    );
  }

  // If not authenticated, show simplified Google Login View
  if (!user) {
    return <LoginView onOpenPublicPortal={() => setCurrentView('portal_publico')} />;
  }

  return (
    <div className="flex h-screen bg-pastoral-creme text-pastoral-grafite overflow-hidden">
      {/* 1. Desktop Sidebar */}
      <Sidebar
        currentView={currentView}
        onSelectView={setCurrentView}
        syncStatus={sheetsConfig?.status}
        pendingSyncCount={pendingSyncCount}
      />

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Navbar */}
        <Header
          currentView={currentView}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          activeCampaign={activeCampaign}
          sheetsConfig={sheetsConfig}
          onOpenNewOrder={() => setIsNewOrderModalOpen(true)}
          onSyncNow={handleSyncNow}
          isSyncing={isSyncing}
        />

        {/* Scrollable View Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8">
          {currentView === 'painel_missionario' && (
            <PainelMissionarioView
              kpis={dashboardData?.kpis || null}
              onNavigate={(view) => setCurrentView(view)}
              onOpenPublicPortal={() => setCurrentView('portal_publico')}
            />
          )}

          {currentView === 'comunidade' && <ComunidadeMissionariaView />}

          {currentView === 'diretorio_membros' && (
            <ModuleErrorBoundary moduleName="Diretório de Membros">
              <DiretorioMembrosView />
            </ModuleErrorBoundary>
          )}

          {currentView === 'calendario_2027' && (
            <ModuleErrorBoundary moduleName="Calendário">
              <Calendario2027View />
            </ModuleErrorBoundary>
          )}

          {currentView === 'missoes_envios' && <MissoesEnviosView />}

          {currentView === 'formacao_laboratorios' && (
            <ModuleErrorBoundary moduleName="Laboratórios & Formação">
              <FormacaoLaboratoriosView members={members} />
            </ModuleErrorBoundary>
          )}

          {currentView === 'minha_camiseta' && <MinhaCamisetaView orders={orders} />}

          {currentView === 'governanca' && <GovernancaSucessaoView />}

          {currentView === 'visao_geral' && (
            <VisaoGeralView
              kpis={dashboardData?.kpis || null}
              charts={dashboardData?.charts}
              recentPayments={dashboardData?.recentPayments || []}
              pendingOrders={dashboardData?.pendingOrders || []}
              sheetsConfig={sheetsConfig}
              onOpenNewOrder={() => setIsNewOrderModalOpen(true)}
              onOpenPaymentForOrder={(id) => {
                const ord = orders.find((o) => o.id === id);
                if (ord) setSelectedOrderForPayment(ord);
              }}
              onOpenWhatsAppForOrder={(id) => {
                const ord = orders.find((o) => o.id === id);
                if (ord) setSelectedOrderForWhatsApp(ord);
              }}
              onNavigateToView={(view) => setCurrentView(view)}
            />
          )}

          {(currentView === 'pedidos' || currentView === 'membros') && (
            <PedidosView
              orders={orders}
              kpis={dashboardData?.kpis || null}
              onOpenNewOrder={() => setIsNewOrderModalOpen(true)}
              onOpenOrderDetails={setSelectedOrderForDetails}
              onOpenPayment={setSelectedOrderForPayment}
              onOpenDelivery={setSelectedOrderForDelivery}
              onOpenWhatsApp={setSelectedOrderForWhatsApp}
              onBulkUpdateStatus={handleBulkUpdateStatus}
              isLoading={isLoadingData}
            />
          )}

          {currentView === 'financeiro' && (
            <FinanceiroView
              payments={payments}
              orders={orders}
              onOpenPaymentForOrder={setSelectedOrderForPayment}
              onOpenWhatsApp={setSelectedOrderForWhatsApp}
              onRefresh={loadAllData}
            />
          )}

          {currentView === 'producao' && (
            <ProducaoEntregasView
              orders={orders}
              onOpenDelivery={setSelectedOrderForDelivery}
              onRefresh={loadAllData}
            />
          )}

          {currentView === 'relatorios' && (
            <RelatoriosView activeCampaign={activeCampaign} />
          )}

          {currentView === 'planilhas' && <GooglePlanilhasView />}

          {currentView === 'comunicacao' && (
            <ComunicacaoView orders={orders} members={members} />
          )}

          {currentView === 'campanhas' && (
            <CampanhasView
              campaigns={campaigns}
              activeCampaign={activeCampaign}
              onRefresh={loadAllData}
            />
          )}

          {currentView === 'historico' && <HistoricoView />}

          {currentView === 'configuracoes' && <ConfiguracoesView />}
        </main>
      </div>

      {/* 3. Mobile Navigation Drawer & Bottom Bar */}
      <MobileNav
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        currentView={currentView}
        onSelectView={setCurrentView}
        pendingSyncCount={pendingSyncCount}
      />

      {/* 4. Global Modals */}
      <NewOrderModal
        isOpen={isNewOrderModalOpen}
        onClose={() => setIsNewOrderModalOpen(false)}
        activeCampaign={activeCampaign}
        orders={orders}
        onOrderCreated={loadAllData}
        onOpenExistingOrder={(ord) => setSelectedOrderForDetails(ord)}
        onNavigateToGovernance={() => setCurrentView('governanca')}
      />

      <RecordPaymentModal
        isOpen={selectedOrderForPayment !== null}
        onClose={() => setSelectedOrderForPayment(null)}
        order={selectedOrderForPayment}
        onPaymentRecorded={loadAllData}
      />

      <RecordDeliveryModal
        isOpen={selectedOrderForDelivery !== null}
        onClose={() => setSelectedOrderForDelivery(null)}
        order={selectedOrderForDelivery}
        onDeliveryRecorded={loadAllData}
      />

      <OrderDetailsModal
        isOpen={selectedOrderForDetails !== null}
        onClose={() => setSelectedOrderForDetails(null)}
        order={selectedOrderForDetails}
        onOpenPayment={(o) => setSelectedOrderForPayment(o)}
        onOpenDelivery={(o) => setSelectedOrderForDelivery(o)}
        onOpenWhatsApp={(o) => setSelectedOrderForWhatsApp(o)}
        onOpenEdit={(o) => setSelectedOrderForEdit(o)}
        onCancelOrder={handleCancelOrder}
        onReversePayment={handleReversePayment}
      />

      <WhatsAppModal
        isOpen={selectedOrderForWhatsApp !== null}
        onClose={() => setSelectedOrderForWhatsApp(null)}
        order={selectedOrderForWhatsApp}
      />

      <EditOrderModal
        isOpen={selectedOrderForEdit !== null}
        onClose={() => setSelectedOrderForEdit(null)}
        order={selectedOrderForEdit}
        onOrderUpdated={loadAllData}
      />

      <OnboardingModal
        isOpen={user?.role === 'pendente' && !isOnboardingDismissed}
        onClose={() => setIsOnboardingDismissed(true)}
        onComplete={() => {
          setIsOnboardingDismissed(true);
          loadAllData();
        }}
      />
    </div>
  );
};
