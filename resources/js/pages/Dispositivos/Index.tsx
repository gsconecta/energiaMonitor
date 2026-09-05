import CamposConexion, {
    conexionPorDefecto,
    type CampoConexion,
} from '@/components/dispositivos/campos-conexion';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { Activity, Pencil, Plus, Power, RefreshCw, Trash2 } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dispositivos',
        href: '/dispositivos',
    },
];

interface Sitio {
    id: number;
    nombre: string;
    organizacion: {
        id: number | null;
        nombre: string;
    };
}

interface Dispositivo {
    id: number;
    device_id: string;
    nombre: string;
    modelo: string | null;
    modelo_dispositivo_id: number | null;
    modo_canales: 'circuitos' | 'fases';
    driver: string;
    driver_label: string;
    driver_disponible: boolean;
    conexion: Record<string, string | number>;
    ip_local: string | null;
    firmware: string | null;
    activo: boolean;
    num_fases: number | null;
    nombre_canal_1: string | null;
    nombre_canal_2: string | null;
    nombre_canal_3: string | null;
    color_canal_1: string | null;
    color_canal_2: string | null;
    color_canal_3: string | null;
    tipo_canal_1: string | null;
    tipo_canal_2: string | null;
    tipo_canal_3: string | null;
    invertir_sentido_canal_1: boolean;
    invertir_sentido_canal_2: boolean;
    invertir_sentido_canal_3: boolean;
    sitio: Sitio;
    lecturas_count: number;
    esta_online: boolean;
    ultima_lectura: string | null;
    ultima_lectura_fecha: string | null;
    potencia_actual: number;
}

interface ModeloParaFormulario {
    id: number;
    fabricante: string;
    nombre: string;
    activo: boolean;
    driver: string;
    driver_label: string;
    driver_disponible: boolean;
    num_canales: number;
    modo_canales_por_defecto: 'circuitos' | 'fases';
    modo_canales_configurable: boolean;
    campos_conexion: CampoConexion[];
}

interface Props {
    dispositivos: Dispositivo[];
    sitios: Sitio[];
    modelos: ModeloParaFormulario[];
    panel_global_mode: boolean;
}

export default function DispositivosIndex({
    dispositivos,
    sitios,
    modelos,
    panel_global_mode,
}: Props) {
    const { errors } = usePage<{ errors?: Record<string, string> }>().props;
    const [mostrarModal, setMostrarModal] = useState(false);
    const [dispositivoEditando, setDispositivoEditando] =
        useState<Dispositivo | null>(null);
    const [sincronizando, setSincronizando] = useState<number | null>(null);
    const [formData, setFormData] = useState({
        sitio_id: '',
        device_id: '',
        nombre: '',
        modelo_dispositivo_id: '' as string,
        modo_canales: 'circuitos' as 'circuitos' | 'fases',
        conexion: {} as Record<string, string | number>,
        ip_local: '',
        firmware: '',
        activo: true,
        num_fases: null as number | null,
        nombre_canal_1: '',
        nombre_canal_2: '',
        nombre_canal_3: '',
        color_canal_1: '#ef4444',
        color_canal_2: '#22c55e',
        color_canal_3: '#eab308',
        tipo_canal_1: null as string | null,
        tipo_canal_2: null as string | null,
        tipo_canal_3: null as string | null,
        invertir_sentido_canal_1: false,
        invertir_sentido_canal_2: false,
        invertir_sentido_canal_3: false,
    });

    const modeloElegido =
        modelos.find(
            (m) => m.id.toString() === formData.modelo_dispositivo_id,
        ) ?? null;
    const numCanales = modeloElegido?.num_canales ?? 3;
    const esFases = formData.modo_canales === 'fases';
    const modelosSeleccionables = modelos.filter(
        (m) => m.activo || m.id === dispositivoEditando?.modelo_dispositivo_id,
    );

    const elegirModelo = (id: string) => {
        const modelo = modelos.find((m) => m.id.toString() === id) ?? null;
        setFormData({
            ...formData,
            modelo_dispositivo_id: id,
            modo_canales: modelo?.modo_canales_por_defecto ?? 'circuitos',
            conexion: modelo ? conexionPorDefecto(modelo.campos_conexion) : {},
        });
    };

    const abrirModalNuevo = () => {
        setDispositivoEditando(null);
        setFormData({
            sitio_id: sitios[0]?.id.toString() || '',
            device_id: '',
            nombre: '',
            modelo_dispositivo_id: '' as string,
            modo_canales: 'circuitos' as 'circuitos' | 'fases',
            conexion: {} as Record<string, string | number>,
            ip_local: '',
            firmware: '',
            activo: true,
            num_fases: null,
            nombre_canal_1: '',
            nombre_canal_2: '',
            nombre_canal_3: '',
            color_canal_1: '#ef4444',
            color_canal_2: '#22c55e',
            color_canal_3: '#eab308',
            tipo_canal_1: null,
            tipo_canal_2: null,
            tipo_canal_3: null,
            invertir_sentido_canal_1: false,
            invertir_sentido_canal_2: false,
            invertir_sentido_canal_3: false,
        });
        setMostrarModal(true);
    };

    const abrirModalEditar = (dispositivo: Dispositivo) => {
        setDispositivoEditando(dispositivo);
        setFormData({
            sitio_id: dispositivo.sitio.id.toString(),
            device_id: dispositivo.device_id,
            nombre: dispositivo.nombre,
            modelo_dispositivo_id:
                dispositivo.modelo_dispositivo_id?.toString() ?? '',
            modo_canales: dispositivo.modo_canales,
            conexion: dispositivo.conexion ?? {},
            ip_local: dispositivo.ip_local || '',
            firmware: dispositivo.firmware || '',
            activo: dispositivo.activo,
            num_fases: dispositivo.num_fases ?? null,
            nombre_canal_1: dispositivo.nombre_canal_1 || '',
            nombre_canal_2: dispositivo.nombre_canal_2 || '',
            nombre_canal_3: dispositivo.nombre_canal_3 || '',
            color_canal_1: dispositivo.color_canal_1 || '#ef4444',
            color_canal_2: dispositivo.color_canal_2 || '#22c55e',
            color_canal_3: dispositivo.color_canal_3 || '#eab308',
            tipo_canal_1: dispositivo.tipo_canal_1 || null,
            tipo_canal_2: dispositivo.tipo_canal_2 || null,
            tipo_canal_3: dispositivo.tipo_canal_3 || null,
            invertir_sentido_canal_1: dispositivo.invertir_sentido_canal_1,
            invertir_sentido_canal_2: dispositivo.invertir_sentido_canal_2,
            invertir_sentido_canal_3: dispositivo.invertir_sentido_canal_3,
        });
        setMostrarModal(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Un canal está disponible cuando su número no supera el num_canales del modelo elegido.
        const canalDisponible = (canal: number) => canal <= numCanales;

        // Preparar datos para envío, convirtiendo strings vacíos a null. Los canales que el
        // modelo no admite se anulan explícitamente (incluidos los colores, que siempre traen
        // un valor por defecto): el servidor los rechaza si llegan con datos.
        const datosEnvio = {
            ...formData,
            modelo_dispositivo_id: formData.modelo_dispositivo_id
                ? parseInt(formData.modelo_dispositivo_id)
                : null,
            num_fases: formData.num_fases || null,
            nombre_canal_1: formData.nombre_canal_1 || null,
            nombre_canal_2: canalDisponible(2)
                ? formData.nombre_canal_2 || null
                : null,
            nombre_canal_3: canalDisponible(3)
                ? formData.nombre_canal_3 || null
                : null,
            color_canal_2: canalDisponible(2) ? formData.color_canal_2 : null,
            color_canal_3: canalDisponible(3) ? formData.color_canal_3 : null,
            tipo_canal_1: formData.tipo_canal_1 || null,
            tipo_canal_2: canalDisponible(2)
                ? formData.tipo_canal_2 || null
                : null,
            tipo_canal_3: canalDisponible(3)
                ? formData.tipo_canal_3 || null
                : null,
            invertir_sentido_canal_2: canalDisponible(2)
                ? formData.invertir_sentido_canal_2
                : false,
            invertir_sentido_canal_3: canalDisponible(3)
                ? formData.invertir_sentido_canal_3
                : false,
        };

        if (dispositivoEditando) {
            router.put(`/dispositivos/${dispositivoEditando.id}`, datosEnvio, {
                onError: () => {
                    // Mantener el modal abierto si hay errores
                },
                onSuccess: () => {
                    setMostrarModal(false);
                },
            });
        } else {
            router.post('/dispositivos', datosEnvio, {
                onError: () => {
                    // Mantener el modal abierto si hay errores
                },
                onSuccess: () => {
                    setMostrarModal(false);
                },
            });
        }
    };

    const handleEliminar = (id: number) => {
        if (confirm('¿Estás seguro de eliminar este dispositivo?')) {
            router.delete(`/dispositivos/${id}`);
        }
    };

    const handleToggleActivo = (id: number) => {
        router.post(`/dispositivos/${id}/toggle-activo`);
    };

    const handleSincronizar = (id: number) => {
        setSincronizando(id);
        router.post(
            `/dispositivos/${id}/sincronizar`,
            {},
            {
                onSuccess: () => {
                    setSincronizando(null);
                },
                onError: () => {
                    setSincronizando(null);
                },
                onFinish: () => {
                    setSincronizando(null);
                },
            },
        );
    };

    const obtenerTiempoDesdeUltimaLectura = (dispositivo: Dispositivo) => {
        if (!dispositivo.ultima_lectura_fecha) {
            return 'Sin lecturas';
        }

        const fecha = new Date(dispositivo.ultima_lectura_fecha);
        const ahora = new Date();
        const diffMs = ahora.getTime() - fecha.getTime();
        const diffSegundos = Math.floor(diffMs / 1000);
        const diffMinutos = Math.floor(diffSegundos / 60);
        const diffHoras = Math.floor(diffMinutos / 60);
        const diffDias = Math.floor(diffHoras / 24);

        if (diffSegundos < 60) {
            return `Hace ${diffSegundos} segundo${diffSegundos !== 1 ? 's' : ''}`;
        } else if (diffMinutos < 60) {
            return `Hace ${diffMinutos} minuto${diffMinutos !== 1 ? 's' : ''}`;
        } else if (diffHoras < 24) {
            return `Hace ${diffHoras} hora${diffHoras !== 1 ? 's' : ''}`;
        } else {
            return `Hace ${diffDias} día${diffDias !== 1 ? 's' : ''}`;
        }
    };

    const formatoSitio = (sitio: Sitio) =>
        panel_global_mode
            ? `${sitio.organizacion.nombre} -> ${sitio.nombre}`
            : sitio.nombre;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dispositivos" />

            <div className="flex h-full w-full flex-1 flex-col gap-4 overflow-x-hidden p-2 sm:p-4 lg:p-6">
                {/* Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            Dispositivos
                        </h1>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            Gestiona los dispositivos de medición de energía
                        </p>
                    </div>
                    <button
                        onClick={abrirModalNuevo}
                        className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
                    >
                        <Plus className="h-4 w-4" />
                        Nuevo Dispositivo
                    </button>
                </div>

                {/* Tabla de dispositivos */}
                <div className="overflow-hidden rounded-xl border border-sidebar-border/70 bg-white shadow dark:border-sidebar-border dark:bg-gray-800">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-900">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                                        Estado
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                                        Dispositivo
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                                        Sitio
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                                        Última Lectura
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                                        Potencia
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                                {dispositivos.map((dispositivo) => (
                                    <tr
                                        key={dispositivo.id}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className={`h-3 w-3 rounded-full ${
                                                        dispositivo.esta_online
                                                            ? 'bg-green-500'
                                                            : 'bg-red-500'
                                                    }`}
                                                />
                                                <Activity
                                                    className={`h-4 w-4 ${
                                                        dispositivo.activo
                                                            ? 'text-green-500'
                                                            : 'text-gray-400'
                                                    }`}
                                                />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() =>
                                                    router.visit(
                                                        `/dispositivos/${dispositivo.id}`,
                                                    )
                                                }
                                                className="text-left text-sm font-medium text-gray-900 hover:text-blue-600 dark:text-gray-100 dark:hover:text-blue-400"
                                            >
                                                {dispositivo.nombre}
                                            </button>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                {dispositivo.device_id}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                {dispositivo.modelo}
                                                {!dispositivo.driver_disponible && (
                                                    <span className="ml-1 text-amber-700 dark:text-amber-400">
                                                        · sin lector
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-900 dark:text-gray-100">
                                            <div>
                                                {dispositivo.sitio.nombre}
                                            </div>
                                            {panel_global_mode && (
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    {
                                                        dispositivo.sitio
                                                            .organizacion.nombre
                                                    }
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900 dark:text-gray-100">
                                                {obtenerTiempoDesdeUltimaLectura(
                                                    dispositivo,
                                                )}
                                            </div>
                                            {dispositivo.ultima_lectura_fecha && (
                                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                                    {new Date(
                                                        dispositivo.ultima_lectura_fecha,
                                                    ).toLocaleString('es-ES', {
                                                        day: '2-digit',
                                                        month: '2-digit',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-gray-900 dark:text-gray-100">
                                            {dispositivo.potencia_actual} kW
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm font-medium whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() =>
                                                        handleSincronizar(
                                                            dispositivo.id,
                                                        )
                                                    }
                                                    disabled={
                                                        sincronizando ===
                                                            dispositivo.id ||
                                                        !dispositivo.driver_disponible
                                                    }
                                                    className={`rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                                        sincronizando ===
                                                            dispositivo.id ||
                                                        !dispositivo.driver_disponible
                                                            ? 'cursor-not-allowed text-gray-400'
                                                            : 'text-indigo-600'
                                                    }`}
                                                    title={
                                                        dispositivo.driver_disponible
                                                            ? 'Sincronizar manualmente'
                                                            : 'Este modelo aún no tiene lector'
                                                    }
                                                >
                                                    <RefreshCw
                                                        className={`h-4 w-4 ${
                                                            sincronizando ===
                                                            dispositivo.id
                                                                ? 'animate-spin'
                                                                : ''
                                                        }`}
                                                    />
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        handleToggleActivo(
                                                            dispositivo.id,
                                                        )
                                                    }
                                                    className={`rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                                                        dispositivo.activo
                                                            ? 'text-green-600'
                                                            : 'text-gray-400'
                                                    }`}
                                                    title={
                                                        dispositivo.activo
                                                            ? 'Desactivar'
                                                            : 'Activar'
                                                    }
                                                >
                                                    <Power className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        abrirModalEditar(
                                                            dispositivo,
                                                        )
                                                    }
                                                    className="rounded p-1 text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                    title="Editar"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        handleEliminar(
                                                            dispositivo.id,
                                                        )
                                                    }
                                                    className="rounded p-1 text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal de crear/editar */}
            <Dialog open={mostrarModal} onOpenChange={setMostrarModal}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:top-[5%] sm:max-w-[800px] sm:translate-y-0">
                    <DialogHeader>
                        <DialogTitle>
                            {dispositivoEditando
                                ? 'Editar Dispositivo'
                                : 'Nuevo Dispositivo'}
                        </DialogTitle>
                        <DialogDescription>
                            {dispositivoEditando
                                ? 'Modifica la información del dispositivo'
                                : 'Completa los datos para crear un nuevo dispositivo'}
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="grid gap-6 py-4">
                        {/* Datos Básicos */}
                        <div className="grid gap-6 rounded-lg border bg-muted/30 p-4">
                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                <div className="relative grid gap-2">
                                    <Label htmlFor="sitio_id">
                                        Sitio{' '}
                                        <span className="text-red-500">*</span>
                                    </Label>
                                    <select
                                        id="sitio_id"
                                        value={formData.sitio_id}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                sitio_id: e.target.value,
                                            })
                                        }
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                                        required
                                    >
                                        {sitios.map((sitio) => (
                                            <option
                                                key={sitio.id}
                                                value={sitio.id}
                                            >
                                                {formatoSitio(sitio)}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="relative grid gap-2">
                                    <Label htmlFor="device_id">
                                        Device ID{' '}
                                        <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="device_id"
                                        type="text"
                                        value={formData.device_id}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                device_id: e.target.value,
                                            })
                                        }
                                        placeholder="shellyem3-c8c9a33e6505"
                                        required
                                        className={
                                            errors?.device_id
                                                ? 'border-red-500'
                                                : ''
                                        }
                                    />
                                    {errors?.device_id && (
                                        <p className="absolute -bottom-5 text-sm text-red-600 dark:text-red-400">
                                            {errors.device_id}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                <div className="relative grid gap-2">
                                    <Label htmlFor="nombre">
                                        Nombre{' '}
                                        <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="nombre"
                                        type="text"
                                        value={formData.nombre}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                nombre: e.target.value,
                                            })
                                        }
                                        placeholder="Shelly Producción Solar"
                                        required
                                    />
                                </div>

                                <div className="relative grid gap-2">
                                    <Label htmlFor="modelo_dispositivo_id">
                                        Modelo{' '}
                                        <span className="text-red-500">*</span>
                                    </Label>
                                    <select
                                        id="modelo_dispositivo_id"
                                        value={formData.modelo_dispositivo_id}
                                        onChange={(e) =>
                                            elegirModelo(e.target.value)
                                        }
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                        required
                                    >
                                        <option value="">
                                            Selecciona un modelo
                                        </option>
                                        {modelosSeleccionables.map((modelo) => (
                                            <option
                                                key={modelo.id}
                                                value={modelo.id}
                                            >
                                                {modelo.fabricante}{' '}
                                                {modelo.nombre}
                                                {modelo.driver_disponible
                                                    ? ''
                                                    : ' (sin lector)'}
                                            </option>
                                        ))}
                                    </select>
                                    {modeloElegido &&
                                        !modeloElegido.driver_disponible && (
                                            <p className="text-xs text-amber-700 dark:text-amber-400">
                                                Aún sin lector: el dispositivo
                                                se guardará pero no se leerán
                                                datos.
                                            </p>
                                        )}
                                    {errors?.modelo_dispositivo_id && (
                                        <p className="text-sm text-red-600 dark:text-red-400">
                                            {errors.modelo_dispositivo_id}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {modeloElegido?.modo_canales_configurable && (
                                <div className="grid gap-2">
                                    <Label>Modo de canales</Label>
                                    <div className="flex flex-col gap-2 sm:flex-row sm:gap-6">
                                        {(['circuitos', 'fases'] as const).map(
                                            (modo) => (
                                                <label
                                                    key={modo}
                                                    className="flex items-center gap-2 text-sm"
                                                >
                                                    <input
                                                        type="radio"
                                                        name="modo_canales"
                                                        value={modo}
                                                        checked={
                                                            formData.modo_canales ===
                                                            modo
                                                        }
                                                        onChange={() =>
                                                            setFormData({
                                                                ...formData,
                                                                modo_canales:
                                                                    modo,
                                                            })
                                                        }
                                                    />
                                                    {modo === 'circuitos'
                                                        ? 'Circuitos independientes'
                                                        : 'Fases de un mismo circuito'}
                                                </label>
                                            ),
                                        )}
                                    </div>
                                    {errors?.modo_canales && (
                                        <p className="text-sm text-red-600 dark:text-red-400">
                                            {errors.modo_canales}
                                        </p>
                                    )}
                                </div>
                            )}

                            {modeloElegido && (
                                <div className="grid gap-2">
                                    <Label>Conexión</Label>
                                    <CamposConexion
                                        campos={modeloElegido.campos_conexion}
                                        valores={formData.conexion}
                                        onChange={(conexion) =>
                                            setFormData({
                                                ...formData,
                                                conexion,
                                            })
                                        }
                                        errors={errors}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Configuración de Canales */}
                        <div className="grid gap-6 rounded-lg border bg-neutral-50 p-4 dark:bg-neutral-900/50">
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                    Configuración de Canales
                                </h3>
                                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                                    Configura los nombres, colores y tipos de
                                    cada canal del dispositivo
                                </p>
                            </div>

                            {!esFases && (
                                <div className="relative grid gap-2 sm:w-1/2">
                                    <Label htmlFor="num_fases">
                                        Número de Fases
                                    </Label>
                                    <select
                                        id="num_fases"
                                        value={formData.num_fases || ''}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                num_fases: e.target.value
                                                    ? parseInt(e.target.value)
                                                    : null,
                                            })
                                        }
                                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <option value="">
                                            No especificado
                                        </option>
                                        <option value="1">
                                            1 - Monofásico
                                        </option>
                                        <option value="2">2 - Bifásico</option>
                                        <option value="3">3 - Trifásico</option>
                                    </select>
                                </div>
                            )}

                            {/* Canal 1 */}
                            {numCanales >= 1 && (
                                <div className="space-y-3 rounded-md border border-gray-200 bg-background p-3 dark:border-gray-800">
                                    <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        Canal 1
                                    </Label>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                        <div className="relative grid gap-2">
                                            <Label
                                                htmlFor="nombre_canal_1"
                                                className="text-xs"
                                            >
                                                Nombre
                                            </Label>
                                            <Input
                                                id="nombre_canal_1"
                                                type="text"
                                                value={formData.nombre_canal_1}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        nombre_canal_1:
                                                            e.target.value,
                                                    })
                                                }
                                                placeholder={
                                                    esFases
                                                        ? 'L1'
                                                        : 'Ej: Consumo General'
                                                }
                                                className="h-9 text-sm"
                                            />
                                        </div>
                                        <div className="relative grid gap-2">
                                            <Label
                                                htmlFor="color_canal_1"
                                                className="text-xs"
                                            >
                                                Color
                                            </Label>
                                            <div className="flex h-9 items-center gap-2">
                                                <input
                                                    id="color_canal_1"
                                                    type="color"
                                                    value={
                                                        formData.color_canal_1
                                                    }
                                                    onChange={(e) =>
                                                        setFormData({
                                                            ...formData,
                                                            color_canal_1:
                                                                e.target.value,
                                                        })
                                                    }
                                                    className="h-8 w-16 cursor-pointer rounded border border-input bg-background"
                                                />
                                                <Input
                                                    type="text"
                                                    value={
                                                        formData.color_canal_1 ||
                                                        ''
                                                    }
                                                    onChange={(e) =>
                                                        setFormData({
                                                            ...formData,
                                                            color_canal_1:
                                                                e.target.value,
                                                        })
                                                    }
                                                    placeholder="#000000"
                                                    className="h-8 max-w-[100px] font-mono text-xs uppercase"
                                                />
                                            </div>
                                        </div>
                                        <div className="relative grid gap-2">
                                            <Label
                                                htmlFor="tipo_canal_1"
                                                className="text-xs"
                                            >
                                                {esFases
                                                    ? 'Tipo (todas las fases)'
                                                    : 'Tipo'}
                                            </Label>
                                            <select
                                                id="tipo_canal_1"
                                                value={
                                                    formData.tipo_canal_1 || ''
                                                }
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        tipo_canal_1:
                                                            e.target.value ||
                                                            null,
                                                    })
                                                }
                                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
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
                                            {errors?.tipo_canal_1 && (
                                                <p className="text-xs text-red-600">
                                                    {errors.tipo_canal_1}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 pt-6">
                                            <Checkbox
                                                id="invertir_sentido_canal_1"
                                                checked={
                                                    formData.invertir_sentido_canal_1
                                                }
                                                onCheckedChange={(checked) =>
                                                    setFormData({
                                                        ...formData,
                                                        invertir_sentido_canal_1:
                                                            checked === true,
                                                    })
                                                }
                                            />
                                            <Label
                                                htmlFor="invertir_sentido_canal_1"
                                                className="cursor-pointer text-xs"
                                            >
                                                {esFases
                                                    ? 'Invertir sentido (todas las fases)'
                                                    : 'Invertir sentido'}
                                            </Label>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Canal 2 */}
                            {numCanales >= 2 && (
                                <div className="space-y-3 rounded-md border border-gray-200 bg-background p-3 dark:border-gray-800">
                                    <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        Canal 2
                                    </Label>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                        <div className="relative grid gap-2">
                                            <Label
                                                htmlFor="nombre_canal_2"
                                                className="text-xs"
                                            >
                                                Nombre
                                            </Label>
                                            <Input
                                                id="nombre_canal_2"
                                                type="text"
                                                value={formData.nombre_canal_2}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        nombre_canal_2:
                                                            e.target.value,
                                                    })
                                                }
                                                placeholder={
                                                    esFases
                                                        ? 'L2'
                                                        : 'Ej: Consumo General'
                                                }
                                                className="h-9 text-sm"
                                            />
                                        </div>
                                        <div className="relative grid gap-2">
                                            <Label
                                                htmlFor="color_canal_2"
                                                className="text-xs"
                                            >
                                                Color
                                            </Label>
                                            <div className="flex h-9 items-center gap-2">
                                                <input
                                                    id="color_canal_2"
                                                    type="color"
                                                    value={
                                                        formData.color_canal_2
                                                    }
                                                    onChange={(e) =>
                                                        setFormData({
                                                            ...formData,
                                                            color_canal_2:
                                                                e.target.value,
                                                        })
                                                    }
                                                    className="h-8 w-16 cursor-pointer rounded border border-input bg-background"
                                                />
                                                <Input
                                                    type="text"
                                                    value={
                                                        formData.color_canal_2 ||
                                                        ''
                                                    }
                                                    onChange={(e) =>
                                                        setFormData({
                                                            ...formData,
                                                            color_canal_2:
                                                                e.target.value,
                                                        })
                                                    }
                                                    placeholder="#000000"
                                                    className="h-8 max-w-[100px] font-mono text-xs uppercase"
                                                />
                                            </div>
                                        </div>
                                        {!esFases && (
                                            <div className="relative grid gap-2">
                                                <Label
                                                    htmlFor="tipo_canal_2"
                                                    className="text-xs"
                                                >
                                                    Tipo
                                                </Label>
                                                <select
                                                    id="tipo_canal_2"
                                                    value={
                                                        formData.tipo_canal_2 ||
                                                        ''
                                                    }
                                                    onChange={(e) =>
                                                        setFormData({
                                                            ...formData,
                                                            tipo_canal_2:
                                                                e.target
                                                                    .value ||
                                                                null,
                                                        })
                                                    }
                                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
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
                                                {errors?.tipo_canal_2 && (
                                                    <p className="text-xs text-red-600">
                                                        {errors.tipo_canal_2}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                        {!esFases && (
                                            <div className="flex items-center gap-2 pt-6">
                                                <Checkbox
                                                    id="invertir_sentido_canal_2"
                                                    checked={
                                                        formData.invertir_sentido_canal_2
                                                    }
                                                    onCheckedChange={(
                                                        checked,
                                                    ) =>
                                                        setFormData({
                                                            ...formData,
                                                            invertir_sentido_canal_2:
                                                                checked ===
                                                                true,
                                                        })
                                                    }
                                                />
                                                <Label
                                                    htmlFor="invertir_sentido_canal_2"
                                                    className="cursor-pointer text-xs"
                                                >
                                                    Invertir sentido
                                                </Label>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Canal 3 */}
                            {numCanales >= 3 && (
                                <div className="space-y-3 rounded-md border border-gray-200 bg-background p-3 dark:border-gray-800">
                                    <Label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                        Canal 3
                                    </Label>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                        <div className="relative grid gap-2">
                                            <Label
                                                htmlFor="nombre_canal_3"
                                                className="text-xs"
                                            >
                                                Nombre
                                            </Label>
                                            <Input
                                                id="nombre_canal_3"
                                                type="text"
                                                value={formData.nombre_canal_3}
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        nombre_canal_3:
                                                            e.target.value,
                                                    })
                                                }
                                                placeholder={
                                                    esFases
                                                        ? 'L3'
                                                        : 'Ej: Consumo General'
                                                }
                                                className="h-9 text-sm"
                                            />
                                        </div>
                                        <div className="relative grid gap-2">
                                            <Label
                                                htmlFor="color_canal_3"
                                                className="text-xs"
                                            >
                                                Color
                                            </Label>
                                            <div className="flex h-9 items-center gap-2">
                                                <input
                                                    id="color_canal_3"
                                                    type="color"
                                                    value={
                                                        formData.color_canal_3
                                                    }
                                                    onChange={(e) =>
                                                        setFormData({
                                                            ...formData,
                                                            color_canal_3:
                                                                e.target.value,
                                                        })
                                                    }
                                                    className="h-8 w-16 cursor-pointer rounded border border-input bg-background"
                                                />
                                                <Input
                                                    type="text"
                                                    value={
                                                        formData.color_canal_3 ||
                                                        ''
                                                    }
                                                    onChange={(e) =>
                                                        setFormData({
                                                            ...formData,
                                                            color_canal_3:
                                                                e.target.value,
                                                        })
                                                    }
                                                    placeholder="#000000"
                                                    className="h-8 max-w-[100px] font-mono text-xs uppercase"
                                                />
                                            </div>
                                        </div>
                                        {!esFases && (
                                            <div className="relative grid gap-2">
                                                <Label
                                                    htmlFor="tipo_canal_3"
                                                    className="text-xs"
                                                >
                                                    Tipo
                                                </Label>
                                                <select
                                                    id="tipo_canal_3"
                                                    value={
                                                        formData.tipo_canal_3 ||
                                                        ''
                                                    }
                                                    onChange={(e) =>
                                                        setFormData({
                                                            ...formData,
                                                            tipo_canal_3:
                                                                e.target
                                                                    .value ||
                                                                null,
                                                        })
                                                    }
                                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
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
                                                {errors?.tipo_canal_3 && (
                                                    <p className="text-xs text-red-600">
                                                        {errors.tipo_canal_3}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                        {!esFases && (
                                            <div className="flex items-center gap-2 pt-6">
                                                <Checkbox
                                                    id="invertir_sentido_canal_3"
                                                    checked={
                                                        formData.invertir_sentido_canal_3
                                                    }
                                                    onCheckedChange={(
                                                        checked,
                                                    ) =>
                                                        setFormData({
                                                            ...formData,
                                                            invertir_sentido_canal_3:
                                                                checked ===
                                                                true,
                                                        })
                                                    }
                                                />
                                                <Label
                                                    htmlFor="invertir_sentido_canal_3"
                                                    className="cursor-pointer text-xs"
                                                >
                                                    Invertir sentido
                                                </Label>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center space-x-2 px-2">
                            <input
                                id="activo"
                                type="checkbox"
                                checked={formData.activo}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        activo: e.target.checked,
                                    })
                                }
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <Label
                                htmlFor="activo"
                                className="cursor-pointer text-sm font-medium"
                            >
                                Dispositivo activo
                            </Label>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setMostrarModal(false)}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit">
                                {dispositivoEditando ? 'Actualizar' : 'Crear'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
