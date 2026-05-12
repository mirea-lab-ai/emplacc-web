import { useQuery } from '@tanstack/react-query';
import { fetchAllAttendances } from './api';

export function useAllAttendances(page = 1, pageSize = 50, enabled = true) {
  return useQuery({
    queryKey: ['allAttendances', page, pageSize],
    queryFn: () => fetchAllAttendances(page, pageSize),
    enabled,
    staleTime: 30_000,
  });
}
