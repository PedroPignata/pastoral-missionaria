import React, { useState } from 'react';
import { Campaign } from '../types';
import { FileSpreadsheet, FileText, Download, CheckCircle2, DollarSign, Users, ShoppingBag } from 'lucide-react';

interface RelatoriosViewProps {
  activeCampaign: Campaign | null;
}

export const RelatoriosView: React.FC<RelatoriosViewProps> = ({ activeCampaign }) => {
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);

  const handleDownload = (format: 'excel' | 'csv' | 'pdf') => {
    setDownloadingFormat(format);
    const campaignParam = activeCampaign ? `?campaign_id=${activeCampaign.id}` : '';
    const url = `/api/reports/export/${format}${campaignParam}`;

    // Trigger download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `relatorio_pastoral_missionaria.${format === 'excel' ? 'xlsx' : format}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => setDownloadingFormat(null), 1500);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="font-serif text-xl font-bold text-pastoral-cafe flex items-center gap-2">
          Relatórios Oficiais e Exportações
        </h2>
        <p className="text-xs text-zinc-500">
          Gere arquivos profissionais prontos para prestação de contas à Paróquia e envio à fábrica
        </p>
      </div>

      {/* Export Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Excel XLSX */}
        <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-sm flex flex-col justify-between hover:border-emerald-400 transition-all space-y-4">
          <div className="space-y-2">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h3 className="font-serif font-bold text-base text-pastoral-cafe">Planilha Excel (.xlsx)</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Planilha multi-abas completa: <b>Pedidos</b>, <b>Resumo Fornecedor</b> e <b>Pagamentos</b>. Inclui formatação em Reais (R$), cabeçalho marrom com borda dourada, filtros automáticos e fórmulas de totalizadores.
            </p>
          </div>

          <button
            onClick={() => handleDownload('excel')}
            disabled={downloadingFormat === 'excel'}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center justify-center gap-2 transition-all"
          >
            <Download className="w-4 h-4" />
            {downloadingFormat === 'excel' ? 'Baixando...' : 'Baixar Arquivo Excel (.xlsx)'}
          </button>
        </div>

        {/* PDF Oficial */}
        <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-sm flex flex-col justify-between hover:border-pastoral-dourado transition-all space-y-4">
          <div className="space-y-2">
            <div className="w-12 h-12 rounded-xl bg-pastoral-creme text-pastoral-dourado flex items-center justify-center border border-pastoral-dourado/40">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="font-serif font-bold text-base text-pastoral-cafe">Relatório Oficial em PDF</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Documento formatado com cabeçalho da Pastoral Missionária, citação de São Padre Pio, caixas de resumo financeiro, tabela completa de membros e grade consolidada de produção para impressão.
            </p>
          </div>

          <button
            onClick={() => handleDownload('pdf')}
            disabled={downloadingFormat === 'pdf'}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-pastoral-cafe hover:bg-pastoral-profundo text-white shadow-sm flex items-center justify-center gap-2 transition-all"
          >
            <Download className="w-4 h-4" />
            {downloadingFormat === 'pdf' ? 'Gerando...' : 'Baixar Relatório em PDF'}
          </button>
        </div>

        {/* CSV UTF-8 */}
        <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-sm flex flex-col justify-between hover:border-blue-400 transition-all space-y-4">
          <div className="space-y-2">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200">
              <Download className="w-6 h-6" />
            </div>
            <h3 className="font-serif font-bold text-base text-pastoral-cafe">Arquivo CSV (UTF-8 BOM)</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Arquivo em formato delimitado por ponto e vírgula com codificação UTF-8 com BOM para abertura direta no Microsoft Excel brasileiro sem erros de acentuação gráfica.
            </p>
          </div>

          <button
            onClick={() => handleDownload('csv')}
            disabled={downloadingFormat === 'csv'}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-900 text-white shadow-sm flex items-center justify-center gap-2 transition-all"
          >
            <Download className="w-4 h-4" />
            {downloadingFormat === 'csv' ? 'Baixando...' : 'Baixar Arquivo CSV'}
          </button>
        </div>
      </div>

      {/* Information Banner */}
      <div className="p-4 bg-pastoral-creme/60 rounded-2xl border border-pastoral-dourado/30 text-xs text-zinc-700 space-y-1.5">
        <h4 className="font-serif font-bold text-pastoral-cafe flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-pastoral-dourado" />
          Fidelidade e Integridade dos Dados
        </h4>
        <p>
          Os relatórios são extraídos diretamente do banco de dados relacional e refletem em tempo real todos os pagamentos baixados e o status atual da grade de encomendas da pastoral.
        </p>
      </div>
    </div>
  );
};

