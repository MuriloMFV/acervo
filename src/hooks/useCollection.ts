import { useQuery } from '@tanstack/react-query';
import { useSession } from '../contexts/SessionContext';
import { queryKeys } from '../lib/queryClient';
import { getCollectionItem, listCollectionItems } from '../services/collection';

export function useCollection() {
  const { session } = useSession();
  return useQuery({ queryKey: queryKeys.collection(session?.user.id ?? ''), queryFn: ({ signal }) => listCollectionItems(signal), enabled: !!session });
}
export function useCollectionItem(id: string) {
  const { session } = useSession();
  return useQuery({ queryKey: queryKeys.item(session?.user.id ?? '', id), queryFn: ({ signal }) => getCollectionItem(id, signal), enabled: !!session && !!id });
}
