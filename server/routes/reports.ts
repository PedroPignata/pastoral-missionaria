import { Router, Response } from 'express';
import { db } from '../db/database.js';
import { authenticateToken, requireRole, AuthenticatedRequest } from './auth.js';
import { ExportService } from '../services/exportService.js';

export const reportsRouter = Router();

// GET /api/reports/supplier (Consolidated report for manufacturer)
reportsRouter.get('/supplier', authenticateToken, requireRole(['admin', 'coordenador']), (req: AuthenticatedRequest, res: Response) => {
  const { campaign_id, only_confirmed } = req.query;

  let query = `
    SELECT
      oi.model,
      oi.size,
      SUM(oi.quantity) as quantity,
      SUM(oi.total_price_cents) as total_price_cents
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.status != 'cancelado'
  `;
  const params: any[] = [];

  if (campaign_id) {
    query += ' AND o.campaign_id = ?';
    params.push(campaign_id);
  }

  if (only_confirmed === 'true') {
    query += " AND o.production_status != 'aguardando_confirmacao'";
  }

  query += `
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
  `;

  const rows = db.prepare(query).all(...params) as any[];

  // Group by model
  const grouped: Record<string, { sizes: { size: string; quantity: number }[]; total: number }> = {};
  let grandTotal = 0;

  for (const r of rows) {
    if (!grouped[r.model]) {
      grouped[r.model] = { sizes: [], total: 0 };
    }
    grouped[r.model].sizes.push({ size: r.size, quantity: r.quantity });
    grouped[r.model].total += r.quantity;
    grandTotal += r.quantity;
  }

  // Pre-generate WhatsApp formatted clipboard text
  let formattedText = `*PASTORAL MISSIONÁRIA — PEDIDO OFICIAL DE CAMISETAS*\n`;
  formattedText += `Paróquia São Vicente de Paulo • Planaltina-DF\n\n`;

  for (const [model, info] of Object.entries(grouped)) {
    formattedText += `*${model.toUpperCase()}* (${info.total} un):\n`;
    for (const s of info.sizes) {
      formattedText += `• Tam ${s.size}: ${s.quantity} unidades\n`;
    }
    formattedText += `\n`;
  }
  formattedText += `*TOTAL GERAL: ${grandTotal} CAMISETAS*`;

  return res.json({
    grouped,
    grandTotal,
    formattedText,
  });
});

// GET /api/reports/export/excel
reportsRouter.get('/export/excel', authenticateToken, requireRole(['admin', 'coordenador']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const campaignId = req.query.campaign_id as string | undefined;
    const buffer = await ExportService.generateExcelWorkbook(campaignId);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Pastoral_Missionaria_Camisetas_2026.xlsx"');
    return res.send(buffer);
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao gerar planilha Excel: ' + err.message });
  }
});

// GET /api/reports/export/csv
reportsRouter.get('/export/csv', authenticateToken, requireRole(['admin', 'coordenador']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const campaignId = req.query.campaign_id as string | undefined;
    const csvContent = ExportService.generateCSV(campaignId);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="Pastoral_Missionaria_Camisetas_2026.csv"');
    return res.send(csvContent);
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao gerar CSV: ' + err.message });
  }
});

// GET /api/reports/export/pdf
reportsRouter.get('/export/pdf', authenticateToken, requireRole(['admin', 'coordenador']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const campaignId = req.query.campaign_id as string | undefined;
    const pdfBuffer = ExportService.generatePDF(campaignId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="Pastoral_Missionaria_Relatorio_Oficial.pdf"');
    return res.send(pdfBuffer);
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao gerar PDF: ' + err.message });
  }
});

