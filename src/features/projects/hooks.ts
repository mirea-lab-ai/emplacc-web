import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { createProject, fetchAllUserProjects, type CreateProjectRequest } from './api';

const PROJECTS_REFRESH_INTERVAL_MS = 60_000;

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
  const shouldFetch = enabled;
  return useQuery({
    queryKey: ['allUserProjects'],
    queryFn: () => fetchAllUserProjects(),
    enabled: shouldFetch,
    staleTime: 5 * 60 * 1000, // 5 минут
    gcTime: 10 * 60 * 1000, // 10 минут
    refetchInterval: shouldFetch ? PROJECTS_REFRESH_INTERVAL_MS : false,
    refetchIntervalInBackground: true,
  });
}
