import { saveCopyPhoto } from '../photos/lifecycle.ts';
import type { PhotoDraft, PreparedCopyPhoto } from '../photos/validation.ts';
import { isOwnProfilePhoto } from './photoValidation.ts';

export async function saveProfilePhotoChange<T>(userId: string, previous: string | null, draft: Exclude<PhotoDraft, { action: 'keep' }>, operations: {
  currentUserId: () => Promise<string>;
  upload: (photo: PreparedCopyPhoto) => Promise<string>;
  persist: (path: string | null, expected: string | null) => Promise<T>;
  remove: (path: string) => Promise<void>;
}): Promise<{ saved: T; cleanupPending: boolean }> {
  if (previous && !isOwnProfilePhoto(previous, userId)) throw new Error('Foto de perfil inválida.');
  const checkSession = async () => {
    if (await operations.currentUserId() !== userId) throw new Error('Sessão alterada. Entre novamente.');
  };
  await checkSession();
  return saveCopyPhoto(previous, draft, {
    upload: async () => {
      await checkSession();
      if (draft.action !== 'replace') throw new Error('Foto de perfil inválida.');
      return operations.upload(draft.photo);
    },
    persist: async path => {
      await checkSession();
      if (path === undefined || path !== null && !isOwnProfilePhoto(path, userId)) throw new Error('Foto de perfil inválida.');
      return operations.persist(path, previous);
    },
    remove: async path => {
      await checkSession();
      if (!isOwnProfilePhoto(path, userId)) throw new Error('Foto de perfil inválida.');
      await operations.remove(path);
    },
  });
}
