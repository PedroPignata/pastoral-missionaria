import assert from 'assert';
import { db } from '../server/db/database.js';
import { runMigrations } from '../server/db/migrations.js';
import { partitionIntoBalancedGroups } from '../server/routes/platform.js';

export async function runMaster4PhaseTests() {
  console.log('\n======================================================');
  console.log('🧪 INICIANDO TESTES DO MASTER 4.0 — PASTORAL MISSIONÁRIA');
  console.log('======================================================\n');

  // 1. Run migrations to ensure latest schema
  runMigrations();

  // ----------------------------------------------------
  // TESTE 1: Preservação dos 19 Pedidos de Camisetas e R$ 855,00
  // ----------------------------------------------------
  const ordersSummary = db.prepare(`
    SELECT COUNT(*) as count, SUM(total_amount_cents) as total_cents
    FROM orders
    WHERE status != 'cancelado'
  `).get() as { count: number; total_cents: number };

  assert.strictEqual(ordersSummary.count, 19, 'Deve haver exatamente 19 pedidos ativos');
  assert.strictEqual(ordersSummary.total_cents, 85500, 'Total deve ser R$ 855,00 (85500 centavos)');
  console.log('✓ [TESTE 1] Preservação integral dos 19 pedidos (R$ 855,00 / 85500 centavos): PASSOU');

  // ----------------------------------------------------
  // TESTE 2: Chave Pix Oficial Preservada
  // ----------------------------------------------------
  const pixSetting = db.prepare(`
    SELECT value_json FROM integration_settings WHERE key = 'pix_payment'
  `).get() as { value_json: string } | undefined;

  assert(pixSetting, 'Configuração da chave pix deve existir');
  const pixData = JSON.parse(pixSetting.value_json);
  assert.strictEqual(pixData.pix_key, '(61)992568165', 'Chave Pix oficial deve ser (61)992568165');
  console.log('✓ [TESTE 2] Chave Pix da Pastoral (61)992568165 confirmada: PASSOU');

  // ----------------------------------------------------
  // TESTE 3: Schema do Catálogo de Temas (Correção do Erro 500)
  // ----------------------------------------------------
  const themeCols = db.prepare(`PRAGMA table_info(lab_themes)`).all() as any[];
  const colNames = themeCols.map((c) => c.name);
  assert(colNames.includes('description'), 'Tabela lab_themes DEVE possuir a coluna description');
  assert(colNames.includes('category'), 'Tabela lab_themes DEVE possuir a coluna category');

  // Test inserting theme with description and category
  const testThemeId = `theme_test_${Date.now()}`;
  db.prepare(`
    INSERT INTO lab_themes (id, theme_number, title, category, description, active)
    VALUES (?, 999, 'Tema de Teste Master 4.0', 'Espiritualidade', 'Orientação detalhada para pregador', 1)
  `).run(testThemeId);

  const insertedTheme = db.prepare('SELECT * FROM lab_themes WHERE id = ?').get(testThemeId) as any;
  assert.strictEqual(insertedTheme.title, 'Tema de Teste Master 4.0');
  assert.strictEqual(insertedTheme.description, 'Orientação detalhada para pregador');
  assert.strictEqual(insertedTheme.category, 'Espiritualidade');
  db.prepare('DELETE FROM lab_themes WHERE id = ?').run(testThemeId);
  console.log('✓ [TESTE 3] Correção do erro 500 em lab_themes (colunas category e description): PASSOU');

  // ----------------------------------------------------
  // TESTE 4: Algoritmo de Grupos Balanceados (Tabela Seção 7.2)
  // ----------------------------------------------------
  const expectedDistributions: Record<number, number[]> = {
    1: [1],
    2: [2],
    3: [3],
    4: [4],
    5: [3, 2],
    6: [3, 3],
    7: [4, 3],
    8: [4, 4],
    9: [3, 3, 3],
    10: [4, 3, 3],
    11: [4, 4, 3],
    12: [4, 4, 4],
    13: [4, 3, 3, 3],
    14: [4, 4, 3, 3],
    15: [4, 4, 4, 3],
    16: [4, 4, 4, 4],
    17: [4, 4, 3, 3, 3],
    18: [4, 4, 4, 3, 3],
    19: [4, 4, 4, 4, 3],
    20: [4, 4, 4, 4, 4],
    30: [4, 4, 4, 4, 4, 4, 3, 3],
  };

  for (const [countStr, expected] of Object.entries(expectedDistributions)) {
    const count = parseInt(countStr, 10);
    const result = partitionIntoBalancedGroups(count);
    assert.deepStrictEqual(
      result,
      expected,
      `Distribuição para ${count} pregadores falhou: obtido ${JSON.stringify(result)}, esperado ${JSON.stringify(expected)}`
    );
    // Invariant: no group exceeds 4 speakers
    for (const groupSize of result) {
      assert(groupSize <= 4, `Nenhum grupo pode exceder 4 pregadores (${groupSize} > 4)`);
    }
  }
  console.log('✓ [TESTE 4] Algoritmo de partição balanceada de pregadores (Seção 7.2 estrita): PASSOU');

  // ----------------------------------------------------
  // TESTE 5: Sorteio Histórico de 18 Participantes em 5 Grupos
  // ----------------------------------------------------
  const historicalDraw = db.prepare(`
    SELECT * FROM lab_draws WHERE id = 'draw_historico_18_part'
  `).get() as any;

  assert(historicalDraw, 'Sorteio histórico de 18 pregadores deve existir');
  const histGroups = JSON.parse(historicalDraw.groups_json || '[]');
  assert.strictEqual(histGroups.length, 5, 'Deve conter exatamente 5 grupos');
  assert.deepStrictEqual(
    histGroups.map((g: any) => (g.speakers || g.members).length),
    [4, 4, 4, 3, 3],
    'Grupos do sorteio histórico devem ser [4, 4, 4, 3, 3]'
  );
  console.log('✓ [TESTE 5] Integridade do sorteio histórico de 18 pregadores em 5 grupos: PASSOU');

  // ----------------------------------------------------
  // TESTE 6: Preservação do Membro Thiago/Tiago e Campos de Aniversário
  // ----------------------------------------------------
  const thiago = db.prepare(`
    SELECT * FROM pastoral_members WHERE id = 'pmem_mem_2a2e78c53bf9'
  `).get() as any;

  assert(thiago, 'Registro de Thiago deve existir');
  assert(
    thiago.name.toLowerCase().includes('tiago') || thiago.name.toLowerCase().includes('thiago'),
    'Nome deve ser Tiago ou Thiago'
  );
  assert(thiago.qualifications_json, 'Habilitações de Thiago devem existir');
  const thiagoQuals = JSON.parse(thiago.qualifications_json);
  assert(Array.isArray(thiagoQuals), 'Habilitações devem ser array');
  console.log(`✓ [TESTE 6] Preservação de Thiago (${thiago.id}, nome: "${thiago.name}", habilitações: ${thiagoQuals.join(', ')}): PASSOU`);

  // ----------------------------------------------------
  // TESTE 7: Contas de Coordenação e Sucessão
  // ----------------------------------------------------
  const pedroUser = db.prepare("SELECT * FROM users WHERE email = 'pedropignata2@gmail.com'").get() as any;
  const fernandaUser = db.prepare("SELECT * FROM users WHERE email = 'fernandasouto7826@gmail.com'").get() as any;

  assert(pedroUser, 'Conta de Pedro deve existir em users');
  assert.strictEqual(pedroUser.role, 'coordenador');
  assert(fernandaUser, 'Conta de Fernanda deve existir em users');
  assert.strictEqual(fernandaUser.role, 'coordenador');

  const activeSuccessions = db.prepare("SELECT * FROM coordination_succession WHERE status = 'ativo'").all() as any[];
  assert(activeSuccessions.length >= 2, 'Deve haver ao menos 2 coordenadores ativos na sucessão');
  console.log('✓ [TESTE 7] Contas de Pedro e Fernanda como Coordenadores e Sucessão institucional ativa: PASSOU');

  // ----------------------------------------------------
  // TESTE 8: Calendário com Eventos de Novembro de 2026 e 2027
  // ----------------------------------------------------
  const nov2026Events = db.prepare(`
    SELECT * FROM calendar_events WHERE strftime('%Y-%m', event_date) = '2026-11'
  `).all() as any[];

  assert.strictEqual(nov2026Events.length, 2, 'Deve haver 2 eventos em Novembro de 2026');
  const eventDates = nov2026Events.map((e) => e.event_date);
  assert(eventDates.includes('2026-11-14'), 'Deve conter evento em 14/11/2026');
  assert(eventDates.includes('2026-11-22'), 'Deve conter evento em 22/11/2026');

  const year2027Events = db.prepare(`
    SELECT COUNT(*) as c FROM calendar_events WHERE strftime('%Y', event_date) = '2027'
  `).get() as any;
  assert.strictEqual(year2027Events.c, 26, 'Deve manter os 26 eventos oficiais de 2027');
  console.log('✓ [TESTE 8] Calendário com eventos de Novembro/2026 (14/11 e 22/11) e grade oficial 2027 (26 eventos): PASSOU');

  console.log('\n======================================================');
  console.log('🎉 TODOS OS TESTES DO MASTER 4.0 PASSARAM COM SUCESSO!');
  console.log('======================================================\n');
}

runMaster4PhaseTests().catch((err) => {
  console.error('❌ Falha nos testes:', err);
  process.exit(1);
});
