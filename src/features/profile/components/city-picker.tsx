import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import type { City } from '@/services/catalog';

type Props = { cities: City[]; selected: number | null; onChange: (id: number) => void };

// En v0 solo La Plata está activa; el resto aparece como "Próximamente" (spec 01).
export function CityPicker({ cities, selected, onChange }: Props) {
  return (
    <View className="gap-2">
      {cities.map((city) => {
        const isSelected = city.id === selected;
        return (
          <Pressable
            key={city.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected, disabled: !city.is_active }}
            disabled={!city.is_active}
            onPress={() => onChange(city.id)}
            className={`flex-row items-center justify-between rounded-xl border px-4 py-3 ${isSelected ? 'border-brand-500 bg-brand-50' : 'border-line bg-surface'} ${city.is_active ? '' : 'opacity-50'}`}>
            <Text className={isSelected ? 'font-semibold text-brand-700' : ''}>
              {city.name}, {city.province}
            </Text>
            {!city.is_active ? <Text variant="muted">Próximamente</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}
