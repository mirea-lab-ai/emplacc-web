import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createReport, fetchUserReports, fetchAllReports, type CreateReportRequest } from './api';

// Удален useMyHelpRequests - функция не существует в API

export function useCreateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateReportRequest) => createReport(payload),
    onSuccess: () => {
      // Инвалидировать кеш для отчетов
      queryClient.invalidateQueries({ queryKey: ['userReports'] });
      queryClient.invalidateQueries({ queryKey: ['reportsAll'] });
    },
  });
}

export function useUserReports(userId: string | null, page = 1, pageSize = 1, enabled = true) {
  return useQuery({
    queryKey: ['userReports', userId, page, pageSize],
    queryFn: () => fetchUserReports(userId!, page, pageSize),
    enabled: enabled && !!userId,
    staleTime: 5 * 60 * 1000, // 5 минут
    gcTime: 10 * 60 * 1000, // 10 минут
  });
}

export function useAllReports(page = 1, pageSize = 20, enabled = true) {
  return useQuery({
    queryKey: ['reportsAll', page, pageSize],
    queryFn: () => fetchAllReports(page, pageSize),
    enabled,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
