// src/features/boards/hooks.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchProjectBoards, createBoard, deleteBoard, type CreateBoardRequest } from './api';

export function useProjectBoards(projectId: string | null, enabled = true) {
    return useQuery({
        queryKey: ['projectBoards', projectId],
        queryFn: () => fetchProjectBoards(projectId!),
        enabled: enabled && !!projectId,
        staleTime: 5 * 60 * 1000, // 5 минут - данные считаются свежими
        gcTime: 10 * 60 * 1000, // 10 минут - данные хранятся в кеше
    });
}

export function useCreateBoard() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: (payload: CreateBoardRequest) => createBoard(payload),
        onSuccess: (_, variables) => {
            // Инвалидировать кеш для досок этого проекта
            queryClient.invalidateQueries({ queryKey: ['projectBoards', variables.project_id] });
        },
    });
}

export function useDeleteBoard() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: ({ boardId, projectId }: { boardId: string; projectId: string }) => deleteBoard(boardId),
        onSuccess: (_, { projectId }) => {
            // Инвалидировать кеш для досок этого проекта
            queryClient.invalidateQueries({ queryKey: ['projectBoards', projectId] });
        },
    });
}

