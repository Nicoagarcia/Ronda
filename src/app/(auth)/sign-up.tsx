import { router } from 'expo-router';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { ErrorText } from '@/components/ui/error-text';
import { Header } from '@/components/ui/header';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { errorMessage } from '@/lib/errors';
import { signUpWithEmail } from '@/services/auth';

const MIN_PASSWORD = 8;

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const tooShort = password.length > 0 && password.length < MIN_PASSWORD;

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      await signUpWithEmail(email.trim(), password);
      router.replace({ pathname: '/verify', params: { email: email.trim() } });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <Header title="Crear cuenta" />
      <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <TextField
        label="Contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        hint={`Mínimo ${MIN_PASSWORD} caracteres`}
        error={tooShort ? `Mínimo ${MIN_PASSWORD} caracteres` : undefined}
      />
      <ErrorText>{error}</ErrorText>
      <Button title="Crear cuenta" onPress={submit} loading={loading} disabled={!email || password.length < MIN_PASSWORD} />
    </Screen>
  );
}
