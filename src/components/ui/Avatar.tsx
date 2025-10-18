'use client';

import { useEffect, useMemo, useState } from 'react';
import { getGravatarUrl } from '@/lib/gravatar';

type AvatarSize = 'sm' | 'md' | 'lg';

type AvatarProps = {
  name: string;
  url?: string;
  email?: string | null;
  fallbackKey?: string | null;
  size?: AvatarSize;
};

const SIZE_MAP: Record<AvatarSize, { box: string; text: string }> = {
  sm: { box: 'w-6 h-6', text: 'text-xs' },
  md: { box: 'w-8 h-8', text: 'text-sm' },
  lg: { box: 'w-10 h-10', text: 'text-base' },
};

export default function Avatar({ name, url, email, fallbackKey, size = 'md' }: AvatarProps) {
  const { box, text } = SIZE_MAP[size] ?? SIZE_MAP.md;
  const cleanedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const cleanedFallback = typeof fallbackKey === 'string' ? fallbackKey.trim().toLowerCase() : '';
  const gravatarSource = cleanedEmail || cleanedFallback || '';

  const gravatarUrl = useMemo(() => {
    if (!gravatarSource) return undefined;
    const dimension = size === 'sm' ? 64 : 128;
    return getGravatarUrl(gravatarSource, dimension);
  }, [gravatarSource, size]);

  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [url, gravatarUrl]);

  const src = !imageFailed ? (url ?? gravatarUrl) : undefined;

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${box} rounded-full object-cover ring-1 ring-white/10`}
        onError={() => { setImageFailed(true); }}
      />
    );
  }

  const initials = deriveInitials(name);
  return (
    <div className={`${box} rounded-full bg-teal-600/40 text-white flex items-center justify-center ring-1 ring-white/10`}>
      <span className={`opacity-90 ${text}`}>{initials}</span>
    </div>
  );
}

function deriveInitials(displayName: string) {
  return displayName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '👤';
}
