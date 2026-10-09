import { useQuery } from '@tanstack/react-query';
import { useSession } from '../contexts/SessionContext';
import { signedCopyPhoto } from '../services/photos';

export function useCopyPhoto(itemId: string, path: string | null | undefined) {
  const { session } = useSession();
  const userId = session?.user.id ?? '';
  return useQuery({
    queryKey: ['copy-photo', userId, itemId, path ?? ''],
    queryFn: () => signedCopyPhoto(userId, itemId, path!),
    enabled: !!session && !!path,
    staleTime: 300_000, gcTime: 600_000, refetchInterval: 600_000, refetchIntervalInBackground: false,
  });
}
