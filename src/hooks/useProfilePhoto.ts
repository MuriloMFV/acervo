import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from '../contexts/SessionContext';
import { queryKeys } from '../lib/queryClient';
import { pickCopyPhoto } from '../services/photos/picker';
import { saveProfilePhoto, signedProfilePhoto } from '../services/profile/photo';
import type { ProfileRow } from '../services/supabase/types';

export function useProfilePhoto(profile: ProfileRow | null) {
  const { session } = useSession();
  const client = useQueryClient();
  const userId = session?.user.id ?? '';
  const path = profile?.avatar_url ?? null;
  const photo = useQuery({
    queryKey: ['profile-photo', userId, path ?? ''],
    queryFn: () => signedProfilePhoto(userId, path!),
    enabled: !!session && !!path && profile?.id === userId,
    staleTime: 300_000, gcTime: 600_000, refetchInterval: 600_000, refetchIntervalInBackground: false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const locked = useRef(false);
  const active = useRef(false);
  const currentUserId = useRef(userId);
  currentUserId.current = userId;
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => setError(''), [userId, path]);

  const change = async (source: 'camera' | 'library' | 'remove') => {
    if (locked.current || !userId || !profile || profile.id !== userId) return;
    locked.current = true; setBusy(true); setError('');
    try {
      const picked = source === 'remove' ? null : await pickCopyPhoto(source);
      if ((source !== 'remove' && !picked) || !active.current || currentUserId.current !== userId) return;
      const result = await saveProfilePhoto(userId, path, picked ? { action: 'replace', photo: picked } : { action: 'remove' });
      if (active.current && currentUserId.current === userId) client.setQueryData(queryKeys.profile(userId), result.saved);
    } catch (cause) {
      if (active.current && currentUserId.current === userId) {
        setError(cause instanceof Error ? cause.message : 'Não foi possível alterar a foto. Tente novamente.');
        void client.invalidateQueries({ queryKey: queryKeys.profile(userId) });
      }
    } finally {
      locked.current = false;
      if (active.current) setBusy(false);
    }
  };

  const choose = () => {
    if (locked.current || !profile) return;
    Alert.alert('Foto de perfil', undefined, [
      { text: 'Escolher da galeria', onPress: () => { void change('library'); } },
      { text: 'Tirar foto', onPress: () => { void change('camera'); } },
      ...(path ? [{ text: 'Remover foto', style: 'destructive' as const, onPress: () => { void change('remove'); } }] : []),
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };
  return { url: photo.data ?? null, busy, loading: photo.isFetching && !photo.data, error: error || (photo.isError ? 'Não foi possível carregar a foto de perfil.' : ''), choose, retry: () => { if (error) choose(); else if (path) void photo.refetch(); } };
}
