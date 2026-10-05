import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';

export type City = Tables<'cities'>;
export type Interest = Tables<'interests'>;

export async function listCities(): Promise<City[]> {
  const { data, error } = await supabase.from('cities').select('*').order('is_active', { ascending: false }).order('name');
  if (error) throw error;
  return data;
}

export async function listInterests(): Promise<Interest[]> {
  const { data, error } = await supabase.from('interests').select('*').order('position');
  if (error) throw error;
  return data;
}
