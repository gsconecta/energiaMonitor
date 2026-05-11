import SitioForm, {
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
        title: 'Crear',
        href: '/sitios/create',
    },
];

interface Props {
    organizaciones: SitioOrganizacionOption[];
}

export default function SitiosCreate({ organizaciones }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Crear Sitio" />

            <div className="flex h-full w-full flex-1 flex-col gap-4 overflow-x-hidden p-2 sm:p-4 lg:p-6">
                <div className="mx-auto w-full max-w-4xl">
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            Alta de sitio
                        </h1>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            Completa los pasos para dejar creado el sitio con su
                            configuracion inicial.
                        </p>
                    </div>

                    <Card>
                        <CardContent className="p-6">
                            <SitioForm
                                organizaciones={organizaciones}
                                submitUrl="/sitios"
                                method="post"
                                cancelUrl="/sitios"
                                submitLabel="Crear sitio"
                                processingLabel="Creando..."
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
