import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Plus, Building2, Users, MapPin } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Organizaciones',
        href: '/organizaciones',
    },
];

interface Organizacion {
    id: number;
    nombre: string;
    codigo: string;
    descripcion: string | null;
    activa: boolean;
    rol: string;
    sitios_count: number;
    users_count: number;
}

interface Props {
    organizaciones: Organizacion[];
}

export default function OrganizacionesIndex({ organizaciones }: Props) {
    const getRolBadgeColor = (rol: string) => {
        switch (rol) {
            case 'owner':
                return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
            case 'admin':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
            case 'member':
                return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            case 'viewer':
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
        }
    };

    const getRolLabel = (rol: string) => {
        switch (rol) {
            case 'owner':
                return 'Propietario';
            case 'admin':
                return 'Administrador';
            case 'member':
                return 'Miembro';
            case 'viewer':
                return 'Visualizador';
            default:
                return rol;
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Organizaciones" />

            <div className="flex h-full w-full flex-1 flex-col gap-4 overflow-x-hidden p-2 sm:p-4 lg:p-6">
                {/* Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            Organizaciones
                        </h1>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            Gestiona tus organizaciones y sus sitios
                        </p>
                    </div>
                    <button
                        onClick={() => router.visit('/organizaciones/create')}
                        className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                        <Plus className="h-4 w-4" />
                        Nueva Organización
                    </button>
                </div>

                {/* Grid de organizaciones */}
                {organizaciones.length === 0 ? (
                    <div className="flex h-64 items-center justify-center rounded-xl border border-sidebar-border/70 bg-white dark:border-sidebar-border dark:bg-gray-800">
                        <div className="text-center">
                            <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                                No hay organizaciones
                            </h3>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                Crea tu primera organización para comenzar
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {organizaciones.map((organizacion) => (
                            <div
                                key={organizacion.id}
                                onClick={() => router.visit(`/organizaciones/${organizacion.id}`)}
                                className="cursor-pointer overflow-hidden rounded-xl border border-sidebar-border/70 bg-white shadow transition-shadow hover:shadow-lg dark:border-sidebar-border dark:bg-gray-800"
                            >
                                <div className="p-6">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                                {organizacion.nombre}
                                            </h3>
                                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                                {organizacion.codigo}
                                            </p>
                                        </div>
                                        <span
                                            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getRolBadgeColor(
                                                organizacion.rol
                                            )}`}
                                        >
                                            {getRolLabel(organizacion.rol)}
                                        </span>
                                    </div>

                                    {organizacion.descripcion && (
                                        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                                            {organizacion.descripcion}
                                        </p>
                                    )}

                                    <div className="mt-4 flex items-center gap-4 border-t border-gray-200 pt-4 dark:border-gray-700">
                                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                            <MapPin className="h-4 w-4" />
                                            <span>{organizacion.sitios_count} sitios</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                            <Users className="h-4 w-4" />
                                            <span>{organizacion.users_count} usuarios</span>
                                        </div>
                                    </div>

                                    {!organizacion.activa && (
                                        <div className="mt-3">
                                            <span className="inline-flex rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800 dark:bg-red-900 dark:text-red-200">
                                                Inactiva
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

