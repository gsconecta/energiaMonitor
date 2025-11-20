import { AppContent } from '@/components/app-content';
import { AppHeader } from '@/components/app-header';
import { AppShell } from '@/components/app-shell';
import Footer from '@/components/shadcn-studio/blocks/footer-component-01/footer-component-01';
import { type BreadcrumbItem } from '@/types';
import type { PropsWithChildren } from 'react';

export default function AppHeaderLayout({
    children,
    breadcrumbs,
}: PropsWithChildren<{ breadcrumbs?: BreadcrumbItem[] }>) {
    return (
        <AppShell>
            <AppHeader breadcrumbs={breadcrumbs} />
            <AppContent className="flex flex-col">
                <div className="flex-1">
                    {children}
                </div>
                <Footer />
            </AppContent>
        </AppShell>
    );
}
