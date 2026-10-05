import { ScrollView } from 'react-native';

import { Chip } from '@/components/ui/chip';
import { useInterests } from '@/features/profile/hooks';

type Props = { selected: number | null; onChange: (id: number | null) => void };

export function CategoryFilter({ selected, onChange }: Props) {
  const { data: interests } = useInterests();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2" className="grow-0">
      <Chip label="Todas" selected={selected === null} onPress={() => onChange(null)} />
      {interests?.map((i) => (
        <Chip key={i.id} label={`${i.emoji} ${i.name}`} selected={selected === i.id} onPress={() => onChange(selected === i.id ? null : i.id)} />
      ))}
    </ScrollView>
  );
}
