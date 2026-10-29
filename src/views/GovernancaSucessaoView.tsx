import React, { useEffect, useState } from 'react';
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

  const handleToggleQualification = async (member: any, qual: string) => {
    if (!canManage) return;
    const current: string[] = member.qualifications || [];
    const updated = current.includes(qual)
      ? current.filter((q) => q !== qual)
      : [...current, qual];
    await api.updatePastoralMemberGovernance(member.id, {
      qualifications: updated,
    });
    showMessage(`Habilitações de ${member.display_name} atualizadas!`);
    loadGovernance();
  };

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

      {/* Row 2: Cadastro Institucional de Membros e Habilitações Pastorais */}
      <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-serif font-bold text-base text-pastoral-cafe flex items-center gap-2">
              <Users className="w-4 h-4 text-pastoral-dourado" />
              Cadastro Institucional de Missionários & Habilitações Pastorais ({pastoralMembers.length})
            </h3>
            <p className="text-xs text-zinc-500">
              Separado do cadastro de compradores de camisetas. Clique nas habilitações para autorizar ou revogar funções missionárias.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {pastoralMembers.map((m) => (
            <div
              key={m.id}
              className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/40 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-pastoral-cafe">{m.name}</h4>
                  <span className="text-[10px] text-zinc-500 uppercase font-semibold">
                    Papel: {m.pastoral_role} • Status: {m.status}
                  </span>
                </div>
                <UserCheck className="w-4 h-4 text-pastoral-dourado" />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-zinc-500 uppercase block">
                  Habilitações Pastorais Confirmadas:
                </span>
                <div className="flex flex-wrap gap-1">
                  {QUALIFICATIONS_OPTIONS.map((qual) => {
                    const hasQual = (m.qualifications || []).includes(qual);
                    return (
                      <button
                        key={qual}
                        type="button"
                        onClick={() => handleToggleQualification(m, qual)}
                        className={`text-[10px] px-2 py-0.5 rounded-md font-semibold transition-all ${
                          hasQual
                            ? 'bg-pastoral-cafe text-pastoral-dourado-claro shadow-2xs'
                            : 'bg-white border border-zinc-200 text-zinc-400 hover:text-zinc-700'
                        }`}
                      >
                        {qual}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
