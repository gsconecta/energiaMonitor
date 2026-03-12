import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router, useForm } from '@inertiajs/react';
import { AlertOctagon, AlertTriangle, Building2, Clock, Gauge, Info, Mail, Pencil, Plus, Power, Save, Trash2, X } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin/control-panel' },
    { title: 'Umbrales', href: '/admin/umbrales' },
];

interface Organizacion {
    id: number;
    nombre: string;
}

interface Dispositivo {
    id: number;
    nombre: string;
    sitio_nombre: string;
    organizacion_id: number | null;
    organizacion_nombre: string;
}

interface Umbral {
    id: number;
    nombre: string;
    metrica: string;
    valor_minimo: string | null;
    valor_maximo: string | null;
    severidad: string;
    activo: boolean;
    notificar_app: boolean;
    notificar_email: boolean;
    notificar_telegram: boolean;
    destinatarios_email: string[];
    hora_inicio: string;
    hora_fin: string;
    dias_semana: string[];
    organizaciones: Organizacion[];
    dispositivos: Dispositivo[];
}

interface Props {
    umbrales: Umbral[];
    organizaciones: Organizacion[];
    dispositivos: Dispositivo[];
    metricas: Record<string, { label: string; unidad: string }>;
}

const severidadConfig: Record<string, { label: string; color: string; icon: any }> = {
    info: { label: 'Info', color: 'bg-blue-100 text-blue-700', icon: Info },
    warning: { label: 'Warning', color: 'bg-yellow-100 text-yellow-700', icon: AlertTriangle },
    critical: { label: 'Critico', color: 'bg-red-100 text-red-700', icon: AlertOctagon },
};

function resumirDispositivos(dispositivos: Dispositivo[]): string {
    if (dispositivos.length === 0) {
        return 'Todos los dispositivos';
    }

    if (dispositivos.length <= 2) {
        return dispositivos.map((dispositivo) => dispositivo.nombre).join(', ');
    }

    return `${dispositivos[0].nombre}, ${dispositivos[1].nombre} +${dispositivos.length - 2}`;
}

function UmbralModal({
    open,
    onClose,
    umbral,
    organizaciones,
    dispositivos,
    metricas,
}: {
    open: boolean;
    onClose: () => void;
    umbral?: Umbral;
    organizaciones: Organizacion[];
    dispositivos: Dispositivo[];
    metricas: Record<string, { label: string; unidad: string }>;
}) {
    const isEditing = !!umbral;

    const form = useForm({
        nombre: umbral?.nombre ?? '',
        metrica: umbral?.metrica ?? 'voltaje',
        valor_minimo: umbral?.valor_minimo ?? '',
        valor_maximo: umbral?.valor_maximo ?? '',
        severidad: umbral?.severidad ?? 'warning',
        notificar_app: umbral?.notificar_app ?? false,
        notificar_email: umbral?.notificar_email ?? false,
        notificar_telegram: umbral?.notificar_telegram ?? false,
        destinatarios_email: umbral?.destinatarios_email ?? [],
        hora_inicio: umbral?.hora_inicio ?? '00:00',
        hora_fin: umbral?.hora_fin ?? '23:59',
        dias_semana: umbral?.dias_semana ?? ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'],
        organizacion_ids: umbral?.organizaciones.map((o) => o.id) ?? [],
        dispositivo_ids: umbral?.dispositivos.map((d) => d.id) ?? [],
    });

    const [nuevoEmail, setNuevoEmail] = useState('');

    const handleSubmit = () => {
        if (isEditing) {
            form.put(`/admin/umbrales/${umbral.id}`, {
                preserveScroll: true,
                onSuccess: () => onClose(),
            });
        } else {
            form.post('/admin/umbrales', {
                preserveScroll: true,
                onSuccess: () => onClose(),
            });
        }
    };

    const addEmail = () => {
        const email = nuevoEmail.trim();
        if (email && !form.data.destinatarios_email.includes(email)) {
            form.setData('destinatarios_email', [...form.data.destinatarios_email, email]);
            setNuevoEmail('');
        }
    };

    const removeEmail = (email: string) => {
        form.setData('destinatarios_email', form.data.destinatarios_email.filter((e) => e !== email));
    };

    const toggleOrg = (orgId: number) => {
        const current = form.data.organizacion_ids;

        if (current.includes(orgId)) {
            const organizacion_ids = current.filter((id) => id !== orgId);
            const dispositivo_ids = form.data.dispositivo_ids.filter((deviceId) => {
                const dispositivo = dispositivos.find((item) => item.id === deviceId);
                return dispositivo?.organizacion_id !== orgId;
            });

            form.setData({
                ...form.data,
                organizacion_ids,
                dispositivo_ids,
            });
        } else {
            form.setData('organizacion_ids', [...current, orgId]);
        }
    };

    const toggleDispositivo = (dispositivoId: number) => {
        const current = form.data.dispositivo_ids;
        if (current.includes(dispositivoId)) {
            form.setData('dispositivo_ids', current.filter((id) => id !== dispositivoId));
        } else {
            form.setData('dispositivo_ids', [...current, dispositivoId]);
        }
    };

    const metricaActual = metricas[form.data.metrica];
    const dispositivosFiltrados = dispositivos.filter(
        (dispositivo) =>
            dispositivo.organizacion_id !== null && form.data.organizacion_ids.includes(dispositivo.organizacion_id)
    );

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent
                className="max-h-[90vh] overflow-y-auto sm:top-[5%] sm:w-[60vw] sm:max-w-none sm:translate-y-0"
                onInteractOutside={(e) => e.preventDefault()}
            >
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Editar Umbral' : 'Nuevo Umbral'}</DialogTitle>
                    <DialogDescription>
                        {isEditing ? 'Modifica la configuracion del umbral.' : 'Define un nuevo umbral de funcionamiento.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-8 pb-6 pt-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-1">
                            <Label>Nombre</Label>
                            <Input
                                value={form.data.nombre}
                                onChange={(e) => form.setData('nombre', e.target.value)}
                                placeholder="Ej: Voltaje bajo en red"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>Metrica</Label>
                            <Select value={form.data.metrica} onValueChange={(v) => form.setData('metrica', v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(metricas).map(([key, m]) => (
                                        <SelectItem key={key} value={key}>
                                            {m.label} ({m.unidad})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div className="space-y-1">
                            <Label>
                                Valor Minimo {metricaActual && <span className="text-gray-400">({metricaActual.unidad})</span>}
                            </Label>
                            <Input
                                type="number"
                                step="any"
                                value={form.data.valor_minimo}
                                onChange={(e) => form.setData('valor_minimo', e.target.value)}
                                placeholder="Dejar vacio si no aplica"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>
                                Valor Maximo {metricaActual && <span className="text-gray-400">({metricaActual.unidad})</span>}
                            </Label>
                            <Input
                                type="number"
                                step="any"
                                value={form.data.valor_maximo}
                                onChange={(e) => form.setData('valor_maximo', e.target.value)}
                                placeholder="Dejar vacio si no aplica"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label>Severidad</Label>
                            <Select value={form.data.severidad} onValueChange={(v) => form.setData('severidad', v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="info">Info</SelectItem>
                                    <SelectItem value="warning">Warning</SelectItem>
                                    <SelectItem value="critical">Critico</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="flex items-center gap-1.5 text-sm font-semibold">
                            <Clock className="h-4 w-4" />
                            Horario de Actividad
                        </Label>
                        <p className="text-xs text-gray-400">El umbral solo se evaluara dentro de este horario. Por defecto 24h.</p>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                            <div className="flex items-center gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs text-gray-500">Desde</Label>
                                    <Input
                                        type="time"
                                        value={form.data.hora_inicio}
                                        onChange={(e) => form.setData('hora_inicio', e.target.value)}
                                        className="w-32"
                                    />
                                </div>
                                <span className="mt-5 text-gray-400">-</span>
                                <div className="space-y-1">
                                    <Label className="text-xs text-gray-500">Hasta</Label>
                                    <Input
                                        type="time"
                                        value={form.data.hora_fin}
                                        onChange={(e) => form.setData('hora_fin', e.target.value)}
                                        className="w-32"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { key: 'lun', label: 'L' },
                                    { key: 'mar', label: 'M' },
                                    { key: 'mie', label: 'X' },
                                    { key: 'jue', label: 'J' },
                                    { key: 'vie', label: 'V' },
                                    { key: 'sab', label: 'S' },
                                    { key: 'dom', label: 'D' },
                                ].map((dia) => {
                                    const activo = form.data.dias_semana.includes(dia.key);

                                    return (
                                        <button
                                            key={dia.key}
                                            type="button"
                                            onClick={() => {
                                                if (activo) {
                                                    form.setData('dias_semana', form.data.dias_semana.filter((d) => d !== dia.key));
                                                } else {
                                                    form.setData('dias_semana', [...form.data.dias_semana, dia.key]);
                                                }
                                            }}
                                            className={`h-9 w-9 rounded-full text-xs font-semibold transition-colors ${
                                                activo ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                            }`}
                                        >
                                            {dia.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {(() => {
                        const diasLabels: Record<string, string> = {
                            lun: 'Lunes',
                            mar: 'Martes',
                            mie: 'Miercoles',
                            jue: 'Jueves',
                            vie: 'Viernes',
                            sab: 'Sabado',
                            dom: 'Domingo',
                        };
                        const dias = form.data.dias_semana;
                        const todosLosDias = dias.length === 7;
                        const soloLaborables =
                            dias.length === 5 && ['lun', 'mar', 'mie', 'jue', 'vie'].every((d) => dias.includes(d));
                        const soloFinDeSemana =
                            dias.length === 2 && ['sab', 'dom'].every((d) => dias.includes(d));
                        const hi = form.data.hora_inicio || '00:00';
                        const hf = form.data.hora_fin || '23:59';
                        const es24h = hi === '00:00' && (hf === '23:59' || hf === '');

                        if (todosLosDias && es24h) {
                            return (
                                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                                    <p className="text-sm text-green-800">
                                        <span className="font-medium">Activo 24/7</span> - Monitorizacion continua
                                    </p>
                                </div>
                            );
                        }

                        let diasTexto = 'Ningun dia seleccionado';
                        if (todosLosDias) diasTexto = 'Todos los dias';
                        else if (soloLaborables) diasTexto = 'De lunes a viernes';
                        else if (soloFinDeSemana) diasTexto = 'Fines de semana';
                        else if (dias.length > 0) diasTexto = dias.map((d) => diasLabels[d] || d).join(', ');

                        const horarioTexto = es24h ? '24 horas' : `de ${hi} a ${hf}`;

                        return (
                            <div
                                className={`rounded-lg border px-4 py-3 ${
                                    dias.length === 0 ? 'border-red-200 bg-red-50' : 'border-blue-200 bg-blue-50'
                                }`}
                            >
                                <p className={`text-sm ${dias.length === 0 ? 'text-red-800' : 'text-blue-800'}`}>
                                    <span className="font-medium">Activo:</span>{' '}
                                    {dias.length === 0 ? 'No se evaluara (ningun dia seleccionado)' : `${diasTexto}, ${horarioTexto}`}
                                </p>
                            </div>
                        );
                    })()}

                    <div className="space-y-3">
                        <Label className="text-sm font-semibold">Canales de Notificacion</Label>
                        <div className="flex flex-wrap gap-6">
                            <label className="flex cursor-pointer items-center gap-2">
                                <Checkbox
                                    checked={form.data.notificar_app}
                                    onCheckedChange={(v) => form.setData('notificar_app', !!v)}
                                />
                                <span className="text-sm">Dentro de la app</span>
                            </label>
                            <label className="flex cursor-pointer items-center gap-2">
                                <Checkbox
                                    checked={form.data.notificar_email}
                                    onCheckedChange={(v) => form.setData('notificar_email', !!v)}
                                />
                                <span className="text-sm">Email</span>
                            </label>
                            <label className="flex cursor-pointer items-center gap-2">
                                <Checkbox
                                    checked={form.data.notificar_telegram}
                                    onCheckedChange={(v) => form.setData('notificar_telegram', !!v)}
                                />
                                <span className="text-sm">Telegram</span>
                            </label>
                        </div>
                    </div>

                    {form.data.notificar_email && (
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">Destinatarios Email</Label>
                            <div className="flex gap-2">
                                <Input
                                    type="email"
                                    value={nuevoEmail}
                                    onChange={(e) => setNuevoEmail(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addEmail())}
                                    placeholder="email@ejemplo.com"
                                    className="flex-1"
                                />
                                <Button type="button" variant="outline" onClick={addEmail} disabled={!nuevoEmail.trim()}>
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                            {form.data.destinatarios_email.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {form.data.destinatarios_email.map((email) => (
                                        <span
                                            key={email}
                                            className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs text-blue-700"
                                        >
                                            <Mail className="h-3 w-3" />
                                            {email}
                                            <button onClick={() => removeEmail(email)} className="ml-1 hover:text-red-500">
                                                <X className="h-3 w-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label className="text-sm font-semibold">Organizaciones Asignadas</Label>
                        <p className="text-xs text-gray-400">Selecciona las organizaciones donde se aplicara este umbral.</p>
                        <div className="grid max-h-48 grid-cols-1 gap-2 overflow-y-auto rounded-lg border p-3 sm:grid-cols-2">
                            {organizaciones.map((org) => (
                                <label key={org.id} className="flex cursor-pointer items-center gap-2 rounded p-1.5 hover:bg-gray-50">
                                    <Checkbox
                                        checked={form.data.organizacion_ids.includes(org.id)}
                                        onCheckedChange={() => toggleOrg(org.id)}
                                    />
                                    <Building2 className="h-3.5 w-3.5 text-gray-400" />
                                    <span className="text-sm">{org.nombre}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-semibold">Dispositivos Asignados</Label>
                        <p className="text-xs text-gray-400">
                            Si no seleccionas dispositivos, el umbral se aplicara a todos los dispositivos de las organizaciones elegidas.
                        </p>
                        <div className="grid max-h-56 grid-cols-1 gap-2 overflow-y-auto rounded-lg border p-3">
                            {dispositivosFiltrados.length === 0 ? (
                                <p className="text-sm text-gray-400">Selecciona primero una o varias organizaciones.</p>
                            ) : (
                                dispositivosFiltrados.map((dispositivo) => (
                                    <label key={dispositivo.id} className="flex cursor-pointer items-start gap-2 rounded p-1.5 hover:bg-gray-50">
                                        <Checkbox
                                            checked={form.data.dispositivo_ids.includes(dispositivo.id)}
                                            onCheckedChange={() => toggleDispositivo(dispositivo.id)}
                                        />
                                        <div className="flex flex-col text-sm">
                                            <span>{dispositivo.nombre}</span>
                                            <span className="text-xs text-gray-400">
                                                {dispositivo.organizacion_nombre} / {dispositivo.sitio_nombre}
                                            </span>
                                        </div>
                                    </label>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSubmit} disabled={form.processing || !form.data.nombre}>
                        <Save className="mr-1 h-4 w-4" />
                        {isEditing ? 'Guardar' : 'Crear'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function UmbralesIndex({ umbrales, organizaciones, dispositivos, metricas }: Props) {
    const [modalOpen, setModalOpen] = useState(false);
    const [editingUmbral, setEditingUmbral] = useState<Umbral | undefined>();

    const openCreate = () => {
        setEditingUmbral(undefined);
        setModalOpen(true);
    };

    const openEdit = (umbral: Umbral) => {
        setEditingUmbral(umbral);
        setModalOpen(true);
    };

    const handleDelete = (umbral: Umbral) => {
        if (confirm(`Eliminar el umbral "${umbral.nombre}"?`)) {
            router.delete(`/admin/umbrales/${umbral.id}`, { preserveScroll: true });
        }
    };

    const handleToggle = (umbral: Umbral) => {
        router.post(`/admin/umbrales/${umbral.id}/toggle-activo`, {}, { preserveScroll: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Umbrales de Funcionamiento" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Umbrales de Funcionamiento</h1>
                        <p className="text-sm text-gray-500">Define rangos aceptables para metricas electricas y configura alertas</p>
                    </div>
                    <Button onClick={openCreate}>
                        <Plus className="mr-1 h-4 w-4" />
                        Nuevo Umbral
                    </Button>
                </div>

                <Card>
                    <CardHeader className="pb-0">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Gauge className="h-5 w-5" />
                            Umbrales ({umbrales.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="mt-3 p-0">
                        <div className="hidden grid-cols-8 gap-2 border-y bg-gray-100 px-4 py-2 text-xs font-medium uppercase tracking-wider text-gray-500 sm:grid">
                            <span>Nombre</span>
                            <span>Metrica</span>
                            <span>Rango</span>
                            <span>Severidad</span>
                            <span>Notificaciones</span>
                            <span>Organizaciones</span>
                            <span>Dispositivos</span>
                            <span className="text-right">Acciones</span>
                        </div>

                        {umbrales.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">
                                <Gauge className="mx-auto mb-3 h-12 w-12 opacity-50" />
                                <p>No hay umbrales definidos</p>
                                <Button variant="outline" className="mt-3" onClick={openCreate}>
                                    <Plus className="mr-1 h-4 w-4" />
                                    Crear el primero
                                </Button>
                            </div>
                        ) : (
                            umbrales.map((umbral) => {
                                const metrica = metricas[umbral.metrica];
                                const sev = severidadConfig[umbral.severidad] || severidadConfig.warning;
                                const SevIcon = sev.icon;

                                return (
                                    <div
                                        key={umbral.id}
                                        className={`border-b last:border-b-0 transition-colors hover:bg-gray-50 ${
                                            !umbral.activo ? 'opacity-50' : ''
                                        }`}
                                    >
                                        <div className="grid grid-cols-1 items-center gap-2 px-4 py-5 sm:grid-cols-8">
                                            <div className="flex items-center gap-2">
                                                <div className={`h-2 w-2 flex-shrink-0 rounded-full ${umbral.activo ? 'bg-green-500' : 'bg-gray-300'}`} />
                                                <span className="truncate text-sm font-medium text-gray-900">{umbral.nombre}</span>
                                            </div>

                                            <span className="text-sm text-gray-600">{metrica?.label ?? umbral.metrica}</span>

                                            <span className="font-mono text-sm text-gray-600">
                                                {umbral.valor_minimo ?? '-'} - {umbral.valor_maximo ?? '-'} {metrica?.unidad}
                                            </span>

                                            <span className={`inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium ${sev.color}`}>
                                                <SevIcon className="mr-1 h-3 w-3" />
                                                {sev.label}
                                            </span>

                                            <div className="flex gap-1.5">
                                                {umbral.notificar_app && (
                                                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">APP</span>
                                                )}
                                                {umbral.notificar_email && (
                                                    <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-600">EMAIL</span>
                                                )}
                                                {umbral.notificar_telegram && (
                                                    <span className="rounded bg-cyan-100 px-1.5 py-0.5 text-[10px] text-cyan-600">TG</span>
                                                )}
                                                {!umbral.notificar_app && !umbral.notificar_email && !umbral.notificar_telegram && (
                                                    <span className="text-xs text-gray-300">Ninguno</span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-1 text-sm text-gray-500">
                                                <Building2 className="h-3.5 w-3.5" />
                                                <span>{umbral.organizaciones.length} org.</span>
                                            </div>

                                            <div className="text-sm text-gray-500">
                                                <span title={umbral.dispositivos.map((dispositivo) => dispositivo.nombre).join(', ') || 'Todos los dispositivos'}>
                                                    {resumirDispositivos(umbral.dispositivos)}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleToggle(umbral)}
                                                    className={`h-7 px-2 ${
                                                        umbral.activo ? 'text-green-600 hover:text-green-800' : 'text-gray-400 hover:text-gray-600'
                                                    }`}
                                                    title={umbral.activo ? 'Desactivar' : 'Activar'}
                                                >
                                                    <Power className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button size="sm" variant="outline" onClick={() => openEdit(umbral)} className="h-7 px-2">
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleDelete(umbral)}
                                                    className="h-7 px-2 text-red-500 hover:bg-red-50 hover:text-red-700"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </CardContent>
                </Card>
            </div>

            <UmbralModal
                key={editingUmbral?.id ?? `new-${modalOpen}`}
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                umbral={editingUmbral}
                organizaciones={organizaciones}
                dispositivos={dispositivos}
                metricas={metricas}
            />
        </AppLayout>
    );
}
