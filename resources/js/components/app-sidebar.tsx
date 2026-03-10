import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { BookOpen, Folder, LayoutGrid, Cpu, Building2, ChartArea, ShieldAlert, Key } from 'lucide-react';
import AppLogo from './app-logo';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
    },
    {
        title: 'Organizaciones',
        href: '/organizaciones',
        icon: Building2,
    },
    {
        title: 'Dispositivos',
        href: '/dispositivos',
        icon: Cpu,
    },
    {
        title: 'Informes',
        href: '/informes',
        icon: ChartArea,
    },
];

const adminNavItems: NavItem[] = [
    {
        title: 'Panel Global',
        href: '/admin/control-panel',
        icon: ShieldAlert,
    },
    {
        title: 'Cred. Shelly',
        href: '/admin/credenciales-shelly',
        icon: Key,
    },
    {
        title: 'Organizaciones',
        href: '/organizaciones',
        icon: Building2,
    },
    {
        title: 'Dispositivos',
        href: '/dispositivos',
        icon: Cpu,
    },
    {
        title: 'Informes',
        href: '/informes',
        icon: ChartArea,
    },
];


const footerNavItems: NavItem[] = [
    {
        title: 'Repository',
        href: 'https://github.com/laravel/react-starter-kit',
        icon: Folder,
    },
    {
        title: 'Documentation',
        href: 'https://laravel.com/docs/starter-kits#react',
        icon: BookOpen,
    },
];

export function AppSidebar() {
    const { url, props } = usePage();
    const isAdminContext = !props.organizacion_actual || url.startsWith('/admin');

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={isAdminContext ? adminNavItems : mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
