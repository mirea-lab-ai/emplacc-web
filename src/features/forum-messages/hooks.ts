import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchForumMessagesByProblem, createForumMessage, type CreateForumMessageRequest } from './api';

export function useForumMessagesByProblem(problemId: string | null, page = 1, pageSize = 20, enabled = true) {
  return useQuery({
    queryKey: ['forumMessages', problemId, page, pageSize],
    queryFn: () => fetchForumMessagesByProblem(problemId!, page, pageSize),
    enabled: enabled && !!problemId,
    staleTime: 10_000,
    refetchInterval: enabled && !!problemId ? 10_000 : false,
  });
}

export function useCreateForumMessage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (payload: CreateForumMessageRequest) => createForumMessage(payload),
    onSuccess: (_, { problem_id }) => {
      // Инвалидировать кеш для сообщений этой проблемы
      queryClient.invalidateQueries({ queryKey: ['forumMessages', problem_id] });
    },
  });
}
