import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  Users,
  UserCheck,
  KeyRound,
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  Database,
  Clock,
  UserPlus,
  Check,
  X,
  Mail,
  Search,
  Plus,
  Edit2,
  Eye,
  Phone,
  Cake,
  Calendar,
  UserX,
  Sparkles,
} from 'lucide-react';

const QUALIFICATIONS_OPTIONS = [
  'Intercessão',
  'Pregação',
  'Formação',
  'Testemunho',
  'Música',
  'Condução de oração',
  'Animação',
  'Apoio',
];

const MODULES_OPTIONS = [
  { key: 'camisetas', label: 'Gestão de Camisetas' },
  { key: 'laboratorios', label: 'Laboratórios de Pregação' },
  { key: 'calendario', label: 'Calendário 2027' },
  { key: 'missoes', label: 'Missões e Escalas' },
  { key: 'envios', label: 'Central de Envios' },
  { key: 'biblioteca', label: 'Biblioteca e Documentos' },
  { key: 'comunidade', label: 'Moderação da Comunidade' },
  { key: 'eventos', label: 'Organização de Eventos' },
];

export const GovernancaSucessaoView: React.FC = () => {
  const { user } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'coordenador';

  const [pastoralMembers, setPastoralMembers] = useState<any[]>([]);
  const [capabilities, setCapabilities] = useState<any[]>([]);
  const [successionHistory, setSuccessionHistory] = useState<any[]>([]);
  const [feedback, setFeedback] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Member management state
  const [memberSearch, setMemberSearch] = useState('');
  const [memberFilterTab, setMemberFilterTab] = useState<'todos' | 'ativos' | 'coordenadores' | 'membros' | 'inativos'>('todos');
  const [isNewMemberModalOpen, setIsNewMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<any | null>(null);
  const [viewingMember, setViewingMember] = useState<any | null>(null);

  // Form states for create/edit
  const [formName, setFormName] = useState('');
  const [formDisplayName, setFormDisplayName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPastoralRole, setFormPastoralRole] = useState<'coordenador' | 'membro' | 'apoio'>('membro');
  const [formStatus, setFormStatus] = useState<'ativo' | 'pendente' | 'inativo' | 'arquivado'>('ativo');
  const [formJoinedAt, setFormJoinedAt] = useState('');
  const [formBirthDay, setFormBirthDay] = useState<number | ''>('');
  const [formBirthMonth, setFormBirthMonth] = useState<number | ''>('');
  const [formBirthYear, setFormBirthYear] = useState<number | ''>('');
  const [formBirthdayVisibility, setFormBirthdayVisibility] = useState<'all' | 'members' | 'coordinators' | 'private'>('members');
  const [formQualifications, setFormQualifications] = useState<string[]>([]);
  const [formNotes, setFormNotes] = useState('');
  const [isSubmittingMember, setIsSubmittingMember] = useState(false);

  // Delegation form
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [roleLabel, setRoleLabel] = useState('Responsável por Camisetas');
  const [moduleKey, setModuleKey] = useState('camisetas');

  // Succession form
  const [newCoordinatorName, setNewCoordinatorName] = useState('');
  const [newCoordinatorTitle, setNewCoordinatorTitle] = useState('Coordenador(a) da Pastoral Missionária');
  const [successionNotes, setSuccessionNotes] = useState('');

  // Pending Approvals & Google Users
  const [pendingData, setPendingData] = useState<{ pendingUsers: any[]; pendingRequests: any[] }>({
    pendingUsers: [],
    pendingRequests: [],
  });
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'coordenador' | 'delegado' | 'membro'>('coordenador');
  const [isInviting, setIsInviting] = useState(false);

  const loadGovernance = async () => {
    try {
      const data = await api.getGovernanceData();
      setPastoralMembers(data.pastoralMembers || []);
      setCapabilities(data.capabilities || []);
      setSuccessionHistory(data.successionHistory || []);
      if (data.pastoralMembers?.length > 0 && !selectedMemberId) {
        setSelectedMemberId(data.pastoralMembers[0].id);
      }

      if (canManage) {
        const approvals = await api.getPendingApprovals();
        setPendingData(approvals);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleApproveRequest = async (requestId: string, role = 'membro') => {
    try {
      await api.approveClaim({ request_id: requestId, role });
      showMessage('Vínculo aprovado com sucesso!');
      loadGovernance();
    } catch (err: any) {
      showMessage(err.message, true);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await api.rejectClaim({ request_id: requestId });
      showMessage('Solicitação recusada.');
      loadGovernance();
    } catch (err: any) {
      showMessage(err.message, true);
    }
  };

  const handleApproveUserDirectly = async (userId: string, role = 'membro') => {
    try {
      await api.approveClaim({ user_id: userId, role });
      showMessage(`Usuário aprovado com papel: ${role}!`);
      loadGovernance();
    } catch (err: any) {
      showMessage(err.message, true);
    }
  };

  const handleCreateInstitutionalAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteName) return;
    setIsInviting(true);
    try {
      await api.createUser({
        name: inviteName.trim(),
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
        password: 'pastoral@google',
      });
      showMessage(`Conta institucional para ${inviteName} (${inviteRole}) criada com sucesso!`);
      setInviteEmail('');
      setInviteName('');
      loadGovernance();
    } catch (err: any) {
      showMessage(err.message || 'Falha ao criar conta institucional.', true);
    } finally {
      setIsInviting(false);
    }
  };

  useEffect(() => {
    loadGovernance();
  }, []);

  const showMessage = (msg: string, isErr = false) => {
    if (isErr) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(''), 5000);
    } else {
      setFeedback(msg);
      setTimeout(() => setFeedback(''), 4000);
    }
  };

  // Modal de Edição Exclusiva de Habilitações Pastorais (Seção 5.3)
  const [qualsModalMember, setQualsModalMember] = useState<any | null>(null);
  const [selectedQuals, setSelectedQuals] = useState<string[]>([]);
  const [isSavingQuals, setIsSavingQuals] = useState(false);

  const handleOpenQualsModal = (member: any) => {
    setQualsModalMember(member);
    setSelectedQuals(member.qualifications ? [...member.qualifications] : []);
  };

  const handleToggleQualInModal = (qual: string) => {
    setSelectedQuals((prev) =>
      prev.includes(qual) ? prev.filter((q) => q !== qual) : [...prev, qual]
    );
  };

  const handleSelectAllQuals = () => {
    setSelectedQuals([...QUALIFICATIONS_OPTIONS]);
  };

  const handleClearAllQuals = () => {
    setSelectedQuals([]);
  };

  const handleSaveQualifications = async () => {
    if (!qualsModalMember) return;
    setIsSavingQuals(true);
    try {
      const res = await api.updateMemberQualifications(qualsModalMember.id, selectedQuals);
      // Atualizar imediatamente no estado local para evitar recargas fora de ordem
      setPastoralMembers((prev) =>
        prev.map((m) =>
          m.id === qualsModalMember.id ? { ...m, qualifications: res.qualifications } : m
        )
      );
      showMessage(`Habilitações de ${qualsModalMember.display_name || qualsModalMember.name} salvas com sucesso!`);
      setQualsModalMember(null);
    } catch (err: any) {
      showMessage('Erro ao salvar habilitações: ' + (err.message || 'Tente novamente'), true);
    } finally {
      setIsSavingQuals(false);
    }
  };

  const handleOpenNewMemberModal = () => {
    setFormName('');
    setFormDisplayName('');
    setFormEmail('');
    setFormPhone('');
    setFormPastoralRole('membro');
    setFormStatus('ativo');
    setFormJoinedAt(new Date().toISOString().split('T')[0]);
    setFormBirthDay('');
    setFormBirthMonth('');
    setFormBirthYear('');
    setFormBirthdayVisibility('members');
    setFormQualifications([]);
    setFormNotes('');
    setIsNewMemberModalOpen(true);
  };

  const handleOpenEditMemberModal = (member: any) => {
    setEditingMember(member);
    setFormName(member.name || '');
    setFormDisplayName(member.display_name || member.name || '');
    setFormEmail(member.email || '');
    setFormPhone(member.phone || '');
    setFormPastoralRole(member.pastoral_role || 'membro');
    setFormStatus(member.status || 'ativo');
    setFormJoinedAt(member.joined_at || '');
    setFormBirthDay(member.birth_day ?? '');
    setFormBirthMonth(member.birth_month ?? '');
    setFormBirthYear(member.birth_year ?? '');
    setFormBirthdayVisibility(member.birthday_visibility || 'members');
    setFormQualifications(member.qualifications || []);
    setFormNotes(member.notes || '');
  };

  const handleToggleFormQualification = (qual: string) => {
    setFormQualifications((prev) =>
      prev.includes(qual) ? prev.filter((q) => q !== qual) : [...prev, qual]
    );
  };

  const handleSaveNewMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    setIsSubmittingMember(true);
    try {
      await api.createPastoralMember({
        name: formName.trim(),
        display_name: formDisplayName.trim() || formName.trim().split(' ')[0],
        email: formEmail.trim().toLowerCase() || null,
        phone: formPhone.trim() || null,
        pastoral_role: formPastoralRole,
        status: formStatus,
        joined_at: formJoinedAt || null,
        birth_day: formBirthDay ? Number(formBirthDay) : null,
        birth_month: formBirthMonth ? Number(formBirthMonth) : null,
        birth_year: formBirthYear ? Number(formBirthYear) : null,
        birthday_visibility: formBirthdayVisibility,
        qualifications: formQualifications,
        notes: formNotes.trim() || null,
      });
      showMessage(`Missionário(a) ${formName.trim()} cadastrado com sucesso!`);
      setIsNewMemberModalOpen(false);
      loadGovernance();
    } catch (err: any) {
      showMessage(err.message || 'Falha ao cadastrar missionário', true);
    } finally {
      setIsSubmittingMember(false);
    }
  };

  const handleSaveEditMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember || !formName.trim()) return;
    setIsSubmittingMember(true);
    try {
      await api.updatePastoralMember(editingMember.id, {
        name: formName.trim(),
        display_name: formDisplayName.trim() || formName.trim().split(' ')[0],
        email: formEmail.trim().toLowerCase() || null,
        phone: formPhone.trim() || null,
        pastoral_role: formPastoralRole,
        status: formStatus,
        joined_at: formJoinedAt || null,
        birth_day: formBirthDay ? Number(formBirthDay) : null,
        birth_month: formBirthMonth ? Number(formBirthMonth) : null,
        birth_year: formBirthYear ? Number(formBirthYear) : null,
        birthday_visibility: formBirthdayVisibility,
        qualifications: formQualifications,
        notes: formNotes.trim() || null,
      });
      showMessage(`Dados de ${formName.trim()} atualizados com sucesso!`);
      setEditingMember(null);
      loadGovernance();
    } catch (err: any) {
      showMessage(err.message || 'Falha ao atualizar missionário', true);
    } finally {
      setIsSubmittingMember(false);
    }
  };

  const handleToggleMemberStatus = async (member: any) => {
    if (!canManage) return;
    const newStatus = member.status === 'ativo' ? 'inativo' : 'ativo';
    try {
      await api.setPastoralMemberStatus(member.id, newStatus);
      showMessage(`Status de ${member.name} alterado para "${newStatus}"!`);
      loadGovernance();
    } catch (err: any) {
      showMessage(err.message || 'Falha ao alterar status', true);
    }
  };

  const filteredPastoralMembers = useMemo(() => {
    return pastoralMembers.filter((m) => {
      // Search filter (handles Thiago / Tiago)
      if (memberSearch.trim()) {
        const q = memberSearch.trim().toLowerCase();
        const name = (m.name || '').toLowerCase();
        const displayName = (m.display_name || '').toLowerCase();
        const email = (m.email || '').toLowerCase();
        const phone = (m.phone || '').toLowerCase();

        const qNormalized = q.replace(/th/g, 't');
        const nameNormalized = name.replace(/th/g, 't');
        const dispNormalized = displayName.replace(/th/g, 't');

        const matchesSearch =
          name.includes(q) ||
          displayName.includes(q) ||
          email.includes(q) ||
          phone.includes(q) ||
          nameNormalized.includes(qNormalized) ||
          dispNormalized.includes(qNormalized);

        if (!matchesSearch) return false;
      }

      // Tab filter
      if (memberFilterTab === 'ativos') return m.status === 'ativo';
      if (memberFilterTab === 'coordenadores') return m.pastoral_role === 'coordenador';
      if (memberFilterTab === 'membros') return m.pastoral_role === 'membro';
      if (memberFilterTab === 'inativos') return m.status === 'inativo' || m.status === 'pendente';
      return true;
    });
  }, [pastoralMembers, memberSearch, memberFilterTab]);

  const handleAssignCapability = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.assignCapability({
        pastoral_member_id: selectedMemberId,
        role_label: roleLabel,
        module: moduleKey,
        actions: ['visualizar', 'criar', 'editar', 'aprovar', 'exportar'],
      });
      showMessage(res.message);
      loadGovernance();
    } catch (err: any) {
      showMessage(err.message, true);
    }
  };

  const handleProposeSuccession = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.executeSuccessionAction({
        action: 'propose',
        coordinator_name: newCoordinatorName,
        role_title: newCoordinatorTitle,
        notes: successionNotes,
      });
      setNewCoordinatorName('');
      setSuccessionNotes('');
      showMessage(res.message);
      loadGovernance();
    } catch (err: any) {
      showMessage(err.message, true);
    }
  };

  const handleSuccessionState = async (action: 'confirm' | 'step_down', targetId: string) => {
    try {
      const res = await api.executeSuccessionAction({
        action,
        target_id: targetId,
      });
      showMessage(res.message);
      loadGovernance();
    } catch (err: any) {
      showMessage(err.message, true);
    }
  };

  const handleBackupNow = async () => {
    try {
      const res = await api.createBackup();
      showMessage(
        `${res.message} (${res.integrity.ordersCount} pedidos / R$ ${(res.integrity.totalAmountCents / 100).toFixed(2)} verificados)`
      );
    } catch (err: any) {
      showMessage(err.message, true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-xl font-bold text-pastoral-cafe flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-pastoral-dourado" />
            Governança, Membros Institucionais, Delegações e Sucessão de Coordenação
          </h2>
          <p className="text-xs text-zinc-500">
            Continuidade institucional da Pastoral Missionária (Pedro e Fernanda → futuras gestões), habilitações e permissões granulares
          </p>
        </div>

        {canManage && (
          <button
            onClick={handleBackupNow}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-pastoral-cafe text-white hover:bg-pastoral-profundo flex items-center gap-2 shadow-xs"
          >
            <Database className="w-4 h-4 text-pastoral-dourado" />
            <span>Gerar Snapshot de Backup Verificado</span>
          </button>
        )}
      </div>

      {feedback && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{feedback}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Card de Aprovações Pendentes e Vínculos Google */}
      {canManage && (
        <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-100">
            <div>
              <h3 className="font-serif font-bold text-base text-pastoral-cafe flex items-center gap-2">
                <Clock className="w-4.5 h-4.5 text-amber-600" />
                <span>Aprovações Pendentes & Contas Google</span>
                {(pendingData.pendingUsers.length > 0 || pendingData.pendingRequests.length > 0) && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                    {pendingData.pendingUsers.length + pendingData.pendingRequests.length} pendente(s)
                  </span>
                )}
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                Revise solicitações de novos missionários que entraram via Google e desejam vincular seus cadastros ou pedidos
              </p>
            </div>

            <div className="text-[11px] text-zinc-400">
              Coordenadores responsáveis: <strong>Pedro e Fernanda</strong>
            </div>
          </div>

          {/* Lista de Solicitações de Vínculo */}
          {pendingData.pendingRequests.length > 0 && (
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-pastoral-cafe uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-pastoral-dourado" />
                Solicitações de Vínculo a Compradores/Membros:
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {pendingData.pendingRequests.map((req) => (
                  <div key={req.id} className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/40 flex flex-col justify-between space-y-2">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-pastoral-cafe">{req.user_name}</span>
                        <span className="text-[10px] text-zinc-400">{req.user_email}</span>
                      </div>
                      <p className="text-xs text-zinc-700 mt-1">
                        Deseja vincular ao comprador: <strong>{req.claimed_member_name}</strong>
                      </p>
                      {req.user_notes && (
                        <p className="text-[11px] text-zinc-500 italic mt-0.5">"{req.user_notes}"</p>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-100">
                      <button
                        onClick={() => handleRejectRequest(req.id)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
                      >
                        Recusar
                      </button>
                      <button
                        onClick={() => handleApproveRequest(req.id, 'membro')}
                        className="px-3 py-1 text-xs font-bold rounded-lg text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 transition-colors flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Aprovar Membro</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lista de Novos Usuários Aguardando Liberação */}
          {pendingData.pendingUsers.length > 0 && (
            <div className="space-y-2.5 pt-2">
              <h4 className="text-xs font-bold text-pastoral-cafe uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-pastoral-dourado" />
                Novos Usuários Google Aguardando Liberação de Papel:
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {pendingData.pendingUsers.map((u) => (
                  <div key={u.id} className="p-3.5 rounded-xl border border-zinc-200 bg-zinc-50 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-xs text-pastoral-cafe">{u.name}</p>
                      <p className="text-[11px] text-zinc-500">{u.email}</p>
                      <span className="text-[10px] text-amber-700 font-semibold uppercase">Status: Pendente</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleApproveUserDirectly(u.id, 'membro')}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg bg-pastoral-dourado text-pastoral-profundo hover:bg-pastoral-dourado-claro"
                      >
                        Aprovar Membro
                      </button>
                      <button
                        onClick={() => handleApproveUserDirectly(u.id, 'delegado')}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-zinc-200 text-zinc-800 hover:bg-zinc-300"
                      >
                        Delegado
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pendingData.pendingUsers.length === 0 && pendingData.pendingRequests.length === 0 && (
            <div className="p-4 rounded-xl bg-zinc-50 text-center text-xs text-zinc-400">
              Nenhuma aprovação de cadastro ou vínculo pendente no momento. Todas as contas estão regulares.
            </div>
          )}

          {/* Formulário de Criação/Convite Institucional Direto */}
          <form onSubmit={handleCreateInstitutionalAccount} className="pt-4 border-t border-zinc-100 space-y-3">
            <h4 className="text-xs font-bold text-pastoral-cafe uppercase tracking-wider flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5 text-pastoral-vinho" />
              Cadastrar ou Pré-Autorizar Conta Google na Pastoral
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Nome do missionário(a)"
                className="px-3 py-2 text-xs rounded-xl border border-zinc-300 bg-white"
                required
              />
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="E-mail Google (Gmail)"
                className="px-3 py-2 text-xs rounded-xl border border-zinc-300 bg-white"
                required
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as any)}
                className="px-3 py-2 text-xs rounded-xl border border-zinc-300 bg-white"
              >
                <option value="coordenador">Papel: Coordenador(a)</option>
                <option value="delegado">Papel: Delegado(a)</option>
                <option value="membro">Papel: Membro</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={isInviting}
              className="w-full py-2 px-4 rounded-xl text-xs font-bold bg-pastoral-vinho text-white hover:bg-pastoral-cafe transition-colors disabled:opacity-50"
            >
              {isInviting ? 'Registrando...' : 'Cadastrar / Pré-autorizar Conta'}
            </button>
          </form>
        </div>
      )}

      {/* Row 1: Coordenação e Sucessão + Delegações por Módulo */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card Sucessão de Coordenação */}
        <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif font-bold text-base text-pastoral-cafe flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-pastoral-dourado" />
                Coordenação em Exercício & Transição Segura
              </h3>
              <p className="text-xs text-zinc-500">
                Regra institucional: o sistema bloqueia a saída do último coordenador ativo sem sucessor confirmado
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            {successionHistory.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl border border-zinc-200 bg-pastoral-creme/40 flex flex-wrap items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-pastoral-cafe">
                      {item.coordinator_name}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        item.status === 'ativo'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.status === 'proposto'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-zinc-200 text-zinc-600'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-600">{item.role_title}</p>
                  <p className="text-[10px] text-zinc-400">
                    Início: {item.started_at} {item.ended_at ? `• Término: ${item.ended_at}` : ''}
                  </p>
                </div>

                {canManage && (
                  <div className="flex items-center gap-1.5">
                    {item.status === 'proposto' && (
                      <button
                        onClick={() => handleSuccessionState('confirm', item.id)}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        Confirmar Posse
                      </button>
                    )}
                    {item.status === 'ativo' && (
                      <button
                        onClick={() => handleSuccessionState('step_down', item.id)}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-zinc-100 hover:bg-rose-50 text-zinc-700 hover:text-rose-700 border border-zinc-200"
                      >
                        Concluir Mandato
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {canManage && (
            <form
              onSubmit={handleProposeSuccession}
              className="pt-3 border-t border-zinc-100 space-y-3"
            >
              <h4 className="text-xs font-bold text-pastoral-cafe uppercase tracking-wider">
                Registrar Proposta de Novo Coordenador(a) / Sucessor(a)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  value={newCoordinatorName}
                  onChange={(e) => setNewCoordinatorName(e.target.value)}
                  placeholder="Nome do futuro coordenador(a)"
                  className="px-3 py-2 text-xs rounded-xl border border-zinc-300"
                  required
                />
                <input
                  type="text"
                  value={newCoordinatorTitle}
                  onChange={(e) => setNewCoordinatorTitle(e.target.value)}
                  placeholder="Cargo institucional"
                  className="px-3 py-2 text-xs rounded-xl border border-zinc-300"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 px-4 rounded-xl text-xs font-bold bg-pastoral-dourado text-pastoral-profundo"
              >
                Registrar Proposta de Transição
              </button>
            </form>
          )}
        </div>

        {/* Card Administradores Delegados por Módulo */}
        <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-xs space-y-4">
          <div>
            <h3 className="font-serif font-bold text-base text-pastoral-cafe flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-pastoral-dourado" />
              Administradores Delegados & Permissões por Módulo
            </h3>
            <p className="text-xs text-zinc-500">
              Conceda responsabilidades específicas (ex: Camisetas, Laboratórios, Calendário) sem conceder acesso irrestrito
            </p>
          </div>

          {canManage && (
            <form onSubmit={handleAssignCapability} className="space-y-3 p-4 rounded-xl bg-zinc-50 border border-zinc-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-zinc-300 bg-white"
                >
                  {pastoralMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  value={roleLabel}
                  onChange={(e) => setRoleLabel(e.target.value)}
                  placeholder="Ex: Responsável pelos Laboratórios"
                  className="px-3 py-2 text-xs rounded-xl border border-zinc-300 bg-white"
                  required
                />

                <select
                  value={moduleKey}
                  onChange={(e) => setModuleKey(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-zinc-300 bg-white"
                >
                  {MODULES_OPTIONS.map((mod) => (
                    <option key={mod.key} value={mod.key}>
                      Módulo: {mod.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-2 px-4 rounded-xl text-xs font-bold bg-pastoral-cafe text-white"
              >
                Conceder Delegação por Módulo
              </button>
            </form>
          )}

          <div className="space-y-2">
            {capabilities.length === 0 ? (
              <p className="text-xs text-zinc-400 py-4 text-center">
                Nenhuma delegação específica cadastrada além dos coordenadores gerais (Pedro e Fernanda).
              </p>
            ) : (
              capabilities.map((cap) => (
                <div
                  key={cap.id}
                  className="p-3 rounded-xl border border-zinc-200 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-pastoral-cafe">{cap.member_name}</span>
                    <span className="mx-2 text-zinc-300">•</span>
                    <span className="font-semibold text-pastoral-vinho">{cap.role_label}</span>
                    <p className="text-[10px] text-zinc-500">
                      Módulo: <strong>{cap.module}</strong> ({(cap.actions || []).join(', ')})
                    </p>
                  </div>
                  <span className="text-[10px] text-zinc-400">Por {cap.granted_by}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Gestão Integral de Missionários & Habilitações Pastorais */}
      <div className="bg-white p-6 rounded-3xl border border-zinc-200/80 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-zinc-100">
          <div>
            <h3 className="font-serif font-bold text-lg text-pastoral-cafe flex items-center gap-2">
              <Users className="w-5 h-5 text-pastoral-dourado" />
              <span>Gestão de Membros Missionários ({pastoralMembers.length})</span>
            </h3>
            <p className="text-xs text-zinc-500">
              Cadastro oficial da Pastoral Missionária: controle de papéis, habilitações, aniversários e contatos
            </p>
          </div>

          {canManage && (
            <button
              type="button"
              onClick={handleOpenNewMemberModal}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-pastoral-dourado text-pastoral-profundo hover:brightness-105 shadow-xs flex items-center gap-1.5 transition-all self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Missionário</span>
            </button>
          )}
        </div>

        {/* Barra de Filtros e Busca */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Abas de Filtro de Papel / Status */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-zinc-100/80 text-xs">
            <button
              type="button"
              onClick={() => setMemberFilterTab('todos')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                memberFilterTab === 'todos'
                  ? 'bg-white text-pastoral-cafe shadow-2xs'
                  : 'text-zinc-600 hover:text-pastoral-cafe'
              }`}
            >
              Todos ({pastoralMembers.length})
            </button>
            <button
              type="button"
              onClick={() => setMemberFilterTab('ativos')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                memberFilterTab === 'ativos'
                  ? 'bg-white text-emerald-800 shadow-2xs'
                  : 'text-zinc-600 hover:text-emerald-800'
              }`}
            >
              Ativos ({pastoralMembers.filter((m) => m.status === 'ativo').length})
            </button>
            <button
              type="button"
              onClick={() => setMemberFilterTab('coordenadores')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                memberFilterTab === 'coordenadores'
                  ? 'bg-white text-pastoral-vinho shadow-2xs'
                  : 'text-zinc-600 hover:text-pastoral-vinho'
              }`}
            >
              Coordenadores ({pastoralMembers.filter((m) => m.pastoral_role === 'coordenador').length})
            </button>
            <button
              type="button"
              onClick={() => setMemberFilterTab('membros')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                memberFilterTab === 'membros'
                  ? 'bg-white text-pastoral-cafe shadow-2xs'
                  : 'text-zinc-600 hover:text-pastoral-cafe'
              }`}
            >
              Membros ({pastoralMembers.filter((m) => m.pastoral_role === 'membro').length})
            </button>
            <button
              type="button"
              onClick={() => setMemberFilterTab('inativos')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                memberFilterTab === 'inativos'
                  ? 'bg-white text-zinc-800 shadow-2xs'
                  : 'text-zinc-600 hover:text-zinc-800'
              }`}
            >
              Inativos ({pastoralMembers.filter((m) => m.status !== 'ativo').length})
            </button>
          </div>

          {/* Campo de Pesquisa Instantânea */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="Pesquisar por nome, Thiago/Tiago, e-mail..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-zinc-200 bg-white focus:outline-none focus:ring-1 focus:ring-pastoral-dourado"
            />
            {memberSearch && (
              <button
                type="button"
                onClick={() => setMemberSearch('')}
                className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600 text-xs"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Lista de Missionários */}
        {filteredPastoralMembers.length === 0 ? (
          <div className="py-12 text-center text-zinc-400 text-xs space-y-1">
            <p>Nenhum missionário encontrado para esta busca ou filtro.</p>
            <p className="text-[11px] text-zinc-400">Tente buscar por outro termo ou limpar os filtros.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredPastoralMembers.map((m) => {
              const isCoord = m.pastoral_role === 'coordenador';
              const isActive = m.status === 'ativo';
              const initial = (m.name || 'M').charAt(0).toUpperCase();

              return (
                <div
                  key={m.id}
                  className={`p-4 rounded-2xl border transition-all space-y-3 ${
                    isActive
                      ? 'bg-white border-zinc-200 shadow-2xs hover:shadow-xs'
                      : 'bg-zinc-50 border-zinc-200 opacity-80'
                  }`}
                >
                  {/* Top: Avatar, Nome, Papel e Ações */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl font-serif font-bold text-sm flex items-center justify-center flex-shrink-0 ${
                          isCoord
                            ? 'bg-pastoral-vinho text-white shadow-2xs'
                            : 'bg-pastoral-creme text-pastoral-cafe border border-pastoral-dourado/30'
                        }`}
                      >
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-pastoral-cafe truncate" title={m.name}>
                          {m.name}
                        </h4>
                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                          <span
                            className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md ${
                              isCoord
                                ? 'bg-pastoral-vinho/10 text-pastoral-vinho'
                                : 'bg-pastoral-creme text-pastoral-cafe'
                            }`}
                          >
                            {isCoord ? 'Coordenador(a)' : m.pastoral_role}
                          </span>
                          <span
                            className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md ${
                              isActive
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-zinc-200 text-zinc-600'
                            }`}
                          >
                            {m.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Botões de Ação Rápida */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => setViewingMember(m)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-pastoral-cafe hover:bg-zinc-100 transition-colors"
                        title="Ver detalhes do missionário"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {canManage && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenEditMemberModal(m)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-pastoral-dourado hover:bg-zinc-100 transition-colors"
                            title="Editar missionário"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleMemberStatus(m)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isActive
                                ? 'text-zinc-400 hover:text-rose-600 hover:bg-rose-50'
                                : 'text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={isActive ? 'Desativar missionário' : 'Ativar missionário'}
                          >
                            {isActive ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Informações Complementares: Contatos & Aniversário */}
                  <div className="text-[11px] text-zinc-500 space-y-1 pt-1 border-t border-zinc-100">
                    {m.phone && (
                      <div className="flex items-center gap-1.5 truncate">
                        <Phone className="w-3 h-3 text-zinc-400 flex-shrink-0" />
                        <span className="truncate">{m.phone}</span>
                      </div>
                    )}
                    {m.email && (
                      <div className="flex items-center gap-1.5 truncate">
                        <Mail className="w-3 h-3 text-zinc-400 flex-shrink-0" />
                        <span className="truncate">{m.email}</span>
                      </div>
                    )}
                    {m.birth_day && m.birth_month && (
                      <div className="flex items-center gap-1.5 text-pastoral-vinho font-medium">
                        <Cake className="w-3 h-3 flex-shrink-0 text-pastoral-dourado" />
                        <span>
                          Aniversário: {String(m.birth_day).padStart(2, '0')}/{String(m.birth_month).padStart(2, '0')}
                          {m.birth_year ? `/${m.birth_year}` : ''}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Habilitações Pastorais */}
                  <div className="space-y-1 pt-1.5 border-t border-zinc-100">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase block">
                        Habilitações Pastorais:
                      </span>
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => handleOpenQualsModal(m)}
                          className="text-[10px] font-bold text-pastoral-dourado hover:text-pastoral-cafe hover:underline flex items-center gap-1 transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Editar Funções</span>
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {QUALIFICATIONS_OPTIONS.map((qual) => {
                        const hasQual = (m.qualifications || []).includes(qual);
                        return (
                          <button
                            key={qual}
                            type="button"
                            onClick={() => (canManage ? handleOpenQualsModal(m) : undefined)}
                            className={`text-[9px] px-2 py-0.5 rounded-md font-semibold transition-all ${
                              hasQual
                                ? 'bg-pastoral-cafe text-pastoral-dourado-claro shadow-2xs font-bold'
                                : 'bg-white border border-zinc-200 text-zinc-400 hover:text-zinc-700'
                            }`}
                            title={canManage ? 'Clique para editar habilitações' : qual}
                          >
                            {qual}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Novo Missionário */}
      {isNewMemberModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-pastoral-dourado/40 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <h3 className="font-serif font-bold text-base text-pastoral-cafe flex items-center gap-2">
                <UserPlus className="w-4.5 h-4.5 text-pastoral-dourado" />
                <span>Cadastrar Novo Missionário</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsNewMemberModalOpen(false)}
                className="p-1 rounded text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewMember} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ex: Gabriel Alves"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                    Como gosta de ser chamado
                  </label>
                  <input
                    type="text"
                    value={formDisplayName}
                    onChange={(e) => setFormDisplayName(e.target.value)}
                    placeholder="Ex: Biel"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                    Papel na Pastoral *
                  </label>
                  <select
                    value={formPastoralRole}
                    onChange={(e) => setFormPastoralRole(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 bg-white"
                  >
                    <option value="membro">Membro</option>
                    <option value="coordenador">Coordenador</option>
                    <option value="apoio">Apoio</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="exemplo@gmail.com"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="(61) 99999-9999"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                    Data de Nascimento (Aniversário)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={formBirthDay}
                      onChange={(e) => setFormBirthDay(e.target.value ? Number(e.target.value) : '')}
                      placeholder="Dia (1-31)"
                      className="px-3 py-2 text-xs rounded-xl border border-zinc-300"
                    />
                    <select
                      value={formBirthMonth}
                      onChange={(e) => setFormBirthMonth(e.target.value ? Number(e.target.value) : '')}
                      className="px-3 py-2 text-xs rounded-xl border border-zinc-300 bg-white"
                    >
                      <option value="">Mês...</option>
                      <option value="1">Janeiro</option>
                      <option value="2">Fevereiro</option>
                      <option value="3">Março</option>
                      <option value="4">Abril</option>
                      <option value="5">Maio</option>
                      <option value="6">Junho</option>
                      <option value="7">Julho</option>
                      <option value="8">Agosto</option>
                      <option value="9">Setembro</option>
                      <option value="10">Outubro</option>
                      <option value="11">Novembro</option>
                      <option value="12">Dezembro</option>
                    </select>
                    <input
                      type="number"
                      min={1920}
                      max={2030}
                      value={formBirthYear}
                      onChange={(e) => setFormBirthYear(e.target.value ? Number(e.target.value) : '')}
                      placeholder="Ano (opcional)"
                      className="px-3 py-2 text-xs rounded-xl border border-zinc-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                    Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 bg-white"
                  >
                    <option value="ativo">Ativo</option>
                    <option value="pendente">Pendente</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                    Visibilidade do Aniversário
                  </label>
                  <select
                    value={formBirthdayVisibility}
                    onChange={(e) => setFormBirthdayVisibility(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 bg-white"
                  >
                    <option value="members">Visível aos membros</option>
                    <option value="all">Público</option>
                    <option value="coordinators">Somente coordenação</option>
                    <option value="private">Privado</option>
                  </select>
                </div>
              </div>

              {/* Habilitações Pastorais Selecionáveis */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                  Habilitações Pastorais Iniciais
                </label>
                <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-zinc-50 border border-zinc-200">
                  {QUALIFICATIONS_OPTIONS.map((qual) => {
                    const isSelected = formQualifications.includes(qual);
                    return (
                      <button
                        key={qual}
                        type="button"
                        onClick={() => handleToggleFormQualification(qual)}
                        className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-all ${
                          isSelected
                            ? 'bg-pastoral-cafe text-pastoral-dourado-claro shadow-2xs'
                            : 'bg-white border border-zinc-200 text-zinc-500 hover:text-zinc-800'
                        }`}
                      >
                        {qual}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                  Observações Pastorais (Opcional)
                </label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Anotações internas de acompanhamento espiritual ou pastoral..."
                  rows={2}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsNewMemberModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-zinc-600 hover:bg-zinc-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingMember}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-pastoral-profundo bg-pastoral-dourado hover:brightness-105 shadow-xs disabled:opacity-50"
                >
                  {isSubmittingMember ? 'Salvando...' : 'Cadastrar Missionário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Missionário */}
      {editingMember && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-pastoral-dourado/40 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <h3 className="font-serif font-bold text-base text-pastoral-cafe flex items-center gap-2">
                <Edit2 className="w-4.5 h-4.5 text-pastoral-dourado" />
                <span>Editar Dados do Missionário</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="p-1 rounded text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditMember} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                    Nome de Exibição
                  </label>
                  <input
                    type="text"
                    value={formDisplayName}
                    onChange={(e) => setFormDisplayName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                    Papel na Pastoral *
                  </label>
                  <select
                    value={formPastoralRole}
                    onChange={(e) => setFormPastoralRole(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 bg-white"
                  >
                    <option value="membro">Membro</option>
                    <option value="coordenador">Coordenador</option>
                    <option value="apoio">Apoio</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                    E-mail
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                    Data de Nascimento (Aniversário)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={formBirthDay}
                      onChange={(e) => setFormBirthDay(e.target.value ? Number(e.target.value) : '')}
                      placeholder="Dia"
                      className="px-3 py-2 text-xs rounded-xl border border-zinc-300"
                    />
                    <select
                      value={formBirthMonth}
                      onChange={(e) => setFormBirthMonth(e.target.value ? Number(e.target.value) : '')}
                      className="px-3 py-2 text-xs rounded-xl border border-zinc-300 bg-white"
                    >
                      <option value="">Mês...</option>
                      <option value="1">Janeiro</option>
                      <option value="2">Fevereiro</option>
                      <option value="3">Março</option>
                      <option value="4">Abril</option>
                      <option value="5">Maio</option>
                      <option value="6">Junho</option>
                      <option value="7">Julho</option>
                      <option value="8">Agosto</option>
                      <option value="9">Setembro</option>
                      <option value="10">Outubro</option>
                      <option value="11">Novembro</option>
                      <option value="12">Dezembro</option>
                    </select>
                    <input
                      type="number"
                      min={1920}
                      max={2030}
                      value={formBirthYear}
                      onChange={(e) => setFormBirthYear(e.target.value ? Number(e.target.value) : '')}
                      placeholder="Ano (opcional)"
                      className="px-3 py-2 text-xs rounded-xl border border-zinc-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                    Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 bg-white"
                  >
                    <option value="ativo">Ativo</option>
                    <option value="pendente">Pendente</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                    Visibilidade do Aniversário
                  </label>
                  <select
                    value={formBirthdayVisibility}
                    onChange={(e) => setFormBirthdayVisibility(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300 bg-white"
                  >
                    <option value="members">Visível aos membros</option>
                    <option value="all">Público</option>
                    <option value="coordinators">Somente coordenação</option>
                    <option value="private">Privado</option>
                  </select>
                </div>
              </div>

              {/* Habilitações Pastorais Selecionáveis */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                  Habilitações Pastorais
                </label>
                <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-zinc-50 border border-zinc-200">
                  {QUALIFICATIONS_OPTIONS.map((qual) => {
                    const isSelected = formQualifications.includes(qual);
                    return (
                      <button
                        key={qual}
                        type="button"
                        onClick={() => handleToggleFormQualification(qual)}
                        className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-all ${
                          isSelected
                            ? 'bg-pastoral-cafe text-pastoral-dourado-claro shadow-2xs'
                            : 'bg-white border border-zinc-200 text-zinc-500 hover:text-zinc-800'
                        }`}
                      >
                        {qual}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-600 uppercase mb-1">
                  Observações Pastorais
                </label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Anotações internas de acompanhamento espiritual ou pastoral..."
                  rows={2}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-300"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="px-4 py-2 rounded-xl text-xs text-zinc-600 hover:bg-zinc-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingMember}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-pastoral-profundo bg-pastoral-dourado hover:brightness-105 shadow-xs disabled:opacity-50"
                >
                  {isSubmittingMember ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Visualizar Dossiê do Missionário */}
      {viewingMember && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-pastoral-dourado/40 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <h3 className="font-serif font-bold text-base text-pastoral-cafe flex items-center gap-2">
                <Sparkles className="w-4.5 h-4.5 text-pastoral-dourado" />
                <span>Perfil Missionário</span>
              </h3>
              <button
                type="button"
                onClick={() => setViewingMember(null)}
                className="p-1 rounded text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-pastoral-cafe text-pastoral-dourado font-serif font-bold text-lg flex items-center justify-center shadow-xs">
                  {(viewingMember.name || 'M').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-serif font-bold text-base text-pastoral-cafe">
                    {viewingMember.name}
                  </h4>
                  <p className="text-xs text-zinc-500">
                    Chamado carinhosamente de: <strong>{viewingMember.display_name || viewingMember.name}</strong>
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-pastoral-creme/40 border border-pastoral-dourado/20 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Papel Institucional:</span>
                  <span className="font-bold text-pastoral-cafe uppercase">{viewingMember.pastoral_role}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Status:</span>
                  <span className="font-bold text-emerald-800 uppercase">{viewingMember.status}</span>
                </div>
                {viewingMember.phone && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Telefone / WhatsApp:</span>
                    <span className="font-semibold text-zinc-700">{viewingMember.phone}</span>
                  </div>
                )}
                {viewingMember.email && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">E-mail:</span>
                    <span className="font-semibold text-zinc-700">{viewingMember.email}</span>
                  </div>
                )}
                {viewingMember.birth_day && viewingMember.birth_month && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Aniversário:</span>
                    <span className="font-bold text-pastoral-vinho">
                      Dia {String(viewingMember.birth_day).padStart(2, '0')}/{String(viewingMember.birth_month).padStart(2, '0')}
                      {viewingMember.birth_year ? `/${viewingMember.birth_year}` : ''}
                    </span>
                  </div>
                )}
                {viewingMember.joined_at && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Ingresso na Pastoral:</span>
                    <span className="font-semibold text-zinc-700">{viewingMember.joined_at}</span>
                  </div>
                )}
              </div>

              <div>
                <span className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">
                  Habilitações Pastorais Confirmadas:
                </span>
                <div className="flex flex-wrap gap-1">
                  {(viewingMember.qualifications || []).length === 0 ? (
                    <span className="text-xs text-zinc-400 italic">Nenhuma habilitação atribuída ainda.</span>
                  ) : (
                    (viewingMember.qualifications || []).map((q: string) => (
                      <span
                        key={q}
                        className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-pastoral-cafe text-pastoral-dourado-claro shadow-2xs"
                      >
                        {q}
                      </span>
                    ))
                  )}
                </div>
              </div>

              {viewingMember.notes && (
                <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs space-y-1">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase block">Observações:</span>
                  <p className="text-zinc-700 leading-relaxed italic">{viewingMember.notes}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
              {canManage && (
                <button
                  type="button"
                  onClick={() => {
                    const target = viewingMember;
                    setViewingMember(null);
                    handleOpenEditMemberModal(target);
                  }}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-pastoral-profundo bg-pastoral-dourado hover:brightness-105"
                >
                  Editar Dados
                </button>
              )}
              <button
                type="button"
                onClick={() => setViewingMember(null)}
                className="px-4 py-1.5 rounded-xl text-xs text-zinc-600 hover:bg-zinc-100"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal: Edição Dedicada de Habilitações Pastorais (Seção 5.3) */}
      {qualsModalMember && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-pastoral-dourado/40 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <div>
                <span className="text-[10px] font-bold text-pastoral-dourado uppercase tracking-wider block">
                  Ministérios e Funções Pastorais
                </span>
                <h3 className="font-serif font-bold text-base text-pastoral-cafe">
                  {qualsModalMember.display_name || qualsModalMember.name}
                </h3>
              </div>
              <button
                onClick={() => setQualsModalMember(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500 font-medium">
                  {selectedQuals.length} de {QUALIFICATIONS_OPTIONS.length} selecionadas
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAllQuals}
                    className="text-[11px] font-bold text-pastoral-vinho hover:underline"
                  >
                    Marcar Todas
                  </button>
                  <span className="text-zinc-300">|</span>
                  <button
                    type="button"
                    onClick={handleClearAllQuals}
                    className="text-[11px] font-semibold text-zinc-500 hover:text-zinc-800"
                  >
                    Desmarcar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                {QUALIFICATIONS_OPTIONS.map((qual) => {
                  const isSelected = selectedQuals.includes(qual);
                  return (
                    <button
                      key={qual}
                      type="button"
                      onClick={() => handleToggleQualInModal(qual)}
                      className={`p-3 rounded-2xl border text-left flex items-center justify-between transition-all ${
                        isSelected
                          ? 'bg-pastoral-cafe text-pastoral-creme border-pastoral-cafe shadow-xs font-bold'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:bg-zinc-100 font-medium'
                      }`}
                    >
                      <span className="text-xs">{qual}</span>
                      {isSelected ? (
                        <div className="w-4 h-4 rounded-full bg-pastoral-dourado text-pastoral-profundo flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-zinc-300" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setQualsModalMember(null)}
                className="px-4 py-2 rounded-xl text-xs text-zinc-600 hover:bg-zinc-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSavingQuals}
                onClick={handleSaveQualifications}
                className="px-5 py-2 rounded-xl text-xs font-bold text-pastoral-profundo bg-pastoral-dourado hover:brightness-105 shadow-gold flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                {isSavingQuals ? (
                  <span>Salvando...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Salvar Habilitações</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
