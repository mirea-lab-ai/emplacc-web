import { http } from '@/lib/http';

export type UIUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profession?: string;
  tgId?: string;
};

export type UpdateUserRequest = {
  first_name: string;
  last_name: string;
  email: string;
  profession?: string;
  tg_id?: string;
};

// Получение данных пользователя
export async function fetchUser(userId: string): Promise<UIUser> {
  const res = await http(`/user/${encodeURIComponent(userId)}`, { method: 'GET' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as any;
  
  return {
    id: String(json.id ?? ''),
    firstName: json.first_name ?? '',
    lastName: json.last_name ?? '',
    email: json.email ?? '',
    profession: json.profession,
    tgId: json.tg_id,
  };
}

// Получение всех пользователей
export async function fetchAllUsers(page = 1, pageSize = 100): Promise<UIUser[]> {
  const res = await http(`/user/all/${page}/${pageSize}`, { method: 'GET' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as any;
  
  const list: any[] = Array.isArray(json) 
    ? json 
    : json.users ?? [];
  
  return list.map((u: any) => ({
    id: String(u.id ?? ''),
    firstName: u.first_name ?? '',
    lastName: u.last_name ?? '',
    email: u.email ?? '',
    profession: u.profession,
    tgId: u.tg_id,
  }));
}

// Обновление данных пользователя
export async function updateUser(userId: string, payload: UpdateUserRequest): Promise<UIUser> {
  const res = await http(`/user/${encodeURIComponent(userId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as any;
  
  return {
    id: String(json.id ?? ''),
    firstName: json.first_name ?? payload.first_name,
    lastName: json.last_name ?? payload.last_name,
    email: json.email ?? payload.email,
    profession: json.profession ?? payload.profession,
    tgId: json.tg_id ?? payload.tg_id,
  };
}
