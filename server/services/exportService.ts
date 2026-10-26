import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { db } from '../db/database.js';

export class ExportService {
  // Generate Styled Multi-Tab Excel Workbook
  public static async generateExcelWorkbook(campaignId?: string): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Pastoral Missionária — Ágape';
    workbook.created = new Date();

    const headerStyle = {
      font: { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3C2D29' } } as ExcelJS.Fill, // Marrom café
      alignment: { vertical: 'middle', horizontal: 'center' } as Partial<ExcelJS.Alignment>,
      border: {
        top: { style: 'thin', color: { argb: 'FFB68B4B' } },
        bottom: { style: 'thin', color: { argb: 'FFB68B4B' } },
      } as Partial<ExcelJS.Borders>,
    };

    // 1. ABA: Pedidos
    const sheetPedidos = workbook.addWorksheet('Pedidos', { views: [{ state: 'frozen', ySplit: 1 }] });
    sheetPedidos.columns = [
      { header: 'ID Pedido', key: 'id', width: 14 },
      { header: 'Membro', key: 'membro', width: 26 },
      { header: 'Telefone', key: 'telefone', width: 16 },
      { header: 'Modelo', key: 'modelo', width: 16 },
      { header: 'Tamanho', key: 'tamanho', width: 12 },
      { header: 'Qtd', key: 'quantidade', width: 8 },
      { header: 'Unitário (R$)', key: 'unitario', width: 15, style: { numFmt: '"R$ "#,##0.00' } },
      { header: 'Total (R$)', key: 'total', width: 15, style: { numFmt: '"R$ "#,##0.00' } },
      { header: 'Pago (R$)', key: 'pago', width: 15, style: { numFmt: '"R$ "#,##0.00' } },
      { header: 'Pendente (R$)', key: 'pendente', width: 15, style: { numFmt: '"R$ "#,##0.00' } },
      { header: 'Status Pgto', key: 'status_pgto', width: 16 },
      { header: 'Status Produção', key: 'status_prod', width: 18 },
      { header: 'Status Entrega', key: 'status_ent', width: 16 },
      { header: 'Observações', key: 'obs', width: 30 },
    ];

    const ordersQuery = campaignId
      ? db.prepare(`
          SELECT o.*, m.name as membro_nome, m.phone as membro_telefone, oi.model as modelo, oi.size as tamanho, oi.quantity as quantidade, oi.unit_price_cents
          FROM orders o
          JOIN members m ON m.id = o.member_id
          LEFT JOIN order_items oi ON oi.order_id = o.id
          WHERE o.campaign_id = ? AND o.status != 'cancelado'
          ORDER BY m.name ASC
        `).all(campaignId)
      : db.prepare(`
          SELECT o.*, m.name as membro_nome, m.phone as membro_telefone, oi.model as modelo, oi.size as tamanho, oi.quantity as quantidade, oi.unit_price_cents
          FROM orders o
          JOIN members m ON m.id = o.member_id
          LEFT JOIN order_items oi ON oi.order_id = o.id
          WHERE o.status != 'cancelado'
          ORDER BY m.name ASC
        `).all();

    sheetPedidos.getRow(1).eachCell(cell => {
      cell.fill = headerStyle.fill;
      cell.font = headerStyle.font;
      cell.alignment = headerStyle.alignment;
      cell.border = headerStyle.border;
    });

    let rowIdx = 2;
    for (const ord of ordersQuery as any[]) {
      sheetPedidos.addRow({
        id: ord.id,
        membro: ord.membro_nome,
        telefone: ord.membro_telefone || '-',
        modelo: ord.modelo || 'Tradicional',
        tamanho: ord.tamanho || 'M',
        quantidade: ord.quantidade || 1,
        unitario: (ord.unit_price_cents || 4500) / 100,
        total: ord.total_amount_cents / 100,
        pago: ord.paid_amount_cents / 100,
        pendente: ord.balance_cents / 100,
        status_pgto: ord.payment_status.toUpperCase(),
        status_prod: ord.production_status.replace('_', ' ').toUpperCase(),
        status_ent: ord.delivery_status === 'entregue' ? 'ENTREGUE' : 'NÃO ENTREGUE',
        obs: ord.notes || '',
      });
      rowIdx++;
    }

    // Linha de totalizadores
    const totalRow = sheetPedidos.addRow({
      membro: 'TOTAL GERAL',
      quantidade: { formula: `SUM(F2:F${rowIdx - 1})` },
      total: { formula: `SUM(H2:H${rowIdx - 1})` },
      pago: { formula: `SUM(I2:I${rowIdx - 1})` },
      pendente: { formula: `SUM(J2:J${rowIdx - 1})` },
    });
    totalRow.font = { bold: true, color: { argb: 'FF8E303B' } };

    // 2. ABA: Resumo Fornecedor
    const sheetFornecedor = workbook.addWorksheet('Resumo Fornecedor', { views: [{ state: 'frozen', ySplit: 1 }] });
    sheetFornecedor.columns = [
      { header: 'Modelo', key: 'modelo', width: 20 },
      { header: 'Tamanho', key: 'tamanho', width: 14 },
      { header: 'Quantidade', key: 'quantidade', width: 16 },
      { header: 'Subtotal (R$)', key: 'total', width: 18, style: { numFmt: '"R$ "#,##0.00' } },
    ];
    sheetFornecedor.getRow(1).eachCell(cell => {
      cell.fill = headerStyle.fill;
      cell.font = headerStyle.font;
      cell.alignment = headerStyle.alignment;
      cell.border = headerStyle.border;
    });

    const sizes = db.prepare(`
      SELECT oi.model, oi.size, SUM(oi.quantity) as qtd, SUM(oi.total_price_cents) as total_cents
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE o.status != 'cancelado'
      GROUP BY oi.model, oi.size
      ORDER BY oi.model, oi.size
    `).all() as any[];

    let fornIdx = 2;
    for (const s of sizes) {
      sheetFornecedor.addRow({
        modelo: s.model,
        tamanho: s.size,
        quantidade: s.qtd,
        total: s.total_cents / 100,
      });
      fornIdx++;
    }

    const fornTotal = sheetFornecedor.addRow({
      modelo: 'TOTAL CONSOLIDADO',
      quantidade: { formula: `SUM(C2:C${fornIdx - 1})` },
      total: { formula: `SUM(D2:D${fornIdx - 1})` },
    });
    fornTotal.font = { bold: true, color: { argb: 'FFB68B4B' } };

    // 3. ABA: Pagamentos
    const sheetPagamentos = workbook.addWorksheet('Pagamentos', { views: [{ state: 'frozen', ySplit: 1 }] });
    sheetPagamentos.columns = [
      { header: 'ID Pagamento', key: 'id', width: 16 },
      { header: 'Membro', key: 'membro', width: 26 },
      { header: 'Valor (R$)', key: 'valor', width: 16, style: { numFmt: '"R$ "#,##0.00' } },
      { header: 'Data', key: 'data', width: 14 },
      { header: 'Forma', key: 'forma', width: 16 },
      { header: 'Registrado Por', key: 'resp', width: 22 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Observações', key: 'obs', width: 30 },
    ];
    sheetPagamentos.getRow(1).eachCell(cell => {
      cell.fill = headerStyle.fill;
      cell.font = headerStyle.font;
      cell.alignment = headerStyle.alignment;
      cell.border = headerStyle.border;
    });

    const payments = db.prepare(`
      SELECT p.*, m.name as membro_nome
      FROM payments p
      JOIN members m ON m.id = p.member_id
      ORDER BY p.payment_date DESC
    `).all() as any[];

    for (const p of payments) {
      sheetPagamentos.addRow({
        id: p.id,
        membro: p.membro_nome,
        valor: p.amount_cents / 100,
        data: p.payment_date,
        forma: p.payment_method.toUpperCase(),
        resp: p.recorded_by,
        status: p.is_reversed ? 'ESTORNADO' : 'CONFIRMADO',
        obs: p.notes || '',
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  // Generate CSV Format with UTF-8 BOM
  public static generateCSV(campaignId?: string): string {
    const orders = db.prepare(`
      SELECT
        o.id, m.name as membro, m.phone as telefone, oi.model as modelo, oi.size as tamanho,
        oi.quantity as qtd, oi.unit_price_cents, o.total_amount_cents, o.paid_amount_cents,
        o.balance_cents, o.payment_status, o.production_status, o.delivery_status, o.created_at
      FROM orders o
      JOIN members m ON m.id = o.member_id
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.status != 'cancelado'
      ORDER BY m.name ASC
    `).all() as any[];

    const headers = [
      'ID Pedido', 'Membro', 'Telefone', 'Modelo', 'Tamanho', 'Quantidade',
      'Preço Unitário (R$)', 'Total (R$)', 'Valor Pago (R$)', 'Saldo Pendente (R$)',
      'Status Pagamento', 'Status Produção', 'Status Entrega', 'Data Cadastro'
    ];

    const lines = [headers.join(';')];

    for (const o of orders) {
      lines.push([
        o.id,
        `"${o.membro.replace(/"/g, '""')}"`,
        `"${(o.telefone || '').replace(/"/g, '""')}"`,
        o.modelo,
        o.tamanho,
        o.qtd,
        (o.unit_price_cents / 100).toFixed(2).replace('.', ','),
        (o.total_amount_cents / 100).toFixed(2).replace('.', ','),
        (o.paid_amount_cents / 100).toFixed(2).replace('.', ','),
        (o.balance_cents / 100).toFixed(2).replace('.', ','),
        o.payment_status,
        o.production_status,
        o.delivery_status,
        o.created_at
      ].join(';'));
    }

    // UTF-8 BOM \uFEFF ensures proper accents in Excel
    return '\uFEFF' + lines.join('\r\n');
  }

  // Generate Professional Pastoral PDF
  public static generatePDF(campaignId?: string): Buffer {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const stats = db.prepare(`
      SELECT
        COUNT(DISTINCT o.id) as total_pedidos,
        COUNT(DISTINCT o.member_id) as total_membros,
        SUM(oi.quantity) as total_camisetas,
        SUM(o.total_amount_cents) as total_amount_cents,
        SUM(o.paid_amount_cents) as paid_amount_cents,
        SUM(o.balance_cents) as balance_cents
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      WHERE o.status != 'cancelado'
    `).get() as any;

    // Header Background
    doc.setFillColor(60, 45, 41); // #3C2D29 Marrom café
    doc.rect(0, 0, 210, 36, 'F');

    // Header Gold Line
    doc.setFillColor(182, 139, 75); // #B68B4B Dourado
    doc.rect(0, 36, 210, 2, 'F');

    // Title text
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('PASTORAL MISSIONÁRIA', 14, 14);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(216, 155, 162); // Rosa antigo
    doc.text('Ágape Apostolado de Jovens • Paróquia São Vicente de Paulo • Planaltina-DF', 14, 21);

    doc.setTextColor(243, 232, 216); // Creme
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text('"Uma só coisa é necessária: Estar perto de Jesus." — São Padre Pio', 14, 28);

    // Document Meta
    doc.setTextColor(41, 38, 37); // Grafite
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Relatório Oficial de Pedidos e Arrecadação', 14, 46);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    const dateStr = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    doc.text(`Gerado em: ${dateStr} • Campanha: Camisetas Pastoral Missionária — 2026`, 14, 52);

    // Summary Cards Box
    doc.setFillColor(250, 243, 233); // Creme
    doc.roundedRect(14, 56, 182, 22, 2, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(60, 45, 41);
    doc.text(`Total Camisetas: ${stats.total_camisetas || 0}`, 20, 64);
    doc.text(`Total Previsto: R$ ${((stats.total_amount_cents || 0) / 100).toFixed(2)}`, 75, 64);
    doc.text(`Total Arrecadado: R$ ${((stats.paid_amount_cents || 0) / 100).toFixed(2)}`, 135, 64);

    doc.setTextColor(185, 28, 28); // Vermelho
    doc.text(`Saldo Pendente: R$ ${((stats.balance_cents || 0) / 100).toFixed(2)}`, 20, 72);
    doc.setTextColor(21, 128, 61); // Verde
    const percent = stats.total_amount_cents ? Math.round((stats.paid_amount_cents * 100) / stats.total_amount_cents) : 0;
    doc.text(`Quitado: ${percent}%`, 75, 72);

    // Orders Table
    const orders = db.prepare(`
      SELECT m.name as membro, oi.model as modelo, oi.size as tamanho, oi.quantity as qtd,
             o.total_amount_cents, o.paid_amount_cents, o.balance_cents, o.payment_status, o.delivery_status
      FROM orders o
      JOIN members m ON m.id = o.member_id
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.status != 'cancelado'
      ORDER BY m.name ASC
    `).all() as any[];

    const tableRows = orders.map(o => [
      o.membro,
      o.modelo,
      o.tamanho,
      o.qtd.toString(),
      `R$ ${(o.total_amount_cents / 100).toFixed(2)}`,
      `R$ ${(o.paid_amount_cents / 100).toFixed(2)}`,
      `R$ ${(o.balance_cents / 100).toFixed(2)}`,
      o.payment_status.toUpperCase(),
      o.delivery_status === 'entregue' ? 'Sim' : 'Não'
    ]);

    autoTable(doc, {
      startY: 82,
      head: [['Membro', 'Modelo', 'Tam.', 'Qtd', 'Total', 'Pago', 'Pendente', 'Status Pgto', 'Entregue']],
      body: tableRows,
      theme: 'grid',
      headStyles: {
        fillColor: [60, 45, 41],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      styles: {
        fontSize: 8,
        cellPadding: 2,
        textColor: [41, 38, 37],
      },
      alternateRowStyles: {
        fillColor: [250, 243, 233],
      },
    });

    // Supplier Summary Section
    const finalY = (doc as any).lastAutoTable.finalY + 8;
    if (finalY < 240) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(60, 45, 41);
      doc.text('Resumo para Produção (Grade de Tamanhos):', 14, finalY);

      const sizes = db.prepare(`
        SELECT oi.model, oi.size, SUM(oi.quantity) as qtd
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE o.status != 'cancelado'
        GROUP BY oi.model, oi.size
        ORDER BY oi.model, oi.size
      `).all() as any[];

      const sizeRows = sizes.map(s => [s.model, s.size, `${s.qtd} unidades`]);

      autoTable(doc, {
        startY: finalY + 3,
        head: [['Modelo', 'Tamanho', 'Quantidade']],
        body: sizeRows,
        theme: 'plain',
        headStyles: { fillColor: [182, 139, 75], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        styles: { fontSize: 8, cellPadding: 1.5 },
      });
    }

    // Footer with Page Numbers
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Pastoral Missionária — Paróquia São Vicente de Paulo • Página ${i} de ${pageCount}`,
        105,
        290,
        { align: 'center' }
      );
    }

    return Buffer.from(doc.output('arraybuffer'));
  }
}

