import PostHog from 'posthog-react-native';

const apiKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const host = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

// Métricas de uso con PostHog (doc 03, "Métricas"). Sin EXPO_PUBLIC_POSTHOG_KEY no se manda nada.
// Nunca se mandan contenidos (mensajes, nombres, descripciones): solo qué pasó y algunos números.
const client = apiKey ? new PostHog(apiKey, { host, captureAppLifecycleEvents: true }) : null;

export type AnalyticsEvent =
  | 'onboarding_completed'
  | 'group_created'
  | 'group_joined'
  | 'group_requested'
  | 'plan_created'
  | 'plan_joined'
  | 'message_sent'
  | 'report_sent'
  | 'user_blocked';

export function track(event: AnalyticsEvent, properties?: Record<string, string | number | boolean | null>) {
  client?.capture(event, properties ?? undefined);
}

export function identifyUser(userId: string | null) {
  if (!client) return;
  if (userId) client.identify(userId);
  else client.reset();
}
