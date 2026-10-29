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

import { api } from './services/api';
import { Order, Member, Campaign, Payment, DashboardKPIs, GoogleSheetsConfig } from './types';

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

  // Load system data based on user authorization
  const loadAllData = useCallback(async () => {
    if (!user) return;
    setIsLoadingData(true);
    const isCoord = user.role === 'admin' || user.role === 'coordenador';

    try {
      if (isCoord) {
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
      } else {
        // Members only load active campaigns and basic context
        const [campaignsData, activeCamp] = await Promise.all([
          api.getCampaigns(),
          api.getActiveCampaign(),
        ]);
        setCampaigns(campaignsData);
        setActiveCampaign(activeCamp);
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setIsLoadingData(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user, loadAllData]);

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

  // If not authenticated, show Login View
  if (!user) {
    return <LoginView />;
  }

  if (currentView === 'portal_publico') {
    return (
      <PublicPortalView
        onBackToLogin={() => setCurrentView('painel_missionario')}
        isAuthenticated={true}
      />
    );
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

          {currentView === 'calendario_2027' && <Calendario2027View />}

          {currentView === 'missoes_envios' && <MissoesEnviosView />}

          {currentView === 'formacao_laboratorios' && (
            <FormacaoLaboratoriosView members={members} />
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

          {currentView === 'pedidos' && (
            <PedidosView
              orders={orders}
              onOpenNewOrder={() => setIsNewOrderModalOpen(true)}
              onOpenOrderDetails={setSelectedOrderForDetails}
              onOpenPayment={setSelectedOrderForPayment}
              onOpenDelivery={setSelectedOrderForDelivery}
              onOpenWhatsApp={setSelectedOrderForWhatsApp}
              onBulkUpdateStatus={handleBulkUpdateStatus}
              isLoading={isLoadingData}
            />
          )}

          {currentView === 'membros' && (
            <MembrosView
              members={members}
              onRefresh={loadAllData}
              onOpenOrderDetails={setSelectedOrderForDetails}
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
        onOrderCreated={loadAllData}
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
    </div>
  );
};
