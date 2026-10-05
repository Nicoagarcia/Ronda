import { View } from 'react-native';

import { Chip } from '@/components/ui/chip';
import { ErrorText } from '@/components/ui/error-text';
import { Text } from '@/components/ui/text';
import { useInterests } from '@/features/profile/hooks';

type Props = { value: number; onChange: (id: number) => void; error?: string };

// Una categoría de la lista de intereses, agrupada por sección. La usan grupos y planes.
export function CategorySelect({ value, onChange, error }: Props) {
  const { data: interests } = useInterests();
  const sections = [...new Set(interests?.map((i) => i.section))];

  return (
    <View className="gap-2">
      <Text variant="label">Categoría</Text>
      {sections.map((section) => (
        <View key={section} className="flex-row flex-wrap gap-2">
          {interests
            ?.filter((i) => i.section === section)
            .map((i) => (
              <Chip key={i.id} label={`${i.emoji} ${i.name}`} selected={value === i.id} onPress={() => onChange(i.id)} />
            ))}
        </View>
      ))}
      <ErrorText>{error}</ErrorText>
    </View>
  );
}
