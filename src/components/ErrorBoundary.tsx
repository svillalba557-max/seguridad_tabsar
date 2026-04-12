import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen flex-col items-center justify-center bg-slate-50 p-8 text-center">
          <div className="rounded-[2.5rem] bg-white p-10 shadow-2xl border border-red-100 max-w-md">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-50 mb-6">
              <AlertTriangle className="h-10 w-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-4">Algo salió mal</h2>
            <p className="text-sm text-slate-600 mb-8 leading-relaxed">
              La aplicación encontró un error inesperado. Esto puede deberse a un problema de conexión o una actualización pendiente.
            </p>
            
            {this.state.error && (
              <div className="mb-8 rounded-xl bg-slate-100 p-4 text-left overflow-hidden">
                <p className="text-[10px] font-mono text-slate-500 break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <button
              onClick={() => window.location.reload()}
              className="flex w-full items-center justify-center gap-3 rounded-2xl bg-slate-900 py-4 font-bold text-white shadow-lg transition-all active:scale-95"
            >
              <RefreshCw className="h-5 w-5" />
              REINTENTAR CARGA
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
