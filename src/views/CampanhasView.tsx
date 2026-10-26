import React, { useState } from 'react';
import { Campaign } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { api } from '../services/api';
import { Calendar, Plus, CheckCircle2, ShoppingBag, DollarSign } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/common/Modal';

interface CampanhasViewProps {
  campaigns: Campaign[];
  activeCampaign: Campaign | null;
  onRefresh: () => void;
}

export const CampanhasView: React.FC<CampanhasViewProps> = ({
  campaigns,
  activeCampaign,
  onRefresh,
}) => {
  const { isAdmin } = useAuth();

  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priceStr, setPriceStr] = useState('45,00');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleActivate = async (id: string) => {
    try {
      await api.activateCampaign(id);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const priceCents = Math.round(parseFloat(priceStr.replace(',', '.')) * 100);

    setIsSubmitting(true);
    try {
      await api.createCampaign({
        name: name.trim(),
        description: description.trim(),
        default_price_cents: priceCents || 4500,
      });
      setIsNewModalOpen(false);
      setName('');
      setDescription('');
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Erro ao criar campanha.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl font-bold text-pastoral-cafe flex items-center gap-2">
            Campanhas de Camisetas
          </h2>
          <p className="text-xs text-zinc-500">
            Gerencie novos períodos de encomendas preservando históricos financeiros anteriores
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setIsNewModalOpen(true)}
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
                  <div className="flex items-center gap-2">
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
                </div>

                {/* Metrics */}
                <div className="flex items-center gap-4 text-xs">
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

                  {isAdmin && !isActive && (
                    <button
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
              className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-xl"
              required
            />
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
    </div>
  );
};

