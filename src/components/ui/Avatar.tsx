'use client';

export default function Avatar({
                                   name,
                                   url,
                                   size = 'md',
                               }: { name: string; url?: string; size?: 'sm'|'md' }) {
    const dim = size === 'sm' ? 'w-6 h-6 text-xs' : 'w-8 h-8';
    if (url) {
        return <img src={url} alt={name} className={`${dim} rounded-full object-cover ring-1 ring-white/10`} />;
    }
    const initials = name.split(' ').slice(0, 2).map(s => s[0]).join('').toUpperCase();
    return (
        <div className={`${dim} rounded-full bg-teal-600/40 text-white flex items-center justify-center ring-1 ring-white/10`}>
            <span className="opacity-90">{initials}</span>
        </div>
    );
}
