'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { getGravatarUrl } from '@/lib/gravatar';
import { isPresignedUrl, refreshPresignedUrl } from '@/lib/upload';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg';

type AvatarProps = {
  name: string;
  url?: string;
  email?: string | null;
  fallbackKey?: string | null;
  size?: AvatarSize;
};

const SIZE_MAP: Record<AvatarSize, { box: string; text: string; px: string }> = {
  xs: { box: 'w-5 h-5', text: 'text-[10px]', px: '20px' },
  sm: { box: 'w-6 h-6', text: 'text-xs', px: '24px' },
  md: { box: 'w-8 h-8', text: 'text-sm', px: '32px' },
  lg: { box: 'w-10 h-10', text: 'text-base', px: '40px' },
};

export default function Avatar({ name, url, email, fallbackKey, size = 'md' }: AvatarProps) {
  const { box, text, px } = SIZE_MAP[size] ?? SIZE_MAP.md;
  const cleanedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const cleanedFallback = typeof fallbackKey === 'string' ? fallbackKey.trim().toLowerCase() : '';
  const gravatarSource = cleanedEmail || cleanedFallback || '';

  const gravatarUrl = useMemo(() => {
    if (!gravatarSource) return undefined;
    const dimension = size === 'xs' || size === 'sm' ? 64 : 128;
    return getGravatarUrl(gravatarSource, dimension);
  }, [gravatarSource, size]);

  const [imageFailed, setImageFailed] = useState(false);
  const [refreshedUrl, setRefreshedUrl] = useState<string | undefined>(undefined);
  const [retried, setRetried] = useState(false);

  useEffect(() => {
    setImageFailed(false);
    setRefreshedUrl(undefined);
    setRetried(false);
  }, [url, gravatarUrl]);

  const displayUrl = refreshedUrl ?? (!imageFailed ? (url ?? gravatarUrl) : undefined);

  const handleError = async () => {
    const currentUrl = refreshedUrl ?? url;
    if (!retried && currentUrl && isPresignedUrl(currentUrl)) {
      setRetried(true);
      try {
        const fresh = await refreshPresignedUrl(currentUrl);
        setRefreshedUrl(fresh);
        return;
      } catch { /* fallthrough to initials */ }
    }
    setImageFailed(true);
  };

  if (displayUrl) {
    return (
      <div className={`${box} relative overflow-hidden rounded-full ring-1 ring-white/10`}>
        <Image
          src={displayUrl}
          alt={name}
          fill
          sizes={px}
          className="object-cover"
          unoptimized
          onError={handleError}
        />
      </div>
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
