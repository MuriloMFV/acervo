import { File } from 'expo-file-system';
import { MAX_PHOTO_BYTES } from './validation';

export async function readPhotoFile(uri: string): Promise<ArrayBuffer> {
  const file = new File(uri);
  if (!file.exists || file.size <= 0 || file.size > MAX_PHOTO_BYTES) throw new Error('A foto deve ter até 5 MB.');
  return file.arrayBuffer();
}
