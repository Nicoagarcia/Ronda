import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { track } from '@/lib/analytics';
import {
  cancelRequest,
  createGroup,
  decideRequest,
  deleteGroup,
  discoverGroups,
  getGroup,
  joinGroup,
  leaveGroup,
  listGroupMembers,
  listGroupRequests,
  listMyGroups,
  removeMember,
  updateGroup,
  type GroupInput,
} from '@/services/groups';

export const groupKeys = {
  all: ['groups'] as const,
  discover: (categoryId: number | null, search: string) => ['groups', 'discover', categoryId, search] as const,
  mine: ['groups', 'mine'] as const,
  detail: (id: string) => ['groups', 'detail', id] as const,
  members: (id: string) => ['groups', 'members', id] as const,
  requests: (id: string) => ['groups', 'requests', id] as const,
};

export function useDiscoverGroups(categoryId: number | null, search: string) {
  return useQuery({
    queryKey: groupKeys.discover(categoryId, search),
    queryFn: () => discoverGroups({ categoryId, search }),
  });
}

export const useMyGroups = () => useQuery({ queryKey: groupKeys.mine, queryFn: listMyGroups });
export const useGroup = (id: string, enabled = true) =>
  useQuery({ queryKey: groupKeys.detail(id), queryFn: () => getGroup(id), enabled });
export const useGroupMembers = (id: string, enabled = true) =>
  useQuery({ queryKey: groupKeys.members(id), queryFn: () => listGroupMembers(id), enabled });
export const useGroupRequests = (id: string) =>
  useQuery({ queryKey: groupKeys.requests(id), queryFn: () => listGroupRequests(id) });

// Cualquier cambio en grupos puede afectar Descubrir, Lo mío y el detalle: se refresca todo lo de grupos.
function useGroupMutation<T, R>(fn: (input: T) => Promise<R>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () => queryClient.invalidateQueries({ queryKey: groupKeys.all }),
  });
}

export const useCreateGroup = () =>
  useGroupMutation(async ({ input, imageUri }: { input: GroupInput; imageUri: string | null }) => {
    const id = await createGroup(input, imageUri);
    track('group_created', { access: input.access, max_members: input.maxMembers, category_id: input.categoryId });
    return id;
  });
export const useUpdateGroup = (id: string) =>
  useGroupMutation(({ input, imageUri }: { input: GroupInput; imageUri: string | null }) => updateGroup(id, input, imageUri));
export const useJoinGroup = (id: string) =>
  useGroupMutation(async () => {
    const result = await joinGroup(id);
    track(result === 'joined' ? 'group_joined' : 'group_requested');
    return result;
  });
export const useCancelRequest = (id: string) => useGroupMutation(() => cancelRequest(id));
export const useLeaveGroup = (id: string) => useGroupMutation(() => leaveGroup(id));
export const useDecideRequest = (id: string) =>
  useGroupMutation(({ userId, accept }: { userId: string; accept: boolean }) => decideRequest(id, userId, accept));
export const useRemoveMember = (id: string) => useGroupMutation((userId: string) => removeMember(id, userId));
export const useDeleteGroup = (id: string) => useGroupMutation((confirmName: string) => deleteGroup(id, confirmName));
