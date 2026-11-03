import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { AuthProvider } from './context/AuthContext';
import './index.css';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('React ErrorBoundary capturou um erro:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetAndReload = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#281F1C] flex items-center justify-center p-4 text-white">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 text-[#3C2D29] shadow-2xl border border-[#B68B4B]/30 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-[#B68B4B] flex items-center justify-center mx-auto border border-amber-200">
              <span className="text-2xl font-bold">✝</span>
            </div>
            <div className="text-center space-y-1">
              <h2 className="font-serif font-bold text-xl text-[#3C2D29]">
                Pastoral Missionária
              </h2>
              <p className="text-xs text-zinc-500">
                A aplicação encontrou um erro temporário durante o carregamento.
              </p>
            </div>
            <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs font-mono text-zinc-700 max-h-36 overflow-y-auto break-all">
              {this.state.error?.message || String(this.state.error)}
            </div>
            <div className="space-y-2 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-[#B68B4B] text-[#281F1C] hover:brightness-105 transition-all shadow-md"
              >
                Recarregar Aplicação
              </button>
              <button
                onClick={this.handleResetAndReload}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-all"
              >
                Limpar Cache Local e Recarregar
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

