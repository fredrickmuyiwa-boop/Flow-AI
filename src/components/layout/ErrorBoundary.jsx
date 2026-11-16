import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';
import { clearState } from '../../lib/storage';

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidUpdate(prev) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="card mx-auto max-w-lg p-8 text-center">
        <AlertTriangle className="mx-auto size-8 text-amber-500" />
        <h2 className="mt-3 text-lg font-bold">Something went wrong on this page</h2>
        <p className="mt-1 text-sm text-ink-500">{String(this.state.error.message || this.state.error)}</p>
        <div className="mt-5 flex justify-center gap-2">
          <button className="rounded-lg border border-ink-200 px-3.5 py-2 text-sm font-semibold" onClick={() => this.setState({ error: null })}>
            Try again
          </button>
          <button
            className="rounded-lg bg-ink-900 px-3.5 py-2 text-sm font-semibold text-white"
            onClick={() => {
              clearState();
              window.location.hash = '#/';
              window.location.reload();
            }}
          >
            Reset demo data
          </button>
        </div>
      </div>
    );
  }
}
