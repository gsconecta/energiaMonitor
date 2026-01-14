import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { MapPin } from 'lucide-react';
import LocationPicker from '@/components/LocationPicker';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Sitios',
        href: '/sitios',
    },
    {
        title: 'Crear',
        href: '/sitios/create',
    },
];

interface Organizacion {
    id: number;
    nombre: string;
}

interface Props {
    organizaciones: Organizacion[];
}

export default function SitiosCreate({ organizaciones }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        organizacion_id: organizaciones[0]?.id.toString() || '',
        nombre: '',
        codigo: '',
        ubicacion: '',
        latitud: '',
        longitud: '',
        codigo_municipio_aemet: '',
        descripcion: '',
        activa: true,
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/sitios');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Crear Sitio" />

            <div className="flex h-full w-full flex-1 flex-col gap-4 overflow-x-hidden p-2 sm:p-4 lg:p-6">
                <div className="mx-auto w-full max-w-2xl">
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            Crear Sitio
                        </h1>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            Crea un nuevo sitio para agrupar dispositivos
                        </p>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-sidebar-border/70 bg-white shadow dark:border-sidebar-border dark:bg-gray-800">
                        <form onSubmit={handleSubmit} className="p-6">
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Organización <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={data.organizacion_id}
                                        onChange={(e) => setData('organizacion_id', e.target.value)}
                                        className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                        required
                                    >
                                        {organizaciones.map((org) => (
                                            <option key={org.id} value={org.id}>
                                                {org.nombre}
                                            </option>
                                        ))}
                                    </select>
                                    {errors.organizacion_id && (
                                        <p className="mt-1 text-sm text-red-600">{errors.organizacion_id}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Nombre <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={data.nombre}
                                        onChange={(e) => setData('nombre', e.target.value)}
                                        className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                        placeholder="Nave Industrial 1"
                                        required
                                    />
                                    {errors.nombre && (
                                        <p className="mt-1 text-sm text-red-600">{errors.nombre}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Código <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={data.codigo}
                                        onChange={(e) => setData('codigo', e.target.value)}
                                        className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                        placeholder="NAVE-001"
                                        required
                                    />
                                    {errors.codigo && (
                                        <p className="mt-1 text-sm text-red-600">{errors.codigo}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Ubicación
                                    </label>
                                    <input
                                        type="text"
                                        value={data.ubicacion}
                                        onChange={(e) => setData('ubicacion', e.target.value)}
                                        className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                        placeholder="Calle Principal 123, Ciudad"
                                    />
                                    {errors.ubicacion && (
                                        <p className="mt-1 text-sm text-red-600">{errors.ubicacion}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Localización (Coordenadas)
                                    </label>
                                    <LocationPicker
                                        latitud={data.latitud}
                                        longitud={data.longitud}
                                        onLocationChange={(lat, lng) => {
                                            setData('latitud', lat);
                                            setData('longitud', lng);
                                        }}
                                    />
                                    {(errors.latitud || errors.longitud) && (
                                        <p className="mt-2 text-sm text-red-600">
                                            {errors.latitud || errors.longitud}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Código Municipio AEMET
                                    </label>
                                    <input
                                        type="text"
                                        value={data.codigo_municipio_aemet}
                                        onChange={(e) => setData('codigo_municipio_aemet', e.target.value)}
                                        placeholder="Ej: 07300"
                                        className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                    />
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                        Código de municipio de AEMET OpenData (5 dígitos). Si no se especifica, se calculará automáticamente desde las coordenadas.
                                    </p>
                                    {errors.codigo_municipio_aemet && (
                                        <p className="mt-1 text-sm text-red-600">{errors.codigo_municipio_aemet}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        Descripción
                                    </label>
                                    <textarea
                                        value={data.descripcion}
                                        onChange={(e) => setData('descripcion', e.target.value)}
                                        rows={4}
                                        className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                        placeholder="Descripción del sitio..."
                                    />
                                    {errors.descripcion && (
                                        <p className="mt-1 text-sm text-red-600">{errors.descripcion}</p>
                                    )}
                                </div>

                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={data.activa}
                                        onChange={(e) => setData('activa', e.target.checked)}
                                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <label className="ml-2 block text-sm text-gray-900 dark:text-gray-100">
                                        Sitio activo
                                    </label>
                                </div>
                            </div>

                            <div className="mt-6 flex gap-3">
                                <button
                                    type="submit"
                                    disabled={processing}
                                    className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                                >
                                    {processing ? 'Creando...' : 'Crear Sitio'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => router.visit('/sitios')}
                                    className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

