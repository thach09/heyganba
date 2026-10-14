import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import * as Sentry from '@sentry/react';
import { SubmitButton } from '../components/SubmitButton';

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean; error?: Error }> {
  state = { failed: false, error: undefined as Error | undefined };
  static getDerivedStateFromError(error: Error) { return { failed: true, error }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, info);
    Sentry.captureException(error, { contexts: { react: { componentStack: info.componentStack } } });
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return <div role="alert" className="mx-auto max-w-[520px] py-16 text-center">
      <h2 className="text-[15px] font-semibold text-fg">Chưa hiển thị được trang này</h2>
      <p className="my-4 text-[12.5px] leading-[1.9] text-fg-60">Vui lòng tải lại trang để tiếp tục học.</p>
      {this.state.error && (
        <pre className="my-4 text-left p-3 bg-card border border-rule text-xs text-red overflow-auto max-h-40 whitespace-pre-wrap font-mono">
          {this.state.error.message}
        </pre>
      )}
      <SubmitButton onClick={() => window.location.reload()}>Tải lại trang</SubmitButton>
      <a href="/" className="ml-4 text-[12.5px] text-fg-60 underline">Về trang chủ</a>
    </div>;
  }
}
