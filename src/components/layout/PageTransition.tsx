'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

// Порядок вкладок слева→вправо
const ORDER = ['/', '/team', '/tasks', '/reports', '/settings', '/admin'];

export default function PageTransition({ children }: { children: React.ReactNode }) {
    const pathname = usePathname() || '/';
    const prevPath = useRef(pathname);
    const [direction, setDirection] = useState(1);

    useEffect(() => {
        const from = ORDER.indexOf(prevPath.current);
        const to = ORDER.indexOf(pathname);
        // если какого-то роутa нет в ORDER — считаем его «вправо»
        const dir =
            from === -1 || to === -1 ? 1 : to === from ? 0 : to > from ? 1 : -1;
        setDirection(dir);
        prevPath.current = pathname;
    }, [pathname]);

    const variants = {
        initial: (dir: number) => ({ x: dir * 60, opacity: 0 }),
        animate: { x: 0, opacity: 1, transition: { duration: 0.25 } },
        exit: (dir: number) => ({ x: -dir * 60, opacity: 0, transition: { duration: 0.2 } }),
    };

    return (
        <div className="relative overflow-hidden">
            <AnimatePresence initial={false} mode="wait" custom={direction}>
                <motion.div
                    key={pathname}
                    custom={direction}
                    variants={variants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="min-h-[60vh]"
                >
                    {children}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
