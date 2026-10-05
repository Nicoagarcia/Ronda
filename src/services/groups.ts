import { compressToJpeg, withCacheBuster } from '@/lib/images';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type Fn = Database['public']['Functions'];
export type GroupAccess = Database['public']['Enums']['group_access'];
export type MemberStatus = Database['public']['Enums']['member_status'];
export type GroupRole = Database['public']['Enums']['group_role'];

export type DiscoverGroup = Fn['discover_groups']['Returns'][number];
export type MyGroup = Fn['list_my_groups']['Returns'][number];
export type GroupMember = Fn['list_group_members']['Returns'][number];
export type GroupRequest = Fn['list_group_requests']['Returns'][number];

export type GroupDetail = {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
  category_id: number;
  zone: string | null;
  access: GroupAccess;
  member_count: number;
  max_members: number;
  is_full: boolean;
  owner_id: string;
  my_status: MemberStatus | null;
  my_role: GroupRole | null;
  rejoin_after: string | null;
  pending_count: number | null;
  preview: { id: string; name: string; avatar_url: string }[];
};

// get_group devuelve esto si el usuario fue expulsado (spec 02, "Expulsar").
export type BannedGroup = { id: string; banned: true };

export type GroupInput = {
  name: string;
  description: string;
  categoryId: number;
  zone: string | null;
  maxMembers: number;
  access: GroupAccess;
};

export async function discoverGroups(filters: { categoryId?: number | null; search?: string }) {
  const { data, error } = await supabase.rpc('discover_groups', {
    p_category: filters.categoryId ?? undefined,
    p_search: filters.search?.trim() || undefined,
  });
  if (error) throw error;
  return data;
}

export async function getGroup(id: string): Promise<GroupDetail | BannedGroup | null> {
  const { data, error } = await supabase.rpc('get_group', { p_group: id });
  if (error) throw error;
  return data as GroupDetail | BannedGroup | null;
}

export async function listMyGroups() {
  const { data, error } = await supabase.rpc('list_my_groups');
  if (error) throw error;
  return data;
}

export async function listGroupMembers(id: string) {
  const { data, error } = await supabase.rpc('list_group_members', { p_group: id });
  if (error) throw error;
  return data;
}

export async function listGroupRequests(id: string) {
  const { data, error } = await supabase.rpc('list_group_requests', { p_group: id });
  if (error) throw error;
  return data;
}

async function uploadGroupImage(groupId: string, localUri: string): Promise<string> {
  const path = `${groupId}/cover.jpg`;
  const { error } = await supabase.storage
    .from('group-images')
    .upload(path, await compressToJpeg(localUri), { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;
  return withCacheBuster(supabase.storage.from('group-images').getPublicUrl(path).data.publicUrl);
}

async function saveGroup(groupId: string, input: GroupInput, imageUrl: string | null) {
  const { error } = await supabase.rpc('update_group', {
    p_group: groupId,
    p_name: input.name,
    p_description: input.description,
    p_category_id: input.categoryId,
    p_max_members: input.maxMembers,
    p_access: input.access,
    p_zone: input.zone ?? undefined,
    p_image_url: imageUrl ?? undefined,
  });
  if (error) throw error;
}

// La imagen se sube después de crear el grupo, porque va en la carpeta del grupo.
export async function createGroup(input: GroupInput, localImageUri: string | null): Promise<string> {
  const { data: id, error } = await supabase.rpc('create_group', {
    p_name: input.name,
    p_description: input.description,
    p_category_id: input.categoryId,
    p_max_members: input.maxMembers,
    p_access: input.access,
    p_zone: input.zone ?? undefined,
  });
  if (error) throw error;
  if (localImageUri) {
    await saveGroup(id, input, await uploadGroupImage(id, localImageUri));
  }
  return id;
}

// imageUri: una URL ya subida (se mantiene) o una imagen local nueva (se sube).
export async function updateGroup(groupId: string, input: GroupInput, imageUri: string | null) {
  const isLocal = imageUri !== null && !imageUri.startsWith('http');
  const imageUrl = isLocal ? await uploadGroupImage(groupId, imageUri) : imageUri;
  await saveGroup(groupId, input, imageUrl);
}

async function call<T extends keyof Fn>(fn: T, args: Fn[T]['Args']) {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw error;
  return data as Fn[T]['Returns'];
}

export const joinGroup = (id: string) => call('join_group', { p_group: id }) as Promise<'joined' | 'requested'>;
export const cancelRequest = (id: string) => call('cancel_request', { p_group: id });
export const decideRequest = (groupId: string, userId: string, accept: boolean) =>
  call('decide_request', { p_group: groupId, p_user: userId, p_accept: accept });
export const leaveGroup = (id: string) => call('leave_group', { p_group: id });
export const removeMember = (groupId: string, userId: string) =>
  call('remove_member', { p_group: groupId, p_user: userId });
export const deleteGroup = (id: string, confirmName: string) =>
  call('delete_group', { p_group: id, p_confirm_name: confirmName });
