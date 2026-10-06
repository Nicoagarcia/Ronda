import * as Sentry from '@sentry/react-native';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

// Errores con Sentry. Sin EXPO_PUBLIC_SENTRY_DSN no se manda nada (desarrollo local).
// Sin datos personales: solo el id del usuario para agrupar errores (docs/legal/privacidad.md).
export function initMonitoring() {
  if (!dsn) return;
  Sentry.init({
    dsn,
    sendDefaultPii: false,
    tracesSampleRate: 0.2,
    environment: __DEV__ ? 'development' : 'production',
  });
}

export function setMonitoringUser(userId: string | null) {
  if (!dsn) return;
  Sentry.setUser(userId ? { id: userId } : null);
}

export const wrapRoot = Sentry.wrap;
