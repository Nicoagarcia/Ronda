import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { ErrorText } from '@/components/ui/error-text';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { CategorySelect } from '@/features/catalog/components/category-select';
import { GroupCover } from '@/features/groups/components/group-cover';
import { pickPhoto } from '@/features/profile/pick-photo';
import type { GroupAccess, GroupInput } from '@/services/groups';

export type GroupFormValues = GroupInput & { imageUri: string | null };

type Props = {
  initial?: Partial<GroupFormValues>;
  submitLabel: string;
  loading?: boolean;
  error?: string | null;
  onSubmit: (values: GroupFormValues) => void;
};

const ACCESS_OPTIONS: { value: GroupAccess; title: string; description: string }[] = [
  { value: 'open', title: 'Abierto', description: 'Cualquiera de la ciudad entra directo.' },
  { value: 'approval', title: 'Con aprobación', description: 'Piden ingreso y vos decidís quién entra.' },
];

// Reglas de la spec 02, "Crear grupo". La base las vuelve a validar.
export function validateGroup(v: Pick<GroupFormValues, 'name' | 'description' | 'maxMembers' | 'categoryId'>) {
  const errors: Partial<Record<'name' | 'description' | 'maxMembers' | 'categoryId', string>> = {};
  const name = v.name.trim();
  const description = v.description.trim();
  if (name.length < 3 || name.length > 50) errors.name = 'Entre 3 y 50 caracteres';
  if (description.length < 10 || description.length > 500) errors.description = 'Entre 10 y 500 caracteres';
  if (!Number.isInteger(v.maxMembers) || v.maxMembers < 2 || v.maxMembers > 500) errors.maxMembers = 'Entre 2 y 500 personas';
  if (!v.categoryId) errors.categoryId = 'Elegí una categoría';
  return errors;
}

export function GroupForm({ initial, submitLabel, loading, error, onSubmit }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [categoryId, setCategoryId] = useState<number>(initial?.categoryId ?? 0);
  const [zone, setZone] = useState(initial?.zone ?? '');
  const [maxMembers, setMaxMembers] = useState(String(initial?.maxMembers ?? 20));
  const [access, setAccess] = useState<GroupAccess>(initial?.access ?? 'open');
  const [imageUri, setImageUri] = useState<string | null>(initial?.imageUri ?? null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const values: GroupFormValues = {
    name: name.trim(),
    description: description.trim(),
    categoryId,
    zone: zone.trim() || null,
    maxMembers: Number(maxMembers),
    access,
    imageUri,
  };
  const errors = validateGroup(values);
  const valid = Object.keys(errors).length === 0;
  const show = (field: keyof typeof errors) => (touched ? errors[field] : undefined);

  const chooseImage = async () => {
    setImageError(null);
    const picked = await pickPhoto('library');
    if (!picked) return;
    if ('error' in picked) return setImageError(picked.error);
    setImageUri(picked.uri);
  };

  return (
    <View className="gap-4">
      <Pressable accessibilityRole="button" accessibilityLabel="Elegir imagen del grupo" onPress={chooseImage} className="gap-2">
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={{ width: '100%', height: 160, borderRadius: 16 }} contentFit="cover" />
        ) : (
          <GroupCover imageUrl={null} categoryId={categoryId || 0} height={160} />
        )}
        <Text variant="muted" className="text-center">
          {imageUri ? 'Tocá para cambiar la imagen' : 'Imagen opcional · tocá para elegir'}
        </Text>
      </Pressable>
      <ErrorText>{imageError}</ErrorText>

      <TextField label="Nombre" value={name} onChangeText={setName} maxLength={50} placeholder="Patinadores de La Plata" error={show('name')} />
      <TextField
        label="Descripción"
        value={description}
        onChangeText={setDescription}
        maxLength={500}
        multiline
        style={{ height: 110, textAlignVertical: 'top', paddingTop: 12 }}
        placeholder="¿De qué se trata? ¿Qué hacen?"
        hint={`${description.length}/500`}
        error={show('description')}
      />

      <CategorySelect value={categoryId} onChange={setCategoryId} error={show('categoryId')} />

      <TextField label="Zona (opcional)" value={zone} onChangeText={setZone} maxLength={40} placeholder="Centro, City Bell…" />
      <TextField
        label="¿Cuántas personas como máximo?"
        value={maxMembers}
        onChangeText={(t) => setMaxMembers(t.replace(/\D/g, ''))}
        keyboardType="number-pad"
        maxLength={3}
        hint="Te incluye a vos. Entre 2 y 500."
        error={show('maxMembers')}
      />

      <View className="gap-2">
        <Text variant="label">¿Cómo se entra?</Text>
        {ACCESS_OPTIONS.map((o) => {
          const selected = access === o.value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => setAccess(o.value)}
              className={`gap-0.5 rounded-xl border px-4 py-3 ${selected ? 'border-brand-500 bg-brand-50' : 'border-line bg-surface'}`}>
              <Text className={selected ? 'font-semibold text-brand-700' : 'font-semibold'}>{o.title}</Text>
              <Text variant="muted">{o.description}</Text>
            </Pressable>
          );
        })}
      </View>

      <ErrorText>{error}</ErrorText>
      <Button
        title={submitLabel}
        loading={loading}
        onPress={() => {
          setTouched(true);
          if (valid) onSubmit(values);
        }}
      />
    </View>
  );
}
