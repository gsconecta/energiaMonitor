import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppSidebarHeader } from '@/components/app-sidebar-header';
import Footer from '@/components/shadcn-studio/blocks/footer-component-01/footer-component-01';
import { type BreadcrumbItem } from '@/types';
import { type PropsWithChildren } from 'react';

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
}: PropsWithChildren<{ breadcrumbs?: BreadcrumbItem[] }>) {
    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent variant="sidebar" className="overflow-x-hidden flex flex-col">
                <AppSidebarHeader breadcrumbs={breadcrumbs} />
                <div className="flex-1">
                    {children}
                </div>
                <Footer />
            </AppContent>
        </AppShell>
    );
}
