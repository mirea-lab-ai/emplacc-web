import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAliases, createAlias, deleteAlias } from './api';

export function useAliases(enabled = true) {
  return useQuery({
    queryKey: ['aliases'],
    queryFn: fetchAliases,
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateAlias() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ alias, targetUserId }: { alias: string; targetUserId: string }) => createAlias(alias, targetUserId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['aliases'] }),
  });
}

export function useDeleteAlias() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAlias(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['aliases'] }),
  });
}
