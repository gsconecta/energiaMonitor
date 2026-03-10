import { Factory } from 'lucide-react';
import VoltajeRedChart from '@/components/VoltajeRedChart';
import BalanceEnergeticoChart from '@/components/BalanceEnergeticoChart';
import PotenciaReactivaChart from '@/components/PotenciaReactivaChart';

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
                            <VoltajeRedChart datos={datos_grafica} />
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
