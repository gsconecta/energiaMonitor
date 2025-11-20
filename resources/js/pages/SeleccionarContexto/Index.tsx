import AuthSplitLayout from '@/layouts/auth/auth-split-layout';
import { Head, router, usePage } from '@inertiajs/react';
import { Building2, MapPin, Check, Plus } from 'lucide-react';
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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

    const puedeContinuar = organizacionSeleccionada !== null && sitioSeleccionado !== null;

    return (
        <AuthSplitLayout
            title={`Hola, ${auth.user.name}`}
            description="Selecciona una organización y sitio para comenzar"
        >
            <Head title="Seleccionar Contexto" />

            <div className="flex flex-col gap-4">

                {organizaciones.length === 0 ? (
                    <Card className="w-full">
                        <div className="p-6 text-center">
                            <Building2 className="mx-auto h-12 w-12 text-gray-400" />
                            <h2 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                                No tienes organizaciones
                            </h2>
                            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                Crea una organización para comenzar
                            </p>
                            <Button
                                onClick={() => router.visit('/organizaciones/create')}
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
                        <Card>
                            <div className="p-6">
                                <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                                    Organización
                                </h2>
                                <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
                                    {organizaciones.map((organizacion) => {
                                        const isActive = organizacionSeleccionada === organizacion.id;
                                        return (
                                            <button
                                                key={organizacion.id}
                                                onClick={() => {
                                                    setOrganizacionSeleccionada(organizacion.id);
                                                    setSitioSeleccionado(null); // Reset sitio cuando cambia organización
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
                                                        {organizacion.codigo}
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
                            </div>
                        </Card>

                        {/* Selector de Sitio */}
                        {organizacionSeleccionadaObj && sitiosDisponibles.length > 0 && (
                            <Card>
                                <div className="p-6">
                                    <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                                        Sitio
                                    </h2>
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
                                                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                            {sitio.codigo}
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

                        {organizacionSeleccionadaObj && sitiosDisponibles.length === 0 && (
                            <Card>
                                <div className="p-6">
                                    <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
                                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                            Esta organización no tiene sitios. Crea un sitio primero.
                                        </p>
                                    </div>
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
                            <Button
                                onClick={() => router.visit('/organizaciones/create')}
                                variant="outline"
                                size="lg"
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Nueva Organización
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </AuthSplitLayout>
    );
}

