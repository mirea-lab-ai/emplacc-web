import { http } from '@/lib/http';

export type UIForumMessageAuthor = {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  email?: string | null;
};

export type UIForumMessageReplyPreview = {
  id: string;
  text: string;
  authorName: string;
};

export type UIForumMessage = {
  id: string;
  content: string;
  createdAt?: string;
  updatedAt?: string;
  authorId?: string;
  authorName?: string;
  authorAvatarUrl?: string | null;
  replyToId?: string | null;
  replyTo?: UIForumMessageReplyPreview | null;
  problemId: string;
};

export type CreateForumMessageRequest = {
  description: string[];
  problem_id: string;
  creator_id: string;
  reply_to_id?: string;
};

export async function fetchForumMessagesByProblem(
  problemId: string,
  page = 1,
  pageSize = 100
): Promise<UIForumMessage[]> {
  const res = await http(`/forum-messages/problem/${encodeURIComponent(problemId)}/${page}/${pageSize}`, { method: 'GET' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as { messages?: unknown[] };
  const list = json.messages ?? [];

  return (list as Record<string, unknown>[]).map(m => {
    const desc = Array.isArray(m.description) ? (m.description as string[]).join(' ') : String(m.content ?? '');
    const author = m.author as Record<string, string> | null | undefined;
    const replyTo = m.reply_to as Record<string, string> | null | undefined;
    return {
      id: String(m.id ?? ''),
      content: desc,
      createdAt: m.created_at as string | undefined,
      updatedAt: m.updated_at as string | undefined,
      authorId: author?.id ?? String(m.creator_id ?? ''),
      authorName: author ? `${author.first_name ?? ''} ${author.last_name ?? ''}`.trim() : '',
      authorAvatarUrl: author?.avatar_url ?? null,
      replyToId: m.reply_to_id as string | null ?? null,
      replyTo: replyTo ? { id: replyTo.id, text: replyTo.text, authorName: replyTo.author_name } : null,
      problemId: String(m.problem_id ?? problemId),
    };
  });
}

export async function createForumMessage(payload: CreateForumMessageRequest): Promise<{ id: string }> {
  const res = await http('/forum-messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<{ id: string }>;
}

export async function updateForumMessage(id: string, description: string[]): Promise<void> {
  const res = await http(`/forum-messages/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

export async function deleteForumMessage(id: string): Promise<void> {
  const res = await http(`/forum-messages/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}
