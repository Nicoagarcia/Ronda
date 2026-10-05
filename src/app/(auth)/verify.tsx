import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { ErrorText } from '@/components/ui/error-text';
import { Header } from '@/components/ui/header';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { errorMessage } from '@/lib/errors';
import { resendEmailCode, verifyEmailCode } from '@/services/auth';

export default function VerifyScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      await verifyEmailCode(email, code.trim());
      // Con el email confirmado ya hay sesión: el portero lleva al onboarding.
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setError(null);
    try {
      await resendEmailCode(email);
      setNotice('Te mandamos un código nuevo.');
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <Screen scroll>
      <Header title="Revisá tu email" />
      <Text>
        Te mandamos un código de 6 dígitos a <Text className="font-semibold">{email}</Text>.
      </Text>
      <TextField
        label="Código"
        value={code}
        onChangeText={(t) => setCode(t.replace(/\D/g, ''))}
        keyboardType="number-pad"
        maxLength={6}
        autoComplete="one-time-code"
        className="mt-2"
      />
      <ErrorText>{error}</ErrorText>
      {notice ? <Text variant="muted">{notice}</Text> : null}
      <Button title="Confirmar" onPress={submit} loading={loading} disabled={code.length !== 6} />
      <Button title="Mandarme otro código" variant="ghost" onPress={resend} />
    </Screen>
  );
}
