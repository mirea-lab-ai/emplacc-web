type Props = { className?: string };

export function Skeleton({ className = '' }: Props) {
  return <div className={`skeleton ${className}`} />;
}

// ── Generic ────────────────────────────────────────────────────────────────

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-3 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="t-surface rounded-2xl p-5 ring-1 ring-white/10 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-6 py-4">
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <Skeleton className="h-6 w-20 rounded-full" />
      <Skeleton className="w-6 h-6 rounded-full" />
    </div>
  );
}

// ── Home / stat cards ──────────────────────────────────────────────────────

export function SkeletonStatCard() {
  return (
    <div className="t-surface rounded-2xl p-5 ring-1 ring-white/10 space-y-3">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-8 w-14" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

// ── Dashboard widgets ──────────────────────────────────────────────────────

export function SkeletonWidget({ rows = 3 }: { rows?: number }) {
  return (
    <div className="t-surface rounded-2xl p-5 space-y-4 ring-1 ring-white/10 h-full">
      <Skeleton className="h-4 w-32" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-2.5 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Project list ───────────────────────────────────────────────────────────

export function SkeletonProjectRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-4 border-b border-white/5 last:border-0">
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-3 w-72" />
      </div>
      <Skeleton className="h-6 w-20 rounded-full shrink-0" />
    </div>
  );
}

// ── Task items ─────────────────────────────────────────────────────────────

export function SkeletonTaskItem() {
  return (
    <div className="rounded-xl bg-white/5 ring-1 ring-white/8 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-4 rounded shrink-0" />
        <Skeleton className="h-4 flex-1" />
        <Skeleton className="h-5 w-14 rounded-full shrink-0" />
      </div>
      <Skeleton className="h-3 w-3/4" />
      <div className="flex gap-2">
        <Skeleton className="h-4 w-16 rounded-full" />
        <Skeleton className="h-4 w-20 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonKanbanCard() {
  return (
    <div className="rounded-xl bg-white/5 ring-1 ring-white/8 p-3 space-y-2.5">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-3 w-3/4" />
      <div className="flex items-center justify-between pt-1">
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="w-5 h-5 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonKanbanColumn() {
  return (
    <div className="w-64 shrink-0 space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Skeleton className="w-2.5 h-2.5 rounded-full" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-5 w-7 rounded-full ml-auto" />
      </div>
      <div className="space-y-2.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonKanbanCard key={i} />
        ))}
      </div>
    </div>
  );
}

// ── Team sidebar ───────────────────────────────────────────────────────────

export function SkeletonSidebarItem() {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-2.5 w-16" />
      </div>
    </div>
  );
}

// ── Task detail sidebar ────────────────────────────────────────────────────

export function SkeletonSidebarCard() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-8 w-full rounded-lg" />
    </div>
  );
}

export function SkeletonTaskDetail() {
  return (
    <div className="flex h-full gap-6">
      {/* main */}
      <div className="flex-1 space-y-5">
        <Skeleton className="h-8 w-3/4" />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className={`h-3.5 ${i === 5 ? 'w-1/2' : 'w-full'}`} />
          ))}
        </div>
      </div>
      {/* sidebar */}
      <div className="w-64 shrink-0 space-y-5">
        {Array.from({ length: 5 }).map((_, i) => <SkeletonSidebarCard key={i} />)}
      </div>
    </div>
  );
}

// ── Settings ───────────────────────────────────────────────────────────────

export function SkeletonProfileHeader() {
  return (
    <div className="t-surface-accent rounded-2xl px-6 py-5 flex items-center gap-5">
      <Skeleton className="w-16 h-16 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3.5 w-52" />
        <Skeleton className="h-5 w-20 rounded-full mt-1" />
      </div>
    </div>
  );
}

export function SkeletonField() {
  return (
    <div className="space-y-1.5">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-10 w-full rounded-xl" />
    </div>
  );
}

// ── Forum / problems ───────────────────────────────────────────────────────

export function SkeletonForumItem() {
  return (
    <div className="px-3 py-3 space-y-1.5">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-3 w-56" />
    </div>
  );
}
