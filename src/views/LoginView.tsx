import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { PublicPortalView } from './PublicPortalView';
import { Cross, Lock, Mail, ArrowRight, Globe, KeyRound, ExternalLink, CheckCircle2, ShieldCheck } from 'lucide-react';

const DEFAULT_GOOGLE_CLIENT_ID = '744456406049-ammcnn4uslj5itlu5arj4iq9kvah0paf.apps.googleusercontent.com';

export const LoginView: React.FC = () => {
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPublicPortal, setShowPublicPortal] = useState(false);

  // Google OAuth State
  const [googleClientId, setGoogleClientId] = useState(DEFAULT_GOOGLE_CLIENT_ID);
  const [showGoogleConfigModal, setShowGoogleConfigModal] = useState(false);
  const [inputClientId, setInputClientId] = useState('');
  const [isSavingClientId, setIsSavingClientId] = useState(false);
  const [showEmailFallback, setShowEmailFallback] = useState(false);
  const [fallbackEmail, setFallbackEmail] = useState('');
  const [fallbackName, setFallbackName] = useState('');

  // 1. Fetch current Google OAuth Client ID & load Google Identity Services SDK
  useEffect(() => {
    api
      .getAuthConfig()
      .then((cfg) => {
        if (cfg?.googleClientId) {
          setGoogleClientId(cfg.googleClientId);
        }
      })
      .catch(() => {});

    if (!document.getElementById('google-gsi-script')) {
      const script = document.createElement('script');
      script.id = 'google-gsi-script';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
  }, []);

  // 2. When googleClientId is available and GSI script is loaded, initialize official Google button
  useEffect(() => {
    if (!googleClientId) return;

    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      const win = window as any;
      if (win.google?.accounts?.id) {
        clearInterval(interval);
        try {
          win.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: async (response: any) => {
              if (response.credential) {
                setIsLoading(true);
                setError('');
                try {
                  await loginWithGoogle({ credential: response.credential });
                } catch (err: any) {
                  setError(err.message || 'Falha ao autenticar com a conta Google.');
                } finally {
                  setIsLoading(false);
                }
              }
            },
          });

          const btnEl = document.getElementById('google-official-btn');
          if (btnEl) {
            btnEl.innerHTML = '';
            win.google.accounts.id.renderButton(btnEl, {
              theme: 'outline',
              size: 'large',
              width: 320,
              text: 'signin_with',
              shape: 'pill',
              logo_alignment: 'left',
            });
          }
        } catch (e) {
          console.error('Erro ao inicializar Google Identity Services:', e);
        }
      } else if (attempts > 30) {
        clearInterval(interval);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [googleClientId, loginWithGoogle]);

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

  const handleSaveClientId = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputClientId.trim()) return;
    setIsSavingClientId(true);
    setError('');
    try {
      const res = await api.saveGoogleClientId(inputClientId.trim());
      setGoogleClientId(res.googleClientId);
      setShowGoogleConfigModal(false);
    } catch (err: any) {
      setError(err.message || 'Falha ao salvar Client ID.');
    } finally {
      setIsSavingClientId(false);
    }
  };

  const handleFallbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fallbackEmail) return;
    setError('');
    setIsLoading(true);
    try {
      await loginWithGoogle({
        email: fallbackEmail.trim().toLowerCase(),
        name: fallbackName.trim() || fallbackEmail.split('@')[0],
      });
      setShowGoogleConfigModal(false);
      setShowEmailFallback(false);
    } catch (err: any) {
      setError(err.message || 'Falha na autenticação com e-mail.');
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
          {googleClientId ? (
            <div className="space-y-2">
              <div id="google-official-btn" className="flex justify-center" />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowGoogleConfigModal(true)}
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
          )}

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-zinc-200" />
            <span className="flex-shrink mx-3 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              ou com e-mail e senha
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

      {/* Google OAuth Activation / Instructions Modal */}
      {showGoogleConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-pastoral-profundo/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-sm text-zinc-800">
                    Ativação do Google Sign-In Oficial
                  </h3>
                  <p className="text-[10px] text-zinc-500">Janela oficial do Google OAuth 2.0</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowGoogleConfigModal(false);
                  setShowEmailFallback(false);
                }}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              {!showEmailFallback ? (
                <>
                  <p className="text-xs text-zinc-600 leading-relaxed">
                    Para o Google exibir a <strong>janela oficial de seleção de contas</strong> no domínio <code>pastoral-missionaria.onrender.com</code>, o Google exige um <strong>ID do cliente OAuth da Web</strong> registrado no Google Cloud Console.
                  </p>

                  <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-2 text-xs text-blue-900">
                    <p className="font-bold flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-blue-600" />
                      Como obter em 3 passos simples (gratuito):
                    </p>
                    <ol className="list-decimal pl-4 space-y-1 text-[11px] text-blue-800">
                      <li>
                        Acesse o{' '}
                        <a
                          href="https://console.cloud.google.com/apis/credentials"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold underline inline-flex items-center gap-0.5"
                        >
                          Google Cloud Console <ExternalLink className="w-3 h-3" />
                        </a>
                      </li>
                      <li>
                        Clique em <strong>Criar Credenciais &gt; ID do cliente OAuth</strong> (Tipo: <em>Aplicativo da Web</em>).
                      </li>
                      <li>
                        Em <strong>Origens JavaScript autorizadas</strong>, adicione:
                        <code className="block mt-0.5 bg-white px-2 py-0.5 rounded border border-blue-300 font-mono text-[10px] text-blue-900 select-all">
                          https://pastoral-missionaria.onrender.com
                        </code>
                      </li>
                      <li>Copie o <strong>ID do cliente</strong> gerado (termina com <code>.apps.googleusercontent.com</code>).</li>
                    </ol>
                  </div>

                  <form onSubmit={handleSaveClientId} className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">
                        Cole o seu Google Client ID:
                      </label>
                      <input
                        type="text"
                        value={inputClientId}
                        onChange={(e) => setInputClientId(e.target.value)}
                        placeholder="Ex: 123456789-abcdef.apps.googleusercontent.com"
                        className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-xl focus:ring-2 focus:ring-pastoral-dourado font-mono"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSavingClientId}
                      className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-xs disabled:opacity-50"
                    >
                      {isSavingClientId ? 'Salvando...' : 'Salvar e Ativar Popup Oficial do Google'}
                    </button>
                  </form>

                  <div className="pt-2 text-center border-t border-zinc-100">
                    <button
                      type="button"
                      onClick={() => setShowEmailFallback(true)}
                      className="text-xs text-zinc-500 hover:text-pastoral-cafe underline"
                    >
                      Não tenho o Client ID agora (entrar informando e-mail Gmail)
                    </button>
                  </div>
                </>
              ) : (
                <form onSubmit={handleFallbackSubmit} className="space-y-3">
                  <p className="text-xs text-zinc-600">
                    Informe seu e-mail do Google (Gmail) para acessar o painel de acolhimento e solicitar aprovação da coordenação:
                  </p>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">
                      Seu Nome
                    </label>
                    <input
                      type="text"
                      value={fallbackName}
                      onChange={(e) => setFallbackName(e.target.value)}
                      placeholder="Ex: Pedro Pignata"
                      className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-xl focus:ring-2 focus:ring-pastoral-dourado"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-zinc-700 uppercase tracking-wider mb-1">
                      E-mail Google (Gmail)
                    </label>
                    <input
                      type="email"
                      value={fallbackEmail}
                      onChange={(e) => setFallbackEmail(e.target.value)}
                      placeholder="seu.nome@gmail.com"
                      className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-xl focus:ring-2 focus:ring-pastoral-dourado"
                      required
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowEmailFallback(false)}
                      className="flex-1 py-2 px-3 rounded-xl border border-zinc-300 text-zinc-600 text-xs font-semibold hover:bg-zinc-50"
                    >
                      Voltar
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 py-2 px-3 rounded-xl bg-pastoral-dourado text-pastoral-profundo text-xs font-bold transition-colors disabled:opacity-50"
                    >
                      {isLoading ? 'Conectando...' : 'Prosseguir'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
