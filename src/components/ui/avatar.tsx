import { Image } from 'expo-image';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';

type Props = { uri?: string | null; name?: string | null; size?: number };

export function Avatar({ uri, name, size = 96 }: Props) {
  const style = { width: size, height: size, borderRadius: size / 2 };
  if (uri) return <Image source={{ uri }} style={style} contentFit="cover" transition={150} />;
  return (
    <View style={style} className="items-center justify-center bg-brand-100">
      <Text className="font-bold text-brand-700" style={{ fontSize: size / 2.5 }}>
        {name?.trim()[0]?.toUpperCase() ?? '?'}
      </Text>
    </View>
  );
}
