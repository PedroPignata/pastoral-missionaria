import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'pastoral_missionaria.sqlite');
export const db = new Database(dbPath);

// Enable WAL mode and foreign keys for high reliability and speed
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    -- Tabela de Usuários do Sistema
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT,
      role TEXT NOT NULL CHECK(role IN ('admin', 'coordenador', 'delegado', 'membro', 'pendente', 'consulta')),
      google_id TEXT,
      picture_url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Tabela de Campanhas
    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      start_date TEXT,
      end_date TEXT,
      default_price_cents INTEGER NOT NULL DEFAULT 4500,
      status TEXT NOT NULL DEFAULT 'aberta' CHECK(status IN ('planejamento', 'aberta', 'encerrada', 'arquivada')),
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Tabela de Membros
    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      display_name TEXT NOT NULL,
      phone TEXT,
      notes TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Tabela de Pedidos
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL REFERENCES campaigns(id),
      member_id TEXT NOT NULL REFERENCES members(id),
      status TEXT NOT NULL DEFAULT 'aguardando_confirmacao' CHECK(status IN ('aguardando_confirmacao', 'confirmado', 'encomendado', 'em_producao', 'recebido', 'entregue', 'cancelado')),
      total_amount_cents INTEGER NOT NULL DEFAULT 0,
      paid_amount_cents INTEGER NOT NULL DEFAULT 0,
      balance_cents INTEGER NOT NULL DEFAULT 0,
      payment_status TEXT NOT NULL DEFAULT 'pendente' CHECK(payment_status IN ('pendente', 'parcial', 'pago')),
      production_status TEXT NOT NULL DEFAULT 'aguardando_confirmacao' CHECK(production_status IN ('aguardando_confirmacao', 'confirmado', 'encomendado', 'em_producao', 'recebido', 'entregue', 'cancelado')),
      delivery_status TEXT NOT NULL DEFAULT 'nao_entregue' CHECK(delivery_status IN ('nao_entregue', 'entregue')),
      delivery_date TEXT,
      delivered_to TEXT,
      delivery_notes TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Tabela de Itens do Pedido (Camisetas)
    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_name TEXT NOT NULL DEFAULT 'Camiseta Oficial Pastoral Missionária',
      model TEXT NOT NULL CHECK(model IN ('Baby look', 'Tradicional')),
      size TEXT NOT NULL CHECK(size IN ('PP', 'P', 'M', 'G', 'GG', 'XG')),
      quantity INTEGER NOT NULL DEFAULT 1 CHECK(quantity > 0),
      unit_price_cents INTEGER NOT NULL DEFAULT 4500,
      total_price_cents INTEGER NOT NULL DEFAULT 4500,
      created_at TEXT NOT NULL
    );

    -- Tabela de Pagamentos
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id),
      member_id TEXT NOT NULL REFERENCES members(id),
      amount_cents INTEGER NOT NULL CHECK(amount_cents > 0),
      payment_date TEXT NOT NULL,
      payment_method TEXT NOT NULL CHECK(payment_method IN ('pix', 'dinheiro', 'transferencia', 'outro')),
      recorded_by TEXT NOT NULL,
      notes TEXT,
      is_reversed INTEGER NOT NULL DEFAULT 0,
      reversal_reason TEXT,
      reversed_at TEXT,
      reversed_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Fila de Sincronização (Outbox Pattern)
    CREATE TABLE IF NOT EXISTS sync_jobs (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      action TEXT NOT NULL,
      payload_json TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
      attempts INTEGER NOT NULL DEFAULT 0,
      error_message TEXT,
      last_attempt_at TEXT,
      created_at TEXT NOT NULL,
      completed_at TEXT
    );

    -- Histórico detalhado de sincronização
    CREATE TABLE IF NOT EXISTS sync_logs (
      id TEXT PRIMARY KEY,
      job_id TEXT,
      status TEXT NOT NULL,
      message TEXT NOT NULL,
      details_json TEXT,
      created_at TEXT NOT NULL
    );

    -- Trilha de Auditoria (Audit Logs)
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      user_name TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      details_json TEXT,
      created_at TEXT NOT NULL
    );

    -- Configurações e Integrações
    CREATE TABLE IF NOT EXISTS integration_settings (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    -- Índices para buscas ultrarrápidas
    CREATE INDEX IF NOT EXISTS idx_orders_campaign ON orders(campaign_id);
    CREATE INDEX IF NOT EXISTS idx_orders_member ON orders(member_id);
    CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
    CREATE INDEX IF NOT EXISTS idx_orders_production_status ON orders(production_status);
    CREATE INDEX IF NOT EXISTS idx_orders_delivery_status ON orders(delivery_status);
    CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
    CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_sync_jobs_status ON sync_jobs(status);
  `);
}

