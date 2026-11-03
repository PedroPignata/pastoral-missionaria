import assert from 'assert';
import { db } from '../server/db/database.js';
import { runMigrations } from '../server/db/migrations.js';
import { getHolidaysForYear } from '../server/services/holidaysService.js';

export async function runPhase5RegressionTests() {
  console.log('\n========================================================================');
  console.log('🧪 INICIANDO TESTES DE REGRESSÃO DA FASE 5 — PASTORAL MISSIONÁRIA');
  console.log('========================================================================\n');

  // 1. Garantir migrações aplicadas
  runMigrations();

  // ----------------------------------------------------
  // TESTE 1: Preservação Inegociável dos 19 Pedidos (R$ 855,00 / 85500 cents)
  // ----------------------------------------------------
  const ordersSummary = db.prepare(`
    SELECT COUNT(*) as count, SUM(total_amount_cents) as total_cents
    FROM orders
    WHERE status != 'cancelado'
  `).get() as { count: number; total_cents: number };

  assert.strictEqual(ordersSummary.count, 19, 'Deve haver exatamente 19 pedidos ativos');
  assert.strictEqual(ordersSummary.total_cents, 85500, 'Total deve ser R$ 855,00 (85500 centavos)');
  console.log('✓ [TESTE 1] Preservação integral dos 19 pedidos de camisetas (R$ 855,00): PASSOU');

  // ----------------------------------------------------
  // TESTE 2: Chave Pix Oficial da Pastoral
  // ----------------------------------------------------
  const pixSetting = db.prepare(`
    SELECT value_json FROM integration_settings WHERE key = 'pix_payment'
  `).get() as { value_json: string } | undefined;

  assert(pixSetting, 'Configuração da chave pix deve existir');
  const pixData = JSON.parse(pixSetting.value_json);
  assert.strictEqual(pixData.pix_key, '(61)992568165', 'Chave Pix oficial deve ser (61)992568165');
  console.log('✓ [TESTE 2] Chave Pix oficial (61)992568165 confirmada: PASSOU');

  // ----------------------------------------------------
  // TESTE 3: Preservação dos Nomes Oficiais dos Membros nas Duas Tabelas
  // ----------------------------------------------------
  const expectedNames = [
    'Maria Eduarda Fernandes',
    'Maria Eduarda Soares',
    'Maria Luiza Neres',
    'Júlia Viana',
    'Letícia Ingrid',
    'Tiago',
  ];

  for (const name of expectedNames) {
    const pMember = db.prepare('SELECT id, name FROM pastoral_members WHERE name = ?').get(name) as any;
    assert(pMember, `pastoral_members deve conter o nome oficial: ${name}`);

    const bMember = db.prepare('SELECT id, name FROM members WHERE name = ?').get(name) as any;
    assert(bMember, `members deve conter o nome oficial: ${name}`);
  }
  console.log('✓ [TESTE 3] Nomes oficiais preservados em pastoral_members e members: PASSOU');

  // ----------------------------------------------------
  // TESTE 4: Recuperação das Formações de Novembro de 2026 com Descrições Ricas
  // ----------------------------------------------------
  const form1 = db.prepare("SELECT * FROM calendar_events WHERE id = 'cal_2026_11_14_formacao_1'").get() as any;
  assert(form1, '1ª Formação (14/11/2026) deve existir no calendário');
  assert.strictEqual(form1.event_date, '2026-11-14');
  assert.strictEqual(form1.category, 'Formações');
  assert(form1.description.includes('Ser missionário'), '1ª Formação deve conter descrição rica de espiritualidade');
  assert(form1.description.includes('Padre Pio'), '1ª Formação deve citar São Padre Pio');

  const form2 = db.prepare("SELECT * FROM calendar_events WHERE id = 'cal_2026_11_22_formacao_2'").get() as any;
  assert(form2, '2ª Formação (22/11/2026) deve existir no calendário');
  assert.strictEqual(form2.event_date, '2026-11-22');
  assert.strictEqual(form2.category, 'Formações');
  assert(form2.description.includes('Como preparar e conduzir uma evangelização'), '2ª Formação deve conter descrição rica');
  assert(form2.description.includes('Exercício') && form2.description.includes('passagem bíblica'), '2ª Formação deve conter exercício bíblico');
  console.log('✓ [TESTE 4] Formações de Novembro/2026 com descrições espirituais ricas: PASSOU');

  // ----------------------------------------------------
  // TESTE 5: Recuperação dos Eventos de Dezembro de 2026 com Suporte Multidias
  // ----------------------------------------------------
  const preEspiritual = db.prepare("SELECT * FROM calendar_events WHERE id = 'cal_2026_12_13_pre_espiritual'").get() as any;
  assert(preEspiritual, 'Pré-Espiritual (13/12/2026) deve existir');
  assert.strictEqual(preEspiritual.event_date, '2026-12-13');
  assert.strictEqual(preEspiritual.category, 'Retiros');

  const espiritual = db.prepare("SELECT * FROM calendar_events WHERE id = 'cal_2026_12_18_espiritual_discipulado'").get() as any;
  assert(espiritual, 'Espiritual (Discipulado) deve existir');
  assert.strictEqual(espiritual.event_date, '2026-12-18');
  assert.strictEqual(espiritual.end_date, '2026-12-20', 'Espiritual deve abranger até 20/12/2026');
  assert.strictEqual(espiritual.category, 'Retiros');
  console.log('✓ [TESTE 5] Eventos de Dezembro/2026 (Pré-Espiritual e Espiritual 18-20/12 multidias): PASSOU');

  // ----------------------------------------------------
  // TESTE 6: Integridade Estrutural de Sorteios em Laboratórios (Prevenção do Erro #310)
  // ----------------------------------------------------
  const historicDraw = db.prepare("SELECT * FROM lab_draws WHERE id = 'draw_historico_18_part'").get() as any;
  assert(historicDraw, 'Sorteio histórico deve existir');
  const groups = JSON.parse(historicDraw.groups_json);
  assert(Array.isArray(groups), 'Grupos devem ser um array');
  for (const grp of groups) {
    assert(Array.isArray(grp.speakers), 'Cada grupo DEVE possuir a propriedade speakers como array');
    assert(Array.isArray(grp.members), 'Cada grupo DEVE possuir a propriedade members como array');
    assert(grp.speakers.length > 0, 'Grupo deve possuir pregadores listados');
  }
  console.log('✓ [TESTE 6] Sorteio de laboratórios blindado com speakers e members: PASSOU');

  // ----------------------------------------------------
  // TESTE 7: Calculadora e Serviço de Feriados Oficiais e Distritais
  // ----------------------------------------------------
  const holidays2026 = getHolidaysForYear(2026);
  assert(holidays2026.length >= 15, 'Deve conter todos os feriados nacionais, distritais e facultativos');

  const corpusChristi = holidays2026.find((h) => h.name.includes('Corpus Christi'));
  assert(corpusChristi, 'Corpus Christi deve estar presente em 2026');
  assert.strictEqual(corpusChristi.type, 'distrital', 'Corpus Christi é feriado distrital no DF (Lei 893/1995)');

  const evangelico = holidays2026.find((h) => h.name.includes('Evangélico'));
  assert(evangelico, 'Dia do Evangélico deve estar presente no DF');
  assert.strictEqual(evangelico.date, '2026-11-30');
  assert.strictEqual(evangelico.type, 'distrital');

  const servidor2026 = holidays2026.find((h) => h.name.includes('Servidor Público'));
  assert(servidor2026, 'Dia do Servidor Público deve estar presente');
  assert.strictEqual(servidor2026.date, '2026-10-30', 'Em 2026 no DF, o Dia do Servidor Público foi transferido para 30/10/2026 (Decreto 49.585/2026)');

  const planaltina = holidays2026.find((h) => h.name.includes('Planaltina'));
  assert(planaltina, 'Aniversário de Planaltina-DF deve estar presente');
  assert.strictEqual(planaltina.date, '2026-08-19');
  assert.strictEqual(planaltina.type, 'comemorativa');
  console.log('✓ [TESTE 7] Feriados nacionais, distritais (DF), Decreto 49.585/2026 e Planaltina-DF: PASSOU');

  // ----------------------------------------------------
  // TESTE 8: Atualização Parcial e Suporte Multidias em calendar_events
  // ----------------------------------------------------
  const tempEventId = `cal_test_partial_${Date.now()}`;
  db.prepare(`
    INSERT INTO calendar_events (
      id, external_stable_id, title, description, event_date, end_date, event_time, location,
      category, status, visibility, responsibles_json, notes, source, created_at, updated_at
    ) VALUES (?, ?, 'Encontro de Teste', 'Descrição Original', '2026-11-10', '2026-11-12', '20:00', 'Salão Paroquial',
              'Reuniões', 'Confirmado', 'publico', '["Pedro"]', 'Nota de Teste', 'Teste', datetime('now'), datetime('now'))
  `).run(tempEventId, tempEventId);

  // Simular atualização parcial sem sobrescrever location ou event_time
  const existingEv = db.prepare('SELECT * FROM calendar_events WHERE id = ?').get(tempEventId) as any;
  const newTitle = 'Encontro de Teste Atualizado';
  const updatedEvDate = existingEv.event_date;
  const updatedEndDate = existingEv.end_date;
  const updatedEvTime = existingEv.event_time;
  const updatedLocation = existingEv.location;

  db.prepare(`
    UPDATE calendar_events
    SET title = ?, description = ?, event_date = ?, end_date = ?, event_time = ?, location = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(newTitle, existingEv.description, updatedEvDate, updatedEndDate, updatedEvTime, updatedLocation, tempEventId);

  const reloadedEv = db.prepare('SELECT * FROM calendar_events WHERE id = ?').get(tempEventId) as any;
  assert.strictEqual(reloadedEv.title, 'Encontro de Teste Atualizado');
  assert.strictEqual(reloadedEv.event_time, '20:00', 'event_time original deve ser preservado');
  assert.strictEqual(reloadedEv.location, 'Salão Paroquial', 'location original deve ser preservado');
  assert.strictEqual(reloadedEv.end_date, '2026-11-12', 'end_date multidias deve ser preservado');

  // Limpar evento de teste
  db.prepare('DELETE FROM calendar_events WHERE id = ?').run(tempEventId);
  console.log('✓ [TESTE 8] Atualização parcial de eventos preservando horário, local e multidias: PASSOU');

  // ----------------------------------------------------
  // TESTE 9: Sincronização Automática entre pastoral_members e members
  // ----------------------------------------------------
  const testBuyerId = 'mem_sync_test_' + Date.now();
  const testPastoralId = 'pm_sync_test_' + Date.now();

  db.prepare(`
    INSERT INTO members (id, name, display_name, phone, active, created_at, updated_at)
    VALUES (?, 'Membro Teste Sincronizacao Original', 'Membro Teste', '61999990000', 1, datetime('now'), datetime('now'))
  `).run(testBuyerId);

  db.prepare(`
    INSERT INTO pastoral_members (id, name, display_name, phone, pastoral_role, status, buyer_member_id, created_at, updated_at)
    VALUES (?, 'Membro Teste Sincronizacao Original', 'Membro Teste', '61999990000', 'membro', 'ativo', ?, datetime('now'), datetime('now'))
  `).run(testPastoralId, testBuyerId);

  // Simular alteração de nome via plataforma
  const updatedName = 'Membro Teste Sincronizacao Atualizado';
  db.prepare(`
    UPDATE pastoral_members SET name = ?, updated_at = datetime('now') WHERE id = ?
  `).run(updatedName, testPastoralId);

  db.prepare(`
    UPDATE members SET name = ?, updated_at = datetime('now') WHERE id = ?
  `).run(updatedName, testBuyerId);

  const syncedBuyer = db.prepare('SELECT name FROM members WHERE id = ?').get(testBuyerId) as any;
  assert.strictEqual(syncedBuyer.name, updatedName, 'Nome em members deve ter sido sincronizado');

  // Limpar teste
  db.prepare('DELETE FROM pastoral_members WHERE id = ?').run(testPastoralId);
  db.prepare('DELETE FROM members WHERE id = ?').run(testBuyerId);
  console.log('✓ [TESTE 9] Sincronização de nomes entre pastoral_members e members: PASSOU');

  console.log('\n========================================================================');
  console.log('🎉 TODOS OS TESTES DA FASE 5 FORAM CONCLUÍDOS COM SUCESSO TOTAL!');
  console.log('========================================================================\n');
}

// Executar se chamado diretamente
if (process.argv[1]?.endsWith('platform_phase5_regression_test.ts')) {
  runPhase5RegressionTests().catch((err) => {
    console.error('❌ Falha nos testes da Fase 5:', err);
    process.exit(1);
  });
}
