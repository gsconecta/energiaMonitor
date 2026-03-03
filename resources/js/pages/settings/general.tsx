import { Head, useForm, router } from '@inertiajs/react';
import { Plus, Pencil, Trash2, MoreVertical } from 'lucide-react';
import { useState } from 'react';
import * as Icons from 'lucide-react';

import HeadingSmall from '@/components/heading-small';
import { type BreadcrumbItem, type Kpi } from '@/types';

import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { edit as editGeneral } from '@/routes/general';
import { store as storeKpi, update as updateKpi, destroy as destroyKpi } from '@/routes/kpis';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import InputError from '@/components/input-error';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Ajustes generales',
        href: editGeneral().url,
    },
];

interface Props {
    kpis: Kpi[];
}

export default function General({ kpis }: Props) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingKpi, setEditingKpi] = useState<Kpi | null>(null);

    const { data, setData, post, put, delete: destroy, processing, errors, reset, clearErrors } = useForm({
        name: '',
        description: '',
        color: '#000000',
        icon: '',
    });

    const openCreateDialog = () => {
        setEditingKpi(null);
        reset();
        clearErrors();
        setIsDialogOpen(true);
    };

    const openEditDialog = (kpi: Kpi) => {
        setEditingKpi(kpi);
        setData({
            name: kpi.name,
            description: kpi.description || '',
            color: kpi.color,
            icon: kpi.icon,
        });
        clearErrors();
        setIsDialogOpen(true);
    };

    const closeDialog = () => {
        setIsDialogOpen(false);
        reset();
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();

        if (editingKpi) {
            put(updateKpi({ kpi: editingKpi.id }).url, {
                onSuccess: () => closeDialog(),
            });
        } else {
            post(storeKpi().url, {
                onSuccess: () => closeDialog(),
            });
        }
    };

    const deleteKpi = (kpi: Kpi) => {
        if (confirm('¿Estás seguro de que quieres eliminar este KPI?')) {
            destroy(destroyKpi({ kpi: kpi.id }).url);
        }
    };

    // Helper to render dynamic icon
    const renderIcon = (iconName: string, className?: string) => {
        const IconComponent = (Icons as any)[iconName];
        return IconComponent ? <IconComponent className={className} /> : null;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Ajustes generales" />

            <SettingsLayout>
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <HeadingSmall
                            title="Ajustes generales"
                            description="Administra los KPIs de la aplicación"
                        />
                        <Button onClick={openCreateDialog} size="sm">
                            <Plus className="mr-2 h-4 w-4" />
                            Añadir KPI
                        </Button>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                        {kpis.map((kpi) => (
                            <Card key={kpi.id} className="relative overflow-hidden">
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <div className="flex items-center space-x-2">
                                        <div
                                            className="p-3 rounded-md text-white shadow-sm"
                                            style={{ backgroundColor: kpi.color }}
                                        >
                                            {renderIcon(kpi.icon, "h-6 w-6")}
                                        </div>
                                        <CardTitle className="text-lg font-medium ml-2">
                                            {kpi.name}
                                        </CardTitle>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                <span className="sr-only">Abrir menú</span>
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => openEditDialog(kpi)}>
                                                <Pencil className="mr-2 h-4 w-4" />
                                                Editar
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => deleteKpi(kpi)}
                                                className="text-red-600 focus:text-red-600"
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Eliminar
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </CardHeader>
                                <CardContent>
                                    <CardDescription>
                                        {kpi.description}
                                    </CardDescription>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogContent className="sm:max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>
                                    {editingKpi ? 'Editar KPI' : 'Crear KPI'}
                                </DialogTitle>
                                <DialogDescription>
                                    Configura los detalles del indicador clave de rendimiento.
                                </DialogDescription>
                            </DialogHeader>

                            <form onSubmit={submit} className="space-y-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Nombre</Label>
                                    <Input
                                        id="name"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        placeholder="Ej: Energía Producción"
                                        required
                                    />
                                    <InputError message={errors.name} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="description">Descripción</Label>
                                    <Input
                                        id="description"
                                        value={data.description}
                                        onChange={(e) => setData('description', e.target.value)}
                                        placeholder="Descripción breve del KPI"
                                    />
                                    <InputError message={errors.description} />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="color">Color</Label>
                                        <div className="flex items-center space-x-2">
                                            <Input
                                                id="color"
                                                type="color"
                                                value={data.color}
                                                onChange={(e) => setData('color', e.target.value)}
                                                className="w-12 h-9 p-1 px-2"
                                                required
                                            />
                                            <Input
                                                value={data.color}
                                                onChange={(e) => setData('color', e.target.value)}
                                                placeholder="#000000"
                                                className="flex-1"
                                                required
                                            />
                                        </div>
                                        <InputError message={errors.color} />
                                    </div>

                                    <div className="grid gap-2">
                                        <Label htmlFor="icon">Icono (Lucide)</Label>
                                        <div className="flex items-center space-x-2">
                                            <Input
                                                id="icon"
                                                value={data.icon}
                                                onChange={(e) => setData('icon', e.target.value)}
                                                placeholder="Ej: Sun"
                                                required
                                            />
                                            <div className="p-2 border rounded-md">
                                                {renderIcon(data.icon, "h-4 w-4 text-muted-foreground")}
                                            </div>
                                        </div>
                                        <InputError message={errors.icon} />
                                        <p className="text-[0.8rem] text-muted-foreground">
                                            Nombre del icono de <a href="https://lucide.dev/icons" target="_blank" rel="noreferrer" className="underline">Lucide React</a>
                                        </p>
                                    </div>
                                </div>

                                <DialogFooter>
                                    <Button type="button" variant="ghost" onClick={closeDialog}>
                                        Cancelar
                                    </Button>
                                    <Button type="submit" disabled={processing}>
                                        {editingKpi ? 'Guardar cambios' : 'Crear KPI'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
