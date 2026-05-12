import { http } from '@/lib/http';

export type UIRole = {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type UserRoleLookup = {
  userId: string;
  role: UIRole | null;
};

type ApiRole = {
  id?: string | number;
  name?: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
};

function mapRole(role: ApiRole | null | undefined): UIRole | null {
  if (!role) return null;
  return {
    id: role.id != null ? String(role.id) : '',
    name: typeof role.name === 'string' ? role.name.trim() : '',
    description: typeof role.description === 'string' ? role.description : undefined,
    createdAt: role.created_at,
    updatedAt: role.updated_at,
  };
}

export async function fetchUserRole(userId: string): Promise<UserRoleLookup> {
  const res = await http(`/role/user/${encodeURIComponent(userId)}`, { method: 'GET' });
  if (res.status === 404) return { userId, role: null };
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as any;
  return {
    userId: json.user_id != null ? String(json.user_id) : userId,
    role: mapRole(json.role),
  };
}

export async function fetchAllRoles(): Promise<UIRole[]> {
  const res = await http('/role/all/1/100', { method: 'GET' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as any;
  const list: ApiRole[] = Array.isArray(json) ? json : json.roles ?? [];
  return list.map((r) => mapRole(r)).filter(Boolean) as UIRole[];
}

export async function assignUserRole(userId: string, roleId: string): Promise<void> {
  const res = await http('/user/role', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, role_id: roleId }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function removeUserRole(userId: string, roleId: string): Promise<void> {
  const res = await http('/user/role', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, role_id: roleId }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}
