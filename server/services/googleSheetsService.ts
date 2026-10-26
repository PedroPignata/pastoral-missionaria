import { db } from '../db/database.js';
import { google } from 'googleapis';
import crypto from 'crypto';

export interface GoogleSheetsConfig {
  enabled: boolean;
  mode: 'service_account' | 'webhook' | 'offline';
  spreadsheet_id: string;
  spreadsheet_name: string;
  service_account_email: string;
  service_account_private_key: string;
  webhook_url: string;
  auto_sync: boolean;
  last_synced_at: string | null;
  status: 'conectado' | 'desconectado' | 'erro' | 'pendente';
  last_error?: string;
}

export class GoogleSheetsService {
  private static instance: GoogleSheetsService;
  private isProcessingQueue = false;

  public static getInstance(): GoogleSheetsService {
    if (!GoogleSheetsService.instance) {
      GoogleSheetsService.instance = new GoogleSheetsService();
    }
    return GoogleSheetsService.instance;
  }

  // Get current integration settings
  public getConfig(): GoogleSheetsConfig {
    const row = db.prepare('SELECT value_json FROM integration_settings WHERE key = ?').get('google_sheets') as any;
    if (!row) {
      return {
        enabled: false,
        mode: 'webhook',
        spreadsheet_id: '',
        spreadsheet_name: 'Camisetas Pastoral Missionária 2026',
        service_account_email: '',
        service_account_private_key: '',
        webhook_url: '',
        auto_sync: true,
        last_synced_at: null,
        status: 'desconectado',
      };
    }
    return JSON.parse(row.value_json);
  }

  // Update integration settings
  public updateConfig(newConfig: Partial<GoogleSheetsConfig>): GoogleSheetsConfig {
    const current = this.getConfig();
    const updated: GoogleSheetsConfig = { ...current, ...newConfig };
    db.prepare(`
      INSERT INTO integration_settings (key, value_json, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at
    `).run('google_sheets', JSON.stringify(updated), new Date().toISOString());
    return updated;
  }

  // Schedule a sync job in the outbox
  public enqueueJob(entityType: string, entityId: string | null, action: string, payload?: any) {
    const jobId = 'sync_' + crypto.randomBytes(8).toString('hex');
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO sync_jobs (id, entity_type, entity_id, action, payload_json, status, attempts, created_at)
      VALUES (?, ?, ?, ?, ?, 'pending', 0, ?)
    `).run(
      jobId,
      entityType,
      entityId,
      action,
      payload ? JSON.stringify(payload) : null,
      now
    );

    // If auto_sync is enabled, trigger background processing
    const config = this.getConfig();
    if (config.auto_sync && config.enabled) {
      setTimeout(() => this.processQueue(), 500);
    }

    return jobId;
  }

  // Generate complete dataset for all 8 tabs
  public getCompleteSheetsData() {
    // 1. Pedidos
    const orders = db.prepare(`
      SELECT
        o.id as id_pedido,
        c.name as campanha,
        m.name as membro_nome,
        m.phone as membro_telefone,
        oi.model as modelo,
        oi.size as tamanho,
        oi.quantity as quantidade,
        ROUND(oi.unit_price_cents / 100.0, 2) as valor_unitario_reais,
        ROUND(o.total_amount_cents / 100.0, 2) as valor_total_reais,
        ROUND(o.paid_amount_cents / 100.0, 2) as valor_pago_reais,
        ROUND(o.balance_cents / 100.0, 2) as saldo_pendente_reais,
        o.payment_status as status_pagamento,
        o.production_status as status_producao,
        o.delivery_status as status_entrega,
        o.delivery_date as data_entrega,
        o.delivered_to as entregue_para,
        o.notes as observacoes,
        o.created_at as data_cadastro
      FROM orders o
      JOIN campaigns c ON c.id = o.campaign_id
      JOIN members m ON m.id = o.member_id
      LEFT JOIN order_items oi ON oi.order_id = o.id
      ORDER BY m.name ASC
    `).all();

    // 2. Membros
    const members = db.prepare(`
      SELECT
        m.id as id_membro,
        m.name as nome_completo,
        m.display_name as nome_exibicao,
        m.phone as telefone,
        m.notes as observacoes,
        CASE WHEN m.active = 1 THEN 'Ativo' ELSE 'Inativo' END as status,
        COUNT(o.id) as total_pedidos,
        ROUND(COALESCE(SUM(o.total_amount_cents), 0) / 100.0, 2) as total_gasto_reais,
        m.created_at as data_cadastro
      FROM members m
      LEFT JOIN orders o ON o.member_id = m.id AND o.status != 'cancelado'
      GROUP BY m.id
      ORDER BY m.name ASC
    `).all();

    // 3. Pagamentos
    const payments = db.prepare(`
      SELECT
        p.id as id_pagamento,
        p.order_id as id_pedido,
        m.name as membro_nome,
        ROUND(p.amount_cents / 100.0, 2) as valor_pago_reais,
        p.payment_date as data_pagamento,
        p.payment_method as forma_pagamento,
        p.recorded_by as registrado_por,
        p.notes as observacoes,
        CASE WHEN p.is_reversed = 1 THEN 'Estornado' ELSE 'Válido' END as status,
        p.created_at as registrado_em
      FROM payments p
      JOIN members m ON m.id = p.member_id
      ORDER BY p.payment_date DESC, p.created_at DESC
    `).all();

    // 4. Financeiro (Resumo Geral)
    const financialSummary = db.prepare(`
      SELECT
        COUNT(DISTINCT o.id) as total_pedidos,
        ROUND(COALESCE(SUM(o.total_amount_cents), 0) / 100.0, 2) as total_previsto_reais,
        ROUND(COALESCE(SUM(o.paid_amount_cents), 0) / 100.0, 2) as total_arrecadado_reais,
        ROUND(COALESCE(SUM(o.balance_cents), 0) / 100.0, 2) as total_pendente_reais,
        SUM(CASE WHEN o.payment_status = 'pago' THEN 1 ELSE 0 END) as pedidos_quitados,
        SUM(CASE WHEN o.payment_status = 'parcial' THEN 1 ELSE 0 END) as pedidos_parciais,
        SUM(CASE WHEN o.payment_status = 'pendente' THEN 1 ELSE 0 END) as pedidos_sem_pagamento,
        ROUND((COALESCE(SUM(o.paid_amount_cents), 0) * 100.0) / NULLIF(SUM(o.total_amount_cents), 0), 1) as percentual_arrecadado
      FROM orders o
      WHERE o.status != 'cancelado'
    `).get() as any;

    // 5. Tamanhos e modelos
    const sizeModelSummary = db.prepare(`
      SELECT
        oi.model as modelo,
        oi.size as tamanho,
        SUM(oi.quantity) as quantidade,
        ROUND(SUM(oi.total_price_cents) / 100.0, 2) as total_reais
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE o.status != 'cancelado'
      GROUP BY oi.model, oi.size
      ORDER BY oi.model ASC,
        CASE oi.size
          WHEN 'PP' THEN 1
          WHEN 'P' THEN 2
          WHEN 'M' THEN 3
          WHEN 'G' THEN 4
          WHEN 'GG' THEN 5
          WHEN 'XG' THEN 6
          ELSE 7
        END
    `).all();

    // 6. Produção e entregas
    const productionSummary = db.prepare(`
      SELECT
        o.id as id_pedido,
        m.name as membro_nome,
        oi.model as modelo,
        oi.size as tamanho,
        o.production_status as etapa_producao,
        o.delivery_status as status_entrega,
        o.delivery_date as data_entrega,
        o.delivered_to as entregue_para,
        o.payment_status as status_pagamento
      FROM orders o
      JOIN members m ON m.id = o.member_id
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.status != 'cancelado'
      ORDER BY o.production_status ASC, m.name ASC
    `).all();

    // 7. Campanhas
    const campaigns = db.prepare(`
      SELECT
        c.id as id_campanha,
        c.name as nome_campanha,
        c.description as descricao,
        ROUND(c.default_price_cents / 100.0, 2) as preco_padrao_reais,
        c.status as status_campanha,
        c.start_date as data_inicio,
        c.end_date as data_fim,
        COUNT(DISTINCT o.id) as total_pedidos,
        ROUND(COALESCE(SUM(o.total_amount_cents), 0) / 100.0, 2) as valor_total_reais
      FROM campaigns c
      LEFT JOIN orders o ON o.campaign_id = c.id AND o.status != 'cancelado'
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `).all();

    // 8. Histórico (Auditoria)
    const auditHistory = db.prepare(`
      SELECT
        a.id as id_historico,
        a.action as acao,
        a.entity_type as tipo_entidade,
        a.entity_id as id_entidade,
        a.user_name as usuario_responsavel,
        a.details_json as detalhes,
        a.created_at as data_registro
      FROM audit_logs a
      ORDER BY a.created_at DESC
      LIMIT 100
    `).all();

    return {
      orders,
      members,
      payments,
      financialSummary,
      sizeModelSummary,
      productionSummary,
      campaigns,
      auditHistory,
      generatedAt: new Date().toISOString(),
    };
  }

  // Process pending sync jobs in the outbox queue
  public async processQueue(): Promise<{ processed: number; errors: number }> {
    if (this.isProcessingQueue) {
      return { processed: 0, errors: 0 };
    }

    this.isProcessingQueue = true;
    let processed = 0;
    let errors = 0;

    try {
      const config = this.getConfig();
      if (!config.enabled) {
        return { processed: 0, errors: 0 };
      }

      const pendingJobs = db.prepare(`
        SELECT * FROM sync_jobs
        WHERE status = 'pending'
        ORDER BY created_at ASC
        LIMIT 20
      `).all() as any[];

      if (pendingJobs.length === 0) {
        return { processed: 0, errors: 0 };
      }

      // Sync complete data snapshot to sheets
      const syncResult = await this.syncAllData(config);

      const now = new Date().toISOString();
      if (syncResult.success) {
        const updateJob = db.prepare(`
          UPDATE sync_jobs
          SET status = 'completed', completed_at = ?, error_message = NULL
          WHERE id = ?
        `);

        for (const job of pendingJobs) {
          updateJob.run(now, job.id);
          processed++;
        }

        this.updateConfig({
          last_synced_at: now,
          status: 'conectado',
          last_error: undefined,
        });

        this.logSync('INFO', `Sincronização concluída com sucesso: ${processed} eventos processados.`);
      } else {
        const failJob = db.prepare(`
          UPDATE sync_jobs
          SET attempts = attempts + 1, error_message = ?, last_attempt_at = ?
          WHERE id = ?
        `);

        for (const job of pendingJobs) {
          failJob.run(syncResult.error || 'Erro desconhecido', now, job.id);
          errors++;
        }

        this.updateConfig({
          status: 'erro',
          last_error: syncResult.error,
        });

        this.logSync('ERROR', `Falha na sincronização: ${syncResult.error}`);
      }
    } catch (err: any) {
      errors++;
      this.logSync('ERROR', `Exceção na fila de sincronização: ${err.message}`);
    } finally {
      this.isProcessingQueue = false;
    }

    return { processed, errors };
  }

  // Sync entire dataset to Google Sheets via configured mode
  public async syncAllData(config?: GoogleSheetsConfig): Promise<{ success: boolean; error?: string }> {
    const activeConfig = config || this.getConfig();
    const data = this.getCompleteSheetsData();

    if (activeConfig.mode === 'webhook' && activeConfig.webhook_url) {
      return await this.syncViaWebhook(activeConfig.webhook_url, data);
    }

    if (activeConfig.mode === 'service_account' && activeConfig.service_account_email && activeConfig.service_account_private_key && activeConfig.spreadsheet_id) {
      return await this.syncViaServiceAccount(activeConfig, data);
    }

    if (activeConfig.mode === 'offline') {
      // In offline/simulation mode, validate and pretend success
      return { success: true };
    }

    return {
      success: false,
      error: 'Nenhum método de conexão (Service Account ou Webhook) está configurado com credenciais válidas.',
    };
  }

  // Webhook implementation (Google Apps Script)
  private async syncViaWebhook(webhookUrl: string, data: any): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SYNC_ALL',
          timestamp: new Date().toISOString(),
          data: data,
        }),
      });

      if (!response.ok) {
        throw new Error(`Google Apps Script retornou HTTP ${response.status}`);
      }

      const result: any = await response.json().catch(() => ({ status: 'ok' }));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // Official Google Sheets API v4 using Service Account
  private async syncViaServiceAccount(config: GoogleSheetsConfig, data: any): Promise<{ success: boolean; error?: string }> {
    try {
      const jwtClient = new google.auth.JWT({
        email: config.service_account_email,
        key: config.service_account_private_key.replace(/\\n/g, '\n'),
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      const sheets = google.sheets({ version: 'v4', auth: jwtClient });
      const spreadsheetId = config.spreadsheet_id;

      // 1. Ensure the 8 tabs exist
      const meta = await sheets.spreadsheets.get({ spreadsheetId });
      const existingSheetTitles = meta.data.sheets?.map(s => s.properties?.title) || [];

      const requiredTabs = [
        'Pedidos',
        'Membros',
        'Pagamentos',
        'Financeiro',
        'Tamanhos e modelos',
        'Produção e entregas',
        'Campanhas',
        'Histórico',
      ];

      const addSheetRequests: any[] = [];
      for (const tab of requiredTabs) {
        if (!existingSheetTitles.includes(tab)) {
          addSheetRequests.push({
            addSheet: { properties: { title: tab } },
          });
        }
      }

      if (addSheetRequests.length > 0) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: { requests: addSheetRequests },
        });
      }

      // 2. Prepare tabular updates for each tab
      // Tab 1: Pedidos
      const ordersValues = [
        [
          'ID Pedido', 'Campanha', 'Membro', 'Telefone', 'Modelo', 'Tamanho',
          'Quantidade', 'Valor Unit. (R$)', 'Valor Total (R$)', 'Valor Pago (R$)',
          'Saldo Pendente (R$)', 'Status Pagamento', 'Status Produção', 'Status Entrega',
          'Data Entrega', 'Entregue Para', 'Observações', 'Data Cadastro'
        ],
        ...data.orders.map((o: any) => [
          o.id_pedido, o.campanha, o.membro_nome, o.membro_telefone || '',
          o.modelo, o.tamanho, o.quantidade, o.valor_unitario_reais,
          o.valor_total_reais, o.valor_pago_reais, o.saldo_pendente_reais,
          o.status_pagamento, o.status_producao, o.status_entrega,
          o.data_entrega || '', o.entregue_para || '', o.observacoes || '', o.data_cadastro
        ])
      ];

      // Tab 2: Membros
      const membersValues = [
        ['ID Membro', 'Nome Completo', 'Nome Exibição', 'Telefone', 'Observações', 'Status', 'Total Pedidos', 'Total Gasto (R$)', 'Data Cadastro'],
        ...data.members.map((m: any) => [
          m.id_membro, m.nome_completo, m.nome_exibicao, m.telefone || '',
          m.observacoes || '', m.status, m.total_pedidos, m.total_gasto_reais, m.data_cadastro
        ])
      ];

      // Tab 3: Pagamentos
      const paymentsValues = [
        ['ID Pagamento', 'ID Pedido', 'Membro', 'Valor Pago (R$)', 'Data Pagamento', 'Forma Pagamento', 'Registrado Por', 'Observações', 'Status', 'Registrado Em'],
        ...data.payments.map((p: any) => [
          p.id_pagamento, p.id_pedido, p.membro_nome, p.valor_pago_reais,
          p.data_pagamento, p.forma_pagamento, p.registrado_por, p.observacoes || '',
          p.status, p.registrado_em
        ])
      ];

      // Tab 4: Financeiro
      const f = data.financialSummary;
      const financialValues = [
        ['Indicador Financeiro', 'Valor'],
        ['Total de Pedidos', f.total_pedidos],
        ['Valor Total Previsto (R$)', f.total_previsto_reais],
        ['Valor Arrecadado (R$)', f.total_arrecadado_reais],
        ['Valor Ainda Pendente (R$)', f.total_pendente_reais],
        ['Pedidos Quitados (100%)', f.pedidos_quitados],
        ['Pedidos Parcialmente Pagos', f.pedidos_parciais],
        ['Pedidos Sem Pagamento', f.pedidos_sem_pagamento],
        ['Porcentagem Arrecadada (%)', `${f.percentual_arrecadado || 0}%`],
        ['Última Atualização', new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })]
      ];

      // Tab 5: Tamanhos e modelos
      const sizeValues = [
        ['Modelo', 'Tamanho', 'Quantidade', 'Total (R$)'],
        ...data.sizeModelSummary.map((s: any) => [
          s.modelo, s.tamanho, s.quantidade, s.total_reais
        ])
      ];

      // Tab 6: Produção e entregas
      const prodValues = [
        ['ID Pedido', 'Membro', 'Modelo', 'Tamanho', 'Etapa Produção', 'Status Entrega', 'Data Entrega', 'Entregue Para', 'Status Pagamento'],
        ...data.productionSummary.map((pr: any) => [
          pr.id_pedido, pr.membro_nome, pr.modelo, pr.tamanho,
          pr.etapa_producao, pr.status_entrega, pr.data_entrega || '', pr.entregue_para || '', pr.status_pagamento
        ])
      ];

      // Tab 7: Campanhas
      const campValues = [
        ['ID Campanha', 'Nome Campanha', 'Descrição', 'Preço Padrão (R$)', 'Status', 'Data Início', 'Data Fim', 'Total Pedidos', 'Valor Total (R$)'],
        ...data.campaigns.map((c: any) => [
          c.id_campanha, c.nome_campanha, c.descricao || '', c.preco_padrao_reais,
          c.status_campanha, c.data_inicio || '', c.data_fim || '', c.total_pedidos, c.valor_total_reais
        ])
      ];

      // Tab 8: Histórico
      const auditValues = [
        ['ID Histórico', 'Ação', 'Tipo Entidade', 'ID Entidade', 'Usuário Responsável', 'Detalhes', 'Data/Hora'],
        ...data.auditHistory.map((a: any) => [
          a.id_historico, a.acao, a.tipo_entidade, a.id_entidade,
          a.usuario_responsavel || 'Sistema', a.detalhes || '', a.data_registro
        ])
      ];

      // Clear & Update all ranges in batch
      const updates = [
        { range: 'Pedidos!A1:R' + (ordersValues.length + 10), values: ordersValues },
        { range: 'Membros!A1:I' + (membersValues.length + 10), values: membersValues },
        { range: 'Pagamentos!A1:J' + (paymentsValues.length + 10), values: paymentsValues },
        { range: 'Financeiro!A1:B' + (financialValues.length + 5), values: financialValues },
        { range: 'Tamanhos e modelos!A1:D' + (sizeValues.length + 5), values: sizeValues },
        { range: 'Produção e entregas!A1:I' + (prodValues.length + 10), values: prodValues },
        { range: 'Campanhas!A1:I' + (campValues.length + 5), values: campValues },
        { range: 'Histórico!A1:G' + (auditValues.length + 10), values: auditValues },
      ];

      for (const update of updates) {
        // Clear first to remove any deleted rows
        await sheets.spreadsheets.values.clear({
          spreadsheetId,
          range: update.range.split('!')[0] + '!A1:Z500',
        }).catch(() => {});

        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: update.range.split(':')[0],
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: update.values },
        });
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // Get sample ready-to-use Google Apps Script code for 1-click deployment
  public getAppsScriptCode(): string {
    return `// CÓDIGO GOOGLE APPS SCRIPT PARA A PASTORAL MISSIONÁRIA
// Instruções:
// 1. Abra sua planilha no Google Planilhas
// 2. Clique no menu 'Extensões' > 'Apps Script'
// 3. Cole este código no editor (substituindo tudo)
// 4. Clique em 'Implantar' > 'Nova implantação'
// 5. Selecione 'App da Web', em 'Quem tem acesso' escolha 'Qualquer pessoa' (Anyone)
// 6. Clique em 'Implantar' e copie o URL do App da Web gerado
// 7. Cole o URL na tela 'Google Planilhas' do sistema da Pastoral Missionária!

function doPost(e) {
  try {
    var contents = JSON.parse(e.postData.contents);
    if (contents.action === 'SYNC_ALL') {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var d = contents.data;

      // 1. Pedidos
      updateSheet(ss, "Pedidos", [
        ["ID Pedido", "Campanha", "Membro", "Telefone", "Modelo", "Tamanho", "Quantidade", "Valor Unit. (R$)", "Valor Total (R$)", "Valor Pago (R$)", "Saldo Pendente (R$)", "Status Pagamento", "Status Produção", "Status Entrega", "Data Entrega", "Entregue Para", "Observações", "Data Cadastro"]
      ].concat(d.orders.map(function(o) {
        return [o.id_pedido, o.campanha, o.membro_nome, o.membro_telefone || '', o.modelo, o.tamanho, o.quantidade, o.valor_unitario_reais, o.valor_total_reais, o.valor_pago_reais, o.saldo_pendente_reais, o.status_pagamento, o.status_producao, o.status_entrega, o.data_entrega || '', o.entregue_para || '', o.observacoes || '', o.data_cadastro];
      })));

      // 2. Membros
      updateSheet(ss, "Membros", [
        ["ID Membro", "Nome Completo", "Nome Exibição", "Telefone", "Observações", "Status", "Total Pedidos", "Total Gasto (R$)", "Data Cadastro"]
      ].concat(d.members.map(function(m) {
        return [m.id_membro, m.nome_completo, m.nome_exibicao, m.telefone || '', m.observacoes || '', m.status, m.total_pedidos, m.total_gasto_reais, m.data_cadastro];
      })));

      // 3. Pagamentos
      updateSheet(ss, "Pagamentos", [
        ["ID Pagamento", "ID Pedido", "Membro", "Valor Pago (R$)", "Data Pagamento", "Forma Pagamento", "Registrado Por", "Observações", "Status", "Registrado Em"]
      ].concat(d.payments.map(function(p) {
        return [p.id_pagamento, p.id_pedido, p.membro_nome, p.valor_pago_reais, p.data_pagamento, p.forma_pagamento, p.registrado_por, p.observacoes || '', p.status, p.registrado_em];
      })));

      // 4. Financeiro
      var f = d.financialSummary;
      updateSheet(ss, "Financeiro", [
        ["Indicador Financeiro", "Valor"],
        ["Total de Pedidos", f.total_pedidos],
        ["Valor Total Previsto (R$)", f.total_previsto_reais],
        ["Valor Arrecadado (R$)", f.total_arrecadado_reais],
        ["Valor Ainda Pendente (R$)", f.total_pendente_reais],
        ["Pedidos Quitados", f.pedidos_quitados],
        ["Pedidos Parciais", f.pedidos_parciais],
        ["Pedidos Sem Pagamento", f.pedidos_sem_pagamento],
        ["Porcentagem Arrecadada (%)", (f.percentual_arrecadado || 0) + "%"],
        ["Última Sincronização", new Date().toLocaleString("pt-BR")]
      ]);

      // 5. Tamanhos e modelos
      updateSheet(ss, "Tamanhos e modelos", [
        ["Modelo", "Tamanho", "Quantidade", "Total (R$)"]
      ].concat(d.sizeModelSummary.map(function(s) {
        return [s.modelo, s.tamanho, s.quantidade, s.total_reais];
      })));

      // 6. Produção e entregas
      updateSheet(ss, "Produção e entregas", [
        ["ID Pedido", "Membro", "Modelo", "Tamanho", "Etapa Produção", "Status Entrega", "Data Entrega", "Entregue Para", "Status Pagamento"]
      ].concat(d.productionSummary.map(function(pr) {
        return [pr.id_pedido, pr.membro_nome, pr.modelo, pr.tamanho, pr.etapa_producao, pr.status_entrega, pr.data_entrega || '', pr.entregue_para || '', pr.status_pagamento];
      })));

      // 7. Campanhas
      updateSheet(ss, "Campanhas", [
        ["ID Campanha", "Nome Campanha", "Descrição", "Preço Padrão (R$)", "Status", "Data Início", "Data Fim", "Total Pedidos", "Valor Total (R$)"]
      ].concat(d.campaigns.map(function(c) {
        return [c.id_campanha, c.nome_campanha, c.descricao || '', c.preco_padrao_reais, c.status_campanha, c.data_inicio || '', c.data_fim || '', c.total_pedidos, c.valor_total_reais];
      })));

      // 8. Histórico
      updateSheet(ss, "Histórico", [
        ["ID Histórico", "Ação", "Tipo Entidade", "ID Entidade", "Usuário Responsável", "Detalhes", "Data/Hora"]
      ].concat(d.auditHistory.map(function(a) {
        return [a.id_historico, a.acao, a.tipo_entidade, a.id_entidade, a.usuario_responsavel || 'Sistema', a.detalhes || '', a.data_registro];
      })));

      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "8 abas sincronizadas com sucesso!" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Ação não reconhecida" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function updateSheet(ss, sheetName, rows) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  sheet.clear();
  if (rows && rows.length > 0) {
    var range = sheet.getRange(1, 1, rows.length, rows[0].length);
    range.setValues(rows);
    
    // Formatação do cabeçalho
    var header = sheet.getRange(1, 1, 1, rows[0].length);
    header.setBackground("#3C2D29"); // Marrom café da pastoral
    header.setFontColor("#FFFFFF");
    header.setFontWeight("bold");
    sheet.setFrozenRows(1);
    
    for (var i = 1; i <= rows[0].length; i++) {
      sheet.autoResizeColumn(i);
    }
  }
}
`;
  }

  private logSync(status: 'INFO' | 'ERROR', message: string, details?: any) {
    const id = 'log_' + crypto.randomBytes(6).toString('hex');
    db.prepare(`
      INSERT INTO sync_logs (id, status, message, details_json, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, status, message, details ? JSON.stringify(details) : null, new Date().toISOString());
  }
}

export const googleSheetsService = GoogleSheetsService.getInstance();

