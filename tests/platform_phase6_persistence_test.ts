import assert from 'assert';
import bcrypt from 'bcryptjs';
import { db } from '../server/db/database.js';
import { runMigrations } from '../server/db/migrations.js';
import { getHolidaysForYear } from '../server/services/holidaysService.js';

export async function runPhase6PersistenceTests() {
  console.log('\n========================================================================');
  console.log('🧪 INICIANDO TESTES DA FASE 6 — PERSISTÊNCIA, HABILITAÇÕES E CALENDÁRIO');
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
  // TESTE 3: As 8 Habilitações Pastorais Confirmadas para Fernanda e Tiago
  // ----------------------------------------------------
  const expected8 = [
    'Intercessão',
    'Pregação',
    'Formação',
    'Testemunho',
    'Música',
    'Condução de oração',
    'Animação',
    'Apoio'
  ];

  const fernanda = db.prepare("SELECT * FROM pastoral_members WHERE id = 'pmem_fernanda' OR name LIKE 'Fernanda%'").get() as any;
  assert(fernanda, 'Fernanda deve existir em pastoral_members');
  const fernandaQuals = JSON.parse(fernanda.qualifications_json || '[]');
  for (const q of expected8) {
    assert(fernandaQuals.includes(q), `Fernanda deve ter a habilitação ${q}`);
  }
  assert.strictEqual(fernandaQuals.length, 8, 'Fernanda deve ter exatamente as 8 habilitações pastorais');

  const tiago = db.prepare("SELECT * FROM pastoral_members WHERE id = 'pmem_mem_2a2e78c53bf9' OR name = 'Tiago'").get() as any;
  assert(tiago, 'Tiago deve existir em pastoral_members');
  const tiagoQuals = JSON.parse(tiago.qualifications_json || '[]');
  for (const q of expected8) {
    assert(tiagoQuals.includes(q), `Tiago deve ter a habilitação ${q}`);
  }
  assert.strictEqual(tiagoQuals.length, 8, 'Tiago deve ter exatamente as 8 habilitações pastorais');
  console.log('✓ [TESTE 3] Fernanda e Tiago com todas as 8 habilitações pastorais ativas: PASSOU');

  // ----------------------------------------------------
  // TESTE 4: Atualização Atômica de Habilitações com Persistência Imediata
  // ----------------------------------------------------
  const testQuals = ['Intercessão', 'Formação', 'Apoio'];
  db.prepare(`
    UPDATE pastoral_members
    SET qualifications_json = ?, updated_at = datetime('now')
    WHERE id = 'pmem_pedro'
  `).run(JSON.stringify(testQuals));

  const pedroUpdated = db.prepare("SELECT qualifications_json FROM pastoral_members WHERE id = 'pmem_pedro'").get() as any;
  const parsedPedro = JSON.parse(pedroUpdated.qualifications_json);
  assert.deepStrictEqual(parsedPedro, testQuals, 'Habilitações de Pedro devem ser salvas atomicamente');

  // Restaurar Pedro para todas as 8
  db.prepare(`
    UPDATE pastoral_members
    SET qualifications_json = ?, updated_at = datetime('now')
    WHERE id = 'pmem_pedro'
  `).run(JSON.stringify(expected8));
  console.log('✓ [TESTE 4] Persistência atômica de habilitações pastorais: PASSOU');

  // ----------------------------------------------------
  // TESTE 5: Mural de Avisos Atualizado (Seção 8.2) Sem Menção a "19 temas"
  // ----------------------------------------------------
  const mural = db.prepare("SELECT * FROM announcements WHERE id = 'ann-boas-vindas-ecossistema'").get() as any;
  assert(mural, 'Aviso ann-boas-vindas-ecossistema deve existir');
  assert.strictEqual(mural.title, 'Bem-vindos à Plataforma da Pastoral Missionária!');
  assert(!mural.content.includes('19 temas'), 'Conteúdo não deve conter "19 temas"');
  assert(!mural.content.includes('Calendário Oficial 2027'), 'Conteúdo não deve conter "Calendário Oficial 2027"');
  assert(mural.content.includes('São Padre Pio'), 'Conteúdo deve conter citação de São Padre Pio');
  console.log('✓ [TESTE 5] Mural de avisos institucional atualizado conforme Seção 8.2: PASSOU');

  // ----------------------------------------------------
  // TESTE 6: Solenidade Litúrgica de Santa Maria, Mãe de Deus em 1º de Janeiro
  // ----------------------------------------------------
  const h2027 = getHolidaysForYear(2027);
  const jan1Holidays = h2027.filter((h) => h.date === '2027-01-01');
  assert.strictEqual(jan1Holidays.length, 2, 'Deve haver 2 celebrações em 01/01/2027');

  const civilHoliday = jan1Holidays.find((h) => h.type === 'nacional');
  assert(civilHoliday, 'Deve conter Confraternização Universal');
  assert.strictEqual(civilHoliday.name, 'Confraternização Universal');

  const marianSolemnity = jan1Holidays.find((h) => h.type === 'religiosa');
  assert(marianSolemnity, 'Deve conter Solenidade de Santa Maria, Mãe de Deus');
  assert.strictEqual(marianSolemnity.name, 'Santa Maria, Mãe de Deus');
  assert.strictEqual(marianSolemnity.type_label, 'Solenidade Litúrgica');
  assert(marianSolemnity.description.includes('Nossa Senhora Mãe Rainha'), 'Deve conter menção a Nossa Senhora Mãe Rainha');
  console.log('✓ [TESTE 6] Santa Maria, Mãe de Deus em 1º de janeiro integrada como Solenidade: PASSOU');

  // ----------------------------------------------------
  // TESTE 7: Credenciais de Coordenadores (Pedro e Fernanda) no Banco
  // ----------------------------------------------------
  const pedroUser = db.prepare("SELECT * FROM users WHERE email = 'pedropignata2@gmail.com'").get() as any;
  assert(pedroUser, 'Usuário Pedro deve existir na tabela users');
  assert(pedroUser.password_hash, 'Pedro deve ter hash de senha');
  assert(bcrypt.compareSync('pastoral@2026', pedroUser.password_hash), 'Senha padrão deve ser pastoral@2026');

  const fernandaUser = db.prepare("SELECT * FROM users WHERE email = 'fernandasouto7826@gmail.com'").get() as any;
  assert(fernandaUser, 'Usuário Fernanda deve existir na tabela users');
  assert(fernandaUser.password_hash, 'Fernanda deve ter hash de senha');
  assert(bcrypt.compareSync('pastoral@2026', fernandaUser.password_hash), 'Senha padrão deve ser pastoral@2026');
  console.log('✓ [TESTE 7] Coordenadores com hash de senha válido (login direto com senha disponível): PASSOU');

  // ----------------------------------------------------
  // TESTE 8: Eventos Oficiais do Calendário e Descrições de Formações Preservadas
  // ----------------------------------------------------
  const totalEvents = db.prepare('SELECT COUNT(*) as c FROM calendar_events').get() as { c: number };
  assert(totalEvents.c >= 26, 'Deve haver ao menos os 26 eventos oficiais');

  const formacaoNov1 = db.prepare("SELECT * FROM calendar_events WHERE id = 'cal_2026_11_14_formacao_1'").get() as any;
  assert(formacaoNov1, '1ª Formação deve existir');
  assert(formacaoNov1.description.includes('Padre Pio'), 'Descrição deve manter referências formativas completas');
  console.log('✓ [TESTE 8] Calendário oficial e descrições completas preservadas: PASSOU');

  console.log('\n========================================================================');
  console.log('🎉 TODOS OS TESTES DA FASE 6 PASSARAM COM SUCESSO TOTAL!');
  console.log('========================================================================\n');
}

runPhase6PersistenceTests().catch((err) => {
  console.error('❌ Falha nos testes da Fase 6:', err);
  process.exit(1);
});
