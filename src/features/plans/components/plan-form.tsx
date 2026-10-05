import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { DateTimeField } from '@/components/ui/date-time-field';
import { ErrorText } from '@/components/ui/error-text';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { CategorySelect } from '@/features/catalog/components/category-select';
import { formatCalendarDate, formatTime, fromArgentina, todayInArgentina, type CalendarDate } from '@/lib/dates';
import type { PlanInput } from '@/services/plans';

type Props = {
  initial?: PlanInput;
  // Acceso del grupo del plan: define si se permite domicilio particular (spec 03).
  groupAccess: 'open' | 'approval' | null;
  submitLabel: string;
  loading?: boolean;
  error?: string | null;
  onSubmit: (input: PlanInput) => void;
};

const MIN_LEAD_MS = 30 * 60 * 1000;
const MAX_LEAD_MS = 60 * 24 * 3600 * 1000;
const MAX_DURATION_MS = 12 * 3600 * 1000;

// Reglas de la spec 03, "Crear plan". La base las vuelve a validar.
export function validatePlan(input: Omit<PlanInput, 'startsAt'> & { startsAt: Date | null }, now = new Date(), checkStart = true) {
  const errors: Partial<Record<'title' | 'placeName' | 'address' | 'startsAt' | 'endsAt' | 'maxParticipants' | 'categoryId', string>> = {};
  if (input.title.length < 3 || input.title.length > 60) errors.title = 'Entre 3 y 60 caracteres';
  if (input.placeName.length < 2 || input.placeName.length > 80) errors.placeName = '¿Dónde se juntan?';
  if (input.isPrivatePlace && (input.address?.length ?? 0) < 3) errors.address = 'Falta la dirección';
  if (!input.categoryId) errors.categoryId = 'Elegí una categoría';
  if (!Number.isInteger(input.maxParticipants) || input.maxParticipants < 2 || input.maxParticipants > 100) {
    errors.maxParticipants = 'Entre 2 y 100 personas';
  }
  if (!input.startsAt) {
    errors.startsAt = 'Elegí día y hora';
  } else if (checkStart && input.startsAt.getTime() < now.getTime() + MIN_LEAD_MS) {
    errors.startsAt = 'Tiene que empezar al menos 30 minutos después de ahora';
  } else if (checkStart && input.startsAt.getTime() > now.getTime() + MAX_LEAD_MS) {
    errors.startsAt = 'Como máximo dentro de 60 días';
  }
  if (input.startsAt && input.endsAt && input.endsAt.getTime() - input.startsAt.getTime() > MAX_DURATION_MS) {
    errors.endsAt = 'Puede durar como máximo 12 horas';
  }
  return errors;
}

export function PlanForm({ initial, groupAccess, submitLabel, loading, error, onSubmit }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? 0);
  const [isPrivatePlace, setIsPrivatePlace] = useState(initial?.isPrivatePlace ?? false);
  const [placeName, setPlaceName] = useState(initial?.placeName ?? '');
  const [zone, setZone] = useState(initial?.zone ?? '');
  const [address, setAddress] = useState(initial?.address ?? '');
  const [date, setDate] = useState<CalendarDate | null>(initial ? todayInArgentina(initial.startsAt) : null);
  const [startTime, setStartTime] = useState<string | null>(initial ? formatTime(initial.startsAt.toISOString()) : null);
  const [endTime, setEndTime] = useState<string | null>(initial?.endsAt ? formatTime(initial.endsAt.toISOString()) : null);
  const [maxParticipants, setMaxParticipants] = useState(String(initial?.maxParticipants ?? 8));
  const [touched, setTouched] = useState(false);
  // Momento de referencia fijo por pantalla, para que el render sea estable.
  const [now] = useState(() => new Date());

  const canBePrivate = groupAccess === 'approval';
  const startsAt = date && startTime ? fromArgentina(date, startTime) : null;
  let endsAt: Date | null = null;
  if (date && startTime && endTime) {
    endsAt = fromArgentina(date, endTime);
    // Si la hora de fin es anterior a la de inicio, termina al día siguiente.
    if (startsAt && endsAt <= startsAt) endsAt = new Date(endsAt.getTime() + 24 * 3600 * 1000);
  }

  const input = {
    title: title.trim(),
    description: description.trim() || null,
    categoryId,
    placeName: placeName.trim(),
    zone: zone.trim() || null,
    isPrivatePlace: canBePrivate && isPrivatePlace,
    address: canBePrivate && isPrivatePlace ? address.trim() : null,
    startsAt,
    endsAt,
    maxParticipants: Number(maxParticipants),
  };
  // Al editar, la anticipación mínima solo se exige si cambia el inicio.
  const startChanged = !initial || initial.startsAt.getTime() !== startsAt?.getTime();
  const errors = validatePlan(input, now, startChanged);
  const show = (field: keyof typeof errors) => (touched ? errors[field] : undefined);
  const today = todayInArgentina(now);
  const minDate = fromArgentina(today, '00:00');

  return (
    <View className="gap-4">
      <TextField label="¿Qué plan es?" value={title} onChangeText={setTitle} maxLength={60} placeholder="Patinar en el Bosque" error={show('title')} />

      <View className="flex-row gap-3">
        <DateTimeField
          label="Día"
          mode="date"
          value={date ? fromArgentina(date, '12:00') : null}
          display={date ? formatCalendarDate(date) : ''}
          placeholder="Elegir"
          minimumDate={minDate}
          maximumDate={new Date(now.getTime() + MAX_LEAD_MS)}
          onChange={(d) => setDate(todayInArgentina(d))}
          error={show('startsAt')}
        />
        <DateTimeField
          label="Hora"
          mode="time"
          value={startsAt}
          display={startTime ?? ''}
          placeholder="Elegir"
          onChange={(d) => setStartTime(formatTime(d.toISOString()))}
        />
      </View>
      <View className="flex-row items-end gap-3">
        <DateTimeField
          label="Hasta (opcional)"
          mode="time"
          value={endsAt}
          display={endTime ?? ''}
          placeholder="Sin hora de fin"
          onChange={(d) => setEndTime(formatTime(d.toISOString()))}
          error={show('endsAt')}
        />
        {endTime ? <Button title="Quitar" variant="ghost" onPress={() => setEndTime(null)} /> : null}
      </View>

      {canBePrivate ? (
        <View className="gap-2">
          <Text variant="label">¿Dónde?</Text>
          <View className="flex-row gap-2">
            {[
              { value: false, label: 'Lugar público' },
              { value: true, label: 'Domicilio particular' },
            ].map((o) => (
              <Pressable
                key={o.label}
                accessibilityRole="radio"
                accessibilityState={{ selected: isPrivatePlace === o.value }}
                onPress={() => setIsPrivatePlace(o.value)}
                className={`flex-1 items-center rounded-xl border py-3 ${isPrivatePlace === o.value ? 'border-brand-500 bg-brand-50' : 'border-line bg-surface'}`}>
                <Text className={isPrivatePlace === o.value ? 'font-semibold text-brand-700' : ''}>{o.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <TextField
        label={isPrivatePlace && canBePrivate ? 'Nombre del lugar' : 'Lugar'}
        value={placeName}
        onChangeText={setPlaceName}
        maxLength={80}
        placeholder={isPrivatePlace && canBePrivate ? 'Lo de Ana' : 'Parque Saavedra, Bar X…'}
        error={show('placeName')}
      />
      {isPrivatePlace && canBePrivate ? (
        <TextField
          label="Dirección"
          value={address}
          onChangeText={setAddress}
          maxLength={200}
          hint="Solo la ven quienes se suman al plan"
          error={show('address')}
        />
      ) : null}
      <TextField label="Zona (opcional)" value={zone} onChangeText={setZone} maxLength={40} placeholder="Centro, City Bell…" />

      <CategorySelect value={categoryId} onChange={setCategoryId} error={show('categoryId')} />

      <TextField
        label="¿Cuántas personas como máximo?"
        value={maxParticipants}
        onChangeText={(t) => setMaxParticipants(t.replace(/\D/g, ''))}
        keyboardType="number-pad"
        maxLength={3}
        hint="Te incluye a vos. Entre 2 y 100."
        error={show('maxParticipants')}
      />
      <TextField
        label="Descripción (opcional)"
        value={description}
        onChangeText={setDescription}
        maxLength={500}
        multiline
        style={{ height: 96, textAlignVertical: 'top', paddingTop: 12 }}
        placeholder="Detalles: qué llevar, nivel, punto de encuentro…"
      />

      <ErrorText>{error}</ErrorText>
      <Button
        title={submitLabel}
        loading={loading}
        onPress={() => {
          setTouched(true);
          if (Object.keys(errors).length === 0 && input.startsAt) onSubmit({ ...input, startsAt: input.startsAt });
        }}
      />
    </View>
  );
}
