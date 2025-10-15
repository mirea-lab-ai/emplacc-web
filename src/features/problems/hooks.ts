import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAllProblems, createProblem, deleteProblem, type CreateProblemRequest } from './api';

export function useAllProblems(page = 1, pageSize = 20, enabled = true) {
  return useQuery({
    queryKey: ['allProblems', page, pageSize],
    queryFn: () => fetchAllProblems(page, pageSize),
    enabled,
    staleTime: 30_000,
  });
}

export function useCreateProblem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (payload: CreateProblemRequest) => createProblem(payload),
    onSuccess: () => {
      // Инвалидировать кеш для всех проблем
      queryClient.invalidateQueries({ queryKey: ['allProblems'] });
    },
  });
}

export function useDeleteProblem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (problemId: string) => deleteProblem(problemId),
    onSuccess: () => {
      // Инвалидировать кеш для всех проблем
      queryClient.invalidateQueries({ queryKey: ['allProblems'] });
    },
  });
}