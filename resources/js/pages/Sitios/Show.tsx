import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Pencil, Trash2, Building2, MapPin, Zap, Plus, RefreshCw } from 'lucide-react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';

// Fix para iconos de Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Sitios',
        href: '/sitios',
    },
    {
        title: 'Detalle',
        href: '#',
    },
];

interface Dispositivo {
    id: number;
    nombre: string;
    activo: boolean;
}

interface Organizacion {
    id: number;
    nombre: string;
}

interface Sitio {
    id: number;
    nombre: string;
    codigo: string;
    ubicacion: string | null;
    latitud: number | null;
    longitud: number | null;
    descripcion: string | null;
    activa: boolean;
    organizacion: Organizacion;
    dispositivos: Dispositivo[];
}

interface Props {
    sitio: Sitio;
}

export default function SitiosShow({ sitio }: Props) {
    const handleEliminar = () => {
        if (confirm('¿Estás seguro de eliminar este sitio?')) {
            router.delete(`/sitios/${sitio.id}`);
        }
    };

    const handleCambiarSitio = () => {
        router.post('/seleccionar-contexto', {
            organizacion_id: sitio.organizacion.id,
            sitio_id: sitio.id,
        }, {
            onSuccess: () => {
                router.visit('/dashboard');
            },
        });
    };


    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={sitio.nombre} />

            <div className="flex h-full w-full flex-1 flex-col gap-4 overflow-x-hidden p-2 sm:p-4 lg:p-6">
                {/* Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            {sitio.nombre}
                        </h1>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            {sitio.codigo}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleCambiarSitio}
                            className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Cambiar a este sitio
                        </button>
                        <button
                            onClick={() => router.visit(`/sitios/${sitio.id}/edit`)}
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

                {/* Información */}
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="overflow-hidden rounded-xl border border-sidebar-border/70 bg-white shadow dark:border-sidebar-border dark:bg-gray-800">
                        <div className="p-6">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                Información
                            </h2>
                            <div className="mt-4 space-y-3">
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <Building2 className="h-4 w-4" />
                                    <span>{sitio.organizacion.nombre}</span>
                                </div>
                                {sitio.ubicacion && (
                                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                        <MapPin className="h-4 w-4" />
                                        <span>{sitio.ubicacion}</span>
                                    </div>
                                )}
                                {sitio.descripcion && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                        {sitio.descripcion}
                                    </p>
                                )}
                                <div>
                                    {sitio.activa ? (
                                        <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800 dark:bg-green-900 dark:text-green-200">
                                            Activa
                                        </span>
                                    ) : (
                                        <span className="inline-flex rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800 dark:bg-red-900 dark:text-red-200">
                                            Inactiva
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-sidebar-border/70 bg-white shadow dark:border-sidebar-border dark:bg-gray-800">
                        <div className="p-6">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                Estadísticas
                            </h2>
                            <div className="mt-4">
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <Zap className="h-4 w-4" />
                                    <span>{sitio.dispositivos.length} dispositivos</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mapa de localización */}
                {sitio.latitud && sitio.longitud && (
                    <div className="overflow-hidden rounded-xl border border-sidebar-border/70 bg-white shadow dark:border-sidebar-border dark:bg-gray-800">
                        <div className="p-6">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                                Ubicación
                            </h2>
                            <div className="h-[300px] w-full overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                                <MapContainer
                                    center={[sitio.latitud, sitio.longitud]}
                                    zoom={13}
                                    style={{ height: '100%', width: '100%' }}
                                    scrollWheelZoom={false}
                                >
                                    <TileLayer
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    />
                                    <Marker position={[sitio.latitud, sitio.longitud]} />
                                </MapContainer>
                            </div>
                            {sitio.ubicacion && (
                                <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                                    {sitio.ubicacion}
                                </p>
                            )}
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                                Lat: {sitio.latitud.toFixed(6)}, Lng: {sitio.longitud.toFixed(6)}
                            </p>
                        </div>
                    </div>
                )}

                {/* Dispositivos */}
                <div className="overflow-hidden rounded-xl border border-sidebar-border/70 bg-white shadow dark:border-sidebar-border dark:bg-gray-800">
                    <div className="p-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                Dispositivos
                            </h2>
                            <button
                                onClick={() => router.visit('/dispositivos/create', { data: { sitio_id: sitio.id } })}
                                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                            >
                                <Plus className="h-4 w-4" />
                                Nuevo Dispositivo
                            </button>
                        </div>
                        {sitio.dispositivos.length === 0 ? (
                            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                                No hay dispositivos en este sitio
                            </p>
                        ) : (
                            <div className="mt-4 overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-900">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                                Dispositivo
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                                Estado
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                                        {sitio.dispositivos.map((dispositivo) => (
                                            <tr
                                                key={dispositivo.id}
                                                onClick={() => router.visit(`/dispositivos/${dispositivo.id}`)}
                                                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                                            >
                                                <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                                                    {dispositivo.nombre}
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-3">
                                                    {dispositivo.activo ? (
                                                        <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800 dark:bg-green-900 dark:text-green-200">
                                                            Activo
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-800 dark:bg-gray-900 dark:text-gray-200">
                                                            Inactivo
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

