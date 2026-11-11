import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { db } from './database.js';

export const CALENDAR_2027_SEED = [
  { id: 'cal-2027-01-24', date: '2027-01-24', title: 'Reunião de boas-vindas', category: 'Reuniões', status: 'Planejado', notes: 'Abertura do ano missionário 2027 (Calendário Oficial PDF).' },
  { id: 'cal-2027-01-31', date: '2027-01-31', title: 'Reunião Missionária', category: 'Reuniões', status: 'Planejado', notes: 'Reunião ordinária da Pastoral Missionária.' },
  { id: 'cal-2027-02-21', date: '2027-02-21', title: 'Venda de lanches ou reunião — indefinido', category: 'Arrecadações', status: 'A confirmar', notes: 'Registrado no PDF oficial como "Venda de lanches ou reunião".' },
  { id: 'cal-2027-02-28', date: '2027-02-28', title: 'Reunião Missionária', category: 'Reuniões', status: 'Planejado', notes: 'Reunião ordinária da Pastoral Missionária.' },
  { id: 'cal-2027-03-06', date: '2027-03-06', title: 'Reunião Missionária', category: 'Reuniões', status: 'Planejado', notes: 'Reunião ordinária da Pastoral Missionária.' },
  { id: 'cal-2027-03-14', date: '2027-03-14', title: 'Pré Abra-te', category: 'Eventos', status: 'Planejado', notes: 'Encontro preparatório antes do Retiro Éfeta para o Ágape Apostolado.' },
  { id: 'cal-2027-04-04', date: '2027-04-04', title: 'Filme da Missionária', category: 'Eventos', status: 'Planejado', notes: 'Momento formativo e fraterno da Pastoral Missionária.' },
  { id: 'cal-2027-04-17', date: '2027-04-17', title: 'Reunião Missionária', category: 'Reuniões', status: 'Planejado', notes: 'Reunião ordinária da Pastoral Missionária.' },
  { id: 'cal-2027-04-24', date: '2027-04-24', title: 'Vigília Missionária', category: 'Vigílias', status: 'Planejado', notes: 'Vigília "Volta ao teu primeiro amor" para servos dos Ágapes.' },
  { id: 'cal-2027-05-16', date: '2027-05-16', title: 'Reunião Missionária', category: 'Reuniões', status: 'Planejado', notes: 'Reunião ordinária da Pastoral Missionária.' },
  { id: 'cal-2027-05-23', date: '2027-05-23', title: 'Estágio da Missionária', category: 'Estágios', status: 'Planejado', notes: 'Estágio prático com os cursistas do período formativo.' },
  { id: 'cal-2027-06-13', date: '2027-06-13', title: 'Reunião Missionária', category: 'Reuniões', status: 'Planejado', notes: 'Reunião ordinária da Pastoral Missionária.' },
  { id: 'cal-2027-06-19', date: '2027-06-19', title: 'Reunião Missionária', category: 'Reuniões', status: 'Planejado', notes: 'Reunião ordinária da Pastoral Missionária.' },
  { id: 'cal-2027-06-26', date: '2027-06-26', title: 'Revolução Jesus', category: 'Missões', status: 'Planejado', notes: 'Tarde de louvor e evangelização para jovens e comunidade.' },
  { id: 'cal-2027-07-04', date: '2027-07-04', title: 'Reunião Missionária', category: 'Reuniões', status: 'Planejado', notes: 'Reunião ordinária da Pastoral Missionária.' },
  { id: 'cal-2027-07-18', date: '2027-07-18', title: 'Arrecadação para o caixa', category: 'Arrecadações', status: 'Planejado', notes: 'Ação de arrecadação de fundos para o caixa da Missionária.' },
  { id: 'cal-2027-07-31', date: '2027-07-31', title: 'Gincana da Missionária', category: 'Eventos', status: 'Planejado', notes: 'Integração, unidade e vivência fraterna.' },
  { id: 'cal-2027-08-07', date: '2027-08-07', title: 'Reunião Missionária', category: 'Reuniões', status: 'Planejado', notes: 'Reunião ordinária da Pastoral Missionária.' },
  { id: 'cal-2027-08-22', date: '2027-08-22', title: 'Feira das Vocações', category: 'Eventos', status: 'Planejado', notes: 'Apresentação das vocações matrimonial, sacerdotal, religiosa e laical.' },
  { id: 'cal-2027-08-29', date: '2027-08-29', title: 'Estágio em conjunto', category: 'Estágios', status: 'Planejado', notes: 'Estágio realizado em parceria pastoral.' },
  { id: 'cal-2027-09-05', date: '2027-09-05', title: 'Reunião Missionária', category: 'Reuniões', status: 'Planejado', notes: 'Reunião ordinária da Pastoral Missionária.' },
  { id: 'cal-2027-09-18', date: '2027-09-18', title: 'Feira Bíblica', category: 'Eventos', status: 'Planejado', notes: 'Realizada no mês da Bíblia em parceria com a Catequese.' },
  { id: 'cal-2027-10-02', date: '2027-10-02', title: 'Agapinho', category: 'Missões', status: 'Planejado', notes: 'Encontro Agapinho / Seminário de Vida Kids (8 a 14 anos).' },
  { id: 'cal-2027-10-09', date: '2027-10-09', title: 'Tarde Mariana', category: 'Eventos', status: 'Planejado', notes: 'Encontro de espiritualidade e devoção a Nossa Senhora.' },
  { id: 'cal-2027-10-17', date: '2027-10-17', title: 'Reunião Missionária', category: 'Reuniões', status: 'Planejado', notes: 'Reunião ordinária da Pastoral Missionária.' },
  { id: 'cal-2027-12-19', date: '2027-12-19', title: 'Confraternização da Missionária', category: 'Confraternizações', status: 'Planejado', notes: 'Encerramento anual e ação de graças da Pastoral Missionária.' },
];

export const OFFICIAL_LAB_THEMES = [
  { number: 1, title: 'Chamado a ser apóstolo', category: 'Vocação Missionária' },
  { number: 2, title: 'Conhecer a pessoa de Jesus Cristo e Sua doutrina', category: 'Cristologia e Doutrina' },
  { number: 3, title: 'Testemunhar a Paixão, Morte e Ressurreição de Jesus Cristo é ser Santo', category: 'Mistério Pascal' },
  { number: 4, title: 'Maria, testemunha de Fé e Santidade', category: 'Mariologia' },
  { number: 5, title: 'Ser igreja apostólica', category: 'Eclesiologia' },
  { number: 6, title: 'Martírio dos Apóstolos', category: 'Testemunho Cristão' },
  { number: 7, title: 'O Pai nos ama e nos quer a seu serviço', category: 'Amor de Deus' },
  { number: 8, title: 'São Paulo por excelência', category: 'Modelos de Missão' },
  { number: 9, title: 'Maria, Rainha dos Apóstolos', category: 'Mariologia' },
  { number: 10, title: 'Servir: questão de vida ou morte', category: 'Vida Missionária' },
  { number: 11, title: 'Amor de Deus: pessoa do Pai', category: 'Querigma' },
  { number: 12, title: 'Amor de Deus: pessoa do Filho', category: 'Querigma' },
  { number: 13, title: 'Pecado e Salvação', category: 'Querigma' },
  { number: 14, title: 'Fé e Conversão', category: 'Querigma' },
  { number: 15, title: 'Ser inteiramente de Jesus', category: 'Consagração e Santidade' },
  { number: 16, title: 'Amor de Deus: pessoa do Espírito Santo', category: 'Querigma' },
  { number: 17, title: 'Espírito Santo: Os Dons infusos como instrumento de Santificação', category: 'Pneumatologia' },
  { number: 18, title: 'Espírito Santo: Os Dons efusos como instrumento de Evangelização', category: 'Pneumatologia' },
  { number: 19, title: 'Ser Igreja / Vida em Comunidade', category: 'Querigma e Comunidade' },
];

export const OFFICIAL_EVENT_TEMPLATES = [
  {
    slug: 'pre-querigmatico',
    title: 'Encontro Pré-Querigmático',
    target_audience: 'Servos e Coordenadores do Ágape Discipulado',
    objective: 'Preparar e instruir os servos e coordenadores do Ágape Discipulado sobre o trabalho no retiro e as funções de cada equipe, relembrando o Primeiro Amor.',
    suggested_theme: 'A importância do testemunho, obediência e oração do Servo Agapista',
    schedule: [
      '13h30 — Concentração',
      '14h00 — Animação e Oração Inicial',
      '14h30 — Formação dentro do tema escolhido',
      '15h30 — Estandes das 10 equipes do retiro',
      '16h00 — Lanche',
      '16h30 — Dinâmica de entrosamento',
      '17h00 — Passagem do cronograma do Retiro (Coord. Gerais)',
      '17h45 — Adoração ao Santíssimo',
      '18h20 — Encerramento e Oração Final',
    ],
    teams: ['Coordenação de Comunidade', 'Dinâmica', 'Música', 'Intercessão', 'Mensagem', 'Ornamentação', 'Limpeza', 'Teatro', 'Secretaria', 'Externa'],
    guidelines: 'Planejamento sob responsabilidade da Pastoral Missionária com participação da Pastoral da Misericórdia. Escolher 2 servos apresentadores.',
    source_reference: 'Documento Institucional Pastoral Missionária (p. 7-8)',
  },
  {
    slug: 'pre-espiritual',
    title: 'Encontro Pré-Espiritual',
    target_audience: 'Servos e Coordenadores Gerais do Ágape Discipulado',
    objective: 'Instruir os servos sobre o trabalho no Retiro Espiritual, promovendo oração, fortalecimento, união e surpresa preparada junto aos cursistas.',
    suggested_theme: 'Viver para Mim é Cristo (Pe. Fábio de Melo) / Vai Valer a Pena',
    schedule: [
      '13h30 — Concentração',
      '14h00 — Animação e Oração Inicial',
      '14h15 — Peça: Vai Valer a Pena (Livres para Adorar)',
      '14h45 — Meditação do Homem Morto',
      '15h15 — Formação dentro do tema escolhido',
      '16h00 — Lanche',
      '16h30 — Passagem do cronograma do Retiro',
      '17h30 — Surpresa dos Cursistas',
      '18h00 — Oração Final',
      '18h30 — Encerramento',
    ],
    teams: ['Apresentadores', 'Teatro', 'Música', 'Intercessão', 'Apoio', 'Ornamentação'],
    guidelines: 'Organizar previamente junto aos cursistas do Discipulado a homenagem/surpresa (vídeo, cartazes ou cartas) para os servos.',
    source_reference: 'Documento Institucional Pastoral Missionária (p. 8-9)',
  },
  {
    slug: 'pre-abra-te',
    title: 'Encontro Pré Abra-te',
    target_audience: 'Futuros membros do Ágape Apostolado (antes do Retiro Éfeta)',
    objective: 'Apresentar o Apostolado para os futuros membros, promover entrosamento e refletir sobre o chamado de Deus à Evangelização (1Co 9,16).',
    suggested_theme: 'Antes que no seio fosses formado, eu já te conhecia e te consagrei profeta das nações (Jr 1,4) + Música "Anuncia-me" (Pe. Jonas Abib)',
    schedule: [
      '13h30 — Concentração',
      '14h00 — Animação e Oração Inicial (Oração de entrega)',
      '14h30 — Formação dentro do tema escolhido',
      '15h20 — Dinâmica de entrosamento',
      '15h45 — Testemunho de um servo do Ágape Apostolado',
      '16h20 — Lanche coletivo',
      '17h00 — Partilha dos cursistas',
      '17h30 — Adoração e Oração final',
      '18h20 — Encerramento',
    ],
    teams: ['Apresentadores', 'Música', 'Formação', 'Dinâmica', 'Intercessão', 'Lanche'],
    guidelines: 'Realizado preferencialmente no Domingo anterior ao Retiro Éfeta.',
    source_reference: 'Documento Institucional Pastoral Missionária (p. 9-10)',
  },
  {
    slug: 'vigilia-primeiro-amor',
    title: 'Vigília "Volta ao teu primeiro amor"',
    target_audience: 'Servos dos Ágapes da Paróquia (e Ágapes convidados)',
    objective: 'Noite de oração para relembrar o momento em que conheceram o Amor de Deus e retornar ao caminho de conversão.',
    suggested_theme: 'Volta ao teu primeiro amor (Jo 3,16 / Mc 8,34)',
    schedule: [
      '21h30 — Concentração',
      '22h00 — Animação e Oração Inicial',
      '23h00 — 1ª Formação (Tema do encontro)',
      '23h50 — Dinâmica de entrosamento',
      '00h20 — Lanche',
      '00h50 — Animação',
      '01h00 — Terço Mariano meditado',
      '01h30 — 2ª Formação (Nossa Senhora)',
      '02h20 — Peça teatral ("Dê")',
      '02h50 — Momento da Misericórdia',
      '03h20 — Lanche',
      '03h50 — Testemunho jovem',
      '04h20 — Momento de Efusão / Clamor ao Espírito Santo',
      '04h50 — Oração Final',
      '05h00 — Encerramento',
    ],
    teams: ['Coordenação', 'Música', 'Intercessão', 'Teatro', 'Liturgia/Adoração', 'Cozinha/Lanche', 'Acolhida'],
    guidelines: 'Cronograma de noite/madrugada (21h30 às 05h00).',
    source_reference: 'Documento Institucional Pastoral Missionária (p. 10-11)',
  },
  {
    slug: 'revolucao-jesus',
    title: 'Revolução Jesus (Tarde de Louvor)',
    target_audience: 'Jovens e Comunidade Paroquial',
    objective: 'Apresentar o grupo Ágape e demonstrar a alegria de ser cristão e viver o Amor de Deus.',
    suggested_theme: 'Opção 1: "Alegrai-vos sempre no Senhor" (Ne 8,10) | Opção 2: "Ser Jovem, sem deixar de ser de Deus"',
    schedule: [
      '14h00 — Chegada e acolhida dos jovens / comunidade',
      '14h30 — Animação e oração inicial',
      '14h50 — Formação ou Terço da Misericórdia meditado',
      '15h40 — Lanche',
      '16h00 — Dinâmica de interação e entrosamento',
      '16h20 — Testemunho Jovem / Formação',
      '17h00 — Adoração ou Terço Mariano meditado',
      '17h30 — Peça teatral / Oração final',
      '18h30 — Encerramento',
    ],
    teams: ['Acolhida', 'Música', 'Pregação', 'Teatro', 'Dinâmica', 'Intercessão'],
    guidelines: 'Pode ser realizada na própria paróquia ou em comunidades vizinhas.',
    source_reference: 'Documento Institucional Pastoral Missionária (p. 11-12)',
  },
  {
    slug: 'o-sentido-da-vida',
    title: 'Encontro "O Sentido da Vida" (Setembro)',
    target_audience: 'Jovens e Adolescentes da Comunidade',
    objective: 'Abordar desafios da juventude (ansiedade, depressão, saúde mental) à luz do Amor de Deus e do valor da vida.',
    suggested_theme: 'Queres saber do teu valor? Olhe para a Cruz, tu vales um Deus crucificado.',
    schedule: [
      '13h30 — Concentração dos jovens',
      '14h00 — Oração inicial',
      '14h10 — Formação com psicólogo/terapeuta católico convidado',
      '15h15 — Dinâmica',
      '15h40 — Partilha entre comunidades e entrega de lembrancinhas',
      '16h15 — Teatro (Música: "O sol ainda brilha" — Rosa de Saron)',
      '16h40 — Testemunho Jovem ("Tenha Jesus em seu coração e todas as cruzes parecerão rosas")',
      '17h10 — Momento de oração e espiritualização',
      '17h45 — Lanche coletivo',
      '18h15 — Oração final e avisos',
    ],
    teams: ['Acolhida', 'Formação', 'Teatro', 'Música', 'Intercessão', 'Lembrancinhas', 'Lanche'],
    guidelines: 'Convidar profissional católico da área de psicologia/saúde mental.',
    source_reference: 'Documento Institucional Pastoral Missionária (p. 16-17)',
  },
  {
    slug: 'estagio-essencia-missionaria',
    title: 'Estágio: A Essência da Pastoral Missionária (6 Estações)',
    target_audience: 'Cursistas do Período Formativo do Ágape Apostolado',
    objective: 'Mostrar que a Pastoral Missionária forma pessoas apaixonadas por Cristo que evangelizam por meio de múltiplos dons e serviços.',
    suggested_theme: 'Ide e fazei discípulos (Mt 28,19-20) — "Senhor, eis-me aqui. Como queres que eu Te sirva?"',
    schedule: [
      'Acolhida (15 min) — Oração inicial, Espírito Santo, Mt 28,19-20 e Música',
      'Apresentação do Tema (10 min) — O que é ser missionário?',
      'Estação 1 — A palavra que evangeliza (Dinâmica: "Pregue com o Inesperado" — 3 min)',
      'Estação 2 — Pregação (Dinâmica: "Um Versículo, Uma Reflexão" — 2 min)',
      'Estação 3 — Palestra/Formação (Dinâmica: "Forme um Discípulo")',
      'Estação 4 — Música (Dinâmica: "A Importância da Música")',
      'Estação 5 — Intercessão (Dinâmica: "Interceder" em duplas)',
      'Estação 6 — Testemunho (Dinâmica: "Viver o Meu Testemunho")',
      'Encerramento — Dinâmica "A Missão Começa em Mim" (Espelho, Cruz e Bíblia + Oração a São Padre Pio)',
    ],
    teams: ['Dupla Estação 1', 'Dupla Estação 2', 'Dupla Estação 3', 'Dupla Estação 4', 'Dupla Estação 5', 'Dupla Estação 6'],
    guidelines: 'Cada estação é conduzida por 2 membros da Missionária.',
    source_reference: 'Documento Institucional Pastoral Missionária (p. 24-28)',
  },
];

export function runMigrations() {
  const now = new Date().toISOString();

  // 1. Ensure schema_migrations table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const applied = new Set(
    (db.prepare('SELECT version FROM schema_migrations').all() as { version: string }[]).map((r) => r.version)
  );

  // Migration 001: Pastoral Ecosystem Foundation
  if (!applied.has('001_pastoral_ecosystem_v2')) {
    const migrate001 = db.transaction(() => {
      db.exec(`
        -- Cadastro Institucional de Membros da Pastoral (Separado dos Compradores de Camisetas)
        CREATE TABLE IF NOT EXISTS pastoral_members (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          buyer_member_id TEXT REFERENCES members(id),
          name TEXT NOT NULL,
          display_name TEXT NOT NULL,
          email TEXT,
          phone TEXT,
          photo_url TEXT,
          status TEXT NOT NULL DEFAULT 'ativo' CHECK(status IN ('pendente', 'ativo', 'suspenso', 'desativado', 'ex_membro')),
          pastoral_role TEXT NOT NULL DEFAULT 'membro' CHECK(pastoral_role IN ('coordenador', 'delegado', 'membro')),
          joined_at TEXT,
          qualifications_json TEXT NOT NULL DEFAULT '["Intercessão"]',
          skills_json TEXT NOT NULL DEFAULT '[]',
          availability_json TEXT NOT NULL DEFAULT '{}',
          welcome_checklist_json TEXT NOT NULL DEFAULT '{}',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        -- Permissões Granulares e Delegações por Módulo/Ação
        CREATE TABLE IF NOT EXISTS user_capabilities (
          id TEXT PRIMARY KEY,
          pastoral_member_id TEXT NOT NULL REFERENCES pastoral_members(id) ON DELETE CASCADE,
          role_label TEXT NOT NULL,
          module TEXT NOT NULL,
          actions_json TEXT NOT NULL,
          granted_by TEXT NOT NULL,
          created_at TEXT NOT NULL
        );

        -- Governança e Transferência de Coordenação
        CREATE TABLE IF NOT EXISTS coordination_succession (
          id TEXT PRIMARY KEY,
          coordinator_name TEXT NOT NULL,
          role_title TEXT NOT NULL,
          status TEXT NOT NULL CHECK(status IN ('ativo', 'proposto', 'concluido', 'revogado')),
          proposed_by TEXT,
          started_at TEXT NOT NULL,
          ended_at TEXT,
          checklist_json TEXT,
          notes TEXT,
          created_at TEXT NOT NULL
        );

        -- Calendário Centralizado da Pastoral
        CREATE TABLE IF NOT EXISTS calendar_events (
          id TEXT PRIMARY KEY,
          external_stable_id TEXT UNIQUE,
          title TEXT NOT NULL,
          description TEXT,
          event_date TEXT NOT NULL,
          event_time TEXT,
          location TEXT,
          category TEXT NOT NULL CHECK(category IN ('Reuniões', 'Missões', 'Estágios', 'Laboratórios', 'Formações', 'Vigílias', 'Retiros', 'Eventos', 'Arrecadações', 'Confraternizações', 'Outros')),
          status TEXT NOT NULL DEFAULT 'Planejado' CHECK(status IN ('Planejado', 'A confirmar', 'Confirmado', 'Adiado', 'Cancelado', 'Concluído')),
          visibility TEXT NOT NULL DEFAULT 'publico' CHECK(visibility IN ('publico', 'membros', 'coordenacao')),
          responsibles_json TEXT NOT NULL DEFAULT '[]',
          materials_json TEXT NOT NULL DEFAULT '[]',
          notes TEXT,
          source TEXT NOT NULL DEFAULT 'Manual',
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        -- Temas Oficiais de Laboratórios de Pregação
        CREATE TABLE IF NOT EXISTS lab_themes (
          id TEXT PRIMARY KEY,
          theme_number INTEGER NOT NULL UNIQUE,
          title TEXT NOT NULL,
          category TEXT NOT NULL,
          active INTEGER NOT NULL DEFAULT 1
        );

        -- Sessões de Laboratórios de Pregação
        CREATE TABLE IF NOT EXISTS preaching_labs (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          lab_date TEXT NOT NULL,
          duration_minutes INTEGER NOT NULL DEFAULT 15,
          status TEXT NOT NULL DEFAULT 'planejado' CHECK(status IN ('planejado', 'em_andamento', 'concluido')),
          draw_results_json TEXT NOT NULL DEFAULT '[]',
          notes TEXT,
          created_at TEXT NOT NULL
        );

        -- Avaliações dos Laboratórios (8 Critérios + Comentários + Sugestão de Temas Futuros)
        CREATE TABLE IF NOT EXISTS lab_evaluations (
          id TEXT PRIMARY KEY,
          lab_id TEXT,
          lab_date TEXT NOT NULL,
          speaker_name TEXT NOT NULL,
          theme_title TEXT NOT NULL,
          evaluator_name TEXT,
          crit_dominio_assunto TEXT NOT NULL CHECK(crit_dominio_assunto IN ('Sim', 'Razoavelmente', 'Não')),
          crit_abordagem_tema TEXT NOT NULL CHECK(crit_abordagem_tema IN ('Sim', 'Razoavelmente', 'Não')),
          crit_objetividade TEXT NOT NULL CHECK(crit_objetividade IN ('Sim', 'Razoavelmente', 'Não')),
          crit_cumprimento_tempo TEXT NOT NULL CHECK(crit_cumprimento_tempo IN ('Sim', 'Razoavelmente', 'Não')),
          crit_embasamento_biblico TEXT NOT NULL CHECK(crit_embasamento_biblico IN ('Sim', 'Razoavelmente', 'Não')),
          crit_interacao TEXT NOT NULL CHECK(crit_interacao IN ('Sim', 'Razoavelmente', 'Não')),
          crit_testemunho TEXT NOT NULL CHECK(crit_testemunho IN ('Sim', 'Razoavelmente', 'Não')),
          crit_oracao TEXT NOT NULL CHECK(crit_oracao IN ('Sim', 'Razoavelmente', 'Não')),
          comments TEXT,
          suggested_future_themes TEXT,
          created_at TEXT NOT NULL
        );

        -- Central de Solicitações de Envio Missionário
        CREATE TABLE IF NOT EXISTS dispatch_requests (
          id TEXT PRIMARY KEY,
          requester_name TEXT NOT NULL,
          pastoral_member_id TEXT,
          event_name TEXT NOT NULL,
          event_date TEXT NOT NULL,
          event_time TEXT,
          location TEXT,
          organization TEXT,
          participation_type TEXT NOT NULL,
          role_function TEXT NOT NULL,
          theme TEXT,
          recipient TEXT NOT NULL DEFAULT 'Coordenação (Pedro e Fernanda)',
          status TEXT NOT NULL DEFAULT 'Aguardando análise' CHECK(status IN ('Rascunho', 'Aguardando análise', 'Informação complementar solicitada', 'Aprovado', 'Negado', 'Cancelado', 'Concluído')),
          notes TEXT,
          coordinator_feedback TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        -- Modelos Prontos de Encontros, Missões e Estágios
        CREATE TABLE IF NOT EXISTS event_templates (
          id TEXT PRIMARY KEY,
          slug TEXT UNIQUE NOT NULL,
          title TEXT NOT NULL,
          target_audience TEXT NOT NULL,
          objective TEXT NOT NULL,
          suggested_theme TEXT,
          schedule_json TEXT NOT NULL,
          teams_json TEXT NOT NULL,
          guidelines TEXT,
          source_reference TEXT NOT NULL
        );

        -- Comunicados e Avisos da Pastoral
        CREATE TABLE IF NOT EXISTS announcements (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          category TEXT NOT NULL,
          audience TEXT NOT NULL DEFAULT 'todos',
          pinned INTEGER NOT NULL DEFAULT 0,
          author_name TEXT NOT NULL,
          expires_at TEXT,
          created_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(event_date);
        CREATE INDEX IF NOT EXISTS idx_dispatch_requests_status ON dispatch_requests(status);
        CREATE INDEX IF NOT EXISTS idx_lab_evaluations_speaker ON lab_evaluations(speaker_name);
      `);

      db.prepare('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)').run(
        '001_pastoral_ecosystem_v2',
        'Fundação do Ecossistema Pastoral Missionária 2.0 (Calendário 2027, Laboratórios, Envios, Governança e Templates)',
        now
      );
    });

    migrate001();
    console.log('✓ Migração 001_pastoral_ecosystem_v2 aplicada com sucesso.');
  }

  // Ensure base ecosystem records exist before incremental migrations 002..011 run
  seedEcosystemData();

  // Migration 002: User Roles, Google Auth, Onboarding & Community
  if (!applied.has('002_user_roles_and_google_auth')) {
    const migrate002 = db.transaction(() => {
      // 1. Recreate users table to expand role CHECK constraint and add google_id / picture_url
      db.exec(`
        CREATE TABLE users_temp (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE COLLATE NOCASE,
          password_hash TEXT,
          role TEXT NOT NULL CHECK(role IN ('admin', 'coordenador', 'delegado', 'membro', 'pendente', 'consulta')),
          google_id TEXT,
          picture_url TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        INSERT INTO users_temp (id, name, email, password_hash, role, created_at, updated_at)
        SELECT id, name, email, password_hash, role, created_at, updated_at FROM users;

        DROP TABLE users;
        ALTER TABLE users_temp RENAME TO users;
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

        -- Onboarding e Vínculo de Membros / Compradores
        CREATE TABLE IF NOT EXISTS member_link_requests (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          claimed_member_id TEXT REFERENCES members(id),
          claimed_pastoral_member_id TEXT REFERENCES pastoral_members(id),
          status TEXT NOT NULL DEFAULT 'pendente' CHECK(status IN ('pendente', 'aprovado', 'rejeitado')),
          user_notes TEXT,
          reviewed_by TEXT,
          reviewed_at TEXT,
          created_at TEXT NOT NULL
        );

        -- Comunidade Missionária (Feed de Postagens, Curtidas e Comentários)
        CREATE TABLE IF NOT EXISTS community_posts (
          id TEXT PRIMARY KEY,
          author_id TEXT NOT NULL,
          author_name TEXT NOT NULL,
          author_role TEXT NOT NULL DEFAULT 'membro',
          author_avatar TEXT,
          content TEXT NOT NULL,
          category TEXT NOT NULL DEFAULT 'Partilha',
          image_url TEXT,
          link_url TEXT,
          likes_count INTEGER NOT NULL DEFAULT 0,
          comments_count INTEGER NOT NULL DEFAULT 0,
          is_pinned INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS community_likes (
          post_id TEXT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
          user_id TEXT NOT NULL,
          created_at TEXT NOT NULL,
          PRIMARY KEY (post_id, user_id)
        );

        CREATE TABLE IF NOT EXISTS community_comments (
          id TEXT PRIMARY KEY,
          post_id TEXT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
          author_id TEXT NOT NULL,
          author_name TEXT NOT NULL,
          author_avatar TEXT,
          content TEXT NOT NULL,
          created_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_posts_created_at ON community_posts(created_at);
        CREATE INDEX IF NOT EXISTS idx_comments_post_id ON community_comments(post_id);
      `);

      db.prepare('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)').run(
        '002_user_roles_and_google_auth',
        'Suporte a Google Auth, perfis expandidos, vínculo de membros e comunidade missionária',
        now
      );
    });

    migrate002();
    console.log('✓ Migração 002_user_roles_and_google_auth aplicada com sucesso.');
  }

  // Migration 003: Lab Draws History, Mission Companions, Community Media & Pix
  if (!applied.has('003_lab_draws_companions_and_persistence')) {
    const migrate003 = db.transaction(() => {
      // 1. Tabela dedicada para Histórico de Sorteios dos Laboratórios
      db.exec(`
        CREATE TABLE IF NOT EXISTS lab_draws (
          id TEXT PRIMARY KEY,
          laboratory_date TEXT NOT NULL,
          laboratory_name TEXT NOT NULL,
          coordinator_name TEXT NOT NULL,
          draw_date TEXT NOT NULL,
          duration_minutes INTEGER NOT NULL DEFAULT 20,
          participants_count INTEGER NOT NULL,
          participants_json TEXT NOT NULL,
          rules_json TEXT NOT NULL DEFAULT '{}',
          status TEXT NOT NULL DEFAULT 'ativo' CHECK(status IN ('ativo', 'arquivado', 'excluido')),
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);

      // 2. Coluna de Acompanhantes em dispatch_requests
      const dispatchCols = (db.prepare('PRAGMA table_info(dispatch_requests)').all() as any[]).map((c) => c.name);
      if (!dispatchCols.includes('companions_json')) {
        db.exec("ALTER TABLE dispatch_requests ADD COLUMN companions_json TEXT NOT NULL DEFAULT '[]';");
      }

      // 3. Coluna de Vídeo em community_posts
      const postCols = (db.prepare('PRAGMA table_info(community_posts)').all() as any[]).map((c) => c.name);
      if (!postCols.includes('video_url')) {
        db.exec('ALTER TABLE community_posts ADD COLUMN video_url TEXT;');
      }

      // 4. Pré-autorizar Coordenador Pedro (pedropignata2@gmail.com) no banco
      db.prepare(`
        INSERT INTO users (id, name, email, role, created_at, updated_at)
        VALUES ('user_pedro_coordinator', 'Pedro Rafael', 'pedropignata2@gmail.com', 'coordenador', datetime('now'), datetime('now'))
        ON CONFLICT(email) DO UPDATE SET role = 'coordenador', updated_at = datetime('now')
      `).run();

      // Ensure pastoral_members records have coordinator emails
      db.prepare("UPDATE pastoral_members SET email = 'pedropignata2@gmail.com' WHERE id = 'pmem_pedro'").run();
      db.prepare("UPDATE pastoral_members SET email = 'fernandasouto7826@gmail.com' WHERE id = 'pmem_fernanda'").run();

      // 5. Configuração padrão de Pix em integration_settings
      const existingPix = db.prepare("SELECT value_json FROM integration_settings WHERE key = 'pix_payment'").get();
      if (!existingPix) {
        db.prepare(`
          INSERT INTO integration_settings (key, value_json, updated_at)
          VALUES ('pix_payment', ?, datetime('now'))
        `).run(
          JSON.stringify({
            pix_key: 'pastoralmissionaria@agape.org.br',
            key_type: 'email',
            receiver_name: 'Pastoral Missionária — Paróquia São Vicente de Paulo',
            instructions: 'Após realizar o Pix, envie o comprovante para a coordenação (Pedro ou Fernanda) registrar a baixa do seu pedido.',
          })
        );
      }

      // 6. Registrar migração
      db.prepare(`
        INSERT INTO schema_migrations (version, name, applied_at)
        VALUES ('003_lab_draws_companions_and_persistence', 'Histórico de sorteios, acompanhantes em missões, suporte a vídeo na comunidade e chave Pix configurável', datetime('now'))
      `).run();
    });

    migrate003();
    console.log('✓ Migração 003_lab_draws_companions_and_persistence aplicada com sucesso.');
  }

  // Migration 004: Ecosystem Master 4.0 - Member Management, Dynamic Birthdays, Lab Groups & 2026 Events
  if (!applied.has('004_master_4_0_ecosystem_evolution')) {
    const migrate004 = db.transaction(() => {
      // 1. lab_themes: add description column if missing
      const labThemeCols = (db.prepare('PRAGMA table_info(lab_themes)').all() as any[]).map((c) => c.name);
      if (!labThemeCols.includes('description')) {
        db.exec('ALTER TABLE lab_themes ADD COLUMN description TEXT;');
      }

      // 2. pastoral_members: add birth_day, birth_month, birth_year, birthday_visibility, notes
      const pastoralCols = (db.prepare('PRAGMA table_info(pastoral_members)').all() as any[]).map((c) => c.name);
      if (!pastoralCols.includes('birth_day')) {
        db.exec('ALTER TABLE pastoral_members ADD COLUMN birth_day INTEGER;');
      }
      if (!pastoralCols.includes('birth_month')) {
        db.exec('ALTER TABLE pastoral_members ADD COLUMN birth_month INTEGER;');
      }
      if (!pastoralCols.includes('birth_year')) {
        db.exec('ALTER TABLE pastoral_members ADD COLUMN birth_year INTEGER;');
      }
      if (!pastoralCols.includes('birthday_visibility')) {
        db.exec("ALTER TABLE pastoral_members ADD COLUMN birthday_visibility TEXT NOT NULL DEFAULT 'members';");
      }
      if (!pastoralCols.includes('notes')) {
        db.exec('ALTER TABLE pastoral_members ADD COLUMN notes TEXT;');
      }

      // 3. lab_draws: add groups_json if missing
      const labDrawCols = (db.prepare('PRAGMA table_info(lab_draws)').all() as any[]).map((c) => c.name);
      if (!labDrawCols.includes('groups_json')) {
        db.exec("ALTER TABLE lab_draws ADD COLUMN groups_json TEXT NOT NULL DEFAULT '[]';");
      }

      // 4. Pre-authorize Fernanda and Pedro as coordinators in users with default credentials
      const defaultCoordHash = bcrypt.hashSync('pastoral@2026', 10);
      db.prepare(`
        INSERT INTO users (id, name, email, password_hash, role, created_at, updated_at)
        VALUES ('user_fernanda_coordinator', 'Fernanda Souto', 'fernandasouto7826@gmail.com', ?, 'coordenador', datetime('now'), datetime('now'))
        ON CONFLICT(email) DO UPDATE SET role = 'coordenador', password_hash = COALESCE(users.password_hash, excluded.password_hash), updated_at = datetime('now')
      `).run(defaultCoordHash);

      db.prepare(`
        INSERT INTO users (id, name, email, password_hash, role, created_at, updated_at)
        VALUES ('user_pedro_coordinator', 'Pedro Rafael', 'pedropignata2@gmail.com', ?, 'coordenador', datetime('now'), datetime('now'))
        ON CONFLICT(email) DO UPDATE SET role = 'coordenador', password_hash = COALESCE(users.password_hash, excluded.password_hash), updated_at = datetime('now')
      `).run(defaultCoordHash);

      // Ensure pastoral_members records have coordinator emails
      db.prepare("UPDATE pastoral_members SET email = 'pedropignata2@gmail.com' WHERE id = 'pmem_pedro'").run();
      db.prepare("UPDATE pastoral_members SET email = 'fernandasouto7826@gmail.com' WHERE id = 'pmem_fernanda'").run();

      // Ensure coordination_succession has Pedro and Fernanda
      db.prepare(`
        INSERT OR IGNORE INTO coordination_succession (id, coordinator_name, role_title, status, proposed_by, started_at, checklist_json, notes, created_at)
        VALUES ('coord-pedro', 'Pedro', 'Coordenador da Pastoral Missionária', 'ativo', 'Institucional', '2026-01-01', '{"permissoes_atribuidas":true}', 'Coordenação em exercício e responsável técnico inicial', datetime('now'))
      `).run();
      db.prepare(`
        INSERT OR IGNORE INTO coordination_succession (id, coordinator_name, role_title, status, proposed_by, started_at, checklist_json, notes, created_at)
        VALUES ('coord-fernanda', 'Fernanda', 'Coordenadora da Pastoral Missionária', 'ativo', 'Institucional', '2026-01-01', '{"permissoes_atribuidas":true}', 'Coordenação em exercício da Pastoral Missionária', datetime('now'))
      `).run();

      // 5. November 2026 events in calendar_events
      const insertCalEvent = db.prepare(`
        INSERT OR IGNORE INTO calendar_events (
          id, external_stable_id, title, description, event_date, event_time, location,
          category, status, visibility, responsibles_json, notes, source, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'publico', ?, ?, 'Coordenação', datetime('now'), datetime('now'))
      `);

      insertCalEvent.run(
        'cal_2026_11_14_formacao_1',
        'cal_2026_11_14_formacao_1',
        '1ª Formação (Novos Membros)',
        'Formação inicial e vocacional para os novos membros da Pastoral Missionária.',
        '2026-11-14',
        '14:00',
        'Paróquia São Vicente de Paulo',
        'Formações',
        'Confirmado',
        JSON.stringify(['Pedro', 'Fernanda']),
        'Presença de todos os novos membros.'
      );

      insertCalEvent.run(
        'cal_2026_11_22_formacao_2',
        'cal_2026_11_22_formacao_2',
        '2ª Formação (Novos Membros)',
        'Segunda etapa formativa doutrinária e espiritual da Pastoral Missionária.',
        '2026-11-22',
        '14:00',
        'Paróquia São Vicente de Paulo',
        'Formações',
        'Confirmado',
        JSON.stringify(['Pedro', 'Fernanda']),
        'Continuidade do itinerário formativo.'
      );

      // 6. Seed real Pix Key: (61)992568165
      const currentPixPayment = db.prepare("SELECT value_json FROM integration_settings WHERE key = 'pix_payment'").get() as any;
      if (currentPixPayment) {
        try {
          const val = JSON.parse(currentPixPayment.value_json || '{}');
          if (!val.pix_key || val.pix_key === 'pastoralmissionaria@agape.org.br') {
            val.pix_key = '(61)992568165';
            val.key_type = 'telefone';
            db.prepare("UPDATE integration_settings SET value_json = ?, updated_at = datetime('now') WHERE key = 'pix_payment'").run(JSON.stringify(val));
          }
        } catch {}
      }

      const currentInst = db.prepare("SELECT value_json FROM integration_settings WHERE key = 'institutional'").get() as any;
      if (currentInst) {
        try {
          const val = JSON.parse(currentInst.value_json || '{}');
          if (!val.pix_key || val.pix_key === 'pastoralmissionaria@agape.org.br') {
            val.pix_key = '(61)992568165';
            db.prepare("UPDATE integration_settings SET value_json = ?, updated_at = datetime('now') WHERE key = 'institutional'").run(JSON.stringify(val));
          }
        } catch {}
      }

      // 7. Seed historical 18-participant lab draw if lab_draws is empty
      const existingDrawsCount = (db.prepare('SELECT COUNT(*) as c FROM lab_draws').get() as any).c;
      if (existingDrawsCount === 0) {
        const historicalParticipants = [
          { speaker_name: 'Saulo', speaker_id: 'pmem_saulo', theme_number: 13, theme_title: 'Pecado e Salvação', presentation_order: 1, duration_minutes: 20, group_number: 1 },
          { speaker_name: 'Malu Neres', speaker_id: 'pmem_malu_neres', theme_number: 2, theme_title: 'Conhecer a pessoa de Jesus Cristo e Sua doutrina', presentation_order: 2, duration_minutes: 20, group_number: 1 },
          { speaker_name: 'Maria Júlia', speaker_id: 'pmem_maria_julia', theme_number: 19, theme_title: 'Ser Igreja / Vida em Comunidade', presentation_order: 3, duration_minutes: 20, group_number: 1 },
          { speaker_name: 'Állan', speaker_id: 'pmem_allan', theme_number: 10, theme_title: 'Servir: questão de vida ou morte', presentation_order: 4, duration_minutes: 20, group_number: 1 },

          { speaker_name: 'Jamilly', speaker_id: 'pmem_jamilly', theme_number: 17, theme_title: 'Espírito Santo: Os Dons infusos como instrumento de Santificação', presentation_order: 1, duration_minutes: 20, group_number: 2 },
          { speaker_name: 'Vinícius (Vini)', speaker_id: 'pmem_vini', theme_number: 1, theme_title: 'Chamado a ser apóstolo', presentation_order: 2, duration_minutes: 20, group_number: 2 },
          { speaker_name: 'Alfredo', speaker_id: 'pmem_alfredo', theme_number: 18, theme_title: 'Espírito Santo: Os Dons efusos como instrumento de Evangelização', presentation_order: 3, duration_minutes: 20, group_number: 2 },
          { speaker_name: 'Maria Luiza Lima', speaker_id: 'pmem_maria_luiza_lima', theme_number: 5, theme_title: 'Ser igreja apostólica', presentation_order: 4, duration_minutes: 20, group_number: 2 },

          { speaker_name: 'Manuella', speaker_id: 'pmem_manuella', theme_number: 7, theme_title: 'O Pai nos ama e nos quer a seu serviço', presentation_order: 1, duration_minutes: 20, group_number: 3 },
          { speaker_name: 'Victor', speaker_id: 'pmem_victor', theme_number: 6, theme_title: 'Martírio dos Apóstolos', presentation_order: 2, duration_minutes: 20, group_number: 3 },
          { speaker_name: 'Laysa', speaker_id: 'pmem_laysa', theme_number: 4, theme_title: 'Maria, testemunha de Fé e Santidade', presentation_order: 3, duration_minutes: 20, group_number: 3 },
          { speaker_name: 'Júlia Viana', speaker_id: 'pmem_julia', theme_number: 14, theme_title: 'Fé e Conversão', presentation_order: 4, duration_minutes: 20, group_number: 3 },

          { speaker_name: 'Mariane', speaker_id: 'pmem_mariane', theme_number: 3, theme_title: 'Testemunhar a Paixão, Morte e Ressurreição de Jesus Cristo é ser Santo', presentation_order: 1, duration_minutes: 20, group_number: 4 },
          { speaker_name: 'Letícia', speaker_id: 'pmem_leticia', theme_number: 9, theme_title: 'Maria, Rainha dos Apóstolos', presentation_order: 2, duration_minutes: 20, group_number: 4 },
          { speaker_name: 'Maria Eduarda Fernandes (Duda Fernandes)', speaker_id: 'pmem_duda_fernandes', theme_number: 8, theme_title: 'São Paulo por excelência', presentation_order: 3, duration_minutes: 20, group_number: 4 },

          { speaker_name: 'Duda Soares', speaker_id: 'pmem_duda_soares', theme_number: 15, theme_title: 'Ser inteiramente de Jesus', presentation_order: 1, duration_minutes: 20, group_number: 5 },
          { speaker_name: 'Lyvia', speaker_id: 'pmem_lyvia', theme_number: 12, theme_title: 'Amor de Deus: pessoa do Filho', presentation_order: 2, duration_minutes: 20, group_number: 5 },
          { speaker_name: 'Erick Kilbert', speaker_id: 'pmem_erick_kilbert', theme_number: 11, theme_title: 'Amor de Deus: pessoa do Pai', presentation_order: 3, duration_minutes: 20, group_number: 5 }
        ];

        const historicalGroups = [
          { group_number: 1, duration_minutes: 80, members: historicalParticipants.filter(p => p.group_number === 1) },
          { group_number: 2, duration_minutes: 80, members: historicalParticipants.filter(p => p.group_number === 2) },
          { group_number: 3, duration_minutes: 80, members: historicalParticipants.filter(p => p.group_number === 3) },
          { group_number: 4, duration_minutes: 60, members: historicalParticipants.filter(p => p.group_number === 4) },
          { group_number: 5, duration_minutes: 60, members: historicalParticipants.filter(p => p.group_number === 5) }
        ];

        db.prepare(`
          INSERT INTO lab_draws (
            id, laboratory_date, laboratory_name, coordinator_name, draw_date, duration_minutes,
            participants_count, participants_json, groups_json, rules_json, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ativo', datetime('now'), datetime('now'))
        `).run(
          'draw_historico_18_part',
          'A definir',
          'Laboratório Oficial de Pregação (18 Participantes — 5 Grupos)',
          'Coordenação (Pedro e Fernanda)',
          '2026-11-03',
          20,
          18,
          JSON.stringify(historicalParticipants),
          JSON.stringify(historicalGroups),
          JSON.stringify({ distribution: [4, 4, 4, 3, 3], max_group_size: 4, historical: true })
        );
      }

      // 8. Registrar migração 004
      db.prepare(`
        INSERT INTO schema_migrations (version, name, applied_at)
        VALUES ('004_master_4_0_ecosystem_evolution', 'Evolução Ecossistema 4.0: Gestão de Membros, Aniversários, Grupos Equilibrados de Pregação, Eventos 2026 e Coordenação Geral', datetime('now'))
      `).run();
    });

    migrate004();
    console.log('✓ Migração 004_master_4_0_ecosystem_evolution aplicada com sucesso.');
  }

  // Migration 005: Master 5.0 - Data Protection, Official Member Names, Rich Event Descriptions, Multi-Day December Retreats & Lab Draw Structure Normalization
  if (!applied.has('005_master_5_0_data_protection_and_calendar_evolution')) {
    const migrate005 = db.transaction(() => {
      // 1. Add end_date to calendar_events if not present
      const calCols = db.prepare(`PRAGMA table_info(calendar_events)`).all() as any[];
      if (!calCols.some((c) => c.name === 'end_date')) {
        db.exec(`ALTER TABLE calendar_events ADD COLUMN end_date TEXT`);
        console.log('✓ Coluna end_date adicionada à tabela calendar_events.');
      }

      // 2. Synchronize and permanently protect official member names in both members and pastoral_members
      const officialNameUpdates = [
        { buyerId: 'mem_22130dccbf2c', pmemId: 'pmem_mem_22130dccbf2c', name: 'Maria Eduarda Fernandes', displayName: 'Duda Fernandes' },
        { buyerId: 'mem_723733f98bb6', pmemId: 'pmem_mem_723733f98bb6', name: 'Maria Eduarda Soares', displayName: 'Duda Soares' },
        { buyerId: 'mem_aeedddfde4d8', pmemId: 'pmem_mem_aeedddfde4d8', name: 'Maria Luiza Neres', displayName: 'Malu Neres' },
        { buyerId: 'mem_cd7f61cc211e', pmemId: 'pmem_mem_cd7f61cc211e', name: 'Júlia Viana', displayName: 'Júlia' },
        { buyerId: 'mem_e8ca36ae2233', pmemId: 'pmem_mem_e8ca36ae2233', name: 'Letícia Ingrid', displayName: 'Letícia' },
        { buyerId: 'mem_2a2e78c53bf9', pmemId: 'pmem_mem_2a2e78c53bf9', name: 'Tiago', displayName: 'Tiago' },
      ];

      for (const item of officialNameUpdates) {
        db.prepare(`
          UPDATE members SET name = ?, display_name = ?, updated_at = datetime('now') WHERE id = ?
        `).run(item.name, item.displayName, item.buyerId);

        db.prepare(`
          UPDATE pastoral_members SET name = ?, display_name = ?, updated_at = datetime('now') WHERE id = ? OR buyer_member_id = ?
        `).run(item.name, item.displayName, item.pmemId, item.buyerId);
      }

      // 3. Restore rich descriptions for November 2026 formation events (Sections 6.1 & 6.2)
      const descFormacao1 = `Tema proposto: Ser missionário — chamado, espiritualidade e compromisso.\n\nAbordar a finalidade da Pastoral Missionária; o discípulo que também é enviado; oração e vida sacramental; Padre Pio como referência espiritual; serviço, responsabilidade, trabalho em equipe e comunhão com a coordenação e a paróquia.`;

      const descFormacao2 = `Tema proposto: Como preparar e conduzir uma evangelização.\n\nAbordar a preparação de pregações e testemunhos; leitura da passagem bíblica em seu contexto; definição de uma mensagem central; começo, desenvolvimento e conclusão; linguagem e tempo; condução de oração; respeito e escuta do público.\n\nExercício sugerido: organizar uma breve mensagem a partir de uma passagem bíblica.`;

      db.prepare(`
        UPDATE calendar_events
        SET title = '1ª Formação (Novos Membros)',
            description = ?,
            category = 'Formações',
            status = 'Confirmado',
            updated_at = datetime('now')
        WHERE event_date = '2026-11-14'
      `).run(descFormacao1);

      db.prepare(`
        UPDATE calendar_events
        SET title = '2ª Formação (Novos Membros)',
            description = ?,
            category = 'Formações',
            status = 'Confirmado',
            updated_at = datetime('now')
        WHERE event_date = '2026-11-22'
      `).run(descFormacao2);

      // 4. Recover December 2026 Events (Section 7)
      // 7.1 Pré-Espiritual: 13/12/2026
      const existingPreEspiritual = db.prepare(`SELECT id FROM calendar_events WHERE event_date = '2026-12-13'`).get();
      if (!existingPreEspiritual) {
        db.prepare(`
          INSERT INTO calendar_events (
            id, external_stable_id, title, description, event_date, end_date, category, status, visibility, responsibles_json, notes, source, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, NULL, 'Retiros', 'Confirmado', 'publico', ?, ?, 'Manual', datetime('now'), datetime('now'))
        `).run(
          'cal_2026_12_13_pre_espiritual',
          'cal_2026_12_13_pre_espiritual',
          'Pré-Espiritual',
          'Encontro preparatório para o retiro espiritual de discipulado da Pastoral Missionária.',
          '2026-12-13',
          JSON.stringify(['Pedro', 'Fernanda']),
          'Preparação e alinhamento para o retiro'
        );
      }

      // 7.2 Espiritual (Discipulado): 18 a 20 de dezembro de 2026 (multi-day span)
      const existingEspiritual = db.prepare(`SELECT id FROM calendar_events WHERE event_date = '2026-12-18'`).get();
      if (!existingEspiritual) {
        db.prepare(`
          INSERT INTO calendar_events (
            id, external_stable_id, title, description, event_date, end_date, category, status, visibility, responsibles_json, notes, source, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'Retiros', 'Confirmado', 'publico', ?, ?, 'Manual', datetime('now'), datetime('now'))
        `).run(
          'cal_2026_12_18_espiritual_discipulado',
          'cal_2026_12_18_espiritual_discipulado',
          'Espiritual (Discipulado)',
          'Retiro Espiritual de Discipulado da Pastoral Missionária — 18, 19 e 20 de dezembro de 2026.',
          '2026-12-18',
          '2026-12-20',
          JSON.stringify(['Pedro', 'Fernanda']),
          'Retiro de imersão espiritual e vida de oração'
        );
      } else {
        db.prepare(`
          UPDATE calendar_events
          SET title = 'Espiritual (Discipulado)',
              end_date = '2026-12-20',
              category = 'Retiros',
              status = 'Confirmado',
              description = 'Retiro Espiritual de Discipulado da Pastoral Missionária — 18, 19 e 20 de dezembro de 2026.',
              updated_at = datetime('now')
          WHERE event_date = '2026-12-18'
        `).run();
      }

      // 5. Normalize historical lab draw (draw_historico_18_part) so groups have both 'speakers' and 'members'
      const histDraw = db.prepare(`SELECT * FROM lab_draws WHERE id = 'draw_historico_18_part'`).get() as any;
      if (histDraw) {
        const parsedGroups = JSON.parse(histDraw.groups_json || '[]');
        const normalizedGroups = parsedGroups.map((g: any, gIdx: number) => {
          const list = g.speakers || g.members || [];
          const normalizedSpeakers = list.map((m: any, mIdx: number) => ({
            order: m.order || m.presentation_order || (mIdx + 1),
            speaker_name: m.speaker_name,
            speaker_id: m.speaker_id,
            theme_number: m.theme_number,
            theme_title: m.theme_title,
            duration_minutes: m.duration_minutes || 20,
            group_number: g.group_number || (gIdx + 1),
          }));
          return {
            group_number: g.group_number || (gIdx + 1),
            group_name: g.group_name || `Grupo ${g.group_number || (gIdx + 1)}`,
            speakers_count: normalizedSpeakers.length,
            duration_per_speaker_minutes: 20,
            total_duration_minutes: g.duration_minutes || (normalizedSpeakers.length * 20),
            speakers: normalizedSpeakers,
            members: normalizedSpeakers,
          };
        });

        db.prepare(`
          UPDATE lab_draws SET groups_json = ?, updated_at = datetime('now') WHERE id = 'draw_historico_18_part'
        `).run(JSON.stringify(normalizedGroups));
      }

      // 6. Ensure Pix Key is verified and consistent
      const pixObj = {
        pix_key: '(61)992568165',
        key_type: 'telefone',
        receiver_name: 'Pastoral Missionária — Paróquia São Vicente de Paulo',
        instructions: 'Após realizar o Pix, envie o comprovante para a coordenação (Pedro ou Fernanda) registrar a baixa do seu pedido.',
      };
      db.prepare(`INSERT OR REPLACE INTO integration_settings (key, value_json, updated_at) VALUES ('pix_payment', ?, datetime('now'))`).run(JSON.stringify(pixObj));

      // 7. Register migration 005
      db.prepare(`
        INSERT INTO schema_migrations (version, name, applied_at)
        VALUES ('005_master_5_0_data_protection_and_calendar_evolution', 'Proteção Permanente de Dados, Nomes Oficiais, Descrições das Formações, Espiritual Dezembro e Normalização de Grupos', datetime('now'))
      `).run();
    });

    migrate005();
    console.log('✓ Migração 005_master_5_0_data_protection_and_calendar_evolution aplicada com sucesso.');
  }

  // ----------------------------------------------------
  // MIGRAÇÃO 006: Persistência Definitiva de Habilitações, Bloqueio de Sobrescrita, Habilitações de Fernanda e Tiago, e Novo Mural
  // ----------------------------------------------------
  if (!applied.has('006_master_6_0_persistence_and_habilitations_lock')) {
    const migrate006 = db.transaction(() => {
      const all8Quals = JSON.stringify([
        'Intercessão',
        'Pregação',
        'Formação',
        'Testemunho',
        'Música',
        'Condução de oração',
        'Animação',
        'Apoio'
      ]);

      // 1. Confirmar as 8 habilitações de Fernanda (Coordenadora)
      db.prepare(`
        UPDATE pastoral_members
        SET qualifications_json = ?, updated_at = datetime('now')
        WHERE id = 'pmem_fernanda' OR name LIKE 'Fernanda%'
      `).run(all8Quals);

      // 2. Confirmar as 8 habilitações de Tiago
      db.prepare(`
        UPDATE pastoral_members
        SET qualifications_json = ?, updated_at = datetime('now')
        WHERE id = 'pmem_mem_2a2e78c53bf9' OR name = 'Tiago' OR display_name = 'Tiago'
      `).run(all8Quals);

      // 3. Atualizar o comunicado institucional do mural de avisos (Seção 8.2)
      const novoConteudoMural =
        'Paz e bem, irmãos!\n\nNossa plataforma foi criada para facilitar a organização e a caminhada da Pastoral Missionária. Aqui podemos acompanhar o calendário da Pastoral, consultar missões e envios, organizar os laboratórios de pregação, acessar comunicados, participar da comunidade missionária e acompanhar os pedidos das camisetas.\n\nQue este espaço nos ajude a viver nossa missão com mais unidade, organização e fraternidade.\n\n"Tenha Jesus Cristo em seu coração, e todas as cruzes do mundo parecerão rosas!" — São Padre Pio.';

      db.prepare(`
        UPDATE announcements
        SET title = 'Bem-vindos à Plataforma da Pastoral Missionária!',
            content = ?
        WHERE id = 'ann-boas-vindas-ecossistema'
      `).run(novoConteudoMural);

      // 4. Garantir que os coordenadores Pedro e Fernanda possuam senha padrão segura caso não tenham senha definida
      const defaultCoordHash = bcrypt.hashSync('pastoral@2026', 10);
      db.prepare(`
        UPDATE users
        SET password_hash = COALESCE(password_hash, ?), updated_at = datetime('now')
        WHERE email IN ('pedropignata2@gmail.com', 'fernandasouto7826@gmail.com')
      `).run(defaultCoordHash);

      // 5. Registrar migração 006
      db.prepare(`
        INSERT INTO schema_migrations (version, name, applied_at)
        VALUES ('006_master_6_0_persistence_and_habilitations_lock', 'Persistência Definitiva de Habilitações, Preservação de Fernanda e Tiago com 8 Funções, e Atualização do Mural Institucional', datetime('now'))
      `).run();
    });

    migrate006();
    console.log('✓ Migração 006_master_6_0_persistence_and_habilitations_lock aplicada com sucesso.');
  }

  // ----------------------------------------------------
  // MIGRAÇÃO 007: Contrato Unificado de Habilitações, Bloqueio Definitivo contra Sobrescrita Nula e Reconciliação Total
  // ----------------------------------------------------
  if (!applied.has('007_master_7_0_qualifications_contract_and_recovery')) {
    const migrate007 = db.transaction(() => {
      const all8Quals = JSON.stringify([
        'Intercessão',
        'Pregação',
        'Formação',
        'Testemunho',
        'Música',
        'Condução de oração',
        'Animação',
        'Apoio'
      ]);

      // 1. Garantir que Pedro (Coordenador) possua as 8 habilitações pastorais confirmadas
      db.prepare(`
        UPDATE pastoral_members
        SET qualifications_json = ?, updated_at = datetime('now')
        WHERE id = 'pmem_pedro' OR name LIKE 'Pedro%'
      `).run(all8Quals);

      // 2. Garantir que Fernanda (Coordenadora) possua as 8 habilitações pastorais confirmadas
      db.prepare(`
        UPDATE pastoral_members
        SET qualifications_json = ?, updated_at = datetime('now')
        WHERE id = 'pmem_fernanda' OR name LIKE 'Fernanda%'
      `).run(all8Quals);

      // 3. Garantir que Tiago possua as 8 habilitações pastorais confirmadas
      db.prepare(`
        UPDATE pastoral_members
        SET qualifications_json = ?, updated_at = datetime('now')
        WHERE id = 'pmem_mem_2a2e78c53bf9' OR name = 'Tiago' OR display_name = 'Tiago'
      `).run(all8Quals);

      // 4. Registrar migração 007
      db.prepare(`
        INSERT INTO schema_migrations (version, name, applied_at)
        VALUES ('007_master_7_0_qualifications_contract_and_recovery', 'Contrato Unificado de Habilitações, Bloqueio Definitivo contra Sobrescrita Nula e Reconciliação Total de Pedro, Fernanda e Tiago', datetime('now'))
      `).run();
    });

    migrate007();
    console.log('✓ Migração 007_master_7_0_qualifications_contract_and_recovery aplicada com sucesso.');
  }

  // ----------------------------------------------------
  // MIGRAÇÃO 008: Preservação de Pagamentos de Camisetas e Cadastro Oficial dos 39 Missionários
  // ----------------------------------------------------
  if (!applied.has('008_master_8_0_sync_payments_and_register_all_39_pastoral_members')) {
    const migrate008 = db.transaction(() => {
      const now = new Date().toISOString();

      // 1. Sincronizar e blindar os 7 pagamentos reais registrados por Pedro na campanha de camisetas
      const prodPaidMembers = [
        { name: 'Alfredo', amount: 4500, date: '2026-11-06', id: 'pay_d5d1bbfb8865' },
        { name: 'Állan', amount: 4500, date: '2026-11-05', id: 'pay_0a9f138f5685' },
        { name: 'Maria Eduarda Fernandes', amount: 4500, date: '2026-11-04', id: 'pay_27660b8d35b2' },
        { name: 'Maria Luiza Lima', amount: 4500, date: '2026-11-06', id: 'pay_d4534c58efb9' },
        { name: 'Maria Luiza Neres', amount: 4500, date: '2026-11-05', id: 'pay_55017014b2bb' },
        { name: 'Tiago', amount: 4500, date: '2026-11-04', id: 'pay_9a422406c647' },
        { name: 'Vini', amount: 4500, date: '2026-11-04', id: 'pay_9c67b3f0775b' },
      ];

      for (const p of prodPaidMembers) {
        const member = db.prepare('SELECT id FROM members WHERE name = ? OR display_name = ?').get(p.name, p.name) as any;
        if (member) {
          const order = db.prepare('SELECT id, total_amount_cents FROM orders WHERE member_id = ?').get(member.id) as any;
          if (order) {
            db.prepare(`
              INSERT OR REPLACE INTO payments (
                id, order_id, member_id, amount_cents, payment_date, payment_method,
                recorded_by, notes, is_reversed, reversal_reason, reversed_at, reversed_by,
                created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, 'pix', 'Pedro Rafael', '', 0, NULL, NULL, NULL, ?, ?)
            `).run(p.id, order.id, member.id, p.amount, p.date, now, now);

            db.prepare(`
              UPDATE orders
              SET paid_amount_cents = ?,
                  balance_cents = ?,
                  payment_status = 'pago',
                  updated_at = ?
              WHERE id = ?
            `).run(p.amount, order.total_amount_cents - p.amount, now, order.id);
          }
        }
      }

      // 2. Atualizar dados e números de WhatsApp dos 21 missionários já existentes
      const existingUpdates = [
        { id: 'pmem_pedro', name: 'Pedro Rafael Santos Pignata (Coordenador)', display_name: 'Pedro', phone: '(61) 99256-8165' },
        { id: 'pmem_fernanda', name: 'Fernanda Souto (Coordenadora)', display_name: 'Fernanda', phone: '(61) 98305-5751' },
        { id: 'pmem_mem_3a5d8b2854f7', name: 'Alfredo', display_name: 'Alfredo', phone: '(61) 99847-4821' },
        { id: 'pmem_mem_168e4d89c0d7', name: 'Állan Fross', display_name: 'Állan', phone: '(61) 98188-8901' },
        { id: 'pmem_mem_718a8fc7413a', name: 'Erick Kilbert', display_name: 'Erick', phone: '(61) 99523-5887' },
        { id: 'pmem_mem_5b8f3d626749', name: 'Jamilly', display_name: 'Jamilly', phone: '(61) 99623-6153' },
        { id: 'pmem_mem_cd7f61cc211e', name: 'Júlia Viana', display_name: 'Júlia', phone: '(61) 99931-6382' },
        { id: 'pmem_mem_255524b003e3', name: 'Laysa', display_name: 'Laysa', phone: '(61) 99292-9981' },
        { id: 'pmem_mem_e8ca36ae2233', name: 'Letícia Ingrid', display_name: 'Letícia', phone: '(61) 99254-2925' },
        { id: 'pmem_mem_03d218edc79f', name: 'Lyvia Maria', display_name: 'Lyvia', phone: '(61) 99974-4803' },
        { id: 'pmem_mem_e026bf750415', name: 'Manuella', display_name: 'Manuella', phone: '(61) 99197-2286' },
        { id: 'pmem_mem_22130dccbf2c', name: 'Maria Eduarda Fernandes', display_name: 'Duda Fernandes', phone: '(61) 99554-3396' },
        { id: 'pmem_mem_723733f98bb6', name: 'Maria Eduarda Soares', display_name: 'Duda Soares', phone: '(61) 98302-6142' },
        { id: 'pmem_mem_83ce887a76ef', name: 'Maria Júlia', display_name: 'Maria Júlia', phone: '(61) 99417-0991' },
        { id: 'pmem_mem_d1b16e0ebcde', name: 'Maria Luiza Lima', display_name: 'Maria Luiza', phone: '(61) 98208-9083' },
        { id: 'pmem_mem_aeedddfde4d8', name: 'Maria Luiza Neres', display_name: 'Malu Neres', phone: '(61) 99931-1322' },
        { id: 'pmem_mem_0a4d580ce11f', name: 'Mariane', display_name: 'Mariane', phone: '(61) 98483-4684' },
        { id: 'pmem_mem_c5ded13f55d7', name: 'Saulo', display_name: 'Saulo', phone: '(61) 99657-8844' },
        { id: 'pmem_mem_2a2e78c53bf9', name: 'Tiago', display_name: 'Tiago', phone: '(61) 99852-6665' },
        { id: 'pmem_mem_37c8ca212b5b', name: 'Victor', display_name: 'Victor', phone: '(61) 99223-6379' },
        { id: 'pmem_mem_aff2b7da59f2', name: 'Vinícius', display_name: 'Vini', phone: '(61) 98427-3060' },
      ];

      for (const u of existingUpdates) {
        db.prepare(`
          UPDATE pastoral_members
          SET name = ?, display_name = ?, phone = ?, updated_at = ?
          WHERE id = ?
        `).run(u.name, u.display_name, u.phone, now, u.id);
      }

      // 3. Cadastrar os 18 novos missionários no cadastro oficial
      const newPastoralMembers = [
        { id: 'pmem_angelica_angel', name: 'Angélica (Angel)', display_name: 'Angel', phone: '(61) 99837-2088' },
        { id: 'pmem_joao_miguel', name: 'João Miguel', display_name: 'João Miguel', phone: '(61) 99129-8349' },
        { id: 'pmem_daniel', name: 'Daniel', display_name: 'Daniel', phone: '(61) 99511-3729' },
        { id: 'pmem_gabriel_the_baios', name: 'Gabriel (The Baios)', display_name: 'Gabriel', phone: '(61) 98369-9150' },
        { id: 'pmem_iris_maria', name: 'Iris Maria', display_name: 'Iris', phone: '(61) 99522-9063' },
        { id: 'pmem_jonas_emanuell', name: 'Jonas Emanuell', display_name: 'Jonas', phone: '(61) 99635-2396' },
        { id: 'pmem_kayla_lino', name: 'Kayla Lino', display_name: 'Kayla', phone: '(61) 98629-7236' },
        { id: 'pmem_samuel_aranha', name: 'Samuel Aranha', display_name: 'Samuel', phone: '(61) 99637-9942' },
        { id: 'pmem_ludmilla', name: 'Ludmilla', display_name: 'Ludmilla', phone: '(61) 98503-6174' },
        { id: 'pmem_miriam', name: 'Miriam', display_name: 'Miriam', phone: '(61) 99249-7904' },
        { id: 'pmem_joao_gabriel', name: 'JoãoGabriel', display_name: 'João Gabriel', phone: '(61) 99270-5900' },
        { id: 'pmem_pedro_henrique', name: 'Pedro Henrique', display_name: 'Pedro Henrique', phone: '(61) 99338-6657' },
        { id: 'pmem_raquel', name: 'Raquel', display_name: 'Raquel', phone: '(61) 99584-6990' },
        { id: 'pmem_rayane', name: 'Rayane', display_name: 'Rayane', phone: '(61) 99881-7393' },
        { id: 'pmem_rodrigo_de_oliveira', name: 'Rodrigo De Oliveira', display_name: 'Rodrigo', phone: '(61) 99624-4351' },
        { id: 'pmem_wellington_santos', name: 'Wellington Santos', display_name: 'Wellington', phone: '(61) 98537-8862' },
        { id: 'pmem_jose_vitor_ze', name: 'José Vitor (Zé)', display_name: 'José Vitor (Zé)', phone: '(61) 99594-4114' },
        { id: 'pmem_victor_cardoso', name: 'Victor Cardoso', display_name: 'Victor Cardoso', phone: '(61) 98176-1979' },
      ];

      const insertNewMember = db.prepare(`
        INSERT INTO pastoral_members (
          id, name, display_name, email, phone, photo_url, status, pastoral_role,
          joined_at, qualifications_json, skills_json, availability_json, welcome_checklist_json,
          created_at, updated_at, birth_day, birth_month, birth_year, birthday_visibility, notes
        ) VALUES (
          ?, ?, ?, NULL, ?, NULL, 'ativo', 'membro',
          ?, '["Intercessão"]', '[]', '{}', '{}',
          ?, ?, NULL, NULL, NULL, 'members', NULL
        ) ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          display_name = excluded.display_name,
          phone = excluded.phone,
          updated_at = excluded.updated_at
      `);

      for (const m of newPastoralMembers) {
        insertNewMember.run(m.id, m.name, m.display_name, m.phone, now.split('T')[0], now, now);
      }

      // 4. Registrar migração 008
      db.prepare(`
        INSERT INTO schema_migrations (version, name, applied_at)
        VALUES ('008_master_8_0_sync_payments_and_register_all_39_pastoral_members', 'Preservação de Pagamentos de Camisetas e Cadastro Oficial dos 39 Missionários com WhatsApp', datetime('now'))
      `).run();
    });

    migrate008();
    console.log('✓ Migração 008_master_8_0_sync_payments_and_register_all_39_pastoral_members aplicada com sucesso.');
  }

  // ----------------------------------------------------
  // MIGRAÇÃO 009: Sincronização Universal e Garantia dos 39 Missionários Vinculados
  // ----------------------------------------------------
  if (!applied.has('009_master_9_0_universal_sync_39_pastoral_members')) {
    const migrate009 = db.transaction(() => {
      const now = new Date().toISOString();
      const all8Qualifications = JSON.stringify([
        'Intercessão', 'Pregação', 'Formação', 'Testemunho',
        'Música', 'Condução de oração', 'Animação', 'Apoio'
      ]);

      const officialList = [
        { name: 'Pedro Henrique', display_name: 'Pedro Henrique', phone: '(61) 99338-6657', role: 'membro', searchKeys: ['Pedro Henrique%'] },
        { name: 'Pedro Rafael Santos Pignata (Coordenador)', display_name: 'Pedro', phone: '(61) 99256-8165', role: 'coordenador', quals: all8Qualifications, searchKeys: ['Pedro Rafael%', 'Pedro (Coordenador)%'] },
        { name: 'Fernanda Souto (Coordenadora)', display_name: 'Fernanda', phone: '(61) 98305-5751', role: 'coordenador', quals: all8Qualifications, searchKeys: ['Fernanda%'] },
        { name: 'Tiago', display_name: 'Tiago', phone: '(61) 99852-6665', role: 'membro', quals: all8Qualifications, searchKeys: ['Tiago%'] },
        { name: 'Victor Cardoso', display_name: 'Victor Cardoso', phone: '(61) 98176-1979', role: 'membro', searchKeys: ['Victor Cardoso%'] },
        { name: 'Victor', display_name: 'Victor', phone: '(61) 99223-6379', role: 'membro', searchKeys: ['Victor'] },
        { name: 'Alfredo', display_name: 'Alfredo', phone: '(61) 99847-4821', role: 'membro', searchKeys: ['Alfredo%'] },
        { name: 'Állan Fross', display_name: 'Állan', phone: '(61) 98188-8901', role: 'membro', searchKeys: ['Állan%', 'Allan%'] },
        { name: 'Angélica (Angel)', display_name: 'Angel', phone: '(61) 99837-2088', role: 'membro', searchKeys: ['Angélica%', 'Angelica%', '%Angel%'] },
        { name: 'João Miguel', display_name: 'João Miguel', phone: '(61) 99129-8349', role: 'membro', searchKeys: ['João Miguel%', 'Joao Miguel%'] },
        { name: 'Daniel', display_name: 'Daniel', phone: '(61) 99511-3729', role: 'membro', searchKeys: ['Daniel%'] },
        { name: 'Maria Eduarda Fernandes', display_name: 'Duda Fernandes', phone: '(61) 99554-3396', role: 'membro', searchKeys: ['Maria Eduarda Fernandes%', '%Duda Fernandes%'] },
        { name: 'Erick Kilbert', display_name: 'Erick', phone: '(61) 99523-5887', role: 'membro', searchKeys: ['Erick%'] },
        { name: 'Gabriel (The Baios)', display_name: 'Gabriel', phone: '(61) 98369-9150', role: 'membro', searchKeys: ['Gabriel%', '%Baios%'] },
        { name: 'Iris Maria', display_name: 'Iris', phone: '(61) 99522-9063', role: 'membro', searchKeys: ['Iris%'] },
        { name: 'Jamilly', display_name: 'Jamilly', phone: '(61) 99623-6153', role: 'membro', searchKeys: ['Jamilly%'] },
        { name: 'Jonas Emanuell', display_name: 'Jonas', phone: '(61) 99635-2396', role: 'membro', searchKeys: ['Jonas%'] },
        { name: 'Júlia Viana', display_name: 'Júlia', phone: '(61) 99931-6382', role: 'membro', searchKeys: ['Júlia%', 'Julia%'] },
        { name: 'Kayla Lino', display_name: 'Kayla', phone: '(61) 98629-7236', role: 'membro', searchKeys: ['Kayla%'] },
        { name: 'Samuel Aranha', display_name: 'Samuel', phone: '(61) 99637-9942', role: 'membro', searchKeys: ['Samuel%'] },
        { name: 'Laysa', display_name: 'Laysa', phone: '(61) 99292-9981', role: 'membro', searchKeys: ['Laysa%'] },
        { name: 'Letícia Ingrid', display_name: 'Letícia', phone: '(61) 99254-2925', role: 'membro', searchKeys: ['Letícia%', 'Leticia%'] },
        { name: 'Ludmilla', display_name: 'Ludmilla', phone: '(61) 98503-6174', role: 'membro', searchKeys: ['Ludmilla%'] },
        { name: 'Lyvia Maria', display_name: 'Lyvia', phone: '(61) 99974-4803', role: 'membro', searchKeys: ['Lyvia%'] },
        { name: 'Maria Luiza Neres', display_name: 'Malu Neres', phone: '(61) 99931-1322', role: 'membro', searchKeys: ['Maria Luiza Neres%', '%Malu Neres%'] },
        { name: 'Manuella', display_name: 'Manuella', phone: '(61) 99197-2286', role: 'membro', searchKeys: ['Manuella%'] },
        { name: 'Maria Eduarda Soares', display_name: 'Duda Soares', phone: '(61) 98302-6142', role: 'membro', searchKeys: ['Maria Eduarda Soares%', '%Duda Soares%'] },
        { name: 'Maria Júlia', display_name: 'Maria Júlia', phone: '(61) 99417-0991', role: 'membro', searchKeys: ['Maria Júlia%', 'Maria Julia%'] },
        { name: 'Maria Luiza Lima', display_name: 'Maria Luiza', phone: '(61) 98208-9083', role: 'membro', searchKeys: ['Maria Luiza Lima%'] },
        { name: 'Mariane', display_name: 'Mariane', phone: '(61) 98483-4684', role: 'membro', searchKeys: ['Mariane%'] },
        { name: 'Miriam', display_name: 'Miriam', phone: '(61) 99249-7904', role: 'membro', searchKeys: ['Miriam%'] },
        { name: 'JoãoGabriel', display_name: 'João Gabriel', phone: '(61) 99270-5900', role: 'membro', searchKeys: ['JoãoGabriel%', 'JoaoGabriel%', 'João Gabriel%', 'Joao Gabriel%'] },
        { name: 'Raquel', display_name: 'Raquel', phone: '(61) 99584-6990', role: 'membro', searchKeys: ['Raquel%'] },
        { name: 'Rayane', display_name: 'Rayane', phone: '(61) 99881-7393', role: 'membro', searchKeys: ['Rayane%'] },
        { name: 'Rodrigo De Oliveira', display_name: 'Rodrigo', phone: '(61) 99624-4351', role: 'membro', searchKeys: ['Rodrigo%'] },
        { name: 'Saulo', display_name: 'Saulo', phone: '(61) 99657-8844', role: 'membro', searchKeys: ['Saulo%'] },
        { name: 'Vinícius', display_name: 'Vini', phone: '(61) 98427-3060', role: 'membro', searchKeys: ['Vinícius%', 'Vinicius%', 'Vini%'] },
        { name: 'Wellington Santos', display_name: 'Wellington', phone: '(61) 98537-8862', role: 'membro', searchKeys: ['Wellington%'] },
        { name: 'José Vitor (Zé)', display_name: 'José Vitor (Zé)', phone: '(61) 99594-4114', role: 'membro', searchKeys: ['José Vitor%', 'Jose Vitor%'] },
      ];

      for (const item of officialList) {
        let found = null as any;
        for (const k of item.searchKeys) {
          found = db.prepare('SELECT id, buyer_member_id, qualifications_json FROM pastoral_members WHERE name LIKE ? OR display_name LIKE ?').get(k, k);
          if (found) break;
        }

        // Buscar correspondência na tabela members (compradores de camisetas)
        let buyer = null as any;
        for (const k of item.searchKeys) {
          buyer = db.prepare('SELECT id, name FROM members WHERE name LIKE ? OR display_name LIKE ?').get(k, k);
          if (buyer) break;
        }

        if (found) {
          db.prepare(`
            UPDATE pastoral_members
            SET name = ?,
                display_name = ?,
                phone = ?,
                pastoral_role = COALESCE(?, pastoral_role),
                qualifications_json = CASE WHEN ? IS NOT NULL THEN ? ELSE qualifications_json END,
                buyer_member_id = COALESCE(buyer_member_id, ?),
                updated_at = ?
            WHERE id = ?
          `).run(
            item.name,
            item.display_name,
            item.phone,
            item.role || null,
            item.quals || null,
            item.quals || null,
            buyer ? buyer.id : null,
            now,
            found.id
          );
        } else {
          const newId = buyer ? `pmem_${buyer.id}` : `pmem_${item.name.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30)}`;
          db.prepare(`
            INSERT INTO pastoral_members (
              id, buyer_member_id, name, display_name, phone, status, pastoral_role,
              joined_at, qualifications_json, skills_json, availability_json, welcome_checklist_json,
              created_at, updated_at, birth_day, birth_month, birth_year, birthday_visibility, notes
            ) VALUES (
              ?, ?, ?, ?, ?, 'ativo', ?,
              '2026-01-01', ?, '[]', '{}', '{}',
              ?, ?, NULL, NULL, NULL, 'members', NULL
            )
          `).run(
            newId,
            buyer ? buyer.id : null,
            item.name,
            item.display_name,
            item.phone,
            item.role || 'membro',
            item.quals || '["Intercessão"]',
            now,
            now
          );
        }
      }

      // Registrar migração 009
      db.prepare(`
        INSERT INTO schema_migrations (version, name, applied_at)
        VALUES ('009_master_9_0_universal_sync_39_pastoral_members', 'Garantia Universal dos 39 Missionários Vinculados com WhatsApp e Habilitações', datetime('now'))
      `).run();
    });

    migrate009();
    console.log('✓ Migração 009_master_9_0_universal_sync_39_pastoral_members aplicada com sucesso.');
  }

  // ----------------------------------------------------
  // MIGRAÇÃO 010: Deduplicação e Consolidação dos Coordenadores nos 39 Missionários Oficiais
  // ----------------------------------------------------
  if (!applied.has('010_master_10_0_deduplicate_coordinators_and_lock_39')) {
    const migrate010 = db.transaction(() => {
      const now = new Date().toISOString();
      const all8Qualifications = JSON.stringify([
        'Intercessão', 'Pregação', 'Formação', 'Testemunho',
        'Música', 'Condução de oração', 'Animação', 'Apoio'
      ]);

      // 1. Consolidar Pedro em pmem_pedro
      db.prepare(`
        UPDATE pastoral_members
        SET name = 'Pedro Rafael Santos Pignata (Coordenador)',
            display_name = 'Pedro',
            email = 'pedropignata2@gmail.com',
            phone = '(61) 99256-8165',
            pastoral_role = 'coordenador',
            qualifications_json = ?,
            user_id = 'user_pedro_coordinator',
            updated_at = ?
        WHERE id = 'pmem_pedro'
      `).run(all8Qualifications, now);

      db.prepare(`DELETE FROM pastoral_members WHERE id = 'pmem_pedro_rafael_santos_pignata__c'`).run();

      // 2. Consolidar Fernanda em pmem_fernanda
      db.prepare(`
        UPDATE pastoral_members
        SET name = 'Fernanda Souto (Coordenadora)',
            display_name = 'Fernanda',
            email = 'fernandasouto7826@gmail.com',
            phone = '(61) 98305-5751',
            pastoral_role = 'coordenador',
            qualifications_json = ?,
            user_id = 'user_fernanda_coordinator',
            updated_at = ?
        WHERE id = 'pmem_fernanda'
      `).run(all8Qualifications, now);

      db.prepare(`DELETE FROM pastoral_members WHERE id = 'pmem_fernanda_souto__coordenadora_'`).run();

      // Registrar migração 010
      db.prepare(`
        INSERT INTO schema_migrations (version, name, applied_at)
        VALUES ('010_master_10_0_deduplicate_coordinators_and_lock_39', 'Deduplicação e Consolidação dos Coordenadores nos 39 Missionários Oficiais', datetime('now'))
      `).run();
    });

    migrate010();
    console.log('✓ Migração 010_master_10_0_deduplicate_coordinators_and_lock_39 aplicada com sucesso.');
  }

  // ----------------------------------------------------
  // MIGRAÇÃO 011: Integração Definitiva da Identidade Institucional, Recuperação da Produção e Privacidade
  // ----------------------------------------------------
  if (!applied.has('011_master_11_0_unified_identity_production_recovery_and_privacy')) {
    const migrate011 = db.transaction(() => {
      const now = new Date().toISOString();
      const all8Qualifications = JSON.stringify([
        'Intercessão', 'Pregação', 'Formação', 'Testemunho',
        'Música', 'Condução de oração', 'Animação', 'Apoio'
      ]);

      // 1. Adicionar coluna phone_visibility em pastoral_members (directory | coordinators_only | private)
      const pmColumns = db.prepare("PRAGMA table_info('pastoral_members')").all() as { name: string }[];
      const pmColNames = new Set(pmColumns.map(c => c.name));
      if (!pmColNames.has('phone_visibility')) {
        db.exec("ALTER TABLE pastoral_members ADD COLUMN phone_visibility TEXT NOT NULL DEFAULT 'directory'");
      }

      // 2. Adicionar colunas pastoral_member_id e historical_buyer_name em orders
      const orderColumns = db.prepare("PRAGMA table_info('orders')").all() as { name: string }[];
      const orderColNames = new Set(orderColumns.map(c => c.name));
      if (!orderColNames.has('pastoral_member_id')) {
        db.exec('ALTER TABLE orders ADD COLUMN pastoral_member_id TEXT');
        db.exec('CREATE INDEX IF NOT EXISTS idx_orders_pastoral_member_id ON orders(pastoral_member_id)');
      }
      if (!orderColNames.has('historical_buyer_name')) {
        db.exec('ALTER TABLE orders ADD COLUMN historical_buyer_name TEXT');
      }

      // 3. Garantir integridade absoluta de pmem_pedro e pmem_fernanda (sem sobrescrever habilitações já salvas)
      db.prepare(`
        UPDATE pastoral_members
        SET name = 'Pedro Rafael Santos Pignata (Coordenador)',
            display_name = 'Pedro',
            email = COALESCE(NULLIF(email, ''), 'pedropignata2@gmail.com'),
            phone = COALESCE(NULLIF(phone, ''), '(61) 99256-8165'),
            pastoral_role = 'coordenador',
            qualifications_json = COALESCE(qualifications_json, ?),
            user_id = COALESCE(user_id, 'user_pedro_coordinator'),
            updated_at = ?
        WHERE id = 'pmem_pedro'
      `).run(all8Qualifications, now);

      db.prepare(`
        UPDATE pastoral_members
        SET name = 'Fernanda Souto (Coordenadora)',
            display_name = 'Fernanda',
            email = COALESCE(NULLIF(email, ''), 'fernandasouto7826@gmail.com'),
            phone = COALESCE(NULLIF(phone, ''), '(61) 98305-5751'),
            pastoral_role = 'coordenador',
            qualifications_json = COALESCE(qualifications_json, ?),
            user_id = COALESCE(user_id, 'user_fernanda_coordinator'),
            updated_at = ?
        WHERE id = 'pmem_fernanda'
      `).run(all8Qualifications, now);

      // 4. Sincronizar telefones e vínculo institucional entre pastoral_members e members (compradores)
      const linkedPastoralMembers = db.prepare(`
        SELECT id, buyer_member_id, name, display_name, phone
        FROM pastoral_members
        WHERE buyer_member_id IS NOT NULL
      `).all() as any[];

      for (const pm of linkedPastoralMembers) {
        const buyer = db.prepare('SELECT id, name, display_name, phone FROM members WHERE id = ?').get(pm.buyer_member_id) as any;
        if (buyer) {
          // Preservar nome histórico da planilha no pedido antes de sincronizar
          db.prepare(`
            UPDATE orders
            SET pastoral_member_id = ?,
                historical_buyer_name = COALESCE(historical_buyer_name, ?)
            WHERE member_id = ?
          `).run(pm.id, buyer.name, buyer.id);

          // Sincronizar telefone, nome e apelido no registro de comprador vinculado
          db.prepare(`
            UPDATE members
            SET name = ?,
                display_name = ?,
                phone = COALESCE(NULLIF(?, ''), phone),
                updated_at = ?
            WHERE id = ?
          `).run(pm.name, pm.display_name || pm.name.split(' ')[0], pm.phone || '', now, buyer.id);
        }
      }

      // 5. Recuperar o estágio real de produção ('em_producao') dos 19 pedidos oficiais da campanha 2026
      // Conforme auditoria de snapshot (2026-11-06T14:46:41Z), os 19 pedidos foram movidos para 'em_producao'.
      const ordersToRecover = db.prepare(`
        SELECT id, member_id, production_status
        FROM orders
        WHERE campaign_id = 'camp-2026-oficial'
          AND status != 'cancelado'
          AND production_status = 'aguardando_confirmacao'
      `).all() as any[];

      const updateOrderProd = db.prepare(`
        UPDATE orders
        SET production_status = 'em_producao',
            updated_at = ?
        WHERE id = ?
      `);

      const insertAudit = db.prepare(`
        INSERT OR IGNORE INTO audit_logs (id, user_id, user_name, action, entity_type, entity_id, details_json, created_at)
        VALUES (?, 'user_pedro_coordinator', 'Pedro Rafael (Coordenação)', 'UPDATE_PRODUCTION_STATUS', 'order', ?, ?, ?)
      `);

      for (const ord of ordersToRecover) {
        updateOrderProd.run(now, ord.id);
        insertAudit.run(
          'aud_rec_' + ord.id + '_011',
          ord.id,
          JSON.stringify({
            production_status: 'em_producao',
            previous_stage: ord.production_status,
            new_stage: 'em_producao',
            note: 'Etapa de confecção (Em produção) confirmada pela coordenação e blindada contra regressão'
          }),
          '2026-11-06T14:46:41.000Z'
        );
      }

      db.prepare(`
        INSERT INTO schema_migrations (version, name, applied_at)
        VALUES ('011_master_11_0_unified_identity_production_recovery_and_privacy', 'Integração Definitiva da Identidade Institucional, Recuperação da Produção e Privacidade de Telefone', datetime('now'))
      `).run();
    });

    migrate011();
    console.log('✓ Migração 011_master_11_0_unified_identity_production_recovery_and_privacy aplicada com sucesso.');
  }

  // ----------------------------------------------------
  // MIGRAÇÃO 012: Recuperação Auditada das Habilitações Pastorais e Remoção de Atribuições Automáticas Indevidas
  // ----------------------------------------------------
  if (!applied.has('012_master_12_0_recover_manual_qualifications_and_stop_auto_restore')) {
    const migrate012 = db.transaction(() => {
      const now = new Date().toISOString();

      const all8 = [
        'Intercessão',
        'Pregação',
        'Formação',
        'Testemunho',
        'Música',
        'Condução de oração',
        'Animação',
        'Apoio',
      ];
      const veteran7NoMusic = [
        'Intercessão',
        'Pregação',
        'Formação',
        'Testemunho',
        'Condução de oração',
        'Animação',
        'Apoio',
      ];
      const musicOnly = ['Música'];
      const emptyQuals: string[] = [];

      // Mapa oficial recuperado da auditoria de vídeo (06/11/2026 12:58–13:05) + regras da coordenação (Seção 3):
      // 1. Coordenadores (Fernanda: 8 funções; Pedro: 7 funções sem Música, conforme edição manual às 13:01)
      // 2. Missionários Veteranos com Música confirmada (8 funções): Jonas Emanuell, JoãoGabriel, Miriam, Pedro Henrique, Raquel, Rayane, Samuel Aranha, Tiago
      // 3. Missionários Veteranos sem Música (7 funções): Angélica (Angel), Daniel, Gabriel (The Baios), Iris Maria, José Vitor (Zé), Kayla Lino, Rodrigo De Oliveira
      // 4. Membros em formação autorizados para Música (["Música"]): Állan Fross (13:05), Victor (13:04)
      // 5. Membros em formação sem habilitações automáticas ([]): demais 20 membros em formação
      const recoveryRules: Array<{ matchNames: string[]; quals: string[] }> = [
        // Coordenadores
        { matchNames: ['Fernanda Souto (Coordenadora)', 'Fernanda Souto', 'Fernanda'], quals: all8 },
        { matchNames: ['Pedro Rafael Santos Pignata (Coordenador)', 'Pedro Rafael Santos Pignata', 'Pedro Rafael'], quals: veteran7NoMusic },

        // Missionários Veteranos com Música (8 funções)
        { matchNames: ['Jonas Emanuell'], quals: all8 },
        { matchNames: ['JoãoGabriel', 'João Gabriel'], quals: all8 },
        { matchNames: ['Miriam'], quals: all8 },
        { matchNames: ['Pedro Henrique'], quals: all8 },
        { matchNames: ['Raquel'], quals: all8 },
        { matchNames: ['Rayane'], quals: all8 },
        { matchNames: ['Samuel Aranha'], quals: all8 },
        { matchNames: ['Tiago'], quals: all8 },

        // Missionários Veteranos sem Música (7 funções)
        { matchNames: ['Angélica (Angel)', 'Angélica'], quals: veteran7NoMusic },
        { matchNames: ['Daniel'], quals: veteran7NoMusic },
        { matchNames: ['Gabriel (The Baios)', 'Gabriel'], quals: veteran7NoMusic },
        { matchNames: ['Iris Maria'], quals: veteran7NoMusic },
        { matchNames: ['José Vitor (Zé)', 'José Vitor'], quals: veteran7NoMusic },
        { matchNames: ['Kayla Lino'], quals: veteran7NoMusic },
        { matchNames: ['Rodrigo De Oliveira'], quals: veteran7NoMusic },

        // Membros em Formação com Música confirmada (["Música"])
        { matchNames: ['Állan Fross', 'Állan'], quals: musicOnly },
        { matchNames: ['Victor'], quals: musicOnly },

        // Membros em Formação sem habilitações automáticas ([])
        { matchNames: ['Alfredo'], quals: emptyQuals },
        { matchNames: ['Erick Kilbert'], quals: emptyQuals },
        { matchNames: ['Jamilly'], quals: emptyQuals },
        { matchNames: ['João Miguel'], quals: emptyQuals },
        { matchNames: ['Júlia Viana', 'Júlia'], quals: emptyQuals },
        { matchNames: ['Laysa'], quals: emptyQuals },
        { matchNames: ['Letícia Ingrid', 'Letícia'], quals: emptyQuals },
        { matchNames: ['Ludmilla'], quals: emptyQuals },
        { matchNames: ['Lyvia Maria', 'Lyvia'], quals: emptyQuals },
        { matchNames: ['Manuella'], quals: emptyQuals },
        { matchNames: ['Maria Eduarda Fernandes', 'Duda Fernandes'], quals: emptyQuals },
        { matchNames: ['Maria Eduarda Soares', 'Duda Soares'], quals: emptyQuals },
        { matchNames: ['Maria Júlia'], quals: emptyQuals },
        { matchNames: ['Maria Luiza Lima'], quals: emptyQuals },
        { matchNames: ['Maria Luiza Neres', 'Malu Neres'], quals: emptyQuals },
        { matchNames: ['Mariane'], quals: emptyQuals },
        { matchNames: ['Saulo'], quals: emptyQuals },
        { matchNames: ['Victor Cardoso'], quals: emptyQuals },
        { matchNames: ['Vinícius', 'Vini'], quals: emptyQuals },
        { matchNames: ['Wellington Santos'], quals: emptyQuals },
      ];

      const allMembers = db.prepare('SELECT id, name, display_name, qualifications_json FROM pastoral_members').all() as any[];
      const updateStmt = db.prepare('UPDATE pastoral_members SET qualifications_json = ?, updated_at = ? WHERE id = ?');
      const changedRecords: Array<{ id: string; name: string; before: string[]; after: string[] }> = [];

      for (const member of allMembers) {
        const rule = recoveryRules.find((r) =>
          r.matchNames.some(
            (mn) =>
              member.name.trim().toLowerCase() === mn.trim().toLowerCase() ||
              (member.display_name || '').trim().toLowerCase() === mn.trim().toLowerCase()
          )
        );
        if (rule) {
          const nextJson = JSON.stringify(rule.quals);
          if (member.qualifications_json !== nextJson) {
            let beforeArr: string[] = [];
            try {
              beforeArr = JSON.parse(member.qualifications_json || '[]');
            } catch {}
            updateStmt.run(nextJson, now, member.id);
            changedRecords.push({
              id: member.id,
              name: member.name,
              before: beforeArr,
              after: rule.quals,
            });
          }
        }
      }

      db.prepare(`
        INSERT OR IGNORE INTO audit_logs (id, user_id, user_name, action, entity_type, entity_id, details_json, created_at)
        VALUES (?, 'user_pedro_coordinator', 'Coordenação (Auditoria 012)', 'RECOVER_PASTORAL_QUALIFICATIONS_012', 'pastoral_member', 'bulk_recovery_012', ?, ?)
      `).run(
        'aud_quals_recovery_012',
        JSON.stringify({
          analyzedCount: allMembers.length,
          updatedCount: changedRecords.length,
          changes: changedRecords,
        }),
        now
      );

      db.prepare(`
        INSERT INTO schema_migrations (version, name, applied_at)
        VALUES ('012_master_12_0_recover_manual_qualifications_and_stop_auto_restore', 'Recuperação Auditada das Habilitações Pastorais e Remoção de Atribuições Automáticas Indevidas', datetime('now'))
      `).run();
    });

    migrate012();
    console.log('✓ Migração 012_master_12_0_recover_manual_qualifications_and_stop_auto_restore aplicada com sucesso.');
  }

  // ----------------------------------------------------
  // MIGRAÇÃO 013: Preservação de Aniversários Cadastrados (Pedro e João Miguel)
  // ----------------------------------------------------
  if (!applied.has('013_master_13_0_preserve_registered_birthdays')) {
    const migrate013 = db.transaction(() => {
      db.prepare(`
        UPDATE pastoral_members
        SET birth_day = COALESCE(birth_day, 23),
            birth_month = COALESCE(birth_month, 1),
            birth_year = COALESCE(birth_year, 2006)
        WHERE id = 'pmem_pedro'
      `).run();

      db.prepare(`
        UPDATE pastoral_members
        SET birth_day = COALESCE(birth_day, 4),
            birth_month = COALESCE(birth_month, 12),
            birth_year = COALESCE(birth_year, 2004)
        WHERE name = 'João Miguel'
      `).run();

      db.prepare(`
        INSERT INTO schema_migrations (version, name, applied_at)
        VALUES ('013_master_13_0_preserve_registered_birthdays', 'Preservação de Aniversários Oficiais Cadastrados na Governança', datetime('now'))
      `).run();
    });

    migrate013();
    console.log('✓ Migração 013_master_13_0_preserve_registered_birthdays aplicada com sucesso.');
  }

  // ----------------------------------------------------
  // MIGRAÇÃO 014: Blindagem Definitiva dos Dados de 10/11/2026 (14 Pagamentos Quitados, 1 Estorno, Habilitações dos 39 Membros e IDs Determinísticos)
  // ----------------------------------------------------
  if (!applied.has('014_master_14_0_lock_nov10_payments_qualifications_and_deterministic_ids')) {
    const migrate014 = db.transaction(() => {
      const now = new Date().toISOString();

      // 1. Canonicalizar IDs dos 19 compradores, pedidos, itens e vínculos em pastoral_members
      const canonicalBuyers = [
        { memberId: 'mem_22130dccbf2c', orderId: 'ord_6eeb7cf00170', itemId: 'itm_ff004f486fef', name: 'Maria Eduarda Fernandes', displayName: 'Duda Fernandes', phone: '(61) 99554-3396', searchNames: ['Maria Eduarda Fernandes', 'Duda Fernandes'] },
        { memberId: 'mem_03d218edc79f', orderId: 'ord_1efa0ec4d2d3', itemId: 'itm_473256041c44', name: 'Lyvia Maria', displayName: 'Lyvia', phone: '(61) 99974-4803', searchNames: ['Lyvia Maria', 'Lyvia'] },
        { memberId: 'mem_168e4d89c0d7', orderId: 'ord_b8ed287ddd36', itemId: 'itm_265c91c96e68', name: 'Állan Fross', displayName: 'Állan', phone: '(61) 98188-8901', searchNames: ['Állan Fross', 'Állan', 'Allan'] },
        { memberId: 'mem_5b8f3d626749', orderId: 'ord_215af699304e', itemId: 'itm_71255950e197', name: 'Jamilly', displayName: 'Jamilly', phone: '(61) 99623-6153', searchNames: ['Jamilly'] },
        { memberId: 'mem_aff2b7da59f2', orderId: 'ord_15234064b8d2', itemId: 'itm_ad208d2f5dcd', name: 'Vinícius', displayName: 'Vini', phone: '(61) 98427-3060', searchNames: ['Vinícius', 'Vini'] },
        { memberId: 'mem_255524b003e3', orderId: 'ord_2a52e71a7bee', itemId: 'itm_767430ff3e81', name: 'Laysa', displayName: 'Laysa', phone: '(61) 99292-9981', searchNames: ['Laysa'] },
        { memberId: 'mem_37c8ca212b5b', orderId: 'ord_60c347bdce55', itemId: 'itm_845a4c8c47fd', name: 'Victor', displayName: 'Victor', phone: '(61) 99223-6379', searchNames: ['Victor'] },
        { memberId: 'mem_aeedddfde4d8', orderId: 'ord_a5c521d57e6e', itemId: 'itm_0d9726f0416b', name: 'Maria Luiza Neres', displayName: 'Malu Neres', phone: '(61) 99931-1322', searchNames: ['Maria Luiza Neres', 'Malu Neres'] },
        { memberId: 'mem_cd7f61cc211e', orderId: 'ord_9aea2e3ec4b5', itemId: 'itm_a2450375d163', name: 'Júlia Viana', displayName: 'Júlia', phone: '(61) 99931-6382', searchNames: ['Júlia Viana', 'Júlia', 'Julia'] },
        { memberId: 'mem_e8ca36ae2233', orderId: 'ord_b3cef19a189d', itemId: 'itm_7a4988071f7d', name: 'Letícia Ingrid', displayName: 'Letícia', phone: '(61) 99254-2925', searchNames: ['Letícia Ingrid', 'Letícia', 'Leticia'] },
        { memberId: 'mem_c5ded13f55d7', orderId: 'ord_2ed9e808ad7b', itemId: 'itm_b87862dc8f4d', name: 'Saulo', displayName: 'Saulo', phone: '(61) 99657-8844', searchNames: ['Saulo'] },
        { memberId: 'mem_e026bf750415', orderId: 'ord_f69cfe789f6b', itemId: 'itm_dd0c37600ccb', name: 'Manuella', displayName: 'Manuella', phone: '(61) 99197-2286', searchNames: ['Manuella'] },
        { memberId: 'mem_83ce887a76ef', orderId: 'ord_c2cf281eac89', itemId: 'itm_6b03205d011b', name: 'Maria Júlia', displayName: 'Maria Júlia', phone: '(61) 99417-0991', searchNames: ['Maria Júlia', 'Maria Julia'] },
        { memberId: 'mem_0a4d580ce11f', orderId: 'ord_7d3a718f849c', itemId: 'itm_241dd1c75d30', name: 'Mariane', displayName: 'Mariane', phone: '(61) 98483-4684', searchNames: ['Mariane'] },
        { memberId: 'mem_d1b16e0ebcde', orderId: 'ord_7c5161308f11', itemId: 'itm_0182bd7540e5', name: 'Maria Luiza Lima', displayName: 'Maria Luiza', phone: '(61) 98208-9083', searchNames: ['Maria Luiza Lima', 'Maria Luiza'] },
        { memberId: 'mem_718a8fc7413a', orderId: 'ord_0191867145fd', itemId: 'itm_7af851fa2220', name: 'Erick Kilbert', displayName: 'Erick', phone: '(61) 99523-5887', searchNames: ['Erick Kilbert', 'Erick'] },
        { memberId: 'mem_3a5d8b2854f7', orderId: 'ord_e535981ee443', itemId: 'itm_513bd34a4eee', name: 'Alfredo', displayName: 'Alfredo', phone: '(61) 99847-4821', searchNames: ['Alfredo'] },
        { memberId: 'mem_2a2e78c53bf9', orderId: 'ord_0c53215d8054', itemId: 'itm_75682979f52a', name: 'Tiago', displayName: 'Tiago', phone: '(61) 99852-6665', searchNames: ['Tiago'] },
        { memberId: 'mem_723733f98bb6', orderId: 'ord_67ad498bf87c', itemId: 'itm_fd79459b6750', name: 'Maria Eduarda Soares', displayName: 'Duda Soares', phone: '(61) 98302-6142', searchNames: ['Maria Eduarda Soares', 'Duda Soares'] },
      ];

      for (const cb of canonicalBuyers) {
        let memberRow = db.prepare('SELECT id, name FROM members WHERE id = ?').get(cb.memberId) as any;
        if (!memberRow) {
          for (const sn of cb.searchNames) {
            memberRow = db.prepare('SELECT id, name FROM members WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) OR LOWER(TRIM(display_name)) = LOWER(TRIM(?))').get(sn, sn) as any;
            if (memberRow) break;
          }
        }

        if (memberRow) {
          const oldMemId = memberRow.id;
          if (oldMemId !== cb.memberId) {
            db.prepare('UPDATE members SET id = ?, name = ?, display_name = ?, phone = ? WHERE id = ?').run(cb.memberId, cb.name, cb.displayName, cb.phone, oldMemId);
            db.prepare('UPDATE orders SET member_id = ? WHERE member_id = ?').run(cb.memberId, oldMemId);
            db.prepare('UPDATE payments SET member_id = ? WHERE member_id = ?').run(cb.memberId, oldMemId);
            db.prepare('UPDATE pastoral_members SET id = ?, buyer_member_id = ? WHERE buyer_member_id = ? OR id = ?').run(`pmem_${cb.memberId}`, cb.memberId, oldMemId, `pmem_${oldMemId}`);
          } else {
            db.prepare('UPDATE members SET name = ?, display_name = ?, phone = ? WHERE id = ?').run(cb.name, cb.displayName, cb.phone, cb.memberId);
          }

          const orderRow = db.prepare("SELECT id FROM orders WHERE member_id = ? AND campaign_id = 'camp-2026-oficial'").get(cb.memberId) as any;
          if (orderRow) {
            const oldOrdId = orderRow.id;
            if (oldOrdId !== cb.orderId) {
              db.prepare('UPDATE orders SET id = ?, pastoral_member_id = ?, production_status = ? WHERE id = ?').run(cb.orderId, `pmem_${cb.memberId}`, 'em_producao', oldOrdId);
              db.prepare('UPDATE order_items SET order_id = ? WHERE order_id = ?').run(cb.orderId, oldOrdId);
              db.prepare('UPDATE payments SET order_id = ? WHERE order_id = ?').run(cb.orderId, oldOrdId);
            } else {
              db.prepare('UPDATE orders SET pastoral_member_id = ?, production_status = ? WHERE id = ?').run(`pmem_${cb.memberId}`, 'em_producao', cb.orderId);
            }

            const itemRow = db.prepare('SELECT id FROM order_items WHERE order_id = ?').get(cb.orderId) as any;
            if (itemRow && itemRow.id !== cb.itemId) {
              db.prepare('UPDATE order_items SET id = ? WHERE id = ?').run(cb.itemId, itemRow.id);
            }
          }
        }
      }

      // 2. Sincronizar e blindar todos os 15 lançamentos de pagamentos de 10/11/2026 (14 quitados = R$ 630,00 + 1 estornado de Letícia Ingrid)
      const nov10Payments = [
        { id: 'pay_d5d1bbfb8865', orderId: 'ord_e535981ee443', memberId: 'mem_3a5d8b2854f7', amount: 4500, date: '2026-11-06', isReversed: 0, reason: null, reversedAt: null, reversedBy: null, createdAt: '2026-11-06T14:50:00.000Z', updatedAt: '2026-11-06T14:50:00.000Z' },
        { id: 'pay_0a9f138f5685', orderId: 'ord_b8ed287ddd36', memberId: 'mem_168e4d89c0d7', amount: 4500, date: '2026-11-05', isReversed: 0, reason: null, reversedAt: null, reversedBy: null, createdAt: '2026-11-05T14:50:00.000Z', updatedAt: '2026-11-05T14:50:00.000Z' },
        { id: 'pay_27660b8d35b2', orderId: 'ord_6eeb7cf00170', memberId: 'mem_22130dccbf2c', amount: 4500, date: '2026-11-04', isReversed: 0, reason: null, reversedAt: null, reversedBy: null, createdAt: '2026-11-04T14:50:00.000Z', updatedAt: '2026-11-04T14:50:00.000Z' },
        { id: 'pay_d4534c58efb9', orderId: 'ord_7c5161308f11', memberId: 'mem_d1b16e0ebcde', amount: 4500, date: '2026-11-06', isReversed: 0, reason: null, reversedAt: null, reversedBy: null, createdAt: '2026-11-06T14:50:00.000Z', updatedAt: '2026-11-06T14:50:00.000Z' },
        { id: 'pay_55017014b2bb', orderId: 'ord_a5c521d57e6e', memberId: 'mem_aeedddfde4d8', amount: 4500, date: '2026-11-05', isReversed: 0, reason: null, reversedAt: null, reversedBy: null, createdAt: '2026-11-05T14:50:00.000Z', updatedAt: '2026-11-05T14:50:00.000Z' },
        { id: 'pay_9a422406c647', orderId: 'ord_0c53215d8054', memberId: 'mem_2a2e78c53bf9', amount: 4500, date: '2026-11-04', isReversed: 0, reason: null, reversedAt: null, reversedBy: null, createdAt: '2026-11-04T14:50:00.000Z', updatedAt: '2026-11-04T14:50:00.000Z' },
        { id: 'pay_9c67b3f0775b', orderId: 'ord_15234064b8d2', memberId: 'mem_aff2b7da59f2', amount: 4500, date: '2026-11-04', isReversed: 0, reason: null, reversedAt: null, reversedBy: null, createdAt: '2026-11-04T14:50:00.000Z', updatedAt: '2026-11-04T14:50:00.000Z' },
        { id: 'pay_cf1e0bc9c6db', orderId: 'ord_0191867145fd', memberId: 'mem_718a8fc7413a', amount: 4500, date: '2026-11-10', isReversed: 0, reason: null, reversedAt: null, reversedBy: null, createdAt: '2026-11-10T19:12:29.130Z', updatedAt: '2026-11-10T19:12:29.130Z' },
        { id: 'pay_2ca00ef2e956', orderId: 'ord_9aea2e3ec4b5', memberId: 'mem_cd7f61cc211e', amount: 4500, date: '2026-11-10', isReversed: 0, reason: null, reversedAt: null, reversedBy: null, createdAt: '2026-11-10T19:12:32.663Z', updatedAt: '2026-11-10T19:12:32.663Z' },
        { id: 'pay_e7a8caf1273d', orderId: 'ord_b3cef19a189d', memberId: 'mem_e8ca36ae2233', amount: 4500, date: '2026-11-10', isReversed: 1, reason: 'errei', reversedAt: '2026-11-10T19:13:03.259Z', reversedBy: 'Pedro Rafael', createdAt: '2026-11-10T19:12:34.727Z', updatedAt: '2026-11-10T19:13:03.259Z' },
        { id: 'pay_c68d7ee322f2', orderId: 'ord_1efa0ec4d2d3', memberId: 'mem_03d218edc79f', amount: 4500, date: '2026-11-10', isReversed: 0, reason: null, reversedAt: null, reversedBy: null, createdAt: '2026-11-10T19:13:09.627Z', updatedAt: '2026-11-10T19:13:09.627Z' },
        { id: 'pay_3ae52c3d611c', orderId: 'ord_2a52e71a7bee', memberId: 'mem_255524b003e3', amount: 4500, date: '2026-11-10', isReversed: 0, reason: null, reversedAt: null, reversedBy: null, createdAt: '2026-11-10T19:13:14.235Z', updatedAt: '2026-11-10T19:13:14.235Z' },
        { id: 'pay_b87e5e76fda6', orderId: 'ord_f69cfe789f6b', memberId: 'mem_e026bf750415', amount: 4500, date: '2026-11-10', isReversed: 0, reason: null, reversedAt: null, reversedBy: null, createdAt: '2026-11-10T19:13:19.806Z', updatedAt: '2026-11-10T19:13:19.806Z' },
        { id: 'pay_666cd1ff7e48', orderId: 'ord_c2cf281eac89', memberId: 'mem_83ce887a76ef', amount: 4500, date: '2026-11-10', isReversed: 0, reason: null, reversedAt: null, reversedBy: null, createdAt: '2026-11-10T19:13:25.827Z', updatedAt: '2026-11-10T19:13:25.827Z' },
        { id: 'pay_3d9c81a66421', orderId: 'ord_2ed9e808ad7b', memberId: 'mem_c5ded13f55d7', amount: 4500, date: '2026-11-10', isReversed: 0, reason: null, reversedAt: null, reversedBy: null, createdAt: '2026-11-10T19:13:31.701Z', updatedAt: '2026-11-10T19:13:31.701Z' },
      ];

      const upsertPayment = db.prepare(`
        INSERT OR REPLACE INTO payments (
          id, order_id, member_id, amount_cents, payment_date, payment_method,
          recorded_by, notes, is_reversed, reversal_reason, reversed_at, reversed_by,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, 'pix', 'Pedro Rafael', '', ?, ?, ?, ?, ?, ?)
      `);

      for (const p of nov10Payments) {
        const orderExists = db.prepare('SELECT id, member_id FROM orders WHERE id = ?').get(p.orderId) as any;
        if (orderExists) {
          upsertPayment.run(
            p.id,
            orderExists.id,
            orderExists.member_id,
            p.amount,
            p.date,
            p.isReversed,
            p.reason,
            p.reversedAt,
            p.reversedBy,
            p.createdAt,
            p.updatedAt
          );
        }
      }

      // Recalcular saldos e status financeiro de todos os 19 pedidos da campanha 2026 a partir dos pagamentos válidos
      const allCampaignOrders = db.prepare("SELECT id, total_amount_cents FROM orders WHERE campaign_id = 'camp-2026-oficial' AND status != 'cancelado'").all() as any[];
      for (const ord of allCampaignOrders) {
        const sumRow = db.prepare('SELECT COALESCE(SUM(amount_cents), 0) as paid FROM payments WHERE order_id = ? AND is_reversed = 0').get(ord.id) as { paid: number };
        const paidCents = Math.min(ord.total_amount_cents, sumRow.paid || 0);
        const balanceCents = Math.max(0, ord.total_amount_cents - paidCents);
        const payStatus = balanceCents === 0 ? 'pago' : paidCents > 0 ? 'parcial' : 'pendente';

        db.prepare(`
          UPDATE orders
          SET paid_amount_cents = ?,
              balance_cents = ?,
              payment_status = ?,
              updated_at = ?
          WHERE id = ?
        `).run(paidCents, balanceCents, payStatus, now, ord.id);
      }

      // 3. Blindar todas as habilitações pastorais e aniversários salvos em 10/11/2026 (16:14–16:15 BRT)
      const all8 = ['Intercessão', 'Pregação', 'Formação', 'Testemunho', 'Música', 'Condução de oração', 'Animação', 'Apoio'];
      const veteran7NoMusic = ['Intercessão', 'Pregação', 'Formação', 'Testemunho', 'Condução de oração', 'Animação', 'Apoio'];
      const formation3 = ['Intercessão', 'Animação', 'Apoio'];
      const formationDudaFernandes = ['Animação', 'Apoio', 'Intercessão'];
      const formationMusic4 = ['Música', 'Animação', 'Apoio', 'Intercessão'];
      const formationJoaoMiguel4 = ['Intercessão', 'Animação', 'Apoio', 'Testemunho'];

      const nov10QualificationMap: Array<{ matchNames: string[]; quals: string[] }> = [
        // Coordenadores
        { matchNames: ['Fernanda Souto (Coordenadora)', 'Fernanda Souto', 'Fernanda'], quals: all8 },
        { matchNames: ['Pedro Rafael Santos Pignata (Coordenador)', 'Pedro Rafael Santos Pignata', 'Pedro Rafael'], quals: veteran7NoMusic },

        // Veteranos com 8 funções
        { matchNames: ['Jonas Emanuell'], quals: all8 },
        { matchNames: ['JoãoGabriel', 'João Gabriel'], quals: all8 },
        { matchNames: ['Miriam'], quals: all8 },
        { matchNames: ['Pedro Henrique'], quals: all8 },
        { matchNames: ['Raquel'], quals: all8 },
        { matchNames: ['Rayane'], quals: all8 },
        { matchNames: ['Samuel Aranha'], quals: all8 },
        { matchNames: ['Tiago'], quals: all8 },

        // Veteranos com 7 funções (sem Música)
        { matchNames: ['Angélica (Angel)', 'Angélica'], quals: veteran7NoMusic },
        { matchNames: ['Daniel'], quals: veteran7NoMusic },
        { matchNames: ['Gabriel (The Baios)', 'Gabriel'], quals: veteran7NoMusic },
        { matchNames: ['Iris Maria'], quals: veteran7NoMusic },
        { matchNames: ['José Vitor (Zé)', 'José Vitor'], quals: veteran7NoMusic },
        { matchNames: ['Kayla Lino'], quals: veteran7NoMusic },
        { matchNames: ['Rodrigo De Oliveira'], quals: veteran7NoMusic },

        // Membros atualizados em 10/11/2026 (16:14–16:15 BRT)
        { matchNames: ['Állan Fross', 'Állan'], quals: formationMusic4 },
        { matchNames: ['Victor'], quals: formationMusic4 },
        { matchNames: ['João Miguel'], quals: formationJoaoMiguel4 },
        { matchNames: ['Maria Eduarda Fernandes', 'Duda Fernandes'], quals: formationDudaFernandes },
        { matchNames: ['Alfredo'], quals: formation3 },
        { matchNames: ['Erick Kilbert'], quals: formation3 },
        { matchNames: ['Jamilly'], quals: formation3 },
        { matchNames: ['Júlia Viana', 'Júlia'], quals: formation3 },
        { matchNames: ['Laysa'], quals: formation3 },
        { matchNames: ['Letícia Ingrid', 'Letícia'], quals: formation3 },
        { matchNames: ['Ludmilla'], quals: formation3 },
        { matchNames: ['Lyvia Maria', 'Lyvia'], quals: formation3 },
        { matchNames: ['Manuella'], quals: formation3 },
        { matchNames: ['Maria Eduarda Soares', 'Duda Soares'], quals: formation3 },
        { matchNames: ['Maria Júlia'], quals: formation3 },
        { matchNames: ['Maria Luiza Lima'], quals: formation3 },
        { matchNames: ['Maria Luiza Neres', 'Malu Neres'], quals: formation3 },
        { matchNames: ['Mariane'], quals: formation3 },
        { matchNames: ['Saulo'], quals: formation3 },
        { matchNames: ['Vinícius', 'Vini'], quals: formation3 },

        // Membros ainda sem habilitações atribuídas
        { matchNames: ['Victor Cardoso'], quals: [] },
        { matchNames: ['Wellington Santos'], quals: [] },
      ];

      const pmRows = db.prepare('SELECT id, name, display_name FROM pastoral_members').all() as any[];
      const updatePmQuals = db.prepare('UPDATE pastoral_members SET qualifications_json = ?, updated_at = ? WHERE id = ?');

      for (const pm of pmRows) {
        const rule = nov10QualificationMap.find((r) =>
          r.matchNames.some(
            (mn) =>
              pm.name.trim().toLowerCase() === mn.trim().toLowerCase() ||
              (pm.display_name || '').trim().toLowerCase() === mn.trim().toLowerCase()
          )
        );
        if (rule) {
          updatePmQuals.run(JSON.stringify(rule.quals), '2026-11-10T19:15:39.509Z', pm.id);
        }
      }

      // Garantir aniversários de Pedro e João Miguel
      db.prepare(`
        UPDATE pastoral_members
        SET birth_day = COALESCE(birth_day, 23),
            birth_month = COALESCE(birth_month, 1),
            birth_year = COALESCE(birth_year, 2006)
        WHERE id = 'pmem_pedro'
      `).run();

      db.prepare(`
        UPDATE pastoral_members
        SET birth_day = COALESCE(birth_day, 4),
            birth_month = COALESCE(birth_month, 12),
            birth_year = COALESCE(birth_year, 2004)
        WHERE name = 'João Miguel' OR id = 'pmem_joao_miguel'
      `).run();

      // 4. Registrar trilha de auditoria oficial de 10/11/2026
      const insertAudit014 = db.prepare(`
        INSERT OR IGNORE INTO audit_logs (id, user_id, user_name, action, entity_type, entity_id, details_json, created_at)
        VALUES (?, 'user_pedro_coordinator', 'Pedro Rafael', ?, ?, ?, ?, ?)
      `);

      insertAudit014.run(
        'aud_nov10_pay_erick',
        'RECORD_PAYMENT',
        'payment',
        'pay_cf1e0bc9c6db',
        JSON.stringify({ order_id: 'ord_0191867145fd', amount_cents: 4500, payment_method: 'pix', new_balance_cents: 0, new_payment_status: 'pago' }),
        '2026-11-10T19:12:29.130Z'
      );
      insertAudit014.run(
        'aud_nov10_pay_julia',
        'RECORD_PAYMENT',
        'payment',
        'pay_2ca00ef2e956',
        JSON.stringify({ order_id: 'ord_9aea2e3ec4b5', amount_cents: 4500, payment_method: 'pix', new_balance_cents: 0, new_payment_status: 'pago' }),
        '2026-11-10T19:12:32.663Z'
      );
      insertAudit014.run(
        'aud_nov10_pay_leticia',
        'RECORD_PAYMENT',
        'payment',
        'pay_e7a8caf1273d',
        JSON.stringify({ order_id: 'ord_b3cef19a189d', amount_cents: 4500, payment_method: 'pix', new_balance_cents: 0, new_payment_status: 'pago' }),
        '2026-11-10T19:12:34.727Z'
      );
      insertAudit014.run(
        'aud_nov10_rev_leticia',
        'REVERSE_PAYMENT',
        'payment',
        'pay_e7a8caf1273d',
        JSON.stringify({ order_id: 'ord_b3cef19a189d', reversed_amount_cents: 4500, reason: 'errei', new_balance_cents: 4500, new_payment_status: 'pendente' }),
        '2026-11-10T19:13:03.259Z'
      );
      insertAudit014.run(
        'aud_nov10_pay_lyvia',
        'RECORD_PAYMENT',
        'payment',
        'pay_c68d7ee322f2',
        JSON.stringify({ order_id: 'ord_1efa0ec4d2d3', amount_cents: 4500, payment_method: 'pix', new_balance_cents: 0, new_payment_status: 'pago' }),
        '2026-11-10T19:13:09.627Z'
      );
      insertAudit014.run(
        'aud_nov10_pay_laysa',
        'RECORD_PAYMENT',
        'payment',
        'pay_3ae52c3d611c',
        JSON.stringify({ order_id: 'ord_2a52e71a7bee', amount_cents: 4500, payment_method: 'pix', new_balance_cents: 0, new_payment_status: 'pago' }),
        '2026-11-10T19:13:14.235Z'
      );
      insertAudit014.run(
        'aud_nov10_pay_manuella',
        'RECORD_PAYMENT',
        'payment',
        'pay_b87e5e76fda6',
        JSON.stringify({ order_id: 'ord_f69cfe789f6b', amount_cents: 4500, payment_method: 'pix', new_balance_cents: 0, new_payment_status: 'pago' }),
        '2026-11-10T19:13:19.806Z'
      );
      insertAudit014.run(
        'aud_nov10_pay_maria_julia',
        'RECORD_PAYMENT',
        'payment',
        'pay_666cd1ff7e48',
        JSON.stringify({ order_id: 'ord_c2cf281eac89', amount_cents: 4500, payment_method: 'pix', new_balance_cents: 0, new_payment_status: 'pago' }),
        '2026-11-10T19:13:25.827Z'
      );
      insertAudit014.run(
        'aud_nov10_pay_saulo',
        'RECORD_PAYMENT',
        'payment',
        'pay_3d9c81a66421',
        JSON.stringify({ order_id: 'ord_2ed9e808ad7b', amount_cents: 4500, payment_method: 'pix', new_balance_cents: 0, new_payment_status: 'pago' }),
        '2026-11-10T19:13:31.701Z'
      );

      db.prepare(`
        INSERT INTO schema_migrations (version, name, applied_at)
        VALUES ('014_master_14_0_lock_nov10_payments_qualifications_and_deterministic_ids', 'Blindagem Definitiva dos Dados de 10/11/2026 (14 Pagamentos Quitados, 1 Estorno, Habilitações dos 39 Membros e IDs Determinísticos)', datetime('now'))
      `).run();
    });

    migrate014();
    console.log('✓ Migração 014_master_14_0_lock_nov10_payments_qualifications_and_deterministic_ids aplicada com sucesso.');
  }

  // Idempotent Seed of Official Institutional Data
  seedEcosystemData();
}

export function seedEcosystemData() {
  const now = new Date().toISOString();

  const transaction = db.transaction(() => {
    // 1. Seed Coordenadores Atuais (Pedro e Fernanda) em coordination_succession
    const existingCoordinators = db.prepare('SELECT COUNT(*) as c FROM coordination_succession').get() as { c: number };
    if (existingCoordinators.c === 0) {
      const insertCoord = db.prepare(`
        INSERT INTO coordination_succession (id, coordinator_name, role_title, status, proposed_by, started_at, checklist_json, notes, created_at)
        VALUES (?, ?, ?, 'ativo', 'Institucional', ?, ?, ?, ?)
      `);
      const defaultChecklist = JSON.stringify({
        permissoes_atribuidas: true,
        documentos_organizados: true,
        financas_conferidas: true,
        backup_validado: true,
      });
      insertCoord.run('coord-pedro', 'Pedro', 'Coordenador da Pastoral Missionária', '2026-01-01', defaultChecklist, 'Coordenação em exercício e responsável técnico inicial', now);
      insertCoord.run('coord-fernanda', 'Fernanda', 'Coordenadora da Pastoral Missionária', '2026-01-01', defaultChecklist, 'Coordenação em exercício da Pastoral Missionária', now);
    }

    // 2. Seed Pastoral Members (Pedro, Fernanda + vínculo com os 19 membros iniciais)
    const insertPastoralMember = db.prepare(`
      INSERT OR IGNORE INTO pastoral_members (
        id, buyer_member_id, name, display_name, status, pastoral_role, joined_at, qualifications_json, skills_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'ativo', ?, '2026-01-01', ?, ?, ?, ?)
    `);

    const all8Quals = JSON.stringify([
      'Intercessão',
      'Pregação',
      'Formação',
      'Testemunho',
      'Música',
      'Condução de oração',
      'Animação',
      'Apoio'
    ]);

    insertPastoralMember.run(
      'pmem_pedro',
      null,
      'Pedro Rafael Santos Pignata (Coordenador)',
      'Pedro',
      'coordenador',
      all8Quals,
      JSON.stringify(['Coordenação', 'Pregação', 'Formação', 'Organização']),
      now,
      now
    );

    insertPastoralMember.run(
      'pmem_fernanda',
      null,
      'Fernanda Souto (Coordenadora)',
      'Fernanda',
      'coordenador',
      all8Quals,
      JSON.stringify(['Coordenação', 'Pregação', 'Formação', 'Acolhimento']),
      now,
      now
    );

    const existingPastoralCount = (db.prepare('SELECT COUNT(*) as c FROM pastoral_members').get() as { c: number }).c;
    if (existingPastoralCount <= 2) {
      const existingBuyerMembers = db.prepare('SELECT * FROM members').all() as any[];
      for (const bm of existingBuyerMembers) {
        insertPastoralMember.run(
          `pmem_${bm.id}`,
          bm.id,
          bm.name,
          bm.display_name,
          'membro',
          JSON.stringify([]),
          JSON.stringify([]),
          bm.created_at || now,
          now
        );
      }
    }

    // 3. Seed 26 Official Events from PDF Calendar 2027
    const upsertCalEvent = db.prepare(`
      INSERT OR IGNORE INTO calendar_events (
        id, external_stable_id, title, description, event_date, event_time, location,
        category, status, visibility, responsibles_json, notes, source, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, NULL, NULL, ?, ?, 'publico', ?, ?, 'Calendário da Pastoral Missionária 2027.pdf', ?, ?)
    `);

    for (const ev of CALENDAR_2027_SEED) {
      upsertCalEvent.run(
        ev.id,
        ev.id,
        ev.title,
        ev.notes,
        ev.date,
        ev.category,
        ev.status,
        JSON.stringify(['Pedro', 'Fernanda']),
        ev.notes,
        now,
        now
      );
    }

    // 4. Seed 19 Official Laboratory Themes
    const upsertTheme = db.prepare(`
      INSERT OR IGNORE INTO lab_themes (id, theme_number, title, category, active)
      VALUES (?, ?, ?, ?, 1)
    `);
    for (const th of OFFICIAL_LAB_THEMES) {
      upsertTheme.run(`theme_${th.number}`, th.number, th.title, th.category);
    }

    // 5. Seed Official Event Templates from PDF
    const upsertTemplate = db.prepare(`
      INSERT OR IGNORE INTO event_templates (
        id, slug, title, target_audience, objective, suggested_theme,
        schedule_json, teams_json, guidelines, source_reference
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const tpl of OFFICIAL_EVENT_TEMPLATES) {
      upsertTemplate.run(
        `tpl_${tpl.slug}`,
        tpl.slug,
        tpl.title,
        tpl.target_audience,
        tpl.objective,
        tpl.suggested_theme,
        JSON.stringify(tpl.schedule),
        JSON.stringify(tpl.teams),
        tpl.guidelines,
        tpl.source_reference
      );
    }

    // 6. Seed Initial Institutional Announcements
    const existingAnnouncements = db.prepare('SELECT COUNT(*) as c FROM announcements').get() as { c: number };
    if (existingAnnouncements.c === 0) {
      const insertAnnouncement = db.prepare(`
        INSERT INTO announcements (id, title, content, category, audience, pinned, author_name, created_at)
        VALUES (?, ?, ?, ?, 'todos', ?, ?, ?)
      `);
      insertAnnouncement.run(
        'ann-boas-vindas-ecossistema',
        'Bem-vindos à Plataforma da Pastoral Missionária!',
        'Paz e bem, irmãos!\n\nNossa plataforma foi criada para facilitar a organização e a caminhada da Pastoral Missionária. Aqui podemos acompanhar o calendário da Pastoral, consultar missões e envios, organizar os laboratórios de pregação, acessar comunicados, participar da comunidade missionária e acompanhar os pedidos das camisetas.\n\nQue este espaço nos ajude a viver nossa missão com mais unidade, organização e fraternidade.\n\n"Tenha Jesus Cristo em seu coração, e todas as cruzes do mundo parecerão rosas!" — São Padre Pio.',
        'Institucional',
        1,
        'Coordenação (Pedro e Fernanda)',
        now
      );
      insertAnnouncement.run(
        'ann-camisetas-2026',
        'Campanha de Camisetas Oficiais 2026 em andamento',
        'Verifique na aba "Minha Camiseta & Pix" o modelo e o tamanho do seu pedido, confira a chave Pix oficial da Pastoral e envie o comprovante para a coordenação dar baixa.',
        'Camisetas',
        1,
        'Coordenação (Pedro e Fernanda)',
        now
      );
    }
  });

  transaction();
}

if (process.argv[1]?.endsWith('migrations.ts') || process.argv[1]?.endsWith('migrations.js')) {
  runMigrations();
}

