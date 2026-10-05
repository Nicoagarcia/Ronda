import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Platform, Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';

const AR_TIMEZONE = 'America/Argentina/Buenos_Aires';

type Props = {
  label: string;
  mode: 'date' | 'time';
  value: Date | null;
  display: string;
  placeholder: string;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  error?: string;
};

// Selector nativo de fecha u hora. Siempre en hora de Argentina (spec 03).
export function DateTimeField({ label, mode, value, display, placeholder, onChange, minimumDate, maximumDate, error }: Props) {
  const open = () =>
    DateTimePickerAndroid.open({
      mode,
      value: value ?? minimumDate ?? new Date(),
      is24Hour: true,
      minimumDate,
      maximumDate,
      timeZoneName: AR_TIMEZONE,
      onValueChange: (_event, date) => onChange(date),
    });

  return (
    <View className="flex-1 gap-1.5">
      <Text variant="label">{label}</Text>
      {Platform.OS === 'android' ? (
        <Pressable
          accessibilityRole="button"
          onPress={open}
          className={`h-12 justify-center rounded-xl border bg-surface px-4 ${error ? 'border-danger' : 'border-line'}`}>
          <Text className={value ? '' : 'text-muted'}>{value ? display : placeholder}</Text>
        </Pressable>
      ) : (
        <DateTimePicker
          mode={mode}
          value={value ?? minimumDate ?? new Date()}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          timeZoneName={AR_TIMEZONE}
          display="compact"
          onValueChange={(_event, date) => onChange(date)}
        />
      )}
      {error ? (
        <Text variant="muted" className="text-danger">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
