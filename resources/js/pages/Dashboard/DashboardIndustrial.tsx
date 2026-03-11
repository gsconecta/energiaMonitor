import { Factory } from 'lucide-react';
import VoltajeRedChart from '@/components/VoltajeRedChart';
import BalanceEnergeticoChart from '@/components/BalanceEnergeticoChart';
import PotenciaReactivaChart from '@/components/PotenciaReactivaChart';
import FactorPotenciaChart from '@/components/FactorPotenciaChart';
import CorrienteFasesChart from '@/components/CorrienteFasesChart';

export default function DashboardIndustrial({
    metricas,
    datos_grafica,
    dispositivo,
}: any) {
    return (
        <div className="flex w-full flex-col gap-4">
            {/* Fila de KPIs rápidos */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Potencia Actual (Global)</p>
                    <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{metricas?.potencia_actual_kw || 0} kW</p>
                </div>
                <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pico Máximo</p>
                    <p className="mt-2 text-2xl font-bold text-red-500">{metricas?.potencia_maxima_kw || 0} kW</p>
                </div>
                <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Factor de Potencia</p>
                    <div className="mt-2 flex items-center gap-4">
                        {Array.from({ length: dispositivo?.num_fases || 1 }).map((_, i) => {
                            const colorCanal = dispositivo?.[`color_canal_${i + 1}` as keyof typeof dispositivo] as string || '#6366f1';
                            return (
                                <div key={i} className="flex items-center gap-1.5 font-medium text-gray-700 dark:text-gray-300">
                                    <span className="text-sm uppercase tracking-wider text-gray-500 dark:text-gray-400">L{i + 1} :</span>
                                    <span className="text-lg font-bold" style={{ color: colorCanal }}>
                                        {metricas?.[`factor_potencia_${i + 1}` as keyof typeof metricas] !== undefined
                                            ? metricas?.[`factor_potencia_${i + 1}` as keyof typeof metricas]
                                            : 0}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Voltaje Promedio</p>
                    <p className="mt-2 text-2xl font-bold text-orange-500">{metricas?.voltaje_promedio || 0} V</p>
                </div>
            </div>

            {/* Contenedor de Gráficas Industriales */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
                {datos_grafica && datos_grafica.length > 0 && (
                    <>
                        <div className="w-full lg:col-span-2">
                            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                                Voltaje de Red Eléctrica (Análisis de Calidad)
                            </h2>
                            <VoltajeRedChart 
                                datos={datos_grafica} 
                                num_fases={dispositivo?.num_fases ?? 1}
                                colores_canales={[
                                    dispositivo?.color_canal_1 || null,
                                    dispositivo?.color_canal_2 || null,
                                    dispositivo?.color_canal_3 || null,
                                ]}
                            />
                        </div>
                        <div className="w-full lg:col-span-2">
                            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                                {dispositivo?.tiene_fotovoltaica ? 'Balance de Potencia Global' : 'Evolución de Consumo de Potencia'}
                            </h2>
                            <BalanceEnergeticoChart
                                datos={datos_grafica}
                                tiene_fotovoltaica={dispositivo?.tiene_fotovoltaica ?? true}
                                num_fases={dispositivo?.num_fases ?? 1}
                                colores_canales={[
                                    dispositivo?.color_canal_1 || null,
                                    dispositivo?.color_canal_2 || null,
                                    dispositivo?.color_canal_3 || null,
                                ]}
                            />
                        </div>
                        <div className="w-full lg:col-span-2">
                            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                                Potencia Reactiva Global
                            </h2>
                            <PotenciaReactivaChart
                                datos={datos_grafica}
                                num_fases={dispositivo?.num_fases ?? 1}
                                colores_canales={[
                                    dispositivo?.color_canal_1 || null,
                                    dispositivo?.color_canal_2 || null,
                                    dispositivo?.color_canal_3 || null,
                                ]}
                            />

                            {/* Cuadro de resumen de última lectura de reactiva */}
                            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                                {Array.from({ length: dispositivo?.num_fases || 1 }).map((_, i) => {
                                    const fase = i + 1;
                                    const v = metricas?.[`voltaje_actual_${fase}` as keyof typeof metricas] as number ?? 0;
                                    const current = metricas?.[`corriente_actual_${fase}` as keyof typeof metricas] as number ?? 0;
                                    const pf = metricas?.[`factor_potencia_${fase}` as keyof typeof metricas] as number ?? 0;
                                    const q = metricas?.[`q${fase}_var_actual` as keyof typeof metricas] as number ?? 0;

                                    const customColor = dispositivo?.[`color_canal_${fase}` as keyof typeof dispositivo] as string | undefined;
                                    const defaultColors = ['text-amber-500', 'text-purple-500', 'text-cyan-500'];
                                    const colorClass = customColor ? '' : defaultColors[i];

                                    return (
                                        <div key={fase} className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 flex flex-col">
                                            <div className="flex justify-between items-center mb-4">
                                                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                    Última Lectura Fase {fase}
                                                </span>
                                                <span
                                                    className={`font-semibold ${colorClass}`}
                                                    style={customColor ? { color: customColor } : {}}
                                                >
                                                    {Math.abs(q) >= 1000 ? (q / 1000).toFixed(2) + ' kVAR' : q.toFixed(2) + ' VAR'}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-3 gap-2 text-center">
                                                <div className="rounded bg-gray-50 dark:bg-gray-800/50 p-2">
                                                    <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">Voltaje</div>
                                                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{v.toFixed(1)} V</div>
                                                </div>
                                                <div className="rounded bg-gray-50 dark:bg-gray-800/50 p-2">
                                                    <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">Corriente</div>
                                                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{current.toFixed(2)} A</div>
                                                </div>
                                                <div className="rounded bg-gray-50 dark:bg-gray-800/50 p-2">
                                                    <div className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">cos(φ)</div>
                                                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{pf.toFixed(2)}</div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="w-full lg:col-span-2">
                            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                                Desplazamiento de Fase cos(φ)
                            </h2>
                            <FactorPotenciaChart
                                datos={datos_grafica}
                                num_fases={dispositivo?.num_fases ?? 1}
                                colores_canales={[
                                    dispositivo?.color_canal_1 || null,
                                    dispositivo?.color_canal_2 || null,
                                    dispositivo?.color_canal_3 || null,
                                ]}
                            />
                        </div>

                        <div className="w-full lg:col-span-2">
                            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                                Intensidad de Alimentación Relativa (A)
                            </h2>
                            <CorrienteFasesChart
                                datos={datos_grafica}
                                num_fases={dispositivo?.num_fases ?? 1}
                                colores_canales={[
                                    dispositivo?.color_canal_1 || null,
                                    dispositivo?.color_canal_2 || null,
                                    dispositivo?.color_canal_3 || null,
                                ]}
                            />
                        </div>
                    </>
                )}
            </div>

            <div className="mt-4 rounded-lg border bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">Análisis por Zonas / Máquinas (Próximamente)</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Aquí se integrarán los consumos desglosados de cada Sitio en esta Organización para detectar picos por fase y por maquinaria.</p>
            </div>
        </div>
    );
}
