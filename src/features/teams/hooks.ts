// src/features/teams/hooks.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchProjectTeams, fetchAllTeams, createTeam, deleteTeam, fetchTeamProjects, removeTeamMember, fetchAllProjects, addProjectToTeam, addUsersToTeam, addTeamToProject, removeTeamFromProject, type CreateTeamRequest } from './api';

export function useProjectTeams(projectId: string | null, enabled = true) {
  return useQuery({
    queryKey: ['projectTeams', projectId],
    queryFn: () => fetchProjectTeams(projectId!),
    enabled: enabled && !!projectId,
    staleTime: 30_000,
  });
}

export function useAllTeams(enabled = true) {
  return useQuery({
    queryKey: ['allTeams'],
    queryFn: fetchAllTeams,
    enabled,
    staleTime: 5 * 60 * 1000, // 5 минут
    gcTime: 10 * 60 * 1000, // 10 минут
  });
}

export function useCreateTeam() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (payload: CreateTeamRequest) => createTeam(payload),
    onSuccess: () => {
      // Инвалидировать кеш для всех команд
      queryClient.invalidateQueries({ queryKey: ['allTeams'] });
    },
  });
}

export function useDeleteTeam() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (teamId: string) => deleteTeam(teamId),
    onSuccess: () => {
      // Инвалидировать кеш для всех команд
      queryClient.invalidateQueries({ queryKey: ['allTeams'] });
    },
  });
}

export function useTeamProjects(teamId: string | null, enabled = true) {
  return useQuery({
    queryKey: ['teamProjects', teamId],
    queryFn: () => fetchTeamProjects(teamId!),
    enabled: enabled && !!teamId,
    staleTime: 5 * 60 * 1000, // 5 минут
    gcTime: 10 * 60 * 1000, // 10 минут
  });
}

export function useRemoveTeamMember() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ teamId, userId }: { teamId: string; userId: string }) => 
      removeTeamMember(teamId, userId),
    onSuccess: () => {
      // Инвалидировать кеш для всех команд
      queryClient.invalidateQueries({ queryKey: ['allTeams'] });
    },
  });
}

export function useAllProjects(enabled = true) {
  return useQuery({
    queryKey: ['allProjects'],
    queryFn: () => fetchAllProjects(1, 100),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 минут
    gcTime: 10 * 60 * 1000, // 10 минут
  });
}

export function useAddProjectToTeam() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ teamId, projectId }: { teamId: string; projectId: string }) => 
      addProjectToTeam(teamId, projectId),
    onSuccess: () => {
      // Инвалидировать кеш для проектов команды
      queryClient.invalidateQueries({ queryKey: ['teamProjects'] });
    },
  });
}

export function useAddUsersToTeam() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ teamId, userIds }: { teamId: string; userIds: string[] }) => 
      addUsersToTeam(teamId, userIds),
    onSuccess: () => {
      // Инвалидировать кеш для всех команд
      queryClient.invalidateQueries({ queryKey: ['allTeams'] });
    },
  });
}

export function useAddTeamToProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ projectId, teamId }: { projectId: string; teamId: string }) => 
      addTeamToProject(projectId, teamId),
    onSuccess: () => {
      // Инвалидировать кеш для команд проекта
      queryClient.invalidateQueries({ queryKey: ['projectTeams'] });
    },
  });
}

export function useRemoveTeamFromProject() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ projectId, teamId }: { projectId: string; teamId: string }) => 
      removeTeamFromProject(projectId, teamId),
    onSuccess: () => {
      // Инвалидировать кеш для команд проекта
      queryClient.invalidateQueries({ queryKey: ['projectTeams'] });
    },
  });
}

