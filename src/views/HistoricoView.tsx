import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { formatDateTime } from '../utils/formatters';
import { History, Shield, RefreshCw } from 'lucide-react';

export const HistoricoView: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAuditLogs();
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-xl font-bold text-pastoral-cafe flex items-center gap-2">
            <History className="w-5 h-5 text-pastoral-dourado" />
            Trilha de Auditoria e Histórico
          </h2>
          <p className="text-xs text-zinc-500">
            Registro imutável de todas as operações sensíveis, pagamentos, estornos e alterações
          </p>
        </div>

        <button
          onClick={loadLogs}
          disabled={isLoading}
          className="p-2 rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-100 transition-colors"
          title="Recarregar logs"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-pastoral-profundo text-white font-semibold">
              <tr>
                <th className="px-4 py-3">Data e Hora</th>
                <th className="px-4 py-3">Usuário</th>
                <th className="px-3 py-3">Ação</th>
                <th className="px-3 py-3">Entidade</th>
                <th className="px-4 py-3">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-zinc-400">
                    Nenhum registro de auditoria encontrado.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-50/50">
                    <td className="px-4 py-3 font-mono text-[11px] text-zinc-500">
                      {formatDateTime(log.created_at)}
                    </td>
                    <td className="px-4 py-3 font-bold text-pastoral-cafe">
                      {log.user_name || 'Sistema'}
                    </td>
                    <td className="px-3 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-pastoral-creme text-pastoral-cafe border border-pastoral-dourado/30">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-mono text-[11px] text-zinc-600">
                      {log.entity_type} ({log.entity_id ? log.entity_id.slice(-6) : '-'})
                    </td>
                    <td className="px-4 py-3 font-mono text-[10px] text-zinc-500 max-w-xs truncate">
                      {log.details_json || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

