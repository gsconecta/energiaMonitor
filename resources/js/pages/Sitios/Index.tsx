import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Plus, MapPin, Building2, Pencil, Trash2 } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Sitios',
        href: '/sitios',
    },
];

interface Organizacion {
    id: number;
    nombre: string;
}

interface Sitio {
    id: number;
    nombre: string;
    codigo: string;
    ubicacion: string | null;
    latitud: number | null;
    longitud: number | null;
    descripcion: string | null;
    activa: boolean;
    organizacion: Organizacion;
    dispositivos_count: number;
}

interface Props {
    sitios: Sitio[];
    organizaciones: Organizacion[];
    organizacion_seleccionada?: number;
}

export default function SitiosIndex({ sitios, organizaciones, organizacion_seleccionada }: Props) {
    const handleFiltroOrganizacion = (organizacionId: string) => {
        if (organizacionId === '') {
            router.visit('/sitios');
        } else {
            router.visit('/sitios', { data: { organizacion_id: organizacionId } });
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Sitios" />

            <div className="flex h-full w-full flex-1 flex-col gap-4 overflow-x-hidden p-2 sm:p-4 lg:p-6">
                {/* Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            Sitios
                        </h1>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            Gestiona los sitios de tus organizaciones
                        </p>
                    </div>
                    <button
                        onClick={() => router.visit('/sitios/create')}
                        className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                        <Plus className="h-4 w-4" />
                        Nuevo Sitio
                    </button>
                </div>

                {/* Filtro por organización */}
                {organizaciones.length > 1 && (
                    <div className="rounded-xl border border-sidebar-border/70 bg-white p-4 dark:border-sidebar-border dark:bg-gray-800">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Filtrar por organización
                        </label>
                        <select
                            value={organizacion_seleccionada || ''}
                            onChange={(e) => handleFiltroOrganizacion(e.target.value)}
                            className="mt-2 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 sm:w-64"
                        >
                            <option value="">Todas las organizaciones</option>
                            {organizaciones.map((org) => (
                                <option key={org.id} value={org.id}>
                                    {org.nombre}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Tabla de sitios */}
                {sitios.length === 0 ? (
                    <div className="flex h-64 items-center justify-center rounded-xl border border-sidebar-border/70 bg-white dark:border-sidebar-border dark:bg-gray-800">
                        <div className="text-center">
                            <MapPin className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                                No hay sitios
                            </h3>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                Crea tu primer sitio para comenzar
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-xl border border-sidebar-border/70 bg-white shadow dark:border-sidebar-border dark:bg-gray-800">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-900">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                            Sitio
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                            Organización
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                            Ubicación
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                            Dispositivos
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                            Estado
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                                    {sitios.map((sitio) => (
                                        <tr
                                            key={sitio.id}
                                            className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                                            onClick={() => router.visit(`/sitios/${sitio.id}`)}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    {sitio.nombre}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    {sitio.codigo}
                                                </div>
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="h-4 w-4 text-gray-400" />
                                                    {sitio.organizacion.nombre}
                                                </div>
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                                {sitio.ubicacion || '-'}
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                                                {sitio.dispositivos_count} dispositivos
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4">
                                                {sitio.activa ? (
                                                    <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800 dark:bg-green-900 dark:text-green-200">
                                                        Activa
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800 dark:bg-red-900 dark:text-red-200">
                                                        Inactiva
                                                    </span>
                                                )}
                                            </td>
                                            <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                                                <div
                                                    className="flex items-center justify-end gap-2"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <button
                                                        onClick={() => router.visit(`/sitios/${sitio.id}/edit`)}
                                                        className="rounded p-1 text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                        title="Editar"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            if (confirm('¿Estás seguro de eliminar este sitio?')) {
                                                                router.delete(`/sitios/${sitio.id}`);
                                                            }
                                                        }}
                                                        className="rounded p-1 text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

