import { View } from 'react-native';

import { Chip } from '@/components/ui/chip';
import { Text } from '@/components/ui/text';
import type { Interest } from '@/services/catalog';

export const MIN_INTERESTS = 3;
export const MAX_INTERESTS = 10;

type Props = { interests: Interest[]; selected: number[]; onChange: (ids: number[]) => void };

// Intereses agrupados por sección (spec 01, sección 8). Entre 3 y 10.
export function InterestPicker({ interests, selected, onChange }: Props) {
  const sections = [...new Set(interests.map((i) => i.section))];
  const full = selected.length >= MAX_INTERESTS;

  const toggle = (id: number) =>
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);

  return (
    <View className="gap-5">
      {sections.map((section) => (
        <View key={section} className="gap-2">
          <Text variant="label">{section}</Text>
          <View className="flex-row flex-wrap gap-2">
            {interests
              .filter((i) => i.section === section)
              .map((i) => {
                const isSelected = selected.includes(i.id);
                return (
                  <Chip
                    key={i.id}
                    label={`${i.emoji} ${i.name}`}
                    selected={isSelected}
                    disabled={full && !isSelected}
                    onPress={() => toggle(i.id)}
                  />
                );
              })}
          </View>
        </View>
      ))}
    </View>
  );
}
