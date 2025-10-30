import { http, extractErrorMessage } from '@/lib/http';

async function requestBlob(path: string, init: RequestInit = {}): Promise<Blob> {
  const res = await http(path, init);
  if (!res.ok) {
    const detail = await extractErrorMessage(res.clone());
    throw new Error(detail ? `HTTP ${res.status}: ${detail}` : `HTTP ${res.status}`);
  }
  return res.blob();
}

export async function exportProjectBoardToExcel(projectId: string): Promise<Blob> {
  const trimmed = projectId.trim();
  if (!trimmed) {
    throw new Error('Project ID is required');
  }
  return requestBlob(`/boards/project/${encodeURIComponent(trimmed)}/export/xlsx`, { method: 'GET' });
}

export async function exportActiveTasksToExcel(): Promise<Blob> {
  return requestBlob('/task/export/active-tasks/xlsx', { method: 'GET' });
}

export async function exportTomorrowPlansToExcel(): Promise<Blob> {
  return requestBlob('/report/export/tomorrow-plans/xlsx', { method: 'GET' });
}
