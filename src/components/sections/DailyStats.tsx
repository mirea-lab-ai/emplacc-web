import Card from '@/components/ui/Card';
import StatRing from '@/components/ui/StatRing';

export default function DailyStats() {
    return (
        <section className="mt-10">
            <Card className="pt-6">
                <h3 className="mb-6 text-center text-lg font-semibold">Дневная статистика</h3>
                <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                    <StatRing value={65} label="Рабочее время" />
                    <StatRing value={65} label="Commits" />
                    <StatRing value={65} label="Merge Request" />
                </div>
            </Card>
        </section>
    );
}
