import { decode } from 'base64-arraybuffer';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

// Achica la imagen a 1024 px de ancho y la pasa a JPEG, lista para subir a Storage.
export async function compressToJpeg(localUri: string): Promise<ArrayBuffer> {
  const rendered = await ImageManipulator.manipulate(localUri).resize({ width: 1024 }).renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.8, base64: true });
  if (!saved.base64) throw new Error('No se pudo procesar la imagen');
  return decode(saved.base64);
}

// El parámetro evita que el celular muestre la imagen vieja desde el caché.
export function withCacheBuster(url: string): string {
  return `${url}?v=${Date.now()}`;
}
