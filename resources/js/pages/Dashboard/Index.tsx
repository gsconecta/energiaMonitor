import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { Calendar, Building2, MapPin, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import BalanceEnergeticoChart from '@/components/BalanceEnergeticoChart';
import ProduccionFotovoltaicaChart from '@/components/ProduccionFotovoltaicaChart';
import VoltajeRedChart from '@/components/VoltajeRedChart';
import FlujoEnergetico from '@/components/FlujoEnergetico';
import DatosMeteorologicos from '@/components/DatosMeteorologicos';

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
    ultima_actualizacion_human: string;
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
    sitio: {
        id: number;
        nombre: string;
    };
}


interface SharedProps {
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

interface DatosGrafica {
    fecha: string;
    produccion_fotovoltaica_kw: number;
    red_electrica_kw: number;
    consumo_casa_kw: number;
    voltaje_red_electrica: number;
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

interface Props {
    dispositivo?: Dispositivo;
    dispositivos: Dispositivo[];
    metricas?: Metricas;
    datos_grafica?: DatosGrafica[];
    datos_meteorologicos?: DatosMeteorologicos | null;
    periodo: string;
    sinDispositivos: boolean;
}

export default function Dashboard({
    dispositivo,
    dispositivos,
    metricas,
    datos_grafica,
    datos_meteorologicos,
    periodo,
    sinDispositivos,
}: Props) {
    const page = usePage();
    const pageProps = page.props as Partial<SharedProps>;
    const organizacionActual = pageProps.organizacion_actual;
    const sitioActual = pageProps.sitio_actual;
    const [mostrarRangoPersonalizado, setMostrarRangoPersonalizado] = useState(false);
    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState('');


    const handleDispositivoChange = (dispositivoId: string) => {
        const params: any = { dispositivo_id: dispositivoId };

        // Mantener el período actual si existe
        if (periodo) {
            params.periodo = periodo;
        }

        // Si hay rango personalizado, mantener las fechas
        if (mostrarRangoPersonalizado && fechaDesde && fechaHasta) {
            params.periodo = 'personalizado';
            params.fecha_desde = fechaDesde;
            params.fecha_hasta = fechaHasta;
        }

        router.get(dashboard().url, params);
    };

    const handlePeriodoChange = (nuevoPeriodo: string) => {
        if (nuevoPeriodo === 'personalizado') {
            setMostrarRangoPersonalizado(true);
            return;
        }

        setMostrarRangoPersonalizado(false);
        router.get(dashboard().url, {
            dispositivo_id: dispositivo?.id,
            periodo: nuevoPeriodo,
        });
    };

    const handleAplicarRangoPersonalizado = () => {
        if (!fechaDesde || !fechaHasta) {
            alert('Por favor selecciona ambas fechas');
            return;
        }

        if (new Date(fechaDesde) > new Date(fechaHasta)) {
            alert('La fecha de inicio debe ser anterior a la fecha de fin');
            return;
        }

        router.get(dashboard().url, {
            dispositivo_id: dispositivo?.id,
            periodo: 'personalizado',
            fecha_desde: fechaDesde,
            fecha_hasta: fechaHasta,
        });
    };


    if (sinDispositivos) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <Head title="Dashboard" />
                <div className="flex h-full items-center justify-center">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            No hay dispositivos configurados
                        </h2>
                        <p className="mt-2 text-gray-600 dark:text-gray-400">
                            Configura un dispositivo para comenzar a monitorizar
                        </p>
                        {organizacionActual && sitioActual && (
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                {organizacionActual.nombre} - {sitioActual.nombre}
                            </p>
                        )}
                    </div>
                </div>
            </AppLayout>
        );
    }


    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex w-full flex-1 flex-col gap-4 p-2 sm:p-4 lg:p-6">
                {/* Indicador de contexto actual */}
                {organizacionActual && sitioActual && (
                    <div className="flex items-center justify-between rounded-lg border border-sidebar-border/70 bg-white p-3 dark:border-sidebar-border dark:bg-gray-800">
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

                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1">
                        <p className="mt-1 text-xs text-gray-600 sm:text-sm dark:text-gray-400">
                            {dispositivo?.sitio.nombre} - {dispositivo?.nombre}
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative flex h-3 w-3">
                            <span
                                className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${metricas?.estado_conexion === 'online'
                                    ? 'bg-green-400'
                                    : 'bg-red-400'
                                    }`}
                            />
                            <span
                                className={`relative inline-flex h-3 w-3 rounded-full ${metricas?.estado_conexion === 'online'
                                    ? 'bg-green-500'
                                    : 'bg-red-500'
                                    }`}
                            />
                        </div>
                        <span
                            className={`text-xs font-medium sm:text-sm ${metricas?.estado_conexion === 'online'
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                                }`}
                        >
                            {metricas?.estado_conexion === 'online' ? 'En línea' : 'Desconectado'}
                        </span>
                    </div>
                </div>

                {/* Componentes Flujo Energético y Datos Meteorológicos */}
                <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
                    {metricas && (
                        <FlujoEnergetico
                            produccionSolar={metricas.produccion_fotovoltaica_actual_kw || 0}
                            redElectrica={metricas.red_electrica_actual_kw || 0}
                            exportacion={metricas.exportacion_actual_kw || 0}
                            consumoTotal={metricas.consumo_total_actual_kw || 0}
                        />
                    )}
                    {datos_meteorologicos && (
                        <DatosMeteorologicos datos={datos_meteorologicos} />
                    )}
                </div>

                {/* Filtros de período */}
                <div className="flex flex-col gap-3 sm:gap-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                        {dispositivos.length > 1 && (
                            <select
                                value={dispositivo?.id || ''}
                                onChange={(e) => {
                                    if (e.target.value) {
                                        handleDispositivoChange(e.target.value);
                                    }
                                }}
                                className="w-full rounded-md border-gray-300 p-3 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:w-auto dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                            >
                                {dispositivos.map((disp) => (
                                    <option key={disp.id} value={disp.id}>
                                        {disp.nombre}
                                    </option>
                                ))}
                            </select>
                        )}

                        <div className="grid grid-cols-4 gap-1 rounded-md shadow-sm sm:inline-flex" role="group">
                            {['hoy', 'ayer', 'semana', 'mes'].map((p) => (
                                <button
                                    key={p}
                                    onClick={() => handlePeriodoChange(p)}
                                    className={`px-3 py-2 text-xs font-medium sm:px-4 sm:text-sm ${periodo === p
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                                        } border border-gray-200 first:rounded-l-lg last:rounded-r-lg dark:border-gray-600`}
                                >
                                    {p.charAt(0).toUpperCase() + p.slice(1)}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => handlePeriodoChange('personalizado')}
                            className={`inline-flex items-center gap-2 rounded-md border px-4 py-2 text-xs font-medium shadow-sm sm:text-sm ${periodo === 'personalizado' || mostrarRangoPersonalizado
                                ? 'border-blue-600 bg-blue-600 text-white'
                                : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                                }`}
                        >
                            <Calendar className="h-4 w-4" />
                            Personalizado
                        </button>

                        {metricas?.ultima_actualizacion_human && (
                            <span className="text-xs text-gray-500 sm:self-center sm:text-sm dark:text-gray-400">
                                Última actualización: {metricas.ultima_actualizacion_human}
                            </span>
                        )}
                    </div>

                    {mostrarRangoPersonalizado && (
                        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                                <div className="flex-1">
                                    <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                                        Fecha desde
                                    </label>
                                    <input
                                        type="date"
                                        value={fechaDesde}
                                        onChange={(e) => setFechaDesde(e.target.value)}
                                        className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                                        Fecha hasta
                                    </label>
                                    <input
                                        type="date"
                                        value={fechaHasta}
                                        onChange={(e) => setFechaHasta(e.target.value)}
                                        className="w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleAplicarRangoPersonalizado}
                                        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                    >
                                        Aplicar
                                    </button>
                                    <button
                                        onClick={() => setMostrarRangoPersonalizado(false)}
                                        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Gráfica de Balance Energético */}
                {datos_grafica && datos_grafica.length > 0 && (
                    <div className="w-full">
                        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                            Balance Energético
                        </h2>
                        <BalanceEnergeticoChart datos={datos_grafica} />
                    </div>
                )}

                {/* Gráfica de Producción Fotovoltaica */}
                {datos_grafica && datos_grafica.length > 0 && (
                    <div className="w-full">
                        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                            Producción Fotovoltaica
                        </h2>
                        <ProduccionFotovoltaicaChart datos={datos_grafica} />
                    </div>
                )}

                {/* Gráfica de Voltaje de Red */}
                {datos_grafica && datos_grafica.length > 0 && (
                    <div className="w-full">
                        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                            Voltaje de Red Eléctrica
                        </h2>
                        <VoltajeRedChart datos={datos_grafica} />
                    </div>
                )}

            </div>
        </AppLayout>
    );
}
