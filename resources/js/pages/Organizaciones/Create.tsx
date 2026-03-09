import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

interface Organizacion {
    id: number;
    nombre: string;
    codigo: string;
}

interface Props {
    organizaciones?: Organizacion[];
}

export default function OrganizacionesCreate() {
    const page = usePage<Props>();
    const organizaciones = page.props.organizaciones || [];

    const [codigoEditadoManualmente, setCodigoEditadoManualmente] = useState(false);

    const form = useForm({
        nombre: '',
        codigo: '',
        descripcion: '',
        tipo_perfil: 'industrial', // Valor por defecto
    });

    // Función para generar código único basado en el nombre
    const generarCodigo = (nombre: string): string => {
        if (!nombre) return '';

        // Convertir a minúsculas
        let codigo = nombre.toLowerCase();

        // Eliminar acentos
        codigo = codigo
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');

        // Reemplazar espacios y caracteres especiales con guiones
        codigo = codigo.replace(/[^a-z0-9]+/g, '-');

        // Eliminar guiones al inicio y final
        codigo = codigo.replace(/^-+|-+$/g, '');

        // Limitar longitud
        if (codigo.length > 50) {
            codigo = codigo.substring(0, 50);
        }

        // Asegurar que no esté vacío
        if (!codigo) {
            codigo = 'organizacion';
        }

        // Verificar si el código ya existe y añadir número si es necesario
        const codigoBase = codigo;
        let codigoFinal = codigoBase;
        let contador = 1;

        while (organizaciones.some(org => org.codigo === codigoFinal)) {
            codigoFinal = `${codigoBase}-${contador}`;
            contador++;
        }

        return codigoFinal;
    };

    // Auto-generar código cuando cambia el nombre
    const handleNombreChange = (nombre: string) => {
        form.setData('nombre', nombre);

        // Solo auto-generar si el código no fue editado manualmente
        if (!codigoEditadoManualmente) {
            const codigoGenerado = generarCodigo(nombre);
            form.setData('codigo', codigoGenerado);
        }
    };

    // Manejar cambio manual del código
    const handleCodigoChange = (codigo: string) => {
        form.setData('codigo', codigo);
        setCodigoEditadoManualmente(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/organizaciones');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Crear Organización" />

            <div className="flex h-full w-full flex-1 flex-col gap-4 overflow-x-hidden p-2 sm:p-4 lg:p-6">
                <div className="mx-auto w-full max-w-2xl">
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            Crear Organización
                        </h1>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            Crea una nueva organización para gestionar sitios y dispositivos
                        </p>
                    </div>

                    <Card className="border-none shadow-none">
                        <div className="p-6">
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="nombre">
                                        Nombre <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="nombre"
                                        type="text"
                                        value={form.data.nombre}
                                        onChange={(e) => handleNombreChange(e.target.value)}
                                        placeholder="Mi Empresa"
                                        required
                                        aria-invalid={form.errors.nombre ? 'true' : 'false'}
                                    />
                                    {form.errors.nombre && (
                                        <p className="text-sm text-red-600" role="alert">
                                            {form.errors.nombre}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="codigo">
                                        Código <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="codigo"
                                        type="text"
                                        value={form.data.codigo}
                                        onChange={(e) => handleCodigoChange(e.target.value)}
                                        placeholder="Se generará automáticamente"
                                        required
                                        aria-invalid={form.errors.codigo ? 'true' : 'false'}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Código único para identificar la organización (se genera automáticamente, puedes editarlo)
                                    </p>
                                    {form.errors.codigo && (
                                        <p className="text-sm text-red-600" role="alert">
                                            {form.errors.codigo}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="tipo_perfil">
                                        Tipo de Perfil <span className="text-red-500">*</span>
                                    </Label>
                                    <Select
                                        value={form.data.tipo_perfil}
                                        onValueChange={(value) => form.setData('tipo_perfil', value)}
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
                                    {form.errors.tipo_perfil && (
                                        <p className="text-sm text-red-600" role="alert">
                                            {form.errors.tipo_perfil}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="descripcion">Descripción</Label>
                                    <Textarea
                                        id="descripcion"
                                        value={form.data.descripcion}
                                        onChange={(e) => form.setData('descripcion', e.target.value)}
                                        rows={3}
                                        placeholder="Descripción de la organización..."
                                        aria-invalid={form.errors.descripcion ? 'true' : 'false'}
                                    />
                                    {form.errors.descripcion && (
                                        <p className="text-sm text-red-600" role="alert">
                                            {form.errors.descripcion}
                                        </p>
                                    )}
                                </div>

                                <div className="flex gap-3">
                                    <Button
                                        type="submit"
                                        disabled={form.processing}
                                        className="flex-1"
                                    >
                                        {form.processing ? 'Creando...' : 'Crear Organización'}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => router.visit('/organizaciones')}
                                    >
                                        Cancelar
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}

