import { http } from '@/lib/http';

export type UIAttendance = {
  id: string;
  userId: string;
  date?: string;
  workdayHours?: number;
  plannedStart?: string;
  actualStart?: string;
  commits?: number;
  mergeRequests?: number;
  codeReviews?: number;
  endWork?: string;
};

function mapAttendance(a: any): UIAttendance {
  return {
    id: String(a.id ?? ''),
    userId: String(a.user_id ?? ''),
    date: a.date,
    workdayHours: typeof a.workday_hours === 'number' ? a.workday_hours : undefined,
    plannedStart: a.planned_start,
    actualStart: a.actual_start,
    commits: typeof a.commits === 'number' ? a.commits : undefined,
    mergeRequests: typeof a.merge_requests === 'number' ? a.merge_requests : undefined,
    codeReviews: typeof a.code_reviews === 'number' ? a.code_reviews : undefined,
    endWork: a.end_work,
  };
}

export async function fetchAllAttendances(
  page = 1,
  pageSize = 50
): Promise<{ items: UIAttendance[]; total: number }> {
  const res = await http(`/attendance/all/${page}/${pageSize}`, { method: 'GET' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as any;
  const list: any[] = Array.isArray(json) ? json : json.attendances ?? json.items ?? [];
  return {
    items: list.map(mapAttendance),
    total: typeof json.total_count === 'number' ? json.total_count : list.length,
  };
}
