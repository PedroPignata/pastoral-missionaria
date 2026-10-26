import React, { useState, useMemo } from 'react';
import { Member, Order } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';
import { Search, UserPlus, Users, Phone, ShoppingBag, Eye, Edit2, UserX, MessageCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/common/Modal';
import { api } from '../services/api';

interface MembrosViewProps {
  members: Member[];
  onRefresh: () => void;
  onOpenOrderDetails: (order: Order) => void;
}

export const MembrosView: React.FC<MembrosViewProps> = ({ members, onRefresh, onOpenOrderDetails }) => {
  const { canEdit, isAdmin } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<string>('active');

  // Modal states
  const [isNewMemberOpen, setIsNewMemberOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [viewingHistoryMember, setViewingHistoryMember] = useState<(Member & { orders: Order[] }) | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtered members
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      if (filterActive === 'active' && !m.active) return false;
      if (filterActive === 'inactive' && m.active) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        return (
          m.name.toLowerCase().includes(term) ||
          m.display_name.toLowerCase().includes(term) ||
          (m.phone || '').includes(term)
        );
      }
      return true;
    });
  }, [members, searchTerm, filterActive]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setName('');
    setDisplayName('');
    setPhone('');
    setNotes('');
    setDuplicateWarning('');
    setIsNewMemberOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (m: Member) => {
    setEditingMember(m);
    setName(m.name);
    setDisplayName(m.display_name);
    setPhone(m.phone || '');
    setNotes(m.notes || '');
  };

  // Open History Modal
  const handleOpenHistory = async (memberId: string) => {
    try {
      const detailed = await api.getMember(memberId);
      setViewingHistoryMember(detailed);
    } catch (err: any) {
      alert('Erro ao carregar histórico: ' + err.message);
    }
  };

  // Check duplicates as user types name
  const handleNameChange = (val: string) => {
    setName(val);
    if (!displayName || displayName === name.split(' ')[0]) {
      setDisplayName(val.split(' ')[0]);
    }
    if (val.trim().length >= 3) {
      const match = members.find(
        (m) => m.name.toLowerCase().includes(val.trim().toLowerCase()) && (!editingMember || m.id !== editingMember.id)
      );
      if (match) {
        setDuplicateWarning(`Atenção: Já existe membro similar cadastrado: "${match.name}".`);
      } else {
        setDuplicateWarning('');
      }
    } else {
      setDuplicateWarning('');
    }
  };

  // Submit create or edit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingMember) {
        await api.updateMember(editingMember.id, {
          name: name.trim(),
          display_name: displayName.trim() || name.split(' ')[0],
          phone: phone.trim(),
          notes: notes.trim(),
        });
        setEditingMember(null);
      } else {
        await api.createMember({
          name: name.trim(),
          display_name: displayName.trim() || name.split(' ')[0],
          phone: phone.trim(),
          notes: notes.trim(),
        });
        setIsNewMemberOpen(false);
      }
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar membro.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Deseja desativar este membro? O histórico de pedidos será mantido intacto.')) return;
    try {
      await api.deactivateMember(id);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl font-bold text-pastoral-cafe flex items-center gap-2">
            Membros da Pastoral
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-pastoral-creme border border-pastoral-dourado/40 font-sans font-semibold text-pastoral-dourado">
              {filteredMembers.length} {filteredMembers.length === 1 ? 'membro' : 'membros'}
            </span>
          </h2>
          <p className="text-xs text-zinc-500">
            Cadastre membros, consulte telefones e acompanhe o histórico acumulado
          </p>
        </div>

        {canEdit && (
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-pastoral-dourado hover:brightness-105 text-pastoral-profundo shadow-gold flex items-center justify-center gap-1.5 transition-all self-start sm:self-auto"
          >
            <UserPlus className="w-4 h-4" /> Novo Membro
          </button>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="p-4 bg-white rounded-2xl border border-zinc-200/80 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-zinc-300 rounded-xl bg-zinc-50/50"
          />
        </div>

        <select
          value={filterActive}
          onChange={(e) => setFilterActive(e.target.value)}
          className="px-3 py-2 text-xs border border-zinc-300 rounded-xl bg-white font-medium"
        >
          <option value="active">Somente Membros Ativos</option>
          <option value="inactive">Somente Inativos</option>
          <option value="all">Todos os Cadastros</option>
        </select>
      </div>

      {/* Grid of Members Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredMembers.map((m) => (
          <div
            key={m.id}
            className={`p-4 bg-white rounded-2xl border transition-all ${
              m.active ? 'border-zinc-200/80 hover:border-pastoral-dourado/40 shadow-sm' : 'border-zinc-200 bg-zinc-50 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-pastoral-creme border border-pastoral-dourado/40 text-pastoral-cafe font-bold flex items-center justify-center text-xs">
                  {m.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-pastoral-cafe leading-tight">{m.name}</h3>
                  <p className="text-[11px] text-zinc-400">Exibição: {m.display_name}</p>
                </div>
              </div>

              {!m.active && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-600 font-medium">
                  Inativo
                </span>
              )}
            </div>

            {/* Phone & Info */}
            <div className="text-xs text-zinc-600 space-y-1 mb-3 pt-2 border-t border-zinc-100">
              <p className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-zinc-400" />
                <span>{m.phone || 'Telefone não cadastrado'}</span>
              </p>
              <div className="flex items-center justify-between text-[11px] pt-1">
                <span className="text-zinc-500">
                  <ShoppingBag className="w-3.5 h-3.5 inline mr-1 text-pastoral-dourado" />
                  {m.orders_count || 0} pedido(s)
                </span>
                <span className="font-bold text-pastoral-cafe">
                  Total: {formatCurrency(m.total_spent_cents)}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-100">
              <button
                onClick={() => handleOpenHistory(m.id)}
                className="text-xs font-semibold text-pastoral-dourado hover:underline flex items-center gap-1"
              >
                <Eye className="w-3.5 h-3.5" /> Histórico
              </button>

              <div className="flex items-center gap-1">
                {m.phone && (
                  <a
                    href={`https://api.whatsapp.com/send?phone=55${m.phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 border border-emerald-300"
                    title="Conversar no WhatsApp"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                  </a>
                )}

                {canEdit && (
                  <button
                    onClick={() => handleOpenEdit(m)}
                    className="p-1.5 rounded-lg text-zinc-600 hover:bg-zinc-100 border border-zinc-200"
                    title="Editar Membro"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}

                {isAdmin && m.active === 1 && (
                  <button
                    onClick={() => handleDeactivate(m.id)}
                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200"
                    title="Desativar Membro"
                  >
                    <UserX className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Create/Edit Member */}
      <Modal
        isOpen={isNewMemberOpen || editingMember !== null}
        onClose={() => {
          setIsNewMemberOpen(false);
          setEditingMember(null);
        }}
        title={editingMember ? 'Editar Membro' : 'Novo Membro da Pastoral'}
        subtitle="Ágape Apostolado de Jovens"
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {duplicateWarning && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>{duplicateWarning}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider mb-1">
              Nome Completo *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Ex.: João Pedro dos Santos"
              className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-xl"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider mb-1">
              Nome de Exibição / Apelido
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ex.: João"
              className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider mb-1">
              Telefone / WhatsApp (com DDD)
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ex.: (61) 98765-4321"
              className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-xl"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider mb-1">
              Observações
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Ex.: Participa do grupo de oração nas quintas-feiras"
              className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-xl"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsNewMemberOpen(false);
                setEditingMember(null);
              }}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 hover:bg-zinc-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-pastoral-dourado hover:brightness-105 text-pastoral-profundo shadow-gold"
            >
              {isSubmitting ? 'Salvando...' : 'Salvar Membro'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Member History */}
      <Modal
        isOpen={viewingHistoryMember !== null}
        onClose={() => setViewingHistoryMember(null)}
        title={`Histórico de ${viewingHistoryMember?.name}`}
        subtitle={`Cadastrado em ${formatDate(viewingHistoryMember?.created_at)}`}
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="p-3 bg-pastoral-creme rounded-xl border border-pastoral-dourado/20 flex items-center justify-between text-xs">
            <div>
              <p className="text-zinc-500">Total Investido em Camisetas:</p>
              <p className="font-serif font-bold text-base text-pastoral-cafe">
                {formatCurrency(viewingHistoryMember?.total_spent_cents)}
              </p>
            </div>
            <div>
              <p className="text-zinc-500">Saldo Pendente:</p>
              <p className="font-serif font-bold text-base text-rose-600">
                {formatCurrency(viewingHistoryMember?.total_pending_cents)}
              </p>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-pastoral-cafe uppercase tracking-wider mb-2">
              Pedidos Vinculados ({viewingHistoryMember?.orders.length || 0})
            </h4>
            <div className="space-y-2">
              {viewingHistoryMember?.orders.map((o) => (
                <div
                  key={o.id}
                  className="p-3 border border-zinc-200 rounded-xl text-xs flex items-center justify-between hover:bg-zinc-50/50"
                >
                  <div>
                    <p className="font-bold text-pastoral-cafe">{o.campaign_name}</p>
                    <p className="text-[11px] text-zinc-500">
                      {o.items.map((it) => `${it.quantity}x ${it.model} ${it.size}`).join(', ')} •{' '}
                      <b>{formatCurrency(o.total_amount_cents)}</b>
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setViewingHistoryMember(null);
                      onOpenOrderDetails(o);
                    }}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-pastoral-dourado text-pastoral-profundo"
                  >
                    Ver Pedido
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

