import { db, initDatabase } from './database.js';
import { seedDatabase } from './seed.js';

export function resetToPristineSeed() {
  console.log('Restaurando banco de dados para o estado inicial limpo...');
  db.exec(`
    DELETE FROM sync_logs;
    DELETE FROM sync_jobs;
    DELETE FROM audit_logs;
    DELETE FROM payments;
    DELETE FROM order_items;
    DELETE FROM orders;
    DELETE FROM members;
    DELETE FROM campaigns;
    DELETE FROM users;
    DELETE FROM integration_settings;
  `);

  seedDatabase();
  console.log('✓ Banco de dados restaurado com sucesso para os 19 pedidos originais!');
}

resetToPristineSeed();

