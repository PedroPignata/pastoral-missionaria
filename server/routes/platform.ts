import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/database.js';
import { authenticateToken, requireRole, AuthenticatedRequest } from './auth.js';
import { CALENDAR_2027_SEED, seedEcosystemData } from '../db/migrations.js';
import { createDatabaseBackup } from '../db/backup.js';

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
  const { category, month, status } = req.query;
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

  sql += ' ORDER BY event_date ASC';
  const events = db.prepare(sql).all(...params).map((ev: any) => ({
    ...ev,
    responsibles: JSON.parse(ev.responsibles_json || '[]'),
    materials: JSON.parse(ev.materials_json || '[]'),
  }));

  return res.json(events);
});

platformRouter.post('/calendar', authenticateToken, requireRole(['admin', 'coordenador']), (req: AuthenticatedRequest, res: Response) => {
  const { title, description, event_date, event_time, location, category, status, visibility, responsibles, notes } = req.body;

  if (!title || !event_date || !category) {
    return res.status(400).json({ error: 'Título, data e categoria são obrigatórios.' });
  }

  const id = 'cal_' + crypto.randomBytes(6).toString('hex');
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO calendar_events (
      id, external_stable_id, title, description, event_date, event_time, location,
      category, status, visibility, responsibles_json, notes, source, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Coordenação', ?, ?)
  `).run(
    id,
    id,
    title.trim(),
    description?.trim() || '',
    event_date,
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
  `).run(crypto.randomUUID(), req.user?.id, req.user?.name, id, JSON.stringify({ title, event_date, category }), now);

  return res.status(201).json({ id, message: 'Evento adicionado ao calendário com sucesso.' });
});

platformRouter.put('/calendar/:id', authenticateToken, requireRole(['admin', 'coordenador']), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { title, description, event_date, event_time, location, category, status, notes } = req.body;
  const now = new Date().toISOString();

  const existing = db.prepare('SELECT id FROM calendar_events WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Evento não encontrado.' });
  }

  db.prepare(`
    UPDATE calendar_events
    SET title = COALESCE(?, title),
        description = COALESCE(?, description),
        event_date = COALESCE(?, event_date),
        event_time = ?,
        location = ?,
        category = COALESCE(?, category),
        status = COALESCE(?, status),
        notes = COALESCE(?, notes),
        updated_at = ?
    WHERE id = ?
  `).run(
    title?.trim(),
    description?.trim(),
    event_date,
    event_time || null,
    location || null,
    category,
    status,
    notes?.trim(),
    now,
    id
  );

  return res.json({ message: 'Evento atualizado com sucesso.' });
});

platformRouter.post('/calendar/reimport-2027', authenticateToken, requireRole(['admin', 'coordenador']), (_req: AuthenticatedRequest, res: Response) => {
  seedEcosystemData();
  const total = (db.prepare('SELECT COUNT(*) as c FROM calendar_events').get() as any).c;
  return res.json({
    message: `Importação idempotente concluída: os ${CALENDAR_2027_SEED.length} eventos oficiais de 2027 foram verificados sem duplicidades.`,
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

platformRouter.post('/labs/draw', authenticateToken, requireRole(['admin', 'coordenador']), (req: AuthenticatedRequest, res: Response) => {
  const { title, lab_date, duration_minutes = 15, speakers, notes } = req.body;

  if (!Array.isArray(speakers) || speakers.length === 0) {
    return res.status(400).json({ error: 'Informe ao menos um missionário/palestrante para realizar o sorteio.' });
  }

  const themes = db.prepare('SELECT * FROM lab_themes WHERE active = 1 ORDER BY theme_number ASC').all() as any[];
  const shuffledSpeakers = [...speakers].sort(() => Math.random() - 0.5);
  const shuffledThemes = [...themes].sort(() => Math.random() - 0.5);

  const drawResults = shuffledSpeakers.map((speakerName, idx) => {
    const theme = shuffledThemes[idx % shuffledThemes.length];
    return {
      order: idx + 1,
      speaker_name: speakerName,
      theme_number: theme.theme_number,
      theme_title: theme.title,
      duration_minutes: Number(duration_minutes) || 15,
    };
  });

  const labId = 'lab_' + crypto.randomBytes(6).toString('hex');
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO preaching_labs (id, title, lab_date, duration_minutes, status, draw_results_json, notes, created_at)
    VALUES (?, ?, ?, ?, 'planejado', ?, ?, ?)
  `).run(
    labId,
    title?.trim() || `Laboratório de Pregação — ${lab_date || now.split('T')[0]}`,
    lab_date || now.split('T')[0],
    Number(duration_minutes) || 15,
    JSON.stringify(drawResults),
    notes?.trim() || '',
    now
  );

  return res.status(201).json({
    id: labId,
    draw_results: drawResults,
    message: 'Sorteio de temas e ordem de apresentação realizado e registrado com sucesso!',
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
  const list = db.prepare('SELECT * FROM dispatch_requests ORDER BY created_at DESC').all();
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
  } = req.body;

  if (!requester_name || !event_name || !event_date || !role_function) {
    return res.status(400).json({ error: 'Missionário, Evento, Data e Função são obrigatórios para solicitar envio.' });
  }

  const id = 'env_' + crypto.randomBytes(6).toString('hex');
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO dispatch_requests (
      id, requester_name, pastoral_member_id, event_name, event_date, event_time,
      location, organization, participation_type, role_function, theme,
      recipient, status, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Aguardando análise', ?, ?, ?)
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
    now,
    now
  );

  const dateFormatted = event_date.split('-').reverse().join('/');
  const whatsappText =
    `Paz e bem, ${recipient || 'Pedro e Fernanda'}! 🙏🕊️\n\n` +
    `Gostaria de solicitar o *Envio Missionário* pela Pastoral Missionária:\n\n` +
    `• *Missionário(a):* ${requester_name.trim()}\n` +
    `• *Evento/Missão:* ${event_name.trim()}\n` +
    `• *Data:* ${dateFormatted}${event_time ? ` às ${event_time}` : ''}\n` +
    `• *Local/Grupo:* ${organization || 'Paróquia'}${location ? ` (${location})` : ''}\n` +
    `• *Função:* ${role_function}\n` +
    (theme ? `• *Tema:* ${theme.trim()}\n` : '') +
    (notes ? `• *Observações:* ${notes.trim()}\n` : '') +
    `\nAguardo a análise e bênção da coordenação. "Uma só coisa é necessária: Estar perto de Jesus!"`;

  return res.status(201).json({
    id,
    whatsappText,
    waLink: `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappText)}`,
    message: 'Solicitação de envio registrada! Você pode revisar e abrir a mensagem para a coordenação no WhatsApp.',
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

// 6. TEMPLATES & ANNOUNCEMENTS
platformRouter.get('/templates', authenticateToken, (_req: AuthenticatedRequest, res: Response) => {
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
  const { status, pastoral_role, qualifications, skills } = req.body;
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE pastoral_members
    SET status = COALESCE(?, status),
        pastoral_role = COALESCE(?, pastoral_role),
        qualifications_json = COALESCE(?, qualifications_json),
        skills_json = COALESCE(?, skills_json),
        updated_at = ?
    WHERE id = ?
  `).run(
    status || null,
    pastoral_role || null,
    Array.isArray(qualifications) ? JSON.stringify(qualifications) : null,
    Array.isArray(skills) ? JSON.stringify(skills) : null,
    now,
    id
  );

  db.prepare(`
    INSERT INTO audit_logs (id, user_id, user_name, action, entity_type, entity_id, details_json, created_at)
    VALUES (?, ?, ?, 'UPDATE_PASTORAL_MEMBER_GOVERNANCE', 'pastoral_member', ?, ?, ?)
  `).run(crypto.randomUUID(), req.user?.id, req.user?.name, id, JSON.stringify({ status, pastoral_role, qualifications }), now);

  return res.json({ message: 'Cadastro institucional e habilitações do membro atualizados.' });
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
