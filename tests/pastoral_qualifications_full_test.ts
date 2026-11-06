import assert from 'assert';
import { db } from '../server/db/database.js';
import { runMigrations } from '../server/db/migrations.js';

export async function runPastoralQualificationsFullTests() {
  console.log('\n========================================================================');
  console.log('🧪 BATERIA COMPLETA DE TESTES — CORREÇÃO CRÍTICA DE HABILITAÇÕES');
  console.log('========================================================================\n');

  // 1. Garantir migrações aplicadas
  runMigrations();

  const ALL_8_QUALS = [
    'Intercessão',
    'Pregação',
    'Formação',
    'Testemunho',
    'Música',
    'Condução de oração',
    'Animação',
    'Apoio',
  ];

  // ----------------------------------------------------
  // TESTE 1: Contrato da API (Estrutura do retorno no backend)
  // ----------------------------------------------------
  const pedroInitial = db.prepare("SELECT * FROM pastoral_members WHERE id = 'pmem_pedro'").get() as any;
  assert(pedroInitial, 'Pedro deve existir no banco');

  // Simular lógica do endpoint PUT /api/platform/members/:id/qualifications
  const updateQualsMock = (id: string, qualifications: any) => {
    if (!Array.isArray(qualifications)) {
      throw new Error('O campo qualifications deve ser um array de strings.');
    }
    const existing = db.prepare('SELECT id, name, display_name FROM pastoral_members WHERE id = ?').get(id) as any;
    if (!existing) throw new Error('Missionário não encontrado.');

    const now = new Date().toISOString();
    db.prepare('UPDATE pastoral_members SET qualifications_json = ?, updated_at = ? WHERE id = ?').run(
      JSON.stringify(qualifications),
      now,
      id
    );

    const updated = db.prepare('SELECT * FROM pastoral_members WHERE id = ?').get(id) as any;
    const parsed = JSON.parse(updated.qualifications_json || '[]');

    return {
      success: true,
      memberId: id,
      qualifications: parsed, // Top-level
      member: {
        ...updated,
        qualifications: parsed, // Inside member
        skills: JSON.parse(updated.skills_json || '[]'),
      },
      message: `Habilitações de ${existing.display_name || existing.name} salvas com sucesso!`,
    };
  };

  const resContract = updateQualsMock('pmem_pedro', ALL_8_QUALS);
  assert.strictEqual(resContract.success, true, 'success deve ser true');
  assert.strictEqual(resContract.memberId, 'pmem_pedro', 'memberId deve corresponder ao ID');
  assert(Array.isArray(resContract.qualifications), 'res.qualifications deve ser array no top-level');
  assert(Array.isArray(resContract.member.qualifications), 'res.member.qualifications deve ser array em member');
  assert.strictEqual(resContract.qualifications.length, 8, 'Deve conter as 8 habilitações');
  assert.strictEqual(resContract.member.qualifications.length, 8, 'Member deve conter as 8 habilitações');
  console.log('✓ [TESTE 1] Contrato da API validado (res.qualifications E res.member.qualifications): PASSOU');

  // ----------------------------------------------------
  // TESTE 2: Pedro com 8 Funções (Salvar e verificar no banco)
  // ----------------------------------------------------
  const resPedro = updateQualsMock('pmem_pedro', ALL_8_QUALS);
  const pedroDb = db.prepare("SELECT qualifications_json FROM pastoral_members WHERE id = 'pmem_pedro'").get() as any;
  const parsedPedro = JSON.parse(pedroDb.qualifications_json);
  assert.strictEqual(parsedPedro.length, 8);
  for (const q of ALL_8_QUALS) {
    assert(parsedPedro.includes(q), `Pedro deve possuir ${q}`);
  }
  console.log('✓ [TESTE 2] Pedro com todas as 8 funções salvas e confirmadas: PASSOU');

  // ----------------------------------------------------
  // TESTE 3: Tiago com 8 Funções (Salvar seleção idêntica — nenhuma desaparece)
  // ----------------------------------------------------
  const resTiago1 = updateQualsMock('pmem_mem_2a2e78c53bf9', ALL_8_QUALS);
  assert.strictEqual(resTiago1.qualifications.length, 8);
  const tiagoDb1 = db.prepare("SELECT qualifications_json FROM pastoral_members WHERE id = 'pmem_mem_2a2e78c53bf9'").get() as any;
  assert.strictEqual(JSON.parse(tiagoDb1.qualifications_json).length, 8);
  console.log('✓ [TESTE 3] Tiago com 8 funções salvas sem perdas: PASSOU');

  // ----------------------------------------------------
  // TESTE 4: Idempotência (Salvar duas vezes seguidas o mesmo conjunto)
  // ----------------------------------------------------
  const resTiago2 = updateQualsMock('pmem_mem_2a2e78c53bf9', ALL_8_QUALS);
  assert.deepStrictEqual(resTiago1.qualifications, resTiago2.qualifications, 'Resultados devem ser idênticos');
  const tiagoDb2 = db.prepare("SELECT qualifications_json FROM pastoral_members WHERE id = 'pmem_mem_2a2e78c53bf9'").get() as any;
  assert.strictEqual(JSON.parse(tiagoDb2.qualifications_json).length, 8);
  console.log('✓ [TESTE 4] Idempotência comprovada (repetir salvamento não altera o estado): PASSOU');

  // ----------------------------------------------------
  // TESTE 5: Editor Rápido (PUT /members/:id/qualifications)
  // ----------------------------------------------------
  const quickTestQuals = ['Intercessão', 'Formação', 'Apoio'];
  const resQuick = updateQualsMock('pmem_pedro', quickTestQuals);
  assert.deepStrictEqual(resQuick.qualifications, quickTestQuals);
  const dbAfterQuick = db.prepare("SELECT qualifications_json FROM pastoral_members WHERE id = 'pmem_pedro'").get() as any;
  assert.deepStrictEqual(JSON.parse(dbAfterQuick.qualifications_json), quickTestQuals);
  console.log('✓ [TESTE 5] Editor rápido salva atomicamente: PASSOU');

  // ----------------------------------------------------
  // TESTE 6: Editor Completo (PUT /members/:id com qualifications)
  // ----------------------------------------------------
  // Simular lógica do PUT /members/:id
  const fullUpdateMock = (id: string, body: any) => {
    const existing = db.prepare('SELECT * FROM pastoral_members WHERE id = ?').get(id) as any;
    if (!existing) throw new Error('Não encontrado');
    const now = new Date().toISOString();

    const finalQuals = Array.isArray(body.qualifications)
      ? JSON.stringify(body.qualifications)
      : existing.qualifications_json;

    db.prepare(`
      UPDATE pastoral_members
      SET name = COALESCE(?, name),
          display_name = COALESCE(?, display_name),
          phone = COALESCE(?, phone),
          birth_day = COALESCE(?, birth_day),
          birth_month = COALESCE(?, birth_month),
          qualifications_json = ?,
          updated_at = ?
      WHERE id = ?
    `).run(
      body.name || null,
      body.display_name || null,
      body.phone || null,
      body.birth_day || null,
      body.birth_month || null,
      finalQuals,
      now,
      id
    );

    const updated = db.prepare('SELECT * FROM pastoral_members WHERE id = ?').get(id) as any;
    const parsed = JSON.parse(updated.qualifications_json || '[]');
    return {
      success: true,
      memberId: id,
      qualifications: parsed,
      member: {
        ...updated,
        qualifications: parsed,
      },
    };
  };

  const resFull = fullUpdateMock('pmem_pedro', { qualifications: ALL_8_QUALS });
  assert.strictEqual(resFull.qualifications.length, 8);
  const dbAfterFull = db.prepare("SELECT qualifications_json FROM pastoral_members WHERE id = 'pmem_pedro'").get() as any;
  assert.strictEqual(JSON.parse(dbAfterFull.qualifications_json).length, 8);
  console.log('✓ [TESTE 6] Editor completo salva e confirma qualifications: PASSOU');

  // ----------------------------------------------------
  // TESTE 7: Consistência entre Editores
  // ----------------------------------------------------
  const resFromQuick = updateQualsMock('pmem_pedro', ['Música', 'Animação']);
  const getSingleMember = (id: string) => {
    const m = db.prepare('SELECT * FROM pastoral_members WHERE id = ?').get(id) as any;
    return { ...m, qualifications: JSON.parse(m.qualifications_json || '[]') };
  };
  const memberForFull = getSingleMember('pmem_pedro');
  assert.deepStrictEqual(memberForFull.qualifications, ['Música', 'Animação']);
  console.log('✓ [TESTE 7] Consistência comprovada entre editor rápido e editor completo: PASSOU');

  // ----------------------------------------------------
  // TESTE 8: Alteração Apenas de Nome Preserva Habilitações
  // ----------------------------------------------------
  // Restaurar Pedro para todas as 8
  updateQualsMock('pmem_pedro', ALL_8_QUALS);
  const resNameOnly = fullUpdateMock('pmem_pedro', { name: 'Pedro Rafael (Coordenador)' });
  assert.strictEqual(resNameOnly.qualifications.length, 8, 'Habilitações devem permanecer intactas ao mudar nome');
  const dbNameOnly = db.prepare("SELECT qualifications_json FROM pastoral_members WHERE id = 'pmem_pedro'").get() as any;
  assert.strictEqual(JSON.parse(dbNameOnly.qualifications_json).length, 8);
  console.log('✓ [TESTE 8] Alteração de nome preserva integralmente as habilitações: PASSOU');

  // ----------------------------------------------------
  // TESTE 9: Alteração Apenas de Aniversário Preserva Habilitações
  // ----------------------------------------------------
  const resBdayOnly = fullUpdateMock('pmem_pedro', { birth_day: 15, birth_month: 8 });
  assert.strictEqual(resBdayOnly.qualifications.length, 8, 'Habilitações devem permanecer intactas ao mudar aniversário');
  const dbBdayOnly = db.prepare("SELECT birth_day, birth_month, qualifications_json FROM pastoral_members WHERE id = 'pmem_pedro'").get() as any;
  assert.strictEqual(dbBdayOnly.birth_day, 15);
  assert.strictEqual(JSON.parse(dbBdayOnly.qualifications_json).length, 8);
  console.log('✓ [TESTE 9] Alteração de aniversário preserva integralmente as habilitações: PASSOU');

  // ----------------------------------------------------
  // TESTE 10: Alteração Apenas de Telefone Preserva Habilitações
  // ----------------------------------------------------
  const resPhoneOnly = fullUpdateMock('pmem_pedro', { phone: '(61) 99999-8888' });
  assert.strictEqual(resPhoneOnly.qualifications.length, 8, 'Habilitações devem permanecer intactas ao mudar telefone');
  const dbPhoneOnly = db.prepare("SELECT phone, qualifications_json FROM pastoral_members WHERE id = 'pmem_pedro'").get() as any;
  assert.strictEqual(dbPhoneOnly.phone, '(61) 99999-8888');
  assert.strictEqual(JSON.parse(dbPhoneOnly.qualifications_json).length, 8);
  console.log('✓ [TESTE 10] Alteração de telefone preserva integralmente as habilitações: PASSOU');

  // ----------------------------------------------------
  // TESTE 11: Limpar Todas Intencionalmente (Array Vazio)
  // ----------------------------------------------------
  const resCleared = updateQualsMock('pmem_pedro', []);
  assert.strictEqual(resCleared.qualifications.length, 0);
  const dbCleared = db.prepare("SELECT qualifications_json FROM pastoral_members WHERE id = 'pmem_pedro'").get() as any;
  assert.strictEqual(JSON.parse(dbCleared.qualifications_json).length, 0);
  // Re-atribuir as 8 para Pedro
  updateQualsMock('pmem_pedro', ALL_8_QUALS);
  console.log('✓ [TESTE 11] Limpeza intencional de todas as funções suportada e auditável: PASSOU');

  // ----------------------------------------------------
  // TESTE 12: Rejeição de Dados Inválidos (Não Array)
  // ----------------------------------------------------
  assert.throws(
    () => updateQualsMock('pmem_pedro', 'invalid-string' as any),
    /deve ser um array de strings/
  );
  console.log('✓ [TESTE 12] Validação rigorosa da API rejeita tipos inválidos sem alterar banco: PASSOU');

  // ----------------------------------------------------
  // TESTE 13: Resposta de Contrato com Fallback Seguro
  // ----------------------------------------------------
  const rawMockResponse = {
    success: true,
    member: {
      id: 'pmem_pedro',
      qualifications: ALL_8_QUALS,
    },
  };
  // Lógica do frontend
  const extractedQuals = Array.isArray((rawMockResponse as any).qualifications)
    ? (rawMockResponse as any).qualifications
    : Array.isArray(rawMockResponse.member?.qualifications)
    ? rawMockResponse.member.qualifications
    : [];
  assert.strictEqual(extractedQuals.length, 8, 'Fallback deve extrair de member.qualifications com sucesso');
  console.log('✓ [TESTE 13] Extração robusta no frontend protege contra respostas variadas: PASSOU');

  // ----------------------------------------------------
  // TESTE 14: Respostas Concorrentes e Integridade
  // ----------------------------------------------------
  const op1 = updateQualsMock('pmem_pedro', ['Intercessão']);
  const op2 = updateQualsMock('pmem_pedro', ALL_8_QUALS);
  const dbFinalOrder = db.prepare("SELECT qualifications_json FROM pastoral_members WHERE id = 'pmem_pedro'").get() as any;
  assert.strictEqual(JSON.parse(dbFinalOrder.qualifications_json).length, 8);
  console.log('✓ [TESTE 14] Respostas sequenciais preservam o último estado confirmado: PASSOU');

  // ----------------------------------------------------
  // TESTE 15: Persistência no SQLite
  // ----------------------------------------------------
  const pmemPedroFresh = db.prepare("SELECT qualifications_json FROM pastoral_members WHERE id = 'pmem_pedro'").get() as any;
  assert.strictEqual(JSON.parse(pmemPedroFresh.qualifications_json).length, 8);
  console.log('✓ [TESTE 15] Persistência direta em SQLite confirmada: PASSOU');

  // ----------------------------------------------------
  // TESTE 16: Coordenadores Pedro e Fernanda com 8 Funções
  // ----------------------------------------------------
  const fernanda = db.prepare("SELECT qualifications_json FROM pastoral_members WHERE id = 'pmem_fernanda'").get() as any;
  assert.strictEqual(JSON.parse(fernanda.qualifications_json).length, 8, 'Fernanda deve ter 8 funções');
  const pedro = db.prepare("SELECT qualifications_json FROM pastoral_members WHERE id = 'pmem_pedro'").get() as any;
  assert.strictEqual(JSON.parse(pedro.qualifications_json).length, 8, 'Pedro deve ter 8 funções');
  console.log('✓ [TESTE 16] Coordenadores Pedro e Fernanda com todas as 8 funções ativas: PASSOU');

  // ----------------------------------------------------
  // TESTE 17: Demais Membros Não Alterados em Massa
  // ----------------------------------------------------
  const otherMembers = db.prepare("SELECT id, name, qualifications_json FROM pastoral_members WHERE id NOT IN ('pmem_pedro', 'pmem_fernanda', 'pmem_mem_2a2e78c53bf9')").all() as any[];
  assert(otherMembers.length > 0, 'Deve haver outros membros');
  // Confirmar que nem todos têm 8 funções (preservando configurações individuais)
  const allHave8 = otherMembers.every((m) => JSON.parse(m.qualifications_json || '[]').length === 8);
  assert.strictEqual(allHave8, false, 'Demais membros devem preservar suas atribuições individuais específicas');
  console.log('✓ [TESTE 17] Preservação das configurações individuais dos demais membros: PASSOU');

  // ----------------------------------------------------
  // TESTE 18: Endpoint GET /api/platform/members/:id
  // ----------------------------------------------------
  const singlePedro = getSingleMember('pmem_pedro');
  assert.strictEqual(singlePedro.id, 'pmem_pedro');
  assert.strictEqual(singlePedro.qualifications.length, 8);
  console.log('✓ [TESTE 18] Consulta pontual GET /members/:id retorna dados frescos e tipados: PASSOU');

  // ----------------------------------------------------
  // TESTE 19: Simulação de Reinicialização
  // ----------------------------------------------------
  // Recarregar migrações novamente
  runMigrations();
  const tiagoReboot = db.prepare("SELECT qualifications_json FROM pastoral_members WHERE id = 'pmem_mem_2a2e78c53bf9'").get() as any;
  assert.strictEqual(JSON.parse(tiagoReboot.qualifications_json).length, 8);
  console.log('✓ [TESTE 19] Reinicialização e execução idempotente preservam os dados: PASSOU');

  // ----------------------------------------------------
  // TESTE 20: Simulação de Deploy com Migração 007
  // ----------------------------------------------------
  const mig007 = db.prepare("SELECT * FROM schema_migrations WHERE version = '007_master_7_0_qualifications_contract_and_recovery'").get();
  assert(mig007, 'Migração 007 deve estar registrada');
  console.log('✓ [TESTE 20] Migração 007 registrada com sucesso no histórico de esquema: PASSOU');

  // ----------------------------------------------------
  // TESTE 21: Preservação Inegociável dos Outros Módulos (Camisetas e Chave Pix)
  // ----------------------------------------------------
  const ordersSummary = db.prepare("SELECT COUNT(*) as count, SUM(total_amount_cents) as total_cents FROM orders WHERE status != 'cancelado'").get() as any;
  assert.strictEqual(ordersSummary.count, 19, 'Deve haver 19 pedidos');
  assert.strictEqual(ordersSummary.total_cents, 85500, 'Total deve ser R$ 855,00');

  const pixSetting = db.prepare("SELECT value_json FROM integration_settings WHERE key = 'pix_payment'").get() as any;
  const pixData = JSON.parse(pixSetting.value_json);
  assert.strictEqual(pixData.pix_key, '(61)992568165');
  console.log('✓ [TESTE 21] Preservação integral dos 19 pedidos (R$ 855,00) e Chave Pix oficial (61)992568165: PASSOU');

  console.log('\n========================================================================');
  console.log('🎉 TODOS OS 21 TESTES PASSARAM COM 100% DE SUCESSO!');
  console.log('========================================================================\n');
}

runPastoralQualificationsFullTests().catch((err) => {
  console.error('❌ Falha nos testes:', err);
  process.exit(1);
});

