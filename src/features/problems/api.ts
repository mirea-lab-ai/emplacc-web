// src/features/tasks/api.ts
import { http } from '@/lib/http';
import type { components } from '@/types/openapi';

type ProblemListResponse = components['schemas']['response.ProblemListResponse'];
type Problem = components['schemas']['response.ProblemResponse']
const PROBLEMS_PATH = '/problem/all/{page}/{pageSize}';

function buildPath(page = 1, pageSize = 20) {
    return PROBLEMS_PATH
        .replace('{page}', String(page))
        .replace('{pageSize}', String(pageSize));
}
export type UIProblem = {
    id: string;
    title: string;           // в UI всегда строка
    updated?: string;
    description?: string[];
};
export function mapProblem(problem: Problem): UIProblem {
    return {
        id: String(problem.id),
        title: problem.name ?? 'Без названия',
        updated: problem.updated_at ?? undefined,
        description: problem.description ?? ['Без описания'],

    };
}
export async function fetchMyProblems(page = 1, pageSize = 20): Promise<UIProblem[]> {

    const path = buildPath(page, pageSize);
    const res = await http(path, { method: 'GET' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const json = (await res.json()) as ProblemListResponse;
    const list: Problem[] = Array.isArray(json.problems) ? (json.problems as Problem[]) : [];
    return list.map(mapProblem);
}
