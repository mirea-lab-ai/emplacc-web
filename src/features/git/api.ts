import { http } from '@/lib/http';

export type CodeRepository = {
  id: string;
  project_id: string;
  provider: string;
  owner: string;
  name: string;
  url?: string;
  branch?: string;
  last_sync_at?: string;
  created_at: string;
};

export type Commit = {
  id: string;
  repository_id: string;
  sha: string;
  task_id?: string;
  message: string;
  author_name?: string;
  author_email?: string;
  author_login?: string;
  author_user_id?: string;
  url?: string;
  committed_at: string;
};

export type SyncSummary = { repositories: number; fetched: number; created: number };

export type LinkRepoPayload = { provider: string; owner: string; name: string; url?: string; branch?: string };

async function jsonOrThrow(res: Response) {
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const b = await res.clone().json(); msg = b?.error ?? b?.message ?? msg; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export async function fetchProviders(): Promise<string[]> {
  const j = await jsonOrThrow(await http('/git/providers'));
  return j?.providers ?? [];
}

export async function fetchProjectRepos(projectId: string): Promise<CodeRepository[]> {
  const j = await jsonOrThrow(await http(`/project/${encodeURIComponent(projectId)}/repos`));
  return j?.repositories ?? [];
}

export async function linkRepo(projectId: string, payload: LinkRepoPayload): Promise<CodeRepository> {
  return jsonOrThrow(await http(`/project/${encodeURIComponent(projectId)}/repos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }));
}

export async function unlinkRepo(repoId: string): Promise<void> {
  await jsonOrThrow(await http(`/repo/${encodeURIComponent(repoId)}`, { method: 'DELETE' }));
}

export async function syncRepo(repoId: string): Promise<SyncSummary> {
  return jsonOrThrow(await http(`/repo/${encodeURIComponent(repoId)}/sync`, { method: 'POST' }));
}

export async function syncProject(projectId: string): Promise<SyncSummary> {
  return jsonOrThrow(await http(`/project/${encodeURIComponent(projectId)}/sync`, { method: 'POST' }));
}

export async function fetchProjectCommits(projectId: string, page = 1, pageSize = 50): Promise<{ commits: Commit[]; total_count: number }> {
  return jsonOrThrow(await http(`/project/${encodeURIComponent(projectId)}/commits?page=${page}&pagesize=${pageSize}`));
}

export async function fetchTaskCommits(taskId: string, page = 1, pageSize = 50): Promise<{ commits: Commit[]; total_count: number }> {
  return jsonOrThrow(await http(`/task/${encodeURIComponent(taskId)}/commits?page=${page}&pagesize=${pageSize}`));
}

export async function linkCommitToTask(commitId: string, taskId: string | null): Promise<void> {
  await jsonOrThrow(await http(`/commit/${encodeURIComponent(commitId)}/task`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task_id: taskId }),
  }));
}
