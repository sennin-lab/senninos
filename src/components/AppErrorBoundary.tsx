import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * 描画中の例外で画面が真っ白になるのを防ぎ、原因のメッセージを表示します。
 * スタイルは外部CSSに頼らず、インラインで指定しています。
 */
export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('SenniNOS render error:', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div
        role="alert"
        style={{ minHeight: '100vh', padding: '24px', boxSizing: 'border-box', background: '#0f1117', color: '#f5f5f5', fontFamily: 'system-ui, sans-serif' }}
      >
        <h1 style={{ fontSize: '20px', margin: '0 0 12px' }}>SenniNOS を表示できませんでした</h1>
        <p style={{ fontSize: '14px', lineHeight: 1.6, margin: '0 0 16px' }}>
          ページを再読み込みしてください。解決しない場合は、下のエラー内容を控えてください。
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#3b82f6', color: '#fff', cursor: 'pointer' }}
        >
          再読み込み
        </button>
        <pre style={{ marginTop: '20px', whiteSpace: 'pre-wrap', fontSize: '12px', color: '#fca5a5' }}>{error.message}</pre>
      </div>
    );
  }
}
