import PotenciaReactivaChart from '@/components/PotenciaReactivaChart';
import VoltajeRedChart from '@/components/VoltajeRedChart';
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
    LineElement,
    PointElement,
    Title,
    Tooltip,
} from 'chart.js';
import { ArrowDown, ArrowUp, Download, Settings2, Zap } from 'lucide-react';
import { useState } from 'react';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend);

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
    tiene_fotovoltaica?: boolean;
    num_fases?: number;
    color_canal_1?: string;
    color_canal_2?: string;
    color_canal_3?: string;
}

interface DataPoint {
    fecha: string;
    consumo_kwh: number;
    generacion_kwh: number;
    importacion_kwh: number;
    exportacion_kwh: number;
    potencia_promedio_kw?: number;
    potencia_maxima_kw?: number;
    voltaje_red_electrica?: number;
    voltaje_canal_1?: number;
    voltaje_canal_2?: number;
    voltaje_canal_3?: number;
    q1_var?: number;
    q2_var?: number;
    q3_var?: number;
    q_total_var?: number;
}

interface OrganizacionActiva {
    id: number;
    nombre: string;
    tipo_perfil: string;
}

interface Props {
    dispositivo: Dispositivo | null;
    dispositivos: Dispositivo[];
    datos: DataPoint[];
    metricas: {
        potencia_maxima_kw: number;
        potencia_promedio_kw: number;
    };
    organizacion_activa: OrganizacionActiva;
    filtros: {
        periodo: string;
        intervalo: string;
        fecha_desde: string;
        fecha_hasta: string;
        dispositivo_id: number | null;
    };
}

export default function InformesIndex({ dispositivo, dispositivos, datos, metricas, organizacion_activa, filtros }: Props) {
    const [periodo, setPeriodo] = useState(filtros.periodo);
    const [intervalo, setIntervalo] = useState(filtros.intervalo);
    const [fechaDesde, setFechaDesde] = useState(filtros.fecha_desde ?? '');
    const [fechaHasta, setFechaHasta] = useState(filtros.fecha_hasta ?? '');
    const [dispositivoId, setDispositivoId] = useState(filtros.dispositivo_id?.toString() ?? '');
    const [loading, setLoading] = useState(false);
    const [mostrarConfiguracion, setMostrarConfiguracion] = useState(false);

    const buildInformeParams = () => ({
        dispositivo_id: dispositivoId || undefined,
        periodo,
        intervalo,
        fecha_desde: periodo === 'personalizado' ? fechaDesde : undefined,
        fecha_hasta: periodo === 'personalizado' ? fechaHasta : undefined,
    });

    const aplicarFiltros = () => {
        setLoading(true);
        router.get('/informes', buildInformeParams(), {
            preserveState: true,
            onFinish: () => setLoading(false),
        });
    };

    const exportarExcel = () => {
        const params = new URLSearchParams();

        Object.entries(buildInformeParams()).forEach(([key, value]) => {
            if (value) {
                params.set(key, value.toString());
            }
        });

        window.location.href = `/informes/exportar?${params.toString()}`;
    };

    const totalConsumo = datos.reduce((acc, curr) => acc + curr.consumo_kwh, 0);
    const totalGeneracion = datos.reduce((acc, curr) => acc + curr.generacion_kwh, 0);
    const totalImportacion = datos.reduce((acc, curr) => acc + curr.importacion_kwh, 0);
    const totalExportacion = datos.reduce((acc, curr) => acc + curr.exportacion_kwh, 0);
    const esPerfilIndustrial = organizacion_activa.tipo_perfil === 'industrial';
    const potenciaMaximaRegistradaKw = metricas?.potencia_maxima_kw ?? 0;

    const picosReactiva = datos.map((dato) => Math.abs(dato.q_total_var || 0));
    const picoReactiva = picosReactiva.length > 0 ? Math.max(...picosReactiva) : 0;

    const independenciaEnergetica = totalConsumo > 0
        ? Math.max(0, 100 - ((totalImportacion / totalConsumo) * 100))
        : 0;

    const voltajesValidos = datos.filter((dato): dato is DataPoint & { voltaje_red_electrica: number } =>
        dato.voltaje_red_electrica !== undefined && dato.voltaje_red_electrica > 0
    );

    let minVoltaje = 0;
    let maxVoltaje = 0;
    let fechaMinVoltaje = '';
    let fechaMaxVoltaje = '';

    if (voltajesValidos.length > 0) {
        const minElement = voltajesValidos.reduce((min, curr) =>
            curr.voltaje_red_electrica < min.voltaje_red_electrica ? curr : min,
            voltajesValidos[0]
        );
        const maxElement = voltajesValidos.reduce((max, curr) =>
            curr.voltaje_red_electrica > max.voltaje_red_electrica ? curr : max,
            voltajesValidos[0]
        );

        minVoltaje = minElement.voltaje_red_electrica;
        maxVoltaje = maxElement.voltaje_red_electrica;
        fechaMinVoltaje = new Date(minElement.fecha).toLocaleString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
        fechaMaxVoltaje = new Date(maxElement.fecha).toLocaleString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    const datasets = [
        {
            label: 'Consumo (kWh)',
            data: datos.map((dato) => dato.consumo_kwh),
            backgroundColor: 'rgba(25, 118, 210, 0.5)',
            borderColor: '#1976D2',
            borderWidth: 1,
        },
    ];

    if (dispositivo?.tiene_fotovoltaica) {
        datasets.push(
            {
                label: 'Generación (kWh)',
                data: datos.map((dato) => dato.generacion_kwh),
                backgroundColor: 'rgba(255, 193, 7, 0.5)',
                borderColor: '#FFC107',
                borderWidth: 1,
            },
            {
                label: 'Importación (kWh)',
                data: datos.map((dato) => dato.importacion_kwh),
                backgroundColor: 'rgba(96, 125, 139, 0.5)',
                borderColor: '#607D8B',
                borderWidth: 1,
            },
            {
                label: 'Exportación (kWh)',
                data: datos.map((dato) => dato.exportacion_kwh),
                backgroundColor: 'rgba(76, 175, 80, 0.5)',
                borderColor: '#4CAF50',
                borderWidth: 1,
            }
        );
    }

    const labels = datos.map((dato) => {
        const date = new Date(dato.fecha);
        return filtros.intervalo === '15m' || filtros.intervalo === '1h'
            ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : date.toLocaleDateString();
    });

    const chartData = {
        labels,
        datasets,
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
                    text: 'Energía (kWh)',
                },
            },
        },
    };

    const potenciaChartData = {
        labels,
        datasets: [
            {
                label: 'Potencia media (kW)',
                data: datos.map((dato) => dato.potencia_promedio_kw ?? 0),
                borderColor: '#F97316',
                backgroundColor: 'rgba(249, 115, 22, 0.14)',
                fill: false,
                tension: 0.35,
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 4,
            },
            {
                label: 'Pico del intervalo (kW)',
                data: datos.map((dato) => dato.potencia_maxima_kw ?? 0),
                borderColor: '#DC2626',
                backgroundColor: 'rgba(220, 38, 38, 0.08)',
                fill: false,
                tension: 0.25,
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 4,
            },
        ],
    };

    const potenciaChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top' as const,
            },
            title: {
                display: true,
                text: `Potencia por intervalo (${filtros.intervalo})`,
            },
            tooltip: {
                callbacks: {
                    label: (context: { dataset: { label?: string }; parsed: { y: number } }) =>
                        `${context.dataset.label}: ${context.parsed.y.toFixed(2)} kW`,
                },
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: 'Potencia (kW)',
                },
            },
        },
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Informes Energéticos" />

            <div className={`flex w-full items-center justify-between px-6 py-3 font-semibold text-white ${organizacion_activa.tipo_perfil === 'industrial' ? 'bg-orange-600' : 'bg-blue-600'}`}>
                <span>{organizacion_activa.nombre}</span>
                <span className="text-sm uppercase tracking-wider">
                    {organizacion_activa.tipo_perfil === 'industrial' ? 'Perfil Industrial' : 'Perfil Residencial'}
                </span>
            </div>

            <div className="flex h-full flex-1 flex-col gap-4 p-4">
                <div className="flex items-center justify-between rounded-lg border border-sidebar-border/70 bg-white p-4 shadow-sm dark:bg-gray-800">
                    <div>
                        <h2 className="text-xl font-bold">Resumen Energético</h2>
                        <p className="text-sm text-muted-foreground">
                            Mostrando datos de {fechaDesde} a {fechaHasta}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={exportarExcel}
                            disabled={!dispositivoId}
                            className="flex items-center gap-2"
                        >
                            <Download className="h-4 w-4" />
                            Exportar Excel
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setMostrarConfiguracion(!mostrarConfiguracion)}
                            className="flex items-center gap-2"
                        >
                            <Settings2 className="h-4 w-4" />
                            {mostrarConfiguracion ? 'Cerrar Ajustes' : 'Personalizar Informe'}
                        </Button>
                    </div>
                </div>

                {mostrarConfiguracion && (
                    <Card className="animate-in fade-in slide-in-from-top-4 duration-300">
                        <CardHeader className="pb-3">
                            <CardTitle>Configuración del Informe</CardTitle>
                            <CardDescription>Selecciona los parámetros para generar el informe</CardDescription>
                        </CardHeader>
                        <CardContent className="grid items-end gap-4 md:grid-cols-2 lg:grid-cols-5">
                            <div className="space-y-2">
                                <Label>Dispositivo</Label>
                                <Select value={dispositivoId} onValueChange={setDispositivoId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar dispositivo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {dispositivos.map((item) => (
                                            <SelectItem key={item.id} value={item.id.toString()}>
                                                {item.nombre}
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

                            <Button onClick={aplicarFiltros} disabled={loading || !dispositivoId} className="w-full">
                                {loading ? 'Cargando...' : 'Generar Informe'}
                            </Button>
                        </CardContent>
                    </Card>
                )}

                <div
                    className={`grid gap-4 ${
                        dispositivo?.tiene_fotovoltaica
                            ? esPerfilIndustrial
                                ? 'grid-cols-2 lg:grid-cols-5 xl:grid-cols-9'
                                : 'grid-cols-2 lg:grid-cols-4 xl:grid-cols-8'
                            : esPerfilIndustrial
                                ? 'grid-cols-1 md:grid-cols-5'
                                : 'grid-cols-1 md:grid-cols-4'
                    }`}
                >
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

                    {dispositivo?.tiene_fotovoltaica && (
                        <>
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
                        </>
                    )}

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Voltaje Mínimo</CardTitle>
                            <Zap className="h-4 w-4 text-orange-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{minVoltaje > 0 ? minVoltaje.toFixed(1) : '-'} V</div>
                            <p className="text-xs text-muted-foreground">{minVoltaje > 0 ? fechaMinVoltaje : 'En el periodo'}</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Voltaje Máximo</CardTitle>
                            <Zap className="h-4 w-4 text-red-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{maxVoltaje > 0 ? maxVoltaje.toFixed(1) : '-'} V</div>
                            <p className="text-xs text-muted-foreground">{maxVoltaje > 0 ? fechaMaxVoltaje : 'En el periodo'}</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Pico Reactiva</CardTitle>
                            <Zap className="h-4 w-4 text-purple-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                {picoReactiva >= 1000 ? (picoReactiva / 1000).toFixed(2) : picoReactiva.toFixed(0)}
                            </div>
                            <p className="text-xs text-muted-foreground">{picoReactiva >= 1000 ? 'kVAR max' : 'VAR max'}</p>
                        </CardContent>
                    </Card>

                    {esPerfilIndustrial && (
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Potencia Maxima</CardTitle>
                                <Zap className="h-4 w-4 text-orange-600" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                                    {potenciaMaximaRegistradaKw.toFixed(2)} kW
                                </div>
                                <p className="text-xs text-muted-foreground">Pico registrado en el periodo</p>
                            </CardContent>
                        </Card>
                    )}
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 lg:gap-6 2xl:grid-cols-2">
                    <Card className="flex h-[500px] flex-col">
                        <CardHeader>
                            <CardTitle>Evolución Energética</CardTitle>
                        </CardHeader>
                        <CardContent className="relative flex-1 p-4">
                            <div className="absolute inset-4">
                                <Bar options={chartOptions} data={chartData} />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="flex h-[500px] flex-col">
                        <CardHeader className="pb-0">
                            <CardTitle>Voltaje Promedio</CardTitle>
                        </CardHeader>
                        <CardContent className="relative flex-1 p-4">
                            <div className="absolute inset-4 top-2">
                                <VoltajeRedChart
                                    datos={datos as any}
                                    ocultarFiltros={true}
                                    num_fases={dispositivo?.num_fases || 3}
                                    colores_canales={[
                                        dispositivo?.color_canal_1 || '#3B82F6',
                                        dispositivo?.color_canal_2 || '#F59E0B',
                                        dispositivo?.color_canal_3 || '#A855F7',
                                    ]}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className={`mt-4 grid grid-cols-1 gap-4 lg:gap-6 ${esPerfilIndustrial ? '2xl:grid-cols-2' : ''}`}>
                    {esPerfilIndustrial && (
                        <Card className="flex flex-col">
                            <CardHeader>
                                <CardTitle>Potencia en kW</CardTitle>
                            </CardHeader>
                            <CardContent className="relative h-[420px] flex-1 p-4">
                                <div className="absolute inset-4">
                                    <Line data={potenciaChartData} options={potenciaChartOptions} />
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    <Card className="flex flex-col">
                        <CardHeader>
                            <CardTitle>Potencia Reactiva Promedio</CardTitle>
                        </CardHeader>
                        <CardContent className="relative flex-1 p-4">
                            <PotenciaReactivaChart
                                datos={datos as any}
                                num_fases={dispositivo?.num_fases || 3}
                                colores_canales={[
                                    dispositivo?.color_canal_1 || '#3B82F6',
                                    dispositivo?.color_canal_2 || '#F59E0B',
                                    dispositivo?.color_canal_3 || '#A855F7',
                                ]}
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
