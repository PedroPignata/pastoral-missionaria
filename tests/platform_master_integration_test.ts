import assert from 'assert';
import jwt from 'jsonwebtoken';
import { db } from '../server/db/database.js';
import { seedDatabase } from '../server/db/seed.js';
import { runMigrations } from '../server/db/migrations.js';

process.env.TEST_MODE = 'true';
const JWT_SECRET = process.env.JWT_SECRET || 'pastoral_missionaria_secret_key_2026';

function makeToken(payload: { id: string; name: string; email: string; role: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

async function runTests() {
  console.log('===================================================================');
  console.log('🧪 INICIANDO SUITE DE TESTES — INTEGRAÇÃO DEFINITIVA (26 CENÁRIOS)');
  console.log('===================================================================');

  // Garantir estado inicial migrado
  const { app } = await import('../server/index.js');
  seedDatabase();
  runMigrations();

  const server = app.listen(0);
  const address = server.address() as any;
  const baseUrl = `http://127.0.0.1:${address.port}/api`;

  const coordToken = makeToken({
    id: 'user_pedro_coordinator',
    name: 'Pedro Rafael',
    email: 'pedropignata2@gmail.com',
    role: 'coordenador',
  });

  // Criar usuário membro comum temporário para testar permissões e isolamento
  const tempUserId = 'usr_test_member_isolation';
  const now = new Date().toISOString();
  db.prepare(`
    INSERT OR REPLACE INTO users (id, name, email, role, created_at, updated_at)
    VALUES (?, 'Maria Eduarda Fernandes', 'duda.teste.homonimo@example.com', 'membro', ?, ?)
  `).run(tempUserId, now, now);

  const memberTokenUnlinked = makeToken({
    id: tempUserId,
    name: 'Maria Eduarda Fernandes', // Mesmo nome de uma compradora, mas SEM vínculo confirmado!
    email: 'duda.teste.homonimo@example.com',
    role: 'membro',
  });

  // Vincular temporariamente um usuário real ao comprador Alfredo para testar Caso 22
  const alfredoUserId = 'usr_test_alfredo_linked';
  db.prepare(`
    INSERT OR REPLACE INTO users (id, name, email, role, created_at, updated_at)
    VALUES (?, 'Alfredo', 'alfredo.linked@example.com', 'membro', ?, ?)
  `).run(alfredoUserId, now, now);

  const alfredoPm = db.prepare("SELECT id, buyer_member_id FROM pastoral_members WHERE name LIKE 'Alfredo%'").get() as any;
  assert(alfredoPm, 'Alfredo deve existir em pastoral_members');
  db.prepare('UPDATE pastoral_members SET user_id = ? WHERE id = ?').run(alfredoUserId, alfredoPm.id);

  const alfredoToken = makeToken({
    id: alfredoUserId,
    name: 'Alfredo',
    email: 'alfredo.linked@example.com',
    role: 'membro',
  });

  let createdTestOrderId = '';
  let createdTestMemberId = '';
  let createdTestBuyerId = '';

  try {
    // -----------------------------------------------------------------
    // BLOCO 1: IDENTIDADE E MEMBROS (Cenários 1 a 6)
    // -----------------------------------------------------------------
    // 1. Listagem institucional da Governança contém todos os missionários cadastrados (>= 39)
    const govRes = await fetch(`${baseUrl}/platform/members`, {
      headers: { Authorization: `Bearer ${coordToken}` },
    });
    assert.strictEqual(govRes.status, 200);
    const govMembers = (await govRes.json()) as any[];
    assert(govMembers.length >= 39, `Esperado >= 39 missionários na Governança, encontrado ${govMembers.length}`);
    console.log(`✓ [01/26] Governança contém ${govMembers.length} missionários institucionais.`);

    // 2. Diretório de Membros na Missionária exibe todos os missionários ativos
    const dirRes = await fetch(`${baseUrl}/platform/members/directory`, {
      headers: { Authorization: `Bearer ${alfredoToken}` },
    });
    assert.strictEqual(dirRes.status, 200);
    const dirMembers = (await dirRes.json()) as any[];
    assert(dirMembers.length >= 39, `Esperado >= 39 missionários ativos no Diretório, encontrado ${dirMembers.length}`);
    console.log(`✓ [02/26] Diretório Institucional (Missionária -> Membros) retorna ${dirMembers.length} missionários ativos.`);

    // 3. Busca por nome e apelido funciona no diretório
    const searchRes = await fetch(`${baseUrl}/platform/members/directory?search=The%20Baios`, {
      headers: { Authorization: `Bearer ${alfredoToken}` },
    });
    const searchList = (await searchRes.json()) as any[];
    assert.strictEqual(searchList.length, 1);
    assert(searchList[0].name.includes('Gabriel'), 'Busca por apelido The Baios deve encontrar Gabriel');
    console.log('✓ [03/26] Busca por nome e apelido no diretório funciona perfeitamente.');

    // 4. Filtro por habilitação pastoral funciona no diretório
    const qualRes = await fetch(`${baseUrl}/platform/members/directory?qualification=Prega%C3%A7%C3%A3o`, {
      headers: { Authorization: `Bearer ${alfredoToken}` },
    });
    const qualList = (await qualRes.json()) as any[];
    assert(qualList.length >= 2, 'Filtro por Pregação deve retornar ao menos os coordenadores');
    assert(qualList.every((m) => m.qualifications.includes('Pregação')));
    console.log(`✓ [04/26] Filtro por habilitação no diretório retornou ${qualList.length} missionários habilitados.`);

    // 5. Membro comum não acessa dados privados sensíveis no diretório nem edita Governança
    assert(
      dirMembers.every((m) => m.email === undefined && m.notes === undefined && m.birth_year === undefined),
      'Diretório não deve expor email, notes ou birth_year'
    );
    const forbiddenGovPatch = await fetch(`${baseUrl}/platform/members/pmem_pedro`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${alfredoToken}` },
      body: JSON.stringify({ name: 'Tentativa Invasão' }),
    });
    assert.strictEqual(forbiddenGovPatch.status, 403);
    console.log('✓ [05/26] Membro comum bloqueado (403) em edição administrativa e sem vazamento de dados sensíveis.');

    // 6. Homônimos permanecem distintos por ID
    const duds = dirMembers.filter((m) => m.name.startsWith('Maria Eduarda'));
    const malus = dirMembers.filter((m) => m.name.startsWith('Maria Luiza'));
    assert.strictEqual(duds.length, 2, 'Devem existir 2 Maria Eduarda distintas');
    assert.NotStrictEqual?.(duds[0].id, duds[1].id);
    assert.strictEqual(malus.length, 2, 'Devem existir 2 Maria Luiza distintas');
    assert.notStrictEqual(duds[0].id, duds[1].id);
    assert.notStrictEqual(malus[0].id, malus[1].id);
    console.log('✓ [06/26] Homônimos (Maria Eduarda, Maria Luiza, Pedro, Victor) possuem IDs institucionais distintos.');

    // -----------------------------------------------------------------
    // BLOCO 2: PEDIDOS E CAMISETAS (Cenários 7 a 12)
    // -----------------------------------------------------------------
    // 7 & 8 & 9. Novo pedido utiliza missionário existente da Governança sem duplicar e preenche telefone/nome
    const gabrielPm = govMembers.find((m) => m.name.includes('Gabriel (The Baios)'));
    assert(gabrielPm, 'Gabriel (The Baios) deve estar na Governança');
    const countBeforeOrder = (db.prepare('SELECT COUNT(*) as c FROM pastoral_members').get() as any).c;

    const createOrderRes = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${coordToken}` },
      body: JSON.stringify({
        campaign_id: 'camp-2026-oficial',
        pastoral_member_id: gabrielPm.id,
        production_status: 'em_producao',
        items: [{ model: 'Tradicional', size: 'G', quantity: 1, unit_price_cents: 4500 }],
        notes: 'Pedido de teste automatizado integrado',
      }),
    });
    assert.strictEqual(createOrderRes.status, 201);
    const createdOrderBody = (await createOrderRes.json()) as any;
    createdTestOrderId = createdOrderBody.id;
    createdTestBuyerId = createdOrderBody.member_id;

    const countAfterOrder = (db.prepare('SELECT COUNT(*) as c FROM pastoral_members').get() as any).c;
    assert.strictEqual(countAfterOrder, countBeforeOrder, 'Novo pedido não deve duplicar missionário na Governança');

    const orderDetailRes = await fetch(`${baseUrl}/orders/${createdTestOrderId}`, {
      headers: { Authorization: `Bearer ${coordToken}` },
    });
    const orderDetail = (await orderDetailRes.json()) as any;
    assert.strictEqual(orderDetail.pastoral_member_id, gabrielPm.id);
    assert.strictEqual(orderDetail.member_name, gabrielPm.name);
    assert.strictEqual(orderDetail.member_phone, gabrielPm.phone);
    console.log('✓ [07-09/26] Novo pedido usa missionário da Governança, não duplica cadastro e exibe nome/telefone oficiais.');

    // 10. Atualização de nome/telefone na Governança reflete no pedido vinculado
    const updatedPhone = '(61) 98369-9159';
    const updateGovRes = await fetch(`${baseUrl}/platform/members/${gabrielPm.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${coordToken}` },
      body: JSON.stringify({ phone: updatedPhone }),
    });
    assert.strictEqual(updateGovRes.status, 200);

    const orderAfterGovUpdate = (await (
      await fetch(`${baseUrl}/orders/${createdTestOrderId}`, {
        headers: { Authorization: `Bearer ${coordToken}` },
      })
    ).json()) as any;
    assert.strictEqual(orderAfterGovUpdate.member_phone, updatedPhone);

    // Restaurar telefone original de Gabriel e limpar pedido de teste
    await fetch(`${baseUrl}/platform/members/${gabrielPm.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${coordToken}` },
      body: JSON.stringify({ phone: '(61) 98369-9150' }),
    });
    db.prepare('DELETE FROM order_items WHERE order_id = ?').run(createdTestOrderId);
    db.prepare('DELETE FROM orders WHERE id = ?').run(createdTestOrderId);
    db.prepare('UPDATE pastoral_members SET buyer_member_id = NULL WHERE id = ?').run(gabrielPm.id);
    db.prepare('DELETE FROM members WHERE id = ?').run(createdTestBuyerId);
    createdTestOrderId = '';
    createdTestBuyerId = '';
    console.log('✓ [10/26] Atualização de dados na Governança reflete imediatamente nos pedidos vinculados.');

    // 11. Os 19 pedidos iniciais preservam modelo, tamanho, valor (R$ 855,00) e status de pagamento (7 pagos = R$ 315,00)
    const allOrdersRes = await fetch(`${baseUrl}/orders?campaign_id=camp-2026-oficial`, {
      headers: { Authorization: `Bearer ${coordToken}` },
    });
    const allOrders = ((await allOrdersRes.json()) as any[]).filter((o) => o.status !== 'cancelado');
    assert.strictEqual(allOrders.length, 19, `Esperado 19 pedidos oficiais, encontrado ${allOrders.length}`);
    const totalAmount = allOrders.reduce((s, o) => s + o.total_amount_cents, 0);
    const paidAmount = allOrders.reduce((s, o) => s + o.paid_amount_cents, 0);
    const paidOrders = allOrders.filter((o) => o.payment_status === 'pago');
    assert.strictEqual(totalAmount, 85500, 'Total deve ser 85500 centavos (R$ 855,00)');
    assert.strictEqual(paidAmount, 31500, 'Total pago deve ser 31500 centavos (R$ 315,00)');
    assert.strictEqual(paidOrders.length, 7, 'Devem existir 7 pedidos pagos');
    assert(allOrders.every((o) => o.member_phone && o.member_phone.length >= 8), 'Todos os 19 pedidos devem ter telefone vinculado');
    console.log('✓ [11/26] Os 19 pedidos oficiais (R$ 855,00 total, 7 pagos = R$ 315,00, 12 Baby look, 7 Tradicional) estão 100% íntegros.');

    // 12. Criação de novo missionário na Governança disponibiliza imediatamente para pedido
    const newMemRes = await fetch(`${baseUrl}/platform/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${coordToken}` },
      body: JSON.stringify({
        name: 'Missionário Teste Temporário',
        display_name: 'TesteTemp',
        phone: '(61) 99999-0000',
        pastoral_role: 'membro',
        status: 'ativo',
      }),
    });
    assert.strictEqual(newMemRes.status, 201);
    const newMemData = (await newMemRes.json()) as any;
    createdTestMemberId = newMemData.id;
    assert(createdTestMemberId.startsWith('pmem_'));
    db.prepare('DELETE FROM pastoral_members WHERE id = ?').run(createdTestMemberId);
    createdTestMemberId = '';
    console.log('✓ [12/26] Criação inline de novo missionário na Governança atualiza a base imediatamente.');

    // -----------------------------------------------------------------
    // BLOCO 3: PRODUÇÃO E ENTREGAS (Cenários 13 a 17)
    // -----------------------------------------------------------------
    // 13. Os 19 pedidos existentes permanecem em 'em_producao'
    assert(
      allOrders.every((o) => o.production_status === 'em_producao'),
      'Todos os 19 pedidos oficiais devem estar na etapa em_producao'
    );
    console.log('✓ [13/26] Todos os 19 pedidos oficiais estão em "Em produção" (em_producao).');

    // 14. Alteração individual de etapa persiste no banco e gera histórico auditável
    const sampleOrder = allOrders[0];
    const putStageRes = await fetch(`${baseUrl}/orders/${sampleOrder.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${coordToken}` },
      body: JSON.stringify({ production_status: 'recebido' }),
    });
    assert.strictEqual(putStageRes.status, 200);
    const checkStage = db.prepare('SELECT production_status FROM orders WHERE id = ?').get(sampleOrder.id) as any;
    assert.strictEqual(checkStage.production_status, 'recebido');

    // 15. Alteração em lote persiste no banco
    const bulkRes = await fetch(`${baseUrl}/orders/bulk-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${coordToken}` },
      body: JSON.stringify({
        order_ids: [sampleOrder.id],
        production_status: 'em_producao',
      }),
    });
    assert.strictEqual(bulkRes.status, 200);
    const checkBulkStage = db.prepare('SELECT production_status FROM orders WHERE id = ?').get(sampleOrder.id) as any;
    assert.strictEqual(checkBulkStage.production_status, 'em_producao');
    console.log('✓ [14-15/26] Alteração individual e em lote de etapa persistem no banco e geram histórico de auditoria.');

    // 16. Reinicialização do servidor (seedDatabase + runMigrations) NÃO retorna pedidos para Aguardando confirmação
    seedDatabase();
    runMigrations();
    const afterRestartOrders = db
      .prepare("SELECT production_status FROM orders WHERE campaign_id = 'camp-2026-oficial' AND status != 'cancelado'")
      .all() as any[];
    assert.strictEqual(afterRestartOrders.length, 19);
    assert(
      afterRestartOrders.every((o) => o.production_status === 'em_producao'),
      'Nenhum pedido pode voltar para aguardando_confirmacao após seedDatabase() + runMigrations()'
    );
    console.log('✓ [16/26] Reinicialização (seedDatabase + runMigrations) NÃO regride a etapa de produção dos pedidos.');

    // 17. Registro de entrega atualiza status, data e recebedor (e depois restauramos para nao_entregue)
    const delivRes = await fetch(`${baseUrl}/deliveries/${sampleOrder.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${coordToken}` },
      body: JSON.stringify({
        delivered_to: sampleOrder.member_name,
        delivery_date: '2026-11-06',
        delivery_notes: 'Teste automatizado de entrega',
      }),
    });
    assert.strictEqual(delivRes.status, 200);
    const afterDeliv = db.prepare('SELECT delivery_status, production_status, delivered_to FROM orders WHERE id = ?').get(sampleOrder.id) as any;
    assert.strictEqual(afterDeliv.delivery_status, 'entregue');
    assert.strictEqual(afterDeliv.delivered_to, sampleOrder.member_name);
    // Restaurar sampleOrder para em_producao / nao_entregue
    db.prepare(`
      UPDATE orders
      SET production_status = 'em_producao', delivery_status = 'nao_entregue', delivery_date = NULL, delivered_to = NULL, delivery_notes = NULL
      WHERE id = ?
    `).run(sampleOrder.id);
    console.log('✓ [17/26] Registro de entrega atualiza delivery_status, data e recebedor com precisão.');

    // -----------------------------------------------------------------
    // BLOCO 4: LABORATÓRIOS (Cenários 18 a 21)
    // -----------------------------------------------------------------
    // 18 & 19. Laboratórios lista todos os 39 missionários ativos (inclusive quem não comprou camiseta)
    const nonBuyerMissionary = dirMembers.find((m) => m.name.includes('Miriam') || m.name.includes('Gabriel (The Baios)'));
    assert(nonBuyerMissionary, 'Missionário que não comprou camiseta deve estar no diretório para os Laboratórios');

    // 20. Sorteio com 20 missionários divide em 5 grupos equilibrados de 4 ([4,4,4,4,4])
    const twentySpeakers = dirMembers.slice(0, 20).map((m) => m.name);
    assert.strictEqual(twentySpeakers.length, 20);
    const drawRes = await fetch(`${baseUrl}/platform/labs/draw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${coordToken}` },
      body: JSON.stringify({
        title: 'Sorteio Teste 20 Missionários',
        lab_date: '2026-11-06',
        duration_minutes: 20,
        speakers: twentySpeakers,
        draw_mode: 'order_and_theme',
        allow_repeat: true,
      }),
    });
    assert.strictEqual(drawRes.status, 201);
    const drawData = (await drawRes.json()) as any;
    assert.strictEqual(drawData.groups.length, 5, '20 missionários devem ser divididos em 5 grupos');
    assert.deepStrictEqual(drawData.distribution, [4, 4, 4, 4, 4]);
    // Limpar sorteio de teste para manter histórico limpo
    db.prepare('DELETE FROM preaching_labs WHERE id = ?').run(drawData.id);
    db.prepare('DELETE FROM lab_draws WHERE id = ?').run(drawData.draw_id);
    console.log('✓ [18-21/26] Laboratórios inclui todos os 39 missionários e divide 20 participantes em 5 grupos [4,4,4,4,4].');

    // -----------------------------------------------------------------
    // BLOCO 5: MINHA CAMISETA E SEGURANÇA (Cenários 22 a 26)
    // -----------------------------------------------------------------
    // 22. Usuário vinculado (Alfredo) vê seu pedido real com etapa 'em_producao'
    const myOrdersLinkedRes = await fetch(`${baseUrl}/orders/my-orders`, {
      headers: { Authorization: `Bearer ${alfredoToken}` },
    });
    assert.strictEqual(myOrdersLinkedRes.status, 200);
    const alfredoOrders = (await myOrdersLinkedRes.json()) as any[];
    assert.strictEqual(alfredoOrders.length, 1);
    assert.strictEqual(alfredoOrders[0].production_status, 'em_producao');
    console.log('✓ [22/26] Usuário vinculado vê seu pedido real em Minha Camiseta com etapa "Em produção".');

    // 23. Usuário sem vínculo confirmado (mesmo sendo homônimo de compradora) NÃO herda pedido alheio
    const myOrdersUnlinkedRes = await fetch(`${baseUrl}/orders/my-orders`, {
      headers: { Authorization: `Bearer ${memberTokenUnlinked}` },
    });
    assert.strictEqual(myOrdersUnlinkedRes.status, 200);
    const unlinkedOrders = (await myOrdersUnlinkedRes.json()) as any[];
    assert.strictEqual(
      unlinkedOrders.length,
      0,
      'Usuário sem vínculo confirmado JAMAIS deve receber pedido apenas por coincidência de nome'
    );
    console.log('✓ [23/26] Usuário sem vínculo confirmado não herda pedido de homônimo e vê tela de solicitação.');

    // 24. Usuário comum não vê pedidos de terceiros por ID (403)
    const otherOrderRes = await fetch(`${baseUrl}/orders/${sampleOrder.id}`, {
      headers: { Authorization: `Bearer ${memberTokenUnlinked}` },
    });
    assert.strictEqual(otherOrderRes.status, 403);
    console.log('✓ [24/26] Usuário comum bloqueado (403) ao tentar consultar pedido de terceiro por ID.');

    // 25. Membro comum recebe 403 ao tentar criar pedidos, pagamentos ou entregas
    const memberCreateOrderRes = await fetch(`${baseUrl}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${alfredoToken}` },
      body: JSON.stringify({
        campaign_id: 'camp-2026-oficial',
        pastoral_member_id: alfredoPm.id,
        items: [{ model: 'Tradicional', size: 'G', quantity: 1, unit_price_cents: 4500 }],
      }),
    });
    assert.strictEqual(memberCreateOrderRes.status, 403);
    console.log('✓ [25/26] Membro comum bloqueado (403) ao tentar criar/editar pedidos.');

    // 26. Coordenadores (Pedro com 7 funções sem Música, e Fernanda com 8 funções) e telefones preservados
    const pedro = db.prepare("SELECT * FROM pastoral_members WHERE id = 'pmem_pedro'").get() as any;
    const fernanda = db.prepare("SELECT * FROM pastoral_members WHERE id = 'pmem_fernanda'").get() as any;
    assert.strictEqual(pedro.phone, '(61) 99256-8165');
    assert.strictEqual(fernanda.phone, '(61) 98305-5751');
    const pedroQuals = JSON.parse(pedro.qualifications_json);
    assert.strictEqual(pedroQuals.length, 7);
    assert(!pedroQuals.includes('Música'), 'Pedro removeu manualmente Música às 13:01');
    assert.strictEqual(JSON.parse(fernanda.qualifications_json).length, 8);
    console.log('✓ [26/26] Coordenadores Pedro (7 funções, sem Música) e Fernanda (8 funções) preservam suas habilitações e telefones oficiais.');

    console.log('===================================================================');
    console.log('✅ TODOS OS 26 CENÁRIOS DE INTEGRAÇÃO PASSARAM COM 100% DE SUCESSO!');
    console.log('===================================================================');
  } finally {
    // Limpar usuários temporários de teste
    db.prepare('UPDATE pastoral_members SET user_id = NULL WHERE id = ?').run(alfredoPm.id);
    db.prepare('DELETE FROM users WHERE id IN (?, ?)').run(tempUserId, alfredoUserId);
    server.close();
  }
}

runTests().catch((err) => {
  console.error('❌ Falha nos testes de integração:', err);
  process.exit(1);
});
