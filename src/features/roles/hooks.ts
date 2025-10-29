import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchUserRole } from './api';
import { getUserId } from '@/lib/auth';

function useCurrentUserId() {
  const [userId, setUserId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return getUserId();
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setUserId(getUserId());
  }, []);

  return userId;
}

export function useUserRole() {
  const userId = useCurrentUserId();

  return useQuery({
    queryKey: ['user-role', userId],
    queryFn: () => fetchUserRole(userId!),
    enabled: Boolean(userId),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

