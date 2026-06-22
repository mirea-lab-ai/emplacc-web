import { http } from '@/lib/http';

export type UIAlias = {
  id: string;
  alias: string;
  targetUserId: string;
  targetName?: string;
  targetAvatarUrl?: string;
};

// Список своих псевдонимов (приватные пер-юзер).
export async function fetchAliases(): Promise<UIAlias[]> {
  const res = await http('/alias', { method: 'GET' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as { aliases?: unknown[] };
  const list = Array.isArray(json.aliases) ? json.aliases : [];
  return list.map((a) => {
    const o = a as Record<string, unknown>;
    return {
      id: String(o.id ?? ''),
      alias: String(o.alias ?? ''),
      targetUserId: String(o.target_user_id ?? ''),
      targetName: (o.target_name as string) || undefined,
      targetAvatarUrl: (o.target_avatar_url as string) || undefined,
    };
  });
}

export async function createAlias(alias: string, targetUserId: string): Promise<void> {
  const res = await http('/alias', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ alias, target_user_id: targetUserId }),
  });
  if (!res.ok) {
    const msg = await res.json().then((j) => (j as { error?: string }).error).catch(() => null);
    throw new Error(msg || `HTTP ${res.status}`);
  }
}

export async function deleteAlias(id: string): Promise<void> {
  const res = await http(`/alias/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}
