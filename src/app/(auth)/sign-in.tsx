import { Link, router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { ErrorText } from '@/components/ui/error-text';
import { Header } from '@/components/ui/header';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { errorCode, errorMessage } from '@/lib/errors';
import { resendEmailCode, signInWithEmail } from '@/services/auth';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithEmail(email.trim(), password);
      // Si sale bien, el portero lleva al onboarding o a la app.
    } catch (e) {
      if (errorCode(e) === 'email_not_confirmed') {
        // AC-02: sin confirmar el email no se entra. Se manda un código nuevo.
        await resendEmailCode(email.trim()).catch(() => undefined);
        router.push({ pathname: '/verify', params: { email: email.trim() } });
      } else {
        setError(errorMessage(e));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <Header title="Ingresar" />
      <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <TextField label="Contraseña" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" />
      <ErrorText>{error}</ErrorText>
      <Button title="Ingresar" onPress={submit} loading={loading} disabled={!email || !password} />
      <View className="items-center gap-3 pt-2">
        <Link href="/forgot-password">
          <Text className="text-brand-700">Olvidé mi contraseña</Text>
        </Link>
        <Link href="/sign-up">
          <Text>
            ¿No tenés cuenta? <Text className="font-semibold text-brand-700">Crear cuenta</Text>
          </Text>
        </Link>
      </View>
    </Screen>
  );
}
