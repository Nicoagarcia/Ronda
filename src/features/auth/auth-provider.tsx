import { createContext, use, useEffect, useState } from 'react';

import { identifyUser } from '@/lib/analytics';
import { setMonitoringUser } from '@/lib/monitoring';
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
      identifyUser(session?.user.id ?? null);
      setMonitoringUser(session?.user.id ?? null);
      setState({ session, initializing: false });
    });
  }, []);

  return <AuthContext value={state}>{children}</AuthContext>;
}

export function useAuth() {
  return use(AuthContext);
}
