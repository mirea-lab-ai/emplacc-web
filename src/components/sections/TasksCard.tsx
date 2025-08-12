import Card from '@/components/ui/Card';
import { Task } from '@/types';

export default function TasksCard({ tasks }: { tasks: Task[] }) {
    return (
        <Card>
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Список задач</h3>
                <span className="text-slate-400">→</span>
            </div>
            <ul className="mt-4 space-y-3">
                {tasks.map((t) => (
                    <li key={t.id} className="flex items-center gap-3">
                        <span className={`h-2.5 w-2.5 rounded-full ${t.color}`} />
                        <span className="text-slate-200">{t.title}</span>
                    </li>
                ))}
            </ul>
        </Card>
    );
}
