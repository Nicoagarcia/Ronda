import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

export type ReportTarget = Database['public']['Enums']['report_target'];
export type ReportReason = Database['public']['Enums']['report_reason'];
export type BlockedUser = Database['public']['Functions']['list_my_blocks']['Returns'][number];
export type MySpace = { kind: 'group' | 'plan'; id: string; name: string };
export type Warning = { id: string; reason: string; created_at: string };

export async function blockUser(userId: string) {
  const { error } = await supabase.rpc('block_user', { p_user: userId });
  if (error) throw error;
}

export async function unblockUser(userId: string) {
  const { error } = await supabase.rpc('unblock_user', { p_user: userId });
  if (error) throw error;
}

export async function listBlocked() {
  const { data, error } = await supabase.rpc('list_my_blocks');
  if (error) throw error;
  return data;
}

// Grupos y planes míos donde está esa persona, para ofrecer sacarla al bloquearla (spec 06, AC-05).
export async function mySpacesWith(userId: string): Promise<MySpace[]> {
  const { data, error } = await supabase.rpc('my_spaces_with', { p_user: userId });
  if (error) throw error;
  return data as MySpace[];
}

export async function createReport(targetType: ReportTarget, targetId: string, reason: ReportReason, details: string | null) {
  const { error } = await supabase.rpc('create_report', {
    p_target_type: targetType,
    p_target_id: targetId,
    p_reason: reason,
    p_details: details ?? undefined,
  });
  if (error) throw error;
}

export async function getMyWarning(): Promise<Warning | null> {
  const { data, error } = await supabase.rpc('get_my_warning');
  if (error) throw error;
  return data as Warning | null;
}

export async function ackWarning(id: string) {
  const { error } = await supabase.rpc('ack_warning', { p_warning: id });
  if (error) throw error;
}
