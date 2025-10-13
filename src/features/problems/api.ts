import { http } from '@/lib/http';

export type UIProblem = {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
  authorId?: string;
  authorName?: string;
};

export type CreateProblemRequest = {
  name: string;
  description?: string[];
  creator_id: string;
};

// Получение всех проблем
export async function fetchAllProblems(page = 1, pageSize = 20): Promise<UIProblem[]> {
  const res = await http(`/problem/all/${page}/${pageSize}`, { method: 'GET' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as any;
  
  // Обработка разных форматов ответа
  const list: any[] = Array.isArray(json) 
    ? json 
    : json.problems ?? [];
  
  return list.map((p: any) => ({
    id: String(p.id ?? ''),
    name: p.name ?? 'Без названия',
    description: p.description,
    createdAt: p.created_at ?? p.createdAt,
    authorId: p.author_id ?? p.authorId,
    authorName: p.author_name ?? p.authorName,
  }));
}

// Создание новой проблемы
export async function createProblem(payload: CreateProblemRequest): Promise<UIProblem> {
  const res = await http('/problem', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as any;
  
  return {
    id: String(json.id ?? ''),
    name: payload.name,
    description: payload.description?.join(' ') || undefined,
    createdAt: json.created_at ?? new Date().toISOString(),
    authorId: json.author_id,
    authorName: json.author_name,
  };
}