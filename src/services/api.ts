import { Order, Member, Campaign, Payment, DashboardKPIs, GoogleSheetsConfig, SyncLog, InstitutionalSettings } from '../types';

const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('pastoral_auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = `Erro na requisição (HTTP ${res.status})`;
    try {
      const data = await res.json();
      if (data.error) errorMsg = data.error;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // Auth
  async login(email: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse<{ token: string; user: any }>(res);
  },

  async getMe() {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeader(),
    });
    return handleResponse<any>(res);
  },

  async getUsers() {
    const res = await fetch(`${API_BASE}/auth/users`, {
      headers: getAuthHeader(),
    });
    return handleResponse<any[]>(res);
  },

  async createUser(data: any) {
    const res = await fetch(`${API_BASE}/auth/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async deleteUser(id: string) {
    const res = await fetch(`${API_BASE}/auth/users/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    return handleResponse<any>(res);
  },

  // Dashboard
  async getDashboard(campaignId?: string) {
    const url = campaignId ? `${API_BASE}/dashboard?campaign_id=${campaignId}` : `${API_BASE}/dashboard`;
    const res = await fetch(url, { headers: getAuthHeader() });
    return handleResponse<{
      kpis: DashboardKPIs;
      charts: {
        models: { name: string; value: number }[];
        sizes: { name: string; value: number }[];
        paymentStatus: { name: string; value: number; color: string }[];
        pipeline: { stage: string; count: number }[];
      };
      recentPayments: Payment[];
      pendingOrders: any[];
    }>(res);
  },

  // Orders
  async getOrders(params: {
    campaign_id?: string;
    payment_status?: string;
    production_status?: string;
    delivery_status?: string;
    model?: string;
    size?: string;
    search?: string;
  } = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v) query.append(k, v);
    });
    const res = await fetch(`${API_BASE}/orders?${query.toString()}`, { headers: getAuthHeader() });
    return handleResponse<Order[]>(res);
  },

  async getOrder(id: string) {
    const res = await fetch(`${API_BASE}/orders/${id}`, { headers: getAuthHeader() });
    return handleResponse<Order>(res);
  },

  async createOrder(data: {
    campaign_id: string;
    member_id: string;
    items: { model: string; size: string; quantity: number; unit_price_cents: number }[];
    notes?: string;
  }) {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async updateOrder(id: string, data: any) {
    const res = await fetch(`${API_BASE}/orders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async bulkUpdateOrderStatus(data: { order_ids: string[]; production_status?: string; delivery_status?: string }) {
    const res = await fetch(`${API_BASE}/orders/bulk-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async cancelOrder(id: string, reason: string) {
    const res = await fetch(`${API_BASE}/orders/${id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ reason }),
    });
    return handleResponse<any>(res);
  },

  // Members
  async getMembers(params: { search?: string; active?: boolean } = {}) {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.active !== undefined) query.append('active', params.active ? '1' : '0');
    const res = await fetch(`${API_BASE}/members?${query.toString()}`, { headers: getAuthHeader() });
    return handleResponse<Member[]>(res);
  },

  async getMember(id: string) {
    const res = await fetch(`${API_BASE}/members/${id}`, { headers: getAuthHeader() });
    return handleResponse<Member & { orders: Order[]; payments: Payment[] }>(res);
  },

  async createMember(data: { name: string; display_name?: string; phone?: string; notes?: string }) {
    const res = await fetch(`${API_BASE}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async updateMember(id: string, data: Partial<Member>) {
    const res = await fetch(`${API_BASE}/members/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async deactivateMember(id: string) {
    const res = await fetch(`${API_BASE}/members/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    return handleResponse<any>(res);
  },

  // Payments
  async getPayments(params: { order_id?: string; member_id?: string; method?: string } = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v) query.append(k, v);
    });
    const res = await fetch(`${API_BASE}/payments?${query.toString()}`, { headers: getAuthHeader() });
    return handleResponse<Payment[]>(res);
  },

  async recordPayment(data: {
    order_id: string;
    amount_cents: number;
    payment_date: string;
    payment_method: string;
    notes?: string;
  }) {
    const res = await fetch(`${API_BASE}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async reversePayment(id: string, reason: string) {
    const res = await fetch(`${API_BASE}/payments/${id}/reverse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ reason }),
    });
    return handleResponse<any>(res);
  },

  // Deliveries
  async recordDelivery(orderId: string, data: { delivered_to?: string; delivery_date?: string; delivery_notes?: string }) {
    const res = await fetch(`${API_BASE}/deliveries/${orderId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async getDeliveryAlerts() {
    const res = await fetch(`${API_BASE}/deliveries/alerts`, { headers: getAuthHeader() });
    return handleResponse<{
      paidNotDelivered: any[];
      receivedNotDelivered: any[];
      deliveredPendingPayment: any[];
    }>(res);
  },

  // Campaigns
  async getCampaigns() {
    const res = await fetch(`${API_BASE}/campaigns`, { headers: getAuthHeader() });
    return handleResponse<Campaign[]>(res);
  },

  async getActiveCampaign() {
    const res = await fetch(`${API_BASE}/campaigns/active`, { headers: getAuthHeader() });
    return handleResponse<Campaign | null>(res);
  },

  async createCampaign(data: Partial<Campaign>) {
    const res = await fetch(`${API_BASE}/campaigns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async activateCampaign(id: string) {
    const res = await fetch(`${API_BASE}/campaigns/${id}/activate`, {
      method: 'POST',
      headers: getAuthHeader(),
    });
    return handleResponse<any>(res);
  },

  // Google Sheets
  async getSheetsStatus() {
    const res = await fetch(`${API_BASE}/sheets/status`, { headers: getAuthHeader() });
    return handleResponse<{
      config: GoogleSheetsConfig;
      sheetUrl: string;
      pendingJobsCount: number;
      failedJobsCount: number;
      recentLogs: SyncLog[];
    }>(res);
  },

  async getSheetsPreview() {
    const res = await fetch(`${API_BASE}/sheets/preview`, { headers: getAuthHeader() });
    return handleResponse<any>(res);
  },

  async getAppsScriptCode() {
    const res = await fetch(`${API_BASE}/sheets/apps-script-code`, { headers: getAuthHeader() });
    return handleResponse<{ code: string }>(res);
  },

  async updateSheetsConfig(config: Partial<GoogleSheetsConfig>) {
    const res = await fetch(`${API_BASE}/sheets/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(config),
    });
    return handleResponse<any>(res);
  },

  async syncSheetsNow() {
    const res = await fetch(`${API_BASE}/sheets/sync-now`, {
      method: 'POST',
      headers: getAuthHeader(),
    });
    return handleResponse<any>(res);
  },

  async testSheetsConnection(data: any) {
    const res = await fetch(`${API_BASE}/sheets/test-connection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  // Reports & Supplier
  async getSupplierReport(campaignId?: string, onlyConfirmed = false) {
    const url = `${API_BASE}/reports/supplier?campaign_id=${campaignId || ''}&only_confirmed=${onlyConfirmed}`;
    const res = await fetch(url, { headers: getAuthHeader() });
    return handleResponse<{
      grouped: Record<string, { sizes: { size: string; quantity: number }[]; total: number }>;
      grandTotal: number;
      formattedText: string;
    }>(res);
  },

  // WhatsApp
  async getWhatsAppMessage(orderId: string, type: 'cobranca' | 'confirmacao' | 'entrega') {
    const res = await fetch(`${API_BASE}/whatsapp/message/${orderId}?type=${type}`, {
      headers: getAuthHeader(),
    });
    return handleResponse<{
      memberName: string;
      memberPhone?: string;
      text: string;
      waLink: string;
      hasPhone: boolean;
    }>(res);
  },

  // Settings & Institutional
  async getInstitutionalSettings() {
    const res = await fetch(`${API_BASE}/settings/institutional`, { headers: getAuthHeader() });
    return handleResponse<InstitutionalSettings>(res);
  },

  async updateInstitutionalSettings(data: InstitutionalSettings) {
    const res = await fetch(`${API_BASE}/settings/institutional`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async getAuditLogs() {
    const res = await fetch(`${API_BASE}/settings/audit`, { headers: getAuthHeader() });
    return handleResponse<any[]>(res);
  },
};

