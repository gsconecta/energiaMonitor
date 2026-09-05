import { type ModeloDispositivo } from '@/components/modelos-dispositivo/formulario-modelo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Panel de Control Global', href: '/admin/control-panel' },
    { title: 'Modelos compatibles', href: '/admin/modelos-dispositivo' },
];

export default function ModelosDispositivoIndex({ modelos }: { modelos: ModeloDispositivo[] }) {
    const { errors } = usePage<{ errors?: Record<string, string> }>().props;

    const alternarActivo = (modelo: ModeloDispositivo) => {
        router.put(`/admin/modelos-dispositivo/${modelo.id}`, { ...modelo, activo: !modelo.activo }, { preserveScroll: true });
    };

    const eliminar = (modelo: ModeloDispositivo) => {
        if (confirm(`¿Eliminar el modelo ${modelo.fabricante} ${modelo.nombre}?`)) {
            router.delete(`/admin/modelos-dispositivo/${modelo.id}`, { preserveScroll: true });
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Modelos compatibles" />
            <div className="flex h-full w-full flex-1 flex-col gap-4 overflow-x-hidden p-2 sm:p-4 lg:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Modelos compatibles</h1>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Catálogo de equipos que la plataforma sabe describir y, cuando hay lector, leer.</p>
                    </div>
                    <Button onClick={() => router.visit('/admin/modelos-dispositivo/create')} className="w-full sm:w-auto">
                        <Plus className="mr-2 h-4 w-4" />
                        Nuevo modelo
                    </Button>
                </div>

                {errors?.error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">{errors.error}</p>}

                <div className="overflow-x-auto rounded-lg border bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Modelo</TableHead>
                                <TableHead>Driver</TableHead>
                                <TableHead>Canales</TableHead>
                                <TableHead className="text-right">Dispositivos</TableHead>
                                <TableHead>Activo</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {modelos.map((modelo) => (
                                <TableRow key={modelo.id}>
                                    <TableCell>
                                        <div className="font-medium">
                                            {modelo.fabricante} {modelo.nombre}
                                        </div>
                                        <div className="font-mono text-xs text-muted-foreground">{modelo.codigo}</div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            <Badge variant="secondary">{modelo.driver_label}</Badge>
                                            {!modelo.driver_disponible && <Badge variant="outline">sin lector</Badge>}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {modelo.num_canales} · {modelo.modo_canales_por_defecto}
                                        {modelo.modo_canales_configurable ? ' (configurable)' : ''}
                                    </TableCell>
                                    <TableCell className="text-right">{modelo.dispositivos_count}</TableCell>
                                    <TableCell>
                                        <input type="checkbox" checked={modelo.activo} onChange={() => alternarActivo(modelo)} aria-label={`Activo: ${modelo.nombre}`} />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" onClick={() => router.visit(`/admin/modelos-dispositivo/${modelo.id}/edit`)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            disabled={modelo.dispositivos_count > 0}
                                            title={modelo.dispositivos_count > 0 ? 'No puedes eliminar un modelo en uso' : 'Eliminar modelo'}
                                            onClick={() => eliminar(modelo)}
                                            className="text-red-600 disabled:opacity-50"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </AppLayout>
    );
}
