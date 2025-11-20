import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Plus, Building2, Users, MapPin, CheckCheck } from 'lucide-react';
import { useState } from 'react';
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

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Organizaciones',
        href: '/organizaciones',
    },
];

interface Organizacion {
    id: number;
    nombre: string;
    codigo: string;
    descripcion: string | null;
    activa: boolean;
    rol: string;
    sitios_count: number;
    users_count: number;
}

interface OrganizacionSimple {
    id: number;
    nombre: string;
    codigo: string;
}

interface Props {
    organizaciones: Organizacion[];
    todas_organizaciones?: OrganizacionSimple[];
}

export default function OrganizacionesIndex({ organizaciones, todas_organizaciones = [] }: Props) {
    const [open, setOpen] = useState(false);
    const [codigoEditadoManualmente, setCodigoEditadoManualmente] = useState(false);
    
    const inertiaForm = useForm({
        nombre: '',
        codigo: '',
        descripcion: '',
    });

    // Función para generar código único basado en el nombre
    const generarCodigo = (nombre: string): string => {
        if (!nombre) return '';
        
        let codigo = nombre.toLowerCase();
        codigo = codigo.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        codigo = codigo.replace(/[^a-z0-9]+/g, '-');
        codigo = codigo.replace(/^-+|-+$/g, '');
        
        if (codigo.length > 50) {
            codigo = codigo.substring(0, 50);
        }
        
        if (!codigo) {
            codigo = 'organizacion';
        }
        
        const codigoBase = codigo;
        let codigoFinal = codigoBase;
        let contador = 1;
        
        while (todas_organizaciones.some(org => org.codigo === codigoFinal)) {
            codigoFinal = `${codigoBase}-${contador}`;
            contador++;
        }
        
        return codigoFinal;
    };

    const formSchema = z.object({
        nombre: z.string().min(1, 'El nombre es requerido').min(2, 'El nombre debe tener al menos 2 caracteres'),
        codigo: z.string().min(1, 'El código es requerido'),
        descripcion: z.string().optional(),
    });

    const form = useReactHookForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            nombre: '',
            codigo: '',
            descripcion: '',
        },
    });

    const watchNombre = form.watch('nombre');

    // Auto-generar código cuando cambia el nombre
    React.useEffect(() => {
        if (!codigoEditadoManualmente && watchNombre) {
            const codigoGenerado = generarCodigo(watchNombre);
            form.setValue('codigo', codigoGenerado);
        }
    }, [watchNombre, codigoEditadoManualmente]);


    const onSubmit = (data: z.infer<typeof formSchema>) => {
        // Resetear errores previos
        form.clearErrors();
        
        // Obtener los valores actuales del formulario directamente
        const formValues = form.getValues();
        
        // Asegurar que el código no esté vacío
        const codigoValue = (formValues.codigo || data.codigo || '').trim();
        const nombreValue = (formValues.nombre || data.nombre || '').trim();
        const descripcionValue = (formValues.descripcion || data.descripcion || '').trim();
        
        if (!codigoValue) {
            form.setError('codigo', {
                type: 'manual',
                message: 'El código es requerido',
            });
            return;
        }
        
        if (!nombreValue) {
            form.setError('nombre', {
                type: 'manual',
                message: 'El nombre es requerido',
            });
            return;
        }
        
        // Preparar los datos para enviar
        const formData = {
            nombre: nombreValue,
            codigo: codigoValue,
            descripcion: descripcionValue,
        };
        
        inertiaForm.setData(formData);
        
        inertiaForm.post('/organizaciones', {
            preserveScroll: true,
            onSuccess: () => {
                toast.custom(() => (
                    <Alert className='border-green-600 text-green-600 dark:border-green-400 dark:text-green-400'>
                        <CheckCheck />
                        <AlertTitle>Organización creada exitosamente!</AlertTitle>
                    </Alert>
                ));
                setOpen(false);
                form.reset();
                setCodigoEditadoManualmente(false);
                inertiaForm.reset();
            },
            onError: (errors) => {
                // Mapear errores de Laravel a los campos del formulario
                Object.keys(errors).forEach((key) => {
                    const fieldName = key as keyof z.infer<typeof formSchema>;
                    if (fieldName in formSchema.shape) {
                        form.setError(fieldName, {
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

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Organizaciones" />

            <div className="flex h-full w-full flex-1 flex-col gap-4 overflow-x-hidden p-2 sm:p-4 lg:p-6">
                {/* Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            Organizaciones
                        </h1>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            Gestiona tus organizaciones y sus sitios
                        </p>
                    </div>
                    <Sheet open={open} onOpenChange={setOpen}>
                        <SheetTrigger asChild>
                            <Button>
                                <Plus className="h-4 w-4" />
                                Nueva Organización
                            </Button>
                        </SheetTrigger>
                        <SheetContent>
                            <SheetHeader>
                                <SheetTitle className="text-center text-xl font-bold">
                                    Crear Organización
                                </SheetTitle>
                            </SheetHeader>
                            <Form {...form}>
                                <form 
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        form.handleSubmit(onSubmit)(e);
                                    }} 
                                    className="w-full"
                                >
                                    <div className="space-y-4 p-4 pt-0">
                                        <FormField
                                            control={form.control}
                                            name="nombre"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>
                                                        Nombre <span className="text-red-500">*</span>
                                                    </FormLabel>
                                                    <FormControl>
                                                        <Input 
                                                            placeholder="Mi Empresa" 
                                                            {...field}
                                                            value={field.value || ''}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
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
                                                                // Marcar como editado manualmente si el usuario escribe algo
                                                                if (value && !codigoEditadoManualmente) {
                                                                    setCodigoEditadoManualmente(true);
                                                                }
                                                            }}
                                                        />
                                                    </FormControl>
                                                    <p className="text-xs text-muted-foreground">
                                                        Código único para identificar la organización (se genera automáticamente, puedes editarlo)
                                                    </p>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="descripcion"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Descripción</FormLabel>
                                                    <FormControl>
                                                        <Textarea
                                                            placeholder="Descripción de la organización..."
                                                            rows={3}
                                                            {...field}
                                                            value={field.value || ''}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <SheetFooter>
                                        <Button 
                                            type="submit" 
                                            disabled={inertiaForm.processing}
                                        >
                                            {inertiaForm.processing ? 'Creando...' : 'Crear Organización'}
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

                {/* Grid de organizaciones */}
                {organizaciones.length === 0 ? (
                    <div className="flex h-64 items-center justify-center rounded-xl border border-sidebar-border/70 bg-white dark:border-sidebar-border dark:bg-gray-800">
                        <div className="text-center">
                            <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                                No hay organizaciones
                            </h3>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                Crea tu primera organización para comenzar
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {organizaciones.map((organizacion) => (
                            <div
                                key={organizacion.id}
                                onClick={() => router.visit(`/organizaciones/${organizacion.id}`)}
                                className="cursor-pointer overflow-hidden rounded-xl border border-sidebar-border/70 bg-white shadow transition-shadow hover:shadow-lg dark:border-sidebar-border dark:bg-gray-800"
                            >
                                <div className="p-6">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                                {organizacion.nombre}
                                            </h3>
                                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                                {organizacion.codigo}
                                            </p>
                                        </div>
                                        <span
                                            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getRolBadgeColor(
                                                organizacion.rol
                                            )}`}
                                        >
                                            {getRolLabel(organizacion.rol)}
                                        </span>
                                    </div>

                                    {organizacion.descripcion && (
                                        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                                            {organizacion.descripcion}
                                        </p>
                                    )}

                                    <div className="mt-4 flex items-center gap-4 border-t border-gray-200 pt-4 dark:border-gray-700">
                                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                            <MapPin className="h-4 w-4" />
                                            <span>{organizacion.sitios_count} sitios</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                            <Users className="h-4 w-4" />
                                            <span>{organizacion.users_count} usuarios</span>
                                        </div>
                                    </div>

                                    {!organizacion.activa && (
                                        <div className="mt-3">
                                            <span className="inline-flex rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800 dark:bg-red-900 dark:text-red-200">
                                                Inactiva
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

