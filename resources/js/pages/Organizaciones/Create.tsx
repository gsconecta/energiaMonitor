import OrganizacionWizardForm, {
    type CredencialShellyOption,
    type OrganizacionWizardItem,
} from '@/components/organizaciones/organizacion-wizard-form';
import { Card, CardContent } from '@/components/ui/card';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Organizaciones',
        href: '/organizaciones',
    },
    {
        title: 'Crear',
        href: '/organizaciones/create',
    },
];

interface Props {
    organizaciones?: OrganizacionWizardItem[];
    credenciales_shelly?: CredencialShellyOption[];
}

export default function OrganizacionesCreate({
    organizaciones = [],
    credenciales_shelly = [],
}: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Crear Organizacion" />

            <div className="flex h-full w-full flex-1 flex-col gap-4 overflow-x-hidden p-2 sm:p-4 lg:p-6">
                <div className="mx-auto w-full max-w-4xl">
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            Alta de organizacion
                        </h1>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            Completa los pasos para dejar creada la organizacion
                            con su configuracion inicial.
                        </p>
                    </div>

                    <Card>
                        <CardContent className="p-6">
                            <OrganizacionWizardForm
                                organizaciones={organizaciones}
                                credencialesShelly={credenciales_shelly}
                                onCancel={() => router.visit('/organizaciones')}
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
