import crypto from 'crypto';
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

    insertPastoralMember.run(
      'pmem_pedro',
      null,
      'Pedro (Coordenador)',
      'Pedro',
      'coordenador',
      JSON.stringify(['Intercessão', 'Pregação', 'Formação', 'Condução de oração', 'Apoio']),
      JSON.stringify(['Coordenação', 'Pregação', 'Formação', 'Organização']),
      now,
      now
    );

    insertPastoralMember.run(
      'pmem_fernanda',
      null,
      'Fernanda (Coordenadora)',
      'Fernanda',
      'coordenador',
      JSON.stringify(['Intercessão', 'Pregação', 'Formação', 'Condução de oração', 'Apoio']),
      JSON.stringify(['Coordenação', 'Pregação', 'Formação', 'Acolhimento']),
      now,
      now
    );

    const existingBuyerMembers = db.prepare('SELECT * FROM members').all() as any[];
    for (const bm of existingBuyerMembers) {
      insertPastoralMember.run(
        `pmem_${bm.id}`,
        bm.id,
        bm.name,
        bm.display_name,
        'membro',
        JSON.stringify(['Intercessão', 'Apoio']),
        JSON.stringify(['Intercessão', 'Evangelização']),
        bm.created_at || now,
        now
      );
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
        'Bem-vindos ao Ecossistema Digital da Pastoral Missionária!',
        'Paz e bem, irmãos! Nosso sistema evoluiu: além do acompanhamento completo dos pedidos das camisetas oficiais, agora contamos com o Calendário Oficial 2027, a Central de Envios Missionários, os Laboratórios de Pregação com os 19 temas e ficha de avaliação oficial, e os modelos de encontros da nossa pasta. "Tenha Jesus Cristo em seu coração, e todas as cruzes do mundo parecerão rosas!" — São Padre Pio.',
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
