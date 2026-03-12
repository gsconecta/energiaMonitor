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
    q1_var?: number;
    q2_var?: number;
    q3_var?: number;
    q_total_var?: number;
}

interface Props {
    datos: DatosGrafica[];
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

export default function PotenciaReactivaChart({ datos, num_fases = 1, colores_canales = [] }: Props) {
    const [horaDesde, setHoraDesde] = useState<string>('00:00');
    const [horaHasta, setHoraHasta] = useState<string>('23:59');
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
            horaDesdeRef.current.value = '00:00';
            horaHastaRef.current.value = '23:59';
            setHoraDesde('00:00');
            setHoraHasta('23:59');
        }
    };

    if (!datos || datos.length === 0) {
        return (
            <div className="flex h-64 items-center justify-center rounded-lg border border-sidebar-border/70 bg-white dark:border-sidebar-border dark:bg-gray-800">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    No hay datos de potencia reactiva disponibles
                </p>
            </div>
        );
    }

    // Calcular si usamos kVAR o VAR dinámicamente según el dato mayor
    let maxAbsValue = 0;
    datosFiltrados.forEach(d => {
        const vals = [d.q1_var ?? 0, d.q2_var ?? 0, d.q3_var ?? 0, d.q_total_var ?? 0];
        vals.forEach(v => {
            if (Math.abs(v) > maxAbsValue) {
                maxAbsValue = Math.abs(v);
            }
        });
    });

    const useKVar = maxAbsValue >= 1000;
    const factor = useKVar ? 1000 : 1;
    const unidadX = useKVar ? 'kVAR' : 'VAR';

    const labels = datosFiltrados.map((dato) => {
        const fecha = new Date(dato.fecha);
        const ahora = new Date();
        const esHoy = fecha.toDateString() === ahora.toDateString();

        if (esHoy) {
            return fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        }
        return fecha.toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    });

    const datasets = [];

    if (Number(num_fases) === 3) {
        datasets.push(
            {
                label: 'Q1 (Fase 1)',
                data: datosFiltrados.map((d) => (d.q1_var ?? 0) / factor),
                borderColor: colores_canales[0] || 'rgb(59, 130, 246)', // blue-500
                backgroundColor: getRgba(colores_canales[0], 'rgba(59, 130, 246, 0.1)'),
                fill: false,
                tension: 0.4,
                borderWidth: 1.5,
                pointRadius: 0,
                pointHoverRadius: 4,
            },
            {
                label: 'Q2 (Fase 2)',
                data: datosFiltrados.map((d) => (d.q2_var ?? 0) / factor),
                borderColor: colores_canales[1] || 'rgb(245, 158, 11)', // amber-500
                backgroundColor: getRgba(colores_canales[1], 'rgba(245, 158, 11, 0.1)'),
                fill: false,
                tension: 0.4,
                borderWidth: 1.5,
                pointRadius: 0,
                pointHoverRadius: 4,
            },
            {
                label: 'Q3 (Fase 3)',
                data: datosFiltrados.map((d) => (d.q3_var ?? 0) / factor),
                borderColor: colores_canales[2] || 'rgb(168, 85, 247)', // purple-500
                backgroundColor: getRgba(colores_canales[2], 'rgba(168, 85, 247, 0.1)'),
                fill: false,
                tension: 0.4,
                borderWidth: 1.5,
                pointRadius: 0,
                pointHoverRadius: 4,
            }
        );
    }

    datasets.push({
        label: 'Q Total',
        data: datosFiltrados.map((d) => (d.q_total_var ?? 0) / factor),
        borderColor: 'rgba(236, 72, 153, 0.5)', // pink-500 50%
        backgroundColor: 'rgba(236, 72, 153, 0.1)', // pink-500 50%
        fill: true,
        tension: 0.4,
        borderWidth: 2.5,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBorderWidth: 2,
    });

    const chartData = {
        labels,
        datasets,
    };

    const options: ChartOptions<'line'> = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top' as const,
                labels: {
                    color: 'rgb(107, 114, 128)',
                    usePointStyle: true,
                    padding: 15,
                    font: { size: 12 },
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
                        return `${context.dataset.label}: ${value >= 0 ? '+' : ''}${value.toFixed(2)} ${unidadX}`;
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
                    display: true,
                },
            },
            y: {
                grid: {
                    color: 'rgba(107, 114, 128, 0.1)',
                },
                ticks: {
                    color: 'rgb(107, 114, 128)',
                    callback: function (value) {
                        return `${value} ${unidadX}`;
                    },
                },
                title: {
                    display: true,
                    text: `Potencia Reactiva (${unidadX})`,
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

    const isDarkMode = document.documentElement.classList.contains('dark');
    if (isDarkMode) {
        options.plugins!.legend!.labels!.color = 'rgb(156, 163, 175)';
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
            chartContainerRef.current?.requestFullscreen().catch((err: Error) => {
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
                    Potencia Reactiva (Q)
                </h2>
            )}

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
                <div className={`w-full p-4 ${isFullscreen ? 'h-[calc(100vh-120px)]' : 'h-96'}`}>
                    <Line data={chartData} options={options} />
                </div>
            )}
        </div>
    );
}
