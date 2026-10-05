import { createContext, use, useEffect, useState } from 'react';

import { queryClient } from '@/lib/query-client';
import { getSession, onSessionChange, type Session } from '@/services/auth';

type AuthState = { session: Session | null; initializing: boolean };

const AuthContext = createContext<AuthState>({ session: null, initializing: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ session: null, initializing: true });

  useEffect(() => {
    getSession().then((session) => setState({ session, initializing: false }));
    return onSessionChange((session) => {
      // Al cambiar de usuario no puede quedar nada en caché del anterior.
      if (!session) queryClient.clear();
      setState({ session, initializing: false });
    });
  }, []);

  return <AuthContext value={state}>{children}</AuthContext>;
}

export function useAuth() {
  return use(AuthContext);
}
