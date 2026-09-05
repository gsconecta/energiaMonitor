import FormularioModelo, { type OpcionesFormulario } from '@/components/modelos-dispositivo/formulario-modelo';
import { Card, CardContent } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Panel de Control Global', href: '/admin/control-panel' },
    { title: 'Modelos compatibles', href: '/admin/modelos-dispositivo' },
    { title: 'Nuevo modelo', href: '#' },
];

export default function ModelosDispositivoCreate({ opciones }: { opciones: OpcionesFormulario }) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Nuevo modelo compatible" />
            <div className="flex h-full w-full flex-1 flex-col gap-4 overflow-x-hidden p-2 sm:p-4 lg:p-6">
                <div className="mx-auto w-full max-w-3xl">
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Nuevo modelo compatible</h1>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Describe el equipo: fabricante, driver de captura, canales y magnitudes.</p>
                    </div>
                    <Card>
                        <CardContent className="p-6">
                            <FormularioModelo opciones={opciones} />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
