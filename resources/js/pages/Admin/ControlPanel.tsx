import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { Building2, ServerCrash, AlertTriangle, ArrowRight, ShieldAlert, Cpu, Key } from 'lucide-react';
import { useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface DispositivoOffline {
    id: number;
    nombre: string;
    sitio_nombre: string;
    organizacion_nombre: string;
    organizacion_id: number;
    sitio_id: number;
    ultima_conexion: string;
}

interface AlertaPendiente {
    id: number;
    tipo: string;
    mensaje: string;
    severidad: string;
    dispositivo_nombre: string;
    organizacion_nombre: string;
    organizacion_id: number;
    sitio_id: number;
    fecha_creacion: string;
}

interface UltimaLectura {
    id: number;
    dispositivo_nombre: string;
    sitio_nombre: string;
    organizacion_nombre: string;
    organizacion_id: number;
    sitio_id: number;
    fecha_lectura: string;
    potencia_total_w: number;
    estado: string;
}

interface Props {
    metricasGlobales: {
        total_organizaciones: number;
        total_dispositivos: number;
        dispositivos_offline_count: number;
        alertas_activas_count: number;
    };
    dispositivosOffline: DispositivoOffline[];
    alertasPendientes: AlertaPendiente[];
    ultimasLecturas: UltimaLectura[];
}

export default function ControlPanel({
    metricasGlobales,
    dispositivosOffline,
    alertasPendientes,
    ultimasLecturas,
}: Props) {
    const [busquedaLecturas, setBusquedaLecturas] = useState('');

    const lecturasFiltradas = ultimasLecturas.filter(lectura => {
        if (!busquedaLecturas) return true;

        const busqueda = busquedaLecturas.toLowerCase();
        return (
            lectura.dispositivo_nombre?.toLowerCase().includes(busqueda) ||
            lectura.organizacion_nombre?.toLowerCase().includes(busqueda) ||
            lectura.sitio_nombre?.toLowerCase().includes(busqueda)
        );
    });

    // Función para impersonar / suplantar vista de cliente
    const handleImpersonate = (organizacionId: number, sitioId: number) => {
        router.post(`/admin/impersonate/${organizacionId}/${sitioId}`);
    };

    return (
        <AppLayout breadcrumbs={[{ title: 'Panel de Control de Soporte', href: '/admin/control-panel' }]}>
            <Head title="Control Global" />

            <div className="flex w-full flex-col gap-6 p-4 sm:p-6">
                <div className="flex items-center justify-between border-b pb-4">
                    <div className="flex items-center gap-3">
                        <ShieldAlert className="h-8 w-8 text-blue-600 dark:text-blue-500" />
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Centro de Mando Técnico</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Visión panorámica de todas las organizaciones y dispositivos del sistema.</p>
                        </div>
                    </div>
                    <div>
                        <Button onClick={() => router.visit('/admin/credenciales-shelly')} variant="outline" className="gap-2">
                            <Key className="h-4 w-4" />
                            Credenciales Shelly
                        </Button>
                    </div>
                </div>

                {/* Métricas Superiores */}
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                            <Building2 className="h-4 w-4" />
                            <p className="text-sm font-medium">Empresas Activas</p>
                        </div>
                        <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{metricasGlobales.total_organizaciones}</p>
                    </div>
                    <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                            <Cpu className="h-4 w-4" />
                            <p className="text-sm font-medium">Dispositivos Totales</p>
                        </div>
                        <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{metricasGlobales.total_dispositivos}</p>
                    </div>
                    <div className={`rounded-lg border p-4 shadow-sm ${metricasGlobales.dispositivos_offline_count > 0 ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800' : 'bg-white dark:bg-gray-900 dark:border-gray-800'}`}>
                        <div className={`flex items-center gap-2 ${metricasGlobales.dispositivos_offline_count > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                            <ServerCrash className="h-4 w-4" />
                            <p className="text-sm font-medium">Dispositivos Caídos</p>
                        </div>
                        <p className={`mt-2 text-2xl font-bold ${metricasGlobales.dispositivos_offline_count > 0 ? 'text-red-700 dark:text-red-500' : 'text-gray-900 dark:text-white'}`}>
                            {metricasGlobales.dispositivos_offline_count}
                        </p>
                    </div>
                    <div className={`rounded-lg border p-4 shadow-sm ${metricasGlobales.alertas_activas_count > 0 ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800' : 'bg-white dark:bg-gray-900 dark:border-gray-800'}`}>
                        <div className={`flex items-center gap-2 ${metricasGlobales.alertas_activas_count > 0 ? 'text-yellow-700 dark:text-yellow-500' : 'text-gray-500 dark:text-gray-400'}`}>
                            <AlertTriangle className="h-4 w-4" />
                            <p className="text-sm font-medium">Alertas Sin Resolver</p>
                        </div>
                        <p className={`mt-2 text-2xl font-bold ${metricasGlobales.alertas_activas_count > 0 ? 'text-yellow-700 dark:text-yellow-500' : 'text-gray-900 dark:text-white'}`}>
                            {metricasGlobales.alertas_activas_count}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    {/* Tabla de Dispositivos Offline */}
                    <div className="rounded-lg border bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                        <div className="border-b px-4 py-3 dark:border-gray-800">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                <ServerCrash className="h-5 w-5 text-red-500" />
                                Monitor de Pérdida de Conexión
                            </h2>
                        </div>
                        <div className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Dispositivo</TableHead>
                                        <TableHead>Cliente / Sitio</TableHead>
                                        <TableHead>Última Señal</TableHead>
                                        <TableHead className="text-right">Acción</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {dispositivosOffline.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-6 text-gray-500">
                                                Todos los dispositivos están emitiendo correctamente.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        dispositivosOffline.map((disp) => (
                                            <TableRow key={disp.id}>
                                                <TableCell className="font-medium">{disp.nombre}</TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span>{disp.organizacion_nombre}</span>
                                                        <span className="text-xs text-gray-500">{disp.sitio_nombre}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="destructive" className="whitespace-nowrap">
                                                        {disp.ultima_conexion}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {disp.organizacion_id && disp.sitio_id && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-8"
                                                            onClick={() => handleImpersonate(disp.organizacion_id, disp.sitio_id)}
                                                        >
                                                            Asistir <ArrowRight className="ml-1 h-3 w-3" />
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    {/* Tabla de Alertas */}
                    <div className="rounded-lg border bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                        <div className="border-b px-4 py-3 dark:border-gray-800">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                                Bandeja de Alertas Críticas
                            </h2>
                        </div>
                        <div className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Alerta</TableHead>
                                        <TableHead>Cliente / Dispositivo</TableHead>
                                        <TableHead>Hace</TableHead>
                                        <TableHead className="text-right">Acción</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {alertasPendientes.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-6 text-gray-500">
                                                No hay alertas activas en el sistema.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        alertasPendientes.map((alerta) => (
                                            <TableRow key={alerta.id}>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-gray-900 dark:text-gray-100">{alerta.tipo}</span>
                                                        <span className="text-xs text-gray-500 line-clamp-1">{alerta.mensaje}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span>{alerta.organizacion_nombre}</span>
                                                        <span className="text-xs text-gray-500">{alerta.dispositivo_nombre}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs text-gray-500">
                                                    {alerta.fecha_creacion}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {alerta.organizacion_id && alerta.sitio_id && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-8"
                                                            onClick={() => handleImpersonate(alerta.organizacion_id, alerta.sitio_id)}
                                                        >
                                                            Ver <ArrowRight className="ml-1 h-3 w-3" />
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>

                {/* Tabla de Últimas Lecturas */}
                <div className="rounded-lg border bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 mt-2">
                    <div className="border-b px-4 py-3 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Cpu className="h-5 w-5 text-blue-500" />
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                Registro de Últimas Lecturas
                            </h2>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800 ml-2">
                                Últimas 50
                            </Badge>
                        </div>
                        <div className="w-full sm:w-auto flex items-center gap-2">
                            <Input
                                placeholder="Buscar equipo, sitio u org..."
                                value={busquedaLecturas}
                                onChange={(e) => setBusquedaLecturas(e.target.value)}
                                className="max-w-[300px]"
                            />
                        </div>
                    </div>
                    <div className="p-0">
                        <div className="max-h-[500px] overflow-auto">
                            <Table>
                                <TableHeader className="sticky top-0 bg-white dark:bg-gray-900 z-10 shadow-sm">
                                    <TableRow>
                                        <TableHead>Estado</TableHead>
                                        <TableHead>Dispositivo</TableHead>
                                        <TableHead>Cliente / Sitio</TableHead>
                                        <TableHead>Potencia Act.</TableHead>
                                        <TableHead>Recibida</TableHead>
                                        <TableHead className="text-right">Acción</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {lecturasFiltradas.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-6 text-gray-500">
                                                {busquedaLecturas ? "No se encontraron lecturas que coincidan con la búsqueda." : "No hay lecturas registradas."}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        lecturasFiltradas.map((lectura) => (
                                            <TableRow key={lectura.id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-2.5 w-2.5 rounded-full bg-green-500"></div>
                                                        <span className="text-xs font-medium text-green-700 dark:text-green-400">OK</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-medium">{lectura.dispositivo_nombre}</TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span>{lectura.organizacion_nombre}</span>
                                                        <span className="text-xs text-gray-500">{lectura.sitio_nombre}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className="font-mono">
                                                        {lectura.potencia_total_w} W
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-xs text-gray-500">
                                                    {lectura.fecha_lectura}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {lectura.organizacion_id && lectura.sitio_id && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-8"
                                                            onClick={() => handleImpersonate(lectura.organizacion_id, lectura.sitio_id)}
                                                        >
                                                            Asistir <ArrowRight className="ml-1 h-3 w-3" />
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>

            </div>
        </AppLayout>
    );
}
