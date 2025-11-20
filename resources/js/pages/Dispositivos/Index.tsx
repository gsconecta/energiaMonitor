import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Plus, Pencil, Trash2, Power, Activity } from 'lucide-react';
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
}

interface Dispositivo {
    id: number;
    device_id: string;
    nombre: string;
    tipo: string;
    modelo: string;
    ip_local: string | null;
    firmware: string | null;
    activo: boolean;
    sitio: Sitio;
    lecturas_count: number;
    esta_online: boolean;
    ultima_lectura: string | null;
    potencia_actual: number;
}

interface Props {
    dispositivos: Dispositivo[];
    sitios: Sitio[];
}

export default function DispositivosIndex({ dispositivos, sitios }: Props) {
    const [mostrarModal, setMostrarModal] = useState(false);
    const [dispositivoEditando, setDispositivoEditando] = useState<Dispositivo | null>(null);
    const [formData, setFormData] = useState({
        sitio_id: '',
        device_id: '',
        nombre: '',
        tipo: 'produccion',
        modelo: 'Shelly EM3',
        ip_local: '',
        firmware: '',
        activo: true,
    });

    const tiposDispositivo = [
        { value: 'produccion', label: 'Producción Solar', color: 'text-yellow-600' },
        { value: 'consumo', label: 'Consumo', color: 'text-blue-600' },
        { value: 'red', label: 'Red Eléctrica', color: 'text-green-600' },
        { value: 'bateria', label: 'Batería', color: 'text-purple-600' },
        { value: 'otro', label: 'Otro', color: 'text-gray-600' },
    ];

    const abrirModalNuevo = () => {
        setDispositivoEditando(null);
        setFormData({
            sitio_id: sitios[0]?.id.toString() || '',
            device_id: '',
            nombre: '',
            tipo: 'produccion',
            modelo: 'Shelly EM3',
            ip_local: '',
            firmware: '',
            activo: true,
        });
        setMostrarModal(true);
    };

    const abrirModalEditar = (dispositivo: Dispositivo) => {
        setDispositivoEditando(dispositivo);
        setFormData({
            sitio_id: dispositivo.sitio.id.toString(),
            device_id: dispositivo.device_id,
            nombre: dispositivo.nombre,
            tipo: dispositivo.tipo,
            modelo: dispositivo.modelo,
            ip_local: dispositivo.ip_local || '',
            firmware: dispositivo.firmware || '',
            activo: dispositivo.activo,
        });
        setMostrarModal(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (dispositivoEditando) {
            router.put(`/dispositivos/${dispositivoEditando.id}`, formData);
        } else {
            router.post('/dispositivos', formData);
        }

        setMostrarModal(false);
    };

    const handleEliminar = (id: number) => {
        if (confirm('¿Estás seguro de eliminar este dispositivo?')) {
            router.delete(`/dispositivos/${id}`);
        }
    };

    const handleToggleActivo = (id: number) => {
        router.post(`/dispositivos/${id}/toggle-activo`);
    };

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
                        className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
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
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        Estado
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        Dispositivo
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        Sitio
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        Tipo
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        Última Lectura
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        Potencia
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                                {dispositivos.map((dispositivo) => (
                                    <tr key={dispositivo.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="whitespace-nowrap px-6 py-4">
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
                                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                {dispositivo.nombre}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                {dispositivo.device_id}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                {dispositivo.modelo}
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                                            {dispositivo.sitio.nombre}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <span
                                                className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                                                    tiposDispositivo.find(
                                                        (t) => t.value === dispositivo.tipo
                                                    )?.color
                                                }`}
                                            >
                                                {
                                                    tiposDispositivo.find(
                                                        (t) => t.value === dispositivo.tipo
                                                    )?.label
                                                }
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                            {dispositivo.ultima_lectura || 'Sin lecturas'}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 dark:text-gray-100">
                                            {dispositivo.potencia_actual} kW
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleToggleActivo(dispositivo.id)}
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
                                                    onClick={() => abrirModalEditar(dispositivo)}
                                                    className="rounded p-1 text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                                                    title="Editar"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleEliminar(dispositivo.id)}
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
            {mostrarModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex min-h-screen items-center justify-center px-4">
                        <div
                            className="fixed inset-0 bg-black bg-opacity-30"
                            onClick={() => setMostrarModal(false)}
                        />
                        <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
                            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                                {dispositivoEditando ? 'Editar Dispositivo' : 'Nuevo Dispositivo'}
                            </h3>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Sitio
                                    </label>
                                    <select
                                        value={formData.sitio_id}
                                        onChange={(e) =>
                                            setFormData({ ...formData, sitio_id: e.target.value })
                                        }
                                        className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                        required
                                    >
                                        {sitios.map((sitio) => (
                                            <option key={sitio.id} value={sitio.id}>
                                                {sitio.nombre}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Device ID
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.device_id}
                                        onChange={(e) =>
                                            setFormData({ ...formData, device_id: e.target.value })
                                        }
                                        className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                        placeholder="shellyem3-c8c9a33e6505"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Nombre
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.nombre}
                                        onChange={(e) =>
                                            setFormData({ ...formData, nombre: e.target.value })
                                        }
                                        className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                        placeholder="Shelly Producción Solar"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Tipo
                                    </label>
                                    <select
                                        value={formData.tipo}
                                        onChange={(e) =>
                                            setFormData({ ...formData, tipo: e.target.value })
                                        }
                                        className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                        required
                                    >
                                        {tiposDispositivo.map((tipo) => (
                                            <option key={tipo.value} value={tipo.value}>
                                                {tipo.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Modelo
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.modelo}
                                        onChange={(e) =>
                                            setFormData({ ...formData, modelo: e.target.value })
                                        }
                                        className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                        placeholder="Shelly EM3"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        IP Local
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.ip_local}
                                        onChange={(e) =>
                                            setFormData({ ...formData, ip_local: e.target.value })
                                        }
                                        className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                        placeholder="192.168.1.148"
                                    />
                                </div>

                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={formData.activo}
                                        onChange={(e) =>
                                            setFormData({ ...formData, activo: e.target.checked })
                                        }
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <label className="ml-2 block text-sm text-gray-900 dark:text-gray-100">
                                        Dispositivo activo
                                    </label>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        type="submit"
                                        className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                    >
                                        {dispositivoEditando ? 'Actualizar' : 'Crear'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setMostrarModal(false)}
                                        className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}