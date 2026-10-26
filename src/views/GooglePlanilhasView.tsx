import React, { useState, useEffect } from 'react';
import { GoogleSheetsConfig, SyncLog } from '../types';
import { api } from '../services/api';
import {
  FileSpreadsheet,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Code2,
  Copy,
  Check,
  Save,
  Radio,
  Clock,
  Layers,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const GooglePlanilhasView: React.FC = () => {
  const { isAdmin } = useAuth();

  const [config, setConfig] = useState<GoogleSheetsConfig | null>(null);
  const [sheetUrl, setSheetUrl] = useState('');
  const [pendingJobsCount, setPendingJobsCount] = useState(0);
  const [recentLogs, setRecentLogs] = useState<SyncLog[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [appsScriptCode, setAppsScriptCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  // Settings form state
  const [mode, setMode] = useState<'webhook' | 'service_account' | 'offline'>('webhook');
  const [enabled, setEnabled] = useState(true);
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [spreadsheetName, setSpreadsheetName] = useState('Camisetas Pastoral Missionária 2026');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [serviceAccountEmail, setServiceAccountEmail] = useState('');
  const [serviceAccountPrivateKey, setServiceAccountPrivateKey] = useState('');
  const [autoSync, setAutoSync] = useState(true);

  // Preview data for 8 tabs
  const [previewData, setPreviewData] = useState<any>(null);
  const [selectedPreviewTab, setSelectedPreviewTab] = useState('Pedidos');
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const loadStatus = async () => {
    try {
      const res = await api.getSheetsStatus();
      setConfig(res.config);
      setSheetUrl(res.sheetUrl);
      setPendingJobsCount(res.pendingJobsCount);
      setRecentLogs(res.recentLogs);

      setEnabled(res.config.enabled);
      setMode(res.config.mode);
      setSpreadsheetId(res.config.spreadsheet_id || '');
      setSpreadsheetName(res.config.spreadsheet_name || 'Camisetas Pastoral Missionária 2026');
      setWebhookUrl(res.config.webhook_url || '');
      setServiceAccountEmail(res.config.service_account_email || '');
      setAutoSync(res.config.auto_sync);
    } catch (err: any) {
      console.error(err);
    }
  };

  const loadPreview = async () => {
    try {
      const data = await api.getSheetsPreview();
      setPreviewData(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadScriptCode = async () => {
    try {
      const res = await api.getAppsScriptCode();
      setAppsScriptCode(res.code);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadStatus();
    loadPreview();
    loadScriptCode();
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    setStatusMessage('');
    try {
      const res = await api.syncSheetsNow();
      setStatusMessage('✓ ' + res.message);
      loadStatus();
      loadPreview();
    } catch (err: any) {
      setStatusMessage('✗ Erro na sincronização: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage('');
    try {
      await api.updateSheetsConfig({
        enabled,
        mode,
        spreadsheet_id: spreadsheetId,
        spreadsheet_name: spreadsheetName,
        webhook_url: webhookUrl,
        service_account_email: serviceAccountEmail,
        service_account_private_key: serviceAccountPrivateKey || undefined,
        auto_sync: autoSync,
      });
      setStatusMessage('✓ Configurações salvas com sucesso!');
      loadStatus();
    } catch (err: any) {
      setStatusMessage('✗ Erro ao salvar: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const isConnected = config?.status === 'conectado';

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl font-bold text-pastoral-cafe flex items-center gap-2">
            Integração com Google Planilhas
          </h2>
          <p className="text-xs text-zinc-500">
            Sincronização automática e contínua de pedidos, pagamentos e estoque nas 8 abas oficiais
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-pastoral-dourado hover:brightness-105 text-pastoral-profundo shadow-gold flex items-center gap-1.5 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Sincronizando...' : 'Sincronizar Tudo Agora'}
          </button>

          {sheetUrl && (
            <a
              href={sheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm"
            >
              <ExternalLink className="w-4 h-4" /> Abrir no Google Sheets
            </a>
          )}
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-3 rounded-xl text-xs font-medium border ${
            statusMessage.startsWith('✓')
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-rose-50 border-rose-300 text-rose-800'
          }`}
        >
          {statusMessage}
        </div>
      )}

      {/* Connection Status Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Status */}
        <div className="p-4 bg-white rounded-2xl border border-zinc-200/80 shadow-sm">
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Status da Conexão</p>
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${
                isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className="font-serif font-bold text-base text-pastoral-cafe capitalize">
              {config?.status || 'Aguardando'}
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">
            Modo: {config?.mode === 'webhook' ? 'Google Apps Script Webhook' : config?.mode === 'service_account' ? 'Google Cloud Service Account' : 'Simulação'}
          </p>
        </div>

        {/* Fila Outbox */}
        <div className="p-4 bg-white rounded-2xl border border-zinc-200/80 shadow-sm">
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Fila de Alterações</p>
          <p className="font-serif font-bold text-2xl text-pastoral-cafe">{pendingJobsCount}</p>
          <p className="text-[11px] text-zinc-400 mt-1">
            {pendingJobsCount === 0 ? 'Fila vazia (100% sincronizado)' : 'Alterações pendentes de envio'}
          </p>
        </div>

        {/* Última Sincronização */}
        <div className="p-4 bg-white rounded-2xl border border-zinc-200/80 shadow-sm">
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Última Atualização</p>
          <p className="font-serif font-bold text-sm text-pastoral-cafe">
            {config?.last_synced_at ? new Date(config.last_synced_at).toLocaleString('pt-BR') : 'Ainda não sincronizado'}
          </p>
          <p className="text-[11px] text-zinc-400 mt-1">Horário de Brasília</p>
        </div>

        {/* Abas Criadas */}
        <div className="p-4 bg-white rounded-2xl border border-zinc-200/80 shadow-sm">
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Estrutura</p>
          <p className="font-serif font-bold text-2xl text-pastoral-dourado">8 Abas</p>
          <p className="text-[11px] text-zinc-400 mt-1">Pedidos, Membros, Pagamentos...</p>
        </div>
      </div>

      {/* Configuration Settings Form */}
      {isAdmin && (
        <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-sm space-y-4">
          <div className="border-b border-zinc-200 pb-3 flex items-center justify-between">
            <div>
              <h3 className="font-serif font-bold text-base text-pastoral-cafe">
                Configurações da Planilha Conectada
              </h3>
              <p className="text-xs text-zinc-500">
                Escolha o método de conexão mais conveniente para sua equipe paroquial
              </p>
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-pastoral-cafe">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="rounded text-pastoral-dourado focus:ring-pastoral-dourado w-4 h-4"
              />
              Sincronização Ativa
            </label>
          </div>

          <form onSubmit={handleSaveConfig} className="space-y-4">
            {/* Connection Mode Radios */}
            <div>
              <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider mb-2">
                Método de Integração
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                    mode === 'webhook'
                      ? 'bg-pastoral-creme/60 border-pastoral-dourado shadow-xs'
                      : 'border-zinc-200 hover:bg-zinc-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="mode"
                    value="webhook"
                    checked={mode === 'webhook'}
                    onChange={() => setMode('webhook')}
                    className="mt-0.5 text-pastoral-dourado focus:ring-pastoral-dourado"
                  />
                  <div>
                    <p className="text-xs font-bold text-pastoral-cafe">
                      Modo Webhook (Google Apps Script) — Recomendado ★
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      Fácil e rápido. Não precisa de conta no Google Cloud Platform nem permissões complexas. Basta colar o código Apps Script na planilha!
                    </p>
                  </div>
                </label>

                <label
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                    mode === 'service_account'
                      ? 'bg-pastoral-creme/60 border-pastoral-dourado shadow-xs'
                      : 'border-zinc-200 hover:bg-zinc-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="mode"
                    value="service_account"
                    checked={mode === 'service_account'}
                    onChange={() => setMode('service_account')}
                    className="mt-0.5 text-pastoral-dourado focus:ring-pastoral-dourado"
                  />
                  <div>
                    <p className="text-xs font-bold text-pastoral-cafe">
                      Modo Google Cloud Service Account (API Oficial)
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      Conexão corporativa via chave JSON de Conta de Serviço Google Cloud com escopo de spreadsheets.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Mode-specific Fields */}
            {mode === 'webhook' && (
              <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider mb-1">
                    URL do App da Web do Google Apps Script *
                  </label>
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/AKfycbx.../exec"
                    className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-xl bg-white font-mono"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Cole aqui o URL gerado na implantação do Apps Script na sua planilha.
                  </p>
                </div>
              </div>
            )}

            {mode === 'service_account' && (
              <div className="p-4 bg-zinc-50 rounded-xl border border-zinc-200 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider mb-1">
                    ID da Planilha Google (Spreadsheet ID) *
                  </label>
                  <input
                    type="text"
                    value={spreadsheetId}
                    onChange={(e) => setSpreadsheetId(e.target.value)}
                    placeholder="Ex.: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                    className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-xl bg-white font-mono"
                  />
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Encontrado no URL da planilha entre "/d/" e "/edit".
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider mb-1">
                    E-mail da Conta de Serviço (Service Account Email) *
                  </label>
                  <input
                    type="email"
                    value={serviceAccountEmail}
                    onChange={(e) => setServiceAccountEmail(e.target.value)}
                    placeholder="pastoral-sync@seu-projeto.iam.gserviceaccount.com"
                    className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-xl bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider mb-1">
                    Chave Privada (Private Key)
                  </label>
                  <textarea
                    value={serviceAccountPrivateKey}
                    onChange={(e) => setServiceAccountPrivateKey(e.target.value)}
                    placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;...&#10;-----END RSA PRIVATE KEY-----"
                    rows={3}
                    className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-xl bg-white font-mono text-[11px]"
                  />
                </div>
              </div>
            )}

            {/* Auto sync checkbox & Save button */}
            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-700">
                <input
                  type="checkbox"
                  checked={autoSync}
                  onChange={(e) => setAutoSync(e.target.checked)}
                  className="rounded text-pastoral-dourado focus:ring-pastoral-dourado w-4 h-4"
                />
                Enviar automaticamente a cada novo pedido ou pagamento registrado
              </label>

              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-pastoral-cafe hover:bg-pastoral-profundo text-white shadow-sm flex items-center gap-1.5 transition-all"
              >
                <Save className="w-4 h-4 text-pastoral-dourado" />
                {isSaving ? 'Salvando...' : 'Salvar Configurações'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Copyable 1-Click Google Apps Script Code */}
      <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif font-bold text-sm text-pastoral-cafe flex items-center gap-2">
              <Code2 className="w-4 h-4 text-pastoral-dourado" />
              Código Pronto do Google Apps Script
            </h3>
            <p className="text-xs text-zinc-500">
              Passo a passo: 1) Abra sua planilha • 2) Menu Extensões &gt; Apps Script • 3) Cole este código • 4) Clique em Implantar como App da Web
            </p>
          </div>

          <button
            onClick={handleCopyCode}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-pastoral-creme text-pastoral-cafe border border-pastoral-dourado/30 hover:bg-pastoral-creme-escuro flex items-center gap-1.5 transition-colors"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedCode ? 'Código Copiado!' : 'Copiar Código'}
          </button>
        </div>

        <pre className="p-3 bg-pastoral-profundo text-zinc-200 text-[11px] rounded-xl font-mono overflow-x-auto max-h-48 border border-pastoral-dourado/30">
          {appsScriptCode}
        </pre>
      </div>

      {/* 8 Tabs Live Data Preview */}
      {previewData && (
        <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden space-y-4 p-5">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div>
              <h3 className="font-serif font-bold text-base text-pastoral-cafe flex items-center gap-2">
                <Layers className="w-4 h-4 text-pastoral-dourado" />
                Visualização em Tempo Real das 8 Abas da Planilha
              </h3>
              <p className="text-xs text-zinc-400">
                Estrutura exata sincronizada no Google Planilhas
              </p>
            </div>
          </div>

          {/* Tab selector pills */}
          <div className="flex flex-wrap gap-1.5 border-b border-zinc-200 pb-2">
            {[
              'Pedidos',
              'Membros',
              'Pagamentos',
              'Financeiro',
              'Tamanhos e modelos',
              'Produção e entregas',
              'Campanhas',
              'Histórico',
            ].map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedPreviewTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  selectedPreviewTab === tab
                    ? 'bg-pastoral-cafe text-white shadow-xs'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Active Tab Table Preview */}
          <div className="overflow-x-auto max-h-80 border border-zinc-200 rounded-xl">
            {selectedPreviewTab === 'Pedidos' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-pastoral-cafe text-white font-semibold sticky top-0">
                  <tr>
                    <th className="px-3 py-2">ID</th>
                    <th className="px-3 py-2">Membro</th>
                    <th className="px-2 py-2">Modelo</th>
                    <th className="px-2 py-2 text-center">Tam</th>
                    <th className="px-2 py-2 text-center">Qtd</th>
                    <th className="px-3 py-2 text-right">Total</th>
                    <th className="px-3 py-2 text-right">Pago</th>
                    <th className="px-3 py-2 text-right">Pendente</th>
                    <th className="px-2 py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {previewData.orders.map((o: any) => (
                    <tr key={o.id_pedido} className="hover:bg-zinc-50">
                      <td className="px-3 py-2 font-mono text-[10px] text-zinc-400">{o.id_pedido.slice(-6)}</td>
                      <td className="px-3 py-2 font-bold text-pastoral-cafe">{o.membro_nome}</td>
                      <td className="px-2 py-2">{o.modelo}</td>
                      <td className="px-2 py-2 text-center font-bold text-pastoral-dourado">{o.tamanho}</td>
                      <td className="px-2 py-2 text-center">{o.quantidade}</td>
                      <td className="px-3 py-2 text-right font-bold">R$ {o.valor_total_reais.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right text-emerald-700">R$ {o.valor_pago_reais.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-bold text-rose-600">R$ {o.saldo_pendente_reais.toFixed(2)}</td>
                      <td className="px-2 py-2 text-center capitalize">{o.status_pagamento}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {selectedPreviewTab === 'Tamanhos e modelos' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-pastoral-cafe text-white font-semibold sticky top-0">
                  <tr>
                    <th className="px-4 py-2">Modelo</th>
                    <th className="px-4 py-2 text-center">Tamanho</th>
                    <th className="px-4 py-2 text-center">Quantidade</th>
                    <th className="px-4 py-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {previewData.sizeModelSummary.map((s: any, idx: number) => (
                    <tr key={idx} className="hover:bg-zinc-50">
                      <td className="px-4 py-2 font-bold text-pastoral-cafe">{s.modelo}</td>
                      <td className="px-4 py-2 text-center font-bold text-pastoral-dourado">{s.tamanho}</td>
                      <td className="px-4 py-2 text-center font-bold">{s.quantidade} unidades</td>
                      <td className="px-4 py-2 text-right font-bold">R$ {s.total_reais.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {selectedPreviewTab === 'Financeiro' && (
              <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 bg-pastoral-creme/30 text-xs">
                <div className="p-3 bg-white rounded-xl border border-zinc-200">
                  <p className="text-zinc-500 font-semibold">Total Previsto</p>
                  <p className="font-serif font-bold text-base text-pastoral-cafe">
                    R$ {previewData.financialSummary.total_previsto_reais.toFixed(2)}
                  </p>
                </div>
                <div className="p-3 bg-white rounded-xl border border-zinc-200">
                  <p className="text-zinc-500 font-semibold">Total Arrecadado</p>
                  <p className="font-serif font-bold text-base text-emerald-700">
                    R$ {previewData.financialSummary.total_arrecadado_reais.toFixed(2)}
                  </p>
                </div>
                <div className="p-3 bg-white rounded-xl border border-zinc-200">
                  <p className="text-zinc-500 font-semibold">Saldo Pendente</p>
                  <p className="font-serif font-bold text-base text-rose-600">
                    R$ {previewData.financialSummary.total_pendente_reais.toFixed(2)}
                  </p>
                </div>
                <div className="p-3 bg-white rounded-xl border border-zinc-200">
                  <p className="text-zinc-500 font-semibold">Quitados</p>
                  <p className="font-serif font-bold text-base text-pastoral-cafe">
                    {previewData.financialSummary.pedidos_quitados} pedidos
                  </p>
                </div>
              </div>
            )}

            {selectedPreviewTab === 'Membros' && (
              <table className="w-full text-left text-xs">
                <thead className="bg-pastoral-cafe text-white font-semibold sticky top-0">
                  <tr>
                    <th className="px-4 py-2">Nome Completo</th>
                    <th className="px-4 py-2">Telefone</th>
                    <th className="px-4 py-2 text-center">Total Pedidos</th>
                    <th className="px-4 py-2 text-right">Total Investido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {previewData.members.map((m: any) => (
                    <tr key={m.id_membro} className="hover:bg-zinc-50">
                      <td className="px-4 py-2 font-bold text-pastoral-cafe">{m.nome_completo}</td>
                      <td className="px-4 py-2">{m.telefone || '-'}</td>
                      <td className="px-4 py-2 text-center">{m.total_pedidos}</td>
                      <td className="px-4 py-2 text-right font-bold">R$ {m.total_gasto_reais.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {['Pagamentos', 'Produção e entregas', 'Campanhas', 'Histórico'].includes(selectedPreviewTab) && (
              <div className="p-6 text-center text-xs text-zinc-500">
                Aba <b>{selectedPreviewTab}</b> configurada e pronta para transmissão ao vivo.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

