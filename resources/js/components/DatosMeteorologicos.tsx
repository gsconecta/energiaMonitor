import {
    Cloud,
    CloudRain,
    CloudSun,
    Sun,
    Sunrise,
    Sunset,
    Wind,
} from 'lucide-react';
import { useMemo } from 'react';

interface DatosMeteorologicos {
    temperatura_actual?: number | null;
    temperatura_maxima?: number | null;
    temperatura_minima?: number | null;
    viento_velocidad?: number | null;
    viento_direccion?: string | null;
    radiacion_solar?: number | null;
    salida_sol?: string | null;
    puesta_sol?: string | null;
    estado_cielo?: string | null;
    estado_cielo_codigo?: string | null;
    fecha_actualizacion?: string | null;
}

interface Props {
    datos: DatosMeteorologicos;
}

export default function DatosMeteorologicos({ datos }: Props) {
    // Función para obtener el icono según el estado del cielo
    const obtenerIconoEstado = useMemo(() => {
        const estadoCielo = datos.estado_cielo?.toLowerCase() || '';
        const codigo = datos.estado_cielo_codigo || '';

        // Mapeo de códigos y descripciones a iconos
        if (
            estadoCielo.includes('despejado') ||
            estadoCielo.includes('despejad') ||
            codigo === '11' ||
            codigo === '11n' ||
            codigo === '11d'
        ) {
            return { Icon: Sun, color: 'text-yellow-500' };
        }

        if (
            estadoCielo.includes('nublado') ||
            estadoCielo.includes('cubierto') ||
            codigo === '81' ||
            codigo === '82' ||
            codigo === '83' ||
            codigo === '84'
        ) {
            return { Icon: Cloud, color: 'text-gray-500' };
        }

        if (
            estadoCielo.includes('lluvia') ||
            estadoCielo.includes('precipitaci') ||
            estadoCielo.includes('chubasco') ||
            codigo === '43' ||
            codigo === '44' ||
            codigo === '45' ||
            codigo === '46'
        ) {
            return { Icon: CloudRain, color: 'text-blue-500' };
        }

        if (
            estadoCielo.includes('parcialmente') ||
            estadoCielo.includes('intervalos') ||
            codigo === '12' ||
            codigo === '13' ||
            codigo === '14'
        ) {
            return { Icon: CloudSun, color: 'text-yellow-400' };
        }

        // Por defecto, sol
        return { Icon: Sun, color: 'text-yellow-500' };
    }, [datos.estado_cielo, datos.estado_cielo_codigo]);

    const { Icon: IconoEstado, color: colorIcono } = obtenerIconoEstado;

    // Formatear hora (HH:mm)
    const formatearHora = (hora?: string | null): string => {
        if (!hora) return '--:--';
        // Si viene en formato ISO o con más información, extraer solo la hora
        const match = hora.match(/(\d{2}):(\d{2})/);
        if (match) {
            return `${match[1]}:${match[2]}`;
        }
        return hora;
    };

    // Formatear dirección del viento
    const formatearDireccionViento = (direccion?: string | null): string => {
        if (!direccion) return '';
        // AEMET puede devolver direcciones como "N", "NE", "E", etc.
        return direccion;
    };

    // Verificar si hay algún dato disponible
    const tieneDatos =
        datos.temperatura_actual != null ||
        datos.temperatura_maxima != null ||
        datos.temperatura_minima != null ||
        datos.viento_velocidad != null ||
        datos.radiacion_solar != null ||
        datos.salida_sol != null ||
        datos.puesta_sol != null ||
        datos.estado_cielo != null;

    return (
        <div className="mobile-app-section mx-auto w-full max-w-[500px] rounded-[1.75rem] bg-white p-4 shadow-sm shadow-slate-200/60 sm:rounded-lg sm:border sm:border-sidebar-border/70 sm:p-6 dark:bg-gray-900 dark:shadow-none dark:sm:border-sidebar-border dark:sm:bg-gray-800">
            {/* Título */}
            <div className="mb-4 text-center sm:mb-6">
                {!tieneDatos && (
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        No hay datos disponibles para este municipio
                    </p>
                )}
            </div>

            {/* Contenedor principal */}
            <div className="relative flex min-h-[360px] flex-col items-center justify-between py-3 sm:min-h-[450px] sm:py-4">
                {/* Icono de estado del cielo grande en el centro superior */}
                <div className="mb-6 flex flex-col items-center sm:mb-8">
                    <IconoEstado
                        className={`h-16 w-16 sm:h-24 sm:w-24 ${colorIcono}`}
                    />
                    {datos.estado_cielo && (
                        <p className="mt-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                            {datos.estado_cielo}
                        </p>
                    )}
                    {!datos.estado_cielo && datos.radiacion_solar != null && (
                        <p className="mt-3 text-xs text-gray-500 italic dark:text-gray-400">
                            Promedio histórico
                        </p>
                    )}
                </div>

                {/* Grid de datos meteorológicos */}
                <div className="grid w-full grid-cols-2 gap-3 sm:gap-4">
                    {/* Temperatura actual - destacada */}
                    <div className="col-span-2 rounded-2xl bg-blue-50 p-4 sm:rounded-lg dark:bg-blue-900/20">
                        <p className="text-center text-sm font-medium text-gray-600 dark:text-gray-400">
                            Temperatura
                        </p>
                        <div className="mt-2 flex items-center justify-center gap-2">
                            <p className="text-3xl font-bold text-blue-600 sm:text-4xl dark:text-blue-400">
                                {datos.temperatura_actual != null
                                    ? `${datos.temperatura_actual}°C`
                                    : '--°C'}
                            </p>
                        </div>
                        {(datos.temperatura_maxima != null ||
                            datos.temperatura_minima != null) && (
                            <div className="mt-2 flex justify-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                                {datos.temperatura_maxima != null && (
                                    <span>
                                        Máx: {datos.temperatura_maxima}°C
                                    </span>
                                )}
                                {datos.temperatura_minima != null && (
                                    <span>
                                        Mín: {datos.temperatura_minima}°C
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Viento */}
                    <div className="rounded-2xl bg-gray-50 p-3 sm:rounded-lg sm:p-4 dark:bg-gray-800/70">
                        <div className="flex items-center gap-2">
                            <Wind className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                Viento
                            </p>
                        </div>
                        <p className="mt-2 text-lg font-bold text-gray-900 sm:text-xl dark:text-gray-100">
                            {datos.viento_velocidad != null
                                ? `${datos.viento_velocidad} km/h`
                                : '-- km/h'}
                        </p>
                        {datos.viento_direccion && (
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {formatearDireccionViento(
                                    datos.viento_direccion,
                                )}
                            </p>
                        )}
                    </div>

                    {/* Radiación solar */}
                    <div className="rounded-2xl bg-yellow-50 p-3 sm:rounded-lg sm:p-4 dark:bg-yellow-900/20">
                        <div className="flex items-center gap-2">
                            <Sun className="h-5 w-5 text-yellow-500" />
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                Radiación
                            </p>
                        </div>
                        <p className="mt-2 text-lg font-bold text-yellow-600 sm:text-xl dark:text-yellow-400">
                            {datos.radiacion_solar != null
                                ? `${datos.radiacion_solar}`
                                : '--'}
                        </p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            UV Max
                        </p>
                    </div>

                    {/* Salida del sol */}
                    <div className="rounded-2xl bg-orange-50 p-3 sm:rounded-lg sm:p-4 dark:bg-orange-900/20">
                        <div className="flex items-center gap-2">
                            <Sunrise className="h-5 w-5 text-orange-500" />
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                Salida
                            </p>
                        </div>
                        <p className="mt-2 text-lg font-bold text-orange-600 sm:text-xl dark:text-orange-400">
                            {formatearHora(datos.salida_sol)}
                        </p>
                    </div>

                    {/* Puesta del sol */}
                    <div className="rounded-2xl bg-purple-50 p-3 sm:rounded-lg sm:p-4 dark:bg-purple-900/20">
                        <div className="flex items-center gap-2">
                            <Sunset className="h-5 w-5 text-purple-500" />
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                Puesta
                            </p>
                        </div>
                        <p className="mt-2 text-lg font-bold text-purple-600 sm:text-xl dark:text-purple-400">
                            {formatearHora(datos.puesta_sol)}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
