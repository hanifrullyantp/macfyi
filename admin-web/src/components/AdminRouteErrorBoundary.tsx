import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode; resetKey: string };
type State = { error: Error | null };

export class AdminRouteErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[admin] route render error", error, info.componentStack);
  }

  override componentDidUpdate(prevProps: Props): void {
    if (prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  override render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="rounded-3xl border border-red-500/25 bg-red-500/[0.06] p-10 text-center max-w-lg mx-auto">
          <h2 className="text-lg font-black tracking-tight text-white">Terjadi kesalahan di halaman ini</h2>
          <p className="mt-3 text-sm text-white/45 leading-relaxed break-words">{this.state.error.message}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="rounded-2xl bg-white/10 px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white hover:bg-white/15 transition-colors"
            >
              Coba lagi
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-2xl border border-white/10 bg-transparent px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white/70 hover:text-white hover:border-white/20 transition-colors"
            >
              Muat ulang
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
