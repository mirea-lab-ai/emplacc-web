'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchProviders, fetchProjectRepos, linkRepo, unlinkRepo, syncRepo, syncProject,
  fetchProjectCommits, fetchTaskCommits, linkCommitToTask, type LinkRepoPayload,
} from './api';

export function useGitProviders(enabled = true) {
  return useQuery({ queryKey: ['gitProviders'], queryFn: fetchProviders, enabled, staleTime: 5 * 60 * 1000 });
}

export function useProjectRepos(projectId: string | null, enabled = true) {
  return useQuery({
    queryKey: ['projectRepos', projectId],
    queryFn: () => fetchProjectRepos(projectId!),
    enabled: enabled && !!projectId,
    staleTime: 60_000,
  });
}

export function useProjectCommits(projectId: string | null, enabled = true) {
  return useQuery({
    queryKey: ['projectCommits', projectId],
    queryFn: () => fetchProjectCommits(projectId!),
    enabled: enabled && !!projectId,
    staleTime: 30_000,
  });
}

export function useTaskCommits(taskId: string | null, enabled = true) {
  return useQuery({
    queryKey: ['taskCommits', taskId],
    queryFn: () => fetchTaskCommits(taskId!),
    enabled: enabled && !!taskId,
    staleTime: 30_000,
  });
}

export function useLinkRepo(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: LinkRepoPayload) => linkRepo(projectId, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projectRepos', projectId] }),
  });
}

export function useUnlinkRepo(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (repoId: string) => unlinkRepo(repoId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projectRepos', projectId] });
      qc.invalidateQueries({ queryKey: ['projectCommits', projectId] });
    },
  });
}

export function useSyncProject(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => syncProject(projectId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projectCommits', projectId] });
      qc.invalidateQueries({ queryKey: ['projectRepos', projectId] });
    },
  });
}

export function useSyncRepo(projectId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (repoId: string) => syncRepo(repoId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projectCommits', projectId] });
      qc.invalidateQueries({ queryKey: ['projectRepos', projectId] });
    },
  });
}

export function useLinkCommitToTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ commitId, taskId }: { commitId: string; taskId: string | null }) => linkCommitToTask(commitId, taskId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projectCommits'] });
      qc.invalidateQueries({ queryKey: ['taskCommits'] });
    },
  });
}
