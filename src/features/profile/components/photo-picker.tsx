import { useState } from 'react';
import { View } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ErrorText } from '@/components/ui/error-text';
import { useUploadAvatar } from '@/features/profile/hooks';
import { pickPhoto } from '@/features/profile/pick-photo';
import { errorMessage } from '@/lib/errors';

type Props = { uri?: string | null; name?: string | null };

// Elegir o sacar la foto y subirla. No hay opción de quitarla (spec 01, AC-15b).
export function PhotoPicker({ uri, name }: Props) {
  const upload = useUploadAvatar();
  const [error, setError] = useState<string | null>(null);

  const choose = async (source: 'library' | 'camera') => {
    setError(null);
    const picked = await pickPhoto(source);
    if (!picked) return;
    if ('error' in picked) return setError(picked.error);
    upload.mutate(picked.uri, { onError: (e) => setError(errorMessage(e)) });
  };

  return (
    <View className="items-center gap-4">
      <Avatar uri={uri} name={name} size={140} />
      <View className="w-full gap-2">
        <Button title="Elegir de la galería" variant="secondary" loading={upload.isPending} onPress={() => choose('library')} />
        <Button title="Sacar una foto" variant="ghost" disabled={upload.isPending} onPress={() => choose('camera')} />
      </View>
      <ErrorText>{error}</ErrorText>
    </View>
  );
}
