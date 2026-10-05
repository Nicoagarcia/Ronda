import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Header } from '@/components/ui/header';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useMyGroups } from '@/features/groups/hooks';
import { useMyPlans } from '@/features/plans/hooks';
import { ProfileCard } from '@/features/profile/components/profile-card';
import { useCities, useInterests, useMyProfile } from '@/features/profile/hooks';
import { ageOn, fromIsoDate, todayInArgentina } from '@/lib/dates';

export default function ProfileScreen() {
  const { data: profile } = useMyProfile();
  const cities = useCities();
  const interests = useInterests();
  const myGroups = useMyGroups();
  const myPlans = useMyPlans();
  if (!profile) return null;

  const city = cities.data?.find((c) => c.id === profile.city_id)?.name ?? null;
  const myInterests = (interests.data ?? []).filter((i) => profile.interest_ids.includes(i.id));
  const age = profile.birthdate ? ageOn(fromIsoDate(profile.birthdate), todayInArgentina()) : null;

  return (
    <Screen scroll>
      <Header
        title="Perfil"
        back={false}
        right={
          <Pressable accessibilityRole="button" accessibilityLabel="Ajustes" onPress={() => router.push('/settings')} hitSlop={12}>
            <Ionicons name="settings-outline" size={24} color="#1c1917" />
          </Pressable>
        }
      />
      <ProfileCard name={profile.name} avatarUrl={profile.avatar_url} age={age} city={city} bio={profile.bio} interests={myInterests} />
      <View className="flex-row justify-center gap-8">
        <Text variant="muted">
          <Text className="font-bold">{myGroups.data?.filter((g) => g.my_status === 'active').length ?? 0}</Text> grupos
        </Text>
        <Text variant="muted">
          <Text className="font-bold">{myPlans.data?.filter((p) => p.status !== 'cancelled').length ?? 0}</Text> planes
        </Text>
      </View>
      <Button title="Editar perfil" variant="secondary" onPress={() => router.push('/profile-edit')} />
    </Screen>
  );
}
