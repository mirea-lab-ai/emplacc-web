import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchUser, fetchAllUsers, updateUser, type UpdateUserRequest } from './api';

export function useUser(userId: string | null, enabled = true) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId!),
    enabled: enabled && !!userId,
    staleTime: 30_000,
  });
}

export function useAllUsers(page = 1, pageSize = 100, enabled = true) {
  return useQuery({
    queryKey: ['allUsers', page, pageSize],
    queryFn: () => fetchAllUsers(page, pageSize),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 минут
    gcTime: 10 * 60 * 1000, // 10 минут
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload: UpdateUserRequest }) => 
      updateUser(userId, payload),
    onSuccess: (_, { userId }) => {
      // Инвалидировать кеш для пользователя
      queryClient.invalidateQueries({ queryKey: ['user', userId] });
    },
  });
}
