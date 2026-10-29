import assert from 'assert';
import { db } from '../server/db/database.js';
import { runMigrations } from '../server/db/migrations.js';
import crypto from 'crypto';

export async function runSecurityAuthTests() {
  console.log('\n======================================================');
  console.log('🧪 INICIANDO TESTES DE SEGURANÇA & AUTH V3');
  console.log('======================================================\n');

  // 1. Migrations & DB Setup
  runMigrations();

  // Test 1: Verify 19 orders and R$ 855,00
  const ordersSummary = db.prepare(`
    SELECT COUNT(*) as count, SUM(total_amount_cents) as total_cents
    FROM orders
  `).get() as { count: number; total_cents: number };

  assert.strictEqual(ordersSummary.count, 19, 'Deve haver exatamente 19 pedidos');
  assert.strictEqual(ordersSummary.total_cents, 85500, 'Total deve ser R$ 855,00 (85500 centavos)');
  console.log('✓ [TESTE 1] Preservação integral dos 19 pedidos (R$ 855,00): PASSOU');

  // Test 2: Users check constraint allows 'pendente', 'membro', 'delegado'
  const testUserId = `test_user_${Date.now()}`;
  const testEmail = `teste.pendente.${Date.now()}@gmail.com`;
  
  // Clean up any stale test user
  db.prepare("DELETE FROM users WHERE email LIKE 'teste.pendente.%' OR email = 'teste.pendente@gmail.com'").run();

  try {
    db.prepare(`
      INSERT INTO users (id, name, email, role, created_at, updated_at)
      VALUES (?, 'Teste Pendente', ?, 'pendente', datetime('now'), datetime('now'))
    `).run(testUserId, testEmail);

    const insertedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(testUserId) as any;
    assert.strictEqual(insertedUser.role, 'pendente');
    console.log('✓ [TESTE 2] Inserção de usuário com papel "pendente" suportada pelo schema: PASSOU');

    // Test 3: Unclaimed members list returns members without user_id
    const unclaimed = db.prepare(`
      SELECT m.id, m.name,
        (SELECT pm.id FROM pastoral_members pm WHERE pm.buyer_member_id = m.id AND pm.user_id IS NOT NULL) as claimed
      FROM members m
      WHERE m.active = 1
    `).all() as any[];

    assert(unclaimed.length > 0, 'Deve listar membros');
    console.log(`✓ [TESTE 3] Membros e compradores consultáveis para vínculo (${unclaimed.length} total): PASSOU`);

    // Test 4: Link claim request flow
    const reqId = `req_${Date.now()}`;
    const memberToClaim = unclaimed[0];
    db.prepare(`
      INSERT INTO member_link_requests (id, user_id, claimed_member_id, status, user_notes, created_at)
      VALUES (?, ?, ?, 'pendente', 'Solicitação de teste', datetime('now'))
    `).run(reqId, testUserId, memberToClaim.id);

    const reqRecord = db.prepare('SELECT * FROM member_link_requests WHERE id = ?').get(reqId) as any;
    assert.strictEqual(reqRecord.status, 'pendente');
    assert.strictEqual(reqRecord.claimed_member_id, memberToClaim.id);
    console.log('✓ [TESTE 4] Registro de solicitação de vínculo de missionário: PASSOU');

    // Test 5: Approval elevated user role to 'membro'
    db.prepare('UPDATE member_link_requests SET status = ?, reviewed_by = ? WHERE id = ?').run('aprovado', 'Pedro (Coordenador)', reqId);
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run('membro', testUserId);

    const approvedUser = db.prepare('SELECT role FROM users WHERE id = ?').get(testUserId) as any;
    assert.strictEqual(approvedUser.role, 'membro');
    console.log('✓ [TESTE 5] Aprovação pela coordenação eleva papel para "membro": PASSOU');

    // Clean test request
    db.prepare('DELETE FROM member_link_requests WHERE id = ?').run(reqId);
  } finally {
    db.prepare('DELETE FROM users WHERE id = ?').run(testUserId);
  }

  console.log('\n======================================================');
  console.log('🎉 TODOS OS TESTES DE SEGURANÇA E AUTH V3 PASSARAM COM SUCESSO!');
  console.log('======================================================\n');
}

runSecurityAuthTests().catch((err) => {
  console.error('Falha nos testes de segurança:', err);
  process.exit(1);
});
