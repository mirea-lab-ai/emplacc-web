// src/features/teams/hooks.ts
import { useQuery } from '@tanstack/react-query';
import { fetchProjectTeams } from './api';

export function useProjectTeams(projectId: string | null, enabled = true) {
    return useQuery({
        queryKey: ['projectTeams', projectId],
        queryFn: () => fetchProjectTeams(projectId!),
        enabled: enabled && !!projectId,
        staleTime: 30_000,
    });
}

