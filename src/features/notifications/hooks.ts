import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getNotificationSettings, updateNotificationSettings, type NotificationSettings } from '@/services/notifications';

const key = ['notifications', 'settings'] as const;

export const useNotificationSettings = () => useQuery({ queryKey: key, queryFn: getNotificationSettings });

// El interruptor cambia al instante; si falla, vuelve atrás.
export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateNotificationSettings,
    onMutate: async (changes) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<NotificationSettings>(key);
      if (previous) queryClient.setQueryData(key, { ...previous, ...changes });
      return { previous };
    },
    onError: (_e, _changes, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}
