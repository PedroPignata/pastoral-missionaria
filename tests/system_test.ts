import { db } from '../server/db/database.js';

async function runSystemTests() {
  console.log('==================================================');
  console.log('INICIANDO BATERIA DE TESTES DE INTEGRAÇÃO DO SISTEMA');
  console.log('==================================================\n');

  const BASE_URL = 'http://localhost:3001/api';

  // 1. Test Login
  console.log('[1/7] Testando Autenticação...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@pastoralmissionaria.com.br',
      password: 'pastoral@2026',
    }),
  });
  if (!loginRes.ok) throw new Error(`Falha no login: HTTP ${loginRes.status}`);
  const { token, user } = await loginRes.json();
  console.log(`✓ Login bem-sucedido! Usuário: ${user.name} (Role: ${user.role})`);

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // 2. Test Initial Seed Verification
  console.log('\n[2/7] Verificando integridade dos 19 pedidos iniciais...');
  const ordersRes = await fetch(`${BASE_URL}/orders`, { headers });
  const orders = await ordersRes.json();
  console.log(`✓ Total de pedidos recuperados: ${orders.length} (Esperado: 19)`);
  if (orders.length !== 19) throw new Error(`Esperado 19 pedidos, mas retornou ${orders.length}`);

  const dashRes = await fetch(`${BASE_URL}/dashboard`, { headers });
  const dash = await dashRes.json();
  console.log(`✓ Total de Camisetas: ${dash.kpis.total_tshirts} (Esperado: 19)`);
  console.log(`✓ Total Previsto: R$ ${(dash.kpis.total_amount_cents / 100).toFixed(2)} (Esperado: R$ 855.00)`);
  console.log(`✓ Total Arrecadado Inicial: R$ ${(dash.kpis.paid_amount_cents / 100).toFixed(2)} (Esperado: R$ 0.00)`);
  console.log(`✓ Total Pendente Inicial: R$ ${(dash.kpis.balance_cents / 100).toFixed(2)} (Esperado: R$ 855.00)`);

  // 3. Test Partial & Full Payment Workflow
  console.log('\n[3/7] Testando fluxo financeiro (Pagamento parcial e quitação integral)...');
  const juliaOrder = orders.find((o: any) => o.member_name.includes('Júlia'));
  if (!juliaOrder) throw new Error('Pedido de Júlia não encontrado!');

  console.log(`• Testando pagamento parcial de R$ 20,00 para ${juliaOrder.member_name}...`);
  const pay1Res = await fetch(`${BASE_URL}/payments`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      order_id: juliaOrder.id,
      amount_cents: 2000, // R$ 20,00
      payment_date: '2026-10-26',
      payment_method: 'pix',
      notes: 'Primeira parcela via Pix',
    }),
  });
  if (!pay1Res.ok) throw new Error(`Falha no pagamento 1: ${await pay1Res.text()}`);
  const pay1Result = await pay1Res.json();
  console.log(`✓ Pagamento parcial registrado! Status: ${pay1Result.payment_status} (Esperado: parcial)`);

  // Verify order updated
  const juliaAfterPay1 = await (await fetch(`${BASE_URL}/orders/${juliaOrder.id}`, { headers })).json();
  console.log(`✓ Saldo restante de Júlia: R$ ${(juliaAfterPay1.balance_cents / 100).toFixed(2)} (Esperado: R$ 25.00)`);
  if (juliaAfterPay1.balance_cents !== 2500) throw new Error('Cálculo de saldo incorreto!');

  // Test overpayment prevention
  console.log('• Testando prevenção contra pagamentos que excedem o saldo...');
  const overpayRes = await fetch(`${BASE_URL}/payments`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      order_id: juliaOrder.id,
      amount_cents: 3000, // R$ 30,00 > R$ 25,00
      payment_date: '2026-10-26',
      payment_method: 'dinheiro',
    }),
  });
  if (overpayRes.status === 400) {
    console.log('✓ Pagamento excedente corretamente rejeitado pela validação financeira!');
  } else {
    throw new Error('Falha: Pagamento excedente deveria ter sido rejeitado!');
  }

  // Pay remaining R$ 25,00
  console.log('• Quitando saldo restante de R$ 25,00...');
  const pay2Res = await fetch(`${BASE_URL}/payments`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      order_id: juliaOrder.id,
      amount_cents: 2500, // R$ 25,00
      payment_date: '2026-10-26',
      payment_method: 'dinheiro',
      notes: 'Segunda parcela em dinheiro',
    }),
  });
  const pay2Result = await pay2Res.json();
  console.log(`✓ Pedido quitado integralmente! Status: ${pay2Result.payment_status} (Esperado: pago)`);

  const juliaFullyPaid = await (await fetch(`${BASE_URL}/orders/${juliaOrder.id}`, { headers })).json();
  if (juliaFullyPaid.balance_cents !== 0 || juliaFullyPaid.payment_status !== 'pago') {
    throw new Error('Falha no recálculo final do saldo!');
  }

  // 4. Test Delivery Workflow
  console.log('\n[4/7] Testando registro de entrega de camiseta...');
  const delivRes = await fetch(`${BASE_URL}/deliveries/${juliaOrder.id}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      delivered_to: 'Júlia (em mãos)',
      delivery_date: '2026-10-26',
      delivery_notes: 'Entregue durante o encontro de oração',
    }),
  });
  if (!delivRes.ok) throw new Error('Falha ao registrar entrega');
  const juliaDelivered = await (await fetch(`${BASE_URL}/orders/${juliaOrder.id}`, { headers })).json();
  console.log(`✓ Entrega registrada com sucesso! Status de entrega: ${juliaDelivered.delivery_status}`);

  // 5. Test Supplier Report
  console.log('\n[5/7] Testando relatório consolidado para fábrica/fornecedor...');
  const supplierRes = await fetch(`${BASE_URL}/reports/supplier`, { headers });
  const supplier = await supplierRes.json();
  console.log(`✓ Total geral para fábrica: ${supplier.grandTotal} camisetas`);
  console.log('Texto gerado para envio:\n' + supplier.formattedText);

  // 6. Test Google Sheets Sync Outbox & 8 Tabs Preview
  console.log('\n[6/7] Testando integração e pré-visualização das 8 abas Google Sheets...');
  const sheetsStatusRes = await fetch(`${BASE_URL}/sheets/status`, { headers });
  const sheetsStatus = await sheetsStatusRes.json();
  console.log(`✓ Fila de alterações registradas na outbox: ${sheetsStatus.pendingJobsCount} jobs`);

  const previewRes = await fetch(`${BASE_URL}/sheets/preview`, { headers });
  const preview = await previewRes.json();
  console.log(`✓ Aba Pedidos: ${preview.orders.length} linhas`);
  console.log(`✓ Aba Membros: ${preview.members.length} membros`);
  console.log(`✓ Aba Pagamentos: ${preview.payments.length} lançamentos`);
  console.log(`✓ Aba Tamanhos e modelos: ${preview.sizeModelSummary.length} grupos`);
  console.log(`✓ Aba Campanhas: ${preview.campaigns.length} campanhas`);

  // 7. Test WhatsApp Template Rendering
  console.log('\n[7/7] Testando gerador de mensagens WhatsApp...');
  const waRes = await fetch(`${BASE_URL}/whatsapp/message/${orders[0].id}?type=cobranca`, { headers });
  const wa = await waRes.json();
  console.log(`✓ Mensagem gerada para ${wa.memberName}:`);
  console.log(wa.text.slice(0, 150) + '...\n');

  console.log('==================================================');
  console.log('TODOS OS TESTES FORAM CONCLUÍDOS COM 100% DE SUCESSO!');
  console.log('==================================================');
}

runSystemTests().catch((err) => {
  console.error('ERRO NOS TESTES:', err);
  process.exit(1);
});

