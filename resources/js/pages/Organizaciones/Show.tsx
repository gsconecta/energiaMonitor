import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Pencil, Trash2, Plus, Users, MapPin, UserPlus, Edit, X, CheckCheck, Building2 } from 'lucide-react';
import * as React from 'react';
import { useForm as useReactHookForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { Key, Server, Copy, Check } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Organizaciones',
        href: '/organizaciones',
    },
    {
        title: 'Detalle',
        href: '#',
    },
];

interface Sitio {
    id: number;
    nombre: string;
    codigo: string;
    activa: boolean;
}

interface SitioSimple {
    id: number;
    nombre: string;
    codigo: string;
}

interface Usuario {
    id: number;
    name: string;
    email: string;
    rol: string;
}

interface Organizacion {
    id: number;
    nombre: string;
    codigo: string;
    descripcion: string | null;
    tipo_perfil: string;
    activa: boolean;
    rol: string;
    sitios: Sitio[];
    usuarios: Usuario[];
    shelly_api_key?: string | null;
    tiene_shelly_api_key?: boolean;
    shelly_server?: string | null;
}

interface Props {
    organizacion: Organizacion;
    todos_sitios?: SitioSimple[];
}

export default function OrganizacionesShow({ organizacion, todos_sitios = [] }: Props) {
    const [mostrarModalUsuario, setMostrarModalUsuario] = useState(false);
    const [openSheetSitio, setOpenSheetSitio] = useState(false);
    const [codigoSitioEditadoManualmente, setCodigoSitioEditadoManualmente] = useState(false);
    const [openDialogAPI, setOpenDialogAPI] = useState(false);
    const [copied, setCopied] = useState<string | null>(null);

    const { data: formUsuario, setData: setFormUsuario, post: postUsuario, processing: processingUsuario, errors: errorsUsuario, reset: resetUsuario } = useForm({
        email: '',
        rol: 'member',
    });

    const inertiaFormSitio = useForm({
        organizacion_id: organizacion.id.toString(),
        nombre: '',
        codigo: '',
        ubicacion: '',
        descripcion: '',
        activa: true,
    });

    // Función para generar código único basado en el nombre
    const generarCodigoSitio = (nombre: string): string => {
        if (!nombre) return '';

        let codigo = nombre.toLowerCase();
        codigo = codigo.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        codigo = codigo.replace(/[^a-z0-9]+/g, '-');
        codigo = codigo.replace(/^-+|-+$/g, '');

        if (codigo.length > 50) {
            codigo = codigo.substring(0, 50);
        }

        if (!codigo) {
            codigo = 'sitio';
        }

        // Verificar si el código ya existe en los sitios de la organización
        const codigoBase = codigo;
        let codigoFinal = codigoBase;
        let contador = 1;

        while (todos_sitios.some(s => s.codigo === codigoFinal)) {
            codigoFinal = `${codigoBase}-${contador}`;
            contador++;
        }

        return codigoFinal;
    };

    const formSchemaSitio = z.object({
        nombre: z.string().min(1, 'El nombre es requerido').min(2, 'El nombre debe tener al menos 2 caracteres'),
        codigo: z.string().min(1, 'El código es requerido'),
        ubicacion: z.string().optional(),
        descripcion: z.string().optional(),
        activa: z.boolean().default(true),
    });

    const formSitio = useReactHookForm<z.infer<typeof formSchemaSitio>>({
        resolver: zodResolver(formSchemaSitio),
        defaultValues: {
            nombre: '',
            codigo: '',
            ubicacion: '',
            descripcion: '',
            activa: true,
        },
    });

    const watchNombreSitio = formSitio.watch('nombre');

    // Auto-generar código cuando cambia el nombre
    React.useEffect(() => {
        if (!codigoSitioEditadoManualmente && watchNombreSitio) {
            const codigoGenerado = generarCodigoSitio(watchNombreSitio);
            formSitio.setValue('codigo', codigoGenerado);
        }
    }, [watchNombreSitio, codigoSitioEditadoManualmente]);

    // Resetear formulario cuando se abre/cierra el Sheet
    React.useEffect(() => {
        if (openSheetSitio) {
            formSitio.reset({
                nombre: '',
                codigo: '',
                ubicacion: '',
                descripcion: '',
                activa: true,
            });
            setCodigoSitioEditadoManualmente(false);
            inertiaFormSitio.reset();
        }
    }, [openSheetSitio]);

    const onSubmitSitio = (data: z.infer<typeof formSchemaSitio>) => {
        formSitio.clearErrors();

        // Obtener los valores actuales del formulario directamente
        const formValues = formSitio.getValues();

        // Asegurar que los valores no estén vacíos
        const codigoValue = (formValues.codigo || data.codigo || '').trim();
        const nombreValue = (formValues.nombre || data.nombre || '').trim();
        const ubicacionValue = (formValues.ubicacion || data.ubicacion || '').trim();
        const descripcionValue = (formValues.descripcion || data.descripcion || '').trim();
        const activaValue = formValues.activa !== undefined ? formValues.activa : (data.activa !== undefined ? data.activa : true);

        if (!codigoValue) {
            formSitio.setError('codigo', {
                type: 'manual',
                message: 'El código es requerido',
            });
            return;
        }

        if (!nombreValue) {
            formSitio.setError('nombre', {
                type: 'manual',
                message: 'El nombre es requerido',
            });
            return;
        }

        // Preparar los datos para enviar
        const formData = {
            organizacion_id: organizacion.id.toString(),
            nombre: nombreValue,
            codigo: codigoValue,
            ubicacion: ubicacionValue,
            descripcion: descripcionValue,
            activa: activaValue,
        };

        inertiaFormSitio.setData(formData);

        inertiaFormSitio.post('/sitios', {
            preserveScroll: true,
            onSuccess: () => {
                toast.custom(() => (
                    <Alert className='border-green-600 text-green-600 dark:border-green-400 dark:text-green-400'>
                        <CheckCheck />
                        <AlertTitle>Sitio creado exitosamente!</AlertTitle>
                    </Alert>
                ));
                setOpenSheetSitio(false);
                formSitio.reset();
                setCodigoSitioEditadoManualmente(false);
                inertiaFormSitio.reset();
            },
            onError: (errors) => {
                Object.keys(errors).forEach((key) => {
                    const fieldName = key as keyof z.infer<typeof formSchemaSitio>;
                    if (fieldName in formSchemaSitio.shape) {
                        formSitio.setError(fieldName, {
                            type: 'server',
                            message: Array.isArray(errors[key]) ? errors[key][0] : errors[key],
                        });
                    }
                });
            },
        });
    };

    const getRolBadgeColor = (rol: string) => {
        switch (rol) {
            case 'owner':
                return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
            case 'admin':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
            case 'member':
                return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            case 'viewer':
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
        }
    };

    const getRolLabel = (rol: string) => {
        switch (rol) {
            case 'owner':
                return 'Propietario';
            case 'admin':
                return 'Administrador';
            case 'member':
                return 'Miembro';
            case 'viewer':
                return 'Visualizador';
            default:
                return rol;
        }
    };

    const handleAgregarUsuario = (e: React.FormEvent) => {
        e.preventDefault();
        postUsuario(`/organizaciones/${organizacion.id}/usuarios`, {
            onSuccess: () => {
                setMostrarModalUsuario(false);
                resetUsuario();
            },
        });
    };

    const handleEliminarUsuario = (userId: number) => {
        if (confirm('¿Estás seguro de eliminar este usuario de la organización?')) {
            router.delete(`/organizaciones/${organizacion.id}/usuarios/${userId}`);
        }
    };

    const handleEliminar = () => {
        if (confirm('¿Estás seguro de eliminar esta organización?')) {
            router.delete(`/organizaciones/${organizacion.id}`);
        }
    };

    const puedeGestionar = ['owner', 'admin'].includes(organizacion.rol);

    const copiarAlPortapapeles = (texto: string, tipo: string) => {
        navigator.clipboard.writeText(texto).then(() => {
            setCopied(tipo);
            setTimeout(() => setCopied(null), 2000);
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={organizacion.nombre} />

            <div className="flex h-full w-full flex-1 flex-col gap-4 overflow-x-hidden p-2 sm:p-4 lg:p-6">
                {/* Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            {organizacion.nombre}
                        </h1>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            {organizacion.codigo}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {puedeGestionar && (
                            <>
                                <button
                                    onClick={() => router.visit(`/organizaciones/${organizacion.id}/edit`)}
                                    className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                                >
                                    <Pencil className="h-4 w-4" />
                                    Editar
                                </button>
                                {organizacion.rol === 'owner' && (
                                    <button
                                        onClick={handleEliminar}
                                        className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Eliminar
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Información */}
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="overflow-hidden rounded-xl border border-sidebar-border/70 bg-white shadow dark:border-sidebar-border dark:bg-gray-800">
                        <div className="p-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                    Información
                                </h2>
                                {(organizacion.tiene_shelly_api_key || organizacion.shelly_server) && (
                                    <Dialog open={openDialogAPI} onOpenChange={setOpenDialogAPI}>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" size="sm">
                                                <Key className="h-4 w-4" />
                                                API Shelly
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-lg">
                                            <DialogHeader>
                                                <DialogTitle className="flex items-center gap-2">
                                                    <Key className="h-5 w-5" />
                                                    Información API de Shelly
                                                </DialogTitle>
                                                <DialogDescription>
                                                    Configuración de la API de Shelly para esta organización
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="space-y-4">
                                                {organizacion.shelly_server && (
                                                    <div className="space-y-2">
                                                        <Label className="flex items-center gap-2">
                                                            <Server className="h-4 w-4" />
                                                            Servidor
                                                        </Label>
                                                        <div className="flex gap-2">
                                                            <Input
                                                                value={organizacion.shelly_server}
                                                                readOnly
                                                                className="font-mono text-sm"
                                                            />
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="icon"
                                                                onClick={() => copiarAlPortapapeles(organizacion.shelly_server!, 'server')}
                                                            >
                                                                {copied === 'server' ? (
                                                                    <Check className="h-4 w-4 text-green-600" />
                                                                ) : (
                                                                    <Copy className="h-4 w-4" />
                                                                )}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                                {organizacion.tiene_shelly_api_key && (
                                                    <div className="space-y-2">
                                                        <Label className="flex items-center gap-2">
                                                            <Key className="h-4 w-4" />
                                                            Clave API
                                                        </Label>
                                                        <div className="flex gap-2">
                                                            <Input
                                                                value="••••••••••••••••"
                                                                readOnly
                                                                className="font-mono text-sm"
                                                            />
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                size="icon"
                                                                disabled
                                                                title="La clave API está configurada. Edítala desde el formulario de edición."
                                                            >
                                                                <Copy className="h-4 w-4 opacity-50" />
                                                            </Button>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground">
                                                            La clave API está configurada. Para verla o cambiarla, edita la organización.
                                                        </p>
                                                    </div>
                                                )}
                                                {!organizacion.tiene_shelly_api_key && !organizacion.shelly_server && (
                                                    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
                                                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                                            No hay configuración de API de Shelly para esta organización.
                                                            Configúrala desde el formulario de edición.
                                                        </p>
                                                    </div>
                                                )}
                                                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                                                    <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                                                        Información para consultas API
                                                    </p>
                                                    <ul className="mt-2 space-y-1 text-xs text-blue-700 dark:text-blue-300">
                                                        <li>• Usa estas credenciales para realizar llamadas a la API de Shelly Cloud</li>
                                                        <li>• El servidor debe coincidir con la región de tu cuenta de Shelly</li>
                                                        <li>• Incluye la clave API en el header: Authorization: Bearer {'{api_key}'}</li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                )}
                            </div>
                            {organizacion.descripcion && (
                                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                    {organizacion.descripcion}
                                </p>
                            )}
                            <div className="mt-4 flex items-center gap-4">
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <MapPin className="h-4 w-4" />
                                    <span>{organizacion.sitios.length} sitios</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <Building2 className="h-4 w-4" />
                                    <span>{organizacion.tipo_perfil === 'residencial' ? 'Residencial' : 'Industrial'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <Users className="h-4 w-4" />
                                    <span>{organizacion.usuarios.length} usuarios</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-sidebar-border/70 bg-white shadow dark:border-sidebar-border dark:bg-gray-800">
                        <div className="p-6">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                Tu Rol
                            </h2>
                            <div className="mt-4">
                                <span
                                    className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${getRolBadgeColor(
                                        organizacion.rol
                                    )}`}
                                >
                                    {getRolLabel(organizacion.rol)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sitios */}
                <div className="overflow-hidden rounded-xl border border-sidebar-border/70 bg-white shadow dark:border-sidebar-border dark:bg-gray-800">
                    <div className="p-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                Sitios
                            </h2>
                            <Sheet open={openSheetSitio} onOpenChange={setOpenSheetSitio}>
                                <SheetTrigger asChild>
                                    <Button size="sm">
                                        <Plus className="h-4 w-4" />
                                        Nuevo Sitio
                                    </Button>
                                </SheetTrigger>
                                <SheetContent side="left">
                                    <SheetHeader>
                                        <SheetTitle className="text-center text-xl font-bold">
                                            Crear Sitio
                                        </SheetTitle>
                                        <div className="mt-2 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                                            <Building2 className="h-4 w-4" />
                                            <span>Organización: {organizacion.nombre}</span>
                                        </div>
                                    </SheetHeader>
                                    <Form {...formSitio}>
                                        <form
                                            onSubmit={(e) => {
                                                e.preventDefault();
                                                const formValues = formSitio.getValues();
                                                console.log('Valores del formulario sitio al hacer submit:', formValues);
                                                formSitio.handleSubmit(onSubmitSitio)(e);
                                            }}
                                            className="w-full"
                                        >
                                            <div className="space-y-4 p-4 pt-0">
                                                <FormField
                                                    control={formSitio.control}
                                                    name="nombre"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>
                                                                Nombre <span className="text-red-500">*</span>
                                                            </FormLabel>
                                                            <FormControl>
                                                                <Input
                                                                    placeholder="Nave Industrial 1"
                                                                    {...field}
                                                                    value={field.value || ''}
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={formSitio.control}
                                                    name="codigo"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>
                                                                Código <span className="text-red-500">*</span>
                                                            </FormLabel>
                                                            <FormControl>
                                                                <Input
                                                                    placeholder="Se generará automáticamente"
                                                                    {...field}
                                                                    value={field.value || ''}
                                                                    onChange={(e) => {
                                                                        const value = e.target.value;
                                                                        field.onChange(value);
                                                                        if (value && !codigoSitioEditadoManualmente) {
                                                                            setCodigoSitioEditadoManualmente(true);
                                                                        }
                                                                    }}
                                                                />
                                                            </FormControl>
                                                            <p className="text-xs text-muted-foreground">
                                                                Código único para identificar el sitio (se genera automáticamente, puedes editarlo)
                                                            </p>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={formSitio.control}
                                                    name="ubicacion"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Ubicación</FormLabel>
                                                            <FormControl>
                                                                <Input
                                                                    placeholder="Calle Principal 123, Ciudad"
                                                                    {...field}
                                                                    value={field.value || ''}
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={formSitio.control}
                                                    name="descripcion"
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Descripción</FormLabel>
                                                            <FormControl>
                                                                <Textarea
                                                                    placeholder="Descripción del sitio..."
                                                                    rows={3}
                                                                    {...field}
                                                                    value={field.value || ''}
                                                                />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={formSitio.control}
                                                    name="activa"
                                                    render={({ field }) => (
                                                        <FormItem className="flex items-center space-x-2">
                                                            <FormControl>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={field.value}
                                                                    onChange={(e) => field.onChange(e.target.checked)}
                                                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                                />
                                                            </FormControl>
                                                            <FormLabel className="!mt-0 cursor-pointer">
                                                                Sitio activo
                                                            </FormLabel>
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                            <SheetFooter>
                                                <Button
                                                    type="submit"
                                                    disabled={inertiaFormSitio.processing}
                                                >
                                                    {inertiaFormSitio.processing ? 'Creando...' : 'Crear Sitio'}
                                                </Button>
                                                <SheetClose asChild>
                                                    <Button variant="outline">Cancelar</Button>
                                                </SheetClose>
                                            </SheetFooter>
                                        </form>
                                    </Form>
                                </SheetContent>
                            </Sheet>
                        </div>
                        {organizacion.sitios.length === 0 ? (
                            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                                No hay sitios en esta organización
                            </p>
                        ) : (
                            <div className="mt-4 space-y-2">
                                {organizacion.sitios.map((sitio) => (
                                    <div
                                        key={sitio.id}
                                        onClick={() => router.visit(`/sitios/${sitio.id}`)}
                                        className="cursor-pointer rounded-lg border border-gray-200 p-3 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-gray-100">
                                                    {sitio.nombre}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {sitio.codigo}
                                                </p>
                                            </div>
                                            {!sitio.activa && (
                                                <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800 dark:bg-red-900 dark:text-red-200">
                                                    Inactiva
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Usuarios */}
                {puedeGestionar && (
                    <div className="overflow-hidden rounded-xl border border-sidebar-border/70 bg-white shadow dark:border-sidebar-border dark:bg-gray-800">
                        <div className="p-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                    Usuarios
                                </h2>
                                <button
                                    onClick={() => setMostrarModalUsuario(true)}
                                    className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                                >
                                    <UserPlus className="h-4 w-4" />
                                    Agregar Usuario
                                </button>
                            </div>
                            <div className="mt-4 overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-900">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                                Usuario
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                                Rol
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                                Acciones
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                                        {organizacion.usuarios.map((usuario) => (
                                            <tr key={usuario.id}>
                                                <td className="whitespace-nowrap px-4 py-3">
                                                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                        {usuario.name}
                                                    </div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                                        {usuario.email}
                                                    </div>
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-3">
                                                    <span
                                                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getRolBadgeColor(
                                                            usuario.rol
                                                        )}`}
                                                    >
                                                        {getRolLabel(usuario.rol)}
                                                    </span>
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                                                    <button
                                                        onClick={() => handleEliminarUsuario(usuario.id)}
                                                        className="text-red-600 hover:text-red-800"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal Agregar Usuario */}
                {mostrarModalUsuario && (
                    <div className="fixed inset-0 z-50 overflow-y-auto">
                        <div className="flex min-h-screen items-center justify-center px-4">
                            <div
                                className="fixed inset-0 bg-black bg-opacity-30"
                                onClick={() => setMostrarModalUsuario(false)}
                            />
                            <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
                                <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                                    Agregar Usuario
                                </h3>
                                <form onSubmit={handleAgregarUsuario} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            value={formUsuario.email}
                                            onChange={(e) => setFormUsuario('email', e.target.value)}
                                            className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                            required
                                        />
                                        {errorsUsuario.email && (
                                            <p className="mt-1 text-sm text-red-600">{errorsUsuario.email}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Rol
                                        </label>
                                        <select
                                            value={formUsuario.rol}
                                            onChange={(e) => setFormUsuario('rol', e.target.value)}
                                            className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                        >
                                            <option value="admin">Administrador</option>
                                            <option value="member">Miembro</option>
                                            <option value="viewer">Visualizador</option>
                                        </select>
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            type="submit"
                                            disabled={processingUsuario}
                                            className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                                        >
                                            Agregar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setMostrarModalUsuario(false)}
                                            className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

