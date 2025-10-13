import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchUser, updateUser, type UpdateUserRequest } from './api';

export function useUser(userId: string | null, enabled = true) {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId!),
    enabled: enabled && !!userId,
    staleTime: 30_000,
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
