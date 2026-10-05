import * as ImagePicker from 'expo-image-picker';

const MAX_BYTES = 10 * 1024 * 1024;

export type PickedPhoto = { uri: string } | { error: string } | null;

// Abre la galería o la cámara con recorte cuadrado. Rechaza fotos de más de 10 MB (spec 01, AC-15).
export async function pickPhoto(source: 'library' | 'camera'): Promise<PickedPhoto> {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return { error: source === 'camera' ? 'Necesitamos permiso para usar la cámara.' : 'Necesitamos permiso para ver tus fotos.' };
  }

  const options: ImagePicker.ImagePickerOptions = { mediaTypes: 'images', allowsEditing: true, aspect: [1, 1], quality: 1 };
  const result =
    source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled) return null;

  const asset = result.assets[0];
  if (asset.fileSize && asset.fileSize > MAX_BYTES) return { error: 'La foto pesa más de 10 MB. Elegí otra.' };
  return { uri: asset.uri };
}
