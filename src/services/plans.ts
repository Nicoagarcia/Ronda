import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type Fn = Database['public']['Functions'];

export type DiscoverPlan = Fn['discover_plans']['Returns'][number];
export type MyPlan = Fn['list_my_plans']['Returns'][number];
export type GroupPlan = Fn['list_group_plans']['Returns'][number];
export type PlanStatus = 'upcoming' | 'ongoing' | 'finished' | 'cancelled';
export type PersonPreview = { id: string; name: string; avatar_url: string };

export type PlanDetail = {
  id: string;
  title: string;
  description: string | null;
  category_id: number;
  place_name: string;
  zone: string | null;
  is_private_place: boolean;
  address: string | null;
  starts_at: string;
  ends_at: string | null;
  effective_end: string;
  status: PlanStatus;
  cancel_reason: string | null;
  max_participants: number;
  participant_count: number;
  is_full: boolean;
  creator_id: string;
  is_creator: boolean;
  am_participant: boolean;
  safety_notice_accepted: boolean;
  group: { id: string; name: string; access: 'open' | 'approval' } | null;
  participants: PersonPreview[];
};

export type PlanInput = {
  title: string;
  description: string | null;
  categoryId: number;
  placeName: string;
  zone: string | null;
  isPrivatePlace: boolean;
  address: string | null;
  startsAt: Date;
  endsAt: Date | null;
  maxParticipants: number;
};

export async function discoverPlans(filters: { categoryId?: number | null; search?: string }) {
  const { data, error } = await supabase.rpc('discover_plans', {
    p_category: filters.categoryId ?? undefined,
    p_search: filters.search?.trim() || undefined,
  });
  if (error) throw error;
  return data;
}

export async function getPlan(id: string): Promise<PlanDetail | null> {
  const { data, error } = await supabase.rpc('get_plan', { p_plan: id });
  if (error) throw error;
  return data as PlanDetail | null;
}

export async function listMyPlans() {
  const { data, error } = await supabase.rpc('list_my_plans');
  if (error) throw error;
  return data as (MyPlan & { status: PlanStatus })[];
}

export async function listGroupPlans(groupId: string) {
  const { data, error } = await supabase.rpc('list_group_plans', { p_group: groupId });
  if (error) throw error;
  return data;
}

function planArgs(input: PlanInput) {
  return {
    p_title: input.title,
    p_category_id: input.categoryId,
    p_place_name: input.placeName,
    p_starts_at: input.startsAt.toISOString(),
    p_max_participants: input.maxParticipants,
    p_description: input.description ?? undefined,
    p_zone: input.zone ?? undefined,
    p_ends_at: input.endsAt?.toISOString(),
    p_is_private_place: input.isPrivatePlace,
    p_address: input.address ?? undefined,
  };
}

export async function createPlan(input: PlanInput, groupId: string | null): Promise<string> {
  const { data, error } = await supabase.rpc('create_plan', { ...planArgs(input), p_group_id: groupId ?? undefined });
  if (error) throw error;
  return data;
}

// Devuelve true si cambió fecha, hora o lugar (se avisa a los participantes en el Hito 5).
export async function updatePlan(id: string, input: PlanInput): Promise<boolean> {
  const { data, error } = await supabase.rpc('update_plan', { p_plan: id, ...planArgs(input) });
  if (error) throw error;
  return data;
}

export async function cancelPlan(id: string, reason: string | null) {
  const { error } = await supabase.rpc('cancel_plan', { p_plan: id, p_reason: reason ?? undefined });
  if (error) throw error;
}

export async function acceptSafetyNotice() {
  const { error } = await supabase.rpc('accept_safety_notice');
  if (error) throw error;
}

export async function joinPlan(id: string) {
  const { error } = await supabase.rpc('join_plan', { p_plan: id });
  if (error) throw error;
}

export async function leavePlan(id: string) {
  const { error } = await supabase.rpc('leave_plan', { p_plan: id });
  if (error) throw error;
}

export async function removeParticipant(planId: string, userId: string) {
  const { error } = await supabase.rpc('remove_participant', { p_plan: planId, p_user: userId });
  if (error) throw error;
}
