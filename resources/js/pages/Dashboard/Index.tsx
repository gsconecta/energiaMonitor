import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { useEcho } from '@laravel/echo-react';
import { Building2, MapPin, RefreshCw, Zap } from 'lucide-react';
import { useState } from 'react';
import DashboardIndustrial from './DashboardIndustrial';
import DashboardResidencial from './DashboardResidencial';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: dashboard().url,
    },
];

interface Metricas {
    potencia_actual_kw: number;
    potencia_maxima_kw: number;
    potencia_promedio_kw: number;
    energia_total_kwh: number;
    energia_retornada_kwh: number;
    energia_canal_1_kwh: number;
    energia_canal_2_kwh: number;
    energia_canal_3_kwh: number;
    voltaje_promedio: number;
    corriente_promedio_1: number;
    corriente_promedio_2: number;
    corriente_promedio_3: number;
    corriente_neutro_promedio: number;
    factor_potencia_promedio: number;
    voltaje_actual_1: number;
    voltaje_actual_2: number;
    voltaje_actual_3: number;
    corriente_actual_1: number;
    corriente_actual_2: number;
    corriente_actual_3: number;
    factor_potencia_1: number;
    factor_potencia_2: number;
    factor_potencia_3: number;
    q1_var_actual: number;
    q2_var_actual: number;
    q3_var_actual: number;
    q_total_var_actual: number;
    consumo_casa_kwh: number;
    exportacion_neta_kwh: number;
    generacion_fotovoltaica_kwh: number;
    carga_baterias_kwh: number;
    importacion_red_kwh: number;
    exportacion_red_kwh: number;
    estado_conexion: 'online' | 'offline';
    wifi_conectado: boolean;
    wifi_rssi: number | null;
    uptime_segundos: number | null;
    ultima_actualizacion_human: string | null;
    numero_lecturas: number;
    produccion_fotovoltaica_actual_kw: number;
    red_electrica_actual_kw: number;
    exportacion_actual_kw: number;
    consumo_total_actual_kw: number;
}

interface Dispositivo {
    id: number;
    nombre: string;
    tipo: string;
    device_id: string;
    num_fases: number | null;
    nombre_canal_1: string | null;
    nombre_canal_2: string | null;
    nombre_canal_3: string | null;
    tipo_canal_1: string | null;
    tipo_canal_2: string | null;
    tipo_canal_3: string | null;
    color_canal_1: string | null;
    color_canal_2: string | null;
    color_canal_3: string | null;
    tiene_fotovoltaica?: boolean;
    estado_conexion?: 'online' | 'offline';
    sitio: {
        id: number;
        nombre: string;
    };
    ultima_lectura?: {
        fecha_lectura: string;
        fecha_lectura_human: string;
        potencia_total_w: number | null;
        potencia_canal_1_w: number | null;
        potencia_canal_2_w: number | null;
        potencia_canal_3_w: number | null;
        voltaje_canal_1: number | null;
        voltaje_canal_2: number | null;
        voltaje_canal_3: number | null;
        energia_canal_1_kwh: number | null;
        energia_canal_2_kwh: number | null;
        energia_canal_3_kwh: number | null;
        corriente_canal_1: number | null;
        corriente_canal_2: number | null;
        corriente_canal_3: number | null;
    } | null;
}

interface SharedProps {
    organizacion_actual?: {
        id: number;
        nombre: string;
        codigo: string;
        tipo_perfil?: string;
    };
    sitio_actual?: {
        id: number;
        nombre: string;
        codigo: string;
    };
}

interface DatosGrafica {
    fecha: string;
    produccion_fotovoltaica_kw: number;
    red_electrica_kw: number;
    consumo_casa_kw: number;
    voltaje_red_electrica: number;
    fase_1_kw?: number;
    fase_2_kw?: number;
    fase_3_kw?: number;
    q1_var?: number;
    q2_var?: number;
    q3_var?: number;
    q_total_var?: number;
}

interface DatosMeteorologicos {
    temperatura_actual: number | null;
    temperatura_maxima: number | null;
    temperatura_minima: number | null;
    viento_velocidad: number | null;
    viento_direccion: string | null;
    radiacion_solar: number | null;
    salida_sol: string | null;
    puesta_sol: string | null;
    estado_cielo: string | null;
    estado_cielo_codigo: string | null;
    fecha_actualizacion: string | null;
}

interface VerificacionMeteorologica {
    perfil_residencial: boolean;
    requiere_configuracion: boolean;
    campos_faltantes: string[];
    sitio_id: number | null;
    sitio_nombre: string | null;
    edit_url: string | null;
}

interface Props {
    dispositivo?: Dispositivo;
    dispositivos: Dispositivo[];
    metricas?: Metricas;
    datos_grafica?: DatosGrafica[];
    datos_meteorologicos?: DatosMeteorologicos | null;
    verificacion_meteorologica?: VerificacionMeteorologica | null;
    periodo: string;
    sinDispositivos: boolean;
}

type DashboardLecturaActualizadaEvent = {
    lectura_id: number;
    dispositivo_id: number;
    sitio_id: number;
    fecha_lectura: string;
};

function ConnectionStatusIndicator({
    estadoConexion,
    ultimaActualizacionHuman,
    onLecturaManual,
    puedeRealizarLecturaManual = false,
    sincronizandoLecturaManual = false,
}: {
    estadoConexion?: 'online' | 'offline';
    ultimaActualizacionHuman?: string | null;
    onLecturaManual?: () => void;
    puedeRealizarLecturaManual?: boolean;
    sincronizandoLecturaManual?: boolean;
}) {
    const isOnline = estadoConexion === 'online';

    return (
        <div className="inline-flex items-center gap-2">
            <div className="relative flex h-3 w-3">
                <span
                    className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                        isOnline ? 'bg-green-400' : 'bg-red-400'
                    }`}
                />
                <span
                    className={`relative inline-flex h-3 w-3 rounded-full ${
                        isOnline ? 'bg-green-500' : 'bg-red-500'
                    }`}
                />
            </div>
            <span
                className={`text-xs font-medium sm:text-sm ${
                    isOnline
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                }`}
            >
                {isOnline ? 'En línea' : 'Desconectado'}
            </span>
            {ultimaActualizacionHuman && (
                <span className="text-xs text-gray-500 sm:text-sm dark:text-gray-400">
                    · {ultimaActualizacionHuman}
                </span>
            )}
            {puedeRealizarLecturaManual && (
                <button
                    type="button"
                    onClick={onLecturaManual}
                    disabled={sincronizandoLecturaManual}
                    className={`rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                        sincronizandoLecturaManual
                            ? 'cursor-not-allowed text-gray-400'
                            : 'text-indigo-600'
                    }`}
                    title="Realizar lectura manual"
                    aria-label="Realizar lectura manual"
                >
                    <RefreshCw
                        className={`h-3.5 w-3.5 ${
                            sincronizandoLecturaManual ? 'animate-spin' : ''
                        }`}
                    />
                </button>
            )}
        </div>
    );
}

export default function Dashboard({
    dispositivo,
    dispositivos,
    metricas,
    datos_grafica,
    datos_meteorologicos,
    verificacion_meteorologica,
    periodo,
    sinDispositivos,
}: Props) {
    const page = usePage();
    const pageProps = page.props as Partial<SharedProps>;
    const organizacionActual = pageProps.organizacion_actual;
    const sitioActual = pageProps.sitio_actual;
    const [sincronizandoLecturaManual, setSincronizandoLecturaManual] =
        useState(false);

    // Determinar el perfil de la organización activa
    const tipoPerfil = organizacionActual?.tipo_perfil || 'industrial';
    const esResidencial = tipoPerfil === 'residencial';
    const dashboardRealtimeChannel = sitioActual
        ? `dashboard.site.${sitioActual.id}`
        : 'dashboard.site.none';

    useEcho<DashboardLecturaActualizadaEvent>(
        dashboardRealtimeChannel,
        '.lectura.actualizada',
        (event) => {
            if (!sitioActual || event.sitio_id !== sitioActual.id) {
                return;
            }

            router.reload({
                only: [
                    'dispositivo',
                    'dispositivos',
                    'metricas',
                    'datos_grafica',
                    'datos_meteorologicos',
                    'verificacion_meteorologica',
                    'sinDispositivos',
                ],
            });
        },
        [sitioActual?.id],
    );

    const handleDispositivoChange = (dispositivoId: string) => {
        const params: Record<string, string> = {
            dispositivo_id: dispositivoId,
        };

        // Mantener el período actual si existe
        if (periodo) {
            params.periodo = periodo;
        }

        router.get(dashboard().url, params);
    };

    const handleLecturaManual = () => {
        if (!dispositivo || sincronizandoLecturaManual) {
            return;
        }

        setSincronizandoLecturaManual(true);
        router.post(
            `/dispositivos/${dispositivo.id}/sincronizar`,
            {},
            {
                preserveScroll: true,
                onFinish: () => {
                    setSincronizandoLecturaManual(false);
                },
            },
        );
    };

    if (sinDispositivos) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title="Dashboard" />
                <div className="flex h-full items-center justify-center">
                    <div className="w-full max-w-2xl space-y-4 px-4">
                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                                No hay dispositivos configurados
                            </h2>
                            <p className="mt-2 text-gray-600 dark:text-gray-400">
                                Configura un dispositivo para comenzar a
                                monitorizar
                            </p>
                            {organizacionActual && sitioActual && (
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    {organizacionActual.nombre} -{' '}
                                    {sitioActual.nombre}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex w-full flex-1 flex-col gap-1 p-2 sm:p-1">
                {/* Indicador de contexto actual */}
                {organizacionActual && sitioActual && (
                    <div className="flex items-center justify-between p-1">
                        <div className="flex items-center gap-3">
                            <Building2 className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {organizacionActual.nombre}
                            </span>
                            <span className="text-gray-400">/</span>
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                {sitioActual.nombre}
                            </span>
                            <ConnectionStatusIndicator
                                estadoConexion={metricas?.estado_conexion}
                                ultimaActualizacionHuman={
                                    metricas?.ultima_actualizacion_human
                                }
                                onLecturaManual={handleLecturaManual}
                                puedeRealizarLecturaManual={Boolean(
                                    dispositivo,
                                )}
                                sincronizandoLecturaManual={
                                    sincronizandoLecturaManual
                                }
                            />
                        </div>
                        <button
                            onClick={() => {
                                router.visit('/seleccionar-contexto');
                            }}
                            className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                            title="Cambiar contexto"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Cambiar
                        </button>
                    </div>
                )}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="mx-2 mb-2 flex-1 space-y-0">
                        {/* Selector de Dispositivos */}
                        {dispositivos &&
                            dispositivos.length > 1 &&
                            dispositivo && (
                                <div className="flex items-center gap-2">
                                    <Select
                                        value={dispositivo.id.toString()}
                                        onValueChange={handleDispositivoChange}
                                    >
                                        <SelectTrigger className="h-9 w-[250px]">
                                            <div className="flex items-center gap-2">
                                                <Zap className="h-4 w-4 text-blue-500" />
                                                <SelectValue placeholder="Seleccionar dispositivo..." />
                                            </div>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {dispositivos.map((d) => (
                                                <SelectItem
                                                    key={d.id}
                                                    value={d.id.toString()}
                                                >
                                                    {d.nombre}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                    </div>
                </div>

                {/* Renderizado Condicional del Dashboard según Perfil */}
                <div className="mt-2 sm:mt-0">
                    {esResidencial ? (
                        <DashboardResidencial
                            metricas={metricas}
                            datos_grafica={datos_grafica}
                            datos_meteorologicos={datos_meteorologicos}
                            verificacion_meteorologica={
                                verificacion_meteorologica
                            }
                            dispositivo={dispositivo}
                            dispositivos={dispositivos}
                        />
                    ) : (
                        <DashboardIndustrial
                            metricas={metricas}
                            datos_grafica={datos_grafica}
                            dispositivo={dispositivo}
                        />
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
