import { router } from 'expo-router';
import { useState } from 'react';

import { ActionSheet, type SheetAction } from '@/components/ui/action-sheet';
import { useBlockFlow } from '@/features/moderation/hooks';

type Person = { id: string; name: string };

// Menú al mantener apretada a una persona en una lista de miembros o participantes (spec 06).
export function usePersonActions(extra?: (person: Person) => SheetAction[]) {
  const [person, setPerson] = useState<Person | null>(null);
  const block = useBlockFlow();

  const actions: SheetAction[] = person
    ? [
        { label: 'Ver perfil', onPress: () => router.push(`/user/${person.id}`) },
        ...(extra?.(person) ?? []),
        {
          label: 'Reportar',
          onPress: () => router.push({ pathname: '/report', params: { type: 'user', id: person.id, userId: person.id, name: person.name } }),
        },
        { label: `Bloquear a ${person.name}`, danger: true, onPress: () => block(person.id, person.name) },
      ]
    : [];

  const sheet = <ActionSheet visible={!!person} title={person?.name} actions={actions} onClose={() => setPerson(null)} />;
  return { open: setPerson, sheet };
}
