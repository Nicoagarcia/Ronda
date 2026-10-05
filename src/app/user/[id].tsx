import { useLocalSearchParams } from 'expo-router';
import { Alert, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Header } from '@/components/ui/header';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { GroupCard } from '@/features/groups/components/group-card';
import { PlanCard } from '@/features/plans/components/plan-card';
import { ProfileCard } from '@/features/profile/components/profile-card';
import { useProfile } from '@/features/profile/hooks';

// Perfil de otra persona: muestra lo que devuelve la base según la visibilidad (spec 01).
export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: profile, isPending } = useProfile(id);

  if (isPending) return null;

  if (!profile) {
    return (
      <Screen>
        <Header />
        <EmptyState emoji="🙈" title="Perfil no disponible" />
      </Screen>
    );
  }

  const soon = () => Alert.alert('Próximamente', 'Reportar y bloquear llegan en el Hito 6.');

  return (
    <Screen scroll>
      <Header />
      <ProfileCard
        name={profile.name}
        avatarUrl={profile.avatar_url}
        age={profile.age}
        city={profile.city}
        bio={profile.extended ? profile.bio : null}
        interests={profile.interests}
      />
      {profile.extended && profile.groups?.length ? (
        <View className="gap-2">
          <Text variant="label">Grupos</Text>
          {profile.groups.map((g) => (
            <GroupCard
              key={g.id}
              id={g.id}
              name={g.name}
              imageUrl={g.image_url}
              categoryId={g.category_id}
              memberCount={g.member_count}
              maxMembers={g.max_members}
            />
          ))}
        </View>
      ) : null}
      {profile.extended && profile.plans?.length ? (
        <View className="gap-2">
          <Text variant="label">Próximos planes</Text>
          {profile.plans.map((p) => (
            <PlanCard
              key={p.id}
              id={p.id}
              title={p.title}
              categoryId={p.category_id}
              startsAt={p.starts_at}
              placeName={p.place_name}
              zone={p.zone}
              isPrivatePlace={p.is_private_place}
              participantCount={p.participant_count}
              maxParticipants={p.max_participants}
            />
          ))}
        </View>
      ) : null}
      <View className="flex-row gap-3">
        <Button title="Reportar" variant="ghost" className="flex-1" onPress={soon} />
        <Button title="Bloquear" variant="ghost" className="flex-1" onPress={soon} />
      </View>
    </Screen>
  );
}
