import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputPassword } from '@/components/ui/input-password';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import InputError from '@/components/input-error';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Organizaciones',
        href: '/organizaciones',
    },
    {
        title: 'Editar',
        href: '#',
    },
];

interface Organizacion {
    id: number;
    nombre: string;
    codigo: string;
    descripcion: string | null;
    activa: boolean;
    tiene_shelly_api_key?: boolean;
    shelly_server?: string | null;
}

interface Props {
    organizacion: Organizacion;
}

export default function OrganizacionesEdit({ organizacion }: Props) {
    const { data, setData, put, processing, errors } = useForm({
        nombre: organizacion.nombre,
        codigo: organizacion.codigo,
        descripcion: organizacion.descripcion || '',
        activa: organizacion.activa,
        shelly_api_key: '', // Campo vacío inicialmente, solo se actualiza si el usuario introduce algo
        shelly_server: organizacion.shelly_server || '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        put(`/organizaciones/${organizacion.id}`);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Editar Organización" />

            <div className="flex h-full w-full flex-1 flex-col gap-4 overflow-x-hidden p-2 sm:p-4 lg:p-6">
                <div className="mx-auto w-full max-w-2xl">
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            Editar Organización
                        </h1>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            Actualiza la información de la organización
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
                                            placeholder="Nombre de la organización"
                                        />
                                        <InputError message={errors.nombre} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="codigo">
                                            Código <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="codigo"
                                            type="text"
                                            value={data.codigo}
                                            onChange={(e) => setData('codigo', e.target.value)}
                                            required
                                            placeholder="Código único de la organización"
                                        />
                                        <InputError message={errors.codigo} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="descripcion">Descripción</Label>
                                        <Textarea
                                            id="descripcion"
                                            value={data.descripcion}
                                            onChange={(e) => setData('descripcion', e.target.value)}
                                            rows={4}
                                            placeholder="Descripción de la organización"
                                        />
                                        <InputError message={errors.descripcion} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="shelly_api_key">
                                            Clave API de Shelly
                                        </Label>
                                        <InputPassword
                                            id="shelly_api_key"
                                            value={data.shelly_api_key}
                                            onChange={(e) => setData('shelly_api_key', e.target.value)}
                                            placeholder={
                                                organizacion.tiene_shelly_api_key
                                                    ? 'Dejar vacío para mantener la clave actual o escribir nueva clave'
                                                    : 'Ingresa la clave API de Shelly'
                                            }
                                        />
                                        {organizacion.tiene_shelly_api_key && (
                                            <p className="text-xs text-muted-foreground">
                                                Ya existe una clave API configurada. Deja este campo vacío para mantenerla o ingresa una nueva para cambiarla.
                                            </p>
                                        )}
                                        <InputError message={errors.shelly_api_key} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="shelly_server">
                                            Servidor de Shelly
                                        </Label>
                                        <Input
                                            id="shelly_server"
                                            type="text"
                                            value={data.shelly_server}
                                            onChange={(e) => setData('shelly_server', e.target.value)}
                                            placeholder="Ejemplo: https://api.shelly.cloud o https://shelly-XX-eu.shelly.cloud"
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            URL del servidor de Shelly Cloud para esta organización
                                        </p>
                                        <InputError message={errors.shelly_server} />
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="activa"
                                            checked={data.activa}
                                            onCheckedChange={(checked) => setData('activa', checked === true)}
                                        />
                                        <Label
                                            htmlFor="activa"
                                            className="text-sm font-normal cursor-pointer"
                                        >
                                            Organización activa
                                        </Label>
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
                                        onClick={() => router.visit(`/organizaciones/${organizacion.id}`)}
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

