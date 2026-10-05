import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { ErrorText } from '@/components/ui/error-text';
import { Header } from '@/components/ui/header';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { errorMessage } from '@/lib/errors';
import { requestPasswordReset, resetPasswordWithCode } from '@/services/auth';

const MIN_PASSWORD = 8;

// Dos pasos en la misma pantalla: pedir el código y, con el código, elegir la contraseña nueva (AC-03).
export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async (action: () => Promise<void>) => {
    setError(null);
    setLoading(true);
    try {
      await action();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const sendCode = () =>
    run(async () => {
      await requestPasswordReset(email.trim());
      setCodeSent(true);
    });

  // Al cambiarla queda la sesión iniciada y el portero lleva a la app.
  const reset = () => run(() => resetPasswordWithCode(email.trim(), code.trim(), password));

  return (
    <Screen scroll>
      <Header title="Cambiar contraseña" />
      {!codeSent ? (
        <>
          <Text>Te mandamos un código a tu email para elegir una contraseña nueva.</Text>
          <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
          <ErrorText>{error}</ErrorText>
          <Button title="Mandarme el código" onPress={sendCode} loading={loading} disabled={!email} />
        </>
      ) : (
        <>
          <Text>
            Si hay una cuenta con <Text className="font-semibold">{email}</Text>, te llegó un código.
          </Text>
          <TextField
            label="Código"
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, ''))}
            keyboardType="number-pad"
            maxLength={6}
            autoComplete="one-time-code"
          />
          <TextField
            label="Contraseña nueva"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            hint={`Mínimo ${MIN_PASSWORD} caracteres`}
          />
          <ErrorText>{error}</ErrorText>
          <Button title="Cambiar contraseña" onPress={reset} loading={loading} disabled={code.length !== 6 || password.length < MIN_PASSWORD} />
        </>
      )}
    </Screen>
  );
}
