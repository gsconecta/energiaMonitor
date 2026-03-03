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
import { Clock } from 'lucide-react';

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
    consumo_casa_kw: number;
    voltaje_red_electrica?: number;
}

interface Props {
    datos: DatosGrafica[];
}

export default function VoltajeRedChart({ datos }: Props) {
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
            {
                label: 'Voltaje Red Eléctrica',
                data: datosFiltrados.map((d) => d.voltaje_red_electrica || 0),
                borderColor: 'rgb(59, 130, 246)', // blue-500
                backgroundColor: 'rgba(59, 130, 246, 0.2)', // blue-500 con opacidad
                fill: true,
                tension: 0.4,
                borderWidth: 2,
                pointRadius: 0, // Ocultar puntos normalmente
                pointHoverRadius: 5, // Mostrar punto al hacer hover
                pointHoverBorderWidth: 2,
            },
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
                        return `${context.dataset.label}: ${value.toFixed(1)} V`;
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
                },
            },
            y: {
                grid: {
                    color: 'rgba(107, 114, 128, 0.1)',
                },
                ticks: {
                    color: 'rgb(107, 114, 128)',
                    callback: function (value) {
                        return `${value} V`;
                    },
                },
                title: {
                    display: true,
                    text: 'Voltaje (V)',
                    color: 'rgb(107, 114, 128)',
                },
                // Optional: set a min/max to better visualize 230V typical values
                suggestedMin: 200,
                suggestedMax: 250,
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

    return (
        <div className="w-full">
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
                </div>
            </div>

            {datosFiltrados.length === 0 ? (
                <div className="flex h-96 items-center justify-center rounded-lg border border-sidebar-border/70 bg-white dark:border-sidebar-border dark:bg-gray-800">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        No hay datos en el rango horario seleccionado ({horaDesde} - {horaHasta})
                    </p>
                </div>
            ) : (
                <div className="h-96 w-full rounded-lg border border-sidebar-border/70 bg-white p-4 dark:border-sidebar-border dark:bg-gray-800">
                    <Line data={chartData} options={options} />
                </div>
            )}
        </div>
    );
}
