import { Order, Member, Campaign, Payment, DashboardKPIs, GoogleSheetsConfig, SyncLog, InstitutionalSettings } from '../types';

const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('pastoral_auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export interface MemberQualificationsResponse {
  success: boolean;
  memberId: string;
  qualifications: string[];
  member: {
    id: string;
    name: string;
    display_name: string;
    qualifications: string[];
    skills?: string[];
    [key: string]: any;
  };
  message: string;
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
    throw new ApiError(errorMsg, res.status);
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

  async getMyOrders() {
    const res = await fetch(`${API_BASE}/orders/my-orders`, { headers: getAuthHeader() });
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

  // --- PASTORAL ECOSYSTEM 2.0 PLATFORM API ---
  async getPublicInfo() {
    const res = await fetch(`${API_BASE}/platform/public-info`);
    return handleResponse<any>(res);
  },

  async getPlatformOverview() {
    const res = await fetch(`${API_BASE}/platform/overview`, { headers: getAuthHeader() });
    return handleResponse<any>(res);
  },

  async getCalendarEvents(params: { category?: string; month?: string; status?: string; year?: string | number; include_birthdays?: boolean | string; include_holidays?: boolean | string } = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') query.append(k, String(v));
    });
    const res = await fetch(`${API_BASE}/platform/calendar?${query.toString()}`, { headers: getAuthHeader() });
    return handleResponse<any[]>(res);
  },

  async getCalendarHolidays(year?: number) {
    const query = year ? `?year=${year}` : '';
    const res = await fetch(`${API_BASE}/platform/calendar/holidays${query}`, { headers: getAuthHeader() });
    return handleResponse<any[]>(res);
  },

  async createCalendarEvent(data: any) {
    const res = await fetch(`${API_BASE}/platform/calendar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async updateCalendarEvent(id: string, data: any) {
    const res = await fetch(`${API_BASE}/platform/calendar/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async deleteCalendarEvent(id: string, hard: boolean = false) {
    const res = await fetch(`${API_BASE}/platform/calendar/${id}${hard ? '?hard=true' : ''}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    return handleResponse<any>(res);
  },

  async reimportCalendar2027() {
    const res = await fetch(`${API_BASE}/platform/calendar/reimport-2027`, {
      method: 'POST',
      headers: getAuthHeader(),
    });
    return handleResponse<any>(res);
  },

  async getLabsData() {
    const res = await fetch(`${API_BASE}/platform/labs`, { headers: getAuthHeader() });
    return handleResponse<{ themes: any[]; labs: any[]; evaluations: any[] }>(res);
  },

  async getLabDraws() {
    const res = await fetch(`${API_BASE}/platform/labs/draws`, { headers: getAuthHeader() });
    return handleResponse<any[]>(res);
  },

  async archiveLabDraw(id: string) {
    const res = await fetch(`${API_BASE}/platform/labs/draws/${id}/archive`, {
      method: 'PATCH',
      headers: getAuthHeader(),
    });
    return handleResponse<any>(res);
  },

  async deleteLabDraw(id: string) {
    const res = await fetch(`${API_BASE}/platform/labs/draws/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    return handleResponse<any>(res);
  },

  async drawLabThemes(data: { title: string; lab_date: string; duration_minutes: number; speakers: string[]; notes?: string; draw_mode?: string; allow_repeat?: boolean }) {
    const res = await fetch(`${API_BASE}/platform/labs/draw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async createLabTheme(data: { title: string; category?: string; description?: string }) {
    const res = await fetch(`${API_BASE}/platform/labs/themes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async updateLabTheme(id: string, data: { title?: string; category?: string; description?: string; active?: boolean }) {
    const res = await fetch(`${API_BASE}/platform/labs/themes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async toggleArchiveLabTheme(id: string) {
    const res = await fetch(`${API_BASE}/platform/labs/themes/${id}/archive`, {
      method: 'PATCH',
      headers: getAuthHeader(),
    });
    return handleResponse<any>(res);
  },

  async submitLabEvaluation(data: any) {
    const res = await fetch(`${API_BASE}/platform/labs/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async getPastoralMembers(params?: { search?: string; role?: string; status?: string; qualification?: string }) {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.role) query.append('role', params.role);
    if (params?.status) query.append('status', params.status);
    if (params?.qualification) query.append('qualification', params.qualification);
    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await fetch(`${API_BASE}/platform/members${qs}`, { headers: getAuthHeader() });
    return handleResponse<any[]>(res);
  },

  async getPastoralMember(id: string) {
    const res = await fetch(`${API_BASE}/platform/members/${id}`, { headers: getAuthHeader() });
    return handleResponse<any>(res);
  },

  async createPastoralMember(data: any) {
    const res = await fetch(`${API_BASE}/platform/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async updatePastoralMember(id: string, data: any) {
    const res = await fetch(`${API_BASE}/platform/members/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async setPastoralMemberStatus(id: string, status: string) {
    const res = await fetch(`${API_BASE}/platform/members/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ status }),
    });
    return handleResponse<any>(res);
  },

  async getMemberBirthdays() {
    const res = await fetch(`${API_BASE}/platform/members/birthdays`, { headers: getAuthHeader() });
    return handleResponse<{
      current_date: { day: number; month: number; year: number };
      today: any[];
      this_month: any[];
      all_celebrants: any[];
    }>(res);
  },

  async getDispatches() {
    const res = await fetch(`${API_BASE}/platform/dispatches`, { headers: getAuthHeader() });
    return handleResponse<any[]>(res);
  },

  async createDispatch(data: any) {
    const res = await fetch(`${API_BASE}/platform/dispatches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async updateDispatchStatus(id: string, status: string, coordinator_feedback?: string) {
    const res = await fetch(`${API_BASE}/platform/dispatches/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ status, coordinator_feedback }),
    });
    return handleResponse<any>(res);
  },

  async getTemplates() {
    const res = await fetch(`${API_BASE}/platform/templates`, { headers: getAuthHeader() });
    return handleResponse<any[]>(res);
  },

  async getAnnouncements() {
    const res = await fetch(`${API_BASE}/platform/announcements`, { headers: getAuthHeader() });
    return handleResponse<any[]>(res);
  },

  async createAnnouncement(data: { title: string; content: string; category?: string; pinned?: boolean }) {
    const res = await fetch(`${API_BASE}/platform/announcements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async updateAnnouncement(id: string, data: { title?: string; content?: string; category?: string; pinned?: boolean; audience?: string }) {
    const res = await fetch(`${API_BASE}/platform/announcements/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async deleteAnnouncement(id: string) {
    const res = await fetch(`${API_BASE}/platform/announcements/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    return handleResponse<any>(res);
  },

  async getGovernanceData() {
    const res = await fetch(`${API_BASE}/platform/governance`, { headers: getAuthHeader() });
    return handleResponse<{
      pastoralMembers: any[];
      capabilities: any[];
      successionHistory: any[];
    }>(res);
  },

  async updatePastoralMemberGovernance(id: string, data: any) {
    const res = await fetch(`${API_BASE}/platform/governance/members/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async updateMemberQualifications(memberId: string, qualifications: string[]) {
    const res = await fetch(`${API_BASE}/platform/members/${memberId}/qualifications`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ qualifications }),
    });
    return handleResponse<MemberQualificationsResponse>(res);
  },

  async assignCapability(data: { pastoral_member_id: string; role_label: string; module: string; actions: string[] }) {
    const res = await fetch(`${API_BASE}/platform/governance/capabilities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async executeSuccessionAction(data: { action: 'propose' | 'confirm' | 'step_down'; coordinator_name?: string; role_title?: string; target_id?: string; notes?: string }) {
    const res = await fetch(`${API_BASE}/platform/governance/succession`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async createBackup() {
    const res = await fetch(`${API_BASE}/platform/backup`, {
      method: 'POST',
      headers: getAuthHeader(),
    });
    return handleResponse<any>(res);
  },

  // 32-36. Comunidade Missionária
  async getCommunityPosts(category?: string) {
    const url = category && category !== 'Todas'
      ? `${API_BASE}/community/posts?category=${encodeURIComponent(category)}`
      : `${API_BASE}/community/posts`;
    const res = await fetch(url, { headers: getAuthHeader() });
    return handleResponse<any[]>(res);
  },

  async createCommunityPost(data: { content: string; category?: string; image_url?: string; video_url?: string; link_url?: string }) {
    const res = await fetch(`${API_BASE}/community/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async toggleLikePost(postId: string) {
    const res = await fetch(`${API_BASE}/community/posts/${postId}/like`, {
      method: 'POST',
      headers: getAuthHeader(),
    });
    return handleResponse<{ liked: boolean; likes_count: number }>(res);
  },

  async getPostComments(postId: string) {
    const res = await fetch(`${API_BASE}/community/posts/${postId}/comments`, {
      headers: getAuthHeader(),
    });
    return handleResponse<any[]>(res);
  },

  async addPostComment(postId: string, content: string) {
    const res = await fetch(`${API_BASE}/community/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ content }),
    });
    return handleResponse<any>(res);
  },

  async deleteCommunityPost(postId: string) {
    const res = await fetch(`${API_BASE}/community/posts/${postId}`, {
      method: 'DELETE',
      headers: getAuthHeader(),
    });
    return handleResponse<any>(res);
  },

  // 37-42. Google Auth & Onboarding / Vínculo de Membros
  async loginWithGoogle(data: { credential?: string; email?: string; name?: string; picture?: string; google_id?: string }) {
    const res = await fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<{ token: string; user: any; needs_onboarding?: boolean }>(res);
  },

  async getUnclaimedMembers() {
    const res = await fetch(`${API_BASE}/auth/unclaimed-members`, {
      headers: getAuthHeader(),
    });
    return handleResponse<{ id: string; name: string; display_name: string; orders_count: number }[]>(res);
  },

  async claimMember(claimed_member_id: string, notes?: string) {
    const res = await fetch(`${API_BASE}/auth/claim-member`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ claimed_member_id, notes }),
    });
    return handleResponse<{ message: string; status: string; auto_approved: boolean }>(res);
  },

  async getPendingApprovals() {
    const res = await fetch(`${API_BASE}/auth/pending-approvals`, {
      headers: getAuthHeader(),
    });
    return handleResponse<{ pendingUsers: any[]; pendingRequests: any[] }>(res);
  },

  async approveClaim(data: { request_id?: string; user_id?: string; role?: string; claimed_member_id?: string }) {
    const res = await fetch(`${API_BASE}/auth/approve-claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async rejectClaim(data: { request_id?: string; user_id?: string; reason?: string }) {
    const res = await fetch(`${API_BASE}/auth/reject-claim`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },

  async getAuthConfig() {
    const res = await fetch(`${API_BASE}/auth/config`);
    return handleResponse<{ googleClientId: string }>(res);
  },

  async saveGoogleClientId(client_id: string) {
    const res = await fetch(`${API_BASE}/auth/google-client-id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ client_id }),
    });
    return handleResponse<{ message: string; googleClientId: string }>(res);
  },

  async uploadMedia(fileBase64: string, fileName: string, mimeType: string) {
    const res = await fetch(`${API_BASE}/community/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify({ file_base64: fileBase64, file_name: fileName, mime_type: mimeType }),
    });
    return handleResponse<{ url: string; media_type: 'image' | 'video'; file_name: string }>(res);
  },

  async getPixSettings() {
    const res = await fetch(`${API_BASE}/settings/pix`, { headers: getAuthHeader() });
    return handleResponse<{ pix_key: string; key_type: string; receiver_name: string; instructions: string }>(res);
  },

  async updatePixSettings(data: { pix_key: string; key_type?: string; receiver_name?: string; instructions?: string }) {
    const res = await fetch(`${API_BASE}/settings/pix`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      body: JSON.stringify(data),
    });
    return handleResponse<any>(res);
  },
};


