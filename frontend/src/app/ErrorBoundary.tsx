import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import * as Sentry from '@sentry/react';
import { SubmitButton } from '../components/SubmitButton';

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    Sentry.captureException(error, { contexts: { react: { componentStack: info.componentStack } } });
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return <div role="alert" className="mx-auto max-w-[520px] py-16 text-center">
      <h2 className="text-[15px] font-semibold text-fg">Chưa hiển thị được trang này</h2>
      <p className="my-4 text-[12.5px] leading-[1.9] text-fg-60">Vui lòng tải lại trang để tiếp tục học.</p>
      <SubmitButton onClick={() => window.location.reload()}>Tải lại trang</SubmitButton>
      <a href="/" className="ml-4 text-[12.5px] text-fg-60 underline">Về trang chủ</a>
    </div>;
  }
}
