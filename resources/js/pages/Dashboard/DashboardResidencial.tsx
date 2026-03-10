import { Building2 } from 'lucide-react';
import BalanceEnergeticoChart from '@/components/BalanceEnergeticoChart';
import ProduccionFotovoltaicaChart from '@/components/ProduccionFotovoltaicaChart';
import FlujoEnergetico from '@/components/FlujoEnergetico';
import DatosMeteorologicos from '@/components/DatosMeteorologicos';

export default function DashboardResidencial({
    metricas,
    datos_grafica,
    datos_meteorologicos,
    dispositivo,
}: any) {
    // Calculamos la independencia energética (autoconsumo)
    // Formula simple: (Generado - Exportado) / Consumo Casa
    // O más simple si consumimos directo: 1 - (Importado / Consumo Casa)
    const consumoCasa = metricas?.consumo_casa_kwh || 0;
    const importacionRed = metricas?.importacion_red_kwh || 0;

    let independenciaEnergética = 0;
    if (consumoCasa > 0) {
        independenciaEnergética = Math.max(0, Math.min(100, (1 - (importacionRed / consumoCasa)) * 100));
    }

    return (
        <div className="flex w-full flex-col gap-4">
            {/* Cabecera del Residencial */}
            <div className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-300">
                <Building2 className="h-4 w-4" />
                <span>Panel Residencial Activo. Foco en monitorización solar y autoconsumo.</span>
            </div>

            {/* Fila de KPIs rápidos */}
            <div className={`grid gap-4 ${dispositivo?.tiene_fotovoltaica ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5' : 'grid-cols-1 md:grid-cols-2'}`}>
                {dispositivo?.tiene_fotovoltaica && (
                    <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Generación Solar</p>
                        <p className="mt-2 text-2xl font-bold text-yellow-500">{metricas?.produccion_fotovoltaica_actual_kw || 0} kW</p>
                    </div>
                )}
                <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Consumo Casa</p>
                    <p className="mt-2 text-2xl font-bold text-blue-500">{metricas?.consumo_total_actual_kw || 0} kW</p>
                </div>
                {dispositivo?.tiene_fotovoltaica ? (
                    <>
                        <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Generación Solar (Periodo)</p>
                            <p className="mt-2 text-2xl font-bold text-yellow-500">{metricas?.generacion_fotovoltaica_kwh || 0} kWh</p>
                        </div>
                        <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Energía Retornada (Periodo)</p>
                            <p className="mt-2 text-2xl font-bold text-purple-500">{metricas?.energia_retornada_kwh || 0} kWh</p>
                        </div>
                        <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Independencia (Periodo)</p>
                            <p className="mt-2 text-2xl font-bold text-green-500">{independenciaEnergética.toFixed(1)}%</p>
                        </div>
                    </>
                ) : (
                    <div className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Consumo de Red (Periodo)</p>
                        <p className="mt-2 text-2xl font-bold text-indigo-500">{metricas?.importacion_red_kwh || 0} kWh</p>
                    </div>
                )}
            </div>

            {/* Componentes Flujo Energético y Datos Meteorológicos */}
            <div className={`grid gap-4 ${dispositivo?.tiene_fotovoltaica ? 'sm:grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
                {metricas && dispositivo?.tiene_fotovoltaica && (
                    <FlujoEnergetico
                        produccionSolar={metricas.produccion_fotovoltaica_actual_kw || 0}
                        redElectrica={metricas.red_electrica_actual_kw || 0}
                        exportacion={metricas.exportacion_actual_kw || 0}
                        consumoTotal={metricas.consumo_total_actual_kw || 0}
                    />
                )}
                {datos_meteorologicos && (
                    <DatosMeteorologicos datos={datos_meteorologicos} />
                )}
            </div>

            {/* Contenedor de Gráficas */}
            <div className={`grid grid-cols-1 gap-4 ${dispositivo?.tiene_fotovoltaica ? 'lg:grid-cols-2 lg:gap-6' : ''}`}>
                {datos_grafica && datos_grafica.length > 0 && (
                    <>
                        <div className="w-full">
                            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                                {dispositivo?.tiene_fotovoltaica ? 'Balance Energético' : 'Evolución de Consumo Eléctrico'}
                            </h2>
                            <BalanceEnergeticoChart
                                datos={datos_grafica}
                                tiene_fotovoltaica={dispositivo?.tiene_fotovoltaica ?? true}
                                num_fases={dispositivo?.num_fases ?? 1}
                            />
                        </div>
                        {dispositivo?.tiene_fotovoltaica && (
                            <div className="w-full">
                                <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                                    Producción Fotovoltaica
                                </h2>
                                <ProduccionFotovoltaicaChart datos={datos_grafica} />
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
