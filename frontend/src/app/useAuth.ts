import { createContext, useContext } from 'react';
import type { AuthResponse } from '../lib/api/types';

interface AuthContextValue {
  user: AuthResponse | null;
  requireLogin: () => void;
  logout: () => Promise<void>;
  changePassword: () => void;
  updateProfile: (user: AuthResponse) => void;
}
export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('AuthProvider is required');
  return context;
}

