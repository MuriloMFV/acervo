import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { File } from 'expo-file-system';
import { MAX_PHOTO_BYTES, type PreparedCopyPhoto } from './validation';

export async function pickCopyPhoto(source: 'camera' | 'library'): Promise<PreparedCopyPhoto | null> {
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new Error('Permita acesso à câmera nas configurações.');
  }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: false, quality: 0.85, exif: false };
  const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset || !asset.width || !asset.height || asset.width * asset.height > 64_000_000 || (asset.fileSize ?? 0) > 30 * 1024 * 1024) throw new Error('Escolha uma foto menor.');
  const context = ImageManipulator.manipulate(asset.uri);
  try {
    if (Math.max(asset.width, asset.height) > 1600) context.resize(asset.width >= asset.height ? { width: 1600, height: null } : { width: null, height: 1600 });
    const image = await context.renderAsync();
    try {
      const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
      if (new File(saved.uri).size > MAX_PHOTO_BYTES) throw new Error('A foto deve ter até 5 MB.');
      return { uri: saved.uri, mime: 'image/jpeg' };
    } finally { image.release(); }
  } finally { context.release(); }
}
