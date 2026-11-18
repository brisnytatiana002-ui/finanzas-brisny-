import {Component, ErrorInfo, ReactNode} from 'react';
import {AlertTriangle, RefreshCw} from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  public state: ErrorBoundaryState = {
    hasError: false,
    message: '',
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let readable = error.message || 'Ocurrió un error inesperado.';
    try {
      const parsed = JSON.parse(error.message) as {
        error?: string;
        operationType?: string;
      };
      if (parsed && parsed.error) {
        readable = `Error de permisos o datos (${parsed.operationType ?? 'operación'}): ${parsed.error}`;
      }
    } catch {
      // No es JSON estructurado; mantener mensaje original
    }
    return {hasError: true, message: readable};
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturó un error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#0A0D14] px-4 py-10 text-slate-100">
          <div className="w-full max-w-md rounded-2xl border border-rose-500/35 bg-[#131720] p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-400">
              <AlertTriangle className="h-6 w-6" aria-hidden="true" />
            </div>
            <h1 className="mt-4 font-display text-xl font-bold text-white">
              Algo salió mal
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-[#5B3DF5] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#6D52F7]"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              <span>Recargar aplicación</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
