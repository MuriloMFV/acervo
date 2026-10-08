// Dependency-injected orchestration, testable without a remote database.
export async function reuseOrCreate<T>({ find, insert, retryUnique = false }: {
  find: () => Promise<T | null>; insert: () => Promise<T>; retryUnique?: boolean;
}): Promise<T> {
  const existing = await find();
  if (existing) return existing;
  try { return await insert(); } catch (error: unknown) {
    if (retryUnique && typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
      const raced = await find();
      if (raced) return raced;
    }
    throw error;
  }
}
