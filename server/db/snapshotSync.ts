import fs from 'fs';
import path from 'path';
import { db } from './database.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const SNAPSHOT_FILE = path.join(DATA_DIR, 'pastoral_auto_snapshot.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const LATEST_BACKUP_FILE = path.join(BACKUP_DIR, 'pastoral_latest_snapshot.json');

export interface FullPlatformSnapshot {
  version: string;
  exported_at: string;
  last_mutation_at: string;
  data: {
    campaigns: any[];
    members: any[];
    orders: any[];
    orderItems: any[];
    payments: any[];
    pastoralMembers: any[];
    calendarEvents: any[];
    labDraws: any[];
    labEvaluations: any[];
    dispatchRequests: any[];
    announcements: any[];
    communityPosts: any[];
    integrationSettings: any[];
    auditLogs: any[];
  };
}

function safeSelectAll(tableName: string, orderBy = ''): any[] {
  try {
    const sql = `SELECT * FROM ${tableName}${orderBy ? ` ORDER BY ${orderBy}` : ''}`;
    return db.prepare(sql).all() as any[];
  } catch {
    return [];
  }
}

export function getLastMutationTimestamp(): string {
  try {
    const candidates: string[] = [];
    const queries = [
      'SELECT MAX(updated_at) as t FROM pastoral_members',
      'SELECT MAX(updated_at) as t FROM orders',
      'SELECT MAX(updated_at) as t FROM payments',
      'SELECT MAX(updated_at) as t FROM calendar_events',
      'SELECT MAX(created_at) as t FROM audit_logs',
    ];
    for (const q of queries) {
      try {
        const row = db.prepare(q).get() as { t?: string } | undefined;
        if (row?.t) candidates.push(row.t);
      } catch {}
    }
    if (candidates.length === 0) return new Date().toISOString();
    candidates.sort();
    return candidates[candidates.length - 1];
  } catch {
    return new Date().toISOString();
  }
}

export function exportFullSnapshot(): FullPlatformSnapshot {
  const now = new Date().toISOString();
  const lastMutationAt = getLastMutationTimestamp();

  return {
    version: '14.0.0',
    exported_at: now,
    last_mutation_at: lastMutationAt,
    data: {
      campaigns: safeSelectAll('campaigns'),
      members: safeSelectAll('members'),
      orders: safeSelectAll('orders'),
      orderItems: safeSelectAll('order_items'),
      payments: safeSelectAll('payments'),
      pastoralMembers: safeSelectAll('pastoral_members'),
      calendarEvents: safeSelectAll('calendar_events'),
      labDraws: safeSelectAll('lab_draws'),
      labEvaluations: safeSelectAll('lab_evaluations'),
      dispatchRequests: safeSelectAll('dispatch_requests'),
      announcements: safeSelectAll('announcements'),
      communityPosts: safeSelectAll('community_posts'),
      integrationSettings: safeSelectAll('integration_settings'),
      auditLogs: safeSelectAll('audit_logs', 'created_at DESC LIMIT 300'),
    },
  };
}

export function saveLocalSnapshot(): FullPlatformSnapshot | null {
  if (process.env.TEST_MODE === 'true') return null;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const snapshot = exportFullSnapshot();
    const serialized = JSON.stringify(snapshot, null, 2);

    const tmpPath = `${SNAPSHOT_FILE}.tmp`;
    fs.writeFileSync(tmpPath, serialized, 'utf-8');
    fs.renameSync(tmpPath, SNAPSHOT_FILE);

    fs.writeFileSync(LATEST_BACKUP_FILE, serialized, 'utf-8');
    return snapshot;
  } catch (err) {
    console.error('⚠️ Erro ao salvar snapshot local automático:', err);
    return null;
  }
}

export function restoreSnapshotData(
  payload: any,
  options: { mergeOnlyNewer?: boolean } = { mergeOnlyNewer: true }
): { restoredCounts: Record<string, number>; lastMutationAt: string } {
  const data = payload?.data || payload || {};
  const mergeOnlyNewer = options.mergeOnlyNewer !== false;
  const now = new Date().toISOString();

  const restoredCounts: Record<string, number> = {
    pastoralMembers: 0,
    members: 0,
    orders: 0,
    payments: 0,
    calendarEvents: 0,
    labDraws: 0,
    announcements: 0,
  };

  const transaction = db.transaction(() => {
    // 1. Reconcile pastoral_members
    if (Array.isArray(data.pastoralMembers)) {
      for (const pm of data.pastoralMembers) {
        if (!pm || !pm.name) continue;
        let existing = db.prepare('SELECT * FROM pastoral_members WHERE id = ?').get(pm.id) as any;
        if (!existing) {
          existing = db
            .prepare(
              'SELECT * FROM pastoral_members WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) OR LOWER(TRIM(display_name)) = LOWER(TRIM(?))'
            )
            .get(pm.name, pm.display_name || pm.name) as any;
        }

        const incomingQuals =
          typeof pm.qualifications_json === 'string'
            ? pm.qualifications_json
            : Array.isArray(pm.qualifications)
            ? JSON.stringify(pm.qualifications)
            : null;

        if (existing) {
          const shouldUpdate =
            !mergeOnlyNewer ||
            !existing.updated_at ||
            (pm.updated_at && pm.updated_at > existing.updated_at);

          if (shouldUpdate) {
            db.prepare(`
              UPDATE pastoral_members
              SET name = COALESCE(?, name),
                  display_name = COALESCE(?, display_name),
                  email = COALESCE(?, email),
                  phone = COALESCE(?, phone),
                  status = COALESCE(?, status),
                  pastoral_role = COALESCE(?, pastoral_role),
                  qualifications_json = COALESCE(?, qualifications_json),
                  birth_day = COALESCE(?, birth_day),
                  birth_month = COALESCE(?, birth_month),
                  birth_year = COALESCE(?, birth_year),
                  birthday_visibility = COALESCE(?, birthday_visibility),
                  phone_visibility = COALESCE(?, phone_visibility),
                  notes = COALESCE(?, notes),
                  updated_at = ?
              WHERE id = ?
            `).run(
              pm.name || null,
              pm.display_name || null,
              pm.email || null,
              pm.phone || null,
              pm.status || null,
              pm.pastoral_role || null,
              incomingQuals,
              pm.birth_day ?? null,
              pm.birth_month ?? null,
              pm.birth_year ?? null,
              pm.birthday_visibility || null,
              pm.phone_visibility || null,
              pm.notes ?? null,
              pm.updated_at || now,
              existing.id
            );
            restoredCounts.pastoralMembers++;
          }
        } else if (pm.id) {
          db.prepare(`
            INSERT OR IGNORE INTO pastoral_members (
              id, user_id, buyer_member_id, name, display_name, email, phone, status, pastoral_role,
              joined_at, qualifications_json, skills_json, availability_json, welcome_checklist_json,
              created_at, updated_at, birth_day, birth_month, birth_year, birthday_visibility, phone_visibility, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '{}', '{}', ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            pm.id,
            pm.user_id || null,
            pm.buyer_member_id || null,
            pm.name,
            pm.display_name || pm.name.split(' ')[0],
            pm.email || null,
            pm.phone || null,
            pm.status || 'ativo',
            pm.pastoral_role || 'membro',
            pm.joined_at || '2026-01-01',
            incomingQuals || '[]',
            pm.skills_json || '[]',
            pm.created_at || now,
            pm.updated_at || now,
            pm.birth_day ?? null,
            pm.birth_month ?? null,
            pm.birth_year ?? null,
            pm.birthday_visibility || 'members',
            pm.phone_visibility || 'directory',
            pm.notes ?? null
          );
          restoredCounts.pastoralMembers++;
        }
      }
    }

    // 2. Reconcile buyer members
    if (Array.isArray(data.members)) {
      for (const m of data.members) {
        if (!m || !m.name) continue;
        let existing = db.prepare('SELECT * FROM members WHERE id = ?').get(m.id) as any;
        if (!existing) {
          existing = db
            .prepare('SELECT * FROM members WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))')
            .get(m.name) as any;
        }
        if (existing) {
          const shouldUpdate =
            !mergeOnlyNewer ||
            !existing.updated_at ||
            (m.updated_at && m.updated_at > existing.updated_at);
          if (shouldUpdate) {
            db.prepare(`
              UPDATE members
              SET name = COALESCE(?, name),
                  display_name = COALESCE(?, display_name),
                  phone = COALESCE(NULLIF(?, ''), phone),
                  notes = COALESCE(?, notes),
                  active = COALESCE(?, active),
                  updated_at = ?
              WHERE id = ?
            `).run(
              m.name || null,
              m.display_name || null,
              m.phone || '',
              m.notes ?? null,
              m.active ?? 1,
              m.updated_at || now,
              existing.id
            );
            restoredCounts.members++;
          }
        }
      }
    }

    // 3. Reconcile payments (matching by payment ID or member name + date)
    if (Array.isArray(data.payments)) {
      const incomingOrders = Array.isArray(data.orders) ? data.orders : [];
      const incomingMembers = Array.isArray(data.members) ? data.members : [];

      for (const pay of data.payments) {
        if (!pay || !pay.id) continue;

        let targetOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(pay.order_id) as any;
        if (!targetOrder) {
          // Resolve order via member name if order_id came from a different seed run
          const snapOrder = incomingOrders.find((o: any) => o.id === pay.order_id);
          const snapMember =
            incomingMembers.find((m: any) => m.id === pay.member_id || m.id === snapOrder?.member_id);
          const lookupName = pay.member_name || snapOrder?.member_name || snapMember?.name;
          if (lookupName) {
            const dbMem = db
              .prepare(
                'SELECT id FROM members WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) OR LOWER(TRIM(display_name)) = LOWER(TRIM(?))'
              )
              .get(lookupName, lookupName) as any;
            if (dbMem) {
              targetOrder = db.prepare('SELECT * FROM orders WHERE member_id = ?').get(dbMem.id) as any;
            }
          }
        }

        if (!targetOrder) continue;

        const existingPay = db.prepare('SELECT * FROM payments WHERE id = ?').get(pay.id) as any;
        if (!existingPay) {
          db.prepare(`
            INSERT INTO payments (
              id, order_id, member_id, amount_cents, payment_date, payment_method,
              recorded_by, notes, is_reversed, reversal_reason, reversed_at, reversed_by,
              created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            pay.id,
            targetOrder.id,
            targetOrder.member_id,
            pay.amount_cents || 4500,
            pay.payment_date || now.split('T')[0],
            pay.payment_method || 'pix',
            pay.recorded_by || 'Coordenação',
            pay.notes || '',
            pay.is_reversed ? 1 : 0,
            pay.reversal_reason || null,
            pay.reversed_at || null,
            pay.reversed_by || null,
            pay.created_at || now,
            pay.updated_at || now
          );
          restoredCounts.payments++;
        } else if (pay.is_reversed && !existingPay.is_reversed) {
          db.prepare(`
            UPDATE payments
            SET is_reversed = 1,
                reversal_reason = COALESCE(?, reversal_reason),
                reversed_at = COALESCE(?, reversed_at),
                reversed_by = COALESCE(?, reversed_by),
                updated_at = ?
            WHERE id = ?
          `).run(
            pay.reversal_reason || 'Estornado',
            pay.reversed_at || now,
            pay.reversed_by || 'Coordenação',
            pay.updated_at || now,
            pay.id
          );
          restoredCounts.payments++;
        }
      }
    }

    // 4. Reconcile orders (production_status, delivery_status, notes) & recalculate balances
    if (Array.isArray(data.orders)) {
      const incomingMembers = Array.isArray(data.members) ? data.members : [];
      for (const ord of data.orders) {
        if (!ord) continue;
        let existingOrd = db.prepare('SELECT * FROM orders WHERE id = ?').get(ord.id) as any;
        if (!existingOrd) {
          const snapMem = incomingMembers.find((m: any) => m.id === ord.member_id);
          const lookupName = ord.member_name || snapMem?.name;
          if (lookupName) {
            const dbMem = db
              .prepare(
                'SELECT id FROM members WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) OR LOWER(TRIM(display_name)) = LOWER(TRIM(?))'
              )
              .get(lookupName, lookupName) as any;
            if (dbMem) {
              existingOrd = db.prepare('SELECT * FROM orders WHERE member_id = ?').get(dbMem.id) as any;
            }
          }
        }
        if (existingOrd) {
          const shouldUpdate =
            !mergeOnlyNewer ||
            !existingOrd.updated_at ||
            (ord.updated_at && ord.updated_at > existingOrd.updated_at);
          if (shouldUpdate) {
            db.prepare(`
              UPDATE orders
              SET production_status = COALESCE(?, production_status),
                  delivery_status = COALESCE(?, delivery_status),
                  delivery_date = COALESCE(?, delivery_date),
                  delivered_to = COALESCE(?, delivered_to),
                  delivery_notes = COALESCE(?, delivery_notes),
                  updated_at = ?
              WHERE id = ?
            `).run(
              ord.production_status || null,
              ord.delivery_status || null,
              ord.delivery_date || null,
              ord.delivered_to || null,
              ord.delivery_notes || null,
              ord.updated_at || now,
              existingOrd.id
            );
            restoredCounts.orders++;
          }
        }
      }
    }

    // Always recalculate order payment totals from valid non-reversed payments
    const allOrders = db.prepare("SELECT id, total_amount_cents FROM orders WHERE status != 'cancelado'").all() as any[];
    for (const ord of allOrders) {
      const sumRow = db
        .prepare('SELECT COALESCE(SUM(amount_cents), 0) as paid FROM payments WHERE order_id = ? AND is_reversed = 0')
        .get(ord.id) as { paid: number };
      const paidCents = Math.min(ord.total_amount_cents, sumRow.paid || 0);
      const balanceCents = Math.max(0, ord.total_amount_cents - paidCents);
      const payStatus = balanceCents === 0 ? 'pago' : paidCents > 0 ? 'parcial' : 'pendente';

      db.prepare(`
        UPDATE orders
        SET paid_amount_cents = ?,
            balance_cents = ?,
            payment_status = ?
        WHERE id = ?
      `).run(paidCents, balanceCents, payStatus, ord.id);
    }

    // 5. Reconcile calendar_events
    if (Array.isArray(data.calendarEvents)) {
      for (const ev of data.calendarEvents) {
        if (!ev || !ev.id || !ev.title || !ev.event_date) continue;
        const existingEv = db.prepare('SELECT * FROM calendar_events WHERE id = ?').get(ev.id) as any;
        if (!existingEv) {
          db.prepare(`
            INSERT OR IGNORE INTO calendar_events (
              id, external_stable_id, title, description, event_date, end_date, event_time,
              location, category, status, visibility, responsibles_json, materials_json,
              notes, source, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            ev.id,
            ev.external_stable_id || ev.id,
            ev.title,
            ev.description || null,
            ev.event_date,
            ev.end_date || null,
            ev.event_time || null,
            ev.location || null,
            ev.category || 'Outros',
            ev.status || 'Confirmado',
            ev.visibility || 'publico',
            ev.responsibles_json || '[]',
            ev.materials_json || '[]',
            ev.notes || null,
            ev.source || 'Manual',
            ev.created_at || now,
            ev.updated_at || now
          );
          restoredCounts.calendarEvents++;
        } else if (!mergeOnlyNewer || (ev.updated_at && ev.updated_at > existingEv.updated_at)) {
          db.prepare(`
            UPDATE calendar_events
            SET title = ?, description = ?, event_date = ?, end_date = ?, event_time = ?,
                location = ?, category = ?, status = ?, visibility = ?, responsibles_json = ?,
                notes = ?, updated_at = ?
            WHERE id = ?
          `).run(
            ev.title,
            ev.description ?? existingEv.description,
            ev.event_date,
            ev.end_date ?? existingEv.end_date,
            ev.event_time ?? existingEv.event_time,
            ev.location ?? existingEv.location,
            ev.category || existingEv.category,
            ev.status || existingEv.status,
            ev.visibility || existingEv.visibility,
            ev.responsibles_json || existingEv.responsibles_json,
            ev.notes ?? existingEv.notes,
            ev.updated_at || now,
            ev.id
          );
          restoredCounts.calendarEvents++;
        }
      }
    }

    // 6. Reconcile lab_draws
    if (Array.isArray(data.labDraws)) {
      for (const ld of data.labDraws) {
        if (!ld || !ld.id) continue;
        const existingLd = db.prepare('SELECT * FROM lab_draws WHERE id = ?').get(ld.id) as any;
        if (!existingLd) {
          db.prepare(`
            INSERT OR IGNORE INTO lab_draws (
              id, laboratory_date, laboratory_name, coordinator_name, draw_date, duration_minutes,
              participants_count, participants_json, groups_json, rules_json, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            ld.id,
            ld.laboratory_date || 'A definir',
            ld.laboratory_name || 'Laboratório de Pregação',
            ld.coordinator_name || 'Coordenação',
            ld.draw_date || now.split('T')[0],
            ld.duration_minutes || 20,
            ld.participants_count || 0,
            ld.participants_json || '[]',
            ld.groups_json || '[]',
            ld.rules_json || '{}',
            ld.status || 'ativo',
            ld.created_at || now,
            ld.updated_at || now
          );
          restoredCounts.labDraws++;
        }
      }
    }
  });

  transaction();
  saveLocalSnapshot();

  return {
    restoredCounts,
    lastMutationAt: getLastMutationTimestamp(),
  };
}

export function autoRestoreOnStartup() {
  try {
    if (fs.existsSync(SNAPSHOT_FILE)) {
      const raw = fs.readFileSync(SNAPSHOT_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      restoreSnapshotData(parsed, { mergeOnlyNewer: true });
      console.log('✓ Snapshot local reconciliado com sucesso na inicialização.');
    } else {
      saveLocalSnapshot();
    }
  } catch (err) {
    console.error('⚠️ Aviso ao reconciliar snapshot inicial:', err);
  }
}
