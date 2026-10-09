import { useQuery } from '@tanstack/react-query';
import { useSession } from '../contexts/SessionContext';
import { getCollectionBox, listCollectionBoxes } from '../services/boxes';
export const boxQueryKeys = {
  collection: (userId: string) => ['collection-boxes',userId] as const,
  item: (userId: string,id: string) => ['collection-boxes',userId,id] as const,
};
export function useCollectionBoxes() {
  const {session}=useSession();
  return useQuery({queryKey:boxQueryKeys.collection(session?.user.id??''),queryFn:({signal})=>listCollectionBoxes(signal),enabled:!!session,retry:false});
}
export function useCollectionBox(id:string) {
  const {session}=useSession();
  return useQuery({queryKey:boxQueryKeys.item(session?.user.id??'',id),queryFn:({signal})=>getCollectionBox(id,signal),enabled:!!session&&!!id,retry:false});
}
