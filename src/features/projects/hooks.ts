import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createProject, type CreateProjectRequest } from './api';

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
