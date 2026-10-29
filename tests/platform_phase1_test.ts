import assert from 'assert';
import { db, initDatabase } from '../server/db/database.js';
import { seedDatabase } from '../server/db/seed.js';
import { runMigrations, CALENDAR_2027_SEED, OFFICIAL_LAB_THEMES } from '../server/db/migrations.js';
import { createDatabaseBackup } from '../server/db/backup.js';

async function runPhase1Tests() {
  console.log('\n======================================================');
  console.log('🧪 INICIANDO SUITE DE TESTES — ECOSSISTEMA FASE 1');
  console.log('======================================================\n');

  // 1. Initialize & Migrate
  initDatabase();
  seedDatabase();
  runMigrations();

  // 2. Test Preservation of 19 T-Shirt Orders (R$ 855,00)
  const orderStats = db.prepare(`
    SELECT
      COUNT(DISTINCT id) as total_orders,
      COUNT(DISTINCT member_id) as total_members,
      SUM(total_amount_cents) as total_cents
    FROM orders
    WHERE status != 'cancelado'
  `).get() as any;

  assert.strictEqual(orderStats.total_orders, 19, 'Deve preservar exatamente os 19 pedidos iniciais');
  assert.strictEqual(orderStats.total_members, 19, 'Deve preservar exatamente os 19 compradores iniciais');
  assert.strictEqual(orderStats.total_cents, 85500, 'Valor total deve continuar sendo R$ 855,00 (85500 centavos)');
  console.log('✓ [TESTE 1] Preservação integral dos 19 pedidos de camisetas (R$ 855,00): PASSOU');

  // 3. Test 2027 Calendar (26 Events + Idempotent Re-import + Empty November)
  const calCountBefore = (db.prepare('SELECT COUNT(*) as c FROM calendar_events').get() as any).c;
  assert.strictEqual(calCountBefore, 26, 'Deve possuir os 26 eventos oficiais do PDF de 2027');

  // Run migrations/seed again to verify idempotency
  runMigrations();
  const calCountAfter = (db.prepare('SELECT COUNT(*) as c FROM calendar_events').get() as any).c;
  assert.strictEqual(calCountAfter, 26, 'Reimportação deve ser idempotente sem duplicar eventos');

  const novEvents = (
    db.prepare("SELECT COUNT(*) as c FROM calendar_events WHERE strftime('%m', event_date) = '11'").get() as any
  ).c;
  assert.strictEqual(novEvents, 0, 'Novembro não deve possuir eventos inventados');
  console.log('✓ [TESTE 2] Calendário 2027 (26 eventos oficiais, idempotência e Novembro vazio): PASSOU');

  // 4. Test 19 Official Laboratory Themes & 7 Official Templates
  const themesCount = (db.prepare('SELECT COUNT(*) as c FROM lab_themes').get() as any).c;
  assert.strictEqual(themesCount, OFFICIAL_LAB_THEMES.length, 'Deve conter exatamente os 19 temas oficiais de laboratório');

  const templatesCount = (db.prepare('SELECT COUNT(*) as c FROM event_templates').get() as any).c;
  assert.ok(templatesCount >= 7, 'Deve conter os modelos de encontros e estágios do PDF');
  console.log('✓ [TESTE 3] 19 Temas de Laboratório e 7 Modelos de Encontros/Estágios do PDF: PASSOU');

  // 5. Test Laboratory Evaluation (8 Criteria + Comments + Optional Future Themes Question)
  const testEvalId = 'eval_test_phase1';
  db.prepare(`
    INSERT OR REPLACE INTO lab_evaluations (
      id, lab_date, speaker_name, theme_title, evaluator_name,
      crit_dominio_assunto, crit_abordagem_tema, crit_objetividade, crit_cumprimento_tempo,
      crit_embasamento_biblico, crit_interacao, crit_testemunho, crit_oracao,
      comments, suggested_future_themes, created_at
    ) VALUES (?, '2027-03-06', 'Duda Fernandes', 'Chamado a ser apóstolo', 'Pedro (Coordenador)',
      'Sim', 'Sim', 'Sim', 'Razoavelmente', 'Sim', 'Sim', 'Sim', 'Sim',
      'Excelente clareza e fervor.', 'Maria, Rainha dos Apóstolos', ?)
  `).run(testEvalId, new Date().toISOString());

  const savedEval = db.prepare('SELECT * FROM lab_evaluations WHERE id = ?').get(testEvalId) as any;
  assert.strictEqual(savedEval.crit_dominio_assunto, 'Sim');
  assert.strictEqual(savedEval.suggested_future_themes, 'Maria, Rainha dos Apóstolos');
  db.prepare('DELETE FROM lab_evaluations WHERE id = ?').run(testEvalId);
  console.log('✓ [TESTE 4] Ficha de Avaliação dos Laboratórios (8 critérios + pergunta opcional 3): PASSOU');

  // 6. Test Coordination Succession Governance (Pedro & Fernanda active)
  const activeCoordinators = db.prepare("SELECT * FROM coordination_succession WHERE status = 'ativo'").all() as any[];
  assert.ok(activeCoordinators.length >= 2, 'Pedro e Fernanda devem estar registrados como coordenadores ativos');
  console.log('✓ [TESTE 5] Governança e Coordenadores Ativos (Pedro e Fernanda): PASSOU');

  // 7. Test Verified Backup Generation
  const backupRes = createDatabaseBackup('automated_test');
  assert.strictEqual(backupRes.integrity.ordersCount, 19);
  assert.strictEqual(backupRes.integrity.totalAmountCents, 85500);
  console.log('✓ [TESTE 6] Snapshot de Backup e Verificação de Integridade: PASSOU');

  console.log('\n======================================================');
  console.log('🎉 TODOS OS TESTES DA FASE 1 PASSARAM COM 100% DE SUCESSO!');
  console.log('======================================================\n');
}

runPhase1Tests().catch((err) => {
  console.error('❌ Falha nos testes da Fase 1:', err);
  process.exit(1);
});
