import { http } from '@/lib/http';

export type UIUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profession?: string;
  specialization?: string;
  tgId?: string;
  avatarUrl?: string;
  isActive?: boolean;
  emailVerified?: boolean;
  createdAt?: string;
  lastLogin?: string;
};

export type CreateUserRequest = {
  first_name: string;
  last_name: string;
  email: string;
  profession?: string;
  is_active?: boolean;
  email_verified?: boolean;
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
    avatarUrl: json.avatar_url || undefined,
    isActive: json.is_active,
    emailVerified: json.email_verified,
    createdAt: json.created_at,
    lastLogin: json.last_login,
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
      avatarUrl: u.avatar_url || undefined,
    }));
}

// Создание пользователя
export async function createUser(payload: CreateUserRequest): Promise<{ id: string }> {
  const res = await http('/user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, is_active: true, email_verified: false }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<{ id: string }>;
}

// Бан пользователя (soft delete)
export async function banUser(userId: string): Promise<void> {
  const res = await http(`/user/${encodeURIComponent(userId)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

// Восстановление забаненного пользователя
export async function restoreUser(email: string): Promise<void> {
  const res = await http('/user/restore', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

// Полное удаление пользователя
export async function deleteUserPermanently(userId: string): Promise<void> {
  const res = await http(`/user/full-delete/${encodeURIComponent(userId)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
