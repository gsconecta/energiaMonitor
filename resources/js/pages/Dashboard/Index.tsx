import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { Activity, Zap, TrendingUp, Battery, Calendar, Building2, MapPin, RefreshCw, Wifi, Clock, Gauge } from 'lucide-react';
import { useState } from 'react';
import BalanceEnergeticoChart from '@/components/BalanceEnergeticoChart';

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
}

interface Props {
    dispositivo?: Dispositivo;
    dispositivos: Dispositivo[];
    metricas?: Metricas;
    datos_grafica?: DatosGrafica[];
    periodo: string;
    sinDispositivos: boolean;
}

export default function Dashboard({
    dispositivo,
    dispositivos,
    metricas,
    datos_grafica,
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

                <div className="flex flex-col gap-3 sm:gap-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex-1">
                            <p className="mt-1 text-xs text-gray-600 sm:text-sm dark:text-gray-400">
                                {dispositivo?.sitio.nombre} - {dispositivo?.nombre}
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="relative flex h-3 w-3">
                                <span
                                    className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                                        metricas?.estado_conexion === 'online'
                                            ? 'bg-green-400'
                                            : 'bg-red-400'
                                    }`}
                                />
                                <span
                                    className={`relative inline-flex h-3 w-3 rounded-full ${
                                        metricas?.estado_conexion === 'online'
                                            ? 'bg-green-500'
                                            : 'bg-red-500'
                                    }`}
                                />
                            </div>
                            <span
                                className={`text-xs font-medium sm:text-sm ${
                                    metricas?.estado_conexion === 'online'
                                        ? 'text-green-600 dark:text-green-400'
                                        : 'text-red-600 dark:text-red-400'
                                }`}
                            >
                                {metricas?.estado_conexion === 'online' ? 'En línea' : 'Desconectado'}
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                        <select
                            value={dispositivo?.id || ''}
                            onChange={(e) => {
                                if (e.target.value) {
                                    handleDispositivoChange(e.target.value);
                                }
                            }}
                            className="w-full rounded-md border-gray-300 p-3 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:w-auto dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                        >
                            {dispositivos.length === 0 ? (
                                <option value="">No hay dispositivos</option>
                            ) : (
                                dispositivos.map((disp) => (
                                    <option key={disp.id} value={disp.id}>
                                        {disp.nombre}
                                    </option>
                                ))
                            )}
                        </select>

                        <div className="grid grid-cols-4 gap-1 rounded-md shadow-sm sm:inline-flex" role="group">
                            {['hoy', 'ayer', 'semana', 'mes'].map((p) => (
                                <button
                                    key={p}
                                    onClick={() => handlePeriodoChange(p)}
                                    className={`px-3 py-2 text-xs font-medium sm:px-4 sm:text-sm ${
                                        periodo === p
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
                            className={`inline-flex items-center gap-2 rounded-md border px-4 py-2 text-xs font-medium shadow-sm sm:text-sm ${
                                periodo === 'personalizado' || mostrarRangoPersonalizado
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

                <div className="grid w-full grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                    <MetricCard
                        icon={<Zap className="h-5 w-5 sm:h-6 sm:w-6" />}
                        title="Potencia Actual"
                        value={`${metricas?.potencia_actual_kw || 0} kW`}
                        color="blue"
                    />
                    <MetricCard
                        icon={<TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />}
                        title="Potencia Máxima"
                        value={`${metricas?.potencia_maxima_kw || 0} kW`}
                        color="green"
                    />
                    <MetricCard
                        icon={<Battery className="h-5 w-5 sm:h-6 sm:w-6" />}
                        title="Energía Total"
                        value={`${metricas?.energia_total_kwh || 0} kWh`}
                        color="yellow"
                    />
                    <MetricCard
                        icon={<Activity className="h-5 w-5 sm:h-6 sm:w-6" />}
                        title="Voltaje Promedio"
                        value={`${metricas?.voltaje_promedio || 0} V`}
                        color="purple"
                    />
                </div>

                <div className="grid w-full grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                    <MetricCard
                        icon={<Gauge className="h-5 w-5 sm:h-6 sm:w-6" />}
                        title="Factor de Potencia"
                        value={(metricas?.factor_potencia_promedio || 0).toFixed(2)}
                        color="indigo"
                    />
                    <MetricCard
                        icon={<Battery className="h-5 w-5 sm:h-6 sm:w-6" />}
                        title="Energía Retornada"
                        value={`${metricas?.energia_retornada_kwh || 0} kWh`}
                        color="emerald"
                    />
                    <MetricCard
                        icon={<Wifi className="h-5 w-5 sm:h-6 sm:w-6" />}
                        title="WiFi"
                        value={
                            metricas?.wifi_conectado
                                ? metricas.wifi_rssi
                                    ? `${metricas.wifi_rssi} dBm`
                                    : 'Conectado'
                                : 'Desconectado'
                        }
                        color={metricas?.wifi_conectado ? 'green' : 'red'}
                    />
                    <MetricCard
                        icon={<Clock className="h-5 w-5 sm:h-6 sm:w-6" />}
                        title="Uptime"
                        value={
                            metricas?.uptime_segundos
                                ? `${Math.floor((metricas.uptime_segundos || 0) / 3600)}h ${Math.floor(((metricas.uptime_segundos || 0) % 3600) / 60)}m`
                                : 'N/A'
                        }
                        color="slate"
                    />
                </div>

                {/* Métricas de Consumo y Balance Energético */}
                {(metricas?.consumo_casa_kwh !== undefined || metricas?.generacion_fotovoltaica_kwh !== undefined) && (
                    <div className="grid w-full grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                        <MetricCard
                            icon={<Zap className="h-5 w-5 sm:h-6 sm:w-6" />}
                            title="Consumo Casa (promedio)"
                            value={`${metricas?.consumo_casa_kwh || 0} kW`}
                            color="orange"
                        />
                        <MetricCard
                            icon={<TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />}
                            title="Generación FV (promedio)"
                            value={`${metricas?.generacion_fotovoltaica_kwh || 0} kW`}
                            color="yellow"
                        />
                        <MetricCard
                            icon={
                                (metricas?.exportacion_neta_kwh || 0) >= 0 ? (
                                    <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />
                                ) : (
                                    <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 rotate-180" />
                                )
                            }
                            title={metricas?.exportacion_neta_kwh && metricas.exportacion_neta_kwh >= 0 ? 'Exportación Neta (promedio)' : 'Importación Neta (promedio)'}
                            value={`${Math.abs(metricas?.exportacion_neta_kwh || 0)} kW`}
                            color={metricas?.exportacion_neta_kwh && metricas.exportacion_neta_kwh >= 0 ? 'blue' : 'red'}
                        />
                        {metricas?.carga_baterias_kwh && metricas.carga_baterias_kwh > 0 && (
                            <MetricCard
                                icon={<Battery className="h-5 w-5 sm:h-6 sm:w-6" />}
                                title="Carga Baterías (promedio)"
                                value={`${metricas.carga_baterias_kwh} kW`}
                                color="purple"
                            />
                        )}
                    </div>
                )}

                {(metricas?.importacion_red_kwh !== undefined || metricas?.exportacion_red_kwh !== undefined) && (
                    <div className="grid w-full grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-2">
                        {metricas?.importacion_red_kwh && metricas.importacion_red_kwh > 0 && (
                            <MetricCard
                                icon={<TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 rotate-180" />}
                                title="Importación Red (promedio)"
                                value={`${metricas.importacion_red_kwh} kW`}
                                color="red"
                            />
                        )}
                        {metricas?.exportacion_red_kwh && metricas.exportacion_red_kwh > 0 && (
                            <MetricCard
                                icon={<TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />}
                                title="Exportación Red (promedio)"
                                value={`${metricas.exportacion_red_kwh} kW`}
                                color="green"
                            />
                        )}
                    </div>
                )}

                {/* Gráfica de Balance Energético */}
                {datos_grafica && datos_grafica.length > 0 && (
                    <div className="w-full">
                        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                            Balance Energético
                        </h2>
                        <BalanceEnergeticoChart datos={datos_grafica} />
                    </div>
                )}

            </div>
        </AppLayout>
    );
}

interface MetricCardProps {
    icon: React.ReactNode;
    title: string;
    value: string;
    color: 'blue' | 'green' | 'yellow' | 'purple' | 'indigo' | 'emerald' | 'red' | 'slate';
}

function MetricCard({ icon, title, value, color }: MetricCardProps) {
    const colorClasses = {
        blue: 'bg-blue-500',
        green: 'bg-green-500',
        yellow: 'bg-yellow-500',
        purple: 'bg-purple-500',
        indigo: 'bg-indigo-500',
        emerald: 'bg-emerald-500',
        red: 'bg-red-500',
        slate: 'bg-slate-500',
    };

    return (
        <div className="flex min-w-0 items-center rounded-xl border border-sidebar-border/70 bg-white p-3 shadow-sm transition-shadow hover:shadow-md sm:p-4 lg:p-6 dark:border-sidebar-border dark:bg-gray-800">
            <div className={`flex-shrink-0 rounded-lg p-2 sm:p-3 ${colorClasses[color]} shadow-sm`}>
                <div className="text-white">{icon}</div>
            </div>
            <div className="ml-3 min-w-0 flex-1 sm:ml-5">
                <p className="truncate text-xs font-medium text-gray-500 sm:text-sm dark:text-gray-400">{title}</p>
                <p className="mt-1 truncate text-lg font-semibold text-gray-900 sm:text-xl lg:text-2xl dark:text-gray-100">
                    {value}
                </p>
            </div>
        </div>
    );
}
