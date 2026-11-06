import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Search,
  Phone,
  Copy,
  Check,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Filter,
  Lock,
  Eye,
} from 'lucide-react';
import { api } from '../services/api';

const PASTORAL_QUALIFICATIONS = [
  'Intercessão',
  'Pregação',
  'Formação',
  'Testemunho',
  'Música',
  'Condução de oração',
  'Animação',
  'Apoio',
];

interface DirectoryMember {
  id: string;
  name: string;
  display_name: string;
  pastoral_role: string;
  status: string;
  photo_url?: string | null;
  phone?: string | null;
  phone_visibility?: 'directory' | 'coordinators_only' | 'private';
  is_self?: boolean;
  qualifications: string[];
}

export const DiretorioMembrosView: React.FC = () => {
  const [members, setMembers] = useState<DirectoryMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedQualification, setSelectedQualification] = useState('todas');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [updatingPrivacyId, setUpdatingPrivacyId] = useState<string | null>(null);

  const loadDirectory = async () => {
    setLoading(true);
    try {
      const data = await api.getMembersDirectory();
      setMembers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erro ao carregar diretório de missionários:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDirectory();
  }, []);

  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchesSearch =
        !search.trim() ||
        m.name.toLowerCase().includes(search.toLowerCase().trim()) ||
        (m.display_name || '').toLowerCase().includes(search.toLowerCase().trim()) ||
        (m.phone || '').includes(search.trim());

      const matchesQual =
        selectedQualification === 'todas' ||
        (Array.isArray(m.qualifications) && m.qualifications.includes(selectedQualification));

      return matchesSearch && matchesQual;
    });
  }, [members, search, selectedQualification]);

  const handleCopyPhone = (id: string, phone: string) => {
    navigator.clipboard.writeText(phone);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatWhatsAppUrl = (phone: string, displayName: string) => {
    const digits = phone.replace(/\D/g, '');
    const fullNumber = digits.startsWith('55') ? digits : `55${digits}`;
    const msg = encodeURIComponent(`Paz e bem, ${displayName}! Tudo bem?`);
    return `https://wa.me/${fullNumber}?text=${msg}`;
  };

  const handlePrivacyChange = async (memberId: string, newVisibility: string) => {
    setUpdatingPrivacyId(memberId);
    try {
      await api.updateMemberPrivacy(memberId, { phone_visibility: newVisibility });
      await loadDirectory();
    } catch (err) {
      console.error('Erro ao atualizar privacidade:', err);
    } finally {
      setUpdatingPrivacyId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Banner Institucional */}
      <div className="bg-gradient-to-r from-[#281F1C] via-[#3C2D29] to-[#281F1C] rounded-2xl p-6 text-[#FAF3E9] shadow-lg border border-[#B68B4B]/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#B68B4B]/20 border border-[#B68B4B]/40 text-[#D4AF37] text-xs font-semibold tracking-wider uppercase">
              <Users className="w-3.5 h-3.5" />
              Diretório Institucional • Pastoral Missionária
            </div>
            <h2 className="text-2xl font-serif font-bold text-[#FAF3E9]">
              Missionários da Pastoral
            </h2>
            <p className="text-sm text-[#E5D5C5]/85 max-w-2xl">
              Consulta fraterna dos membros ativos da Pastoral Missionária — Ágape Apostolado de Jovens, suas habilitações pastorais e contatos autorizados.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-center bg-[#1F1715]/80 px-4 py-3 rounded-xl border border-[#B68B4B]/30">
            <div className="w-10 h-10 rounded-lg bg-[#B68B4B]/20 flex items-center justify-center text-[#D4AF37]">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-[#FAF3E9] leading-none">
                {members.length}
              </div>
              <div className="text-xs text-[#E5D5C5]/75 mt-0.5">
                missionários cadastrados
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Busca e Filtro por Habilitação */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#E5D5C5] space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#8C7A6B] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar missionário por nome, apelido ou telefone..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E5D5C5] bg-[#FAF3E9]/40 text-sm text-[#281F1C] placeholder-[#8C7A6B] focus:outline-none focus:ring-2 focus:ring-[#B68B4B]"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#8C7A6B] shrink-0" />
            <select
              value={selectedQualification}
              onChange={(e) => setSelectedQualification(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl border border-[#E5D5C5] bg-white text-sm text-[#281F1C] font-medium focus:outline-none focus:ring-2 focus:ring-[#B68B4B]"
            >
              <option value="todas">Todas as Habilitações ({members.length})</option>
              {PASTORAL_QUALIFICATIONS.map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Pílulas rápidas de habilitação */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => setSelectedQualification('todas')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              selectedQualification === 'todas'
                ? 'bg-[#3C2D29] text-[#FAF3E9] shadow-sm'
                : 'bg-[#FAF3E9] text-[#5C4942] hover:bg-[#E5D5C5]/60'
            }`}
          >
            Todos ({members.length})
          </button>
          {PASTORAL_QUALIFICATIONS.map((q) => {
            const count = members.filter((m) => m.qualifications?.includes(q)).length;
            return (
              <button
                key={q}
                type="button"
                onClick={() => setSelectedQualification(selectedQualification === q ? 'todas' : q)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  selectedQualification === q
                    ? 'bg-[#B68B4B] text-white shadow-sm'
                    : 'bg-[#FAF3E9] text-[#5C4942] hover:bg-[#E5D5C5]/60'
                }`}
              >
                {q} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Lista de Cartões */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-[#E5D5C5]">
          <div className="w-8 h-8 border-2 border-[#B68B4B] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-[#6E5A53]">Carregando diretório de missionários...</p>
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-[#E5D5C5]">
          <Users className="w-10 h-10 text-[#B68B4B] mx-auto mb-2 opacity-60" />
          <p className="text-base font-semibold text-[#281F1C]">Nenhum missionário encontrado</p>
          <p className="text-xs text-[#8C7A6B] mt-1">
            Ajuste os termos da busca ou selecione outra habilitação pastoral.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map((member) => {
            const isCoord = member.pastoral_role === 'coordenador' || member.pastoral_role === 'admin';
            const initials = (member.display_name || member.name || 'M')
              .split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase();

            return (
              <div
                key={member.id}
                className={`bg-white rounded-2xl p-5 border transition-all flex flex-col justify-between ${
                  isCoord
                    ? 'border-[#B68B4B]/60 shadow-md ring-1 ring-[#B68B4B]/20'
                    : 'border-[#E5D5C5] shadow-sm hover:border-[#B68B4B]/40'
                }`}
              >
                <div>
                  {/* Topo do Card */}
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center font-serif font-bold text-base shrink-0 ${
                        isCoord
                          ? 'bg-gradient-to-br from-[#B68B4B] to-[#8E6930] text-white shadow-sm'
                          : 'bg-[#FAF3E9] text-[#3C2D29] border border-[#E5D5C5]'
                      }`}
                    >
                      {initials}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-[#281F1C] text-base leading-snug truncate">
                          {member.display_name || member.name}
                        </h3>
                        {isCoord && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#B68B4B]/15 text-[#8E6930] border border-[#B68B4B]/30">
                            <ShieldCheck className="w-3 h-3" />
                            Coordenação
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#6E5A53] truncate mt-0.5" title={member.name}>
                        {member.name}
                      </p>
                    </div>
                  </div>

                  {/* Habilitações Confirmadas */}
                  <div className="mt-4">
                    <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#8C7A6B] mb-1.5">
                      <Sparkles className="w-3 h-3 text-[#B68B4B]" />
                      Habilitações Pastorais ({member.qualifications?.length || 0})
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {Array.isArray(member.qualifications) && member.qualifications.length > 0 ? (
                        member.qualifications.map((q) => (
                          <span
                            key={q}
                            className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#3C2D29] text-[#FAF3E9]"
                          >
                            {q}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-[#8C7A6B] italic">Em formação</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contato / WhatsApp */}
                <div className="mt-4 pt-3.5 border-t border-[#FAF3E9] space-y-2">
                  {member.phone ? (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-[#3C2D29] truncate">
                        <Phone className="w-3.5 h-3.5 text-[#B68B4B] shrink-0" />
                        <span>{member.phone}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopyPhone(member.id, member.phone!)}
                          title="Copiar telefone"
                          className="p-1.5 rounded-lg bg-[#FAF3E9] text-[#3C2D29] hover:bg-[#E5D5C5] transition-colors text-xs flex items-center gap-1"
                        >
                          {copiedId === member.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-700" />
                              <span className="text-[11px] text-emerald-700 font-semibold">Copiado</span>
                            </>
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <a
                          href={formatWhatsAppUrl(member.phone, member.display_name || member.name)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold transition-colors shadow-xs"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          WhatsApp
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-[#8C7A6B]">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Telefone reservado à coordenação</span>
                    </div>
                  )}

                  {/* Controle de privacidade do próprio membro */}
                  {member.is_self && (
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#E5D5C5]/60 text-[11px]">
                      <span className="flex items-center gap-1 text-[#6E5A53] font-medium">
                        <Eye className="w-3 h-3 text-[#B68B4B]" />
                        Visibilidade do meu telefone:
                      </span>
                      <select
                        disabled={updatingPrivacyId === member.id}
                        value={member.phone_visibility || 'directory'}
                        onChange={(e) => handlePrivacyChange(member.id, e.target.value)}
                        className="px-2 py-0.5 rounded border border-[#E5D5C5] bg-[#FAF3E9] text-[#281F1C] text-[11px] font-medium"
                      >
                        <option value="directory">Diretório de Membros</option>
                        <option value="coordinators_only">Apenas Coordenação</option>
                        <option value="private">Privado</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
