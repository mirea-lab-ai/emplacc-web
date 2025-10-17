import { http } from '@/lib/http';
import { getAccessToken } from '@/lib/auth';

export type UIProject = {
  id: string;
  name: string;
  description?: string;
  status?: string;
  createdAt?: string;
  createdBy?: string;
};

export type CreateProjectRequest = {
  name: string;
  description?: string;
  created_by: string;
  gitlab_project_id: number;
  gitlab_url: string;
  status?: string;
};

// Получение проектов пользователя
export async function fetchUserProjects(userId: string): Promise<UIProject[]> {
  const res = await http(`/project/all/1/20`, { method: 'GET' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as any;

  // Обработка разных форматов ответа
  const list: any[] = Array.isArray(json)
    ? json
    : json.projects ?? [];

  return list.map((p: any) => ({
    id: String(p.id ?? ''),
    name: p.name ?? 'Без названия',
    description: p.description,
    status: p.status,
    createdAt: p.created_at ?? p.createdAt,
    createdBy: p.created_by ?? p.createdBy,
  }));
}

// Получение всех проектов пользователя (для отчетов)
export async function fetchAllUserProjects(page = 1, pageSize = 100): Promise<UIProject[]> {
  const res = await http(`/project/all/${page}/${pageSize}`, { method: 'GET' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as any;

  // Обработка разных форматов ответа
  const list: any[] = Array.isArray(json)
    ? json
    : json.projects ?? [];

  return list.map((p: any) => ({
    id: String(p.id ?? ''),
    name: p.name ?? 'Без названия',
    description: p.description,
    status: p.status,
    createdAt: p.created_at ?? p.createdAt,
    createdBy: p.created_by ?? p.createdBy,
  }));
}

// Создание нового проекта
export async function createProject(payload: CreateProjectRequest): Promise<UIProject> {
  const res = await http('/project', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as any;

  return {
    id: String(json.id ?? ''),
    name: payload.name,
    description: payload.description,
    status: payload.status,
    createdAt: json.created_at ?? new Date().toISOString(),
    createdBy: payload.created_by,
  };
}

// Обновление проекта
export type UpdateProjectRequest = {
  name?: string;
  description?: string;
  gitlab_project_id?: number;
  gitlab_url?: string;
  status?: string;
};

export async function updateProject(projectId: string, payload: UpdateProjectRequest): Promise<UIProject> {
  // Попробуем прямой fetch для обхода проблем с http функцией
  const BASE = process.env.NEXT_PUBLIC_API_BASE_URL!.replace(/\/+$/, '');
  const access = getAccessToken();

  if (!access) {
    throw new Error('No access token found');
  }

  const url = `${BASE}/project/${encodeURIComponent(projectId)}`;
  const headers = {
    'accept': 'application/json',
    'Authorization': `Bearer ${access}`,
    'Content-Type': 'application/json',
  };

  console.log('PATCH запрос (обновление проекта):', { url, headers, payload });

  const res = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(payload),
    mode: 'cors',
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as any;

  return {
    id: String(json.id ?? projectId),
    name: json.name ?? '',
    description: json.description,
    status: json.status,
    createdAt: json.created_at ?? json.createdAt,
    createdBy: json.created_by ?? json.createdBy,
  };
}

// Удаление проекта
export async function deleteProject(projectId: string): Promise<void> {
  const res = await http(`/project/${projectId}`, {
    method: 'DELETE',
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function fetchProjectById(projectId: string): Promise<UIProject | null> {
  const trimmed = typeof projectId === 'string' ? projectId.trim() : '';
  if (!trimmed) {
    return null;
  }

  const res = await http(`/project/${encodeURIComponent(trimmed)}`, { method: 'GET' });
  if (!res.ok) {
    console.warn('fetchProjectById: запрос завершился ошибкой', res.status, projectId);
    return null;
  }

  const json = (await res.json()) as any;

  return {
    id: String(json.id ?? trimmed),
    name: json.name ?? 'Без названия',
    description: json.description,
    status: json.status,
    createdAt: json.created_at ?? json.createdAt,
    createdBy: json.created_by ?? json.createdBy,
  };
}
