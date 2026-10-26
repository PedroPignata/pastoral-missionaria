import { db, initDatabase } from './database.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

interface InitialOrderItem {
  name: string;
  model: 'Baby look' | 'Tradicional';
  size: 'PP' | 'P' | 'M' | 'G' | 'GG' | 'XG';
}

const INITIAL_MEMBERS_ORDERS: InitialOrderItem[] = [
  { name: 'Duda Fernandes', model: 'Baby look', size: 'G' },
  { name: 'Lyvia', model: 'Baby look', size: 'M' },
  { name: 'Állan', model: 'Tradicional', size: 'G' },
  { name: 'Jamilly', model: 'Baby look', size: 'M' },
  { name: 'Vini', model: 'Tradicional', size: 'G' },
  { name: 'Laysa', model: 'Baby look', size: 'M' },
  { name: 'Victor', model: 'Tradicional', size: 'GG' },
  { name: 'Malu Neres', model: 'Baby look', size: 'M' },
  { name: 'Júlia', model: 'Baby look', size: 'G' },
  { name: 'Leticia', model: 'Baby look', size: 'M' },
  { name: 'Saulo', model: 'Tradicional', size: 'G' },
  { name: 'Manuella', model: 'Baby look', size: 'M' },
  { name: 'Maria Júlia', model: 'Baby look', size: 'M' },
  { name: 'Mariane', model: 'Baby look', size: 'M' },
  { name: 'Maria Luiza Lima', model: 'Baby look', size: 'M' },
  { name: 'Erick Kilbert', model: 'Tradicional', size: 'G' },
  { name: 'Alfredo', model: 'Tradicional', size: 'GG' },
  { name: 'Tiago', model: 'Tradicional', size: 'G' },
  { name: 'Duda Soares', model: 'Baby look', size: 'M' },
];

export function seedDatabase() {
  initDatabase();

  const now = new Date().toISOString();

  // 1. Seed Users (idempotent)
  const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@pastoralmissionaria.com.br');
  if (!existingAdmin) {
    const adminHash = bcrypt.hashSync('pastoral@2026', 10);
    const coordHash = bcrypt.hashSync('coordenacao@2026', 10);
    const consultHash = bcrypt.hashSync('consulta@2026', 10);

    const insertUser = db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertUser.run(
      crypto.randomUUID(),
      'Coordenação Missionária (Admin)',
      'admin@pastoralmissionaria.com.br',
      adminHash,
      'admin',
      now,
      now
    );

    insertUser.run(
      crypto.randomUUID(),
      'Equipe de Coordenação',
      'coordenacao@pastoralmissionaria.com.br',
      coordHash,
      'coordenador',
      now,
      now
    );

    insertUser.run(
      crypto.randomUUID(),
      'Membro Observador (Consulta)',
      'consulta@pastoralmissionaria.com.br',
      consultHash,
      'consulta',
      now,
      now
    );
    console.log('✓ Usuários padrão criados (Admin, Coordenador, Consulta).');
  }

  // 2. Seed Default Institutional Settings
  const insertSetting = db.prepare(`
    INSERT OR IGNORE INTO integration_settings (key, value_json, updated_at)
    VALUES (?, ?, ?)
  `);

  insertSetting.run(
    'institutional',
    JSON.stringify({
      pastoral_name: 'Pastoral Missionária',
      movement_name: 'Ágape Apostolado de Jovens',
      parish_name: 'Paróquia São Vicente de Paulo',
      location: 'Planaltina - DF',
      patron: 'São Padre Pio de Pietrelcina',
      quote_1: 'Uma só coisa é necessária: Estar perto de Jesus.',
      quote_2: 'Tenha Jesus Cristo em seu coração, e todas as cruzes do mundo parecerão rosas.',
      pix_key: 'pastoralmissionaria@agape.org.br',
      instagram: '@pastoralmissionaria_',
    }),
    now
  );

  insertSetting.run(
    'google_sheets',
    JSON.stringify({
      enabled: false,
      mode: 'webhook', // 'service_account' | 'webhook' | 'offline'
      spreadsheet_id: '',
      spreadsheet_name: 'Camisetas Pastoral Missionária 2026',
      service_account_email: '',
      service_account_private_key: '',
      webhook_url: '',
      auto_sync: true,
      last_synced_at: null,
      status: 'desconectado',
    }),
    now
  );

  // 3. Seed Initial Campaign
  const campaignName = 'Camisetas Pastoral Missionária — 2026';
  let campaign = db.prepare('SELECT * FROM campaigns WHERE name = ?').get(campaignName) as any;

  if (!campaign) {
    const campaignId = 'camp-2026-oficial';
    db.prepare(`
      INSERT INTO campaigns (id, name, description, start_date, end_date, default_price_cents, status, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).run(
      campaignId,
      campaignName,
      'Campanha oficial das camisetas marrom-escura com detalhes dourados e imagem de São Padre Pio nas costas.',
      '2026-01-01',
      '2026-12-31',
      4500, // R$ 45,00
      'aberta',
      now,
      now
    );
    campaign = { id: campaignId, name: campaignName, default_price_cents: 4500 };
    console.log('✓ Campanha inicial criada:', campaignName);
  }

  // 4. Seed 19 Members and Orders (idempotent: based on member name + campaign)
  const findMember = db.prepare('SELECT id FROM members WHERE name = ?');
  const insertMember = db.prepare(`
    INSERT INTO members (id, name, display_name, phone, notes, active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, ?, ?)
  `);

  const findOrder = db.prepare('SELECT id FROM orders WHERE campaign_id = ? AND member_id = ?');
  const insertOrder = db.prepare(`
    INSERT INTO orders (
      id, campaign_id, member_id, status, total_amount_cents, paid_amount_cents,
      balance_cents, payment_status, production_status, delivery_status, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertOrderItem = db.prepare(`
    INSERT INTO order_items (id, order_id, product_name, model, size, quantity, unit_price_cents, total_price_cents, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let addedMembersCount = 0;
  let addedOrdersCount = 0;

  const transaction = db.transaction(() => {
    for (const item of INITIAL_MEMBERS_ORDERS) {
      let memberRow = findMember.get(item.name) as any;
      let memberId = memberRow?.id;

      if (!memberId) {
        memberId = 'mem_' + crypto.randomBytes(6).toString('hex');
        insertMember.run(
          memberId,
          item.name,
          item.name.split(' ')[0], // Display name is first name
          '', // Phone initially empty as instructed
          'Cadastro inicial da pastoral 2026',
          now,
          now
        );
        addedMembersCount++;
      }

      // Check if order already exists in this campaign
      const existingOrder = findOrder.get(campaign.id, memberId);
      if (!existingOrder) {
        const orderId = 'ord_' + crypto.randomBytes(6).toString('hex');
        const unitPrice = 4500; // R$ 45,00
        const quantity = 1;
        const totalAmount = unitPrice * quantity;

        insertOrder.run(
          orderId,
          campaign.id,
          memberId,
          'aguardando_confirmacao', // Status inicial
          totalAmount,
          0, // R$ 0,00 pago
          totalAmount, // R$ 45,00 pendente
          'pendente', // Status financeiro
          'aguardando_confirmacao',
          'nao_entregue', // Status entrega
          'Importado do cadastro inicial oficial',
          now,
          now
        );

        const orderItemId = 'itm_' + crypto.randomBytes(6).toString('hex');
        insertOrderItem.run(
          orderItemId,
          orderId,
          'Camiseta Oficial Pastoral Missionária',
          item.model,
          item.size,
          quantity,
          unitPrice,
          totalAmount,
          now
        );

        addedOrdersCount++;
      }
    }
  });

  transaction();

  if (addedMembersCount > 0 || addedOrdersCount > 0) {
    console.log(`✓ Seed concluído: ${addedMembersCount} novos membros, ${addedOrdersCount} novos pedidos inseridos.`);
  } else {
    console.log('✓ Banco de dados já possui todos os 19 registros iniciais. Nenhuma duplicação realizada.');
  }

  // 5. Verification of totals
  const stats = db.prepare(`
    SELECT
      COUNT(DISTINCT o.id) as total_orders,
      COUNT(DISTINCT o.member_id) as total_members,
      SUM(oi.quantity) as total_tshirts,
      SUM(CASE WHEN oi.model = 'Baby look' THEN oi.quantity ELSE 0 END) as baby_looks,
      SUM(CASE WHEN oi.model = 'Tradicional' THEN oi.quantity ELSE 0 END) as tradicionais,
      SUM(CASE WHEN oi.model = 'Baby look' AND oi.size = 'M' THEN oi.quantity ELSE 0 END) as baby_look_m,
      SUM(CASE WHEN oi.model = 'Baby look' AND oi.size = 'G' THEN oi.quantity ELSE 0 END) as baby_look_g,
      SUM(CASE WHEN oi.model = 'Tradicional' AND oi.size = 'G' THEN oi.quantity ELSE 0 END) as tradicional_g,
      SUM(CASE WHEN oi.model = 'Tradicional' AND oi.size = 'GG' THEN oi.quantity ELSE 0 END) as tradicional_gg,
      SUM(o.total_amount_cents) as total_amount_cents,
      SUM(o.paid_amount_cents) as paid_amount_cents,
      SUM(o.balance_cents) as balance_cents
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    WHERE o.campaign_id = ? AND o.status != 'cancelado'
  `).get(campaign.id) as any;

  console.log('--- RESUMO DOS TOTAIS NO BANCO (Campanha 2026) ---');
  console.log(`Membros: ${stats.total_members} (Esperado: 19)`);
  console.log(`Pedidos: ${stats.total_orders} (Esperado: 19)`);
  console.log(`Camisetas: ${stats.total_tshirts} (Esperado: 19)`);
  console.log(`Baby look: ${stats.baby_looks} (Esperado: 12) [M: ${stats.baby_look_m}, G: ${stats.baby_look_g}]`);
  console.log(`Tradicional: ${stats.tradicionais} (Esperado: 7) [G: ${stats.tradicional_g}, GG: ${stats.tradicional_gg}]`);
  console.log(`Valor Total: R$ ${(stats.total_amount_cents / 100).toFixed(2)} (Esperado: R$ 855.00)`);
  console.log(`Valor Pago: R$ ${(stats.paid_amount_cents / 100).toFixed(2)} (Esperado: R$ 0.00)`);
  console.log(`Valor Pendente: R$ ${(stats.balance_cents / 100).toFixed(2)} (Esperado: R$ 855.00)`);
  console.log('--------------------------------------------------');
}

// Execute directly if run via CLI
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seedDatabase();
}

