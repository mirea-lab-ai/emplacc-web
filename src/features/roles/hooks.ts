import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchUserRole,
  fetchAllRoles,
  assignUserRole,
  removeUserRole,
  type UserRoleLookup,
  type UIRole,
} from './api';

export function useUserRole(userId: string | null, enabled = true) {
  return useQuery<UserRoleLookup>({
    queryKey: ['userRole', userId],
    queryFn: () => fetchUserRole(userId!),
    enabled: enabled && !!userId,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

export function useAllRoles(enabled = true) {
  return useQuery<UIRole[]>({
    queryKey: ['allRoles'],
    queryFn: fetchAllRoles,
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useAssignRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
      assignUserRole(userId, roleId),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['userRole', userId] });
    },
  });
}

export function useRemoveRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
      removeUserRole(userId, roleId),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['userRole', userId] });
    },
  });
}
