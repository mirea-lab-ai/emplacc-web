import gravatar from 'gravatar';

export function getGravatarUrl(identifier: string, size = 128) {
  const normalized = identifier.trim().toLowerCase();
  if (!normalized) return undefined;
  return gravatar.url(normalized, { s: String(size), d: 'identicon', r: 'pg' }, true);
}
