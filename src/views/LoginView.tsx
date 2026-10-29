import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { PublicPortalView } from './PublicPortalView';
import { Cross, Lock, Mail, ArrowRight, Globe } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@pastoralmissionaria.com.br');
  const [password, setPassword] = useState('pastoral@2026');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPublicPortal, setShowPublicPortal] = useState(false);

  if (showPublicPortal) {
    return <PublicPortalView onBackToLogin={() => setShowPublicPortal(false)} isAuthenticated={false} />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Falha no login. Verifique o e-mail ou a senha.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (userEmail: string, userPass: string) => {
    setEmail(userEmail);
    setPassword(userPass);
  };

  return (
    <div className="min-h-screen bg-pastoral-profundo flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background glows */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-pastoral-vinho/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-pastoral-dourado/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white rounded-3xl shadow-pastoral-lg border border-pastoral-dourado/30 overflow-hidden relative z-10 animate-fade-in">
        {/* Top Catholic Pastoral Header */}
        <div className="bg-gradient-to-b from-pastoral-cafe to-pastoral-profundo p-7 text-white text-center relative border-b border-pastoral-dourado/30">
          <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-pastoral-dourado to-pastoral-dourado-claro p-0.5 shadow-gold">
            <div className="w-full h-full bg-pastoral-profundo rounded-[14px] flex items-center justify-center">
              <Cross className="w-8 h-8 text-pastoral-dourado" />
            </div>
          </div>

          <h1 className="font-serif font-bold text-2xl text-white tracking-tight">
            Pastoral Missionária
          </h1>
          <p className="text-xs text-pastoral-dourado-claro font-semibold mt-0.5 tracking-wide uppercase">
            Ágape Apostolado de Jovens • Planaltina-DF
          </p>
          <p className="text-[11px] text-pastoral-rosa-antigo mt-2.5 italic font-serif">
            "Tenha Jesus Cristo em seu coração, e todas as cruzes do mundo parecerão rosas." — São Padre Pio
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider mb-1">
                E-mail Institucional
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@pastoralmissionaria.com.br"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-zinc-300 rounded-xl focus:ring-2 focus:ring-pastoral-dourado focus:border-pastoral-dourado"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider mb-1">
                Senha de Acesso
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-zinc-300 rounded-xl focus:ring-2 focus:ring-pastoral-dourado focus:border-pastoral-dourado"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-gradient-to-r from-pastoral-dourado to-pastoral-dourado-claro hover:brightness-105 text-pastoral-profundo shadow-gold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              <span>{isLoading ? 'Autenticando...' : 'Entrar no Ecossistema da Pastoral'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Public Institutional Portal Button */}
          <button
            type="button"
            onClick={() => setShowPublicPortal(true)}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-pastoral-creme hover:bg-pastoral-creme-escuro text-pastoral-cafe border border-pastoral-dourado/40 flex items-center justify-center gap-2 transition-colors"
          >
            <Globe className="w-4 h-4 text-pastoral-dourado" />
            <span>Conhecer a Pastoral, Padroeiro & Calendário 2027 (Público)</span>
          </button>

          {/* Quick-Fill buttons */}
          <div className="pt-3 border-t border-zinc-100 text-center">
            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
              Perfis de Acesso Rápido:
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('admin@pastoralmissionaria.com.br', 'pastoral@2026')}
                className="py-1.5 px-2 rounded-lg text-[10px] font-semibold bg-pastoral-cafe/10 text-pastoral-cafe hover:bg-pastoral-cafe hover:text-white transition-colors"
              >
                Admin / Tech
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('coordenacao@pastoralmissionaria.com.br', 'coordenacao@2026')}
                className="py-1.5 px-2 rounded-lg text-[10px] font-semibold bg-blue-50 text-blue-800 hover:bg-blue-600 hover:text-white transition-colors"
              >
                Coordenação
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('consulta@pastoralmissionaria.com.br', 'consulta@2026')}
                className="py-1.5 px-2 rounded-lg text-[10px] font-semibold bg-zinc-100 text-zinc-700 hover:bg-zinc-600 hover:text-white transition-colors"
              >
                Missionário
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-zinc-50 border-t border-zinc-100 text-center text-[10px] text-zinc-400">
          Paróquia São Vicente de Paulo • Padroeiro São Padre Pio de Pietrelcina
        </div>
      </div>
    </div>
  );
};
