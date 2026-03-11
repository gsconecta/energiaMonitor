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
import VoltajeRedChart from '@/components/VoltajeRedChart';
import PotenciaReactivaChart from '@/components/PotenciaReactivaChart';
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
    tiene_fotovoltaica?: boolean;
    configuracion?: any;
}

interface DataPoint {
    fecha: string;
    consumo_kwh: number;
    generacion_kwh: number;
    importacion_kwh: number;
    exportacion_kwh: number;
    voltaje_red_electrica?: number;
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
    dispositivo: Dispositivo;
    dispositivos: Dispositivo[];
    datos: DataPoint[];
    organizacion_activa: OrganizacionActiva;
    filtros: {
        periodo: string;
        intervalo: string;
        fecha_desde: string;
        fecha_hasta: string;
        dispositivo_id: number;
    };
}

export default function InformesIndex({ dispositivo, dispositivos, datos, organizacion_activa, filtros }: Props) {
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

    const picosReactiva = datos.map(d => Math.abs(d.q_total_var || 0));
    const picoReactiva = picosReactiva.length > 0 ? Math.max(...picosReactiva) : 0;

    // Calcular independencia energética
    const independenciaEnergetica = totalConsumo > 0
        ? Math.max(0, 100 - ((totalImportacion / totalConsumo) * 100))
        : 0;

    // Calcular min y max voltaje con sus fechas
    const voltajesValidos = datos.filter((d): d is DataPoint & { voltaje_red_electrica: number } =>
        d.voltaje_red_electrica !== undefined && d.voltaje_red_electrica > 0
    );

    let minVoltaje = 0;
    let maxVoltaje = 0;
    let fechaMinVoltaje = '';
    let fechaMaxVoltaje = '';

    if (voltajesValidos.length > 0) {
        const minElement = voltajesValidos.reduce((min, curr) => curr.voltaje_red_electrica < min.voltaje_red_electrica ? curr : min, voltajesValidos[0]);
        const maxElement = voltajesValidos.reduce((max, curr) => curr.voltaje_red_electrica > max.voltaje_red_electrica ? curr : max, voltajesValidos[0]);

        minVoltaje = minElement.voltaje_red_electrica;
        maxVoltaje = maxElement.voltaje_red_electrica;
        fechaMinVoltaje = new Date(minElement.fecha).toLocaleString('es-ES', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        fechaMaxVoltaje = new Date(maxElement.fecha).toLocaleString('es-ES', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    }

    // Configuración del gráfico
    const datasets = [
        {
            label: 'Consumo (kWh)',
            data: datos.map(d => d.consumo_kwh),
            backgroundColor: 'rgba(59, 130, 246, 0.5)', // Blue
            borderColor: 'rgb(59, 130, 246)',
            borderWidth: 1,
        }
    ];

    if (dispositivo?.tiene_fotovoltaica) {
        datasets.push(
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
            }
        );
    }

    const chartData = {
        labels: datos.map(d => {
            const date = new Date(d.fecha);
            return filtros.intervalo === '15m' || filtros.intervalo === '1h'
                ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : date.toLocaleDateString();
        }),
        datasets: datasets,
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

            {/* Banner de Organización */}
            <div className={`w-full px-6 py-3 font-semibold text-white flex justify-between items-center ${organizacion_activa.tipo_perfil === 'industrial' ? 'bg-orange-600' : 'bg-blue-600'}`}>
                <span>{organizacion_activa.nombre}</span>
                <span className="uppercase text-sm tracking-wider">
                    {organizacion_activa.tipo_perfil === 'industrial' ? 'Perfil Industrial' : 'Perfil Residencial'}
                </span>
            </div>

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
                <div className={`grid gap-4 ${dispositivo?.tiene_fotovoltaica ? 'grid-cols-2 lg:grid-cols-4 xl:grid-cols-8' : 'grid-cols-1 md:grid-cols-4'}`}>
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
                            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{(picoReactiva >= 1000 ? (picoReactiva / 1000).toFixed(2) : picoReactiva.toFixed(0))}</div>
                            <p className="text-xs text-muted-foreground">{picoReactiva >= 1000 ? 'kVAR max' : 'VAR max'}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Contenedor de Gráficas en 1 columna por defecto, y 2 en pantallas extra grandes */}
                <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4 lg:gap-6 mt-4">
                    {/* Gráfico Evolución Energética */}
                    <Card className="flex flex-col h-[500px]">
                        <CardHeader>
                            <CardTitle>Evolución Energética</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 relative p-4">
                            <div className="absolute inset-4">
                                <Bar options={chartOptions} data={chartData} />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Gráfico Voltaje de Red */}
                    <Card className="flex flex-col h-[500px]">
                        <CardHeader>
                            <CardTitle>Voltaje Promedio</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 p-4 relative overflow-hidden">
                            <div className="h-full w-full">
                                <VoltajeRedChart datos={datos as any} ocultarFiltros={true} />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Contenedor extra (Gráfico Reactiva) */}
                <div className="grid grid-cols-1 gap-4 lg:gap-6 mt-4">
                    <Card className="flex flex-col">
                        <CardHeader>
                            <CardTitle>Potencia Reactiva Promedio</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 relative p-4">
                            <PotenciaReactivaChart 
                                datos={datos as any} 
                                num_fases={dispositivo?.configuracion?.fases || 3} 
                                colores_canales={['#3B82F6', '#F59E0B', '#A855F7']} 
                            />
                        </CardContent>
                    </Card>
                </div>

            </div>
        </AppLayout>
    );
}

