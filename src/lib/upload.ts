import { getAccessToken } from './auth';
import { getApiBaseUrl } from './publicEnv';

export type UploadResult = { url: string };

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
