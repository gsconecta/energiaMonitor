import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowRight,
    Building2,
    CheckCircle2,
    Cpu,
    Key,
    ServerCrash,
    ShieldAlert,
} from 'lucide-react';
import { useEffect, useState } from 'react';

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
    canal: string;
    rango: string;
    valor_leido: string;
    unidad: string;
    dispositivo_nombre: string;
    organizacion_nombre: string;
    organizacion_id: number;
    sitio_id: number;
    lectura_id: number;
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

const severityStyles: Record<string, string> = {
    info: 'bg-blue-100 text-blue-700 border-blue-200',
    warning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    critical: 'bg-red-100 text-red-700 border-red-200',
};

export default function ControlPanel({
    metricasGlobales,
    dispositivosOffline,
    alertasPendientes,
    ultimasLecturas,
}: Props) {
    const AUTO_REFRESH_INTERVAL_MS = 3 * 60 * 1000;
    const [busquedaLecturas, setBusquedaLecturas] = useState('');
    const [resolviendoAlertaId, setResolviendoAlertaId] = useState<
        number | null
    >(null);
    const [
        resolviendoAlertasSeleccionadas,
        setResolviendoAlertasSeleccionadas,
    ] = useState(false);
    const [alertaIdsSeleccionadas, setAlertaIdsSeleccionadas] = useState<
        number[]
    >([]);
    const isResolviendoAlertas =
        resolviendoAlertaId !== null || resolviendoAlertasSeleccionadas;

    useEffect(() => {
        const alertaIdsActivas = new Set(
            alertasPendientes.map((alerta) => alerta.id),
        );

        setAlertaIdsSeleccionadas((current) =>
            current.filter((id) => alertaIdsActivas.has(id)),
        );
    }, [alertasPendientes]);

    useEffect(() => {
        const intervalId = window.setInterval(() => {
            if (document.hidden || isResolviendoAlertas) {
                return;
            }

            router.reload({
                only: [
                    'metricasGlobales',
                    'dispositivosOffline',
                    'alertasPendientes',
                    'ultimasLecturas',
                ],
                preserveScroll: true,
                preserveState: true,
            });
        }, AUTO_REFRESH_INTERVAL_MS);

        return () => window.clearInterval(intervalId);
    }, [AUTO_REFRESH_INTERVAL_MS, isResolviendoAlertas]);

    const lecturasFiltradas = ultimasLecturas.filter((lectura) => {
        if (!busquedaLecturas) {
            return true;
        }

        const busqueda = busquedaLecturas.toLowerCase();

        return (
            lectura.dispositivo_nombre?.toLowerCase().includes(busqueda) ||
            lectura.organizacion_nombre?.toLowerCase().includes(busqueda) ||
            lectura.sitio_nombre?.toLowerCase().includes(busqueda)
        );
    });

    const handleImpersonate = (organizacionId: number, sitioId: number) => {
        router.post(`/admin/impersonate/${organizacionId}/${sitioId}`);
    };

    const todasLasAlertasSeleccionadas =
        alertasPendientes.length > 0 &&
        alertaIdsSeleccionadas.length === alertasPendientes.length;
    const algunasAlertasSeleccionadas =
        alertaIdsSeleccionadas.length > 0 && !todasLasAlertasSeleccionadas;

    const handleToggleAlertSelection = (alertaId: number, checked: boolean) => {
        setAlertaIdsSeleccionadas((current) => {
            if (checked) {
                return current.includes(alertaId)
                    ? current
                    : [...current, alertaId];
            }

            return current.filter((id) => id !== alertaId);
        });
    };

    const handleToggleAllAlerts = (checked: boolean) => {
        setAlertaIdsSeleccionadas(
            checked ? alertasPendientes.map((alerta) => alerta.id) : [],
        );
    };

    const handleResolveAlert = (alertaId: number) => {
        setResolviendoAlertaId(alertaId);
        router.post(
            `/admin/alertas-umbral/${alertaId}/resolver`,
            {},
            {
                preserveScroll: true,
                onFinish: () => setResolviendoAlertaId(null),
            },
        );
    };

    const handleResolveSelectedAlerts = () => {
        if (alertaIdsSeleccionadas.length === 0) {
            return;
        }

        setResolviendoAlertasSeleccionadas(true);
        router.post(
            '/admin/alertas-umbral/resolver-multiple',
            {
                alerta_ids: alertaIdsSeleccionadas,
            },
            {
                preserveScroll: true,
                onSuccess: () => setAlertaIdsSeleccionadas([]),
                onFinish: () => setResolviendoAlertasSeleccionadas(false),
            },
        );
    };

    return (
        <AppLayout
            breadcrumbs={[
                {
                    title: 'Panel de Control de Soporte',
                    href: '/admin/control-panel',
                },
            ]}
        >
            <Head title="Control Global" />

            <div className="flex w-full flex-col gap-6 p-4 sm:p-6">
                <div className="flex items-center justify-between border-b pb-4">
                    <div className="flex items-center gap-3">
                        <ShieldAlert className="h-8 w-8 text-blue-600 dark:text-blue-500" />
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                                Centro de Mando Tecnico
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Vision panoramica de todas las organizaciones y
                                dispositivos del sistema.
                            </p>
                        </div>
                    </div>
                    <Button
                        onClick={() =>
                            router.visit('/admin/credenciales-shelly')
                        }
                        variant="outline"
                        className="gap-2"
                    >
                        <Key className="h-4 w-4" />
                        Credenciales Shelly
                    </Button>
                </div>

                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                            <Building2 className="h-4 w-4" />
                            <p className="text-sm font-medium">
                                Empresas Activas
                            </p>
                        </div>
                        <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                            {metricasGlobales.total_organizaciones}
                        </p>
                    </div>
                    <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                            <Cpu className="h-4 w-4" />
                            <p className="text-sm font-medium">
                                Dispositivos Totales
                            </p>
                        </div>
                        <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                            {metricasGlobales.total_dispositivos}
                        </p>
                    </div>
                    <div
                        className={`rounded-lg border p-4 shadow-sm ${metricasGlobales.dispositivos_offline_count > 0 ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20' : 'bg-white dark:border-gray-800 dark:bg-gray-900'}`}
                    >
                        <div
                            className={`flex items-center gap-2 ${metricasGlobales.dispositivos_offline_count > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}
                        >
                            <ServerCrash className="h-4 w-4" />
                            <p className="text-sm font-medium">
                                Dispositivos Caidos
                            </p>
                        </div>
                        <p
                            className={`mt-2 text-2xl font-bold ${metricasGlobales.dispositivos_offline_count > 0 ? 'text-red-700 dark:text-red-500' : 'text-gray-900 dark:text-white'}`}
                        >
                            {metricasGlobales.dispositivos_offline_count}
                        </p>
                    </div>
                    <div
                        className={`rounded-lg border p-4 shadow-sm ${metricasGlobales.alertas_activas_count > 0 ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20' : 'bg-white dark:border-gray-800 dark:bg-gray-900'}`}
                    >
                        <div
                            className={`flex items-center gap-2 ${metricasGlobales.alertas_activas_count > 0 ? 'text-yellow-700 dark:text-yellow-500' : 'text-gray-500 dark:text-gray-400'}`}
                        >
                            <AlertTriangle className="h-4 w-4" />
                            <p className="text-sm font-medium">
                                Alertas Sin Resolver
                            </p>
                        </div>
                        <p
                            className={`mt-2 text-2xl font-bold ${metricasGlobales.alertas_activas_count > 0 ? 'text-yellow-700 dark:text-yellow-500' : 'text-gray-900 dark:text-white'}`}
                        >
                            {metricasGlobales.alertas_activas_count}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                    <div className="rounded-lg border bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                        <div className="border-b px-4 py-3 dark:border-gray-800">
                            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                                <ServerCrash className="h-5 w-5 text-red-500" />
                                Monitor de Perdida de Conexion
                            </h2>
                        </div>
                        <div className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Dispositivo</TableHead>
                                        <TableHead>Cliente / Sitio</TableHead>
                                        <TableHead>Ultima Senal</TableHead>
                                        <TableHead className="text-right">
                                            Accion
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {dispositivosOffline.length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={4}
                                                className="py-6 text-center text-gray-500"
                                            >
                                                Todos los dispositivos estan
                                                emitiendo correctamente.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        dispositivosOffline.map((disp) => (
                                            <TableRow key={disp.id}>
                                                <TableCell className="font-medium">
                                                    {disp.nombre}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span>
                                                            {
                                                                disp.organizacion_nombre
                                                            }
                                                        </span>
                                                        <span className="text-xs text-gray-500">
                                                            {disp.sitio_nombre}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant="destructive"
                                                        className="whitespace-nowrap"
                                                    >
                                                        {disp.ultima_conexion}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {disp.organizacion_id &&
                                                        disp.sitio_id && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-8"
                                                                onClick={() =>
                                                                    handleImpersonate(
                                                                        disp.organizacion_id,
                                                                        disp.sitio_id,
                                                                    )
                                                                }
                                                            >
                                                                Asistir{' '}
                                                                <ArrowRight className="ml-1 h-3 w-3" />
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

                    <div className="rounded-lg border bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                        <div className="border-b px-4 py-3 dark:border-gray-800">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                                    Bandeja de Alertas de Umbral
                                </h2>
                                <div className="flex flex-wrap items-center gap-2">
                                    {alertaIdsSeleccionadas.length > 0 && (
                                        <Badge
                                            variant="outline"
                                            className="border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
                                        >
                                            {alertaIdsSeleccionadas.length}{' '}
                                            seleccionadas
                                        </Badge>
                                    )}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8"
                                        onClick={handleResolveSelectedAlerts}
                                        disabled={
                                            alertaIdsSeleccionadas.length ===
                                                0 || isResolviendoAlertas
                                        }
                                    >
                                        <CheckCircle2 className="mr-1 h-3 w-3" />
                                        Resolver seleccionadas
                                    </Button>
                                </div>
                            </div>
                        </div>
                        <div className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-10">
                                            <Checkbox
                                                aria-label="Seleccionar todas las alertas"
                                                checked={
                                                    todasLasAlertasSeleccionadas
                                                        ? true
                                                        : algunasAlertasSeleccionadas
                                                          ? 'indeterminate'
                                                          : false
                                                }
                                                disabled={
                                                    alertasPendientes.length ===
                                                        0 ||
                                                    isResolviendoAlertas
                                                }
                                                onCheckedChange={(checked) =>
                                                    handleToggleAllAlerts(
                                                        checked === true,
                                                    )
                                                }
                                            />
                                        </TableHead>
                                        <TableHead>Alerta</TableHead>
                                        <TableHead>Estado</TableHead>
                                        <TableHead>
                                            Cliente / Dispositivo
                                        </TableHead>
                                        <TableHead>Hace</TableHead>
                                        <TableHead className="text-right">
                                            Accion
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {alertasPendientes.length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={6}
                                                className="py-6 text-center text-gray-500"
                                            >
                                                No hay alertas de umbral
                                                pendientes.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        alertasPendientes.map((alerta) => (
                                            <TableRow key={alerta.id}>
                                                <TableCell className="w-10 align-top">
                                                    <Checkbox
                                                        aria-label={`Seleccionar alerta ${alerta.id}`}
                                                        checked={alertaIdsSeleccionadas.includes(
                                                            alerta.id,
                                                        )}
                                                        disabled={
                                                            isResolviendoAlertas
                                                        }
                                                        onCheckedChange={(
                                                            checked,
                                                        ) =>
                                                            handleToggleAlertSelection(
                                                                alerta.id,
                                                                checked ===
                                                                    true,
                                                            )
                                                        }
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-gray-900 dark:text-gray-100">
                                                            {alerta.tipo}
                                                        </span>
                                                        <span className="text-xs text-gray-500">
                                                            {alerta.mensaje}
                                                        </span>
                                                        <span className="text-xs text-gray-400">
                                                            {alerta.rango} |
                                                            Valor:{' '}
                                                            {alerta.valor_leido}{' '}
                                                            {alerta.unidad}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        className={
                                                            severityStyles[
                                                                alerta.severidad
                                                            ] ??
                                                            severityStyles.warning
                                                        }
                                                    >
                                                        {alerta.severidad.toUpperCase()}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span>
                                                            {
                                                                alerta.organizacion_nombre
                                                            }
                                                        </span>
                                                        <span className="text-xs text-gray-500">
                                                            {
                                                                alerta.dispositivo_nombre
                                                            }
                                                        </span>
                                                        {alerta.canal && (
                                                            <span className="text-xs text-gray-400">
                                                                {alerta.canal}
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs text-gray-500">
                                                    {alerta.fecha_creacion}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-8"
                                                            onClick={() =>
                                                                handleResolveAlert(
                                                                    alerta.id,
                                                                )
                                                            }
                                                            disabled={
                                                                isResolviendoAlertas
                                                            }
                                                        >
                                                            <CheckCircle2 className="mr-1 h-3 w-3" />
                                                            Resolver
                                                        </Button>
                                                        {alerta.organizacion_id &&
                                                            alerta.sitio_id && (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-8"
                                                                    onClick={() =>
                                                                        handleImpersonate(
                                                                            alerta.organizacion_id,
                                                                            alerta.sitio_id,
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        isResolviendoAlertas
                                                                    }
                                                                >
                                                                    Ver{' '}
                                                                    <ArrowRight className="ml-1 h-3 w-3" />
                                                                </Button>
                                                            )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>

                <div className="mt-2 rounded-lg border bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex flex-col items-start justify-between gap-4 border-b px-4 py-3 sm:flex-row sm:items-center dark:border-gray-800">
                        <div className="flex items-center gap-2">
                            <Cpu className="h-5 w-5 text-blue-500" />
                            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                                Registro de Ultimas Lecturas
                            </h2>
                            <Badge
                                variant="outline"
                                className="ml-2 border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
                            >
                                Ultimas 50
                            </Badge>
                        </div>
                        <div className="flex w-full items-center gap-2 sm:w-auto">
                            <Input
                                placeholder="Buscar equipo, sitio u org..."
                                value={busquedaLecturas}
                                onChange={(e) =>
                                    setBusquedaLecturas(e.target.value)
                                }
                                className="max-w-[300px]"
                            />
                        </div>
                    </div>
                    <div className="p-0">
                        <div className="max-h-[500px] overflow-auto">
                            <Table>
                                <TableHeader className="sticky top-0 z-10 bg-white shadow-sm dark:bg-gray-900">
                                    <TableRow>
                                        <TableHead>Estado</TableHead>
                                        <TableHead>Dispositivo</TableHead>
                                        <TableHead>Cliente / Sitio</TableHead>
                                        <TableHead>Potencia Act.</TableHead>
                                        <TableHead>Recibida</TableHead>
                                        <TableHead className="text-right">
                                            Accion
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {lecturasFiltradas.length === 0 ? (
                                        <TableRow>
                                            <TableCell
                                                colSpan={6}
                                                className="py-6 text-center text-gray-500"
                                            >
                                                {busquedaLecturas
                                                    ? 'No se encontraron lecturas que coincidan con la busqueda.'
                                                    : 'No hay lecturas registradas.'}
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        lecturasFiltradas.map((lectura) => (
                                            <TableRow key={lectura.id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-2.5 w-2.5 rounded-full bg-green-500"></div>
                                                        <span className="text-xs font-medium text-green-700 dark:text-green-400">
                                                            OK
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                    {lectura.dispositivo_nombre}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span>
                                                            {
                                                                lectura.organizacion_nombre
                                                            }
                                                        </span>
                                                        <span className="text-xs text-gray-500">
                                                            {
                                                                lectura.sitio_nombre
                                                            }
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant="secondary"
                                                        className="font-mono"
                                                    >
                                                        {
                                                            lectura.potencia_total_w
                                                        }{' '}
                                                        W
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-xs text-gray-500">
                                                    {lectura.fecha_lectura}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {lectura.organizacion_id &&
                                                        lectura.sitio_id && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-8"
                                                                onClick={() =>
                                                                    handleImpersonate(
                                                                        lectura.organizacion_id,
                                                                        lectura.sitio_id,
                                                                    )
                                                                }
                                                            >
                                                                Asistir{' '}
                                                                <ArrowRight className="ml-1 h-3 w-3" />
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
