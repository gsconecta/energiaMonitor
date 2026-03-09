import { InertiaLinkProps } from '@inertiajs/react';
import { LucideIcon } from 'lucide-react';

export interface Auth {
    user: User;
}

export interface Kpi {
    id: number;
    name: string;
    description: string | null;
    color: string;
    icon: string;
    created_at: string;
    updated_at: string;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
    icon?: LucideIcon | null;
    isActive?: boolean;
}

export interface OrganizacionActual {
    id: number;
    nombre: string;
    codigo: string;
}

export interface SitioActual {
    id: number;
    nombre: string;
    codigo: string;
}

export interface SharedData {
    name: string;
    quote: { message: string; author: string };
    auth: Auth;
    sidebarOpen: boolean;
    organizacion_actual?: OrganizacionActual | null;
    sitio_actual?: SitioActual | null;
    [key: string]: unknown;
}

export interface User {
    id: number;
    name: string;
    email: string;
    rol_global: 'cliente' | 'tecnico' | 'admin';
    avatar?: string;
    email_verified_at: string | null;
    two_factor_enabled?: boolean;
    created_at: string;
    updated_at: string;
    [key: string]: unknown; // This allows for additional properties...
}
