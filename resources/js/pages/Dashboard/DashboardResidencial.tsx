import BalanceEnergeticoChart from '@/components/BalanceEnergeticoChart';
import DatosMeteorologicos from '@/components/DatosMeteorologicos';
import FlujoEnergetico from '@/components/FlujoEnergetico';
import ProduccionFotovoltaicaChart from '@/components/ProduccionFotovoltaicaChart';
import { Button } from '@/components/ui/button';
import { Link } from '@inertiajs/react';
import {
    Activity,
    ArrowRight,
    CloudSun,
    HandCoins,
    Leaf,
    Sun,
    Zap,
    type LucideIcon,
} from 'lucide-react';

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
    periodoLabel?: string;
}

const etiquetasCamposMeteorologicos: Record<string, string> = {
    latitud: 'Latitud',
    longitud: 'Longitud',
    codigo_municipio_aemet: 'Código Municipio AEMET',
};

const metricToneClasses = {
    solar: {
        icon: 'text-yellow-500 dark:text-yellow-300',
        value: 'text-yellow-500 dark:text-yellow-300',
    },
    home: {
        icon: 'text-gray-900 dark:text-gray-100',
        value: 'text-gray-900 dark:text-gray-100',
    },
    export: {
        icon: 'text-green-500 dark:text-green-300',
        value: 'text-green-500 dark:text-green-300',
    },
    independence: {
        icon: 'text-green-500 dark:text-green-300',
        value: 'text-green-500 dark:text-green-300',
    },
    grid: {
        icon: 'text-indigo-500 dark:text-indigo-300',
        value: 'text-indigo-500 dark:text-indigo-300',
    },
};

type MetricTone = keyof typeof metricToneClasses;

function formatDashboardNumber(value: number, maximumFractionDigits = 2) {
    return value.toLocaleString('es-ES', { maximumFractionDigits });
}

function MetricCard({
    label,
    value,
    unit,
    icon: Icon,
    imageSrc,
    tone,
}: {
    label: string;
    value: string | number;
    unit: string;
    icon?: LucideIcon;
    imageSrc?: string;
    tone: MetricTone;
}) {
    const classes = metricToneClasses[tone];

    return (
        <div
            className="min-h-[112px] w-full max-w-[170px] p-2"
            aria-label={label}
            title={label}
        >
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
                <span
                    className={`inline-flex shrink-0 items-center justify-center ${classes.icon}`}
                >
                    {imageSrc ? (
                        <img
                            src={imageSrc}
                            alt=""
                            className="h-14 w-14 object-contain"
                            aria-hidden="true"
                        />
                    ) : (
                        Icon && (
                            <Icon className="h-14 w-14" aria-hidden="true" />
                        )
                    )}
                </span>
                <span className="sr-only">{label}</span>
                <p
                    className={`min-w-0 text-3xl font-bold tabular-nums ${classes.value}`}
                >
                    {value}
                    <span className="ml-1 text-base font-semibold text-gray-500 dark:text-gray-400">
                        {unit}
                    </span>
                </p>
            </div>
        </div>
    );
}

function MobileEnergyStat({
    label,
    value,
    unit,
    icon: Icon,
    tone,
}: {
    label: string;
    value: string | number;
    unit: string;
    icon: LucideIcon;
    tone: MetricTone;
}) {
    const classes = metricToneClasses[tone];

    return (
        <div className="rounded-2xl bg-slate-50 p-3 dark:bg-gray-800/70">
            <Icon
                className={`mb-3 h-7 w-7 ${classes.icon}`}
                aria-hidden="true"
            />
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {label}
            </p>
            <p
                className={`mt-1 text-lg font-bold tabular-nums ${classes.value}`}
            >
                {value}
                <span className="ml-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                    {unit}
                </span>
            </p>
        </div>
    );
}

function MobileEnergyOverview({
    metricas,
    tieneFotovoltaica,
    periodoLabel,
    independenciaEnergetica,
}: {
    metricas?: MetricasResidenciales;
    tieneFotovoltaica: boolean;
    periodoLabel: string;
    independenciaEnergetica: number;
}) {
    const consumoActual = metricas?.consumo_total_actual_kw ?? 0;
    const produccionSolar = metricas?.produccion_fotovoltaica_actual_kw ?? 0;
    const exportacion = metricas?.exportacion_actual_kw ?? 0;
    const redElectrica = Math.abs(metricas?.red_electrica_actual_kw ?? 0);
    const periodoMovil = periodoLabel === 'Periodo' ? 'Hoy' : periodoLabel;

    return (
        <section
            className="rounded-[2rem] bg-white p-5 text-gray-950 shadow-sm shadow-slate-200/60 sm:hidden dark:bg-gray-900 dark:text-gray-50 dark:shadow-none"
            aria-label="Resumen de consumo eléctrico"
        >
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                        Consumo ahora
                    </p>
                    <div className="mt-3 flex items-end gap-3">
                        <img
                            src="/house-icon.svg"
                            alt=""
                            className="h-14 w-14 object-contain"
                            aria-hidden="true"
                        />
                        <p className="text-5xl leading-none font-black text-gray-950 tabular-nums dark:text-gray-50">
                            {formatDashboardNumber(consumoActual)}
                            <span className="ml-1 align-baseline text-base font-bold text-gray-500 dark:text-gray-400">
                                kW
                            </span>
                        </p>
                    </div>
                </div>
                <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    {periodoMovil}
                </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
                {tieneFotovoltaica ? (
                    <>
                        <MobileEnergyStat
                            label="Solar"
                            value={formatDashboardNumber(produccionSolar)}
                            unit="kW"
                            icon={Sun}
                            tone="solar"
                        />
                        <MobileEnergyStat
                            label={exportacion > 0 ? 'Exporta' : 'Red'}
                            value={formatDashboardNumber(
                                exportacion > 0 ? exportacion : redElectrica,
                            )}
                            unit="kW"
                            icon={exportacion > 0 ? HandCoins : Zap}
                            tone={exportacion > 0 ? 'export' : 'grid'}
                        />
                        <MobileEnergyStat
                            label="Auto"
                            value={independenciaEnergetica.toFixed(0)}
                            unit="%"
                            icon={Leaf}
                            tone="independence"
                        />
                    </>
                ) : (
                    <>
                        <MobileEnergyStat
                            label="Red"
                            value={formatDashboardNumber(redElectrica)}
                            unit="kW"
                            icon={Zap}
                            tone="grid"
                        />
                        <MobileEnergyStat
                            label="Hoy"
                            value={formatDashboardNumber(
                                metricas?.importacion_red_kwh ?? 0,
                            )}
                            unit="kWh"
                            icon={Activity}
                            tone="home"
                        />
                        <MobileEnergyStat
                            label="Casa"
                            value={formatDashboardNumber(consumoActual)}
                            unit="kW"
                            icon={Zap}
                            tone="home"
                        />
                    </>
                )}
            </div>
        </section>
    );
}

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
        <div className="mobile-app-section mx-auto w-full max-w-[500px] rounded-[1.75rem] bg-white p-4 shadow-sm shadow-slate-200/60 sm:rounded-lg sm:border sm:border-amber-200 sm:p-6 dark:bg-gray-900 dark:shadow-none dark:sm:border-amber-900/70 dark:sm:bg-gray-800">
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-5 text-center sm:min-h-[450px]">
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
    periodoLabel = 'Periodo',
}: DashboardResidencialProps) {
    const independenciaEnergetica = metricas?.independencia_energetica_pct ?? 0;
    const tieneFotovoltaica = dispositivo?.tiene_fotovoltaica ?? false;

    return (
        <div className="-mx-4 flex w-[calc(100%+2rem)] flex-col gap-4 bg-slate-50 px-4 pt-2 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] sm:mx-0 sm:w-full sm:bg-transparent sm:px-0 sm:pt-0 sm:pb-0 dark:bg-gray-950">
            <MobileEnergyOverview
                metricas={metricas}
                tieneFotovoltaica={tieneFotovoltaica}
                periodoLabel={periodoLabel}
                independenciaEnergetica={independenciaEnergetica}
            />

            {/* Fila de KPIs rápidos */}
            <div className="hidden grid-cols-[repeat(auto-fit,minmax(146px,170px))] justify-center gap-3 sm:grid">
                {tieneFotovoltaica && (
                    <MetricCard
                        label="Generación Solar"
                        value={metricas?.produccion_fotovoltaica_actual_kw || 0}
                        unit="kW"
                        icon={Sun}
                        tone="solar"
                    />
                )}
                <MetricCard
                    label="Consumo Casa"
                    value={metricas?.consumo_total_actual_kw || 0}
                    unit="kW"
                    imageSrc="/house-icon.svg"
                    tone="home"
                />
                {tieneFotovoltaica ? (
                    <>
                        <MetricCard
                            label={`Generación Solar (${periodoLabel})`}
                            value={metricas?.generacion_fotovoltaica_kwh || 0}
                            unit="kWh"
                            icon={Sun}
                            tone="solar"
                        />
                        <MetricCard
                            label={`Energía Retornada (${periodoLabel})`}
                            value={metricas?.energia_retornada_kwh || 0}
                            unit="kWh"
                            icon={HandCoins}
                            tone="export"
                        />
                        <MetricCard
                            label={`Independencia (${periodoLabel})`}
                            value={independenciaEnergetica.toFixed(1)}
                            unit="%"
                            icon={Leaf}
                            tone="independence"
                        />
                    </>
                ) : (
                    <MetricCard
                        label={`Consumo de Red (${periodoLabel})`}
                        value={metricas?.importacion_red_kwh || 0}
                        unit="kWh"
                        icon={Zap}
                        tone="grid"
                    />
                )}
            </div>

            {/* Componentes Flujo Energético y Datos Meteorológicos */}
            <div
                className={`mobile-app-section grid gap-3 sm:gap-4 ${tieneFotovoltaica ? 'sm:grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}
            >
                {metricas && tieneFotovoltaica && (
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
                className={`grid grid-cols-1 gap-3 sm:gap-4 ${tieneFotovoltaica ? 'lg:grid-cols-2 lg:gap-6' : ''}`}
            >
                {datos_grafica && datos_grafica.length > 0 && (
                    <>
                        <div className="mobile-chart-panel w-full rounded-[1.5rem] bg-white p-4 shadow-sm shadow-slate-200/60 sm:rounded-lg sm:border sm:border-gray-200 sm:shadow-sm dark:bg-gray-900 dark:shadow-none dark:sm:border-gray-800">
                            <h2 className="mb-4 text-base font-semibold text-gray-900 sm:text-lg dark:text-gray-100">
                                {tieneFotovoltaica
                                    ? 'Balance Energético'
                                    : 'Evolución de Consumo Eléctrico'}
                            </h2>
                            <BalanceEnergeticoChart
                                datos={datos_grafica}
                                tiene_fotovoltaica={tieneFotovoltaica}
                                num_fases={dispositivo?.num_fases ?? 1}
                                colores_canales={[
                                    dispositivo?.color_canal_1 || null,
                                    dispositivo?.color_canal_2 || null,
                                    dispositivo?.color_canal_3 || null,
                                ]}
                            />
                        </div>
                        {tieneFotovoltaica && (
                            <div className="mobile-chart-panel w-full rounded-[1.5rem] bg-white p-4 shadow-sm shadow-slate-200/60 sm:rounded-lg sm:border sm:border-gray-200 sm:shadow-sm dark:bg-gray-900 dark:shadow-none dark:sm:border-gray-800">
                                <h2 className="mb-4 text-base font-semibold text-gray-900 sm:text-lg dark:text-gray-100">
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
        </div>
    );
}
