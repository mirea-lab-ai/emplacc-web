import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { createProject, fetchAllUserProjects, type CreateProjectRequest } from './api';

export function useCreateProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (payload: CreateProjectRequest) => createProject(payload),
    onSuccess: () => {
      // Инвалидировать кеш для всех проектов
      queryClient.invalidateQueries({ queryKey: ['userProjects'] });
    },
  });
}

export function useAllUserProjects(enabled = true) {
  return useQuery({
    queryKey: ['allUserProjects'],
    queryFn: () => fetchAllUserProjects(),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 минут
    gcTime: 10 * 60 * 1000, // 10 минут
  });
}
