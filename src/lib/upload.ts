import { getAccessToken } from './auth';
import { getApiBaseUrl } from './publicEnv';

export type UploadResult = { url: string; path?: string };
export type FileUploadResult = { url: string; path?: string; name: string; size: number; content_type: string };

export async function uploadImage(file: File): Promise<UploadResult> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${getApiBaseUrl()}/upload/image`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getAccessToken()}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return res.json() as Promise<UploadResult>;
}

export async function uploadFile(file: File): Promise<FileUploadResult> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${getApiBaseUrl()}/upload/file`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getAccessToken()}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return res.json() as Promise<FileUploadResult>;
}

export async function uploadAvatar(userId: string, file: File): Promise<UploadResult> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${getApiBaseUrl()}/upload/avatar/${encodeURIComponent(userId)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getAccessToken()}` },
    body: form,
  });
  if (!res.ok) throw new Error(`Avatar upload failed: ${res.status}`);
  return res.json() as Promise<UploadResult>;
}

/** Проверяет, является ли URL presigned S3 URL */
export function isPresignedUrl(url: string): boolean {
  return typeof url === 'string' && url.includes('X-Amz-Signature');
}

/** Извлекает object path из presigned URL (e.g. "images/uuid.jpg") */
export function extractObjectPath(presignedUrl: string): string | null {
  try {
    const u = new URL(presignedUrl);
    const parts = u.pathname.split('/').filter(Boolean);
    // Путь: /bucket/folder/file.ext → убираем bucket (первый сегмент)
    if (parts.length < 2) return null;
    return parts.slice(1).join('/');
  } catch {
    return null;
  }
}

/** Обновляет истёкший presigned URL через backend */
export async function refreshPresignedUrl(expiredUrl: string): Promise<string> {
  const objectPath = extractObjectPath(expiredUrl);
  if (!objectPath) throw new Error('Cannot extract object path from URL');
  const res = await fetch(
    `${getApiBaseUrl()}/upload/refresh?path=${encodeURIComponent(objectPath)}`,
    { headers: { Authorization: `Bearer ${getAccessToken()}` } },
  );
  if (!res.ok) throw new Error(`Refresh failed: ${res.status}`);
  const data = await res.json() as { url: string };
  return data.url;
}
