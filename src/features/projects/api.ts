import { http } from '@/lib/http';

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