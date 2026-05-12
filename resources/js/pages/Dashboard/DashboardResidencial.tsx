import BalanceEnergeticoChart from '@/components/BalanceEnergeticoChart';
import DatosMeteorologicos from '@/components/DatosMeteorologicos';
import FlujoEnergetico from '@/components/FlujoEnergetico';
import ProduccionFotovoltaicaChart from '@/components/ProduccionFotovoltaicaChart';
import { Button } from '@/components/ui/button';
import { Link } from '@inertiajs/react';
import { Activity, ArrowRight, CloudSun } from 'lucide-react';

interface VerificacionMeteorologica {
    requiere_configuracion: boolean;
    campos_faltantes: string[];
    sitio_nombre: string | null;
    edit_url: string | null;
}

interface MetricasResidenciales {
    consumo_casa_kwh: number;
    importacion_red_kwh: number;
    produccion_fotovoltaica_actual_kw: number;
    consumo_total_actual_kw: number;
    generacion_fotovoltaica_kwh: number;
    energia_retornada_kwh: number;
    red_electrica_actual_kw: number;
    exportacion_actual_kw: number;
    independencia_energetica_pct: number;
}

interface DatosGraficaResidenciales {
    fecha: string;
    produccion_fotovoltaica_kw: number;
    red_electrica_kw: number;
    fase_1_kw?: number;
    fase_2_kw?: number;
    fase_3_kw?: number;
    consumo_casa_kw: number;
}

interface DatosMeteorologicosResidenciales {
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

interface UltimaLecturaResidencial {
    fecha_lectura_human: string;
    potencia_canal_1_w: number | null;
    potencia_canal_2_w: number | null;
    potencia_canal_3_w: number | null;
    voltaje_canal_1: number | null;
    voltaje_canal_2: number | null;
    voltaje_canal_3: number | null;
    energia_canal_1_kwh: number | null;
    energia_canal_2_kwh: number | null;
    energia_canal_3_kwh: number | null;
}

interface DispositivoResidencial {
    id: number;
    nombre: string;
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
    ultima_lectura?: UltimaLecturaResidencial | null;
}

interface DashboardResidencialProps {
    metricas?: MetricasResidenciales;
    datos_grafica?: DatosGraficaResidenciales[];
    datos_meteorologicos?: DatosMeteorologicosResidenciales | null;
    verificacion_meteorologica?: VerificacionMeteorologica | null;
    dispositivo?: DispositivoResidencial;
    dispositivos?: DispositivoResidencial[];
    periodoLabel?: string;
}

const etiquetasCamposMeteorologicos: Record<string, string> = {
    latitud: 'Latitud',
    longitud: 'Longitud',
    codigo_municipio_aemet: 'Código Municipio AEMET',
};

function WidgetMeteorologicoPendiente({
    verificacion,
}: {
    verificacion?: VerificacionMeteorologica | null;
}) {
    if (!verificacion?.requiere_configuracion || !verificacion.edit_url) {
        return null;
    }

    const camposFaltantes = verificacion.campos_faltantes.map(
        (campo) => etiquetasCamposMeteorologicos[campo] ?? campo,
    );
    const nombreSitio = verificacion.sitio_nombre ?? 'el sitio activo';

    return (
        <div className="mx-auto w-full max-w-[500px] rounded-lg border border-amber-200 bg-white p-6 shadow-sm dark:border-amber-900/70 dark:bg-gray-800">
            <div className="flex min-h-[450px] flex-col items-center justify-center gap-5 text-center">
                <div className="rounded-full bg-amber-100 p-4 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300">
                    <CloudSun className="h-12 w-12" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Faltan datos para mostrar el tiempo
                    </h2>
                    <p className="max-w-sm text-sm text-gray-600 dark:text-gray-400">
                        El sitio {nombreSitio} necesita un código de municipio
                        AEMET para activar el widget de meteo. La latitud y la
                        longitud son opcionales.
                    </p>
                </div>
                {camposFaltantes.length > 0 && (
                    <div className="flex max-w-sm flex-wrap items-center justify-center gap-2">
                        {camposFaltantes.map((campo) => (
                            <span
                                key={campo}
                                className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-100"
                            >
                                {campo}
                            </span>
                        ))}
                    </div>
                )}
                <Button asChild size="sm">
                    <Link href={verificacion.edit_url}>
                        Añadir datos del sitio
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </Button>
            </div>
        </div>
    );
}

export default function DashboardResidencial({
    metricas,
    datos_grafica,
    datos_meteorologicos,
    verificacion_meteorologica,
    dispositivo,
    dispositivos,
    periodoLabel = 'Periodo',
}: DashboardResidencialProps) {
    const independenciaEnergetica =
        metricas?.independencia_energetica_pct ?? 0;

    return (
        <div className="flex w-full flex-col gap-4">
            {/* Fila de KPIs rápidos */}
            <div
                className={`grid gap-4 ${dispositivo?.tiene_fotovoltaica ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5' : 'grid-cols-1 md:grid-cols-2'}`}
            >
                {dispositivo?.tiene_fotovoltaica && (
                    <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Generación Solar
                        </p>
                        <p className="mt-2 text-2xl font-bold text-yellow-500">
                            {metricas?.produccion_fotovoltaica_actual_kw || 0}{' '}
                            kW
                        </p>
                    </div>
                )}
                <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Consumo Casa
                    </p>
                    <p className="mt-2 text-2xl font-bold text-blue-500">
                        {metricas?.consumo_total_actual_kw || 0} kW
                    </p>
                </div>
                {dispositivo?.tiene_fotovoltaica ? (
                    <>
                        <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                Generación Solar ({periodoLabel})
                            </p>
                            <p className="mt-2 text-2xl font-bold text-yellow-500">
                                {metricas?.generacion_fotovoltaica_kwh || 0} kWh
                            </p>
                        </div>
                        <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                Energía Retornada ({periodoLabel})
                            </p>
                            <p className="mt-2 text-2xl font-bold text-purple-500">
                                {metricas?.energia_retornada_kwh || 0} kWh
                            </p>
                        </div>
                        <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                Independencia ({periodoLabel})
                            </p>
                            <p className="mt-2 text-2xl font-bold text-green-500">
                                {independenciaEnergetica.toFixed(1)}%
                            </p>
                        </div>
                    </>
                ) : (
                    <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Consumo de Red ({periodoLabel})
                        </p>
                        <p className="mt-2 text-2xl font-bold text-indigo-500">
                            {metricas?.importacion_red_kwh || 0} kWh
                        </p>
                    </div>
                )}
            </div>

            {/* Componentes Flujo Energético y Datos Meteorológicos */}
            <div
                className={`grid gap-4 ${dispositivo?.tiene_fotovoltaica ? 'sm:grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}
            >
                {metricas && dispositivo?.tiene_fotovoltaica && (
                    <FlujoEnergetico
                        produccionSolar={
                            metricas.produccion_fotovoltaica_actual_kw || 0
                        }
                        redElectrica={metricas.red_electrica_actual_kw || 0}
                        exportacion={metricas.exportacion_actual_kw || 0}
                        consumoTotal={metricas.consumo_total_actual_kw || 0}
                    />
                )}
                {datos_meteorologicos ? (
                    <DatosMeteorologicos datos={datos_meteorologicos} />
                ) : (
                    <WidgetMeteorologicoPendiente
                        verificacion={verificacion_meteorologica}
                    />
                )}
            </div>

            {/* Contenedor de Gráficas */}
            <div
                className={`grid grid-cols-1 gap-4 ${dispositivo?.tiene_fotovoltaica ? 'lg:grid-cols-2 lg:gap-6' : ''}`}
            >
                {datos_grafica && datos_grafica.length > 0 && (
                    <>
                        <div className="w-full rounded-lg border bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                                {dispositivo?.tiene_fotovoltaica
                                    ? 'Balance Energético'
                                    : 'Evolución de Consumo Eléctrico'}
                            </h2>
                            <BalanceEnergeticoChart
                                datos={datos_grafica}
                                tiene_fotovoltaica={
                                    dispositivo?.tiene_fotovoltaica ?? true
                                }
                                num_fases={dispositivo?.num_fases ?? 1}
                                colores_canales={[
                                    dispositivo?.color_canal_1 || null,
                                    dispositivo?.color_canal_2 || null,
                                    dispositivo?.color_canal_3 || null,
                                ]}
                            />
                        </div>
                        {dispositivo?.tiene_fotovoltaica && (
                            <div className="w-full rounded-lg border bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                                <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                                    Producción Fotovoltaica
                                </h2>
                                <ProduccionFotovoltaicaChart
                                    datos={datos_grafica}
                                />
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Contenedor de Canales de Dispositivos del Sitio */}
            {dispositivos && dispositivos.length > 0 && (
                <div className="mt-6 flex flex-col gap-4">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Estado de los Dispositivos del Sitio
                    </h2>
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                        {dispositivos.map((d) => (
                            <div
                                key={d.id}
                                className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                            >
                                <div className="mb-4 flex items-center justify-between border-b pb-2 dark:border-gray-800">
                                    <div>
                                        <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                                            {d.nombre}
                                        </h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            ID: {d.device_id}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span
                                            className={`h-2.5 w-2.5 rounded-full ${d.estado_conexion === 'online' ? 'bg-green-500' : 'bg-red-500'}`}
                                        ></span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {d.estado_conexion === 'online'
                                                ? 'Online'
                                                : 'Offline'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3">
                                    {([1, 2, 3] as const).map((canalNum) => {
                                        if (
                                            d.num_fases &&
                                            canalNum > d.num_fases
                                        )
                                            return null;

                                        const potencia =
                                            d.ultima_lectura?.[
                                                `potencia_canal_${canalNum}_w`
                                            ];
                                        const voltaje =
                                            d.ultima_lectura?.[
                                                `voltaje_canal_${canalNum}`
                                            ];
                                        const energia =
                                            d.ultima_lectura?.[
                                                `energia_canal_${canalNum}_kwh`
                                            ];
                                        const nombreCanal =
                                            d[`nombre_canal_${canalNum}`] ||
                                            `Canal ${canalNum}`;
                                        const tipoCanal =
                                            d[`tipo_canal_${canalNum}`];

                                        // No mostrar canales que no tengan nombre ni funcionalidad configurada, a menos que sí tengan lectura de potencia
                                        if (
                                            !d[`nombre_canal_${canalNum}`] &&
                                            !d[`tipo_canal_${canalNum}`] &&
                                            potencia == null
                                        )
                                            return null;

                                        return (
                                            <div
                                                key={canalNum}
                                                className="flex flex-col gap-1 rounded-md bg-gray-50 p-3 dark:bg-gray-800/50"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                                                        <Activity className="h-3.5 w-3.5 text-blue-500" />
                                                        {nombreCanal}
                                                        {tipoCanal && (
                                                            <span className="ml-1 rounded bg-gray-200 px-1.5 py-0.5 text-[10px] tracking-wider text-gray-600 uppercase dark:bg-gray-700 dark:text-gray-400">
                                                                {tipoCanal ===
                                                                'fotovoltaica'
                                                                    ? 'Solar'
                                                                    : 'Red'}
                                                            </span>
                                                        )}
                                                    </span>
                                                    <span
                                                        className={`text-sm font-bold ${potencia != null && potencia < 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-gray-100'}`}
                                                    >
                                                        {potencia != null
                                                            ? `${potencia} W`
                                                            : '-- W'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                                    <span>
                                                        {voltaje != null
                                                            ? `${voltaje} V`
                                                            : '-- V'}
                                                    </span>
                                                    <span>
                                                        {energia != null
                                                            ? `${energia} kWh`
                                                            : '-- kWh'}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {(!d.ultima_lectura ||
                                        typeof d.ultima_lectura ===
                                            'undefined') && (
                                        <div className="py-2 text-center text-sm text-gray-500 dark:text-gray-400">
                                            Sin lecturas recientes
                                        </div>
                                    )}
                                </div>

                                {d.ultima_lectura && (
                                    <p className="mt-4 text-right text-[10px] text-gray-400 dark:text-gray-500">
                                        Última lectura:{' '}
                                        {d.ultima_lectura.fecha_lectura_human}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
