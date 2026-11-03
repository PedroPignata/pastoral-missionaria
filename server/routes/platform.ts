import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/database.js';
import { authenticateToken, requireRole, AuthenticatedRequest } from './auth.js';
import { CALENDAR_2027_SEED, seedEcosystemData } from '../db/migrations.js';
import { createDatabaseBackup } from '../db/backup.js';
import { getHolidaysForYear } from '../services/holidaysService.js';

export const platformRouter = Router();

// 1. GET /api/platform/public-info (No Auth Required — Public Institutional Portal)
platformRouter.get('/public-info', (_req: Request, res: Response) => {
  const settingsRow = db.prepare('SELECT value_json FROM integration_settings WHERE key = ?').get('institutional') as any;
  const institutional = settingsRow ? JSON.parse(settingsRow.value_json) : {};

  const publicEvents = db.prepare(`
    SELECT id, title, description, event_date, event_time, location, category, status
    FROM calendar_events
    WHERE visibility = 'publico' AND status != 'Cancelado'
    ORDER BY event_date ASC
  `).all();

  const templates = db.prepare(`
    SELECT id, slug, title, target_audience, objective, suggested_theme, schedule_json, teams_json, guidelines, source_reference
    FROM event_templates
    ORDER BY title ASC
  `).all().map((t: any) => ({
    ...t,
    schedule: JSON.parse(t.schedule_json || '[]'),
    teams: JSON.parse(t.teams_json || '[]'),
  }));

  const coordinators = db.prepare(`
    SELECT coordinator_name, role_title, started_at
    FROM coordination_succession
    WHERE status = 'ativo'
    ORDER BY started_at ASC
  `).all();

  return res.json({
    institutional: {
      pastoral_name: institutional.pastoral_name || 'Pastoral Missionária',
      movement_name: institutional.movement_name || 'Ágape Apostolado de Jovens',
      parish_name: institutional.parish_name || 'Paróquia São Vicente de Paulo',
      location: institutional.location || 'Planaltina - DF',
      patron: 'São Padre Pio de Pietrelcina',
      patron_feast: '23 de Setembro',
      patron_bio:
        'São Padre Pio de Pietrelcina nasceu em 25 de maio de 1887, na Itália. Sacerdote capuchinho, viveu profundamente unido a Cristo Crucificado, recebeu os estigmas da Paixão, dedicou-se ao sacramento da Confissão, fundou a Casa Alívio do Sofrimento e criou grupos de oração. Canonizado em 2002 por São João Paulo II, é o padroeiro e intercessor principal da Pastoral Missionária.',
      quote_1: 'Tenha Jesus Cristo em seu coração, e todas as cruzes do mundo parecerão rosas.',
      quote_2: 'Uma só coisa é necessária: Estar perto de Jesus.',
      prayer_title: 'Oração de São Pio de Pietrelcina (Fica Comigo, Senhor)',
      prayer_excerpt:
        'Fica comigo, Senhor! Fica Senhor comigo, pois preciso da Tua presença para não te esquecer. Sabes quão facilmente posso te abandonar. Fica Senhor comigo, porque sou fraco e preciso da Tua força para não cair. Fica Senhor comigo, porque és minha vida, e sem Ti perco o fervor...',
      goals: [
        '1. Evangelizar com ardor a todas as pessoas e em todos os lugares, através da Palavra, do Ensino e da Oração.',
        '2. Acompanhar o Ágape Discipulado da paróquia, colocando-se à disposição para auxiliar nas reuniões e encontros.',
        '3. Implantar o Ágape Discipulado de maneira integral nas regiões escolhidas pela Arquidiocese (acompanhamento mínimo de 2 anos).',
        '4. Auxiliar as demais pastorais e grupos da Paróquia, em especial à Pastoral da Catequese.',
        '5. Realizar trabalhos de Evangelização Porta a Porta, levando Cristo a todas as famílias da comunidade.',
        '6. Trabalhar em conjunto com a Pastoral da Misericórdia na formação de novos servos e projetos.',
      ],
    },
    coordinators,
    publicEvents,
    templates,
  });
});

// 2. GET /api/platform/overview (Authenticated Dashboard for Members & Coordinators)
platformRouter.get('/overview', authenticateToken, (_req: AuthenticatedRequest, res: Response) => {
  const upcomingEvents = db.prepare(`
    SELECT * FROM calendar_events
    WHERE status != 'Cancelado'
    ORDER BY event_date ASC
    LIMIT 6
  `).all();

  const announcements = db.prepare(`
    SELECT * FROM announcements
    ORDER BY pinned DESC, created_at DESC
    LIMIT 5
  `).all();

  const coordinators = db.prepare(`
    SELECT * FROM coordination_succession
    WHERE status = 'ativo'
  `).all();

  const counts = {
    calendarEvents2027: (db.prepare('SELECT COUNT(*) as c FROM calendar_events').get() as any).c,
    labThemes: (db.prepare('SELECT COUNT(*) as c FROM lab_themes WHERE active = 1').get() as any).c,
    labEvaluations: (db.prepare('SELECT COUNT(*) as c FROM lab_evaluations').get() as any).c,
    pendingDispatches: (db.prepare("SELECT COUNT(*) as c FROM dispatch_requests WHERE status = 'Aguardando análise'").get() as any).c,
    totalDispatches: (db.prepare('SELECT COUNT(*) as c FROM dispatch_requests').get() as any).c,
    pastoralMembers: (db.prepare("SELECT COUNT(*) as c FROM pastoral_members WHERE status = 'ativo'").get() as any).c,
    templates: (db.prepare('SELECT COUNT(*) as c FROM event_templates').get() as any).c,
  };

  return res.json({
    upcomingEvents,
    announcements,
    coordinators,
    counts,
  });
});

// 3. CALENDAR ROUTES (/api/platform/calendar)
platformRouter.get('/calendar', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { category, month, status, year, include_birthdays = 'true', include_holidays = 'false' } = req.query;
  let sql = 'SELECT * FROM calendar_events WHERE 1=1';
  const params: any[] = [];

  if (category && category !== 'Todas') {
    sql += ' AND category = ?';
    params.push(category);
  }
  if (status && status !== 'Todos') {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (month && typeof month === 'string' && month.length === 2) {
    sql += " AND strftime('%m', event_date) = ?";
    params.push(month);
  }
  if (year && typeof year === 'string' && year.length === 4) {
    sql += " AND strftime('%Y', event_date) = ?";
    params.push(year);
  }

  sql += ' ORDER BY event_date ASC';
  const dbEvents = db.prepare(sql).all(...params).map((ev: any) => ({
    ...ev,
    responsibles: JSON.parse(ev.responsibles_json || '[]'),
    materials: JSON.parse(ev.materials_json || '[]'),
    is_birthday: false,
    is_holiday: false,
  }));

  const allowBirthdays =
    include_birthdays !== 'false' &&
    (!category || category === 'Todas' || category === 'Outros' || category === 'Aniversários') &&
    (!status || status === 'Todos' || status === 'Confirmado');

  let birthdayEvents: any[] = [];
  if (allowBirthdays) {
    const isCoordinator = req.user?.role === 'admin' || req.user?.role === 'coordenador';
    const targetYears = year && typeof year === 'string' && year.length === 4 ? [Number(year)] : [2025, 2026, 2027, 2028];

    const membersWithBday = db.prepare(`
      SELECT id, name, display_name, pastoral_role, status, email, birth_day, birth_month, birth_year, birthday_visibility, created_at, updated_at
      FROM pastoral_members
      WHERE status != 'inativo' AND birth_day IS NOT NULL AND birth_month IS NOT NULL
    `).all() as any[];

    for (const y of targetYears) {
      for (const m of membersWithBday) {
        if (m.birthday_visibility === 'private' && m.email !== req.user?.email) continue;
        if (m.birthday_visibility === 'coordinators_only' && !isCoordinator && m.email !== req.user?.email) continue;
        if (month && typeof month === 'string' && Number(month) !== m.birth_month) continue;

        const dateStr = `${y}-${String(m.birth_month).padStart(2, '0')}-${String(m.birth_day).padStart(2, '0')}`;
        birthdayEvents.push({
          id: `bday_${m.id}_${y}`,
          external_stable_id: `bday_${m.id}_${y}`,
          title: `🎂 Aniversário: ${m.display_name}`,
          description: `Comemoração fraterna do aniversário de ${m.name} (${m.pastoral_role}).`,
          event_date: dateStr,
          end_date: null,
          event_time: '00:00',
          location: 'Pastoral Missionária',
          category: 'Outros',
          status: 'Confirmado',
          visibility: 'publico',
          responsibles: [m.display_name],
          materials: [],
          notes: 'Aniversariante da Pastoral Missionária.',
          source: 'Aniversários dos Missionários',
          is_birthday: true,
          is_holiday: false,
          member_id: m.id,
          birth_year: m.birth_year || null,
          created_at: m.created_at || new Date().toISOString(),
          updated_at: m.updated_at || new Date().toISOString(),
        });
      }
    }
  }

  let holidayEvents: any[] = [];
  if (include_holidays === 'true' && (!category || category === 'Todas' || category === 'Feriados')) {
    const targetYears = year && typeof year === 'string' && year.length === 4 ? [Number(year)] : [2025, 2026, 2027, 2028];
    for (const y of targetYears) {
      const hList = getHolidaysForYear(y);
      for (const h of hList) {
        if (month && typeof month === 'string' && h.date.slice(5, 7) !== month) continue;
        holidayEvents.push({
          id: h.id,
          external_stable_id: h.id,
          title: `🏛️ ${h.name}`,
          description: `${h.type_label}: ${h.description}`,
          event_date: h.date,
          end_date: null,
          event_time: '00:00',
          location: 'Brasília / Planaltina-DF',
          category: 'Feriados',
          status: 'Confirmado',
          visibility: 'publico',
          responsibles: ['GDF / Brasil'],
          materials: [],
          notes: h.type_label,
          source: 'Feriados Oficiais e Comemorativos',
          is_birthday: false,
          is_holiday: true,
          holiday_type: h.type,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    }
  }

  const allEvents = [...dbEvents, ...birthdayEvents, ...holidayEvents].sort((a, b) => a.event_date.localeCompare(b.event_date));
  return res.json(allEvents);
});

// GET /api/platform/calendar/holidays (Consulta de Feriados Oficiais por Ano)
platformRouter.get('/calendar/holidays', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const yearQuery = req.query.year ? Number(req.query.year) : new Date().getFullYear();
  const holidays = getHolidaysForYear(yearQuery);
  return res.json(holidays);
});

platformRouter.post('/calendar', authenticateToken, requireRole(['admin', 'coordenador']), (req: AuthenticatedRequest, res: Response) => {
  const { title, description, event_date, end_date, event_time, location, category, status, visibility, responsibles, notes } = req.body;

  if (!title || !event_date || !category) {
    return res.status(400).json({ error: 'Título, data e categoria são obrigatórios.' });
  }

  const id = 'cal_' + crypto.randomBytes(6).toString('hex');
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO calendar_events (
      id, external_stable_id, title, description, event_date, end_date, event_time, location,
      category, status, visibility, responsibles_json, notes, source, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Coordenação', ?, ?)
  `).run(
    id,
    id,
    title.trim(),
    description?.trim() || '',
    event_date,
    end_date ? end_date.trim() : null,
    event_time?.trim() || null,
    location?.trim() || null,
    category,
    status || 'Planejado',
    visibility || 'publico',
    JSON.stringify(Array.isArray(responsibles) ? responsibles : ['Pedro', 'Fernanda']),
    notes?.trim() || '',
    now,
    now
  );

  db.prepare(`
    INSERT INTO audit_logs (id, user_id, user_name, action, entity_type, entity_id, details_json, created_at)
    VALUES (?, ?, ?, 'CREATE_CALENDAR_EVENT', 'calendar_event', ?, ?, ?)
  `).run(crypto.randomUUID(), req.user?.id, req.user?.name, id, JSON.stringify({ title, event_date, end_date, category }), now);

  return res.status(201).json({ id, message: 'Evento adicionado ao calendário com sucesso.' });
});

// PUT /api/platform/calendar/:id (Edição Completa ou Parcial de Evento Preservando Campos Não Informados)
platformRouter.put('/calendar/:id', authenticateToken, requireRole(['admin', 'coordenador']), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM calendar_events WHERE id = ?').get(id) as any;
  if (!existing) {
    return res.status(404).json({ error: 'Evento não encontrado.' });
  }

  const { title, description, event_date, end_date, event_time, location, category, status, notes, visibility, responsibles } = req.body;
  const now = new Date().toISOString();

  const updatedTitle = title !== undefined ? title.trim() : existing.title;
  const updatedDescription = description !== undefined ? description.trim() : existing.description;
  const updatedEventDate = event_date !== undefined ? event_date : existing.event_date;
  const updatedEndDate = end_date !== undefined ? (end_date ? end_date.trim() : null) : existing.end_date;
  const updatedEventTime = event_time !== undefined ? (event_time ? event_time.trim() : null) : existing.event_time;
  const updatedLocation = location !== undefined ? (location ? location.trim() : null) : existing.location;
  const updatedCategory = category !== undefined ? category : existing.category;
  const updatedStatus = status !== undefined ? status : existing.status;
  const updatedNotes = notes !== undefined ? (notes ? notes.trim() : '') : existing.notes;
  const updatedVisibility = visibility !== undefined ? visibility : existing.visibility;
  const updatedResponsibles = responsibles !== undefined
    ? JSON.stringify(Array.isArray(responsibles) ? responsibles : [responsibles])
    : (existing.responsibles_json || '[]');

  db.prepare(`
    UPDATE calendar_events
    SET title = ?,
        description = ?,
        event_date = ?,
        end_date = ?,
        event_time = ?,
        location = ?,
        category = ?,
        status = ?,
        notes = ?,
        visibility = ?,
        responsibles_json = ?,
        updated_at = ?
    WHERE id = ?
  `).run(
    updatedTitle,
    updatedDescription,
    updatedEventDate,
    updatedEndDate,
    updatedEventTime,
    updatedLocation,
    updatedCategory,
    updatedStatus,
    updatedNotes,
    updatedVisibility,
    updatedResponsibles,
    now,
    id
  );

  db.prepare(`
    INSERT INTO audit_logs (id, user_id, user_name, action, entity_type, entity_id, details_json, created_at)
    VALUES (?, ?, ?, 'UPDATE_CALENDAR_EVENT', 'calendar_event', ?, ?, ?)
  `).run(crypto.randomUUID(), req.user?.id, req.user?.name, id, JSON.stringify({ before: existing, after: req.body }), now);

  return res.json({ message: 'Evento atualizado com sucesso.' });
});

// PATCH /api/platform/calendar/:id (Alias idempotente para atualização parcial)
platformRouter.patch('/calendar/:id', authenticateToken, requireRole(['admin', 'coordenador']), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM calendar_events WHERE id = ?').get(id) as any;
  if (!existing) {
    return res.status(404).json({ error: 'Evento não encontrado.' });
  }

  const { title, description, event_date, end_date, event_time, location, category, status, notes, visibility, responsibles } = req.body;
  const now = new Date().toISOString();

  const updatedTitle = title !== undefined ? title.trim() : existing.title;
  const updatedDescription = description !== undefined ? description.trim() : existing.description;
  const updatedEventDate = event_date !== undefined ? event_date : existing.event_date;
  const updatedEndDate = end_date !== undefined ? (end_date ? end_date.trim() : null) : existing.end_date;
  const updatedEventTime = event_time !== undefined ? (event_time ? event_time.trim() : null) : existing.event_time;
  const updatedLocation = location !== undefined ? (location ? location.trim() : null) : existing.location;
  const updatedCategory = category !== undefined ? category : existing.category;
  const updatedStatus = status !== undefined ? status : existing.status;
  const updatedNotes = notes !== undefined ? (notes ? notes.trim() : '') : existing.notes;
  const updatedVisibility = visibility !== undefined ? visibility : existing.visibility;
  const updatedResponsibles = responsibles !== undefined
    ? JSON.stringify(Array.isArray(responsibles) ? responsibles : [responsibles])
    : (existing.responsibles_json || '[]');

  db.prepare(`
    UPDATE calendar_events
    SET title = ?,
        description = ?,
        event_date = ?,
        end_date = ?,
        event_time = ?,
        location = ?,
        category = ?,
        status = ?,
        notes = ?,
        visibility = ?,
        responsibles_json = ?,
        updated_at = ?
    WHERE id = ?
  `).run(
    updatedTitle,
    updatedDescription,
    updatedEventDate,
    updatedEndDate,
    updatedEventTime,
    updatedLocation,
    updatedCategory,
    updatedStatus,
    updatedNotes,
    updatedVisibility,
    updatedResponsibles,
    now,
    id
  );

  db.prepare(`
    INSERT INTO audit_logs (id, user_id, user_name, action, entity_type, entity_id, details_json, created_at)
    VALUES (?, ?, ?, 'PATCH_CALENDAR_EVENT', 'calendar_event', ?, ?, ?)
  `).run(crypto.randomUUID(), req.user?.id, req.user?.name, id, JSON.stringify({ before: existing, after: req.body }), now);

  return res.json({ message: 'Evento atualizado com sucesso.' });
});

// DELETE /api/platform/calendar/:id (Cancelamento Seguro ou Exclusão)
platformRouter.delete('/calendar/:id', authenticateToken, requireRole(['admin', 'coordenador']), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM calendar_events WHERE id = ?').get(id) as any;
  if (!existing) {
    return res.status(404).json({ error: 'Evento não encontrado.' });
  }

  const now = new Date().toISOString();
  const isHardDelete = req.query.hard === 'true';

  if (isHardDelete) {
    db.prepare('DELETE FROM calendar_events WHERE id = ?').run(id);
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, user_name, action, entity_type, entity_id, details_json, created_at)
      VALUES (?, ?, ?, 'DELETE_CALENDAR_EVENT_HARD', 'calendar_event', ?, ?, ?)
    `).run(crypto.randomUUID(), req.user?.id, req.user?.name, id, JSON.stringify(existing), now);
    return res.json({ message: 'Evento excluído permanentemente do calendário.' });
  } else {
    db.prepare("UPDATE calendar_events SET status = 'Cancelado', updated_at = ? WHERE id = ?").run(now, id);
    db.prepare(`
      INSERT INTO audit_logs (id, user_id, user_name, action, entity_type, entity_id, details_json, created_at)
      VALUES (?, ?, ?, 'CANCEL_CALENDAR_EVENT', 'calendar_event', ?, ?, ?)
    `).run(crypto.randomUUID(), req.user?.id, req.user?.name, id, JSON.stringify(existing), now);
    return res.json({ message: 'Evento marcado como Cancelado com sucesso.' });
  }
});

platformRouter.post('/calendar/reimport-2027', authenticateToken, requireRole(['admin', 'coordenador']), (_req: AuthenticatedRequest, res: Response) => {
  const now = new Date().toISOString();
  const insertStmt = db.prepare(`
    INSERT INTO calendar_events (
      id, external_stable_id, title, description, event_date, end_date, event_time,
      location, category, status, visibility, responsibles_json, materials_json, notes, source,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Importador Oficial 2027', ?, ?)
  `);

  let added = 0;
  for (const ev of CALENDAR_2027_SEED) {
    const exists = db.prepare('SELECT id FROM calendar_events WHERE external_stable_id = ? OR (event_date = ? AND title = ?)').get(ev.id, ev.event_date, ev.title);
    if (!exists) {
      insertStmt.run(
        ev.id,
        ev.id,
        ev.title,
        ev.description || '',
        ev.event_date,
        (ev as any).end_date || null,
        ev.event_time || null,
        ev.location || null,
        ev.category,
        ev.status || 'Confirmado',
        ev.visibility || 'publico',
        JSON.stringify(ev.responsibles || ['Pedro', 'Fernanda']),
        JSON.stringify(ev.materials || []),
        ev.notes || '',
        now,
        now
      );
      added++;
    }
  }

  const total = (db.prepare('SELECT COUNT(*) as c FROM calendar_events').get() as any).c;
  return res.json({
    message: `Importação idempotente concluída: ${added} novos eventos adicionados. Total de ${total} eventos no calendário preservados sem duplicidades.`,
    added,
    totalEvents: total,
  });
});

// 4. PREACHING LABORATORIES & EVALUATIONS (/api/platform/labs)
platformRouter.get('/labs', authenticateToken, (_req: AuthenticatedRequest, res: Response) => {
  const themes = db.prepare('SELECT * FROM lab_themes ORDER BY theme_number ASC').all();
  const labs = db.prepare('SELECT * FROM preaching_labs ORDER BY lab_date DESC').all().map((l: any) => ({
    ...l,
    draw_results: JSON.parse(l.draw_results_json || '[]'),
  }));
  const evaluations = db.prepare('SELECT * FROM lab_evaluations ORDER BY created_at DESC').all();

  return res.json({ themes, labs, evaluations });
});

// GET /api/platform/labs/draws (Histórico dedicado de sorteios)
platformRouter.get('/labs/draws', authenticateToken, (_req: AuthenticatedRequest, res: Response) => {
  const draws = db.prepare(`
    SELECT * FROM lab_draws
    WHERE status != 'excluido'
    ORDER BY created_at DESC
  `).all().map((d: any) => ({
    ...d,
    participants: JSON.parse(d.participants_json || '[]'),
    groups: JSON.parse(d.groups_json || '[]'),
    rules: JSON.parse(d.rules_json || '{}'),
  }));
  return res.json(draws);
});

// Fisher-Yates unbiased shuffle
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Partição de grupos balanceados (Regra Máx 4 por grupo — Seção 7.2)
export function partitionIntoBalancedGroups(n: number): number[] {
  if (n <= 0) return [];
  if (n === 1) return [1];
  if (n === 2) return [2];
  if (n === 3) return [3];
  if (n === 5) return [3, 2];
  const g = Math.ceil(n / 4);
  const k4 = n - 3 * g;
  const k3 = 4 * g - n;
  return [...Array(k4).fill(4), ...Array(k3).fill(3)];
}

platformRouter.post('/labs/draw', authenticateToken, requireRole(['admin', 'coordenador']), (req: AuthenticatedRequest, res: Response) => {
  const { title, lab_date, duration_minutes = 20, speakers, notes, draw_mode = 'order_and_theme', allow_repeat = false } = req.body;

  if (!Array.isArray(speakers) || speakers.length === 0) {
    return res.status(400).json({ error: 'Informe ao menos um missionário/palestrante para realizar o sorteio.' });
  }

  const themes = db.prepare('SELECT * FROM lab_themes WHERE active = 1 ORDER BY theme_number ASC').all() as any[];

  // Confirmação obrigatória quando participantes superarem temas disponíveis
  if (draw_mode === 'order_and_theme' && speakers.length > themes.length && !allow_repeat) {
    return res.status(409).json({
      error: `Existem ${speakers.length} participantes selecionados, mas apenas ${themes.length} temas disponíveis. Deseja adicionar mais um tema ou autorizar a repetição com confirmação?`,
      needs_repeat_confirmation: true,
      participants_count: speakers.length,
      available_themes_count: themes.length,
    });
  }

  const shuffledSpeakers = shuffleArray(speakers);
  const shuffledThemes = shuffleArray(themes);

  const groupSizes = partitionIntoBalancedGroups(shuffledSpeakers.length);
  const durationPerSpeaker = Number(duration_minutes) || 20;

  let speakerIdx = 0;
  const groups: any[] = [];
  const drawResults: any[] = [];

  groupSizes.forEach((size, groupIdx) => {
    const groupNumber = groupIdx + 1;
    const groupMembers: any[] = [];

    for (let orderInGroup = 1; orderInGroup <= size; orderInGroup++) {
      const speakerName = shuffledSpeakers[speakerIdx];
      let themeNumber: number | null = null;
      let themeTitle = 'Tema Livre / A Definir';

      if (draw_mode !== 'order_only' && shuffledThemes.length > 0) {
        const theme = shuffledThemes[speakerIdx % shuffledThemes.length];
        themeNumber = theme.theme_number;
        themeTitle = theme.title;
      }

      const participant = {
        order: speakerIdx + 1,
        order_in_group: orderInGroup,
        group_number: groupNumber,
        speaker_name: speakerName,
        theme_number: themeNumber,
        theme_title: themeTitle,
        duration_minutes: durationPerSpeaker,
      };

      groupMembers.push(participant);
      drawResults.push(participant);
      speakerIdx++;
    }

    groups.push({
      group_number: groupNumber,
      group_title: `Grupo ${groupNumber}`,
      duration_minutes: groupMembers.length * durationPerSpeaker,
      members: groupMembers,
    });
  });

  const labId = 'lab_' + crypto.randomBytes(6).toString('hex');
  const drawId = 'draw_' + crypto.randomBytes(6).toString('hex');
  const now = new Date().toISOString();
  const coordinatorName = req.user?.name || 'Coordenação (Pedro e Fernanda)';
  const labTitle = title?.trim() || `Laboratório de Pregação — ${lab_date || now.split('T')[0]}`;
  const labDateStr = lab_date || now.split('T')[0];

  // Grava em preaching_labs para manter compatibilidade
  db.prepare(`
    INSERT INTO preaching_labs (id, title, lab_date, duration_minutes, status, draw_results_json, notes, created_at)
    VALUES (?, ?, ?, ?, 'planejado', ?, ?, ?)
  `).run(
    labId,
    labTitle,
    labDateStr,
    durationPerSpeaker,
    JSON.stringify(drawResults),
    notes?.trim() || '',
    now
  );

  // Grava na tabela dedicada lab_draws para histórico auditável
  const rules = {
    draw_mode,
    distribution: groupSizes,
    groups_count: groups.length,
    allow_repeat: speakers.length > themes.length ? allow_repeat : false,
    duration_minutes: durationPerSpeaker,
  };

  db.prepare(`
    INSERT INTO lab_draws (
      id, laboratory_date, laboratory_name, coordinator_name, draw_date,
      duration_minutes, participants_count, participants_json, groups_json, rules_json, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ativo', ?, ?)
  `).run(
    drawId,
    labDateStr,
    labTitle,
    coordinatorName,
    now.split('T')[0],
    durationPerSpeaker,
    speakers.length,
    JSON.stringify(drawResults),
    JSON.stringify(groups),
    JSON.stringify(rules),
    now,
    now
  );

  return res.status(201).json({
    id: labId,
    draw_id: drawId,
    draw_results: drawResults,
    groups,
    distribution: groupSizes,
    duration_minutes: durationPerSpeaker,
    message: draw_mode === 'order_only'
      ? `Sorteio de ordem realizado com sucesso! ${speakers.length} pregadores divididos em ${groups.length} grupos.`
      : `Sorteio de temas e grupos realizado com sucesso! ${speakers.length} pregadores distribuídos em ${groups.length} grupos equilibrados.`,
  });
});

// PATCH /api/platform/labs/draws/:id/archive (Arquivar sorteio)
platformRouter.patch('/labs/draws/:id/archive', authenticateToken, requireRole(['admin', 'coordenador']), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const now = new Date().toISOString();
  db.prepare("UPDATE lab_draws SET status = 'arquivado', updated_at = ? WHERE id = ?").run(now, id);
  return res.json({ message: 'Sorteio arquivado com sucesso!' });
});

// DELETE /api/platform/labs/draws/:id (Exclusão lógica do sorteio)
platformRouter.delete('/labs/draws/:id', authenticateToken, requireRole(['admin', 'coordenador']), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const now = new Date().toISOString();
  db.prepare("UPDATE lab_draws SET status = 'excluido', updated_at = ? WHERE id = ?").run(now, id);
  return res.json({ message: 'Sorteio removido do histórico com sucesso!' });
});

// CRUD de Temas de Laboratório (Seção 5 e 28)
platformRouter.post('/labs/themes', authenticateToken, requireRole(['admin', 'coordenador']), (req: AuthenticatedRequest, res: Response) => {
  const { title, category, description } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'O título do tema é obrigatório.' });
  }

  try {
    const existing = db.prepare('SELECT id FROM lab_themes WHERE LOWER(title) = LOWER(?)').get(title.trim());
    if (existing) {
      return res.status(409).json({ error: 'Já existe um tema cadastrado com este título.' });
    }

    const maxTheme = db.prepare('SELECT MAX(theme_number) as max_num FROM lab_themes').get() as any;
    const nextNum = (maxTheme?.max_num || 0) + 1;
    const themeId = 'thm_' + crypto.randomBytes(4).toString('hex');
    const finalCategory = category?.trim() || 'Formação Pastoral';

    db.prepare(`
      INSERT INTO lab_themes (id, theme_number, title, category, description, active)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(themeId, nextNum, title.trim(), finalCategory, description?.trim() || '');

    return res.status(201).json({
      message: 'Tema cadastrado com sucesso!',
      themeId,
      theme: {
        id: themeId,
        theme_number: nextNum,
        title: title.trim(),
        category: finalCategory,
        description: description?.trim() || '',
        active: 1
      }
    });
  } catch (err: any) {
    console.error('Erro ao salvar tema:', err);
    return res.status(500).json({
      error: 'Não foi possível salvar o tema. Nenhum registro foi alterado. Tente novamente ou informe a coordenação.',
      details: err.message
    });
  }
});

platformRouter.put('/labs/themes/:id', authenticateToken, requireRole(['admin', 'coordenador']), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { title, category, description, active } = req.body;

  try {
    const existing = db.prepare('SELECT id FROM lab_themes WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Tema não encontrado.' });
    }

    db.prepare(`
      UPDATE lab_themes
      SET title = COALESCE(?, title),
          category = COALESCE(?, category),
          description = COALESCE(?, description),
          active = COALESCE(?, active)
      WHERE id = ?
    `).run(
      title?.trim() || null,
      category?.trim() || null,
      description?.trim() || null,
      active !== undefined ? (active ? 1 : 0) : null,
      id
    );

    return res.json({ message: 'Tema atualizado com sucesso!' });
  } catch (err: any) {
    console.error('Erro ao atualizar tema:', err);
    return res.status(500).json({
      error: 'Não foi possível atualizar o tema. Tente novamente.',
      details: err.message
    });
  }
});

platformRouter.patch('/labs/themes/:id/archive', authenticateToken, requireRole(['admin', 'coordenador']), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const theme = db.prepare('SELECT id, active FROM lab_themes WHERE id = ?').get(id) as any;
  if (!theme) {
    return res.status(404).json({ error: 'Tema não encontrado.' });
  }

  const newStatus = theme.active === 1 ? 0 : 1;
  db.prepare('UPDATE lab_themes SET active = ? WHERE id = ?').run(newStatus, id);

  return res.json({
    message: newStatus === 1 ? 'Tema reativado com sucesso!' : 'Tema arquivado com sucesso!',
    active: newStatus
  });
});

platformRouter.post('/labs/evaluate', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const {
    lab_id,
    lab_date,
    speaker_name,
    theme_title,
    crit_dominio_assunto,
    crit_abordagem_tema,
    crit_objetividade,
    crit_cumprimento_tempo,
    crit_embasamento_biblico,
    crit_interacao,
    crit_testemunho,
    crit_oracao,
    comments,
    suggested_future_themes,
  } = req.body;

  if (!speaker_name || !theme_title || !lab_date) {
    return res.status(400).json({ error: 'Data do laboratório, Palestrante e Tema são obrigatórios.' });
  }

  const validOptions = ['Sim', 'Razoavelmente', 'Não'];
  const criteria = [
    crit_dominio_assunto,
    crit_abordagem_tema,
    crit_objetividade,
    crit_cumprimento_tempo,
    crit_embasamento_biblico,
    crit_interacao,
    crit_testemunho,
    crit_oracao,
  ];

  if (criteria.some((c) => !validOptions.includes(c))) {
    return res.status(400).json({ error: 'Todos os 8 critérios avaliativos devem ser preenchidos com Sim, Razoavelmente ou Não.' });
  }

  const evalId = 'eval_' + crypto.randomBytes(6).toString('hex');
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO lab_evaluations (
      id, lab_id, lab_date, speaker_name, theme_title, evaluator_name,
      crit_dominio_assunto, crit_abordagem_tema, crit_objetividade, crit_cumprimento_tempo,
      crit_embasamento_biblico, crit_interacao, crit_testemunho, crit_oracao,
      comments, suggested_future_themes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    evalId,
    lab_id || null,
    lab_date,
    speaker_name.trim(),
    theme_title.trim(),
    req.user?.name || 'Avaliador da Pastoral',
    crit_dominio_assunto,
    crit_abordagem_tema,
    crit_objetividade,
    crit_cumprimento_tempo,
    crit_embasamento_biblico,
    crit_interacao,
    crit_testemunho,
    crit_oracao,
    comments?.trim() || '',
    suggested_future_themes?.trim() || '',
    now
  );

  return res.status(201).json({
    id: evalId,
    message: 'Ficha de avaliação do laboratório registrada com sucesso!',
  });
});

// 5. MISSION DISPATCH CENTER (/api/platform/dispatches)
platformRouter.get('/dispatches', authenticateToken, (_req: AuthenticatedRequest, res: Response) => {
  const list = db.prepare('SELECT * FROM dispatch_requests ORDER BY created_at DESC').all().map((d: any) => ({
    ...d,
    companions: JSON.parse(d.companions_json || '[]'),
  }));
  return res.json(list);
});

platformRouter.post('/dispatches', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const {
    requester_name,
    pastoral_member_id,
    event_name,
    event_date,
    event_time,
    location,
    organization,
    participation_type,
    role_function,
    theme,
    recipient,
    notes,
    companions,
  } = req.body;

  if (!requester_name || !event_name || !event_date || !role_function) {
    return res.status(400).json({ error: 'Missionário, Evento, Data e Função são obrigatórios para solicitar envio.' });
  }

  const id = 'env_' + crypto.randomBytes(6).toString('hex');
  const now = new Date().toISOString();
  const companionsList = Array.isArray(companions) ? companions : [];

  db.prepare(`
    INSERT INTO dispatch_requests (
      id, requester_name, pastoral_member_id, event_name, event_date, event_time,
      location, organization, participation_type, role_function, theme,
      recipient, status, notes, companions_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Aguardando análise', ?, ?, ?, ?)
  `).run(
    id,
    requester_name.trim(),
    pastoral_member_id || null,
    event_name.trim(),
    event_date,
    event_time?.trim() || '',
    location?.trim() || '',
    organization?.trim() || 'Paróquia São Vicente de Paulo',
    participation_type || 'Missão / Encontro',
    role_function,
    theme?.trim() || '',
    recipient || 'Coordenação (Pedro e Fernanda)',
    notes?.trim() || '',
    JSON.stringify(companionsList),
    now,
    now
  );

  const dateFormatted = event_date.split('-').reverse().join('/');
  const companionNames = companionsList
    .map((c: any) => (typeof c === 'string' ? c : c.name))
    .filter(Boolean);
  const companionsSection = companionNames.length > 0
    ? `• *Acompanhado(a) por:* ${companionNames.join(', ')}\n`
    : '';

  const whatsappText =
    `Paz e bem, ${recipient || 'Pedro e Fernanda'}! 🙏🕊️\n\n` +
    `Gostaria de solicitar o *Envio Missionário* para a missão *${event_name.trim()}*, que acontecerá no dia *${dateFormatted}*${event_time ? ` às ${event_time}` : ''}.\n\n` +
    `• *Missionário(a):* ${requester_name.trim()}\n` +
    `• *Função:* ${role_function}\n` +
    `• *Local/Grupo:* ${organization || 'Paróquia'}${location ? ` (${location})` : ''}\n` +
    companionsSection +
    (theme ? `• *Tema:* ${theme.trim()}\n` : '') +
    (notes ? `• *Observações:* ${notes.trim()}\n` : '') +
    `\nAguardo a orientação e autorização da coordenação.\n\n"Uma só coisa é necessária: Estar perto de Jesus!" — São Padre Pio`;

  return res.status(201).json({
    id,
    whatsappText,
    waLink: `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappText)}`,
    message: 'Solicitação de envio registrada com sucesso! Você pode revisar e enviar a mensagem no WhatsApp.',
  });
});

platformRouter.patch('/dispatches/:id/status', authenticateToken, requireRole(['admin', 'coordenador']), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status, coordinator_feedback } = req.body;
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE dispatch_requests
    SET status = ?, coordinator_feedback = COALESCE(?, coordinator_feedback), updated_at = ?
    WHERE id = ?
  `).run(status, coordinator_feedback?.trim() || null, now, id);

  db.prepare(`
    INSERT INTO audit_logs (id, user_id, user_name, action, entity_type, entity_id, details_json, created_at)
    VALUES (?, ?, ?, 'UPDATE_DISPATCH_STATUS', 'dispatch_request', ?, ?, ?)
  `).run(crypto.randomUUID(), req.user?.id, req.user?.name, id, JSON.stringify({ status, coordinator_feedback }), now);

  return res.json({ message: `Status do envio atualizado para "${status}".` });
});

// 6. TEMPLATES & ANNOUNCEMENTS (Modelos restritos exclusivamente a Coordenadores e Delegados)
platformRouter.get('/templates', authenticateToken, requireRole(['admin', 'coordenador', 'delegado']), (_req: AuthenticatedRequest, res: Response) => {
  const rows = db.prepare('SELECT * FROM event_templates ORDER BY title ASC').all().map((t: any) => ({
    ...t,
    schedule: JSON.parse(t.schedule_json || '[]'),
    teams: JSON.parse(t.teams_json || '[]'),
  }));
  return res.json(rows);
});

platformRouter.get('/announcements', authenticateToken, (_req: AuthenticatedRequest, res: Response) => {
  const rows = db.prepare('SELECT * FROM announcements ORDER BY pinned DESC, created_at DESC').all();
  return res.json(rows);
});

platformRouter.post('/announcements', authenticateToken, requireRole(['admin', 'coordenador']), (req: AuthenticatedRequest, res: Response) => {
  const { title, content, category = 'Geral', pinned = false } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: 'Título e conteúdo são obrigatórios.' });
  }
  const id = 'ann_' + crypto.randomBytes(6).toString('hex');
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO announcements (id, title, content, category, audience, pinned, author_name, created_at)
    VALUES (?, ?, ?, ?, 'todos', ?, ?, ?)
  `).run(id, title.trim(), content.trim(), category, pinned ? 1 : 0, req.user?.name || 'Coordenação', now);

  return res.status(201).json({ id, message: 'Comunicado publicado com sucesso.' });
});

// 7. GOVERNANCE, PASTORAL MEMBERS, DELEGATIONS & SUCCESSION (/api/platform/governance)
// GET /api/platform/members (Listagem e Busca com Filtros)
platformRouter.get('/members', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const { search, role, status, qualification } = req.query;
  let sql = 'SELECT * FROM pastoral_members WHERE 1=1';
  const params: any[] = [];

  if (role && role !== 'todos') {
    sql += ' AND pastoral_role = ?';
    params.push(role);
  }
  if (status && status !== 'todos') {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (search && typeof search === 'string' && search.trim()) {
    const raw = search.trim();
    const term = `%${raw}%`;
    sql += ' AND (name LIKE ? OR display_name LIKE ? OR email LIKE ? OR phone LIKE ?)';
    params.push(term, term, term, term);
  }

  sql += ' ORDER BY CASE pastoral_role WHEN "coordenador" THEN 1 WHEN "admin" THEN 2 WHEN "delegado" THEN 3 ELSE 4 END, name ASC';
  const rows = db.prepare(sql).all(...params).map((m: any) => ({
    ...m,
    qualifications: JSON.parse(m.qualifications_json || '[]'),
    skills: JSON.parse(m.skills_json || '[]'),
    availability: JSON.parse(m.availability_json || '{}'),
    welcome_checklist: JSON.parse(m.welcome_checklist_json || '{}'),
  }));

  let filtered = rows;
  if (qualification && qualification !== 'todas') {
    filtered = rows.filter((m: any) => m.qualifications.includes(qualification));
  }

  return res.json(filtered);
});

// GET /api/platform/members/birthdays (Aniversariantes do dia, mês e próximos)
platformRouter.get('/members/birthdays', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const isCoordinator = req.user?.role === 'admin' || req.user?.role === 'coordenador';

  const nowSP = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  }).formatToParts(new Date());

  const currentDay = Number(nowSP.find((p) => p.type === 'day')?.value || 1);
  const currentMonth = Number(nowSP.find((p) => p.type === 'month')?.value || 1);
  const currentYear = Number(nowSP.find((p) => p.type === 'year')?.value || 2026);

  const members = db.prepare(`
    SELECT id, name, display_name, pastoral_role, status, email, phone, photo_url,
           birth_day, birth_month, birth_year, birthday_visibility, notes
    FROM pastoral_members
    WHERE status != 'inativo' AND birth_day IS NOT NULL AND birth_month IS NOT NULL
    ORDER BY birth_month ASC, birth_day ASC
  `).all() as any[];

  const allowed = members.filter((m) => {
    if (m.birthday_visibility === 'private' && m.email !== req.user?.email) return false;
    if (m.birthday_visibility === 'coordinators_only' && !isCoordinator && m.email !== req.user?.email) return false;
    return true;
  });

  const today = allowed.filter((m) => m.birth_day === currentDay && m.birth_month === currentMonth);
  const thisMonth = allowed.filter((m) => m.birth_month === currentMonth).sort((a, b) => a.birth_day - b.birth_day);

  return res.json({
    current_date: { day: currentDay, month: currentMonth, year: currentYear },
    today,
    this_month: thisMonth,
    all_celebrants: allowed,
  });
});

// POST /api/platform/members (Cadastrar Novo Missionário)
platformRouter.post('/members', authenticateToken, requireRole(['admin', 'coordenador']), (req: AuthenticatedRequest, res: Response) => {
  const {
    name, display_name, email, phone, pastoral_role = 'membro', status = 'ativo',
    joined_at, qualifications, skills, birth_day, birth_month, birth_year, birthday_visibility = 'members', notes
  } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'O nome do missionário é obrigatório.' });
  }

  const id = 'pmem_' + crypto.randomBytes(6).toString('hex');
  const now = new Date().toISOString();
  const finalDisplayName = display_name?.trim() || name.trim().split(' ')[0];

  db.prepare(`
    INSERT INTO pastoral_members (
      id, name, display_name, email, phone, pastoral_role, status, joined_at,
      qualifications_json, skills_json, birth_day, birth_month, birth_year,
      birthday_visibility, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    name.trim(),
    finalDisplayName,
    email?.trim() || null,
    phone?.trim() || null,
    pastoral_role,
    status,
    joined_at || now.split('T')[0],
    JSON.stringify(Array.isArray(qualifications) && qualifications.length > 0 ? qualifications : ['Intercessão']),
    JSON.stringify(Array.isArray(skills) ? skills : []),
    birth_day ? Number(birth_day) : null,
    birth_month ? Number(birth_month) : null,
    birth_year ? Number(birth_year) : null,
    birthday_visibility || 'members',
    notes?.trim() || null,
    now,
    now
  );

  db.prepare(`
    INSERT INTO audit_logs (id, user_id, user_name, action, entity_type, entity_id, details_json, created_at)
    VALUES (?, ?, ?, 'CREATE_PASTORAL_MEMBER', 'pastoral_member', ?, ?, ?)
  `).run(crypto.randomUUID(), req.user?.id, req.user?.name, id, JSON.stringify({ name, pastoral_role }), now);

  return res.status(201).json({
    id,
    message: 'Missionário cadastrado com sucesso!',
    member: { id, name: name.trim(), display_name: finalDisplayName, pastoral_role, status }
  });
});

// PUT /api/platform/members/:id (Edição Completa de Cadastro de Missionário)
platformRouter.put('/members/:id', authenticateToken, requireRole(['admin', 'coordenador']), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM pastoral_members WHERE id = ?').get(id) as any;
  if (!existing) {
    return res.status(404).json({ error: 'Missionário não encontrado.' });
  }

  const {
    name, display_name, email, phone, pastoral_role, status, joined_at,
    qualifications, skills, birth_day, birth_month, birth_year, birthday_visibility, notes
  } = req.body;

  const now = new Date().toISOString();

  db.prepare(`
    UPDATE pastoral_members
    SET name = COALESCE(?, name),
        display_name = COALESCE(?, display_name),
        email = ?,
        phone = ?,
        pastoral_role = COALESCE(?, pastoral_role),
        status = COALESCE(?, status),
        joined_at = COALESCE(?, joined_at),
        qualifications_json = COALESCE(?, qualifications_json),
        skills_json = COALESCE(?, skills_json),
        birth_day = ?,
        birth_month = ?,
        birth_year = ?,
        birthday_visibility = COALESCE(?, birthday_visibility),
        notes = ?,
        updated_at = ?
    WHERE id = ?
  `).run(
    name?.trim() || null,
    display_name?.trim() || null,
    email !== undefined ? (email?.trim() || null) : existing.email,
    phone !== undefined ? (phone?.trim() || null) : existing.phone,
    pastoral_role || null,
    status || null,
    joined_at || null,
    Array.isArray(qualifications) ? JSON.stringify(qualifications) : null,
    Array.isArray(skills) ? JSON.stringify(skills) : null,
    birth_day !== undefined ? (birth_day ? Number(birth_day) : null) : existing.birth_day,
    birth_month !== undefined ? (birth_month ? Number(birth_month) : null) : existing.birth_month,
    birth_year !== undefined ? (birth_year ? Number(birth_year) : null) : existing.birth_year,
    birthday_visibility || null,
    notes !== undefined ? (notes?.trim() || null) : existing.notes,
    now,
    id
  );

  // Sincronizar nome no cadastro de compradores de camisetas se houver vínculo
  if (existing.buyer_member_id) {
    try {
      const syncName = name?.trim() || existing.name;
      const syncDisplayName = display_name?.trim() || existing.display_name;
      const syncPhone = phone !== undefined ? (phone?.trim() || '') : existing.phone;
      db.prepare(`
        UPDATE members
        SET name = COALESCE(?, name),
            display_name = COALESCE(?, display_name),
            phone = COALESCE(?, phone),
            updated_at = ?
        WHERE id = ?
      `).run(syncName, syncDisplayName, syncPhone, now, existing.buyer_member_id);
    } catch {}
  }

  db.prepare(`
    INSERT INTO audit_logs (id, user_id, user_name, action, entity_type, entity_id, details_json, created_at)
    VALUES (?, ?, ?, 'UPDATE_PASTORAL_MEMBER_FULL', 'pastoral_member', ?, ?, ?)
  `).run(crypto.randomUUID(), req.user?.id, req.user?.name, id, JSON.stringify(req.body), now);

  return res.json({ message: 'Cadastro do missionário atualizado com sucesso!' });
});

// PATCH /api/platform/members/:id/status (Ativação / Inativação / Arquivamento)
platformRouter.patch('/members/:id/status', authenticateToken, requireRole(['admin', 'coordenador']), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!['ativo', 'pendente', 'inativo', 'arquivado'].includes(status)) {
    return res.status(400).json({ error: 'Status inválido.' });
  }

  const existing = db.prepare('SELECT id, name FROM pastoral_members WHERE id = ?').get(id) as any;
  if (!existing) {
    return res.status(404).json({ error: 'Missionário não encontrado.' });
  }

  const now = new Date().toISOString();
  db.prepare('UPDATE pastoral_members SET status = ?, updated_at = ? WHERE id = ?').run(status, now, id);

  db.prepare(`
    INSERT INTO audit_logs (id, user_id, user_name, action, entity_type, entity_id, details_json, created_at)
    VALUES (?, ?, ?, 'UPDATE_PASTORAL_MEMBER_STATUS', 'pastoral_member', ?, ?, ?)
  `).run(crypto.randomUUID(), req.user?.id, req.user?.name, id, JSON.stringify({ status }), now);

  return res.json({ message: `Status de ${existing.name} alterado para "${status}".` });
});

platformRouter.get('/governance', authenticateToken, (_req: AuthenticatedRequest, res: Response) => {
  const pastoralMembers = db.prepare('SELECT * FROM pastoral_members ORDER BY pastoral_role ASC, name ASC').all().map((m: any) => ({
    ...m,
    qualifications: JSON.parse(m.qualifications_json || '[]'),
    skills: JSON.parse(m.skills_json || '[]'),
  }));

  const capabilities = db.prepare(`
    SELECT uc.*, pm.name as member_name
    FROM user_capabilities uc
    JOIN pastoral_members pm ON pm.id = uc.pastoral_member_id
    ORDER BY uc.created_at DESC
  `).all().map((c: any) => ({
    ...c,
    actions: JSON.parse(c.actions_json || '[]'),
  }));

  const successionHistory = db.prepare('SELECT * FROM coordination_succession ORDER BY created_at DESC').all().map((s: any) => ({
    ...s,
    checklist: JSON.parse(s.checklist_json || '{}'),
  }));

  return res.json({
    pastoralMembers,
    capabilities,
    successionHistory,
  });
});

platformRouter.patch('/governance/members/:id', authenticateToken, requireRole(['admin', 'coordenador']), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM pastoral_members WHERE id = ?').get(id) as any;
  if (!existing) {
    return res.status(404).json({ error: 'Missionário não encontrado.' });
  }

  const {
    name, display_name, email, phone, status, pastoral_role, joined_at,
    qualifications, skills, birth_day, birth_month, birth_year, birthday_visibility, notes
  } = req.body;

  const now = new Date().toISOString();

  db.prepare(`
    UPDATE pastoral_members
    SET name = COALESCE(?, name),
        display_name = COALESCE(?, display_name),
        email = COALESCE(?, email),
        phone = COALESCE(?, phone),
        status = COALESCE(?, status),
        pastoral_role = COALESCE(?, pastoral_role),
        joined_at = COALESCE(?, joined_at),
        qualifications_json = COALESCE(?, qualifications_json),
        skills_json = COALESCE(?, skills_json),
        birth_day = COALESCE(?, birth_day),
        birth_month = COALESCE(?, birth_month),
        birth_year = COALESCE(?, birth_year),
        birthday_visibility = COALESCE(?, birthday_visibility),
        notes = COALESCE(?, notes),
        updated_at = ?
    WHERE id = ?
  `).run(
    name?.trim() || null,
    display_name?.trim() || null,
    email?.trim() || null,
    phone?.trim() || null,
    status || null,
    pastoral_role || null,
    joined_at || null,
    Array.isArray(qualifications) ? JSON.stringify(qualifications) : null,
    Array.isArray(skills) ? JSON.stringify(skills) : null,
    birth_day ? Number(birth_day) : null,
    birth_month ? Number(birth_month) : null,
    birth_year ? Number(birth_year) : null,
    birthday_visibility || null,
    notes?.trim() || null,
    now,
    id
  );

  // Sincronizar nome no cadastro de compradores de camisetas se houver vínculo
  if (existing.buyer_member_id) {
    try {
      const syncName = name?.trim() || existing.name;
      const syncDisplayName = display_name?.trim() || existing.display_name;
      const syncPhone = phone !== undefined ? (phone?.trim() || '') : existing.phone;
      db.prepare(`
        UPDATE members
        SET name = COALESCE(?, name),
            display_name = COALESCE(?, display_name),
            phone = COALESCE(?, phone),
            updated_at = ?
        WHERE id = ?
      `).run(syncName, syncDisplayName, syncPhone, now, existing.buyer_member_id);
    } catch {}
  }

  db.prepare(`
    INSERT INTO audit_logs (id, user_id, user_name, action, entity_type, entity_id, details_json, created_at)
    VALUES (?, ?, ?, 'UPDATE_PASTORAL_MEMBER_GOVERNANCE', 'pastoral_member', ?, ?, ?)
  `).run(crypto.randomUUID(), req.user?.id, req.user?.name, id, JSON.stringify(req.body), now);

  return res.json({ message: 'Cadastro institucional e habilitações do membro atualizados com sucesso.' });
});

platformRouter.post('/governance/capabilities', authenticateToken, requireRole(['admin', 'coordenador']), (req: AuthenticatedRequest, res: Response) => {
  const { pastoral_member_id, role_label, module, actions } = req.body;
  if (!pastoral_member_id || !role_label || !module || !Array.isArray(actions)) {
    return res.status(400).json({ error: 'Membro, função delegada, módulo e ações são obrigatórios.' });
  }

  const id = 'cap_' + crypto.randomBytes(6).toString('hex');
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO user_capabilities (id, pastoral_member_id, role_label, module, actions_json, granted_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, pastoral_member_id, role_label.trim(), module, JSON.stringify(actions), req.user?.name || 'Coordenação', now);

  db.prepare("UPDATE pastoral_members SET pastoral_role = 'delegado', updated_at = ? WHERE id = ? AND pastoral_role = 'membro'").run(
    now,
    pastoral_member_id
  );

  return res.status(201).json({ id, message: 'Permissão delegada atribuída com sucesso.' });
});

platformRouter.post('/governance/succession', authenticateToken, requireRole(['admin', 'coordenador']), (req: AuthenticatedRequest, res: Response) => {
  const { action, coordinator_name, role_title, target_id, notes } = req.body;
  const now = new Date().toISOString();

  if (action === 'propose') {
    if (!coordinator_name || !role_title) {
      return res.status(400).json({ error: 'Nome do sucessor e cargo são obrigatórios.' });
    }
    const id = 'suc_' + crypto.randomBytes(6).toString('hex');
    db.prepare(`
      INSERT INTO coordination_succession (id, coordinator_name, role_title, status, proposed_by, started_at, checklist_json, notes, created_at)
      VALUES (?, ?, ?, 'proposto', ?, ?, ?, ?, ?)
    `).run(
      id,
      coordinator_name.trim(),
      role_title.trim(),
      req.user?.name || 'Coordenação Atual',
      now.split('T')[0],
      JSON.stringify({
        permissoes_atribuidas: false,
        documentos_organizados: true,
        financas_conferidas: true,
        backup_validado: true,
      }),
      notes?.trim() || 'Proposta de transição institucional',
      now
    );
    return res.status(201).json({ id, message: `Proposta de sucessão registrada para ${coordinator_name}.` });
  }

  if (action === 'confirm' && target_id) {
    db.prepare(`
      UPDATE coordination_succession
      SET status = 'ativo',
          checklist_json = ?,
          started_at = ?
      WHERE id = ?
    `).run(
      JSON.stringify({
        permissoes_atribuidas: true,
        documentos_organizados: true,
        financas_conferidas: true,
        backup_validado: true,
      }),
      now.split('T')[0],
      target_id
    );
    return res.json({ message: 'Novo coordenador confirmado e ativado!' });
  }

  if (action === 'step_down' && target_id) {
    // Safety Check (Section 11): Never allow the organization to have 0 active coordinators!
    const activeCount = (db.prepare("SELECT COUNT(*) as c FROM coordination_succession WHERE status = 'ativo'").get() as any).c;
    const targetRow = db.prepare('SELECT status FROM coordination_succession WHERE id = ?').get(target_id) as any;

    if (targetRow?.status === 'ativo' && activeCount <= 1) {
      return res.status(400).json({
        error: 'Operação bloqueada: A Pastoral Missionária nunca pode ficar sem ao menos um coordenador ativo. Confirme um sucessor antes de concluir o desligamento.',
      });
    }

    db.prepare(`
      UPDATE coordination_succession
      SET status = 'concluido', ended_at = ?
      WHERE id = ?
    `).run(now.split('T')[0], target_id);

    return res.json({ message: 'Mandato de coordenação encerrado com preservação do histórico institucional.' });
  }

  return res.status(400).json({ error: 'Ação de sucessão inválida.' });
});

// 8. POST /api/platform/backup (Create on-demand verified backup)
platformRouter.post('/backup', authenticateToken, requireRole(['admin', 'coordenador']), (_req: AuthenticatedRequest, res: Response) => {
  const result = createDatabaseBackup('on_demand');
  return res.json({
    message: 'Backup de segurança gerado e integridade verificada com sucesso.',
    ...result,
  });
});
