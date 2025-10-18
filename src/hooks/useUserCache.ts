// src/hooks/useUserCache.ts
import { useEffect } from 'react';
import { initializeUserCache, userCache } from '@/features/user/userCache';

export function useUserCache() {
  useEffect(() => {
    // Инициализируем кэш пользователей при монтировании
    initializeUserCache();
  }, []);

  return {
    getUserEmail: (userId: string) => userCache.getUserEmail(userId),
    isLoaded: userCache.isLoaded(),
    isLoading: userCache.isLoading(),
  };
}