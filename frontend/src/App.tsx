import { AuthProvider } from './app/AuthProvider';
import { AppShell } from './app/AppShell';
import { ErrorBoundary } from './app/ErrorBoundary';

export function App() {
  return <ErrorBoundary><AuthProvider><AppShell /></AuthProvider></ErrorBoundary>;
}
export default App;
