import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputPassword } from '@/components/ui/input-password';
import { Card, CardContent } from '@/components/ui/card';
import InputError from '@/components/input-error';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Panel de Control Global',
        href: '/admin/control-panel',
    },
    {
        title: 'Credenciales Shelly',
        href: '/admin/credenciales-shelly',
    },
    {
        title: 'Editar',
        href: '#',
    },
];

interface Credencial {
    id: number;
    nombre: string;
    server: string | null;
    tiene_api_key: boolean;
}

interface Props {
    credencial: Credencial;
}

export default function CredencialesShellyEdit({ credencial }: Props) {
    const { data, setData, put, processing, errors } = useForm({
        nombre: credencial.nombre,
        server: credencial.server || '',
        api_key: '', // Vacío para no mostrar la clave real.
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(`/admin/credenciales-shelly/${credencial.id}`);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Editar Credencial - ${credencial.nombre}`} />

            <div className="flex h-full w-full flex-1 flex-col gap-4 overflow-x-hidden p-2 sm:p-4 lg:p-6">
                <div className="mx-auto w-full max-w-2xl">
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            Editar Credencial Shelly
                        </h1>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            Actualiza los datos de conexión a Shelly Cloud
                        </p>
                    </div>

                    <Card>
                        <CardContent className="p-6">
                            <form onSubmit={handleSubmit}>
                                <div className="space-y-6">
                                    <div className="grid gap-2">
                                        <Label htmlFor="nombre">
                                            Nombre <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="nombre"
                                            type="text"
                                            value={data.nombre}
                                            onChange={(e) => setData('nombre', e.target.value)}
                                            required
                                        />
                                        <InputError message={errors.nombre} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="server">Servidor de Shelly</Label>
                                        <Input
                                            id="server"
                                            type="text"
                                            value={data.server}
                                            onChange={(e) => setData('server', e.target.value)}
                                        />
                                        <InputError message={errors.server} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="api_key">Clave API de Shelly</Label>
                                        <InputPassword
                                            id="api_key"
                                            value={data.api_key}
                                            onChange={(e) => setData('api_key', e.target.value)}
                                            placeholder={
                                                credencial.tiene_api_key
                                                    ? 'Dejar vacío para mantener la clave actual'
                                                    : 'Ingresa la clave API de Shelly'
                                            }
                                        />
                                        {credencial.tiene_api_key && (
                                            <p className="text-xs text-muted-foreground">
                                                Ya existe una clave configurada. Sólo escribe aquí si deseas cambiarla.
                                            </p>
                                        )}
                                        <InputError message={errors.api_key} />
                                    </div>
                                </div>

                                <div className="mt-6 flex gap-3">
                                    <Button
                                        type="submit"
                                        disabled={processing}
                                        className="flex-1"
                                    >
                                        {processing ? 'Actualizando...' : 'Actualizar'}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => router.visit('/admin/credenciales-shelly')}
                                        className="flex-1"
                                    >
                                        Cancelar
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
