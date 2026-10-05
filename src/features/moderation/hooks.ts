import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';

import { errorMessage } from '@/lib/errors';
import { removeMember } from '@/services/groups';
import { ackWarning, blockUser, getMyWarning, listBlocked, mySpacesWith, unblockUser } from '@/services/moderation';
import { removeParticipant } from '@/services/plans';

export const useBlockedUsers = () => useQuery({ queryKey: ['moderation', 'blocked'], queryFn: listBlocked });
export const useMyWarning = () => useQuery({ queryKey: ['moderation', 'warning'], queryFn: getMyWarning });

export function useAckWarning() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ackWarning,
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['moderation', 'warning'] }),
  });
}

// Un bloqueo cambia lo que se ve en casi toda la app: se refresca todo.
function useRefreshAll() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries();
}

export function useUnblock() {
  const refresh = useRefreshAll();
  return useMutation({ mutationFn: unblockUser, onSettled: refresh });
}

// Bloquear con confirmación. Si quien bloquea es creador de grupos o planes donde está
// esa persona, se le ofrece sacarla también (spec 06, AC-05). No es automático.
export function useBlockFlow() {
  const refresh = useRefreshAll();

  return (userId: string, name: string, onDone?: () => void) =>
    Alert.alert(
      `¿Bloquear a ${name}?`,
      'No van a ver sus perfiles ni sus mensajes, y no te va a llegar nada de esa persona. No se le avisa.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Bloquear',
          style: 'destructive',
          onPress: async () => {
            try {
              await blockUser(userId);
              const spaces = await mySpacesWith(userId);
              if (spaces.length) {
                const list = spaces.map((s) => `• ${s.kind === 'group' ? 'Grupo' : 'Plan'}: ${s.name}`).join('\n');
                Alert.alert(`¿También querés sacar a ${name}?`, `Está en:\n${list}`, [
                  { text: 'No', style: 'cancel', onPress: () => refresh() },
                  {
                    text: 'Sacar',
                    style: 'destructive',
                    onPress: async () => {
                      await Promise.allSettled(
                        spaces.map((s) => (s.kind === 'group' ? removeMember(s.id, userId) : removeParticipant(s.id, userId))),
                      );
                      refresh();
                    },
                  },
                ]);
              } else {
                refresh();
              }
              onDone?.();
            } catch (e) {
              Alert.alert('No se pudo bloquear', errorMessage(e));
            }
          },
        },
      ],
    );
}
