import { http } from '@/lib/http';

export type TokenInfo = {
  id: string;
  name: string;
  created_at: string;
  last_used_at?: string;
  expires_at?: string;
};

export type CreatedToken = TokenInfo & { token: string };

export async function fetchTokens(): Promise<TokenInfo[]> {
  const res = await http('/token', { method: 'GET' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function createToken(name: string, expiresIn?: string): Promise<CreatedToken> {
  const res = await http('/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, expires_in: expiresIn }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function revokeToken(id: string): Promise<void> {
  const res = await http(`/token/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}
