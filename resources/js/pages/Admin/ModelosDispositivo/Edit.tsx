import FormularioModelo, { type ModeloDispositivo, type OpcionesFormulario } from '@/components/modelos-dispositivo/formulario-modelo';
import { Card, CardContent } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';

interface Props {
    modelo: ModeloDispositivo;
    opciones: OpcionesFormulario;
}

export default function ModelosDispositivoEdit({ modelo, opciones }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Panel de Control Global', href: '/admin/control-panel' },
        { title: 'Modelos compatibles', href: '/admin/modelos-dispositivo' },
        { title: modelo.nombre, href: '#' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Editar ${modelo.nombre}`} />
            <div className="flex h-full w-full flex-1 flex-col gap-4 overflow-x-hidden p-2 sm:p-4 lg:p-6">
                <div className="mx-auto w-full max-w-3xl">
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            {modelo.fabricante} {modelo.nombre}
                        </h1>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            {modelo.dispositivos_count} dispositivo(s) usan este modelo. Con dispositivos no se puede cambiar el driver ni reducir canales configurados.
                        </p>
                    </div>
                    <Card>
                        <CardContent className="p-6">
                            <FormularioModelo opciones={opciones} modelo={modelo} />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
