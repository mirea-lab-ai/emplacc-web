import { http } from '@/lib/http';

type RawRole =
  | string
  | null
  | undefined
  | RawRole[]
  | {
      id?: unknown;
      name?: unknown;
      description?: unknown;
      role?: RawRole;
      roles?: RawRole;
      [key: string]: unknown;
    };

function extractRoleName(source: RawRole): string | null {
  if (typeof source === 'string') {
    const trimmed = source.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (Array.isArray(source)) {
    for (const item of source) {
      const resolved = extractRoleName(item);
      if (resolved) return resolved;
    }
    return null;
  }

  if (source && typeof source === 'object') {
    if ('role' in source) {
      const resolved = extractRoleName((source as { role?: RawRole }).role ?? null);
      if (resolved) return resolved;
    }

    if ('roles' in source) {
      const resolved = extractRoleName((source as { roles?: RawRole }).roles ?? null);
      if (resolved) return resolved;
    }

    const nameValue = (source as { name?: unknown }).name;
    if (typeof nameValue === 'string' && nameValue.trim()) {
      return nameValue.trim();
    }

    const descriptionValue = (source as { description?: unknown }).description;
    if (typeof descriptionValue === 'string' && descriptionValue.trim()) {
      return descriptionValue.trim();
    }

    for (const value of Object.values(source)) {
      const resolved = extractRoleName(value as RawRole);
      if (resolved) return resolved;
    }
  }

  return null;
}

export async function fetchUserRole(userId: string): Promise<string> {
  const response = await http(`/role/user/${encodeURIComponent(userId)}`, { method: 'GET' });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const payload = (await response.json()) as RawRole;
  const roleName = extractRoleName(payload);

  if (!roleName) {
    throw new Error('Unable to resolve role name from response');
  }

  return roleName;
}

