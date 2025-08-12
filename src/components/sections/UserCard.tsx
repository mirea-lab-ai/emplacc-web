import Card from '@/components/ui/Card';

export default function UserCard({
                                     name = 'Иванов Иван', status = 'В офисе',
                                 }: { name?: string; status?: string }) {
    return (
        <Card>
            <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-slate-600/60 grid place-items-center text-slate-300">
                    <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                            d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5zm0 2c-5.523 0-10 2.477-10 5.533V22h20v-2.467C22 16.477 17.523 14 12 14z"
                            fill="currentColor"
                        />
                    </svg>
                </div>
                <div className="flex-1">
                    <div className="text-lg font-semibold">{name}</div>
                    <div className="mt-1 flex items-center gap-2 text-sm text-slate-300">
            <span className="relative inline-flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
            </span>
                        {status}
                    </div>
                    <button className="mt-3 text-sm text-sky-300 hover:text-sky-200 underline underline-offset-4">
                        Просмотр истории посещений
                    </button>
                </div>
            </div>
        </Card>
    );
}
