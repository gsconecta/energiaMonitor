import { Building2 } from 'lucide-react';
import BalanceEnergeticoChart from '@/components/BalanceEnergeticoChart';
import ProduccionFotovoltaicaChart from '@/components/ProduccionFotovoltaicaChart';
import FlujoEnergetico from '@/components/FlujoEnergetico';
import DatosMeteorologicos from '@/components/DatosMeteorologicos';
import { Activity } from 'lucide-react';

export default function DashboardResidencial({
    metricas,
    datos_grafica,
    datos_meteorologicos,
    dispositivo,
    dispositivos,
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
                        <div className="w-full rounded-lg border bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                                {dispositivo?.tiene_fotovoltaica ? 'Balance Energético' : 'Evolución de Consumo Eléctrico'}
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
                        {dispositivo?.tiene_fotovoltaica && (
                            <div className="w-full rounded-lg border bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                                <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
                                    Producción Fotovoltaica
                                </h2>
                                <ProduccionFotovoltaicaChart datos={datos_grafica} />
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Contenedor de Canales de Dispositivos del Sitio */}
            {dispositivos && dispositivos.length > 0 && (
                <div className="mt-6 flex flex-col gap-4">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Estado de los Dispositivos del Sitio
                    </h2>
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                        {dispositivos.map((d: any) => (
                            <div key={d.id} className="rounded-lg border bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                                <div className="mb-4 flex items-center justify-between border-b pb-2 dark:border-gray-800">
                                    <div>
                                        <h3 className="font-semibold text-gray-800 dark:text-gray-200">{d.nombre}</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">ID: {d.device_id}</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className={`h-2.5 w-2.5 rounded-full ${d.estado_conexion === 'online' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">{d.estado_conexion === 'online' ? 'Online' : 'Offline'}</span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3">
                                    {[1, 2, 3].map((canalNum) => {
                                        if (d.num_fases && canalNum > d.num_fases) return null;

                                        const potencia = d.ultima_lectura?.[`potencia_canal_${canalNum}_w`];
                                        const voltaje = d.ultima_lectura?.[`voltaje_canal_${canalNum}`];
                                        const energia = d.ultima_lectura?.[`energia_canal_${canalNum}_kwh`];
                                        const nombreCanal = d[`nombre_canal_${canalNum}`] || `Canal ${canalNum}`;
                                        const tipoCanal = d[`tipo_canal_${canalNum}`];

                                        // No mostrar canales que no tengan nombre ni funcionalidad configurada, a menos que sí tengan lectura de potencia
                                        if (!d[`nombre_canal_${canalNum}`] && !d[`tipo_canal_${canalNum}`] && potencia == null) return null;

                                        return (
                                            <div key={canalNum} className="flex flex-col gap-1 rounded-md bg-gray-50 p-3 dark:bg-gray-800/50">
                                                <div className="flex items-center justify-between">
                                                    <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                                                        <Activity className="h-3.5 w-3.5 text-blue-500" />
                                                        {nombreCanal}
                                                        {tipoCanal && (
                                                            <span className="ml-1 rounded bg-gray-200 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                                                                {tipoCanal === 'fotovoltaica' ? 'Solar' : 'Red'}
                                                            </span>
                                                        )}
                                                    </span>
                                                    <span className={`text-sm font-bold ${potencia !== null && potencia < 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-gray-100'}`}>
                                                        {potencia !== null ? `${potencia} W` : '-- W'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                                    <span>{voltaje !== null ? `${voltaje} V` : '-- V'}</span>
                                                    <span>{energia !== null ? `${energia} kWh` : '-- kWh'}</span>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {(!d.ultima_lectura || typeof d.ultima_lectura === 'undefined') && (
                                        <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-2">
                                            Sin lecturas recientes
                                        </div>
                                    )}
                                </div>

                                {d.ultima_lectura && (
                                    <p className="mt-4 text-right text-[10px] text-gray-400 dark:text-gray-500">
                                        Última lectura: {d.ultima_lectura.fecha_lectura_human}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
