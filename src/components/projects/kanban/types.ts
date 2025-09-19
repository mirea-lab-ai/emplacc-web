export type KBTask   = { id: string; title: string; desc?: string };
export type KBColumn = { id: string; title: string; tasks: KBTask[] };
