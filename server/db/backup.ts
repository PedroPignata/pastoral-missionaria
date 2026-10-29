import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db, initDatabase } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.resolve(__dirname, '../../data');
const backupDir = path.join(dataDir, 'backups');

export function createDatabaseBackup(label = 'pre_migration'): {
  sqliteBackupPath: string;
  jsonBackupPath: string;
  integrity: {
    ordersCount: number;
    membersCount: number;
    totalAmountCents: number;
  };
} {
  initDatabase();

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const sqliteBackupPath = path.join(backupDir, `pastoral_missionaria_${label}_${timestamp}.sqlite`);
  const jsonBackupPath = path.join(backupDir, `pastoral_missionaria_${label}_${timestamp}.json`);

  // Copy SQLite file safely
  const mainDbPath = path.join(dataDir, 'pastoral_missionaria.sqlite');
  if (fs.existsSync(mainDbPath)) {
    fs.copyFileSync(mainDbPath, sqliteBackupPath);
  }

  // Export logical JSON snapshot
  const campaigns = db.prepare('SELECT * FROM campaigns').all();
  const members = db.prepare('SELECT * FROM members').all();
  const orders = db.prepare('SELECT * FROM orders').all();
  const orderItems = db.prepare('SELECT * FROM order_items').all();
  const payments = db.prepare('SELECT * FROM payments').all();
  const integrationSettings = db.prepare('SELECT * FROM integration_settings').all();

  const stats = db.prepare(`
    SELECT
      COUNT(DISTINCT id) as ordersCount,
      COUNT(DISTINCT member_id) as membersCount,
      COALESCE(SUM(total_amount_cents), 0) as totalAmountCents
    FROM orders
    WHERE status != 'cancelado'
  `).get() as any;

  const snapshot = {
    version: '2.0.0-phase1',
    label,
    createdAt: new Date().toISOString(),
    integrity: stats,
    data: {
      campaigns,
      members,
      orders,
      orderItems,
      payments,
      integrationSettings,
    },
  };

  fs.writeFileSync(jsonBackupPath, JSON.stringify(snapshot, null, 2), 'utf-8');

  return {
    sqliteBackupPath,
    jsonBackupPath,
    integrity: stats,
  };
}

if (process.argv[1]?.endsWith('backup.ts') || process.argv[1]?.endsWith('backup.js')) {
  const res = createDatabaseBackup('manual_pre_phase1');
  console.log('✓ Backup concluído com sucesso:', res);
}
