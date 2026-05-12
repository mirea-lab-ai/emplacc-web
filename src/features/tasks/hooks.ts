'use client';
import { useQuery, useMutation, useQueryClient, useQueries, type UseQueryResult } from '@tanstack/react-query';
import { fetchMyTasks, fetchAllTasks, createTask, deleteTask, moveTask, fetchBoardTasks, fetchBoardTasksByProjectAndBoard, fetchTaskById, updateTask, improveTaskReport, type CreateTaskRequest, type MoveTaskRequest, type UpdateTaskRequest } from './api';

export function useAllTasks(page = 1, pageSize = 50, enabled = true) {
    return useQuery({
        queryKey: ['allTasks', page, pageSize],
        queryFn: () => fetchAllTasks(page, pageSize),
        enabled,
        staleTime: 30_000,
    });
}

export function useMyTasks(page = 1, pageSize = 20, enabled = false) {
    return useQuery({
        queryKey: ['myTasks', page, pageSize],
        queryFn: () => fetchMyTasks(page, pageSize),
        enabled,           // ВАЖНО: запрос не пойдёт, пока enabled=false
        staleTime: 30_000,
    });
}

export function useCreateTask() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: CreateTaskRequest) => createTask(payload),
        onSuccess: () => {
            // Инвалидировать кеш для задач
            queryClient.invalidateQueries({ queryKey: ['myTasks'] });
            // Также инвалидировать кеш для статусов, так как задачи могут отображаться в колонках
            queryClient.invalidateQueries({ queryKey: ['boardStatus'] });
        },
    });
}

export function useDeleteTask() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (taskId: string) => deleteTask(taskId),
        onSuccess: () => {
            // Инвалидировать кеш для задач
            queryClient.invalidateQueries({ queryKey: ['myTasks'] });
            // Также инвалидировать кеш для статусов, так как задачи могут отображаться в колонках
            queryClient.invalidateQueries({ queryKey: ['boardStatus'] });
        },
    });
}

export function useMoveTask() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: MoveTaskRequest) => moveTask(payload),
        onSuccess: () => {
            // Инвалидировать кеш для задач
            queryClient.invalidateQueries({ queryKey: ['myTasks'] });
            // Также инвалидировать кеш для статусов, так как задачи могут отображаться в колонках
            queryClient.invalidateQueries({ queryKey: ['boardStatus'] });
        },
    });
}

export function useBoardTasks(boardId: string | null, enabled = true) {
    return useQuery({
        queryKey: ['boardTasks', boardId],
        queryFn: () => fetchBoardTasks(boardId!),
        enabled: enabled && !!boardId,
        staleTime: 2 * 60 * 1000, // 2 минуты
        gcTime: 5 * 60 * 1000, // 5 минут
    });
}

export function useBoardTasksByProjectAndBoard(projectId: string | null, boardId: string | null, enabled = true) {
    return useQuery({
        queryKey: ['boardTasksByProjectAndBoard', projectId, boardId],
        queryFn: () => fetchBoardTasksByProjectAndBoard(projectId!, boardId!),
        enabled: enabled && !!projectId && !!boardId,
        staleTime: 2 * 60 * 1000, // 2 минуты
        gcTime: 5 * 60 * 1000, // 5 минут
    });
}

export function useTaskById(taskId: string | null, enabled = true) {
    return useQuery({
        queryKey: ['taskById', taskId],
        queryFn: () => fetchTaskById(taskId!),
        enabled: enabled && !!taskId,
        staleTime: 5 * 60 * 1000, // 5 минут
        gcTime: 10 * 60 * 1000, // 10 минут
    });
}

export function useTasksByIds(taskIds: string[], enabled = true): UseQueryResult<any, unknown>[] {
    return useQueries({
        queries: taskIds.map((taskId) => ({
            queryKey: ['taskById', taskId],
            queryFn: () => fetchTaskById(taskId),
            enabled: enabled && !!taskId,
            staleTime: 5 * 60 * 1000,
            gcTime: 10 * 60 * 1000,
        })),
    });
}

export function useUpdateTask() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ taskId, payload }: { taskId: string; payload: UpdateTaskRequest }) => updateTask(taskId, payload),
        onSuccess: () => {
            // Инвалидировать кеш для задач
            queryClient.invalidateQueries({ queryKey: ['myTasks'] });
            // Также инвалидировать кеш для статусов, так как задачи могут отображаться в колонках
            queryClient.invalidateQueries({ queryKey: ['boardStatus'] });
        },
    });
}

export function useImproveTaskReport() {
    return useMutation({
        mutationFn: ({ taskId, userText }: { taskId: string; userText: string }) => improveTaskReport(taskId, userText),
    });
}
