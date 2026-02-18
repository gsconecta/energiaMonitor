import AuthSplitLayout from '@/layouts/auth/auth-split-layout';
import { Head, router, usePage, useForm } from '@inertiajs/react';
import { Building2, MapPin, Check, Plus, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Organizacion {
    id: number;
    nombre: string;
    codigo: string;
    sitios: Sitio[];
}

interface Sitio {
    id: number;
    nombre: string;
    codigo: string;
    activa: boolean;
    dispositivos_count: number;
}

interface SharedProps {
    auth: {
        user: {
            name: string;
            email: string;
        };
    };
    organizacion_actual?: {
        id: number;
        nombre: string;
        codigo: string;
    };
    sitio_actual?: {
        id: number;
        nombre: string;
        codigo: string;
    };
}

interface ControllerProps {
    organizaciones: Organizacion[];
    organizacion_actual_id?: number | null;
    sitio_actual_id?: number | null;
}

type Props = ControllerProps & SharedProps;

export default function SeleccionarContexto() {
    const page = usePage();
    const pageProps = page.props as Partial<Props>;
    
    const organizaciones = pageProps.organizaciones ?? [];
    const organizacionActualId = pageProps.organizacion_actual_id ?? null;
    const sitioActualId = pageProps.sitio_actual_id ?? null;
    const auth = pageProps.auth as Props['auth'];
    const organizacionActual = pageProps.organizacion_actual;
    const sitioActual = pageProps.sitio_actual;

    const [organizacionSeleccionada, setOrganizacionSeleccionada] = useState<number | null>(
        organizacionActualId
    );
    const [sitioSeleccionado, setSitioSeleccionado] = useState<number | null>(sitioActualId);
    const [procesando, setProcesando] = useState(false);
    const [mostrarListaOrganizaciones, setMostrarListaOrganizaciones] = useState(true);
    const [mostrarFormulario, setMostrarFormulario] = useState(false);
    const [mostrarFormularioSitio, setMostrarFormularioSitio] = useState(false);
    const [codigoEditadoManualmente, setCodigoEditadoManualmente] = useState(false);
    const [codigoSitioEditadoManualmente, setCodigoSitioEditadoManualmente] = useState(false);

    const formOrganizacion = useForm({
        nombre: '',
        codigo: '',
        descripcion: '',
    });

    const formSitio = useForm({
        organizacion_id: organizacionSeleccionada?.toString() || '',
        nombre: '',
        codigo: '',
        ubicacion: '',
        descripcion: '',
        activa: true,
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
        formOrganizacion.setData('nombre', nombre);
        
        // Solo auto-generar si el código no fue editado manualmente
        if (!codigoEditadoManualmente) {
            const codigoGenerado = generarCodigo(nombre);
            formOrganizacion.setData('codigo', codigoGenerado);
        }
    };

    // Manejar cambio manual del código
    const handleCodigoChange = (codigo: string) => {
        formOrganizacion.setData('codigo', codigo);
        setCodigoEditadoManualmente(true);
    };

    // Función para generar código de sitio
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
        
        while (sitiosDisponibles.some(s => s.codigo === codigoFinal)) {
            codigoFinal = `${codigoBase}-${contador}`;
            contador++;
        }
        
        return codigoFinal;
    };

    // Auto-generar código de sitio cuando cambia el nombre
    const handleNombreSitioChange = (nombre: string) => {
        formSitio.setData('nombre', nombre);
        
        if (!codigoSitioEditadoManualmente) {
            const codigoGenerado = generarCodigoSitio(nombre);
            formSitio.setData('codigo', codigoGenerado);
        }
    };

    // Manejar cambio manual del código de sitio
    const handleCodigoSitioChange = (codigo: string) => {
        formSitio.setData('codigo', codigo);
        setCodigoSitioEditadoManualmente(true);
    };

    // Actualizar organizacion_id cuando cambia la organización seleccionada o se abre el formulario
    useEffect(() => {
        if (organizacionSeleccionada && mostrarFormularioSitio) {
            formSitio.setData('organizacion_id', organizacionSeleccionada.toString());
        }
    }, [organizacionSeleccionada, mostrarFormularioSitio]);

    const organizacionSeleccionadaObj = organizaciones.find(
        (org) => org.id === organizacionSeleccionada
    );
    const sitiosDisponibles = organizacionSeleccionadaObj?.sitios || [];

    const seleccionarContexto = () => {
        if (!organizacionSeleccionada || !sitioSeleccionado) {
            return;
        }

        setProcesando(true);
        router.post(
            '/seleccionar-contexto',
            {
                organizacion_id: organizacionSeleccionada,
                sitio_id: sitioSeleccionado,
            },
            {
                preserveScroll: true,
                onFinish: () => setProcesando(false),
                onSuccess: () => {
                    router.visit('/dashboard');
                },
                onError: (errors) => {
                    console.error('ERRORES DE VALIDACIÓN:', errors);
                    setProcesando(false);
                },
            }
        );
    };

    const crearOrganizacion = (e: React.FormEvent) => {
        e.preventDefault();
        formOrganizacion.post('/organizaciones', {
            preserveScroll: true,
            onSuccess: () => {
                formOrganizacion.reset();
                setMostrarFormulario(false);
                setCodigoEditadoManualmente(false);
                router.reload({ only: ['organizaciones'] });
            },
            onError: (errors) => {
                console.error('ERRORES DE VALIDACIÓN:', errors);
            },
        });
    };

    const crearSitio = (e: React.FormEvent) => {
        e.preventDefault();
        if (!organizacionSeleccionada) return;
        
        formSitio.post('/sitios', {
            preserveScroll: true,
            onSuccess: () => {
                // Limpiar el formulario y cerrarlo
                formSitio.reset();
                setMostrarFormularioSitio(false);
                setCodigoSitioEditadoManualmente(false);
                // Recargar organizaciones para obtener los nuevos sitios
                router.reload({ only: ['organizaciones'] });
            },
            onError: (errors) => {
                console.error('ERRORES DE VALIDACIÓN:', errors);
            },
        });
    };

    const puedeContinuar = organizacionSeleccionada !== null && sitioSeleccionado !== null;

    return (
        <AuthSplitLayout
            title={`Hola, ${auth.user.name}`}
            description="Selecciona una organización y sitio para comenzar"
        >
            <Head title="Seleccionar Contexto" />

            <div className="flex flex-col gap-4">

                {organizaciones.length === 0 ? (
                    <Card className="w-full border-none shadow-none">
                        <div className="p-6 text-center">
                            <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                            <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                                No tienes organizaciones
                            </h2>
                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                Crea una organización para comenzar
                            </p>
                            <Button
                                onClick={() => setMostrarFormulario(true)}
                                className="mt-4"
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Crear Organización
                            </Button>
                        </div>
                    </Card>
                ) : (
                    <>
                        {/* Selector de Organización */}
                        <Card className="w-full border-none shadow-none">
                            <div className="p-6">
                                <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                                    Organización
                                </h2>
                                {mostrarListaOrganizaciones ? (
                                    <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
                                        {organizaciones.map((organizacion) => {
                                            const isActive = organizacionSeleccionada === organizacion.id;
                                            return (
                                                <button
                                                    key={organizacion.id}
                                                    onClick={() => {
                                                        setOrganizacionSeleccionada(organizacion.id);
                                                        setSitioSeleccionado(null); // Reset sitio cuando cambia organización
                                                        setMostrarListaOrganizaciones(false);
                                                    }}
                                                    className={`relative flex items-start gap-3 rounded-lg border-2 p-4 text-left transition-all ${
                                                        isActive
                                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                            : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-700 dark:hover:border-gray-600'
                                                    }`}
                                                >
                                                    <Building2
                                                        className={`mt-0.5 h-5 w-5 ${
                                                            isActive
                                                                ? 'text-blue-600 dark:text-blue-400'
                                                                : 'text-gray-400'
                                                        }`}
                                                    />
                                                    <div className="flex-1">
                                                        <div className="font-medium text-gray-900 dark:text-gray-100">
                                                            {organizacion.nombre}
                                                        </div>
                                                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                            {organizacion.sitios.length} sitio
                                                            {organizacion.sitios.length !== 1 ? 's' : ''}
                                                        </div>
                                                    </div>
                                                    {isActive && (
                                                        <Check className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/30 dark:bg-blue-900/20">
                                        <div className="flex items-center gap-3">
                                            <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                            <div>
                                                <div className="font-medium text-gray-900 dark:text-gray-100">
                                                    {organizacionSeleccionadaObj?.nombre}
                                                </div>
                                                <div className="text-xs text-blue-600 dark:text-blue-400">
                                                    Organización seleccionada
                                                </div>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setMostrarListaOrganizaciones(true)}
                                            className="h-8 hover:bg-blue-100 dark:hover:bg-blue-900/40"
                                        >
                                            Cambiar
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </Card>

                        {/* Selector de Sitio */}
                        {organizacionSeleccionadaObj && sitiosDisponibles.length > 0 && !mostrarFormularioSitio && (
                            <Card className="w-full border-none shadow-none">
                                <div className="p-6">
                                    <div className="mb-4 flex items-center justify-between">
                                        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                            Sitio
                                        </h2>
                                        <Button
                                            onClick={() => setMostrarFormularioSitio(true)}
                                            variant="outline"
                                            size="sm"
                                        >
                                            <Plus className="mr-2 h-4 w-4" />
                                            Nuevo Sitio
                                        </Button>
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        {sitiosDisponibles.map((sitio) => {
                                            const isActive = sitioSeleccionado === sitio.id;
                                            return (
                                                <button
                                                    key={sitio.id}
                                                    onClick={() => setSitioSeleccionado(sitio.id)}
                                                    disabled={!sitio.activa}
                                                    className={`relative flex items-start gap-3 rounded-lg border-2 p-4 text-left transition-all ${
                                                        isActive
                                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                            : sitio.activa
                                                              ? 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-700 dark:hover:border-gray-600'
                                                              : 'border-gray-200 bg-gray-50 opacity-50 dark:border-gray-700 dark:bg-gray-800'
                                                    }`}
                                                >
                                                    <MapPin
                                                        className={`mt-0.5 h-5 w-5 ${
                                                            isActive
                                                                ? 'text-blue-600 dark:text-blue-400'
                                                                : 'text-gray-400'
                                                        }`}
                                                    />
                                                    <div className="flex-1">
                                                        <div className="font-medium text-gray-900 dark:text-gray-100">
                                                            {sitio.nombre}
                                                        </div>
                                                        <div className="mt-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                                            <span>{sitio.dispositivos_count || 0}</span>
                                                            <span>dispositivo{(sitio.dispositivos_count || 0) !== 1 ? 's' : ''}</span>
                                                        </div>
                                                        {!sitio.activa && (
                                                            <div className="mt-1 text-xs text-red-500">
                                                                Inactivo
                                                            </div>
                                                        )}
                                                    </div>
                                                    {isActive && (
                                                        <Check className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </Card>
                        )}

                        {organizacionSeleccionadaObj && sitiosDisponibles.length === 0 && !mostrarFormularioSitio && (
                            <Card className="w-full border-none shadow-none">
                                <div className="p-6">
                                    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
                                        <p className="mb-3 text-sm text-yellow-800 dark:text-yellow-200">
                                            Esta organización no tiene sitios. Crea un sitio primero.
                                        </p>
                                        <Button
                                            onClick={() => setMostrarFormularioSitio(true)}
                                            variant="outline"
                                            size="sm"
                                        >
                                            <Plus className="mr-2 h-4 w-4" />
                                            Crear Sitio
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        )}

                        {/* Formulario de creación de sitio */}
                        {organizacionSeleccionadaObj && mostrarFormularioSitio && (
                            <Card className="w-full border-none shadow-none">
                                <div className="p-6">
                                    <div className="mb-4 flex items-center justify-between">
                                        <div className="flex-1">
                                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                                Crear Nuevo Sitio
                                            </h2>
                                            {organizacionSeleccionadaObj && (
                                                <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Building2 className="h-4 w-4" />
                                                    <span>Organización: {organizacionSeleccionadaObj.nombre}</span>
                                                </div>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => {
                                                setMostrarFormularioSitio(false);
                                                formSitio.reset();
                                                setCodigoSitioEditadoManualmente(false);
                                            }}
                                            className="rounded p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>
                                    <form onSubmit={crearSitio} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="sitio-nombre">
                                                Nombre <span className="text-red-500">*</span>
                                            </Label>
                                            <Input
                                                id="sitio-nombre"
                                                type="text"
                                                value={formSitio.data.nombre}
                                                onChange={(e) => handleNombreSitioChange(e.target.value)}
                                                placeholder="Nave Industrial 1"
                                                required
                                                aria-invalid={formSitio.errors.nombre ? 'true' : 'false'}
                                            />
                                            {formSitio.errors.nombre && (
                                                <p className="text-sm text-red-600" role="alert">
                                                    {formSitio.errors.nombre}
                                                </p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="sitio-codigo">
                                                Código <span className="text-red-500">*</span>
                                            </Label>
                                            <Input
                                                id="sitio-codigo"
                                                type="text"
                                                value={formSitio.data.codigo}
                                                onChange={(e) => handleCodigoSitioChange(e.target.value)}
                                                placeholder="Se generará automáticamente"
                                                required
                                                aria-invalid={formSitio.errors.codigo ? 'true' : 'false'}
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Código único para identificar el sitio (se genera automáticamente, puedes editarlo)
                                            </p>
                                            {formSitio.errors.codigo && (
                                                <p className="text-sm text-red-600" role="alert">
                                                    {formSitio.errors.codigo}
                                                </p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="sitio-ubicacion">Ubicación</Label>
                                            <Input
                                                id="sitio-ubicacion"
                                                type="text"
                                                value={formSitio.data.ubicacion}
                                                onChange={(e) => formSitio.setData('ubicacion', e.target.value)}
                                                placeholder="Calle Principal 123, Ciudad"
                                                aria-invalid={formSitio.errors.ubicacion ? 'true' : 'false'}
                                            />
                                            {formSitio.errors.ubicacion && (
                                                <p className="text-sm text-red-600" role="alert">
                                                    {formSitio.errors.ubicacion}
                                                </p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="sitio-descripcion">Descripción</Label>
                                            <Textarea
                                                id="sitio-descripcion"
                                                value={formSitio.data.descripcion}
                                                onChange={(e) => formSitio.setData('descripcion', e.target.value)}
                                                rows={3}
                                                placeholder="Descripción del sitio..."
                                                aria-invalid={formSitio.errors.descripcion ? 'true' : 'false'}
                                            />
                                            {formSitio.errors.descripcion && (
                                                <p className="text-sm text-red-600" role="alert">
                                                    {formSitio.errors.descripcion}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                id="sitio-activa"
                                                checked={formSitio.data.activa}
                                                onChange={(e) => formSitio.setData('activa', e.target.checked)}
                                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <Label htmlFor="sitio-activa" className="text-sm font-normal">
                                                Sitio activo
                                            </Label>
                                        </div>

                                        <div className="flex gap-3">
                                            <Button
                                                type="submit"
                                                disabled={formSitio.processing}
                                                className="flex-1"
                                            >
                                                {formSitio.processing ? 'Creando...' : 'Crear Sitio'}
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => {
                                                    setMostrarFormularioSitio(false);
                                                    formSitio.reset();
                                                    setCodigoSitioEditadoManualmente(false);
                                                }}
                                            >
                                                Cancelar
                                            </Button>
                                        </div>
                                    </form>
                                </div>
                            </Card>
                        )}

                        {/* Formulario de creación de organización */}
                        {mostrarFormulario && (
                            <Card className="w-full border-none shadow-none">
                                <div className="p-6">
                                    <div className="mb-4 flex items-center justify-between">
                                        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                            Crear Nueva Organización
                                        </h2>
                                        <button
                                            onClick={() => {
                                                setMostrarFormulario(false);
                                                formOrganizacion.reset();
                                                setCodigoEditadoManualmente(false);
                                            }}
                                            className="rounded p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>
                                    <form onSubmit={crearOrganizacion} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="nombre">
                                                Nombre <span className="text-red-500">*</span>
                                            </Label>
                                            <Input
                                                id="nombre"
                                                type="text"
                                                value={formOrganizacion.data.nombre}
                                                onChange={(e) => handleNombreChange(e.target.value)}
                                                placeholder="Mi Empresa"
                                                required
                                                aria-invalid={formOrganizacion.errors.nombre ? 'true' : 'false'}
                                            />
                                            {formOrganizacion.errors.nombre && (
                                                <p className="text-sm text-red-600" role="alert">
                                                    {formOrganizacion.errors.nombre}
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
                                                value={formOrganizacion.data.codigo}
                                                onChange={(e) => handleCodigoChange(e.target.value)}
                                                placeholder="Se generará automáticamente"
                                                required
                                                aria-invalid={formOrganizacion.errors.codigo ? 'true' : 'false'}
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Código único para identificar la organización (se genera automáticamente, puedes editarlo)
                                            </p>
                                            {formOrganizacion.errors.codigo && (
                                                <p className="text-sm text-red-600" role="alert">
                                                    {formOrganizacion.errors.codigo}
                                                </p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="descripcion">Descripción</Label>
                                            <Textarea
                                                id="descripcion"
                                                value={formOrganizacion.data.descripcion}
                                                onChange={(e) => formOrganizacion.setData('descripcion', e.target.value)}
                                                rows={3}
                                                placeholder="Descripción de la organización..."
                                                aria-invalid={formOrganizacion.errors.descripcion ? 'true' : 'false'}
                                            />
                                            {formOrganizacion.errors.descripcion && (
                                                <p className="text-sm text-red-600" role="alert">
                                                    {formOrganizacion.errors.descripcion}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex gap-3">
                                            <Button
                                                type="submit"
                                                disabled={formOrganizacion.processing}
                                                className="flex-1"
                                            >
                                                {formOrganizacion.processing ? 'Creando...' : 'Crear Organización'}
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => {
                                                    setMostrarFormulario(false);
                                                    formOrganizacion.reset();
                                                    setCodigoEditadoManualmente(false);
                                                }}
                                            >
                                                Cancelar
                                            </Button>
                                        </div>
                                    </form>
                                </div>
                            </Card>
                        )}

                        {/* Botón de acción */}
                        <div className="flex gap-3">
                            <Button
                                onClick={seleccionarContexto}
                                disabled={!puedeContinuar || procesando}
                                className="flex-1"
                                size="lg"
                            >
                                {procesando ? 'Procesando...' : 'Continuar'}
                            </Button>
                            {!mostrarFormulario && (
                                <Button
                                    onClick={() => setMostrarFormulario(true)}
                                    variant="outline"
                                    size="lg"
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Nueva Organización
                                </Button>
                            )}
                        </div>
                    </>
                )}
            </div>
        </AuthSplitLayout>
    );
}

