'use client';
import { useQuery } from '@tanstack/react-query';
import { fetchMyProblems } from './api';

export function useMyProblems(page = 1, pageSize = 20, enabled = false) {
    return useQuery({
        queryKey: ['myProblems', page, pageSize],
        queryFn: () => fetchMyProblems(page, pageSize),
        enabled,           // ВАЖНО: запрос не пойдёт, пока enabled=false
        staleTime: 30_000,
    });
}
