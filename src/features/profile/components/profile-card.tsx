import { View } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { Chip } from '@/components/ui/chip';
import { Text } from '@/components/ui/text';

type Props = {
  name: string | null;
  avatarUrl: string | null;
  age: number | null;
  city: string | null;
  bio?: string | null;
  interests: { id: number; name: string; emoji: string }[];
};

// Lo que se ve de una persona: foto, nombre, edad, ciudad, bio (si corresponde) e intereses.
export function ProfileCard({ name, avatarUrl, age, city, bio, interests }: Props) {
  return (
    <View className="gap-4">
      <View className="items-center gap-2">
        <Avatar uri={avatarUrl} name={name} size={120} />
        <Text variant="title">
          {name}
          {age !== null ? <Text className="text-2xl font-normal text-muted">, {age}</Text> : null}
        </Text>
        {city ? <Text variant="muted">📍 {city}</Text> : null}
      </View>
      {bio ? <Text className="text-center">{bio}</Text> : null}
      <View className="flex-row flex-wrap justify-center gap-2">
        {interests.map((i) => (
          <Chip key={i.id} label={`${i.emoji} ${i.name}`} />
        ))}
      </View>
    </View>
  );
}
