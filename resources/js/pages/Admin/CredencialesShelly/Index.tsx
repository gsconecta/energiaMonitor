import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Plus, Server, Key, Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Panel de Control Global',
        href: '/admin/control-panel',
    },
    {
        title: 'Credenciales Shelly',
        href: '/admin/credenciales-shelly',
    },
];

interface Credencial {
    id: number;
    nombre: string;
    server: string | null;
    tiene_api_key: boolean;
    organizaciones_count: number;
}

interface Props {
    credenciales: Credencial[];
}

export default function CredencialesShellyIndex({ credenciales }: Props) {
    const handleEliminar = (id: number) => {
        if (confirm('¿Estás seguro de eliminar esta credencial? Las organizaciones que la usen perderán el acceso a los datos de Shelly.')) {
            router.delete(`/admin/credenciales-shelly/${id}`);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Credenciales Shelly" />

            <div className="flex h-full w-full flex-1 flex-col gap-4 overflow-x-hidden p-2 sm:p-4 lg:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            Credenciales Shelly
                        </h1>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            Gestiona las credenciales globales de acceso a Shelly Cloud
                        </p>
                    </div>
                    <Button
                        onClick={() => router.visit('/admin/credenciales-shelly/create')}
                        className="w-full sm:w-auto"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Nueva Credencial
                    </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {credenciales.length === 0 ? (
                        <div className="col-span-full rounded-lg border border-dashed border-gray-300 p-8 text-center dark:border-gray-700">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                No hay credenciales configuradas
                            </p>
                            <Button
                                variant="outline"
                                onClick={() => router.visit('/admin/credenciales-shelly/create')}
                                className="mt-4"
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Crear la primera credencial
                            </Button>
                        </div>
                    ) : (
                        credenciales.map((credencial) => (
                            <div
                                key={credencial.id}
                                className="flex flex-col justify-between rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
                            >
                                <div className="p-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                                            {credencial.nombre}
                                        </h3>
                                        <div className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                            ID: {credencial.id}
                                        </div>
                                    </div>

                                    <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                        <div className="flex items-center gap-2">
                                            <Server className="h-4 w-4" />
                                            <span>{credencial.server || 'Sin servidor configurado'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Key className="h-4 w-4" />
                                            <span>
                                                {credencial.tiene_api_key
                                                    ? 'Clave API configurada'
                                                    : 'Sin clave API'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mt-4 rounded-md bg-gray-50 p-3 text-sm dark:bg-gray-800/50">
                                        <span className="font-medium text-gray-900 dark:text-gray-100">
                                            {credencial.organizaciones_count}
                                        </span>{' '}
                                        organizaciones usando esta credencial
                                    </div>
                                </div>
                                <div className="flex border-t border-gray-100 bg-gray-50/50 p-2 dark:border-gray-800 dark:bg-gray-800/20">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => router.visit(`/admin/credenciales-shelly/${credencial.id}/edit`)}
                                        className="flex-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                    >
                                        <Pencil className="mr-2 h-4 w-4" />
                                        Editar
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEliminar(credencial.id)}
                                        disabled={credencial.organizaciones_count > 0}
                                        title={credencial.organizaciones_count > 0 ? "No puedes eliminar una credencial en uso" : "Eliminar credencial"}
                                        className="flex-1 text-red-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-300"
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Eliminar
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
