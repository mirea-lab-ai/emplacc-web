import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchForumMessagesByProblem,
  createForumMessage,
  updateForumMessage,
  deleteForumMessage,
  type CreateForumMessageRequest,
} from './api';

export function useForumMessagesByProblem(problemId: string | null, page = 1, pageSize = 100, enabled = true) {
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
      queryClient.invalidateQueries({ queryKey: ['forumMessages', problem_id] });
    },
  });
}

export function useUpdateForumMessage(problemId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, description }: { id: string; description: string[] }) =>
      updateForumMessage(id, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forumMessages', problemId] });
    },
  });
}

export function useDeleteForumMessage(problemId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteForumMessage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forumMessages', problemId] });
    },
  });
}
