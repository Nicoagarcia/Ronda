import { supabase } from '@/lib/supabase';

// Ajustes por tipo (spec 05, "Ajustes del usuario"). El grupo eliminado (N10) no se puede apagar.
export type NotificationSettings = {
  messages: boolean;
  requests: boolean;
  group_plans: boolean;
  plan_joins: boolean;
  plan_updates: boolean;
  permission_prompted_at: string | null;
};

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const { data, error } = await supabase.rpc('get_notification_settings');
  if (error) throw error;
  return data as NotificationSettings;
}

export async function updateNotificationSettings(changes: Partial<Omit<NotificationSettings, 'permission_prompted_at'>>) {
  const { error } = await supabase.rpc('update_notification_settings', { p_settings: changes });
  if (error) throw error;
}

// Registro del dispositivo para push. Se usa desde la app de desarrollo (Expo Go no recibe push en Android).
export async function registerPushToken(token: string, platform: 'android' | 'ios', deviceId?: string) {
  const { error } = await supabase.rpc('register_push_token', { p_token: token, p_platform: platform, p_device_id: deviceId });
  if (error) throw error;
}

export async function unregisterPushToken(token: string) {
  const { error } = await supabase.rpc('unregister_push_token', { p_token: token });
  if (error) throw error;
}

export async function markPermissionPrompted() {
  const { error } = await supabase.rpc('mark_permission_prompted');
  if (error) throw error;
}
