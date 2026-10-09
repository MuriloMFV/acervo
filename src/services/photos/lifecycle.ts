import type { PhotoDraft } from './validation.ts';
// Upload before linking; detach before deleting. Storage RLS prevents deleting
// an object still referenced after an ambiguous network failure/concurrent save.
export async function saveCopyPhoto<T>(previous: string | null, draft: PhotoDraft, operations: {
  upload: () => Promise<string>; persist: (path: string | null | undefined) => Promise<T>; remove: (path: string) => Promise<void>;
}): Promise<{ saved: T; cleanupPending: boolean }> {
  let uploaded: string | undefined;
  const next = draft.action === 'keep' ? undefined : draft.action === 'remove' ? null : (uploaded = await operations.upload());
  let saved: T;
  try { saved = await operations.persist(next); }
  catch (error) { if (uploaded) { try { await operations.remove(uploaded); } catch { /* Keep original save error. RLS protects linked objects. */ } } throw error; }
  let cleanupPending = false;
  if (next !== undefined && previous && previous !== next) {
    try { await operations.remove(previous); } catch { cleanupPending = true; }
  }
  return { saved, cleanupPending };
}
