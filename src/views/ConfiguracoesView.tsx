import React, { useState, useEffect } from 'react';
import { InstitutionalSettings, User, UserRole } from '../types';
import { api } from '../services/api';
import { Settings, Shield, Download, Users, Plus, Trash2, Save, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Modal } from '../components/common/Modal';

export const ConfiguracoesView: React.FC = () => {
  const { user, isAdmin } = useAuth();

  const [settings, setSettings] = useState<InstitutionalSettings>({
    pastoral_name: 'Pastoral Missionária',
    movement_name: 'Ágape Apostolado de Jovens',
    parish_name: 'Paróquia São Vicente de Paulo',
    location: 'Planaltina - DF',
    patron: 'São Padre Pio de Pietrelcina',
    quote_1: 'Uma só coisa é necessária: Estar perto de Jesus.',
    quote_2: 'Tenha Jesus Cristo em seu coração, e todas as cruzes do mundo parecerão rosas.',
    pix_key: 'pastoralmissionaria@agape.org.br',
    instagram: '@pastoralmissionaria_',
  });

  const [usersList, setUsersList] = useState<User[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New user modal
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('coordenador');

  useEffect(() => {
    api.getInstitutionalSettings().then(setSettings).catch(console.error);
    if (isAdmin) {
      api.getUsers().then(setUsersList).catch(console.error);
    }
  }, [isAdmin]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.updateInstitutionalSettings(settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar configurações.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createUser({
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        password: newUserPassword,
        role: newUserRole,
      });
      setIsNewUserModalOpen(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      const updated = await api.getUsers();
      setUsersList(updated);
    } catch (err: any) {
      alert(err.message || 'Erro ao criar usuário.');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Deseja realmente excluir este usuário?')) return;
    try {
      await api.deleteUser(id);
      const updated = await api.getUsers();
      setUsersList(updated);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDownloadBackup = () => {
    const link = document.createElement('a');
    link.href = '/api/settings/backup/export';
    link.setAttribute('download', `backup_pastoral_missionaria_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="font-serif text-xl font-bold text-pastoral-cafe flex items-center gap-2">
          <Settings className="w-5 h-5 text-pastoral-dourado" />
          Configurações Gerais e Administração
        </h2>
        <p className="text-xs text-zinc-500">
          Dados institucionais, gestão de usuários com controle de acesso e backup do banco de dados
        </p>
      </div>

      {/* Institutional Settings Card */}
      <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-sm space-y-4">
        <div className="border-b border-zinc-200 pb-3">
          <h3 className="font-serif font-bold text-base text-pastoral-cafe">
            Informações Institucionais da Pastoral
          </h3>
          <p className="text-xs text-zinc-500">
            Aparecem nos cabeçalhos, relatórios em PDF e mensagens automáticas
          </p>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider mb-1">
                Nome da Pastoral
              </label>
              <input
                type="text"
                value={settings.pastoral_name}
                onChange={(e) => setSettings({ ...settings, pastoral_name: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-xl"
                disabled={!isAdmin}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider mb-1">
                Movimento / Apostolado
              </label>
              <input
                type="text"
                value={settings.movement_name}
                onChange={(e) => setSettings({ ...settings, movement_name: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-xl"
                disabled={!isAdmin}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider mb-1">
                Paróquia
              </label>
              <input
                type="text"
                value={settings.parish_name}
                onChange={(e) => setSettings({ ...settings, parish_name: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-xl"
                disabled={!isAdmin}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider mb-1">
                Cidade / DF
              </label>
              <input
                type="text"
                value={settings.location}
                onChange={(e) => setSettings({ ...settings, location: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-xl"
                disabled={!isAdmin}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider mb-1">
                Santo Padroeiro
              </label>
              <input
                type="text"
                value={settings.patron}
                onChange={(e) => setSettings({ ...settings, patron: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-xl"
                disabled={!isAdmin}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider mb-1">
                Chave Pix da Pastoral (para cobranças)
              </label>
              <input
                type="text"
                value={settings.pix_key}
                onChange={(e) => setSettings({ ...settings, pix_key: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-xl font-mono text-pastoral-cafe font-bold"
                disabled={!isAdmin}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider mb-1">
              Frase Institucional Principal
            </label>
            <input
              type="text"
              value={settings.quote_1}
              onChange={(e) => setSettings({ ...settings, quote_1: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-xl italic font-serif"
              disabled={!isAdmin}
            />
          </div>

          {isAdmin && (
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-pastoral-cafe hover:bg-pastoral-profundo text-white shadow-sm flex items-center gap-2 transition-all"
              >
                {saveSuccess ? <Check className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4 text-pastoral-dourado" />}
                {saveSuccess ? 'Configurações Salvas!' : isSaving ? 'Salvando...' : 'Salvar Informações'}
              </button>
            </div>
          )}
        </form>
      </div>

      {/* User Management Section (Admin Only) */}
      {isAdmin && (
        <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-sm space-y-4">
          <div className="border-b border-zinc-200 pb-3 flex items-center justify-between">
            <div>
              <h3 className="font-serif font-bold text-base text-pastoral-cafe flex items-center gap-2">
                <Shield className="w-4 h-4 text-pastoral-dourado" />
                Usuários e Controle de Acesso
              </h3>
              <p className="text-xs text-zinc-500">
                Perfis: <b>Administrador</b> (total), <b>Coordenador</b> (pedidos e pagamentos) e <b>Consulta</b> (somente leitura)
              </p>
            </div>

            <button
              onClick={() => setIsNewUserModalOpen(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-pastoral-dourado text-pastoral-profundo hover:brightness-105 shadow-gold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar Usuário
            </button>
          </div>

          <div className="overflow-x-auto border border-zinc-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 font-semibold text-zinc-600">
                <tr>
                  <th className="px-4 py-2.5">Nome</th>
                  <th className="px-4 py-2.5">E-mail</th>
                  <th className="px-3 py-2.5 text-center">Perfil</th>
                  <th className="px-4 py-2.5 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {usersList.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-3 font-bold text-pastoral-cafe">{u.name}</td>
                    <td className="px-4 py-3 text-zinc-600 font-mono text-[11px]">{u.email}</td>
                    <td className="px-3 py-3 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          u.role === 'admin'
                            ? 'bg-pastoral-cafe text-white'
                            : u.role === 'coordenador'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-zinc-100 text-zinc-600'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {u.id !== user?.id && (
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-1 rounded text-rose-600 hover:bg-rose-50"
                          title="Remover usuário"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Database Backup Section */}
      <div className="bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-sm space-y-4">
        <div className="border-b border-zinc-200 pb-3">
          <h3 className="font-serif font-bold text-base text-pastoral-cafe flex items-center gap-2">
            <Download className="w-4 h-4 text-pastoral-dourado" />
            Cópia de Segurança (Backup Completo)
          </h3>
          <p className="text-xs text-zinc-500">
            Os registros já persistem no banco relacional local, mas você pode baixar um arquivo JSON com todos os membros, pedidos e lançamentos contábeis.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-pastoral-creme/50 rounded-xl border border-pastoral-dourado/20">
          <div>
            <p className="text-xs font-bold text-pastoral-cafe">Exportar Arquivo de Backup JSON</p>
            <p className="text-[11px] text-zinc-500">
              Arquivo estruturado compatível com migrações, auditoria externa e restauração
            </p>
          </div>

          <button
            onClick={handleDownloadBackup}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-pastoral-cafe hover:bg-pastoral-profundo text-white shadow-sm flex items-center gap-2 transition-all flex-shrink-0"
          >
            <Download className="w-4 h-4 text-pastoral-dourado" />
            Baixar Backup Agora
          </button>
        </div>
      </div>

      {/* Add User Modal */}
      <Modal
        isOpen={isNewUserModalOpen}
        onClose={() => setIsNewUserModalOpen(false)}
        title="Adicionar Usuário ao Sistema"
        subtitle="Controle de Acesso da Pastoral"
        maxWidth="md"
      >
        <form onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider mb-1">
              Nome Completo *
            </label>
            <input
              type="text"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              placeholder="Ex.: Lucas Gabriel"
              className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-xl"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider mb-1">
              E-mail de Login *
            </label>
            <input
              type="email"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              placeholder="lucas@pastoralmissionaria.com.br"
              className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-xl"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider mb-1">
              Senha de Acesso *
            </label>
            <input
              type="password"
              value={newUserPassword}
              onChange={(e) => setNewUserPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-xl"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider mb-1">
              Nível de Permissão (Perfil) *
            </label>
            <select
              value={newUserRole}
              onChange={(e) => setNewUserRole(e.target.value as UserRole)}
              className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-xl bg-white font-medium"
            >
              <option value="coordenador">Coordenador (Gerenciar pedidos e registrar pagamentos)</option>
              <option value="admin">Administrador (Acesso total e configurações)</option>
              <option value="consulta">Consulta (Apenas visualização dos relatórios)</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsNewUserModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-600 hover:bg-zinc-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-pastoral-dourado hover:brightness-105 text-pastoral-profundo shadow-gold"
            >
              Criar Usuário
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

