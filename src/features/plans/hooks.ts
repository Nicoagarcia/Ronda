import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { profileKeys } from '@/features/profile/hooks';
import {
  acceptSafetyNotice,
  cancelPlan,
  createPlan,
  discoverPlans,
  getPlan,
  joinPlan,
  leavePlan,
  listGroupPlans,
  listMyPlans,
  removeParticipant,
  updatePlan,
  type PlanInput,
} from '@/services/plans';

export const planKeys = {
  all: ['plans'] as const,
  discover: (categoryId: number | null, search: string) => ['plans', 'discover', categoryId, search] as const,
  mine: ['plans', 'mine'] as const,
  detail: (id: string) => ['plans', 'detail', id] as const,
  group: (groupId: string) => ['plans', 'group', groupId] as const,
};

export const useDiscoverPlans = (categoryId: number | null, search: string) =>
  useQuery({ queryKey: planKeys.discover(categoryId, search), queryFn: () => discoverPlans({ categoryId, search }) });
export const useMyPlans = () => useQuery({ queryKey: planKeys.mine, queryFn: listMyPlans });
export const usePlan = (id: string) => useQuery({ queryKey: planKeys.detail(id), queryFn: () => getPlan(id) });
export const useGroupPlans = (groupId: string, enabled = true) =>
  useQuery({ queryKey: planKeys.group(groupId), queryFn: () => listGroupPlans(groupId), enabled });

// Los cambios en planes pueden afectar Descubrir, Lo mío, el detalle y los planes del grupo.
function usePlanMutation<T, R>(fn: (input: T) => Promise<R>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () => queryClient.invalidateQueries({ queryKey: planKeys.all }),
  });
}

export const useCreatePlan = () =>
  usePlanMutation(({ input, groupId }: { input: PlanInput; groupId: string | null }) => createPlan(input, groupId));
export const useUpdatePlan = (id: string) => usePlanMutation((input: PlanInput) => updatePlan(id, input));
export const useCancelPlan = (id: string) => usePlanMutation((reason: string | null) => cancelPlan(id, reason));
export const useLeavePlan = (id: string) => usePlanMutation(() => leavePlan(id));
export const useRemoveParticipant = (id: string) => usePlanMutation((userId: string) => removeParticipant(id, userId));

// Sumarse: si es la primera vez, antes se acepta el aviso de seguridad (AC-15).
export function useJoinPlan(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ acceptNotice }: { acceptNotice: boolean }) => {
      if (acceptNotice) await acceptSafetyNotice();
      await joinPlan(id);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.all });
      queryClient.invalidateQueries({ queryKey: profileKeys.me });
    },
  });
}
