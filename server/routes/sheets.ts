import { Router, Response } from 'express';
import { db } from '../db/database.js';
import { authenticateToken, requireRole, AuthenticatedRequest } from './auth.js';
import { googleSheetsService } from '../services/googleSheetsService.js';

export const sheetsRouter = Router();

// GET /api/sheets/status
sheetsRouter.get('/status', authenticateToken, (_req: AuthenticatedRequest, res: Response) => {
  const config = googleSheetsService.getConfig();

  const pendingCount = db.prepare(`
    SELECT COUNT(*) as count FROM sync_jobs WHERE status = 'pending'
  `).get() as any;

  const failedCount = db.prepare(`
    SELECT COUNT(*) as count FROM sync_jobs WHERE status = 'failed'
  `).get() as any;

  const logs = db.prepare(`
    SELECT * FROM sync_logs ORDER BY created_at DESC LIMIT 15
  `).all();

  const sheetUrl = config.spreadsheet_id
    ? `https://docs.google.com/spreadsheets/d/${config.spreadsheet_id}/edit`
    : '';

  return res.json({
    config: {
      enabled: config.enabled,
      mode: config.mode,
      spreadsheet_id: config.spreadsheet_id,
      spreadsheet_name: config.spreadsheet_name,
      service_account_email: config.service_account_email,
      has_private_key: Boolean(config.service_account_private_key),
      webhook_url: config.webhook_url,
      auto_sync: config.auto_sync,
      last_synced_at: config.last_synced_at,
      status: config.status,
      last_error: config.last_error,
    },
    sheetUrl,
    pendingJobsCount: pendingCount.count,
    failedJobsCount: failedCount.count,
    recentLogs: logs,
  });
});

// GET /api/sheets/preview
sheetsRouter.get('/preview', authenticateToken, (_req: AuthenticatedRequest, res: Response) => {
  const data = googleSheetsService.getCompleteSheetsData();
  return res.json(data);
});

// GET /api/sheets/apps-script-code
sheetsRouter.get('/apps-script-code', authenticateToken, (_req: AuthenticatedRequest, res: Response) => {
  const code = googleSheetsService.getAppsScriptCode();
  return res.json({ code });
});

// POST /api/sheets/config
sheetsRouter.post('/config', authenticateToken, requireRole(['admin']), (req: AuthenticatedRequest, res: Response) => {
  const {
    enabled,
    mode,
    spreadsheet_id,
    spreadsheet_name,
    service_account_email,
    service_account_private_key,
    webhook_url,
    auto_sync,
  } = req.body;

  const updated = googleSheetsService.updateConfig({
    enabled: enabled !== undefined ? Boolean(enabled) : undefined,
    mode: mode || undefined,
    spreadsheet_id: spreadsheet_id !== undefined ? spreadsheet_id.trim() : undefined,
    spreadsheet_name: spreadsheet_name !== undefined ? spreadsheet_name.trim() : undefined,
    service_account_email: service_account_email !== undefined ? service_account_email.trim() : undefined,
    service_account_private_key: service_account_private_key !== undefined ? service_account_private_key.trim() : undefined,
    webhook_url: webhook_url !== undefined ? webhook_url.trim() : undefined,
    auto_sync: auto_sync !== undefined ? Boolean(auto_sync) : undefined,
  });

  return res.json({ message: 'Configurações de integração atualizadas.', config: updated });
});

// POST /api/sheets/sync-now
sheetsRouter.post('/sync-now', authenticateToken, requireRole(['admin', 'coordenador']), async (_req: AuthenticatedRequest, res: Response) => {
  const result = await googleSheetsService.syncAllData();

  if (result.success) {
    const now = new Date().toISOString();
    db.prepare("UPDATE sync_jobs SET status = 'completed', completed_at = ? WHERE status = 'pending'").run(now);
    googleSheetsService.updateConfig({ last_synced_at: now, status: 'conectado', last_error: undefined });
    return res.json({ success: true, message: 'Todas as 8 abas foram sincronizadas com sucesso com o Google Planilhas!' });
  } else {
    googleSheetsService.updateConfig({ status: 'erro', last_error: result.error });
    return res.status(400).json({ success: false, error: result.error });
  }
});

// POST /api/sheets/test-connection
sheetsRouter.post('/test-connection', authenticateToken, requireRole(['admin']), async (req: AuthenticatedRequest, res: Response) => {
  const { mode, spreadsheet_id, service_account_email, service_account_private_key, webhook_url } = req.body;

  const tempConfig: any = {
    enabled: true,
    mode,
    spreadsheet_id,
    service_account_email,
    service_account_private_key,
    webhook_url,
  };

  const result = await googleSheetsService.syncAllData(tempConfig);
  return res.json(result);
});

