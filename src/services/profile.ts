import { compressToJpeg, withCacheBuster } from '@/lib/images';
import { supabase } from '@/lib/supabase';
import type { Tables, TablesUpdate } from '@/types/database';

export type MyProfile = Tables<'profiles'> & { interest_ids: number[] };

export type PublicProfile = {
  id: string;
  name: string;
  avatar_url: string;
  age: number;
  city: string;
  interests: { id: number; slug: string; name: string; emoji: string }[];
  extended: boolean;
  bio?: string | null;
  groups?: { id: string; name: string; category_id: number; image_url: string | null; member_count: number; max_members: number }[];
};

export type ProfileEdit = Pick<TablesUpdate<'profiles'>, 'name' | 'city_id' | 'bio' | 'avatar_url'>;

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error('Sin sesión');
  return id;
}

export async function getMyProfile(): Promise<MyProfile> {
  const id = await currentUserId();
  const { data, error } = await supabase
    .from('profiles')
    .select('*, profile_interests(interest_id)')
    .eq('id', id)
    .single();
  if (error) throw error;
  const { profile_interests, ...profile } = data;
  return { ...profile, interest_ids: profile_interests.map((pi) => pi.interest_id) };
}

export async function updateMyProfile(changes: ProfileEdit) {
  const id = await currentUserId();
  const { error } = await supabase.from('profiles').update(changes).eq('id', id);
  if (error) throw error;
}

export async function setMyBirthdate(isoDate: string) {
  const { error } = await supabase.rpc('set_my_birthdate', { p_birthdate: isoDate });
  if (error) throw error;
}

export async function setMyInterests(interestIds: number[]) {
  const { error } = await supabase.rpc('set_my_interests', { p_interest_ids: interestIds });
  if (error) throw error;
}

export async function completeOnboarding() {
  const { error } = await supabase.rpc('complete_onboarding');
  if (error) throw error;
}

// Comprime la foto y la sube a avatars/<user_id>/avatar.jpg.
export async function uploadAvatar(localUri: string): Promise<string> {
  const id = await currentUserId();
  const path = `${id}/avatar.jpg`;
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, await compressToJpeg(localUri), { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;

  const url = withCacheBuster(supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl);
  await updateMyProfile({ avatar_url: url });
  return url;
}

// Perfil de otra persona, con lo que corresponde ver (spec 01). null = "Perfil no disponible".
export async function getProfile(id: string): Promise<PublicProfile | null> {
  const { data, error } = await supabase.rpc('get_profile', { p_id: id });
  if (error) throw error;
  return data as PublicProfile | null;
}
