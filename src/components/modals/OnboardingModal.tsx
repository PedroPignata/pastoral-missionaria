import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Cross, Search, CheckCircle2, Clock, UserCheck, ShieldAlert, ArrowRight, X } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose, onComplete }) => {
  const { user, refreshUser } = useAuth();
  const [unclaimedMembers, setUnclaimedMembers] = useState<{ id: string; name: string; display_name: string; orders_count: number }[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState<{ id: string; name: string } | null>(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      api.getUnclaimedMembers()
        .then((data) => setUnclaimedMembers(data))
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredMembers = unclaimedMembers.filter((m) =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.display_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleClaim = async () => {
    if (!selectedMember) return;
    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      const res = await api.claimMember(selectedMember.id, notes);
      if (res.auto_approved) {
        setStatusMessage({
          type: 'success',
          text: 'Vínculo confirmado com sucesso! Seu perfil agora é Membro ativo da Pastoral Missionária.',
        });
        await refreshUser();
        setTimeout(() => {
          onComplete();
        }, 1800);
      } else {
        setStatusMessage({
          type: 'info',
          text: 'Sua solicitação de vínculo foi registrada e enviada à coordenação (Pedro e Fernanda) para confirmação.',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Falha ao registrar solicitação de vínculo.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-pastoral-profundo/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-pastoral-dourado/30 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Catholic Header */}
        <div className="bg-gradient-to-r from-pastoral-cafe to-pastoral-profundo p-6 text-white text-center relative border-b border-pastoral-dourado/30">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-12 h-12 mx-auto mb-2.5 rounded-2xl bg-pastoral-dourado/20 border border-pastoral-dourado/40 flex items-center justify-center text-pastoral-dourado shadow-gold">
            <Cross className="w-6 h-6 text-pastoral-dourado" />
          </div>

          <h2 className="font-serif font-bold text-xl text-white">
            Paz e Bem, {user?.name?.split(' ')[0] || 'Missionário(a)'}!
          </h2>
          <p className="text-xs text-pastoral-dourado-claro font-semibold mt-0.5 tracking-wide uppercase">
            Acolhimento da Pastoral Missionária
          </p>
          <p className="text-[11px] text-zinc-300 mt-2 italic font-serif">
            "Tenha Jesus Cristo em seu coração, e todas as cruzes do mundo parecerão rosas." — São Padre Pio
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Status Banner */}
          {user?.role === 'pendente' && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900">
                <p className="font-bold">Aguardando Confirmação da Coordenação</p>
                <p className="mt-0.5 text-amber-800">
                  Sua conta Google foi criada com perfil <strong>pendente</strong>. Os coordenadores <strong>Pedro e Fernanda</strong> farão a liberação do seu acesso em breve.
                </p>
              </div>
            </div>
          )}

          {statusMessage && (
            <div
              className={`p-3.5 rounded-2xl text-xs flex items-center gap-2.5 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : statusMessage.type === 'info'
                  ? 'bg-blue-50 border border-blue-200 text-blue-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              ) : statusMessage.type === 'info' ? (
                <UserCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Member / T-shirt claim section */}
          <div className="space-y-3">
            <div className="border-b border-zinc-100 pb-2">
              <h3 className="font-serif font-bold text-sm text-pastoral-cafe">
                Já pediu camiseta ou faz parte da missão?
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Vincule sua conta Google ao seu registro para acompanhar seu pedido e ver sua ficha missionária:
              </p>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar seu nome (ex: Duda, Lyvia, Állan, etc.)"
                className="w-full pl-9 pr-3 py-2 text-xs border border-zinc-300 rounded-xl focus:ring-2 focus:ring-pastoral-dourado focus:border-pastoral-dourado"
              />
            </div>

            {/* Search Results List */}
            {searchTerm.trim().length > 0 && (
              <div className="max-h-40 overflow-y-auto border border-zinc-200 rounded-xl divide-y divide-zinc-100 shadow-xs">
                {filteredMembers.length === 0 ? (
                  <p className="p-3 text-xs text-zinc-400 text-center">Nenhum membro encontrado com esse nome.</p>
                ) : (
                  filteredMembers.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedMember(m)}
                      className={`w-full text-left p-2.5 text-xs flex items-center justify-between transition-colors ${
                        selectedMember?.id === m.id
                          ? 'bg-pastoral-dourado/15 font-bold text-pastoral-cafe'
                          : 'hover:bg-zinc-50 text-zinc-700'
                      }`}
                    >
                      <div>
                        <p className="font-medium">{m.name}</p>
                        <p className="text-[10px] text-zinc-400">Apelido: {m.display_name}</p>
                      </div>
                      {selectedMember?.id === m.id && (
                        <CheckCircle2 className="w-4 h-4 text-pastoral-dourado" />
                      )}
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Selected Member Form */}
            {selectedMember && (
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-2 animate-fade-in">
                <p className="text-xs text-zinc-700">
                  Vincular conta a: <strong>{selectedMember.name}</strong>
                </p>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observação para os coordenadores (opcional)"
                  className="w-full px-3 py-1.5 text-xs border border-zinc-300 rounded-xl focus:ring-2 focus:ring-pastoral-dourado focus:border-pastoral-dourado"
                />
                <button
                  type="button"
                  onClick={handleClaim}
                  disabled={isSubmitting}
                  className="w-full py-2 px-3 rounded-xl bg-pastoral-dourado text-pastoral-profundo font-bold text-xs hover:bg-pastoral-dourado-claro transition-all shadow-gold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>{isSubmitting ? 'Confirmando...' : 'Confirmar Vínculo'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between">
          <p className="text-[11px] text-zinc-500">
            Coordenação: <strong>Pedro e Fernanda</strong>
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-200 hover:bg-zinc-300 text-zinc-800 text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <span>Prosseguir ao Painel</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
