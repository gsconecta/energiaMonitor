import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { Search, Users, ChevronDown, ChevronUp, Trash2, Plus, Save, X, Building2, Shield } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin/control-panel' },
    { title: 'Usuarios', href: '/admin/usuarios' },
];

interface Organizacion {
    id: number;
    nombre: string;
    rol: string;
}

interface Usuario {
    id: number;
    name: string;
    email: string;
    rol_global: string;
    created_at: string;
    organizaciones: Organizacion[];
}

interface Props {
    usuarios: Usuario[];
    organizaciones: { id: number; nombre: string }[];
    filtros: {
        busqueda: string;
        rol_global: string;
    };
}

const rolGlobalLabels: Record<string, { label: string; color: string }> = {
    admin: { label: 'Administrador', color: 'bg-red-100 text-red-700' },
    tecnico: { label: 'Técnico', color: 'bg-blue-100 text-blue-700' },
    cliente: { label: 'Cliente', color: 'bg-green-100 text-green-700' },
};

const rolOrgLabels: Record<string, { label: string; color: string }> = {
    owner: { label: 'Propietario', color: 'bg-purple-100 text-purple-700' },
    admin: { label: 'Admin', color: 'bg-blue-100 text-blue-700' },
    viewer: { label: 'Visor', color: 'bg-gray-100 text-gray-700' },
};

function EditUserRow({ usuario, organizaciones, allOrganizaciones }: {
    usuario: Usuario;
    organizaciones: Organizacion[];
    allOrganizaciones: { id: number; nombre: string }[];
}) {
    const [expanded, setExpanded] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [addingOrg, setAddingOrg] = useState(false);

    const editForm = useForm({
        name: usuario.name,
        email: usuario.email,
        rol_global: usuario.rol_global,
    });

    const addOrgForm = useForm({
        organizacion_id: '',
        rol: 'viewer',
    });

    const handleSave = () => {
        editForm.put(`/admin/usuarios/${usuario.id}`, {
            preserveScroll: true,
            onSuccess: () => setEditOpen(false),
        });
    };

    const handleDelete = () => {
        if (confirm(`¿Estás seguro de eliminar al usuario "${usuario.name}"? Esta acción no se puede deshacer.`)) {
            router.delete(`/admin/usuarios/${usuario.id}`, { preserveScroll: true });
        }
    };

    const handleChangeOrgRol = (orgId: number, newRol: string) => {
        router.put(`/admin/usuarios/${usuario.id}/organizaciones/${orgId}`, {
            rol: newRol,
        }, { preserveScroll: true });
    };

    const handleRemoveOrg = (orgId: number, orgNombre: string) => {
        if (confirm(`¿Desvincular a "${usuario.name}" de "${orgNombre}"?`)) {
            router.delete(`/admin/usuarios/${usuario.id}/organizaciones/${orgId}`, {
                preserveScroll: true,
            });
        }
    };

    const handleAddOrg = () => {
        addOrgForm.post(`/admin/usuarios/${usuario.id}/organizaciones`, {
            preserveScroll: true,
            onSuccess: () => {
                setAddingOrg(false);
                addOrgForm.reset();
            },
        });
    };

    const availableOrgs = allOrganizaciones.filter(
        (org) => !organizaciones.some((o) => o.id === org.id)
    );

    const rolInfo = rolGlobalLabels[usuario.rol_global] || rolGlobalLabels.cliente;

    return (
        <div className="border-b last:border-b-0">
            {/* Fila principal */}
            <div className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="flex-shrink-0 p-1 rounded hover:bg-gray-200 transition-colors"
                >
                    {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                <div className="flex-1 grid grid-cols-1 sm:grid-cols-5 gap-2 items-center">
                    <span className="font-medium text-gray-900 text-sm">{usuario.name}</span>
                    <span className="text-sm text-gray-500">{usuario.email}</span>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium w-fit ${rolInfo.color}`}>
                        <Shield className="h-3 w-3 mr-1" />
                        {rolInfo.label}
                    </span>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Building2 className="h-3.5 w-3.5" />
                        <span>{organizaciones.length} org.</span>
                    </div>
                    <span className="text-xs text-gray-400">{usuario.created_at}</span>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                    <Button size="sm" variant="outline" onClick={() => setEditOpen(true)} className="h-7 px-2 text-xs">
                        Editar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleDelete} className="h-7 px-2 text-red-500 hover:text-red-700 hover:bg-red-50">
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>

            {/* Modal de edición */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto sm:top-[5%] sm:translate-y-0">
                    <DialogHeader>
                        <DialogTitle>Editar Usuario</DialogTitle>
                        <DialogDescription>Modifica los datos del usuario.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-2 pb-8">
                        <div className="space-y-1">
                            <Label>Nombre</Label>
                            <Input
                                value={editForm.data.name}
                                onChange={(e) => editForm.setData('name', e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>Email</Label>
                            <Input
                                value={editForm.data.email}
                                onChange={(e) => editForm.setData('email', e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>Rol Global</Label>
                            <Select
                                value={editForm.data.rol_global}
                                onValueChange={(v) => editForm.setData('rol_global', v)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="cliente">Cliente</SelectItem>
                                    <SelectItem value="tecnico">Técnico</SelectItem>
                                    <SelectItem value="admin">Administrador</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSave} disabled={editForm.processing}>
                            <Save className="h-4 w-4 mr-1" />
                            Guardar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Panel expandible: organizaciones */}
            {expanded && (
                <div className="bg-gray-50 px-4 pb-4 pt-2 ml-10 border-t">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-700">Organizaciones</h4>
                        {availableOrgs.length > 0 && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setAddingOrg(!addingOrg)}
                                className="h-7 text-xs"
                            >
                                <Plus className="h-3 w-3 mr-1" />
                                Añadir
                            </Button>
                        )}
                    </div>

                    {addingOrg && (
                        <div className="flex items-center gap-2 mb-3 p-2 bg-white rounded border">
                            <Select
                                value={addOrgForm.data.organizacion_id}
                                onValueChange={(v) => addOrgForm.setData('organizacion_id', v)}
                            >
                                <SelectTrigger className="h-8 text-sm flex-1">
                                    <SelectValue placeholder="Seleccionar organización..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableOrgs.map((org) => (
                                        <SelectItem key={org.id} value={org.id.toString()}>
                                            {org.nombre}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select
                                value={addOrgForm.data.rol}
                                onValueChange={(v) => addOrgForm.setData('rol', v)}
                            >
                                <SelectTrigger className="h-8 text-sm w-36">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="viewer">Visor</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="owner">Propietario</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button size="sm" onClick={handleAddOrg} disabled={addOrgForm.processing || !addOrgForm.data.organizacion_id} className="h-8">
                                <Plus className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setAddingOrg(false)} className="h-8">
                                <X className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    )}

                    {organizaciones.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">Sin organizaciones asignadas</p>
                    ) : (
                        <div className="space-y-2">
                            {organizaciones.map((org) => (
                                <div key={org.id} className="flex items-center justify-between bg-white rounded p-2 border">
                                    <div className="flex items-center gap-2">
                                        <Building2 className="h-4 w-4 text-gray-400" />
                                        <span className="text-sm font-medium">{org.nombre}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Select
                                            value={org.rol}
                                            onValueChange={(newRol) => handleChangeOrgRol(org.id, newRol)}
                                        >
                                            <SelectTrigger className="h-7 text-xs w-32">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="viewer">Visor</SelectItem>
                                                <SelectItem value="admin">Admin</SelectItem>
                                                <SelectItem value="owner">Propietario</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => handleRemoveOrg(org.id, org.nombre)}
                                            className="h-7 px-1.5 text-red-400 hover:text-red-600 hover:bg-red-50"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function UsuariosIndex({ usuarios, organizaciones, filtros }: Props) {
    const [busqueda, setBusqueda] = useState(filtros.busqueda);
    const [rolGlobal, setRolGlobal] = useState(filtros.rol_global);

    const aplicarFiltros = () => {
        router.get('/admin/usuarios', {
            busqueda: busqueda || undefined,
            rol_global: rolGlobal || undefined,
        }, {
            preserveState: true,
        });
    };

    const limpiarFiltros = () => {
        setBusqueda('');
        setRolGlobal('');
        router.get('/admin/usuarios', {}, { preserveState: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Gestión de Usuarios" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
                        <p className="text-sm text-gray-500">{usuarios.length} usuarios registrados</p>
                    </div>
                </div>

                {/* Explicación de roles */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="flex items-start gap-3 rounded-lg border bg-green-50 p-3">
                        <span className="mt-0.5 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                            <Shield className="h-3 w-3 mr-1" />
                            Cliente
                        </span>
                        <p className="text-xs text-gray-500">Accede solo a las organizaciones y sitios asignados. Ve dashboards e informes de sus dispositivos.</p>
                    </div>
                    <div className="flex items-start gap-3 rounded-lg border bg-blue-50 p-3">
                        <span className="mt-0.5 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                            <Shield className="h-3 w-3 mr-1" />
                            Técnico
                        </span>
                        <p className="text-xs text-gray-500">Acceso al Panel Global. Puede acceder a cualquier organización en modo soporte y gestionar dispositivos.</p>
                    </div>
                    <div className="flex items-start gap-3 rounded-lg border bg-red-50 p-3">
                        <span className="mt-0.5 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                            <Shield className="h-3 w-3 mr-1" />
                            Admin
                        </span>
                        <p className="text-xs text-gray-500">Control total del sistema. Gestiona usuarios, organizaciones, credenciales y toda la configuración global.</p>
                    </div>
                </div>

                {/* Filtros */}
                <Card>
                    <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row gap-3 items-end">
                            <div className="flex-1 space-y-1">
                                <Label className="text-xs">Buscar</Label>
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                                    <Input
                                        placeholder="Nombre o email..."
                                        value={busqueda}
                                        onChange={(e) => setBusqueda(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && aplicarFiltros()}
                                        className="pl-9 h-9"
                                    />
                                </div>
                            </div>
                            <div className="w-44 space-y-1">
                                <Label className="text-xs">Rol Global</Label>
                                <Select value={rolGlobal} onValueChange={setRolGlobal}>
                                    <SelectTrigger className="h-9">
                                        <SelectValue placeholder="Todos" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todos</SelectItem>
                                        <SelectItem value="admin">Administrador</SelectItem>
                                        <SelectItem value="tecnico">Técnico</SelectItem>
                                        <SelectItem value="cliente">Cliente</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex gap-2">
                                <Button onClick={aplicarFiltros} className="h-9">
                                    <Search className="h-4 w-4 mr-1" />
                                    Filtrar
                                </Button>
                                <Button variant="outline" onClick={limpiarFiltros} className="h-9">
                                    Limpiar
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Tabla de usuarios */}
                <Card>
                    <CardHeader className="pb-0">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Usuarios
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 mt-3">
                        {/* Header de la tabla */}
                        <div className="hidden sm:grid grid-cols-5 gap-2 px-4 py-2 bg-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wider border-y ml-10">
                            <span>Nombre</span>
                            <span>Email</span>
                            <span>Rol Global</span>
                            <span>Organizaciones</span>
                            <span>Creado</span>
                        </div>

                        {usuarios.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">
                                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                <p>No se encontraron usuarios</p>
                            </div>
                        ) : (
                            usuarios.map((usuario) => (
                                <EditUserRow
                                    key={usuario.id}
                                    usuario={usuario}
                                    organizaciones={usuario.organizaciones}
                                    allOrganizaciones={organizaciones}
                                />
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
