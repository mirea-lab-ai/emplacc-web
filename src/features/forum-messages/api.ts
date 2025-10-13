import { http } from '@/lib/http';

export type UIForumMessage = {
  id: string;
  content: string;
  createdAt?: string;
  authorId?: string;
  authorName?: string;
  problemId: string;
};

export type CreateForumMessageRequest = {
  description: string[];
  problem_id: string;
  creator_id: string;
};

// Получение сообщений форума по проблеме
export async function fetchForumMessagesByProblem(
  problemId: string, 
  page = 1, 
  pageSize = 20
): Promise<UIForumMessage[]> {
  const res = await http(`/forum-messages/problem/${encodeURIComponent(problemId)}/${page}/${pageSize}`, { 
    method: 'GET' 
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as any;
  
  // Обработка разных форматов ответа
  const list: any[] = json.messages ?? [];
  
  return list.map((m: any) => ({
    id: String(m.id ?? ''),
    content: m.desctription ? m.desctription.join(' ') : '',
    createdAt: m.created_at,
    authorId: m.creator_id,
    authorName: 'Аноним', // API не возвращает имя автора
    problemId: String(m.problem_id ?? problemId),
  }));
}

// Создание нового сообщения
export async function createForumMessage(payload: CreateForumMessageRequest): Promise<UIForumMessage> {
  const res = await http('/forum-messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as any;
  
  return {
    id: String(json.id ?? ''),
    content: payload.description.join(' '),
    createdAt: json.created_at ?? new Date().toISOString(),
    authorId: payload.creator_id,
    authorName: 'Вы', // Для собственных сообщений
    problemId: payload.problem_id,
  };
}
