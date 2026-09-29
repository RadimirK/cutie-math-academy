import { Component, type ReactNode } from 'react';

/** Keeps a crash in one screen from blanking the whole app. */
export class ErrorBoundary extends Component<{ children: ReactNode; resetKey?: string }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidUpdate(prev: { resetKey?: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="panel mx-auto max-w-xl p-6">
        <p className="title-display mb-2 text-lg text-ink-900">Что-то сломалось</p>
        <pre className="overflow-x-auto text-xs whitespace-pre-wrap text-red-700">{this.state.error.message}</pre>
        <button className="btn-ghost mt-4" onClick={() => this.setState({ error: null })}>
          Попробовать снова
        </button>
      </div>
    );
  }
}
