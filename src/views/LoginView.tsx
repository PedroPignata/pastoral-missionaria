import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { PublicPortalView } from './PublicPortalView';
import { Cross, Lock, Mail, ArrowRight, Globe, Sparkles, CheckCircle2, UserCheck } from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPublicPortal, setShowPublicPortal] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');

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

  const handleGoogleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleEmail) return;
    setError('');
    setIsLoading(true);
    try {
      await loginWithGoogle({
        email: googleEmail.trim().toLowerCase(),
        name: googleName.trim() || googleEmail.split('@')[0],
      });
      setShowGoogleModal(false);
    } catch (err: any) {
      setError(err.message || 'Falha na autenticação com conta Google.');
    } finally {
      setIsLoading(false);
    }
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

          {/* Primary Action: Google Login */}
          <button
            type="button"
            onClick={() => setShowGoogleModal(true)}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-300 shadow-xs flex items-center justify-center gap-3 transition-all hover:border-pastoral-dourado active:scale-95"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Entrar com Google</span>
          </button>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-zinc-200" />
            <span className="flex-shrink mx-3 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              ou com e-mail institucional
            </span>
            <div className="flex-grow border-t border-zinc-200" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider mb-1">
                E-mail
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@exemplo.com"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-zinc-300 rounded-xl focus:ring-2 focus:ring-pastoral-dourado focus:border-pastoral-dourado"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-pastoral-cafe uppercase tracking-wider mb-1">
                Senha
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
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-pastoral-profundo bg-pastoral-dourado hover:bg-pastoral-dourado-claro shadow-gold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95"
            >
              <span>{isLoading ? 'Entrando...' : 'Entrar no Sistema'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Public Portal Link */}
          <div className="pt-2 text-center border-t border-zinc-100">
            <button
              type="button"
              onClick={() => setShowPublicPortal(true)}
              className="text-xs text-pastoral-vinho hover:text-pastoral-cafe font-semibold flex items-center justify-center gap-1.5 mx-auto transition-colors"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Acessar Portal Institucional Público</span>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="p-4 bg-zinc-50 border-t border-zinc-100 text-center text-[10px] text-zinc-400">
          <p>Coordenação da Pastoral Missionária: Pedro e Fernanda</p>
          <p className="mt-0.5">Paróquia São Vicente de Paulo — Planaltina-DF</p>
        </div>
      </div>

      {/* Google Login Prompt Modal */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-pastoral-profundo/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden">
            <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <h3 className="font-serif font-bold text-sm text-zinc-800">Entrar com a Conta Google</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGoogleModal(false)}
                className="text-zinc-400 hover:text-zinc-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGoogleSubmit} className="p-5 space-y-4">
              <p className="text-xs text-zinc-600">
                Informe o seu e-mail do Google (Gmail) para conectar ou criar seu cadastro na Pastoral:
              </p>

              <div>
                <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">
                  Seu Nome
                </label>
                <input
                  type="text"
                  value={googleName}
                  onChange={(e) => setGoogleName(e.target.value)}
                  placeholder="Ex: Duda Fernandes"
                  className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-xl focus:ring-2 focus:ring-pastoral-dourado focus:border-pastoral-dourado"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">
                  E-mail Google
                </label>
                <input
                  type="email"
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  placeholder="seu.nome@gmail.com"
                  className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-xl focus:ring-2 focus:ring-pastoral-dourado focus:border-pastoral-dourado"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGoogleModal(false)}
                  className="flex-1 py-2 px-3 rounded-xl border border-zinc-300 text-zinc-600 text-xs font-semibold hover:bg-zinc-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Conectando...' : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
