import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { ErrorText } from '@/components/ui/error-text';
import { Header } from '@/components/ui/header';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { useBlockFlow } from '@/features/moderation/hooks';
import { errorMessage } from '@/lib/errors';
import { createReport, type ReportReason, type ReportTarget } from '@/services/moderation';

// Motivos de la spec 06, con su prioridad para el moderador.
const REASONS: { value: ReportReason; label: string }[] = [
  { value: 'danger', label: '🚨 Me siento en peligro' },
  { value: 'harassment', label: 'Acoso o amenazas' },
  { value: 'underage', label: 'Parece menor de 18' },
  { value: 'sexual_violent', label: 'Contenido sexual o violento' },
  { value: 'impersonation', label: 'Se hace pasar por otra persona' },
  { value: 'spam', label: 'Spam o publicidad' },
  { value: 'other', label: 'Otro' },
];

const TARGET_LABEL: Record<ReportTarget, string> = {
  user: 'esta persona',
  group: 'este grupo',
  plan: 'este plan',
  message: 'este mensaje',
};

type Params = { type: ReportTarget; id: string; userId?: string; name?: string };

// /report?type=user|group|plan|message&id=…  (userId y name: para ofrecer bloquear después)
export default function ReportScreen() {
  const { type, id, userId, name } = useLocalSearchParams<Params>();
  const block = useBlockFlow();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (!reason) return;
    setError(null);
    setLoading(true);
    try {
      await createReport(type, id, reason, details.trim() || null);
      setSent(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <Screen>
        <Header />
        <View className="flex-1 justify-center gap-4">
          <Text className="text-5xl">🙏</Text>
          <Text variant="title">Gracias por avisar</Text>
          <Text>Lo vamos a revisar en menos de 24 horas. La otra persona no se entera de que la reportaste.</Text>
          {userId && name ? (
            <Button title={`Bloquear a ${name}`} variant="secondary" onPress={() => block(userId, name, () => router.back())} />
          ) : null}
          <Button title="Listo" variant="ghost" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Header title="Reportar" />
      <Text>¿Qué pasa con {TARGET_LABEL[type]}?</Text>

      <View className="gap-2">
        {REASONS.map((r) => (
          <Pressable
            key={r.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: reason === r.value }}
            onPress={() => setReason(r.value)}
            className={`rounded-xl border px-4 py-3 ${reason === r.value ? 'border-brand-500 bg-brand-50' : 'border-line bg-surface'}`}>
            <Text className={reason === r.value ? 'font-semibold text-brand-700' : ''}>{r.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Spec 06: antes de enviar, el 911 a mano. El reporte se manda igual. */}
      {reason === 'danger' ? (
        <View className="gap-3 rounded-2xl bg-red-50 p-4">
          <Text className="font-semibold text-danger">Si estás en peligro ahora, llamá al 911.</Text>
          <Button title="Llamar al 911" variant="danger" onPress={() => Linking.openURL('tel:911')} />
        </View>
      ) : null}

      {reason ? (
        <TextField
          label={reason === 'other' ? 'Contanos qué pasó' : 'Comentario (opcional)'}
          value={details}
          onChangeText={setDetails}
          maxLength={500}
          multiline
          style={{ height: 100, textAlignVertical: 'top', paddingTop: 12 }}
          hint={`${details.length}/500`}
        />
      ) : null}

      <ErrorText>{error}</ErrorText>
      <Button
        title="Enviar reporte"
        loading={loading}
        disabled={!reason || (reason === 'other' && !details.trim())}
        onPress={submit}
      />
      <Pressable onPress={() => router.push('/settings/rules')}>
        <Text variant="muted" className="text-center underline">
          Ver las normas de la comunidad
        </Text>
      </Pressable>
    </Screen>
  );
}
