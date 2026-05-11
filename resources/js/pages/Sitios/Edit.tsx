import SitioForm, {
    type SitioFormData,
    type SitioOrganizacionOption,
} from '@/components/sitios/sitio-form';
import { Card, CardContent } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Sitios',
        href: '/sitios',
    },
    {
        title: 'Editar',
        href: '#',
    },
];

interface Sitio {
    id: number;
    organizacion_id: number;
    nombre: string;
    codigo: string;
    ubicacion: string | null;
    latitud: number | null;
    longitud: number | null;
    codigo_municipio_aemet: string | null;
    descripcion: string | null;
    activa: boolean;
}

interface Props {
    sitio: Sitio;
    organizaciones: SitioOrganizacionOption[];
}

export default function SitiosEdit({ sitio, organizaciones }: Props) {
    const initialValues: SitioFormData = {
        organizacion_id: sitio.organizacion_id.toString(),
        nombre: sitio.nombre,
        codigo: sitio.codigo,
        ubicacion: sitio.ubicacion || '',
        latitud: sitio.latitud?.toString() || '',
        longitud: sitio.longitud?.toString() || '',
        codigo_municipio_aemet: sitio.codigo_municipio_aemet || '',
        descripcion: sitio.descripcion || '',
        activa: sitio.activa,
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Editar Sitio" />

            <div className="flex h-full w-full flex-1 flex-col gap-4 overflow-x-hidden p-2 sm:p-4 lg:p-6">
                <div className="mx-auto w-full max-w-4xl">
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            Editar sitio
                        </h1>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            Actualiza los datos del sitio manteniendo el mismo
                            flujo de revision.
                        </p>
                    </div>

                    <Card>
                        <CardContent className="p-6">
                            <SitioForm
                                organizaciones={organizaciones}
                                initialValues={initialValues}
                                submitUrl={`/sitios/${sitio.id}`}
                                method="put"
                                cancelUrl={`/sitios/${sitio.id}`}
                                submitLabel="Actualizar sitio"
                                processingLabel="Actualizando..."
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
