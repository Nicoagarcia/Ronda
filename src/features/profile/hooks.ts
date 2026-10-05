import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/auth-provider';
import { listCities, listInterests } from '@/services/catalog';
import {
  completeOnboarding,
  getMyProfile,
  getProfile,
  setMyBirthdate,
  setMyInterests,
  updateMyProfile,
  uploadAvatar,
  type ProfileEdit,
} from '@/services/profile';

export const profileKeys = {
  me: ['profile', 'me'] as const,
  detail: (id: string) => ['profile', id] as const,
};

export function useMyProfile() {
  const { session } = useAuth();
  return useQuery({ queryKey: profileKeys.me, queryFn: getMyProfile, enabled: !!session });
}

export function useProfile(id: string) {
  return useQuery({ queryKey: profileKeys.detail(id), queryFn: () => getProfile(id) });
}

export function useCities() {
  return useQuery({ queryKey: ['catalog', 'cities'], queryFn: listCities, staleTime: Infinity });
}

export function useInterests() {
  return useQuery({ queryKey: ['catalog', 'interests'], queryFn: listInterests, staleTime: Infinity });
}

// Todas las escrituras del perfil refrescan "mi perfil" al terminar.
function useProfileMutation<T>(fn: (input: T) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: profileKeys.me }),
  });
}

export const useUpdateMyProfile = () => useProfileMutation((changes: ProfileEdit) => updateMyProfile(changes));
export const useSetMyBirthdate = () => useProfileMutation((iso: string) => setMyBirthdate(iso));
export const useSetMyInterests = () => useProfileMutation((ids: number[]) => setMyInterests(ids));
export const useUploadAvatar = () => useProfileMutation((uri: string) => uploadAvatar(uri));
export const useCompleteOnboarding = () => useProfileMutation(() => completeOnboarding());
