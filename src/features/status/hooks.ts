// src/features/status/hooks.ts
import { useQuery, useMutation, useQueryClient, useQueries, type UseQueryResult } from '@tanstack/react-query';
import { fetchBoardStatus, createStatus, deleteStatus, type CreateStatusRequest, type BoardStatus } from './api';

export function useBoardStatus(boardId: string | null, enabled = true) {
    return useQuery({
        queryKey: ['boardStatus', boardId],
        queryFn: () => fetchBoardStatus(boardId!),
        enabled: enabled && !!boardId,
        staleTime: 5 * 60 * 1000, // 5 минут - данные считаются свежими
        gcTime: 10 * 60 * 1000, // 10 минут - данные хранятся в кеше
    });
}

export function useCreateStatus() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: (payload: CreateStatusRequest) => createStatus(payload),
        onSuccess: (_, variables) => {
            // Инвалидировать кеш для статусов этой доски
            if (variables.board_id) {
                queryClient.invalidateQueries({ queryKey: ['boardStatus', variables.board_id] });
            }
        },
    });
}

export function useDeleteStatus() {
    const queryClient = useQueryClient();
    
    return useMutation({
        mutationFn: (statusId: string) => deleteStatus(statusId),
        onSuccess: () => {
            // Инвалидировать все кеши статусов, так как мы не знаем board_id
            queryClient.invalidateQueries({ queryKey: ['boardStatus'] });
        },
    });
}

export function useBoardStatusesByIds(boardIds: string[], enabled = true): UseQueryResult<BoardStatus, unknown>[] {
    return useQueries({
        queries: boardIds.map((boardId) => ({
            queryKey: ['boardStatus', boardId],
            queryFn: () => fetchBoardStatus(boardId),
            enabled: enabled && !!boardId,
            staleTime: 5 * 60 * 1000,
            gcTime: 10 * 60 * 1000,
        })),
    });
}

