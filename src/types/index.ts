export type UserRole = 'admin' | 'coordenador' | 'delegado' | 'membro' | 'pendente' | 'consulta';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  picture_url?: string;
  google_id?: string;
  created_at?: string;
}

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  default_price_cents: number;
  status: 'planejamento' | 'aberta' | 'encerrada' | 'arquivada';
  is_active: number;
  orders_count?: number;
  tshirts_count?: number;
  total_amount_cents?: number;
  paid_amount_cents?: number;
  balance_cents?: number;
  created_at: string;
}

export interface Member {
  id: string;
  name: string;
  display_name: string;
  phone?: string;
  notes?: string;
  active: number;
  orders_count?: number;
  total_spent_cents?: number;
  total_pending_cents?: number;
  created_at: string;
  updated_at: string;
}

export type TShirtModel = 'Baby look' | 'Tradicional';
export type TShirtSize = 'PP' | 'P' | 'M' | 'G' | 'GG' | 'XG';

export interface OrderItem {
  id?: string;
  order_id?: string;
  product_name?: string;
  model: TShirtModel;
  size: TShirtSize;
  quantity: number;
  unit_price_cents: number;
  total_price_cents: number;
}

export type PaymentStatus = 'pendente' | 'parcial' | 'pago';
export type ProductionStatus =
  | 'aguardando_confirmacao'
  | 'confirmado'
  | 'encomendado'
  | 'em_producao'
  | 'recebido'
  | 'entregue'
  | 'cancelado';
export type DeliveryStatus = 'nao_entregue' | 'entregue';
export type PaymentMethod = 'pix' | 'dinheiro' | 'transferencia' | 'outro';

export interface Order {
  id: string;
  campaign_id: string;
  campaign_name?: string;
  member_id: string;
  member_name: string;
  member_display_name?: string;
  member_phone?: string;
  status: ProductionStatus;
  total_amount_cents: number;
  paid_amount_cents: number;
  balance_cents: number;
  payment_status: PaymentStatus;
  production_status: ProductionStatus;
  delivery_status: DeliveryStatus;
  delivery_date?: string;
  delivered_to?: string;
  delivery_notes?: string;
  notes?: string;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  order_id: string;
  member_id: string;
  member_name?: string;
  member_phone?: string;
  amount_cents: number;
  payment_date: string;
  payment_method: PaymentMethod;
  recorded_by: string;
  notes?: string;
  is_reversed: number;
  reversal_reason?: string;
  reversed_at?: string;
  reversed_by?: string;
  created_at: string;
}

export interface DashboardKPIs {
  total_members: number;
  total_orders: number;
  total_tshirts: number;
  orders_waiting_confirmation: number;
  orders_confirmed: number;
  orders_cancelled: number;
  tshirts_ordered_supplier: number;
  tshirts_delivered: number;
  tshirts_pending_delivery: number;
  total_amount_cents: number;
  paid_amount_cents: number;
  balance_cents: number;
  orders_paid: number;
  orders_partially_paid: number;
  orders_unpaid: number;
  percent_collected: number;
}

export interface GoogleSheetsConfig {
  enabled: boolean;
  mode: 'service_account' | 'webhook' | 'offline';
  spreadsheet_id: string;
  spreadsheet_name: string;
  service_account_email: string;
  has_private_key: boolean;
  webhook_url: string;
  auto_sync: boolean;
  last_synced_at: string | null;
  status: 'conectado' | 'desconectado' | 'erro' | 'pendente';
  last_error?: string;
}

export interface SyncLog {
  id: string;
  status: 'INFO' | 'ERROR';
  message: string;
  details_json?: string;
  created_at: string;
}

export interface InstitutionalSettings {
  pastoral_name: string;
  movement_name: string;
  parish_name: string;
  location: string;
  patron: string;
  quote_1: string;
  quote_2: string;
  pix_key: string;
  instagram: string;
}

