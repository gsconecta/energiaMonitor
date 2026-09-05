import AppLayout from '@/layouts/app-layout';
import { dashboard } from '@/routes';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import {
    Activity,
    BarChart3,
    Building2,
    MapPin,
    Pencil,
    Power,
    RefreshCw,
    Server,
    Settings,
    Trash2,
    Wifi,
    Zap,
} from 'lucide-react';
import { useState } from 'react';

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

interface Dispositivo {
    id: number;
    device_id: string;
    nombre: string;
    num_fases: number | null;
    fases_label: string;
    nombre_canal_1: string | null;
    nombre_canal_2: string | null;
    nombre_canal_3: string | null;
    color_canal_1: string;
    color_canal_2: string;
    color_canal_3: string;
    tipo_canal_1: string | null;
    tipo_canal_2: string | null;
    tipo_canal_3: string | null;
    invertir_sentido_canal_1: boolean;
    invertir_sentido_canal_2: boolean;
    invertir_sentido_canal_3: boolean;
    modelo: string | null;
    modelo_dispositivo_id: number | null;
    num_canales: number;
    modo_canales: 'circuitos' | 'fases';
    driver_label: string;
    driver_disponible: boolean;
    conexion_resumen: string | null;
    ip_local: string | null;
    firmware: string | null;
    activo: boolean;
    configuracion: Record<string, any> | null;
    sitio: Sitio;
    lecturas_count: number;
    esta_online: boolean;
    ultima_lectura: UltimaLectura | null;
}

interface MetricasEnergia {
    consumo_casa_kw: number;
    exportacion_neta_kw: number;
    generacion_fotovoltaica_kw: number;
    carga_baterias_kw: number;
    importacion_red_kw: number;
    exportacion_red_kw: number;
}

interface Props {
    dispositivo: Dispositivo;
    metricas_energia?: MetricasEnergia | null;
    panel_global_mode: boolean;
}

export default function DispositivosShow({
    dispositivo,
    metricas_energia,
    panel_global_mode,
}: Props) {
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
    const [tiposCanales, setTiposCanales] = useState({
        tipo_canal_1: dispositivo.tipo_canal_1 ?? null,
        tipo_canal_2: dispositivo.tipo_canal_2 ?? null,
        tipo_canal_3: dispositivo.tipo_canal_3 ?? null,
    });
    const [invertirSentidoCanales, setInvertirSentidoCanales] = useState({
        invertir_sentido_canal_1: dispositivo.invertir_sentido_canal_1,
        invertir_sentido_canal_2: dispositivo.invertir_sentido_canal_2,
        invertir_sentido_canal_3: dispositivo.invertir_sentido_canal_3,
    });

    // Un dispositivo de legado sin modelo asignado no puede guardar desde este panel: el
    // modelo es obligatorio y aquí no hay selector para asignarlo.
    const sinModeloAsignado = dispositivo.modelo_dispositivo_id === null;

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
            },
        );
    };

    const handleVerDashboard = () => {
        if (panel_global_mode) {
            router.post(
                `/admin/impersonate/${dispositivo.sitio.organizacion.id}/${dispositivo.sitio.id}`,
            );
            return;
        }

        router.get(dashboard().url, { dispositivo_id: dispositivo.id });
    };

    const handleGuardarNombresCanales = () => {
        // Un canal está disponible cuando su número no supera el num_canales del modelo:
        // los que sobran se anulan explícitamente (el servidor los rechaza si llegan con
        // datos). No se manda `conexion`: este panel no la gestiona, y el servidor conserva
        // la ya guardada cuando la clave no está presente en la petición.
        const canalDisponible = (canal: number) =>
            canal <= dispositivo.num_canales;

        router.put(
            `/dispositivos/${dispositivo.id}`,
            {
                sitio_id: dispositivo.sitio.id,
                device_id: dispositivo.device_id,
                nombre: dispositivo.nombre,
                modelo_dispositivo_id: dispositivo.modelo_dispositivo_id,
                modo_canales: dispositivo.modo_canales,
                num_fases: dispositivo.num_fases,
                nombre_canal_1: nombresCanales.nombre_canal_1 || null,
                nombre_canal_2: canalDisponible(2)
                    ? nombresCanales.nombre_canal_2 || null
                    : null,
                nombre_canal_3: canalDisponible(3)
                    ? nombresCanales.nombre_canal_3 || null
                    : null,
                color_canal_1: coloresCanales.color_canal_1,
                color_canal_2: canalDisponible(2)
                    ? coloresCanales.color_canal_2
                    : null,
                color_canal_3: canalDisponible(3)
                    ? coloresCanales.color_canal_3
                    : null,
                tipo_canal_1: tiposCanales.tipo_canal_1 || null,
                tipo_canal_2: canalDisponible(2)
                    ? tiposCanales.tipo_canal_2 || null
                    : null,
                tipo_canal_3: canalDisponible(3)
                    ? tiposCanales.tipo_canal_3 || null
                    : null,
                invertir_sentido_canal_1:
                    invertirSentidoCanales.invertir_sentido_canal_1,
                invertir_sentido_canal_2: canalDisponible(2)
                    ? invertirSentidoCanales.invertir_sentido_canal_2
                    : false,
                invertir_sentido_canal_3: canalDisponible(3)
                    ? invertirSentidoCanales.invertir_sentido_canal_3
                    : false,
                ip_local: dispositivo.ip_local,
                firmware: dispositivo.firmware,
                activo: dispositivo.activo,
            },
            {
                onSuccess: () => {
                    setEditandoNombres(false);
                },
            },
        );
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
                            {panel_global_mode
                                ? 'Abrir Dashboard del sitio'
                                : 'Ver Dashboard'}
                        </button>
                        <button
                            onClick={handleSincronizar}
                            disabled={
                                sincronizando || !dispositivo.driver_disponible
                            }
                            className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium ${
                                sincronizando || !dispositivo.driver_disponible
                                    ? 'cursor-not-allowed bg-gray-400'
                                    : 'bg-indigo-600 hover:bg-indigo-700'
                            } text-white`}
                            title={
                                dispositivo.driver_disponible
                                    ? undefined
                                    : 'Este modelo aún no tiene lector'
                            }
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
                                <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900">
                                    <Activity className="h-5 w-5 text-blue-600" />
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
                                            {dispositivo.esta_online
                                                ? 'En línea'
                                                : 'Desconectado'}
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
                                            {
                                                dispositivo.ultima_lectura
                                                    .potencia_total_kw
                                            }{' '}
                                            kW
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
                                {dispositivo.modelo && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <Server className="h-4 w-4" />
                                        <span className="font-medium">
                                            Modelo:
                                        </span>
                                        <span>{dispositivo.modelo}</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <Server className="h-4 w-4" />
                                    <span className="font-medium">Driver:</span>
                                    <span>{dispositivo.driver_label}</span>
                                    {!dispositivo.driver_disponible && (
                                        <span className="text-amber-700 dark:text-amber-400">
                                            (sin lector)
                                        </span>
                                    )}
                                </div>
                                {dispositivo.conexion_resumen && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <Server className="h-4 w-4" />
                                        <span className="font-medium">
                                            Conexión:
                                        </span>
                                        <span className="font-mono">
                                            {dispositivo.conexion_resumen}
                                        </span>
                                    </div>
                                )}
                                {dispositivo.num_fases && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <Settings className="h-4 w-4" />
                                        <span className="font-medium">
                                            Fases:
                                        </span>
                                        <span>{dispositivo.fases_label}</span>
                                    </div>
                                )}
                                {dispositivo.ip_local && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <Wifi className="h-4 w-4" />
                                        <span className="font-medium">
                                            IP Local:
                                        </span>
                                        <span>{dispositivo.ip_local}</span>
                                    </div>
                                )}
                                {dispositivo.firmware && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <Settings className="h-4 w-4" />
                                        <span className="font-medium">
                                            Firmware:
                                        </span>
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
                                    <span className="font-medium">
                                        Organización:
                                    </span>
                                    <span>
                                        {dispositivo.sitio.organizacion.nombre}
                                    </span>
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
                                {!panel_global_mode && (
                                    <button
                                        onClick={() =>
                                            router.visit(
                                                `/sitios/${dispositivo.sitio.id}`,
                                            )
                                        }
                                        className="mt-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                    >
                                        Ver detalles del sitio →
                                    </button>
                                )}
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
                                <div className="text-right">
                                    <button
                                        onClick={() => setEditandoNombres(true)}
                                        disabled={sinModeloAsignado}
                                        className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-white ${
                                            sinModeloAsignado
                                                ? 'cursor-not-allowed bg-gray-400'
                                                : 'bg-blue-600 hover:bg-blue-700'
                                        }`}
                                        title={
                                            sinModeloAsignado
                                                ? 'Asigna primero un modelo desde el listado de dispositivos'
                                                : undefined
                                        }
                                    >
                                        <Pencil className="h-4 w-4" />
                                        Editar Nombres y Colores
                                    </button>
                                    {sinModeloAsignado && (
                                        <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                                            Asigna primero un modelo desde el
                                            listado de dispositivos.
                                        </p>
                                    )}
                                </div>
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
                                                nombre_canal_1:
                                                    dispositivo.nombre_canal_1 ||
                                                    'Canal 1',
                                                nombre_canal_2:
                                                    dispositivo.nombre_canal_2 ||
                                                    'Canal 2',
                                                nombre_canal_3:
                                                    dispositivo.nombre_canal_3 ||
                                                    'Canal 3',
                                            });
                                            setColoresCanales({
                                                color_canal_1:
                                                    dispositivo.color_canal_1 ??
                                                    '#ef4444',
                                                color_canal_2:
                                                    dispositivo.color_canal_2 ??
                                                    '#22c55e',
                                                color_canal_3:
                                                    dispositivo.color_canal_3 ??
                                                    '#eab308',
                                            });
                                            setTiposCanales({
                                                tipo_canal_1:
                                                    dispositivo.tipo_canal_1 ??
                                                    null,
                                                tipo_canal_2:
                                                    dispositivo.tipo_canal_2 ??
                                                    null,
                                                tipo_canal_3:
                                                    dispositivo.tipo_canal_3 ??
                                                    null,
                                            });
                                            setInvertirSentidoCanales({
                                                invertir_sentido_canal_1:
                                                    dispositivo.invertir_sentido_canal_1,
                                                invertir_sentido_canal_2:
                                                    dispositivo.invertir_sentido_canal_2,
                                                invertir_sentido_canal_3:
                                                    dispositivo.invertir_sentido_canal_3,
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
                            {dispositivo.num_fases &&
                                dispositivo.num_fases >= 1 && (
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Canal 1
                                        </label>
                                        {editandoNombres ? (
                                            <div className="space-y-2">
                                                <input
                                                    type="text"
                                                    value={
                                                        nombresCanales.nombre_canal_1
                                                    }
                                                    onChange={(e) =>
                                                        setNombresCanales({
                                                            ...nombresCanales,
                                                            nombre_canal_1:
                                                                e.target.value,
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
                                                        value={
                                                            coloresCanales.color_canal_1
                                                        }
                                                        onChange={(e) =>
                                                            setColoresCanales({
                                                                ...coloresCanales,
                                                                color_canal_1:
                                                                    e.target
                                                                        .value,
                                                            })
                                                        }
                                                        className="h-8 w-16 cursor-pointer rounded border border-gray-300 dark:border-gray-600"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">
                                                        Tipo:
                                                    </label>
                                                    <select
                                                        value={
                                                            tiposCanales.tipo_canal_1 ||
                                                            ''
                                                        }
                                                        onChange={(e) =>
                                                            setTiposCanales({
                                                                ...tiposCanales,
                                                                tipo_canal_1:
                                                                    e.target
                                                                        .value ||
                                                                    null,
                                                            })
                                                        }
                                                        className="w-full rounded-md border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                                    >
                                                        <option value="">
                                                            Seleccionar tipo
                                                        </option>
                                                        <option value="fotovoltaica">
                                                            Fotovoltaica
                                                        </option>
                                                        <option value="red_electrica">
                                                            Red Eléctrica
                                                        </option>
                                                    </select>
                                                </div>
                                                <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                                                    <input
                                                        type="checkbox"
                                                        checked={
                                                            invertirSentidoCanales.invertir_sentido_canal_1
                                                        }
                                                        onChange={(e) =>
                                                            setInvertirSentidoCanales(
                                                                {
                                                                    ...invertirSentidoCanales,
                                                                    invertir_sentido_canal_1:
                                                                        e.target
                                                                            .checked,
                                                                },
                                                            )
                                                        }
                                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <span>
                                                        Invertir sentido
                                                    </span>
                                                </label>
                                            </div>
                                        ) : (
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                    {obtenerNombreCanal(1)}
                                                </p>
                                                <div className="mt-1 flex items-center gap-2">
                                                    <div
                                                        className="h-4 w-4 rounded"
                                                        style={{
                                                            backgroundColor:
                                                                coloresCanales.color_canal_1,
                                                        }}
                                                    />
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                        {
                                                            coloresCanales.color_canal_1
                                                        }
                                                    </span>
                                                </div>
                                                {tiposCanales.tipo_canal_1 && (
                                                    <div className="mt-1">
                                                        <span
                                                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                                                tiposCanales.tipo_canal_1 ===
                                                                'fotovoltaica'
                                                                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                                            }`}
                                                        >
                                                            {tiposCanales.tipo_canal_1 ===
                                                            'fotovoltaica'
                                                                ? 'Fotovoltaica'
                                                                : 'Red Eléctrica'}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            {dispositivo.num_fases &&
                                dispositivo.num_fases >= 2 && (
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Canal 2
                                        </label>
                                        {editandoNombres ? (
                                            <div className="space-y-2">
                                                <input
                                                    type="text"
                                                    value={
                                                        nombresCanales.nombre_canal_2
                                                    }
                                                    onChange={(e) =>
                                                        setNombresCanales({
                                                            ...nombresCanales,
                                                            nombre_canal_2:
                                                                e.target.value,
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
                                                        value={
                                                            coloresCanales.color_canal_2
                                                        }
                                                        onChange={(e) =>
                                                            setColoresCanales({
                                                                ...coloresCanales,
                                                                color_canal_2:
                                                                    e.target
                                                                        .value,
                                                            })
                                                        }
                                                        className="h-8 w-16 cursor-pointer rounded border border-gray-300 dark:border-gray-600"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">
                                                        Tipo:
                                                    </label>
                                                    <select
                                                        value={
                                                            tiposCanales.tipo_canal_2 ||
                                                            ''
                                                        }
                                                        onChange={(e) =>
                                                            setTiposCanales({
                                                                ...tiposCanales,
                                                                tipo_canal_2:
                                                                    e.target
                                                                        .value ||
                                                                    null,
                                                            })
                                                        }
                                                        className="w-full rounded-md border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                                    >
                                                        <option value="">
                                                            Seleccionar tipo
                                                        </option>
                                                        <option value="fotovoltaica">
                                                            Fotovoltaica
                                                        </option>
                                                        <option value="red_electrica">
                                                            Red Eléctrica
                                                        </option>
                                                    </select>
                                                </div>
                                                <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                                                    <input
                                                        type="checkbox"
                                                        checked={
                                                            invertirSentidoCanales.invertir_sentido_canal_2
                                                        }
                                                        onChange={(e) =>
                                                            setInvertirSentidoCanales(
                                                                {
                                                                    ...invertirSentidoCanales,
                                                                    invertir_sentido_canal_2:
                                                                        e.target
                                                                            .checked,
                                                                },
                                                            )
                                                        }
                                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <span>
                                                        Invertir sentido
                                                    </span>
                                                </label>
                                            </div>
                                        ) : (
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                    {obtenerNombreCanal(2)}
                                                </p>
                                                <div className="mt-1 flex items-center gap-2">
                                                    <div
                                                        className="h-4 w-4 rounded"
                                                        style={{
                                                            backgroundColor:
                                                                coloresCanales.color_canal_2,
                                                        }}
                                                    />
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                        {
                                                            coloresCanales.color_canal_2
                                                        }
                                                    </span>
                                                </div>
                                                {tiposCanales.tipo_canal_2 && (
                                                    <div className="mt-1">
                                                        <span
                                                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                                                tiposCanales.tipo_canal_2 ===
                                                                'fotovoltaica'
                                                                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                                            }`}
                                                        >
                                                            {tiposCanales.tipo_canal_2 ===
                                                            'fotovoltaica'
                                                                ? 'Fotovoltaica'
                                                                : 'Red Eléctrica'}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            {dispositivo.num_fases &&
                                dispositivo.num_fases >= 3 && (
                                    <div>
                                        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Canal 3
                                        </label>
                                        {editandoNombres ? (
                                            <div className="space-y-2">
                                                <input
                                                    type="text"
                                                    value={
                                                        nombresCanales.nombre_canal_3
                                                    }
                                                    onChange={(e) =>
                                                        setNombresCanales({
                                                            ...nombresCanales,
                                                            nombre_canal_3:
                                                                e.target.value,
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
                                                        value={
                                                            coloresCanales.color_canal_3
                                                        }
                                                        onChange={(e) =>
                                                            setColoresCanales({
                                                                ...coloresCanales,
                                                                color_canal_3:
                                                                    e.target
                                                                        .value,
                                                            })
                                                        }
                                                        className="h-8 w-16 cursor-pointer rounded border border-gray-300 dark:border-gray-600"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="mb-1 block text-xs text-gray-600 dark:text-gray-400">
                                                        Tipo:
                                                    </label>
                                                    <select
                                                        value={
                                                            tiposCanales.tipo_canal_3 ||
                                                            ''
                                                        }
                                                        onChange={(e) =>
                                                            setTiposCanales({
                                                                ...tiposCanales,
                                                                tipo_canal_3:
                                                                    e.target
                                                                        .value ||
                                                                    null,
                                                            })
                                                        }
                                                        className="w-full rounded-md border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                                    >
                                                        <option value="">
                                                            Seleccionar tipo
                                                        </option>
                                                        <option value="fotovoltaica">
                                                            Fotovoltaica
                                                        </option>
                                                        <option value="red_electrica">
                                                            Red Eléctrica
                                                        </option>
                                                    </select>
                                                </div>
                                                <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                                                    <input
                                                        type="checkbox"
                                                        checked={
                                                            invertirSentidoCanales.invertir_sentido_canal_3
                                                        }
                                                        onChange={(e) =>
                                                            setInvertirSentidoCanales(
                                                                {
                                                                    ...invertirSentidoCanales,
                                                                    invertir_sentido_canal_3:
                                                                        e.target
                                                                            .checked,
                                                                },
                                                            )
                                                        }
                                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <span>
                                                        Invertir sentido
                                                    </span>
                                                </label>
                                            </div>
                                        ) : (
                                            <div>
                                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                                    {obtenerNombreCanal(3)}
                                                </p>
                                                <div className="mt-1 flex items-center gap-2">
                                                    <div
                                                        className="h-4 w-4 rounded"
                                                        style={{
                                                            backgroundColor:
                                                                coloresCanales.color_canal_3,
                                                        }}
                                                    />
                                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                                        {
                                                            coloresCanales.color_canal_3
                                                        }
                                                    </span>
                                                </div>
                                                {tiposCanales.tipo_canal_3 && (
                                                    <div className="mt-1">
                                                        <span
                                                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                                                tiposCanales.tipo_canal_3 ===
                                                                'fotovoltaica'
                                                                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                                            }`}
                                                        >
                                                            {tiposCanales.tipo_canal_3 ===
                                                            'fotovoltaica'
                                                                ? 'Fotovoltaica'
                                                                : 'Red Eléctrica'}
                                                        </span>
                                                    </div>
                                                )}
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
                                        {new Date(
                                            dispositivo.ultima_lectura.fecha,
                                        ).toLocaleString('es-ES', {
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                        })}
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
                                        {
                                            dispositivo.ultima_lectura
                                                .potencia_total_kw
                                        }{' '}
                                        kW
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                        Energía Total
                                    </p>
                                    <p className="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
                                        {
                                            dispositivo.ultima_lectura
                                                .energia_total_kwh
                                        }{' '}
                                        kWh
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
                                            {dispositivo.esta_online
                                                ? 'En línea'
                                                : 'Desconectado'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Interpretación de Valores y Consumo de la Casa */}
                {metricas_energia && (
                    <div className="overflow-hidden rounded-xl border border-sidebar-border/70 bg-white shadow dark:border-sidebar-border dark:bg-gray-800">
                        <div className="p-6">
                            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                                Balance Energético
                            </h2>
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                <div className="rounded-lg bg-orange-50 p-4 dark:bg-orange-900/20">
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                        Consumo de la Casa
                                    </p>
                                    <p className="mt-1 text-2xl font-bold text-orange-600 dark:text-orange-400">
                                        {metricas_energia.consumo_casa_kw} kW
                                    </p>
                                </div>
                                <div className="rounded-lg bg-yellow-50 p-4 dark:bg-yellow-900/20">
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                        Generación Fotovoltaica
                                    </p>
                                    <p className="mt-1 text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                                        {
                                            metricas_energia.generacion_fotovoltaica_kw
                                        }{' '}
                                        kW
                                    </p>
                                </div>
                                <div
                                    className={`rounded-lg p-4 ${
                                        metricas_energia.exportacion_neta_kw >=
                                        0
                                            ? 'bg-green-50 dark:bg-green-900/20'
                                            : 'bg-red-50 dark:bg-red-900/20'
                                    }`}
                                >
                                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                        {metricas_energia.exportacion_neta_kw >=
                                        0
                                            ? 'Exportación Neta'
                                            : 'Importación Neta'}
                                    </p>
                                    <p
                                        className={`mt-1 text-2xl font-bold ${
                                            metricas_energia.exportacion_neta_kw >=
                                            0
                                                ? 'text-green-600 dark:text-green-400'
                                                : 'text-red-600 dark:text-red-400'
                                        }`}
                                    >
                                        {Math.abs(
                                            metricas_energia.exportacion_neta_kw,
                                        )}{' '}
                                        kW
                                    </p>
                                </div>
                                {metricas_energia.carga_baterias_kw > 0 && (
                                    <div className="rounded-lg bg-purple-50 p-4 dark:bg-purple-900/20">
                                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                            Carga de Baterías
                                        </p>
                                        <p className="mt-1 text-2xl font-bold text-purple-600 dark:text-purple-400">
                                            {metricas_energia.carga_baterias_kw}{' '}
                                            kW
                                        </p>
                                    </div>
                                )}
                                {metricas_energia.importacion_red_kw > 0 && (
                                    <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
                                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                            Importación de Red
                                        </p>
                                        <p className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">
                                            {
                                                metricas_energia.importacion_red_kw
                                            }{' '}
                                            kW
                                        </p>
                                    </div>
                                )}
                                {metricas_energia.exportacion_red_kw > 0 && (
                                    <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
                                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                            Exportación a Red
                                        </p>
                                        <p className="mt-1 text-2xl font-bold text-green-600 dark:text-green-400">
                                            {
                                                metricas_energia.exportacion_red_kw
                                            }{' '}
                                            kW
                                        </p>
                                    </div>
                                )}
                            </div>
                            <div className="mt-6 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
                                <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                                    Interpretación de Valores
                                </h3>
                                <ul className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
                                    <li>
                                        <strong>Canal Fotovoltaica:</strong>{' '}
                                        Positivo (+) = Generando energía solar |
                                        Negativo (-) = Cargando baterías
                                    </li>
                                    <li>
                                        <strong>Canal Red Eléctrica:</strong>{' '}
                                        Positivo (+) = Exportando a la red |
                                        Negativo (-) = Consumiendo de la red
                                    </li>
                                    <li>
                                        <strong>Consumo de la Casa:</strong> FV
                                        + RED (suma algebraica)
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                {/* Configuración */}
                {dispositivo.configuracion &&
                    Object.keys(dispositivo.configuracion).length > 0 && (
                        <div className="overflow-hidden rounded-xl border border-sidebar-border/70 bg-white shadow dark:border-sidebar-border dark:bg-gray-800">
                            <div className="p-6">
                                <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                                    Configuración
                                </h2>
                                <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
                                    <pre className="overflow-x-auto text-xs text-gray-700 dark:text-gray-300">
                                        {JSON.stringify(
                                            dispositivo.configuracion,
                                            null,
                                            2,
                                        )}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    )}
            </div>
        </AppLayout>
    );
}
