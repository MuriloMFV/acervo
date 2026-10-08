import { useQuery } from '@tanstack/react-query';
import { useSession } from '../contexts/SessionContext';
import { queryKeys } from '../lib/queryClient';
import { getProfile } from '../services/supabase/profile';

export function useProfile() {
  const { session } = useSession();
  return useQuery({ queryKey: queryKeys.profile(session?.user.id ?? ''), queryFn: ({ signal }) => getProfile(signal), enabled: !!session });
}
