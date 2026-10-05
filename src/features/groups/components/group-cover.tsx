import { Image } from 'expo-image';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { coverColor, useCategory } from '@/features/groups/categories';

type Props = { imageUrl: string | null; categoryId: number; size?: number; height?: number; rounded?: number };

// Imagen del grupo o, si no tiene, el emoji de la categoría sobre un color (AC-04).
export function GroupCover({ imageUrl, categoryId, size, height, rounded = 16 }: Props) {
  const category = useCategory(categoryId);
  const style = { width: size ?? '100%', height: height ?? size, borderRadius: rounded } as const;

  if (imageUrl) return <Image source={{ uri: imageUrl }} style={style} contentFit="cover" transition={150} />;
  return (
    <View style={[style, { backgroundColor: coverColor(categoryId) }]} className="items-center justify-center">
      <Text style={{ fontSize: (height ?? size ?? 64) / 2.2 }}>{category?.emoji ?? '👥'}</Text>
    </View>
  );
}
