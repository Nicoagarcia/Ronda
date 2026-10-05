import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { ErrorText } from '@/components/ui/error-text';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { CityPicker } from '@/features/profile/components/city-picker';
import { InterestPicker, MAX_INTERESTS, MIN_INTERESTS } from '@/features/profile/components/interest-picker';
import { PhotoPicker } from '@/features/profile/components/photo-picker';
import {
  useCities,
  useCompleteOnboarding,
  useInterests,
  useMyProfile,
  useSetMyBirthdate,
  useSetMyInterests,
  useUpdateMyProfile,
} from '@/features/profile/hooks';
import { currentOnboardingStep, ONBOARDING_STEPS } from '@/features/profile/onboarding';
import { ageOn, parseCalendarDate, toIsoDate, todayInArgentina } from '@/lib/dates';
import { errorMessage } from '@/lib/errors';
import { signOut } from '@/services/auth';
import type { MyProfile } from '@/services/profile';

// Onboarding en 6 pasos (spec 01). El paso sale de lo que ya está cargado,
// así que al reabrir la app sigue donde quedó (AC-10).
export default function OnboardingScreen() {
  const { data: profile } = useMyProfile();
  if (!profile) return null;

  const step = currentOnboardingStep(profile);
  const index = ONBOARDING_STEPS.indexOf(step);

  return (
    <Screen scroll>
      <View className="flex-row items-center justify-between">
        <Text variant="muted">
          Paso {index + 1} de {ONBOARDING_STEPS.length}
        </Text>
        <Pressable onPress={() => signOut()} hitSlop={12}>
          <Text variant="muted">Salir</Text>
        </Pressable>
      </View>
      <View className="h-1.5 overflow-hidden rounded-full bg-line">
        <View className="h-full rounded-full bg-brand-500" style={{ width: `${((index + 1) / ONBOARDING_STEPS.length) * 100}%` }} />
      </View>

      {step === 'name' && <NameStep profile={profile} />}
      {step === 'birthdate' && <BirthdateStep />}
      {step === 'photo' && <PhotoStep profile={profile} />}
      {step === 'city' && <CityStep />}
      {step === 'interests' && <InterestsStep profile={profile} />}
      {step === 'terms' && <TermsStep />}
    </Screen>
  );
}

function StepTitle({ title, description }: { title: string; description?: string }) {
  return (
    <View className="gap-1 pt-4">
      <Text variant="title">{title}</Text>
      {description ? <Text variant="muted">{description}</Text> : null}
    </View>
  );
}

function NameStep({ profile }: { profile: MyProfile }) {
  const [name, setName] = useState(profile.name ?? '');
  const update = useUpdateMyProfile();
  const valid = name.trim().length >= 2 && name.trim().length <= 30;

  return (
    <>
      <StepTitle title="¿Cómo te llamás?" description="Así te van a ver en los grupos y planes." />
      <TextField label="Nombre" value={name} onChangeText={setName} maxLength={30} autoComplete="given-name" hint="Entre 2 y 30 caracteres" />
      <ErrorText>{update.error ? errorMessage(update.error) : null}</ErrorText>
      <Button title="Seguir" disabled={!valid} loading={update.isPending} onPress={() => update.mutate({ name: name.trim() })} />
    </>
  );
}

function BirthdateStep() {
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [error, setError] = useState<string | null>(null);
  const save = useSetMyBirthdate();

  const submit = () => {
    setError(null);
    const date = parseCalendarDate(day, month, year);
    if (!date) return setError('Esa fecha no existe. Revisala.');
    // La base también lo valida (AC-08); esto es para avisar sin esperar al servidor.
    if (ageOn(date, todayInArgentina()) < 18) return setError('Ronda es para mayores de 18.');
    save.mutate(toIsoDate(date), { onError: (e) => setError(errorMessage(e)) });
  };

  const digits = (setter: (v: string) => void) => (t: string) => setter(t.replace(/\D/g, ''));

  return (
    <>
      <StepTitle title="¿Cuándo naciste?" description="Ronda es para mayores de 18. Después no se puede cambiar, así que revisala bien." />
      <View className="flex-row gap-3">
        <TextField label="Día" value={day} onChangeText={digits(setDay)} keyboardType="number-pad" maxLength={2} placeholder="DD" className="flex-1" />
        <TextField label="Mes" value={month} onChangeText={digits(setMonth)} keyboardType="number-pad" maxLength={2} placeholder="MM" className="flex-1" />
        <TextField label="Año" value={year} onChangeText={digits(setYear)} keyboardType="number-pad" maxLength={4} placeholder="AAAA" className="flex-[1.5]" />
      </View>
      <ErrorText>{error}</ErrorText>
      <Button title="Seguir" disabled={!day || !month || year.length !== 4} loading={save.isPending} onPress={submit} />
    </>
  );
}

function PhotoStep({ profile }: { profile: MyProfile }) {
  return (
    <>
      <StepTitle title="Sumá una foto" description="Es obligatoria: da confianza a quienes van a conocerte." />
      <PhotoPicker uri={profile.avatar_url} name={profile.name} />
    </>
  );
}

function CityStep() {
  const cities = useCities();
  const [cityId, setCityId] = useState<number | null>(null);
  const update = useUpdateMyProfile();

  return (
    <>
      <StepTitle title="¿Dónde estás?" description="Te mostramos grupos y planes de tu ciudad." />
      {cities.data ? <CityPicker cities={cities.data} selected={cityId} onChange={setCityId} /> : null}
      <ErrorText>{update.error ? errorMessage(update.error) : null}</ErrorText>
      <Button title="Seguir" disabled={!cityId} loading={update.isPending} onPress={() => cityId && update.mutate({ city_id: cityId })} />
    </>
  );
}

function InterestsStep({ profile }: { profile: MyProfile }) {
  const interests = useInterests();
  const [selected, setSelected] = useState<number[]>(profile.interest_ids);
  const save = useSetMyInterests();
  const count = selected.length;

  return (
    <>
      <StepTitle title="¿Qué te gusta?" description={`Elegí entre ${MIN_INTERESTS} y ${MAX_INTERESTS}. Llevás ${count}.`} />
      {interests.data ? <InterestPicker interests={interests.data} selected={selected} onChange={setSelected} /> : null}
      <ErrorText>{save.error ? errorMessage(save.error) : null}</ErrorText>
      <Button title="Seguir" disabled={count < MIN_INTERESTS || count > MAX_INTERESTS} loading={save.isPending} onPress={() => save.mutate(selected)} />
    </>
  );
}

function TermsStep() {
  const [accepted, setAccepted] = useState(false);
  const complete = useCompleteOnboarding();

  return (
    <>
      <StepTitle title="Último paso" description="Ronda funciona si todos nos cuidamos." />
      <View className="gap-2 rounded-2xl bg-brand-50 p-4">
        <Text>• Respeto siempre. Nada de acoso ni discriminación.</Text>
        <Text>• Solo mayores de 18.</Text>
        <Text>• Encontrate en lugares públicos y avisale a alguien a dónde vas.</Text>
        <Text>• Si algo no está bien, reportalo.</Text>
      </View>
      {/* Los textos legales completos (términos, privacidad y normas) llegan en el Hito 7. */}
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: accepted }}
        onPress={() => setAccepted(!accepted)}
        className="flex-row items-center gap-3 py-2">
        <View className={`h-6 w-6 items-center justify-center rounded-md border-2 ${accepted ? 'border-brand-500 bg-brand-500' : 'border-line'}`}>
          {accepted ? <Text className="font-bold text-white">✓</Text> : null}
        </View>
        <Text className="flex-1">Acepto los términos, la política de privacidad y las normas de la comunidad.</Text>
      </Pressable>
      <ErrorText>{complete.error ? errorMessage(complete.error) : null}</ErrorText>
      <Button title="Empezar" disabled={!accepted} loading={complete.isPending} onPress={() => complete.mutate()} />
    </>
  );
}
