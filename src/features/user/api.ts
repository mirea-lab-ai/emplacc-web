import { http } from '@/lib/http';

export type UIUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profession?: string;
  specialization?: string;
  tgId?: string;
};

export type UpdateUserRequest = {
  first_name: string;
  last_name: string;
  email: string;
  profession?: string;
  specialization?: string;
  tg_id?: string;
};

// Получение данных пользователя
export async function fetchUser(userId: string): Promise<UIUser> {
  const res = await http(`/user/${encodeURIComponent(userId)}`, { method: 'GET' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as any;
  const resolveSpecialization = (value: any): string | undefined => {
    if (!value) return undefined;
    if (typeof value === 'string') return value.trim() || undefined;
    if (typeof value === 'object') {
      if (typeof value.name === 'string') return value.name.trim() || undefined;
      if (typeof value.title === 'string') return value.title.trim() || undefined;
    }
    return undefined;
  };

  const specialization = resolveSpecialization(json.specialization) ?? resolveSpecialization(json.profession);
  
  return {
    id: String(json.id ?? ''),
    firstName: json.first_name ?? '',
    lastName: json.last_name ?? '',
    email: json.email ?? '',
    profession: resolveSpecialization(json.profession) ?? specialization,
    specialization,
    tgId: json.tg_id,
  };
}

// Получение всех пользователей
export async function fetchAllUsers(page = 1, pageSize = 100): Promise<UIUser[]> {
  const res = await http(`/user/all/${page}/${pageSize}`, { method: 'GET' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as any;
  const resolveSpecialization = (value: any): string | undefined => {
    if (!value) return undefined;
    if (typeof value === 'string') return value.trim() || undefined;
    if (typeof value === 'object') {
      if (typeof value.name === 'string') return value.name.trim() || undefined;
      if (typeof value.title === 'string') return value.title.trim() || undefined;
    }
    return undefined;
  };

  const list: any[] = Array.isArray(json) 
    ? json 
    : json.users ?? [];
  
  return list.map((u: any) => ({
    id: String(u.id ?? ''),
    firstName: u.first_name ?? '',
    lastName: u.last_name ?? '',
    email: u.email ?? '',
    profession: resolveSpecialization(u.profession) ?? resolveSpecialization(u.specialization),
    specialization: resolveSpecialization(u.specialization) ?? resolveSpecialization(u.profession),
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
  const resolveSpecialization = (value: any): string | undefined => {
    if (!value) return undefined;
    if (typeof value === 'string') return value.trim() || undefined;
    if (typeof value === 'object') {
      if (typeof value.name === 'string') return value.name.trim() || undefined;
      if (typeof value.title === 'string') return value.title.trim() || undefined;
    }
    return undefined;
  };

  const specialization = resolveSpecialization(json.specialization)
    ?? resolveSpecialization(payload.specialization)
    ?? resolveSpecialization(json.profession)
    ?? resolveSpecialization(payload.profession);
  
  return {
    id: String(json.id ?? ''),
    firstName: json.first_name ?? payload.first_name,
    lastName: json.last_name ?? payload.last_name,
    email: json.email ?? payload.email,
    profession: resolveSpecialization(json.profession) ?? resolveSpecialization(payload.profession) ?? specialization,
    specialization,
    tgId: json.tg_id ?? payload.tg_id,
  };
}
