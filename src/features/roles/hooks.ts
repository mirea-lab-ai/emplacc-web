import { useQuery } from '@tanstack/react-query';
import { fetchUserRole, type UserRoleLookup } from './api';

export function useUserRole(userId: string | null, enabled = true) {
  return useQuery<UserRoleLookup>({
    queryKey: ['userRole', userId],
    queryFn: () => fetchUserRole(userId!),
    enabled: enabled && !!userId,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

