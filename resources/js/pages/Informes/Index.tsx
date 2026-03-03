import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import {
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    Legend,
    LinearScale,
    Title,
    Tooltip,
} from 'chart.js';
import { ArrowDown, ArrowUp, Zap } from 'lucide-react';
import { useState } from 'react';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Informes',
        href: '/informes',
    },
];

interface Dispositivo {
    id: number;
    nombre: string;
}

interface DataPoint {
    fecha: string;
    consumo_kwh: number;
    generacion_kwh: number;
    importacion_kwh: number;
    exportacion_kwh: number;
}

interface Props {
    dispositivo: Dispositivo;
    dispositivos: Dispositivo[];
    datos: DataPoint[];
    filtros: {
        periodo: string;
        intervalo: string;
        fecha_desde: string;
        fecha_hasta: string;
        dispositivo_id: number;
    };
}

export default function InformesIndex({ dispositivo, dispositivos, datos, filtros }: Props) {
    const [periodo, setPeriodo] = useState(filtros.periodo);
    const [intervalo, setIntervalo] = useState(filtros.intervalo);
    const [fechaDesde, setFechaDesde] = useState(filtros.fecha_desde);
    const [fechaHasta, setFechaHasta] = useState(filtros.fecha_hasta);
    const [dispositivoId, setDispositivoId] = useState(filtros.dispositivo_id.toString());
    const [loading, setLoading] = useState(false);

    const aplicarFiltros = () => {
        setLoading(true);
        router.get('/informes', {
            dispositivo_id: dispositivoId,
            periodo,
            intervalo,
            fecha_desde: periodo === 'personalizado' ? fechaDesde : undefined,
            fecha_hasta: periodo === 'personalizado' ? fechaHasta : undefined,
        }, {
            preserveState: true,
            onFinish: () => setLoading(false),
        });
    };

    // Calcular totales
    const totalConsumo = datos.reduce((acc, curr) => acc + curr.consumo_kwh, 0);
    const totalGeneracion = datos.reduce((acc, curr) => acc + curr.generacion_kwh, 0);
    const totalImportacion = datos.reduce((acc, curr) => acc + curr.importacion_kwh, 0);
    const totalExportacion = datos.reduce((acc, curr) => acc + curr.exportacion_kwh, 0);

    // Calcular independencia energética
    const independenciaEnergetica = totalConsumo > 0
        ? Math.max(0, 100 - ((totalImportacion / totalConsumo) * 100))
        : 0;

    // Configuración del gráfico
    const chartData = {
        labels: datos.map(d => {
            const date = new Date(d.fecha);
            return filtros.intervalo === '15m' || filtros.intervalo === '1h'
                ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : date.toLocaleDateString();
        }),
        datasets: [
            {
                label: 'Consumo (kWh)',
                data: datos.map(d => d.consumo_kwh),
                backgroundColor: 'rgba(59, 130, 246, 0.5)', // Blue
                borderColor: 'rgb(59, 130, 246)',
                borderWidth: 1,
            },
            {
                label: 'Generación (kWh)',
                data: datos.map(d => d.generacion_kwh),
                backgroundColor: 'rgba(34, 197, 94, 0.5)', // Green
                borderColor: 'rgb(34, 197, 94)',
                borderWidth: 1,
            },
            {
                label: 'Importación (kWh)',
                data: datos.map(d => d.importacion_kwh),
                backgroundColor: 'rgba(239, 68, 68, 0.5)', // Red
                borderColor: 'rgb(239, 68, 68)',
                borderWidth: 1,
            },
            {
                label: 'Exportación (kWh)',
                data: datos.map(d => d.exportacion_kwh),
                backgroundColor: 'rgba(234, 179, 8, 0.5)', // Yellow
                borderColor: 'rgb(234, 179, 8)',
                borderWidth: 1,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top' as const,
            },
            title: {
                display: true,
                text: `Energía por intervalo (${filtros.intervalo})`,
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Energía (kWh)'
                }
            }
        }
    };


    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Informes Energéticos" />

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                {/* Filtros */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle>Configuración del Informe</CardTitle>
                        <CardDescription>Selecciona los parámetros para generar el informe</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 items-end">
                        <div className="space-y-2">
                            <Label>Dispositivo</Label>
                            <Select value={dispositivoId} onValueChange={setDispositivoId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar dispositivo" />
                                </SelectTrigger>
                                <SelectContent>
                                    {dispositivos.map((d) => (
                                        <SelectItem key={d.id} value={d.id.toString()}>
                                            {d.nombre}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Periodo</Label>
                            <Select value={periodo} onValueChange={setPeriodo}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar periodo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="semana_actual">Semana Actual</SelectItem>
                                    <SelectItem value="semana_pasada">Semana Pasada</SelectItem>
                                    <SelectItem value="mes_actual">Mes Actual</SelectItem>
                                    <SelectItem value="mes_anterior">Mes Anterior</SelectItem>
                                    <SelectItem value="personalizado">Personalizado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {periodo === 'personalizado' && (
                            <>
                                <div className="space-y-2">
                                    <Label>Desde</Label>
                                    <Input
                                        type="date"
                                        value={fechaDesde}
                                        max={fechaHasta || new Date().toISOString().split('T')[0]}
                                        onChange={(e) => setFechaDesde(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Hasta</Label>
                                    <Input
                                        type="date"
                                        value={fechaHasta}
                                        min={fechaDesde}
                                        max={new Date().toISOString().split('T')[0]}
                                        onChange={(e) => setFechaHasta(e.target.value)}
                                    />
                                </div>
                            </>
                        )}

                        <div className="space-y-2">
                            <Label>Intervalo de Agrupación</Label>
                            <Select value={intervalo} onValueChange={setIntervalo}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccionar intervalo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="15m">15 Minutos</SelectItem>
                                    <SelectItem value="1h">1 Hora</SelectItem>
                                    <SelectItem value="1d">1 Día</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <Button onClick={aplicarFiltros} disabled={loading} className="w-full">
                            {loading ? 'Cargando...' : 'Generar Informe'}
                        </Button>
                    </CardContent>
                </Card>

                {/* KPIs */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Consumo Total</CardTitle>
                            <Zap className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{totalConsumo.toFixed(2)} kWh</div>
                            <p className="text-xs text-muted-foreground">En el periodo seleccionado</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Independencia</CardTitle>
                            <Zap className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{independenciaEnergetica.toFixed(1)}%</div>
                            <p className="text-xs text-muted-foreground">Autosuficiencia</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Generación FV</CardTitle>
                            <Zap className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{totalGeneracion.toFixed(2)} kWh</div>
                            <p className="text-xs text-muted-foreground">Energía producida</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Importación Red</CardTitle>
                            <ArrowDown className="h-4 w-4 text-red-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{totalImportacion.toFixed(2)} kWh</div>
                            <p className="text-xs text-muted-foreground">Comprado a la red</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Exportación Red</CardTitle>
                            <ArrowUp className="h-4 w-4 text-yellow-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{totalExportacion.toFixed(2)} kWh</div>
                            <p className="text-xs text-muted-foreground">Vertido a la red</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Gráfico */}
                <Card className="flex flex-1 flex-col overflow-hidden">
                    <CardHeader>
                        <CardTitle>Evolución Energética</CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-0 relative p-4">
                        <div className="absolute inset-4">
                            <Bar options={chartOptions} data={chartData} />
                        </div>
                    </CardContent>
                </Card>

            </div>
        </AppLayout>
    );
}

