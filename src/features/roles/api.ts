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

type ApiUserRoleLookup = {
  user_id?: string | number;
  role?: ApiRole | null;
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

  if (res.status === 404) {
    return {
      userId,
      role: null,
    };
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  const json = (await res.json()) as ApiUserRoleLookup;

  return {
    userId: json.user_id != null ? String(json.user_id) : userId,
    role: mapRole(json.role),
  };
}

