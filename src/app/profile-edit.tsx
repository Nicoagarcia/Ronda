import { router } from 'expo-router';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { ErrorText } from '@/components/ui/error-text';
import { Header } from '@/components/ui/header';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { CityPicker } from '@/features/profile/components/city-picker';
import { InterestPicker, MAX_INTERESTS, MIN_INTERESTS } from '@/features/profile/components/interest-picker';
import { PhotoPicker } from '@/features/profile/components/photo-picker';
import { useCities, useInterests, useMyProfile, useSetMyInterests, useUpdateMyProfile } from '@/features/profile/hooks';
import { errorMessage } from '@/lib/errors';
import type { MyProfile } from '@/services/profile';

const MAX_BIO = 300;

export default function ProfileEditScreen() {
  const { data: profile } = useMyProfile();
  return profile ? <ProfileEditForm profile={profile} /> : null;
}

// Editable: nombre, foto, ciudad, bio e intereses. La fecha de nacimiento no (spec 01, AC-13).
function ProfileEditForm({ profile }: { profile: MyProfile }) {
  const cities = useCities();
  const interests = useInterests();
  const update = useUpdateMyProfile();
  const saveInterests = useSetMyInterests();

  const [name, setName] = useState(profile.name ?? '');
  const [bio, setBio] = useState(profile.bio ?? '');
  const [cityId, setCityId] = useState(profile.city_id);
  const [selected, setSelected] = useState(profile.interest_ids);
  const [error, setError] = useState<string | null>(null);

  const nameValid = name.trim().length >= 2 && name.trim().length <= 30;
  const interestsValid = selected.length >= MIN_INTERESTS && selected.length <= MAX_INTERESTS;
  const saving = update.isPending || saveInterests.isPending;

  const save = async () => {
    setError(null);
    try {
      await update.mutateAsync({ name: name.trim(), bio: bio.trim() || null, city_id: cityId });
      await saveInterests.mutateAsync(selected);
      router.back();
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <Screen scroll>
      <Header title="Editar perfil" />
      <PhotoPicker uri={profile.avatar_url} name={profile.name} />
      <TextField label="Nombre" value={name} onChangeText={setName} maxLength={30} error={nameValid ? undefined : 'Entre 2 y 30 caracteres'} />
      <TextField
        label="Bio (opcional)"
        value={bio}
        onChangeText={setBio}
        maxLength={MAX_BIO}
        multiline
        style={{ height: 96, textAlignVertical: 'top', paddingTop: 12 }}
        hint={`${bio.length}/${MAX_BIO} · La ven quienes comparten un grupo o plan con vos`}
      />
      <Text variant="label">Ciudad</Text>
      {cities.data ? <CityPicker cities={cities.data} selected={cityId} onChange={setCityId} /> : null}
      <Text variant="label">
        Intereses ({selected.length}, entre {MIN_INTERESTS} y {MAX_INTERESTS})
      </Text>
      {interests.data ? <InterestPicker interests={interests.data} selected={selected} onChange={setSelected} /> : null}
      <ErrorText>{error}</ErrorText>
      <Button title="Guardar" onPress={save} loading={saving} disabled={!nameValid || !interestsValid} />
    </Screen>
  );
}
