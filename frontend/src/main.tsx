import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.tsx'
import { privateBreadcrumb, privateEvent, privateSpan } from './lib/observability/privacy'

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    integrations: [
      Sentry.browserTracingIntegration(),
    ],
    tracesSampleRate: 0.2,
    environment: import.meta.env.MODE || 'production',
    dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [],
      urlQueryParams: false, stackFrameVariables: false, databaseQueryData: false },
    beforeBreadcrumb: privateBreadcrumb,
    beforeSend: privateEvent,
    beforeSendSpan: privateSpan,
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

