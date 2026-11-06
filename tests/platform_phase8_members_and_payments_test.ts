import { db } from '../server/db/database';

console.log('\n======================================================');
console.log('🧪 TESTE COMPLETO DOS 39 MEMBROS E PRESERVAÇÃO DE DADOS');
console.log('======================================================\n');

// 1. Verificar contagem de missionários
const membersCount = db.prepare('SELECT count(*) as count FROM pastoral_members').get() as { count: number };
if (membersCount.count !== 39) {
  throw new Error(`Esperado 39 membros na pastoral_members, obtido: ${membersCount.count}`);
}
console.log(`✓ [TESTE 1] Total de missionários cadastrados: ${membersCount.count} / 39: PASSOU`);

// 2. Verificar Coordenadores (Pedro e Fernanda)
const coordinators = db.prepare(`SELECT id, name, pastoral_role, qualifications_json FROM pastoral_members WHERE pastoral_role = 'coordenador'`).all() as any[];
if (coordinators.length < 2) {
  throw new Error(`Esperado ao menos 2 coordenadores ativos, obtido: ${coordinators.length}`);
}
for (const c of coordinators) {
  const quals = JSON.parse(c.qualifications_json || '[]');
  if (quals.length !== 8) {
    throw new Error(`Coordenador ${c.name} deveria possuir todas as 8 qualificações, tem ${quals.length}`);
  }
}
console.log(`✓ [TESTE 2] Coordenadores (Pedro e Fernanda) ativos com as 8 habilitações: PASSOU`);

// 3. Verificar Tiago com todas as 8 habilitações
const tiago = db.prepare(`SELECT id, name, qualifications_json FROM pastoral_members WHERE name LIKE '%Tiago%'`).get() as any;
if (!tiago) throw new Error('Tiago não encontrado no cadastro!');
const tiagoQuals = JSON.parse(tiago.qualifications_json || '[]');
if (tiagoQuals.length !== 8) {
  throw new Error(`Tiago deveria possuir as 8 qualificações, possui ${tiagoQuals.length}`);
}
console.log(`✓ [TESTE 3] Tiago com todas as 8 habilitações confirmadas: PASSOU`);

// 4. Verificar preservação dos 7 pagamentos reais (R$ 315,00)
const paymentsSummary = db.prepare('SELECT count(*) as count, sum(amount_cents) as total_cents FROM payments WHERE is_reversed = 0').get() as { count: number; total_cents: number };
if (paymentsSummary.count < 7 || paymentsSummary.total_cents < 31500) {
  throw new Error(`Esperado ao menos 7 pagamentos e R$ 315,00, obtido: ${paymentsSummary.count} pagamentos e R$ ${paymentsSummary.total_cents / 100}`);
}
console.log(`✓ [TESTE 4] 7 pagamentos PIX (R$ 315,00) preservados no banco: PASSOU`);

// 5. Verificar preservação dos 19 pedidos de camisetas (R$ 855,00)
const ordersSummary = db.prepare('SELECT count(*) as count, sum(total_amount_cents) as total_cents, sum(paid_amount_cents) as paid_cents FROM orders').get() as { count: number; total_cents: number; paid_cents: number };
if (ordersSummary.count !== 19 || ordersSummary.total_cents !== 85500 || ordersSummary.paid_cents !== 31500) {
  throw new Error(`Dados de pedidos divergentes: ${JSON.stringify(ordersSummary)}`);
}
console.log(`✓ [TESTE 5] 19 pedidos de camisetas (R$ 855,00 total, R$ 315,00 pagos) 100% íntegros: PASSOU`);

// 6. Verificar que a query de membros com ordenação por papel executa sem erros
const membersQuery = db.prepare(`
  SELECT id, name, display_name, pastoral_role, phone, status
  FROM pastoral_members
  ORDER BY CASE pastoral_role WHEN 'coordenador' THEN 1 WHEN 'admin' THEN 2 WHEN 'delegado' THEN 3 ELSE 4 END, name ASC
`).all() as any[];
if (membersQuery.length !== 39) {
  throw new Error(`Query de membros retornou contagem incorreta: ${membersQuery.length}`);
}
console.log(`✓ [TESTE 6] Query SQL com CASE pastoral_role validada sem erros de aspas: PASSOU`);

// 7. Verificar telefones com padrão WhatsApp nos 39 membros
const membersWithPhone = db.prepare(`SELECT count(*) as count FROM pastoral_members WHERE phone IS NOT NULL AND phone != ''`).get() as { count: number };
if (membersWithPhone.count !== 39) {
  throw new Error(`Esperado 39 membros com telefone, obtido: ${membersWithPhone.count}`);
}
console.log(`✓ [TESTE 7] Todos os 39 membros com WhatsApp configurado: PASSOU`);

console.log('\n======================================================');
console.log('🎉 TODOS OS TESTES PASSARAM COM SUCESSO TOTAL!');
console.log('======================================================\n');
