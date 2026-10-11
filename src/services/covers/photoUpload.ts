import { validatePhotoBytes, type PhotoMime, type PreparedCopyPhoto } from '../photos/validation.ts';
import { editionCoverPhotoPath, storedEditionCover } from './storage.ts';

interface PhotoUploadOperations {
  currentUserId: () => Promise<string>;
  readFile: (uri: string) => Promise<ArrayBuffer>;
  createId: () => string;
  upload: (path: string, buffer: ArrayBuffer, mime: PhotoMime) => Promise<void>;
  publicUrl: (path: string) => string;
  bucketUrl: string;
}

// Only return a permanent Storage URL after a successful immutable upload.
// The form keeps its previous selection until this operation completes.
export async function saveEditionCoverPhoto(userId: string, photo: PreparedCopyPhoto, operations: PhotoUploadOperations): Promise<string> {
  const checkSession = async () => {
    if (await operations.currentUserId() !== userId) throw new Error('Sessão alterada.');
  };
  await checkSession();
  const buffer = await operations.readFile(photo.uri);
  const mime = validatePhotoBytes(new Uint8Array(buffer), photo.mime);
  const path = editionCoverPhotoPath(userId, operations.createId(), mime);
  await checkSession();
  await operations.upload(path, buffer, mime);
  await checkSession();
  const url = storedEditionCover(operations.publicUrl(path), operations.bucketUrl);
  if (!url) throw new Error('Não foi possível salvar a imagem da edição.');
  return url;
}
