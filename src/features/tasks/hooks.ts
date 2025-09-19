'use client';
import { useQuery } from '@tanstack/react-query';
import { fetchMyTasks } from './api';

export function useMyTasks(page = 1, pageSize = 20, enabled = false) {
    return useQuery({
        queryKey: ['myTasks', page, pageSize],
        queryFn: () => fetchMyTasks(page, pageSize),
        enabled,           // ВАЖНО: запрос не пойдёт, пока enabled=false
        staleTime: 30_000,
    });
}
