import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '../contexts/SessionContext';
import { queryKeys } from '../lib/queryClient';
import { getCollectionItem, listCollectionItems } from '../services/collection';
import { signedCopyPhotoCovers } from '../services/photos';
import { photoCoverRequests, withPhotoCover } from '../services/photos/covers';
import { useCopyPhoto } from './useCopyPhoto';

export function useCollection() {
  const { session } = useSession();
  const userId = session?.user.id ?? '';
  const collection = useQuery({ queryKey: queryKeys.collection(userId), queryFn: ({ signal }) => listCollectionItems(signal), enabled: !!session });
  const requests = useMemo(() => photoCoverRequests(collection.data ?? [], userId), [collection.data, userId]);
  const photos = useQuery({
    queryKey: ['copy-photo-covers', userId, requests],
    queryFn: () => signedCopyPhotoCovers(userId, requests),
    enabled: !!session && requests.length > 0,
    staleTime: 300_000, gcTime: 600_000, refetchInterval: 600_000, refetchIntervalInBackground: false,
  });
  const data = useMemo(() => collection.data?.map(item => withPhotoCover(item, photos.isError ? {} : photos.data ?? {})), [collection.data, photos.data, photos.isError]);
  return { ...collection, data };
}
export function useCollectionItem(id: string) {
  const { session } = useSession();
  const item = useQuery({ queryKey: queryKeys.item(session?.user.id ?? '', id), queryFn: ({ signal }) => getCollectionItem(id, signal), enabled: !!session && !!id });
  const path = item.data?.use_photo_as_cover ? item.data.photo_url : null;
  const photo = useCopyPhoto(id, path);
  const data = useMemo(() => item.data ? withPhotoCover(item.data, path && photo.data && !photo.isError ? { [path]: photo.data } : {}) : item.data, [item.data, path, photo.data, photo.isError]);
  return { ...item, data };
}
