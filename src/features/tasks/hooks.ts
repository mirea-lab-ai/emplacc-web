'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchMyTasks, createTask, deleteTask, moveTask, type CreateTaskRequest, type MoveTaskRequest } from './api';

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
