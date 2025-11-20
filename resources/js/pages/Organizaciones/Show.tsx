import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Pencil, Trash2, Plus, Users, MapPin, UserPlus, Edit, X } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Organizaciones',
        href: '/organizaciones',
    },
    {
        title: 'Detalle',
        href: '#',
    },
];

interface Sitio {
    id: number;
    nombre: string;
    codigo: string;
    activa: boolean;
}

interface Usuario {
    id: number;
    name: string;
    email: string;
    rol: string;
}

interface Organizacion {
    id: number;
    nombre: string;
    codigo: string;
    descripcion: string | null;
    activa: boolean;
    rol: string;
    sitios: Sitio[];
    usuarios: Usuario[];
}

interface Props {
    organizacion: Organizacion;
}

export default function OrganizacionesShow({ organizacion }: Props) {
    const [mostrarModalUsuario, setMostrarModalUsuario] = useState(false);
    const { data: formUsuario, setData: setFormUsuario, post: postUsuario, processing: processingUsuario, errors: errorsUsuario, reset: resetUsuario } = useForm({
        email: '',
        rol: 'member',
    });

    const getRolBadgeColor = (rol: string) => {
        switch (rol) {
            case 'owner':
                return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
            case 'admin':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
            case 'member':
                return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            case 'viewer':
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
        }
    };

    const getRolLabel = (rol: string) => {
        switch (rol) {
            case 'owner':
                return 'Propietario';
            case 'admin':
                return 'Administrador';
            case 'member':
                return 'Miembro';
            case 'viewer':
                return 'Visualizador';
            default:
                return rol;
        }
    };

    const handleAgregarUsuario = (e: React.FormEvent) => {
        e.preventDefault();
        postUsuario(`/organizaciones/${organizacion.id}/usuarios`, {
            onSuccess: () => {
                setMostrarModalUsuario(false);
                resetUsuario();
            },
        });
    };

    const handleEliminarUsuario = (userId: number) => {
        if (confirm('¿Estás seguro de eliminar este usuario de la organización?')) {
            router.delete(`/organizaciones/${organizacion.id}/usuarios/${userId}`);
        }
    };

    const handleEliminar = () => {
        if (confirm('¿Estás seguro de eliminar esta organización?')) {
            router.delete(`/organizaciones/${organizacion.id}`);
        }
    };

    const puedeGestionar = ['owner', 'admin'].includes(organizacion.rol);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={organizacion.nombre} />

            <div className="flex h-full w-full flex-1 flex-col gap-4 overflow-x-hidden p-2 sm:p-4 lg:p-6">
                {/* Header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            {organizacion.nombre}
                        </h1>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                            {organizacion.codigo}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {puedeGestionar && (
                            <>
                                <button
                                    onClick={() => router.visit(`/organizaciones/${organizacion.id}/edit`)}
                                    className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                                >
                                    <Pencil className="h-4 w-4" />
                                    Editar
                                </button>
                                {organizacion.rol === 'owner' && (
                                    <button
                                        onClick={handleEliminar}
                                        className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Eliminar
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Información */}
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="overflow-hidden rounded-xl border border-sidebar-border/70 bg-white shadow dark:border-sidebar-border dark:bg-gray-800">
                        <div className="p-6">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                Información
                            </h2>
                            {organizacion.descripcion && (
                                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                                    {organizacion.descripcion}
                                </p>
                            )}
                            <div className="mt-4 flex items-center gap-4">
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <MapPin className="h-4 w-4" />
                                    <span>{organizacion.sitios.length} sitios</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                    <Users className="h-4 w-4" />
                                    <span>{organizacion.usuarios.length} usuarios</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-sidebar-border/70 bg-white shadow dark:border-sidebar-border dark:bg-gray-800">
                        <div className="p-6">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                Tu Rol
                            </h2>
                            <div className="mt-4">
                                <span
                                    className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${getRolBadgeColor(
                                        organizacion.rol
                                    )}`}
                                >
                                    {getRolLabel(organizacion.rol)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sitios */}
                <div className="overflow-hidden rounded-xl border border-sidebar-border/70 bg-white shadow dark:border-sidebar-border dark:bg-gray-800">
                    <div className="p-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                Sitios
                            </h2>
                            <button
                                onClick={() => router.visit('/sitios/create', { data: { organizacion_id: organizacion.id } })}
                                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                            >
                                <Plus className="h-4 w-4" />
                                Nuevo Sitio
                            </button>
                        </div>
                        {organizacion.sitios.length === 0 ? (
                            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                                No hay sitios en esta organización
                            </p>
                        ) : (
                            <div className="mt-4 space-y-2">
                                {organizacion.sitios.map((sitio) => (
                                    <div
                                        key={sitio.id}
                                        onClick={() => router.visit(`/sitios/${sitio.id}`)}
                                        className="cursor-pointer rounded-lg border border-gray-200 p-3 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-gray-100">
                                                    {sitio.nombre}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {sitio.codigo}
                                                </p>
                                            </div>
                                            {!sitio.activa && (
                                                <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800 dark:bg-red-900 dark:text-red-200">
                                                    Inactiva
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Usuarios */}
                {puedeGestionar && (
                    <div className="overflow-hidden rounded-xl border border-sidebar-border/70 bg-white shadow dark:border-sidebar-border dark:bg-gray-800">
                        <div className="p-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                    Usuarios
                                </h2>
                                <button
                                    onClick={() => setMostrarModalUsuario(true)}
                                    className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                                >
                                    <UserPlus className="h-4 w-4" />
                                    Agregar Usuario
                                </button>
                            </div>
                            <div className="mt-4 overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead className="bg-gray-50 dark:bg-gray-900">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                                Usuario
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                                Rol
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                                Acciones
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
                                        {organizacion.usuarios.map((usuario) => (
                                            <tr key={usuario.id}>
                                                <td className="whitespace-nowrap px-4 py-3">
                                                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                        {usuario.name}
                                                    </div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                                        {usuario.email}
                                                    </div>
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-3">
                                                    <span
                                                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getRolBadgeColor(
                                                            usuario.rol
                                                        )}`}
                                                    >
                                                        {getRolLabel(usuario.rol)}
                                                    </span>
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                                                    <button
                                                        onClick={() => handleEliminarUsuario(usuario.id)}
                                                        className="text-red-600 hover:text-red-800"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal Agregar Usuario */}
                {mostrarModalUsuario && (
                    <div className="fixed inset-0 z-50 overflow-y-auto">
                        <div className="flex min-h-screen items-center justify-center px-4">
                            <div
                                className="fixed inset-0 bg-black bg-opacity-30"
                                onClick={() => setMostrarModalUsuario(false)}
                            />
                            <div className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
                                <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                                    Agregar Usuario
                                </h3>
                                <form onSubmit={handleAgregarUsuario} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            value={formUsuario.email}
                                            onChange={(e) => setFormUsuario('email', e.target.value)}
                                            className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                            required
                                        />
                                        {errorsUsuario.email && (
                                            <p className="mt-1 text-sm text-red-600">{errorsUsuario.email}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Rol
                                        </label>
                                        <select
                                            value={formUsuario.rol}
                                            onChange={(e) => setFormUsuario('rol', e.target.value)}
                                            className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                                        >
                                            <option value="admin">Administrador</option>
                                            <option value="member">Miembro</option>
                                            <option value="viewer">Visualizador</option>
                                        </select>
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            type="submit"
                                            disabled={processingUsuario}
                                            className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                                        >
                                            Agregar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setMostrarModalUsuario(false)}
                                            className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}

