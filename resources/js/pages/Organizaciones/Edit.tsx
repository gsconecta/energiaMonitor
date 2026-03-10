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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

interface CredencialShelly {
    id: number;
    nombre: string;
    server: string | null;
}

interface Organizacion {
    id: number;
    nombre: string;
    codigo: string;
    descripcion: string | null;
    tipo_perfil: string;
    activa: boolean;
    credencial_shelly_id?: number | null;
}

interface Props {
    organizacion: Organizacion;
    credenciales_shelly?: CredencialShelly[];
}

export default function OrganizacionesEdit({ organizacion, credenciales_shelly = [] }: Props) {
    const { data, setData, put, processing, errors } = useForm({
        nombre: organizacion.nombre,
        codigo: organizacion.codigo,
        descripcion: organizacion.descripcion || '',
        tipo_perfil: organizacion.tipo_perfil || 'industrial',
        activa: organizacion.activa,
        credencial_shelly_id: organizacion.credencial_shelly_id ? organizacion.credencial_shelly_id.toString() : 'none',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Convert "none" back to null for the backend
        const payload = {
            ...data,
            credencial_shelly_id: data.credencial_shelly_id === 'none' ? null : parseInt(data.credencial_shelly_id),
        };

        router.put(`/organizaciones/${organizacion.id}`, payload);
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
                                        <Label htmlFor="tipo_perfil">
                                            Tipo de Perfil <span className="text-red-500">*</span>
                                        </Label>
                                        <Select
                                            value={data.tipo_perfil}
                                            onValueChange={(value) => setData('tipo_perfil', value)}
                                        >
                                            <SelectTrigger id="tipo_perfil">
                                                <SelectValue placeholder="Selecciona el tipo de perfil" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="industrial">Industrial (Trifásico / Zonas)</SelectItem>
                                                <SelectItem value="residencial">Residencial (Monofásico / Solar)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-muted-foreground">
                                            Determina qué tipo de panel de control verá esta organización por defecto.
                                        </p>
                                        <InputError message={errors.tipo_perfil} />
                                    </div>

                                    {credenciales_shelly && credenciales_shelly.length > 0 && (
                                        <div className="grid gap-2">
                                            <Label htmlFor="credencial_shelly_id">
                                                Credencial de Shelly Cloud
                                            </Label>
                                            <Select
                                                value={data.credencial_shelly_id}
                                                onValueChange={(value) => setData('credencial_shelly_id', value)}
                                            >
                                                <SelectTrigger id="credencial_shelly_id">
                                                    <SelectValue placeholder="Selecciona una credencial (opcional)" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">Ninguna (Sin acceso a Shelly)</SelectItem>
                                                    {credenciales_shelly.map((credencial) => (
                                                        <SelectItem key={credencial.id} value={credencial.id.toString()}>
                                                            {credencial.nombre} {credencial.server ? `(${credencial.server})` : ''}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <p className="text-xs text-muted-foreground">
                                                Selecciona qué cuenta de Shelly se usará para obtener los datos de esta organización.
                                            </p>
                                            {errors.credencial_shelly_id && (
                                                <InputError message={errors.credencial_shelly_id} />
                                            )}
                                        </div>
                                    )}

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

