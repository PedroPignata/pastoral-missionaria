import { db, initDatabase } from './database.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

interface InitialOrderItem {
  memberId: string;
  orderId: string;
  itemId: string;
  name: string;
  displayName: string;
  phone: string;
  model: 'Baby look' | 'Tradicional';
  size: 'PP' | 'P' | 'M' | 'G' | 'GG' | 'XG';
}

const INITIAL_MEMBERS_ORDERS: InitialOrderItem[] = [
  { memberId: 'mem_22130dccbf2c', orderId: 'ord_6eeb7cf00170', itemId: 'itm_ff004f486fef', name: 'Maria Eduarda Fernandes', displayName: 'Duda Fernandes', phone: '(61) 99554-3396', model: 'Baby look', size: 'G' },
  { memberId: 'mem_03d218edc79f', orderId: 'ord_1efa0ec4d2d3', itemId: 'itm_473256041c44', name: 'Lyvia Maria', displayName: 'Lyvia', phone: '(61) 99974-4803', model: 'Baby look', size: 'M' },
  { memberId: 'mem_168e4d89c0d7', orderId: 'ord_b8ed287ddd36', itemId: 'itm_265c91c96e68', name: 'Állan Fross', displayName: 'Állan', phone: '(61) 98188-8901', model: 'Tradicional', size: 'G' },
  { memberId: 'mem_5b8f3d626749', orderId: 'ord_215af699304e', itemId: 'itm_71255950e197', name: 'Jamilly', displayName: 'Jamilly', phone: '(61) 99623-6153', model: 'Baby look', size: 'M' },
  { memberId: 'mem_aff2b7da59f2', orderId: 'ord_15234064b8d2', itemId: 'itm_ad208d2f5dcd', name: 'Vinícius', displayName: 'Vini', phone: '(61) 98427-3060', model: 'Tradicional', size: 'G' },
  { memberId: 'mem_255524b003e3', orderId: 'ord_2a52e71a7bee', itemId: 'itm_767430ff3e81', name: 'Laysa', displayName: 'Laysa', phone: '(61) 99292-9981', model: 'Baby look', size: 'M' },
  { memberId: 'mem_37c8ca212b5b', orderId: 'ord_60c347bdce55', itemId: 'itm_845a4c8c47fd', name: 'Victor', displayName: 'Victor', phone: '(61) 99223-6379', model: 'Tradicional', size: 'GG' },
  { memberId: 'mem_aeedddfde4d8', orderId: 'ord_a5c521d57e6e', itemId: 'itm_0d9726f0416b', name: 'Maria Luiza Neres', displayName: 'Malu Neres', phone: '(61) 99931-1322', model: 'Baby look', size: 'M' },
  { memberId: 'mem_cd7f61cc211e', orderId: 'ord_9aea2e3ec4b5', itemId: 'itm_a2450375d163', name: 'Júlia Viana', displayName: 'Júlia', phone: '(61) 99931-6382', model: 'Baby look', size: 'G' },
  { memberId: 'mem_e8ca36ae2233', orderId: 'ord_b3cef19a189d', itemId: 'itm_7a4988071f7d', name: 'Letícia Ingrid', displayName: 'Letícia', phone: '(61) 99254-2925', model: 'Baby look', size: 'M' },
  { memberId: 'mem_c5ded13f55d7', orderId: 'ord_2ed9e808ad7b', itemId: 'itm_b87862dc8f4d', name: 'Saulo', displayName: 'Saulo', phone: '(61) 99657-8844', model: 'Tradicional', size: 'G' },
  { memberId: 'mem_e026bf750415', orderId: 'ord_f69cfe789f6b', itemId: 'itm_dd0c37600ccb', name: 'Manuella', displayName: 'Manuella', phone: '(61) 99197-2286', model: 'Baby look', size: 'M' },
  { memberId: 'mem_83ce887a76ef', orderId: 'ord_c2cf281eac89', itemId: 'itm_6b03205d011b', name: 'Maria Júlia', displayName: 'Maria Júlia', phone: '(61) 99417-0991', model: 'Baby look', size: 'M' },
  { memberId: 'mem_0a4d580ce11f', orderId: 'ord_7d3a718f849c', itemId: 'itm_241dd1c75d30', name: 'Mariane', displayName: 'Mariane', phone: '(61) 98483-4684', model: 'Baby look', size: 'M' },
  { memberId: 'mem_d1b16e0ebcde', orderId: 'ord_7c5161308f11', itemId: 'itm_0182bd7540e5', name: 'Maria Luiza Lima', displayName: 'Maria Luiza', phone: '(61) 98208-9083', model: 'Baby look', size: 'M' },
  { memberId: 'mem_718a8fc7413a', orderId: 'ord_0191867145fd', itemId: 'itm_7af851fa2220', name: 'Erick Kilbert', displayName: 'Erick', phone: '(61) 99523-5887', model: 'Tradicional', size: 'G' },
  { memberId: 'mem_3a5d8b2854f7', orderId: 'ord_e535981ee443', itemId: 'itm_513bd34a4eee', name: 'Alfredo', displayName: 'Alfredo', phone: '(61) 99847-4821', model: 'Tradicional', size: 'GG' },
  { memberId: 'mem_2a2e78c53bf9', orderId: 'ord_0c53215d8054', itemId: 'itm_75682979f52a', name: 'Tiago', displayName: 'Tiago', phone: '(61) 99852-6665', model: 'Tradicional', size: 'G' },
  { memberId: 'mem_723733f98bb6', orderId: 'ord_67ad498bf87c', itemId: 'itm_fd79459b6750', name: 'Maria Eduarda Soares', displayName: 'Duda Soares', phone: '(61) 98302-6142', model: 'Baby look', size: 'M' },
];

export function seedDatabase() {
  initDatabase();

  const now = new Date().toISOString();

  // 1. Seed Users (idempotent with deterministic IDs so sessions never break across restarts)
  const existingAdmin = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@pastoralmissionaria.com.br');
  if (!existingAdmin) {
    const adminHash = bcrypt.hashSync('pastoral@2026', 10);
    const coordHash = bcrypt.hashSync('coordenacao@2026', 10);
    const consultHash = bcrypt.hashSync('consulta@2026', 10);

    const insertUser = db.prepare(`
      INSERT OR IGNORE INTO users (id, name, email, password_hash, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertUser.run(
      'usr_admin_oficial',
      'Coordenação Missionária (Admin)',
      'admin@pastoralmissionaria.com.br',
      adminHash,
      'admin',
      now,
      now
    );

    insertUser.run(
      'usr_coord_oficial',
      'Equipe de Coordenação',
      'coordenacao@pastoralmissionaria.com.br',
      coordHash,
      'coordenador',
      now,
      now
    );

    insertUser.run(
      'usr_consulta_oficial',
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
      pix_key: '(61)992568165',
      instagram: '@pastoralmissionaria_',
    }),
    now
  );

  insertSetting.run(
    'pix_payment',
    JSON.stringify({
      pix_key: '(61)992568165',
      key_type: 'telefone',
      receiver_name: 'Pastoral Missionária — Paróquia São Vicente de Paulo',
      instructions: 'Após realizar o Pix, envie o comprovante para a coordenação (Pedro ou Fernanda) registrar a baixa do seu pedido.',
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

  // 4. Seed 19 Members and Orders (idempotent: strictly guards existing orders)
  const existingOrdersCount = (db.prepare("SELECT COUNT(*) as c FROM orders WHERE campaign_id = ? AND status != 'cancelado'").get(campaign.id) as any).c;
  if (existingOrdersCount >= 19) {
    console.log('✓ Banco de dados já possui todos os 19 registros iniciais. Nenhuma duplicação realizada.');
    return;
  }

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
        memberId = item.memberId;
        insertMember.run(
          memberId,
          item.name,
          item.displayName || item.name.split(' ')[0],
          item.phone || '',
          'Cadastro inicial da pastoral 2026',
          now,
          now
        );
        addedMembersCount++;
      }

      // Check if order already exists in this campaign
      const existingOrder = findOrder.get(campaign.id, memberId);
      if (!existingOrder) {
        const orderId = item.orderId;
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
          'em_producao', // Etapa real da confecção confirmada pela coordenação
          'nao_entregue', // Status entrega
          'Importado do cadastro inicial oficial',
          now,
          now
        );

        const orderItemId = item.itemId;
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

