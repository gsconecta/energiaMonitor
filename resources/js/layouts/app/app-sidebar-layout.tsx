import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import Footer from '@/components/shadcn-studio/blocks/footer-component-01/footer-component-01';
import { type BreadcrumbItem } from '@/types';
import { type PropsWithChildren, useEffect, useState } from 'react';
import { router } from '@inertiajs/react';

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
}: PropsWithChildren<{ breadcrumbs?: BreadcrumbItem[] }>) {
    const [isNavigating, setIsNavigating] = useState(false);

    useEffect(() => {
        const startListener = router.on('start', () => {
            setIsNavigating(true);
        });

        const finishListener = router.on('finish', () => {
            setIsNavigating(false);
        });

        return () => {
            startListener();
            finishListener();
        };
    }, []);

    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent variant="sidebar" className="overflow-hidden flex flex-col relative">
                {isNavigating && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm dark:bg-gray-900/80">
                        <div className="flex flex-col items-center gap-4">
                            <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600 dark:border-gray-700 dark:border-t-blue-500"></div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                Cargando...
                            </p>
                        </div>
                    </div>
                )}

                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
                    {children}
                </div>
                <Footer />
            </AppContent>
        </AppShell>
    );
}
