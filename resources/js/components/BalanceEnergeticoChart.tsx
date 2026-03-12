import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    type ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useState, useEffect, useRef } from 'react';
import { Clock, Maximize, Minimize } from 'lucide-react';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

interface DatosGrafica {
    fecha: string;
    produccion_fotovoltaica_kw: number;
    red_electrica_kw: number;
    fase_1_kw?: number;
    fase_2_kw?: number;
    fase_3_kw?: number;
    consumo_casa_kw: number;
}

interface Props {
    datos: DatosGrafica[];
    tiene_fotovoltaica?: boolean;
    num_fases?: number;
    colores_canales?: (string | null)[];
}

const getRgba = (hex: string | null | undefined, defaultRgba: string) => {
    if (!hex) return defaultRgba;
    if (hex.startsWith('#') && hex.length === 7) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, 0.1)`;
    }
    return defaultRgba;
};

export default function BalanceEnergeticoChart({ datos, tiene_fotovoltaica = true, num_fases = 1, colores_canales = [] }: Props) {
    const [horaDesde, setHoraDesde] = useState<string>('06:00');
    const [horaHasta, setHoraHasta] = useState<string>('23:00');
    const [datosFiltrados, setDatosFiltrados] = useState<DatosGrafica[]>(datos || []);
    const horaDesdeRef = useRef<HTMLInputElement>(null);
    const horaHastaRef = useRef<HTMLInputElement>(null);

    // Filtrar datos cuando cambian las horas o los datos originales
    useEffect(() => {
        if (!datos || datos.length === 0) {
            setDatosFiltrados([]);
            return;
        }

        const filtrarPorHora = () => {
            const [horaDesdeH, horaDesdeM] = horaDesde.split(':').map(Number);
            const [horaHastaH, horaHastaM] = horaHasta.split(':').map(Number);

            const desdeMinutos = horaDesdeH * 60 + horaDesdeM;
            const hastaMinutos = horaHastaH * 60 + horaHastaM;

            const filtrados = datos.filter((dato) => {
                const fecha = new Date(dato.fecha);
                const horaMinutos = fecha.getHours() * 60 + fecha.getMinutes();

                // Si hasta es menor que desde, significa que cruza medianoche
                if (hastaMinutos < desdeMinutos) {
                    return horaMinutos >= desdeMinutos || horaMinutos <= hastaMinutos;
                }
                return horaMinutos >= desdeMinutos && horaMinutos <= hastaMinutos;
            });

            setDatosFiltrados(filtrados);
        };

        filtrarPorHora();
    }, [datos, horaDesde, horaHasta]);

    const handleLimpiarFiltro = () => {
        if (horaDesdeRef.current && horaHastaRef.current) {
            horaDesdeRef.current.value = '06:00';
            horaHastaRef.current.value = '23:00';
            setHoraDesde('06:00');
            setHoraHasta('23:00');
        }
    };

    if (!datos || datos.length === 0) {
        return (
            <div className="flex h-64 items-center justify-center rounded-lg border border-sidebar-border/70 bg-white dark:border-sidebar-border dark:bg-gray-800">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    No hay datos disponibles para mostrar
                </p>
            </div>
        );
    }

    // Formatear fechas para el eje X usando datosFiltrados
    const labels = datosFiltrados.map((dato) => {
        const fecha = new Date(dato.fecha);
        // Formato: HH:MM para hoy, DD/MM HH:MM para otros días
        const ahora = new Date();
        const esHoy = fecha.toDateString() === ahora.toDateString();

        if (esHoy) {
            return fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        }
        return fecha.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    });

    const chartData = {
        labels,
        datasets: [
            ...(tiene_fotovoltaica ? [{
                label: 'Producción Fotovoltaica',
                data: datosFiltrados.map((d) => d.produccion_fotovoltaica_kw),
                borderColor: '#FFC107', // Amarillo Ámbar - Generación Solar
                backgroundColor: 'rgba(255, 193, 7, 0.1)',
                fill: true,
                tension: 0.4,
                borderWidth: 2,
                pointRadius: 0, // Ocultar puntos normalmente
                pointHoverRadius: 5, // Mostrar punto al hacer hover
                pointHoverBorderWidth: 2,
            }] : []),

            // Si no tiene fotovoltaica y es trifásico, mostrar las 3 líneas por separado
            ...(!tiene_fotovoltaica && Number(num_fases) === 3 ? [
                {
                    label: 'Fase 1 (L1)',
                    data: datosFiltrados.map((d) => d.fase_1_kw ?? 0),
                    borderColor: colores_canales[0] || 'rgb(59, 130, 246)', // blue-500
                    backgroundColor: getRgba(colores_canales[0], 'rgba(59, 130, 246, 0.1)'),
                    fill: false,
                    tension: 0.4,
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    pointHoverBorderWidth: 2,
                },
                {
                    label: 'Fase 2 (L2)',
                    data: datosFiltrados.map((d) => d.fase_2_kw ?? 0),
                    borderColor: colores_canales[1] || 'rgb(245, 158, 11)', // amber-500
                    backgroundColor: getRgba(colores_canales[1], 'rgba(245, 158, 11, 0.1)'),
                    fill: false,
                    tension: 0.4,
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    pointHoverBorderWidth: 2,
                },
                {
                    label: 'Fase 3 (L3)',
                    data: datosFiltrados.map((d) => d.fase_3_kw ?? 0),
                    borderColor: colores_canales[2] || 'rgb(168, 85, 247)', // purple-500
                    backgroundColor: getRgba(colores_canales[2], 'rgba(168, 85, 247, 0.1)'),
                    fill: false,
                    tension: 0.4,
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    pointHoverBorderWidth: 2,
                }
            ] : [
                // Comportamiento monofásico o combinado clásico
                {
                    label: tiene_fotovoltaica ? 'Red Eléctrica' : 'Consumo Eléctrico',
                    data: datosFiltrados.map((d) => d.red_electrica_kw),
                    borderColor: colores_canales[0] || '#607D8B', // Gris Pizarra - Red Eléctrica
                    backgroundColor: getRgba(colores_canales[0], 'rgba(96, 125, 139, 0.1)'),
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    pointHoverBorderWidth: 2,
                    segment: {
                        borderColor: (ctx: any) => {
                            const value = ctx.p1.parsed?.y;
                            if (value === null || value === undefined) {
                                return colores_canales[0] || '#607D8B';
                            }
                            return value >= 0 ? (colores_canales[0] || '#607D8B') : '#4CAF50';
                        },
                    },
                }
            ]),
            ...(tiene_fotovoltaica ? [{
                label: 'Consumo Casa',
                data: datosFiltrados.map((d) => d.consumo_casa_kw),
                borderColor: '#1976D2', // Azul Cobalto - Consumo General
                backgroundColor: 'rgba(25, 118, 210, 0.1)',
                fill: true,
                tension: 0.4,
                borderWidth: 2,
                pointRadius: 0, // Ocultar puntos normalmente
                pointHoverRadius: 5, // Mostrar punto al hacer hover
                pointHoverBorderWidth: 2,
            }] : []),
        ],
    };

    const options: ChartOptions<'line'> = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top' as const,
                labels: {
                    color: 'rgb(107, 114, 128)', // gray-500
                    usePointStyle: true,
                    padding: 15,
                    font: {
                        size: 12,
                    },
                },
            },
            title: {
                display: false,
            },
            tooltip: {
                mode: 'index',
                intersect: false,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: 'rgb(255, 255, 255)',
                bodyColor: 'rgb(255, 255, 255)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1,
                padding: 12,
                callbacks: {
                    label: function (context) {
                        const value = context.parsed.y;
                        if (value === null || value === undefined) {
                            return `${context.dataset.label}: N/A`;
                        }
                        return `${context.dataset.label}: ${value >= 0 ? '+' : ''}${value.toFixed(2)} kW`;
                    },
                },
            },
        },
        scales: {
            x: {
                grid: {
                    color: 'rgba(107, 114, 128, 0.1)',
                },
                ticks: {
                    color: 'rgb(107, 114, 128)',
                    maxRotation: 45,
                    minRotation: 45,
                    display: false,
                },
            },
            y: {
                grid: {
                    color: 'rgba(107, 114, 128, 0.1)',
                },
                ticks: {
                    color: 'rgb(107, 114, 128)',
                    callback: function (value) {
                        return `${value} kW`;
                    },
                },
                title: {
                    display: true,
                    text: 'Potencia (kW)',
                    color: 'rgb(107, 114, 128)',
                },
            },
        },
        interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false,
        },
    };

    // Aplicar estilos para dark mode
    const isDarkMode = document.documentElement.classList.contains('dark');
    if (isDarkMode) {
        // Ajustar colores para dark mode
        options.plugins!.legend!.labels!.color = 'rgb(156, 163, 175)'; // gray-400
        options.scales!.x!.ticks!.color = 'rgb(156, 163, 175)';
        options.scales!.y!.ticks!.color = 'rgb(156, 163, 175)';
        options.scales!.y!.title!.color = 'rgb(156, 163, 175)';
        options.scales!.x!.grid!.color = 'rgba(156, 163, 175, 0.1)';
        options.scales!.y!.grid!.color = 'rgba(156, 163, 175, 0.1)';
    }

    const chartContainerRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            chartContainerRef.current?.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable full-screen mode: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    };

    return (
        <div ref={chartContainerRef} className={`w-full ${isFullscreen ? 'bg-gray-50 dark:bg-gray-900 p-6 overflow-y-auto' : ''}`}>
            {isFullscreen && (
                <h2 className="mb-6 text-xl font-bold text-gray-900 dark:text-gray-100">
                    Balance Energético
                </h2>
            )}

            {/* Controles de filtro horario */}
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <div className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800">
                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            Desde:
                        </label>
                        <input
                            ref={horaDesdeRef}
                            type="time"
                            defaultValue={horaDesde}
                            className="border-none bg-transparent text-xs text-gray-900 focus:outline-none dark:text-gray-100"
                            onChange={(e) => setHoraDesde(e.target.value)}
                        />
                    </div>
                    <span className="text-gray-500 dark:text-gray-400">-</span>
                    <div className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800">
                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            Hasta:
                        </label>
                        <input
                            ref={horaHastaRef}
                            type="time"
                            defaultValue={horaHasta}
                            className="border-none bg-transparent text-xs text-gray-900 focus:outline-none dark:text-gray-100"
                            onChange={(e) => setHoraHasta(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={handleLimpiarFiltro}
                        className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                        title="Limpiar filtro horario (mostrar todo el día)"
                    >
                        Limpiar
                    </button>
                    <button
                        onClick={toggleFullscreen}
                        className="rounded-md border border-gray-300 bg-white p-1 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                        title={isFullscreen ? "Salir de pantalla completa" : "Ver en pantalla completa"}
                    >
                        {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
                    </button>
                </div>
            </div>

            {datosFiltrados.length === 0 ? (
                <div className={`flex items-center justify-center rounded-lg border border-sidebar-border/70 bg-white dark:border-sidebar-border dark:bg-gray-800 ${isFullscreen ? 'h-[calc(100vh-120px)]' : 'h-96'}`}>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        No hay datos en el rango horario seleccionado ({horaDesde} - {horaHasta})
                    </p>
                </div>
            ) : (
                <div className={`w-full rounded-lg border border-sidebar-border/70 bg-white p-4 dark:border-sidebar-border dark:bg-gray-800 ${isFullscreen ? 'h-[calc(100vh-120px)]' : 'h-96'}`}>
                    <Line data={chartData} options={options} />
                </div>
            )}
        </div>
    );
}

