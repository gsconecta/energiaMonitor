import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import {
    Pencil,
    Trash2,
    Building2,
    MapPin,
    Zap,
    RefreshCw,
    Power,
    Activity,
    Wifi,
    Server,
    Settings,
    BarChart3,
} from 'lucide-react';
import { useState } from 'react';
import { Line } from 'react-chartjs-2';
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
} from 'chart.js';

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

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dispositivos',
        href: '/dispositivos',
    },
    {
        title: 'Detalle',
        href: '#',
    },
];

interface Organizacion {
    id: number;
    nombre: string;
}

interface Sitio {
    id: number;
    nombre: string;
    codigo: string;
    organizacion: Organizacion;
}

interface UltimaLectura {
    fecha: string;
    fecha_human: string;
    potencia_total_kw: number;
    energia_total_kwh: number;
}

interface Graficas {
    labels: string[];
    canal1: number[];
    canal2: number[];
    canal3: number[];
}

interface Dispositivo {
    id: number;
    device_id: string;
    nombre: string;
    tipo: string;
    num_fases: number | null;
    fases_label: string;
    nombre_canal_1: string | null;
    nombre_canal_2: string | null;
    nombre_canal_3: string | null;
    color_canal_1: string;
    color_canal_2: string;
    color_canal_3: string;
    modelo: string | null;
    ip_local: string | null;
    firmware: string | null;
    activo: boolean;
    configuracion: Record<string, any> | null;
    sitio: Sitio;
    lecturas_count: number;
    esta_online: boolean;
    ultima_lectura: UltimaLectura | null;
}

interface Props {
    dispositivo: Dispositivo;
    graficas?: Graficas;
}

export default function DispositivosShow({ dispositivo, graficas }: Props) {
    const [sincronizando, setSincronizando] = useState(false);
    const [editandoNombres, setEditandoNombres] = useState(false);
    const [nombresCanales, setNombresCanales] = useState({
        nombre_canal_1: dispositivo.nombre_canal_1 ?? 'Canal 1',
        nombre_canal_2: dispositivo.nombre_canal_2 ?? 'Canal 2',
        nombre_canal_3: dispositivo.nombre_canal_3 ?? 'Canal 3',
    });
    const [coloresCanales, setColoresCanales] = useState({
        color_canal_1: dispositivo.color_canal_1 ?? '#ef4444',
        color_canal_2: dispositivo.color_canal_2 ?? '#22c55e',
        color_canal_3: dispositivo.color_canal_3 ?? '#eab308',
    });

    const tiposDispositivo = [
        { value: 'produccion', label: 'Producción Solar', color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900' },
        { value: 'consumo', label: 'Consumo', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900' },
        { value: 'red', label: 'Red Eléctrica', color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900' },
        { value: 'bateria', label: 'Batería', color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900' },
        { value: 'otro', label: 'Otro', color: 'text-gray-600', bgColor: 'bg-gray-100 dark:bg-gray-900' },
    ];

    const tipoDispositivo = tiposDispositivo.find((t) => t.value === dispositivo.tipo) || tiposDispositivo[4];

    const handleEliminar = () => {
        if (confirm('¿Estás seguro de eliminar este dispositivo?')) {
            router.delete(`/dispositivos/${dispositivo.id}`);
        }
    };

    const handleToggleActivo = () => {
        router.post(`/dispositivos/${dispositivo.id}/toggle-activo`);
    };

    const handleSincronizar = () => {
        setSincronizando(true);
        router.post(
            `/dispositivos/${dispositivo.id}/sincronizar`,
            {},
            {
                onSuccess: () => {
                    setSincronizando(false);
                },
                onError: () => {
                    setSincronizando(false);
                },
                onFinish: () => {
                    setSincronizando(false);
                },
            }
        );
    };

    const handleVerDashboard = () => {
        router.get(dashboard().url, { dispositivo_id: dispositivo.id });
    };

    const handleGuardarNombresCanales = () => {
        router.put(`/dispositivos/${dispositivo.id}`, {
            sitio_id: dispositivo.sitio.id,
            device_id: dispositivo.device_id,
            nombre: dispositivo.nombre,
            tipo: dispositivo.tipo,
            num_fases: dispositivo.num_fases,
            nombre_canal_1: nombresCanales.nombre_canal_1 || null,
            nombre_canal_2: nombresCanales.nombre_canal_2 || null,
            nombre_canal_3: nombresCanales.nombre_canal_3 || null,
            color_canal_1: coloresCanales.color_canal_1,
            color_canal_2: coloresCanales.color_canal_2,
            color_canal_3: coloresCanales.color_canal_3,
            modelo: dispositivo.modelo,
            ip_local: dispositivo.ip_local,
            firmware: dispositivo.firmware,
            activo: dispositivo.activo,
        }, {
            onSuccess: () => {
                setEditandoNombres(false);
            },
        });
    };

    const obtenerNombreCanal = (numero: number): string => {
        switch (numero) {
            case 1:
                return nombresCanales.nombre_canal_1;
            case 2:
                return nombresCanales.nombre_canal_2;
            case 3:
                return nombresCanales.nombre_canal_3;
            default:
                return `Canal ${numero}`;
        }
    };

    // Función para convertir hex a rgba
    const hexToRgba = (hex: string, alpha: number = 0.1): string => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    // Preparar datos para las gráficas
    const dataCanal1 = {
        labels: graficas?.labels || [],
        datasets: [
            {
                label: `${obtenerNombreCanal(1)} (kW)`,
                data: graficas?.canal1 || [],
                borderColor: coloresCanales.color_canal_1,
                backgroundColor: hexToRgba(coloresCanales.color_canal_1, 0.1),
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 4,
            },
        ],
    };

    const dataCanal2 = {
        labels: graficas?.labels || [],
        datasets: [
            {
                label: `${obtenerNombreCanal(2)} (kW)`,
                data: graficas?.canal2 || [],
                borderColor: coloresCanales.color_canal_2,
                backgroundColor: hexToRgba(coloresCanales.color_canal_2, 0.1),
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 4,
            },
        ],
    };

    const dataCanal3 = {
        labels: graficas?.labels || [],
        datasets: [
            {
                label: `${obtenerNombreCanal(3)} (kW)`,
                data: graficas?.canal3 || [],
                borderColor: coloresCanales.color_canal_3,
                backgroundColor: hexToRgba(coloresCanales.color_canal_3, 0.1),
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 4,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            intersect: false,
            mode: 'index' as const,
        },
        plugins: {
            legend: {
                position: 'top' as const,
                labels: {
                    usePointStyle: true,
                    padding: 15,
                    font: {
                        size: 12,
                    },
                },
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                padding: 12,
                titleFont: {
                    size: 14,
                },
                bodyFont: {
                    size: 12,
                },
                displayColors: true,
                callbacks: {
                    label: function(context: any) {
                        return `${context.dataset.label}: ${context.parsed.y.toFixed(2)} kW`;
                    },
                },
            },
        },
        scales: {
            x: {
                grid: {
                    display: false,
                },
                ticks: {
                    maxRotation: 45,
                    minRotation: 0,
                    font: {
                        size: 10,
                    },
                },
            },
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(0, 0, 0, 0.05)',
                },
                ticks: {
                    font: {
                        size: 10,
                    },
                },
            },
        },
        animation: {
            duration: 1000,
            easing: 'easeInOutQuart' as const,
        },
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={dispositivo.nombre} />

            <div className="flex h-full w-full flex-1 flex-col gap-4 overflow-x-hidden p-2 sm:p-4 lg:p-6">
                {/* Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            {dispositivo.nombre}
                        </h1>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            {dispositivo.device_id}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={handleVerDashboard}
                            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        >
                            <BarChart3 className="h-4 w-4" />
                            Ver Dashboard
                        </button>
                        <button
                            onClick={handleSincronizar}
                            disabled={sincronizando}
                            className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium ${
                                sincronizando
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-indigo-600 hover:bg-indigo-700'
                            } text-white`}
                        >
                            <RefreshCw
                                className={`h-4 w-4 ${sincronizando ? 'animate-spin' : ''}`}
                            />
                            Sincronizar
                        </button>
                        <button
                            onClick={() => router.visit('/dispositivos')}
                            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        >
                            <Pencil className="h-4 w-4" />
                            Editar
                        </button>
                        <button
                            onClick={handleEliminar}
                            className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                        >
                            <Trash2 className="h-4 w-4" />
                            Eliminar
                        </button>
                    </div>
                </div>

                {/* Estado y acciones rápidas */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="overflow-hidden rounded-xl border border-sidebar-border/70 bg-white shadow dark:border-sidebar-border dark:bg-gray-800">
                        <div className="p-4">
                            <div className="flex items-center gap-3">
                                <div className={`rounded-lg p-2 ${tipoDispositivo.bgColor}`}>
                                    <Activity
                                        className={`h-5 w-5 ${tipoDispositivo.color}`}
                                    />
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                        Estado
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <div
                                            className={`h-2 w-2 rounded-full ${
                                                dispositivo.esta_online
                                                    ? 'bg-green-500'
                                                    : 'bg-red-500'
                                            }`}
                                        />
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                            {dispositivo.esta_online ? 'En línea' : 'Desconectado'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-sidebar-border/70 bg-white shadow dark:border-sidebar-border dark:bg-gray-800">
                        <div className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900">
                                    <Power
                                        className={`h-5 w-5 ${
                                            dispositivo.activo
                                                ? 'text-green-600'
                                                : 'text-gray-400'
                                        }`}
                                    />
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                        Activo
                                    </p>
                                    <button
                                        onClick={handleToggleActivo}
                                        className="text-sm font-semibold text-gray-900 hover:text-blue-600 dark:text-gray-100 dark:hover:text-blue-400"
                                    >
                                        {dispositivo.activo ? 'Sí' : 'No'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {dispositivo.ultima_lectura && (
                        <div className="overflow-hidden rounded-xl border border-sidebar-border/70 bg-white shadow dark:border-sidebar-border dark:bg-gray-800">
                            <div className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900">
                                        <Zap className="h-5 w-5 text-purple-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                            Potencia Actual
                                        </p>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                            {dispositivo.ultima_lectura.potencia_total_kw} kW
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="overflow-hidden rounded-xl border border-sidebar-border/70 bg-white shadow dark:border-sidebar-border dark:bg-gray-800">
                        <div className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="rounded-lg bg-indigo-100 p-2 dark:bg-indigo-900">
                                    <BarChart3 className="h-5 w-5 text-indigo-600" />
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                        Lecturas
                                    </p>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                        {dispositivo.lecturas_count}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Información principal */}
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="overflow-hidden rounded-xl border border-sidebar-border/70 bg-white shadow dark:border-sidebar-border dark:bg-gray-800">
                        <div className="p-6">
                            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                                Información del Dispositivo
                            </h2>
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <Zap className="h-4 w-4" />
                                    <span className="font-medium">Tipo:</span>
                                    <span
                                        className={`font-semibold ${tipoDispositivo.color}`}
                                    >
                                        {tipoDispositivo.label}
                                    </span>
                                </div>
                                {dispositivo.modelo && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <Server className="h-4 w-4" />
                                        <span className="font-medium">Modelo:</span>
                                        <span>{dispositivo.modelo}</span>
                                    </div>
                                )}
                                {dispositivo.num_fases && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <Settings className="h-4 w-4" />
                                        <span className="font-medium">Fases:</span>
                                        <span>{dispositivo.fases_label}</span>
                                    </div>
                                )}
                                {dispositivo.ip_local && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <Wifi className="h-4 w-4" />
                                        <span className="font-medium">IP Local:</span>
                                        <span>{dispositivo.ip_local}</span>
                                    </div>
                                )}
                                {dispositivo.firmware && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <Settings className="h-4 w-4" />
                                        <span className="font-medium">Firmware:</span>
                                        <span>{dispositivo.firmware}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-sidebar-border/70 bg-white shadow dark:border-sidebar-border dark:bg-gray-800">
                        <div className="p-6">
                            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                                Ubicación
                            </h2>
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <Building2 className="h-4 w-4" />
                                    <span className="font-medium">Organización:</span>
                                    <span>{dispositivo.sitio.organizacion.nombre}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <MapPin className="h-4 w-4" />
                                    <span className="font-medium">Sitio:</span>
                                    <span>{dispositivo.sitio.nombre}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <span className="font-medium">Código:</span>
                                    <span>{dispositivo.sitio.codigo}</span>
                                </div>
                                <button
                                    onClick={() => router.visit(`/sitios/${dispositivo.sitio.id}`)}
                                    className="mt-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                >
                                    Ver detalles del sitio →
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Nombres de Canales */}
                <div className="overflow-hidden rounded-xl border border-sidebar-border/70 bg-white shadow dark:border-sidebar-border dark:bg-gray-800">
                    <div className="p-6">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                Nombres y Colores de Canales
                            </h2>
                            {!editandoNombres ? (
                                <button
                                    onClick={() => setEditandoNombres(true)}
                                    className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                                >
                                    <Pencil className="h-4 w-4" />
                                    Editar Nombres y Colores
                                </button>
                            ) : (
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleGuardarNombresCanales}
                                        className="inline-flex items-center gap-2 rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
                                    >
                                        Guardar
                                    </button>
                                    <button
                                        onClick={() => {
                                            setEditandoNombres(false);
                                            setNombresCanales({
                                                nombre_canal_1: dispositivo.nombre_canal_1 || 'Canal 1',
                                                nombre_canal_2: dispositivo.nombre_canal_2 || 'Canal 2',
                                                nombre_canal_3: dispositivo.nombre_canal_3 || 'Canal 3',
                                            });
                                            setColoresCanales({
                                                color_canal_1: dispositivo.color_canal_1 ?? '#ef4444',
                                                color_canal_2: dispositivo.color_canal_2 ?? '#22c55e',
                                                color_canal_3: dispositivo.color_canal_3 ?? '#eab308',
                                            });
                                        }}
                                        className="inline-flex items-center gap-2 rounded-md bg-gray-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="grid gap-4 sm:grid-cols-3">
                            {dispositivo.num_fases && dispositivo.num_fases >= 1 && (
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Canal 1
                                    </label>
                                    {editandoNombres ? (
                                        <div className="space-y-2">
                                            <input
                                                type="text"
                                                value={nombresCanales.nombre_canal_1}
                                                onChange={(e) =>
                                                    setNombresCanales({
                                                        ...nombresCanales,
                                                        nombre_canal_1: e.target.value,
                                                    })
                                                }
                                                className="w-full rounded-md border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                                placeholder="Ej: Producción Solar"
                                            />
                                            <div className="flex items-center gap-2">
                                                <label className="text-xs text-gray-600 dark:text-gray-400">
                                                    Color:
                                                </label>
                                                <input
                                                    type="color"
                                                    value={coloresCanales.color_canal_1}
                                                    onChange={(e) =>
                                                        setColoresCanales({
                                                            ...coloresCanales,
                                                            color_canal_1: e.target.value,
                                                        })
                                                    }
                                                    className="h-8 w-16 cursor-pointer rounded border border-gray-300 dark:border-gray-600"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                {obtenerNombreCanal(1)}
                                            </p>
                                            <div className="mt-1 flex items-center gap-2">
                                                <div
                                                    className="h-4 w-4 rounded"
                                                    style={{ backgroundColor: coloresCanales.color_canal_1 }}
                                                />
                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                    {coloresCanales.color_canal_1}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                            {dispositivo.num_fases && dispositivo.num_fases >= 2 && (
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Canal 2
                                    </label>
                                    {editandoNombres ? (
                                        <div className="space-y-2">
                                            <input
                                                type="text"
                                                value={nombresCanales.nombre_canal_2}
                                                onChange={(e) =>
                                                    setNombresCanales({
                                                        ...nombresCanales,
                                                        nombre_canal_2: e.target.value,
                                                    })
                                                }
                                                className="w-full rounded-md border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                                placeholder="Ej: Consumo General"
                                            />
                                            <div className="flex items-center gap-2">
                                                <label className="text-xs text-gray-600 dark:text-gray-400">
                                                    Color:
                                                </label>
                                                <input
                                                    type="color"
                                                    value={coloresCanales.color_canal_2}
                                                    onChange={(e) =>
                                                        setColoresCanales({
                                                            ...coloresCanales,
                                                            color_canal_2: e.target.value,
                                                        })
                                                    }
                                                    className="h-8 w-16 cursor-pointer rounded border border-gray-300 dark:border-gray-600"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                {obtenerNombreCanal(2)}
                                            </p>
                                            <div className="mt-1 flex items-center gap-2">
                                                <div
                                                    className="h-4 w-4 rounded"
                                                    style={{ backgroundColor: coloresCanales.color_canal_2 }}
                                                />
                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                    {coloresCanales.color_canal_2}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                            {dispositivo.num_fases && dispositivo.num_fases >= 3 && (
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Canal 3
                                    </label>
                                    {editandoNombres ? (
                                        <div className="space-y-2">
                                            <input
                                                type="text"
                                                value={nombresCanales.nombre_canal_3}
                                                onChange={(e) =>
                                                    setNombresCanales({
                                                        ...nombresCanales,
                                                        nombre_canal_3: e.target.value,
                                                    })
                                                }
                                                className="w-full rounded-md border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                                placeholder="Ej: Red Eléctrica"
                                            />
                                            <div className="flex items-center gap-2">
                                                <label className="text-xs text-gray-600 dark:text-gray-400">
                                                    Color:
                                                </label>
                                                <input
                                                    type="color"
                                                    value={coloresCanales.color_canal_3}
                                                    onChange={(e) =>
                                                        setColoresCanales({
                                                            ...coloresCanales,
                                                            color_canal_3: e.target.value,
                                                        })
                                                    }
                                                    className="h-8 w-16 cursor-pointer rounded border border-gray-300 dark:border-gray-600"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                {obtenerNombreCanal(3)}
                                            </p>
                                            <div className="mt-1 flex items-center gap-2">
                                                <div
                                                    className="h-4 w-4 rounded"
                                                    style={{ backgroundColor: coloresCanales.color_canal_3 }}
                                                />
                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                    {coloresCanales.color_canal_3}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Última lectura */}
                {dispositivo.ultima_lectura && (
                    <div className="overflow-hidden rounded-xl border border-sidebar-border/70 bg-white shadow dark:border-sidebar-border dark:bg-gray-800">
                        <div className="p-6">
                            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                                Última Lectura
                            </h2>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                <div>
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                        Fecha
                                    </p>
                                    <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
                                        {new Date(dispositivo.ultima_lectura.fecha).toLocaleString(
                                            'es-ES',
                                            {
                                                day: '2-digit',
                                                month: '2-digit',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            }
                                        )}
                                    </p>
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                        {dispositivo.ultima_lectura.fecha_human}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                        Potencia Total
                                    </p>
                                    <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                                        {dispositivo.ultima_lectura.potencia_total_kw} kW
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                        Energía Total
                                    </p>
                                    <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                                        {dispositivo.ultima_lectura.energia_total_kwh} kWh
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                        Estado Conexión
                                    </p>
                                    <div className="mt-1 flex items-center gap-2">
                                        <div
                                            className={`h-2 w-2 rounded-full ${
                                                dispositivo.esta_online
                                                    ? 'bg-green-500'
                                                    : 'bg-red-500'
                                            }`}
                                        />
                                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                            {dispositivo.esta_online ? 'En línea' : 'Desconectado'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Gráficas de Potencia por Canal */}
                {graficas && graficas.labels.length > 0 && (
                    <div>
                        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                            Potencia por Canal (Últimas 24 horas)
                        </h2>
                        <div className="grid gap-4 lg:grid-cols-3">
                            {/* Canal 1 - Mostrar si hay datos o si num_fases >= 1 */}
                            {(graficas.canal1.some(v => v > 0) || (dispositivo.num_fases && dispositivo.num_fases >= 1) || !dispositivo.num_fases) && (
                                <div className="overflow-hidden rounded-xl border border-sidebar-border/70 bg-white shadow dark:border-sidebar-border dark:bg-gray-800">
                                    <div className="p-6">
                                        <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-gray-100">
                                            Potencia {obtenerNombreCanal(1)}
                                        </h3>
                                        <div className="h-64 w-full">
                                            <Line data={dataCanal1} options={chartOptions} />
                                        </div>
                                    </div>
                                </div>
                            )}
                            {/* Canal 2 - Mostrar si hay datos o si num_fases >= 2 */}
                            {(graficas.canal2.some(v => v > 0) || (dispositivo.num_fases && dispositivo.num_fases >= 2)) && (
                                <div className="overflow-hidden rounded-xl border border-sidebar-border/70 bg-white shadow dark:border-sidebar-border dark:bg-gray-800">
                                    <div className="p-6">
                                        <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-gray-100">
                                            Potencia {obtenerNombreCanal(2)}
                                        </h3>
                                        <div className="h-64 w-full">
                                            <Line data={dataCanal2} options={chartOptions} />
                                        </div>
                                    </div>
                                </div>
                            )}
                            {/* Canal 3 - Mostrar si hay datos o si num_fases >= 3 */}
                            {(graficas.canal3.some(v => v > 0) || (dispositivo.num_fases && dispositivo.num_fases >= 3)) && (
                                <div className="overflow-hidden rounded-xl border border-sidebar-border/70 bg-white shadow dark:border-sidebar-border dark:bg-gray-800">
                                    <div className="p-6">
                                        <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-gray-100">
                                            Potencia {obtenerNombreCanal(3)}
                                        </h3>
                                        <div className="h-64 w-full">
                                            <Line data={dataCanal3} options={chartOptions} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Configuración */}
                {dispositivo.configuracion && Object.keys(dispositivo.configuracion).length > 0 && (
                    <div className="overflow-hidden rounded-xl border border-sidebar-border/70 bg-white shadow dark:border-sidebar-border dark:bg-gray-800">
                        <div className="p-6">
                            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                                Configuración
                            </h2>
                            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
                                <pre className="overflow-x-auto text-xs text-gray-700 dark:text-gray-300">
                                    {JSON.stringify(dispositivo.configuracion, null, 2)}
                                </pre>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

