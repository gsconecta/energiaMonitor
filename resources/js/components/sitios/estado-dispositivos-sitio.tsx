import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { router } from '@inertiajs/react';
import { Activity, Plus } from 'lucide-react';

interface UltimaLecturaDispositivoSitio {
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
}

export interface DispositivoEstadoSitio {
    id: number;
    nombre: string;
    device_id: string;
    activo: boolean;
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
    estado_conexion: 'online' | 'offline';
    ultima_lectura: UltimaLecturaDispositivoSitio | null;
}

interface EstadoDispositivosSitioProps {
    dispositivos: DispositivoEstadoSitio[];
    sitioId?: number;
    showCreateButton?: boolean;
    className?: string;
}

const CANALES = [1, 2, 3] as const;
type CanalNumero = (typeof CANALES)[number];

function formatMeasurement(
    value: number | null | undefined,
    unit: string,
    maximumFractionDigits = 2,
) {
    if (value == null) {
        return `-- ${unit}`;
    }

    return `${value.toLocaleString('es-ES', {
        maximumFractionDigits,
    })} ${unit}`;
}

function getDeviceValue(
    dispositivo: DispositivoEstadoSitio,
    key: `nombre_canal_${CanalNumero}` | `tipo_canal_${CanalNumero}`,
): string | null {
    return dispositivo[key];
}

function getReadingValue(
    lectura: UltimaLecturaDispositivoSitio | null,
    key:
        | `potencia_canal_${CanalNumero}_w`
        | `voltaje_canal_${CanalNumero}`
        | `energia_canal_${CanalNumero}_kwh`,
): number | null | undefined {
    return lectura?.[key];
}

function channelTypeLabel(tipoCanal: string | null) {
    if (tipoCanal === 'fotovoltaica') {
        return 'Solar';
    }

    if (tipoCanal === 'red_electrica') {
        return 'Red';
    }

    return tipoCanal;
}

function visibleChannels(dispositivo: DispositivoEstadoSitio) {
    return CANALES.filter((canalNum) => {
        if (dispositivo.num_fases && canalNum > dispositivo.num_fases) {
            return false;
        }

        const potencia = getReadingValue(
            dispositivo.ultima_lectura,
            `potencia_canal_${canalNum}_w`,
        );

        return Boolean(
            getDeviceValue(dispositivo, `nombre_canal_${canalNum}`) ||
            getDeviceValue(dispositivo, `tipo_canal_${canalNum}`) ||
            potencia != null,
        );
    });
}

export default function EstadoDispositivosSitio({
    dispositivos,
    sitioId,
    showCreateButton = false,
    className,
}: EstadoDispositivosSitioProps) {
    const canCreate = showCreateButton && sitioId != null;

    return (
        <section className={cn('flex flex-col gap-4', className)}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Estado de los Dispositivos del Sitio
                </h2>
                {canCreate && (
                    <Button
                        type="button"
                        size="sm"
                        onClick={() =>
                            router.visit('/dispositivos/create', {
                                data: { sitio_id: sitioId },
                            })
                        }
                    >
                        <Plus className="h-4 w-4" />
                        Nuevo Dispositivo
                    </Button>
                )}
            </div>

            {dispositivos.length === 0 ? (
                <div className="rounded-xl border border-sidebar-border/70 bg-white p-6 shadow dark:border-sidebar-border dark:bg-gray-800">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        No hay dispositivos en este sitio
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2 xl:grid-cols-3">
                    {dispositivos.map((dispositivo) => {
                        const canalesVisibles = visibleChannels(dispositivo);

                        return (
                            <button
                                key={dispositivo.id}
                                type="button"
                                onClick={() =>
                                    router.visit(
                                        `/dispositivos/${dispositivo.id}`,
                                    )
                                }
                                className="group w-full rounded-xl border border-sidebar-border/70 bg-white p-4 text-left shadow transition hover:border-blue-300 hover:bg-blue-50/40 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none dark:border-sidebar-border dark:bg-gray-800 dark:hover:border-blue-700 dark:hover:bg-blue-950/20"
                            >
                                <div className="mb-4 flex items-start justify-between gap-3 border-b border-gray-200 pb-3 dark:border-gray-700">
                                    <div className="min-w-0">
                                        <h3 className="truncate font-semibold text-gray-800 dark:text-gray-200">
                                            {dispositivo.nombre}
                                        </h3>
                                        <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
                                            ID: {dispositivo.device_id}
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 flex-col items-end gap-2">
                                        <span
                                            className={cn(
                                                'inline-flex rounded-full px-2 py-1 text-xs font-semibold',
                                                dispositivo.activo
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
                                            )}
                                        >
                                            {dispositivo.activo
                                                ? 'Activo'
                                                : 'Inactivo'}
                                        </span>
                                        <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                            <span
                                                className={cn(
                                                    'h-2.5 w-2.5 rounded-full',
                                                    dispositivo.estado_conexion ===
                                                        'online'
                                                        ? 'bg-green-500'
                                                        : 'bg-red-500',
                                                )}
                                            />
                                            {dispositivo.estado_conexion ===
                                            'online'
                                                ? 'Online'
                                                : 'Offline'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3">
                                    {canalesVisibles.length > 0 ? (
                                        canalesVisibles.map((canalNum) => {
                                            const potencia = getReadingValue(
                                                dispositivo.ultima_lectura,
                                                `potencia_canal_${canalNum}_w`,
                                            );
                                            const voltaje = getReadingValue(
                                                dispositivo.ultima_lectura,
                                                `voltaje_canal_${canalNum}`,
                                            );
                                            const energia = getReadingValue(
                                                dispositivo.ultima_lectura,
                                                `energia_canal_${canalNum}_kwh`,
                                            );
                                            const nombreCanal =
                                                getDeviceValue(
                                                    dispositivo,
                                                    `nombre_canal_${canalNum}`,
                                                ) || `Canal ${canalNum}`;
                                            const tipoCanal = getDeviceValue(
                                                dispositivo,
                                                `tipo_canal_${canalNum}`,
                                            );

                                            return (
                                                <div
                                                    key={canalNum}
                                                    className="flex flex-col gap-1 rounded-lg bg-gray-50 p-3 dark:bg-gray-900/60"
                                                >
                                                    <div className="flex items-center justify-between gap-3">
                                                        <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                                                            <Activity className="h-3.5 w-3.5 shrink-0 text-blue-500" />
                                                            <span className="truncate">
                                                                {nombreCanal}
                                                            </span>
                                                            {tipoCanal && (
                                                                <span className="ml-1 rounded bg-gray-200 px-1.5 py-0.5 text-[10px] tracking-wider text-gray-600 uppercase dark:bg-gray-700 dark:text-gray-400">
                                                                    {channelTypeLabel(
                                                                        tipoCanal,
                                                                    )}
                                                                </span>
                                                            )}
                                                        </span>
                                                        <span
                                                            className={cn(
                                                                'shrink-0 text-sm font-bold',
                                                                potencia !=
                                                                    null &&
                                                                    potencia < 0
                                                                    ? 'text-green-600 dark:text-green-400'
                                                                    : 'text-gray-900 dark:text-gray-100',
                                                            )}
                                                        >
                                                            {formatMeasurement(
                                                                potencia,
                                                                'W',
                                                                0,
                                                            )}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                                        <span>
                                                            {formatMeasurement(
                                                                voltaje,
                                                                'V',
                                                                1,
                                                            )}
                                                        </span>
                                                        <span>
                                                            {formatMeasurement(
                                                                energia,
                                                                'kWh',
                                                                2,
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="py-2 text-center text-sm text-gray-500 dark:text-gray-400">
                                            Sin canales configurados
                                        </div>
                                    )}

                                    {!dispositivo.ultima_lectura && (
                                        <div className="py-2 text-center text-sm text-gray-500 dark:text-gray-400">
                                            Sin lecturas recientes
                                        </div>
                                    )}
                                </div>

                                {dispositivo.ultima_lectura && (
                                    <p className="mt-4 text-right text-[10px] text-gray-400 dark:text-gray-500">
                                        Ultima lectura:{' '}
                                        {
                                            dispositivo.ultima_lectura
                                                .fecha_lectura_human
                                        }
                                    </p>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
