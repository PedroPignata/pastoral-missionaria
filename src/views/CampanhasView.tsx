import React, { useState } from 'react';
import { Campaign } from '../types';
import { formatCurrency } from '../utils/formatters';
import { api } from '../services/api';
import { Plus, CheckCircle2, Edit3, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/common/Modal';

interface CampanhasViewProps {
  campaigns: Campaign[];
  activeCampaign: Campaign | null;
  onRefresh: () => void;
}

function parsePriceToCents(priceStr: string): number {
  const normalized = parseFloat(String(priceStr || '').replace(/\./g, '').replace(',', '.'));
  if (isNaN(normalized) || normalized <= 0) return 0;
  return Math.round(normalized * 100);
}

export const CampanhasView: React.FC<CampanhasViewProps> = ({
  campaigns,
  activeCampaign,
  onRefresh,
}) => {
  const { isAdmin, canEdit } = useAuth();
  const canManageCampaign = isAdmin || canEdit;

  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priceStr, setPriceStr] = useState('45,00');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Edit Campaign modal state (Section 9)
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriceStr, setEditPriceStr] = useState('45,00');
  const [editStatus, setEditStatus] = useState<'aberta' | 'em_producao' | 'encerrada'>('aberta');
  const [editStartDate, setEditStartDate] = useState('');
  const [editEndDate, setEditEndDate] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  const handleActivate = async (id: string) => {
    try {
      await api.activateCampaign(id);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleOpenEdit = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setEditName(campaign.name || '');
    setEditDescription(campaign.description || '');
    setEditPriceStr(((campaign.default_price_cents || 4500) / 100).toFixed(2).replace('.', ','));
    setEditStatus((campaign.status as any) || 'aberta');
    setEditStartDate(campaign.start_date || '');
    setEditEndDate(campaign.end_date || '');
    setEditError('');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!name.trim()) {
      setFormError('Informe o nome da campanha.');
      return;
    }

    const priceCents = parsePriceToCents(priceStr);
    if (priceCents <= 0) {
      setFormError('Informe um preço padrão válido maior que zero (ex: 45,00 ou 50,00).');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createCampaign({
        name: name.trim(),
        description: description.trim(),
        default_price_cents: priceCents,
        start_date: startDate || null,
        end_date: endDate || null,
      });
      setIsNewModalOpen(false);
      setName('');
      setDescription('');
      setPriceStr('45,00');
      setStartDate('');
      setEndDate('');
      onRefresh();
    } catch (err: any) {
      setFormError(err.message || 'Erro ao criar campanha.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCampaign) return;
    setEditError('');

    if (!editName.trim()) {
      setEditError('Informe o nome da campanha.');
      return;
    }

    const priceCents = parsePriceToCents(editPriceStr);
    if (priceCents <= 0) {
      setEditError('Informe um preço padrão válido maior que zero (ex: 45,00 ou 50,00).');
      return;
    }

    setIsSavingEdit(true);
    try {
      await api.updateCampaign(editingCampaign.id, {
        name: editName.trim(),
        description: editDescription.trim(),
        default_price_cents: priceCents,
        status: editStatus,
        start_date: editStartDate || null,
        end_date: editEndDate || null,
      });
      setEditingCampaign(null);
      onRefresh();
    } catch (err: any) {
      setEditError(err.message || 'Erro ao atualizar campanha.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl font-bold text-pastoral-cafe flex items-center gap-2">
            Campanhas / Lotes de Camisetas
          </h2>
          <p className="text-xs text-zinc-500">
            Configure lotes, períodos e o preço padrão para novos pedidos preservando os registros anteriores
          </p>
        </div>

        {canManageCampaign && (
          <button
            onClick={() => {
              setFormError('');
              setIsNewModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-pastoral-dourado hover:brightness-105 text-pastoral-profundo shadow-gold flex items-center gap-1.5 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" /> Nova Campanha
          </button>
        )}
      </div>

      {/* Campaigns List */}
      <div className="space-y-4">
        {campaigns.map((c) => {
          const isActive = activeCampaign?.id === c.id;
          return (
            <div
              key={c.id}
              className={`p-5 bg-white rounded-2xl border transition-all ${
                isActive
                  ? 'border-pastoral-dourado shadow-pastoral bg-gradient-to-r from-pastoral-creme/30 via-white to-white'
                  : 'border-zinc-200/80 shadow-xs'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-serif font-bold text-base text-pastoral-cafe">{c.name}</h3>
                    {isActive ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Campanha Ativa
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[11px] bg-zinc-100 text-zinc-600 capitalize">
                        {c.status}
                      </span>
                    )}
                  </div>
                  {c.description && <p className="text-xs text-zinc-500">{c.description}</p>}
                  {(c.start_date || c.end_date) && (
                    <p className="text-[11px] text-zinc-400">
                      Período: {c.start_date || 'Início'} até {c.end_date || 'Em aberto'}
                    </p>
                  )}
                </div>

                {/* Metrics & Actions */}
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-200 text-center">
                    <p className="text-[10px] text-zinc-500">Preço Padrão</p>
                    <p className="font-bold text-pastoral-cafe">{formatCurrency(c.default_price_cents)}</p>
                  </div>

                  <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-200 text-center">
                    <p className="text-[10px] text-zinc-500">Pedidos</p>
                    <p className="font-bold text-pastoral-cafe">{c.orders_count || 0}</p>
                  </div>

                  <div className="p-2.5 bg-zinc-50 rounded-xl border border-zinc-200 text-center">
                    <p className="text-[10px] text-zinc-500">Camisetas</p>
                    <p className="font-bold text-pastoral-dourado">{c.tshirts_count || 0}</p>
                  </div>

                  {canManageCampaign && (
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(c)}
                      className="px-3 py-2 rounded-xl text-xs font-bold bg-pastoral-creme hover:bg-pastoral-dourado/20 text-pastoral-cafe border border-pastoral-dourado/40 flex items-center gap-1.5 transition-all"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-pastoral-dourado" />
                      Editar Campanha
                    </button>
                  )}

                  {canManageCampaign && !isActive && (
                    <button
                      type="button"
                      onClick={() => handleActivate(c.id)}
                      className="px-3 py-2 rounded-xl text-xs font-bold bg-pastoral-cafe hover:bg-pastoral-profundo text-white shadow-xs"
                    >
                      Ativar esta Campanha
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* New Campaign Modal */}
      <Modal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        title="Criar Nova Campanha de Camisetas"
        subtitle="Pastoral Missionária"
        maxWidth="md"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
              {formError}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider mb-1">
              Nome da Campanha *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Camisetas Pastoral Missionária — 2027"
              className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-xl"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider mb-1">
              Preço Padrão da Camiseta (R$) *
            </label>
            <input
              type="text"
              value={priceStr}
              onChange={(e) => setPriceStr(e.target.value)}
              placeholder="45,00"
              className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-xl font-bold text-pastoral-cafe"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider mb-1">
                Início (opcional)
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider mb-1">
                Encerramento (opcional)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider mb-1">
              Descrição
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Ex.: Encomenda do segundo semestre para novos crismandos e jovens"
              className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-xl"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsNewModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 hover:bg-zinc-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-pastoral-dourado hover:brightness-105 text-pastoral-profundo shadow-gold"
            >
              {isSubmitting ? 'Criando...' : 'Criar Campanha'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Campaign Modal (Section 9) */}
      <Modal
        isOpen={!!editingCampaign}
        onClose={() => setEditingCampaign(null)}
        title="Editar Campanha de Camisetas"
        subtitle={editingCampaign?.name || 'Pastoral Missionária'}
        maxWidth="md"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          {editError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
              {editError}
            </div>
          )}

          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <span>
              Alterar o preço padrão afeta <b>apenas os novos pedidos</b> criados a partir de agora. Os pedidos existentes mantêm seu valor histórico intacto.
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider mb-1">
              Nome da Campanha *
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-xl"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider mb-1">
                Preço Padrão da Camiseta (R$) *
              </label>
              <input
                type="text"
                value={editPriceStr}
                onChange={(e) => setEditPriceStr(e.target.value)}
                placeholder="45,00"
                className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-xl font-bold text-pastoral-cafe"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider mb-1">
                Status da Campanha
              </label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as any)}
                className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-xl bg-white font-medium"
              >
                <option value="aberta">Aberta</option>
                <option value="em_producao">Em Produção</option>
                <option value="encerrada">Encerrada</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider mb-1">
                Data de Início
              </label>
              <input
                type="date"
                value={editStartDate}
                onChange={(e) => setEditStartDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider mb-1">
                Data de Encerramento
              </label>
              <input
                type="date"
                value={editEndDate}
                onChange={(e) => setEditEndDate(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider mb-1">
              Descrição
            </label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-xl"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditingCampaign(null)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 hover:bg-zinc-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSavingEdit}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-pastoral-dourado hover:brightness-105 text-pastoral-profundo shadow-gold"
            >
              {isSavingEdit ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
